import type { EventBus } from "../events/EventBus";
import type { TrafficRecord } from "../browser/VirtualBrowser";
import type { RuntimeEvent } from "./HostRuntime";
import { applyFilter, compileFilter } from "./DisplayFilter";

/**
 * NandeShark — el analizador de tráfico del universo. NO inventa paquetes:
 * captura el tráfico REAL que genera el mundo. Cada paquete nació de algo que
 * de verdad pasó: una petición HTTP (con su cuerpo tal cual viajó), un intento
 * de login, un servicio que cayó, una conexión rechazada por el firewall.
 *
 * La lección clásica se vuelve jugable: si un formulario manda la contraseña
 * en claro (HTTP), NandeShark la muestra "en el cable" y la marca como fuga.
 *
 * Es al tráfico lo que EventStore es a los eventos: una memoria consultable.
 */

export type L7 = "HTTP" | "SSH" | "TCP" | "AUTH" | "ICMP";

export interface Packet {
  seq: number;
  tick: number;
  src: string;
  dst: string;
  proto: L7;
  summary: string;
  /** Detalles legibles (método, ruta, estado, credenciales vistas…). */
  detail: string;
  /** Bytes tal cual viajaron por el cable (para el volcado hexadecimal). */
  wire: string;
  /** Tamaño del paquete en bytes (columna Length de Wireshark). */
  length: number;
  /** Campos disecados (como el árbol de protocolos de Wireshark). */
  method?: string;
  host?: string;
  path?: string;
  status?: number;
  /** Puerto destino (TCP): lo usa el IDS para detectar barridos de puertos. */
  port?: number;
  /** Marca educativa: este paquete lleva una credencial en claro. */
  leak?: { field: string; value: string };
}

/** Un patrón de escaneo detectado por el IDS pasivo sobre el tráfico capturado. */
export interface ScanFinding {
  /** Quién escanea (IP de origen). */
  src: string;
  kind: "port-scan" | "host-sweep" | "ping-sweep";
  /** Objetivo del port-scan (un host); en los barridos, vacío. */
  target?: string;
  /** Puertos distintos tocados (port-scan). */
  ports: number[];
  /** Hosts distintos tocados (host-sweep / ping-sweep). */
  hosts: string[];
  /** Paquetes involucrados. */
  count: number;
  firstTick: number;
  lastTick: number;
  severity: "low" | "medium" | "high";
}

/** Campos que, si viajan en claro, son una fuga de credenciales. */
const SECRET_FIELDS = ["password", "pass", "clave", "contrasena", "contraseña", "pin", "token", "secret"];

export class PacketCapture {
  private packets: Packet[] = [];
  private seq = 0;
  private limit: number;
  private unsubs: (() => void)[] = [];
  /** IP del jugador (origen de su tráfico saliente). */
  private myIp = "10.10.0.5";

  constructor(events: EventBus, limit = 2000) {
    this.limit = limit;
    this.unsubs.push(
      events.subscribe<TrafficRecord>("network.request", (e) =>
        this.fromHttp(e.data),
      ),
    );
    this.unsubs.push(
      events.subscribe<RuntimeEvent>("runtime.host", (e) =>
        this.fromRuntime(e.data),
      ),
    );
  }

  dispose(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  private push(p: Omit<Packet, "seq">): void {
    this.packets.push({ ...p, seq: ++this.seq });
    if (this.packets.length > this.limit) {
      this.packets.splice(0, this.packets.length - this.limit);
    }
  }

  /** Materializa un paquete HTTP a partir del tráfico real del navegador. */
  private fromHttp(t: TrafficRecord): void {
    // ¿Viajó una credencial en claro? (HTTP, no HTTPS → todo se ve).
    let leak: Packet["leak"];
    for (const [k, v] of Object.entries(t.reqBody)) {
      if (SECRET_FIELDS.includes(k.toLowerCase()) && v) {
        leak = { field: k, value: v };
        break;
      }
    }
    const bodyStr = Object.entries(t.reqBody)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    // Bytes reales del pedido HTTP tal cual salen al cable.
    const wire =
      `${t.method} ${t.path} HTTP/1.1\r\n` +
      `Host: ${t.host}\r\n` +
      `User-Agent: nande-browser/5\r\n` +
      (bodyStr
        ? `Content-Type: application/x-www-form-urlencoded\r\n` +
          `Content-Length: ${bodyStr.length}\r\n\r\n${bodyStr}`
        : `\r\n`);
    this.push({
      tick: t.tick,
      src: this.myIp,
      dst: t.ip || t.host,
      proto: "HTTP",
      summary: `${t.method} ${t.host}${t.path} → ${t.status}`,
      detail:
        `${t.method} ${t.path} HTTP/1.1  Host: ${t.host}` +
        (bodyStr ? `  ${bodyStr}` : "") +
        `  ⇐ ${t.status}`,
      wire,
      length: wire.length,
      method: t.method,
      host: t.host,
      path: t.path,
      status: t.status,
      leak,
    });
  }

  /** Materializa un paquete a partir de un evento del HostRuntime. */
  private fromRuntime(ev: RuntimeEvent): void {
    if (ev.kind === "login.success" || ev.kind === "login.failure") {
      const wire = `AUTH ${ev.host} ${ev.kind === "login.success" ? "ACCEPTED" : "REJECTED"}\r\n${ev.detail}`;
      this.push({
        tick: ev.tick,
        src: this.myIp,
        dst: ev.ip || ev.host,
        proto: "AUTH",
        summary: `${ev.kind === "login.success" ? "Login OK" : "Login FAIL"} → ${ev.host}`,
        detail: ev.detail,
        wire,
        length: wire.length,
        host: ev.host,
      });
      return;
    }
    if (ev.kind === "connection.refused") {
      const wire = `TCP ${ev.host}:${ev.port ?? "?"} [RST, ACK]\r\n${ev.detail}`;
      this.push({
        tick: ev.tick,
        src: this.myIp,
        dst: ev.ip || ev.host,
        proto: "TCP",
        summary: `RST ${ev.host}:${ev.port ?? "?"} (rechazada)`,
        detail: ev.detail,
        wire,
        length: wire.length,
        host: ev.host,
      });
    }
    // service.* / port.* no son paquetes: son cambios de estado del host, y
    // ya viven en el EventStore/SOC. NandeShark sólo captura lo que viaja.
  }

  /**
   * Registra un eco ICMP (ping) que salió al cable. En una red real un ping es
   * tráfico VISIBLE: el sniffer y un IDS lo ven. Antes ping era "silencioso"
   * (incoherencia §5/§19); ahora deja su rastro como cualquier otra cosa que
   * viaja. `reply` = si el destino contestó el eco. Lo llama la terminal.
   */
  recordIcmp(dst: string, hostname: string, reply: boolean, tick: number): void {
    const host = hostname || dst;
    const wire =
      `ICMP ${this.myIp} > ${dst}: echo request  id=${tick % 65535} seq=1\r\n` +
      (reply
        ? `ICMP ${dst} > ${this.myIp}: echo reply  ttl=64`
        : `(sin respuesta al echo request)`);
    this.push({
      tick,
      src: this.myIp,
      dst,
      proto: "ICMP",
      summary: `ICMP echo ${reply ? "request → reply" : "request (sin respuesta)"} ${host}`,
      detail: wire.replace(/\r?\n/g, "  "),
      wire,
      length: wire.length,
      host,
    });
  }

  /**
   * Registra un intento de conexión TCP (nc / banner grabbing). Muestra el SYN
   * y la respuesta del handshake: SYN-ACK (abierto), RST (cerrado) o silencio
   * (filtrado), más el banner si el servicio saludó. Es lo que un sniffer ve de
   * un escaneo: por eso escanear es RUIDOSO. Lo llama la terminal.
   */
  recordTcp(
    dst: string,
    hostname: string,
    port: number,
    state: "open" | "closed" | "filtered",
    tick: number,
    banner?: string,
  ): void {
    const host = hostname || dst;
    const sport = 40000 + ((tick + port) % 20000);
    const resp =
      state === "open"
        ? `${dst}:${port} > ${this.myIp}:${sport} [SYN, ACK]`
        : state === "closed"
          ? `${dst}:${port} > ${this.myIp}:${sport} [RST, ACK]`
          : `(sin respuesta — puerto filtrado)`;
    const wire =
      `TCP ${this.myIp}:${sport} > ${dst}:${port} [SYN]\r\n${resp}` +
      (banner ? `\r\n${banner}` : "");
    this.push({
      tick,
      src: this.myIp,
      dst,
      proto: "TCP",
      summary: `TCP ${host}:${port} ${state}${banner ? " · " + banner.split("\r")[0] : ""}`,
      detail: wire.replace(/\r?\n/g, "  "),
      wire,
      length: wire.length,
      host,
      port,
    });
  }

  /**
   * IDS PASIVO: detecta patrones de escaneo en el tráfico REAL ya capturado
   * (§5/§25 — cierra recon ofensivo ↔ defensivo). No inventa ni emite eventos:
   * es análisis puro del cable, como un IDS de verdad. Reconoce tres patrones:
   *   - port-scan: un origen toca muchos puertos DISTINTOS de un mismo host.
   *   - host-sweep: un origen toca (TCP) muchos hosts DISTINTOS (barrido horizontal).
   *   - ping-sweep: un origen hace ICMP a muchos hosts distintos (barrido de vida).
   * Umbrales configurables; por defecto pensados para el sandbox.
   */
  detectScans(opts: { portThreshold?: number; hostThreshold?: number } = {}): ScanFinding[] {
    const portTh = opts.portThreshold ?? 5;
    const hostTh = opts.hostThreshold ?? 4;
    const findings: ScanFinding[] = [];

    // --- port-scan: agrupar TCP por (src, dst) y contar puertos distintos ---
    const byPair = new Map<string, { src: string; dst: string; ports: Set<number>; first: number; last: number; count: number }>();
    // --- barridos: por origen, hosts distintos (TCP e ICMP por separado) ---
    const tcpHostsBySrc = new Map<string, { hosts: Set<string>; first: number; last: number; count: number }>();
    const icmpHostsBySrc = new Map<string, { hosts: Set<string>; first: number; last: number; count: number }>();

    for (const p of this.packets) {
      if (p.proto === "TCP") {
        const key = `${p.src}|${p.dst}`;
        const e = byPair.get(key) ?? { src: p.src, dst: p.host || p.dst, ports: new Set<number>(), first: p.tick, last: p.tick, count: 0 };
        if (typeof p.port === "number") e.ports.add(p.port);
        e.first = Math.min(e.first, p.tick);
        e.last = Math.max(e.last, p.tick);
        e.count += 1;
        byPair.set(key, e);

        const t = tcpHostsBySrc.get(p.src) ?? { hosts: new Set<string>(), first: p.tick, last: p.tick, count: 0 };
        t.hosts.add(p.dst);
        t.first = Math.min(t.first, p.tick);
        t.last = Math.max(t.last, p.tick);
        t.count += 1;
        tcpHostsBySrc.set(p.src, t);
      } else if (p.proto === "ICMP") {
        const i = icmpHostsBySrc.get(p.src) ?? { hosts: new Set<string>(), first: p.tick, last: p.tick, count: 0 };
        i.hosts.add(p.dst);
        i.first = Math.min(i.first, p.tick);
        i.last = Math.max(i.last, p.tick);
        i.count += 1;
        icmpHostsBySrc.set(p.src, i);
      }
    }

    for (const e of byPair.values()) {
      if (e.ports.size >= portTh) {
        findings.push({
          src: e.src,
          kind: "port-scan",
          target: e.dst,
          ports: [...e.ports].sort((a, b) => a - b),
          hosts: [],
          count: e.count,
          firstTick: e.first,
          lastTick: e.last,
          severity: e.ports.size >= 20 ? "high" : "medium",
        });
      }
    }
    for (const [src, t] of tcpHostsBySrc) {
      if (t.hosts.size >= hostTh) {
        findings.push({
          src,
          kind: "host-sweep",
          ports: [],
          hosts: [...t.hosts].sort(),
          count: t.count,
          firstTick: t.first,
          lastTick: t.last,
          severity: t.hosts.size >= 16 ? "high" : "medium",
        });
      }
    }
    for (const [src, i] of icmpHostsBySrc) {
      if (i.hosts.size >= hostTh) {
        findings.push({
          src,
          kind: "ping-sweep",
          ports: [],
          hosts: [...i.hosts].sort(),
          count: i.count,
          firstTick: i.first,
          lastTick: i.last,
          severity: "medium",
        });
      }
    }
    // Los más ruidosos primero.
    return findings.sort((a, b) => b.count - a.count);
  }

  /**
   * Materializa un paquete HTTP de la VÍCTIMA que el atacante ve por estar en
   * el medio (MITM/ARP spoofing). El origen es la víctima (no el jugador), y el
   * cuerpo lleva el login en claro: por eso 'sniff creds' lo cosecha. Es lo que
   * hace real al ataque: sin cifrar, el que está en el medio lee todo.
   */
  recordIntercepted(
    srcIp: string,
    srcName: string,
    targetHost: string,
    targetIp: string,
    method: string,
    path: string,
    user: string,
    field: string,
    value: string,
    tick: number,
  ): void {
    const body = `usuario=${user}&${field}=${value}`;
    const wire =
      `${method} ${path} HTTP/1.1\r\n` +
      `Host: ${targetHost}\r\n` +
      `Content-Type: application/x-www-form-urlencoded\r\n` +
      `Content-Length: ${body.length}\r\n\r\n${body}`;
    this.push({
      tick,
      src: srcIp,
      dst: targetIp || targetHost,
      proto: "HTTP",
      summary: `(MITM) ${method} ${targetHost}${path} ⟵ ${srcName}`,
      detail: `INTERCEPTADO de ${srcName} (${srcIp}): ${method} ${path} Host: ${targetHost}  ${body}`,
      wire,
      length: wire.length,
      method,
      host: targetHost,
      path,
      leak: { field, value },
    });
  }

  /* -------------------------------------------------------------- consulta */

  count(): number {
    return this.seq;
  }

  all(): Packet[] {
    return [...this.packets];
  }

  recent(n = 100): Packet[] {
    return this.packets.slice(-n);
  }

  /**
   * Filtro de visualización estilo Wireshark, de verdad: soporta el lenguaje
   * completo (campos, operadores, and/or/not, paréntesis). Si la sintaxis está
   * mal, no tira: devuelve lista vacía (la UI pinta la barra en rojo).
   */
  filter(expr: string): Packet[] {
    return applyFilter(this.packets, expr);
  }

  /** Valida una expresión de filtro: {ok, error} (para la barra roja/verde). */
  validateFilter(expr: string): { ok: boolean; error?: string } {
    const c = compileFilter(expr);
    return { ok: c.ok, error: c.error };
  }

  /** Volcado hexadecimal + ASCII de los bytes del paquete (panel de Wireshark). */
  hexdump(p: Packet): string {
    const bytes = p.wire ?? p.detail;
    const lines: string[] = [];
    for (let off = 0; off < bytes.length; off += 16) {
      const chunk = bytes.slice(off, off + 16);
      const hex: string[] = [];
      let ascii = "";
      for (let i = 0; i < 16; i += 1) {
        if (i < chunk.length) {
          const code = chunk.charCodeAt(i) & 0xff;
          hex.push(code.toString(16).padStart(2, "0"));
          ascii += code >= 32 && code < 127 ? chunk[i] : ".";
        } else {
          hex.push("  ");
          ascii += " ";
        }
        if (i === 7) hex.push("");
      }
      lines.push(`${off.toString(16).padStart(4, "0")}  ${hex.join(" ")}  ${ascii}`);
    }
    return lines.join("\n");
  }

  /** Jerarquía de protocolos (Statistics → Protocol Hierarchy de Wireshark). */
  protocolHierarchy(): { proto: L7; count: number; bytes: number; pct: number }[] {
    const by = new Map<L7, { count: number; bytes: number }>();
    for (const p of this.packets) {
      const e = by.get(p.proto) ?? { count: 0, bytes: 0 };
      e.count += 1;
      e.bytes += p.length;
      by.set(p.proto, e);
    }
    const total = this.packets.length || 1;
    return [...by.entries()]
      .map(([proto, e]) => ({ proto, count: e.count, bytes: e.bytes, pct: Math.round((e.count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }

  /** Conversaciones entre pares de extremos (Statistics → Conversations). */
  conversations(): { a: string; b: string; packets: number; bytes: number }[] {
    const by = new Map<string, { a: string; b: string; packets: number; bytes: number }>();
    for (const p of this.packets) {
      const [a, b] = [p.src, p.dst].sort();
      const key = `${a}|${b}`;
      const e = by.get(key) ?? { a, b, packets: 0, bytes: 0 };
      e.packets += 1;
      e.bytes += p.length;
      by.set(key, e);
    }
    return [...by.values()].sort((x, y) => y.packets - x.packets);
  }

  /**
   * Sigue el "stream" de un paquete: reensambla toda la conversación entre sus
   * dos extremos, en orden, con la dirección de cada tramo (Follow TCP Stream).
   */
  followStream(pkt: Packet): { packets: Packet[]; text: string } {
    const a = pkt.src;
    const b = pkt.dst;
    const inStream = this.packets.filter(
      (p) => (p.src === a && p.dst === b) || (p.src === b && p.dst === a),
    );
    const text = inStream
      .map((p) => {
        const arrow = p.src === a ? "→" : "←";
        return `${arrow} ${p.wire ?? p.detail}`;
      })
      .join("\n\n");
    return { packets: inStream, text };
  }

  /** Sigue un "stream" con un host: todos los paquetes de/hacia él, en orden. */
  followHost(host: string): Packet[] {
    const h = host.toLowerCase();
    return this.packets.filter(
      (p) => p.dst.toLowerCase().includes(h) || p.src.toLowerCase().includes(h),
    );
  }

  /** Credenciales vistas en claro: la cosecha del sniffer (fuga educativa). */
  credentials(): { host: string; field: string; value: string; tick: number }[] {
    return this.packets
      .filter((p) => p.leak)
      .map((p) => ({ host: p.dst, field: p.leak!.field, value: p.leak!.value, tick: p.tick }));
  }

  clear(): void {
    this.packets = [];
  }
}
