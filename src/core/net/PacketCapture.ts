import type { EventBus } from "../events/EventBus";
import type { TrafficRecord } from "../browser/VirtualBrowser";
import type { RuntimeEvent } from "./HostRuntime";

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
      leak,
    });
  }

  /** Materializa un paquete a partir de un evento del HostRuntime. */
  private fromRuntime(ev: RuntimeEvent): void {
    if (ev.kind === "login.success" || ev.kind === "login.failure") {
      this.push({
        tick: ev.tick,
        src: this.myIp,
        dst: ev.ip || ev.host,
        proto: "AUTH",
        summary: `${ev.kind === "login.success" ? "Login OK" : "Login FAIL"} → ${ev.host}`,
        detail: ev.detail,
      });
      return;
    }
    if (ev.kind === "connection.refused") {
      this.push({
        tick: ev.tick,
        src: this.myIp,
        dst: ev.ip || ev.host,
        proto: "TCP",
        summary: `RST ${ev.host}:${ev.port ?? "?"} (rechazada)`,
        detail: ev.detail,
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

  /** Filtro estilo Wireshark: por protocolo, host o texto libre. */
  filter(expr: string): Packet[] {
    const q = expr.trim().toLowerCase();
    if (!q) return this.all();
    const protoMatch = q.match(/^(http|ssh|tcp|auth|icmp)$/);
    if (protoMatch) {
      const p = protoMatch[1].toUpperCase() as L7;
      return this.packets.filter((pk) => pk.proto === p);
    }
    const hostMatch = q.match(/^host==(.+)$/) ?? q.match(/^ip\.addr==(.+)$/);
    if (hostMatch) {
      const h = hostMatch[1];
      // Coincide por IP (src/dst) o por nombre (que viaja en el resumen HTTP).
      return this.packets.filter(
        (pk) =>
          pk.src.includes(h) ||
          pk.dst.includes(h) ||
          pk.summary.toLowerCase().includes(h),
      );
    }
    return this.packets.filter(
      (pk) =>
        pk.summary.toLowerCase().includes(q) ||
        pk.detail.toLowerCase().includes(q),
    );
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
