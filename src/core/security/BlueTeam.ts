import type { EventBus } from "../events/EventBus";
import type { RuntimeEvent } from "../net/HostRuntime";

/**
 * BlueTeamSOC — el centro de operaciones de seguridad que consume EVENTOS
 * REALES del runtime. No inventa alertas para llenar pantallas: cada alerta
 * nace de algo que de verdad pasó en el mundo (un servicio caído, un login
 * fallido, un proceso muerto), correlacionado en el tiempo.
 *
 * Cierra el Experimento A: apagás un servicio → el runtime emite el evento →
 * el SOC lo detecta y lo clasifica. Si sacás toda la UI, el SOC igual sabe qué
 * pasó, porque escucha el EventBus, no la pantalla.
 */

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  host: string;
  detail: string;
  tick: number;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/** Ventana (en ticks) para correlacionar intentos de acceso fallidos. */
const BRUTE_WINDOW = 30;
const BRUTE_THRESHOLD = 3;

export class BlueTeamSOC {
  private alerts: Alert[] = [];
  private seq = 0;
  private failuresByHost = new Map<string, number[]>();
  private unsub: () => void;

  constructor(events: EventBus) {
    this.unsub = events.subscribe<RuntimeEvent>("runtime.host", (event) => {
      this.ingest(event.data);
    });
  }

  dispose(): void {
    this.unsub();
  }

  /** Traduce un evento de runtime en alerta (o la descarta si es ruido). */
  private ingest(e: RuntimeEvent): void {
    switch (e.kind) {
      case "service.stopped":
        this.raise("high", "Caída de servicio", e, `El servicio ${e.service} de ${e.host} se detuvo.`);
        break;
      case "process.killed":
        this.raise("high", "Proceso terminado", e, `${e.detail} en ${e.host}.`);
        break;
      case "login.success":
        this.raise("medium", "Acceso remoto exitoso", e, `${e.detail}.`);
        break;
      case "login.failure":
        this.trackBruteForce(e);
        break;
      case "port.blocked":
        this.raise("info", "Cambio de firewall", e, `${e.detail} en ${e.host}.`);
        break;
      case "connection.refused":
        this.raise("low", "Conexión rechazada", e, `${e.detail} en ${e.host}.`);
        break;
      case "host.down":
        this.raise("critical", "Host caído", e, `${e.host} dejó de responder.`);
        break;
      default:
        // service.started / port.unblocked / host.up: recuperación, info baja.
        this.raise("info", "Cambio de estado", e, `${e.detail} en ${e.host}.`);
    }
  }

  /** Varios login fallidos al mismo host en poco tiempo = fuerza bruta. */
  private trackBruteForce(e: RuntimeEvent): void {
    const hits = (this.failuresByHost.get(e.host) ?? []).filter(
      (t) => e.tick - t <= BRUTE_WINDOW,
    );
    hits.push(e.tick);
    this.failuresByHost.set(e.host, hits);

    if (hits.length >= BRUTE_THRESHOLD) {
      this.raise(
        "critical",
        "Posible fuerza bruta",
        e,
        `${hits.length} intentos de acceso fallidos a ${e.host} en poco tiempo.`,
      );
    } else {
      this.raise("medium", "Intento de acceso fallido", e, `${e.detail}.`);
    }
  }

  private raise(severity: Severity, title: string, e: RuntimeEvent, detail: string): void {
    this.alerts.push({
      id: `a${++this.seq}`,
      severity,
      title,
      host: e.host,
      detail,
      tick: e.tick,
    });
  }

  /* -------------------------------------------------------------- consulta */

  /** Alertas más recientes primero. */
  list(limit = 50): Alert[] {
    return this.alerts.slice(-limit).reverse();
  }

  count(): number {
    return this.alerts.length;
  }

  countBySeverity(): Record<Severity, number> {
    const out: Record<Severity, number> = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
    for (const a of this.alerts) out[a.severity] += 1;
    return out;
  }

  /** La alerta más grave abierta (para el badge del SOC). */
  topSeverity(): Severity | null {
    let top: Severity | null = null;
    for (const a of this.alerts) {
      if (top === null || SEVERITY_ORDER[a.severity] > SEVERITY_ORDER[top]) {
        top = a.severity;
      }
    }
    return top;
  }

  clear(): void {
    this.alerts = [];
    this.failuresByHost.clear();
  }
}
