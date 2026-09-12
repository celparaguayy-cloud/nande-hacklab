import type { EventBus } from "../events/EventBus";
import type { RuntimeEvent } from "../net/HostRuntime";
import type { TrafficRecord } from "../browser/VirtualBrowser";
import type { AttackSignal } from "../ad/Directory";

/**
 * MitreCorrelator — el cerebro Purple del universo. Escucha los MISMOS eventos
 * reales que produce el mundo (logins, servicios, tráfico, acciones ofensivas)
 * y los mapea a técnicas de MITRE ATT&CK. Es la prueba viva del principio
 * "las consecuencias se propagan": cada cosa que hacés en ataque enciende una
 * detección en defensa. No inventa detecciones: si no atacás, no hay nada.
 *
 * Correlaciona en el tiempo: N logins fallidos seguidos = fuerza bruta; un
 * login exitoso tras fallos = cuentas válidas; credencial en claro capturada =
 * material sin cifrar. La táctica y la técnica salen de lo que de verdad pasó.
 */

export interface Detection {
  seq: number;
  mitreId: string;
  technique: string;
  tactic: string;
  detail: string;
  host: string;
  tick: number;
  confidence: "low" | "medium" | "high";
}

const BRUTE_WINDOW = 40;
const BRUTE_THRESHOLD = 4;
const SECRET_FIELDS = ["password", "pass", "clave", "contrasena", "contraseña", "pin", "token", "secret"];

export class MitreCorrelator {
  private detections: Detection[] = [];
  private seq = 0;
  private clock: () => number;
  private unsubs: (() => void)[] = [];
  private failsByHost = new Map<string, number[]>();

  constructor(events: EventBus, clock: () => number) {
    this.clock = clock;
    this.unsubs.push(
      events.subscribe<RuntimeEvent>("runtime.host", (e) => this.fromRuntime(e.data)),
    );
    this.unsubs.push(
      events.subscribe<TrafficRecord>("network.request", (e) => this.fromHttp(e.data)),
    );
    this.unsubs.push(
      events.subscribe<AttackSignal>("attack.technique", (e) => this.fromSignal(e.data)),
    );
  }

  dispose(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  private raise(d: Omit<Detection, "seq" | "tick">): void {
    this.detections.push({ ...d, seq: ++this.seq, tick: this.clock() });
    if (this.detections.length > 500) this.detections.splice(0, this.detections.length - 500);
  }

  private fromRuntime(e: RuntimeEvent): void {
    if (e.kind === "login.failure") {
      const arr = this.failsByHost.get(e.host) ?? [];
      arr.push(e.tick);
      const recent = arr.filter((t) => e.tick - t <= BRUTE_WINDOW);
      this.failsByHost.set(e.host, recent);
      if (recent.length === BRUTE_THRESHOLD) {
        this.raise({
          mitreId: "T1110",
          technique: "Brute Force",
          tactic: "Credential Access",
          detail: `${recent.length} intentos de acceso fallidos a ${e.host} en ${BRUTE_WINDOW} ticks.`,
          host: e.host,
          confidence: "high",
        });
      }
      return;
    }
    if (e.kind === "login.success") {
      const fails = (this.failsByHost.get(e.host) ?? []).filter((t) => e.tick - t <= BRUTE_WINDOW);
      if (fails.length >= 2) {
        this.raise({
          mitreId: "T1078",
          technique: "Valid Accounts (tras fuerza bruta)",
          tactic: "Defense Evasion / Persistence",
          detail: `Acceso exitoso a ${e.host} después de ${fails.length} fallos: posible credencial adivinada.`,
          host: e.host,
          confidence: "medium",
        });
      }
      this.failsByHost.set(e.host, []);
      return;
    }
    if (e.kind === "service.stopped") {
      this.raise({
        mitreId: "T1489",
        technique: "Service Stop",
        tactic: "Impact",
        detail: `El servicio ${e.service} de ${e.host} fue detenido.`,
        host: e.host,
        confidence: "medium",
      });
    }
  }

  private fromHttp(t: TrafficRecord): void {
    for (const [k, v] of Object.entries(t.reqBody)) {
      if (SECRET_FIELDS.includes(k.toLowerCase()) && v) {
        this.raise({
          mitreId: "T1040",
          technique: "Network Sniffing (credencial en claro)",
          tactic: "Credential Access",
          detail: `Credencial "${k}" viajó sin cifrar hacia ${t.host} (HTTP).`,
          host: t.host,
          confidence: "high",
        });
        return;
      }
    }
  }

  private fromSignal(s: AttackSignal): void {
    this.raise({
      mitreId: s.mitreId,
      technique: s.technique,
      tactic: s.tactic,
      detail: s.detail,
      host: s.host,
      confidence: "high",
    });
  }

  /* -------------------------------------------------------------- consulta */

  count(): number {
    return this.seq;
  }

  all(): Detection[] {
    return [...this.detections];
  }

  recent(n = 50): Detection[] {
    return this.detections.slice(-n);
  }

  /** Técnicas únicas detectadas (para pintar la matriz ATT&CK). */
  techniques(): { mitreId: string; technique: string; tactic: string; count: number }[] {
    const map = new Map<string, { mitreId: string; technique: string; tactic: string; count: number }>();
    for (const d of this.detections) {
      const cur = map.get(d.mitreId);
      if (cur) cur.count += 1;
      else map.set(d.mitreId, { mitreId: d.mitreId, technique: d.technique, tactic: d.tactic, count: 1 });
    }
    return [...map.values()];
  }

  /** Agrupa por táctica (columnas de la matriz ATT&CK). */
  byTactic(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const t of this.techniques()) {
      (out[t.tactic] ??= []).push(`${t.mitreId} ${t.technique}`);
    }
    return out;
  }

  clear(): void {
    this.detections = [];
  }
}
