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
  /** Marca educativa: este paquete lleva una credencial en claro. */
  leak?: { field: string; value: string };
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
