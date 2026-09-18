import type { EventBus } from "../events/EventBus";
import type { RuntimeEvent } from "../net/HostRuntime";
import { compileQuery, runQuery, type QuerySchema } from "../query/Query";

/**
 * BlueTeamSOC — un SIEM de verdad, no un panel decorativo. Consume EVENTOS
 * REALES del runtime y los pasa por un catálogo de REGLAS DE DETECCIÓN con
 * nombre, severidad y técnica MITRE — como una regla Sigma o una búsqueda
 * guardada de Splunk/Wazuh.
 *
 * Y se opera como un SIEM real:
 *  - Cada alerta guarda la EVIDENCIA (el evento crudo que la disparó) para
 *    hacer drilldown, y la REGLA que la generó.
 *  - Triage: abierta → reconocida / falso positivo / escalada.
 *  - Búsqueda con lenguaje de consulta: severity >= high and host contains nande
 *
 * Si sacás toda la UI, el SOC igual sabe qué pasó: escucha el EventBus.
 */

export type Severity = "info" | "low" | "medium" | "high" | "critical";
export type AlertStatus = "open" | "ack" | "false_positive" | "escalated";

/** Una regla de detección, al estilo Sigma: qué busca y cómo la clasifica. */
export interface DetectionRule {
  id: string;
  name: string;
  severity: Severity;
  /** Técnica MITRE ATT&CK que representa. */
  mitre?: string;
  /** Qué condición del mundo la dispara. */
  description: string;
}

/** Catálogo de reglas: esto es lo que el SOC "sabe detectar". */
export const DETECTION_RULES: DetectionRule[] = [
  { id: "ND-001", name: "Caída de servicio", severity: "high", mitre: "T1489 · Service Stop",
    description: "Un servicio que estaba escuchando dejó de hacerlo." },
  { id: "ND-002", name: "Proceso terminado", severity: "high", mitre: "T1489 · Service Stop",
    description: "Un proceso del host fue matado." },
  { id: "ND-003", name: "Acceso remoto exitoso", severity: "medium", mitre: "T1078 · Valid Accounts",
    description: "Alguien autenticó correctamente contra un host." },
  { id: "ND-004", name: "Intento de acceso fallido", severity: "medium", mitre: "T1110 · Brute Force",
    description: "Credenciales inválidas contra un host." },
  { id: "ND-005", name: "Posible fuerza bruta", severity: "critical", mitre: "T1110.001 · Password Guessing",
    description: "3 o más accesos fallidos al mismo host dentro de la ventana de correlación." },
  { id: "ND-006", name: "Cambio de firewall", severity: "info", mitre: "T1562.004 · Disable or Modify System Firewall",
    description: "Se bloqueó o desbloqueó un puerto." },
  { id: "ND-007", name: "Conexión rechazada", severity: "low",
    description: "Un intento de conexión fue rechazado (puerto cerrado o filtrado)." },
  { id: "ND-008", name: "Host caído", severity: "critical", mitre: "T1499 · Endpoint Denial of Service",
    description: "Un host dejó de responder por completo." },
  { id: "ND-009", name: "Cambio de estado", severity: "info",
    description: "Recuperación o cambio menor de estado de un host/servicio." },
];

const RULE_BY_ID = new Map(DETECTION_RULES.map((r) => [r.id, r]));

export interface AlertEvidence {
  kind: string;
  host: string;
  service?: string;
  port?: number;
  detail: string;
  tick: number;
}

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  host: string;
  detail: string;
  tick: number;
  /** Regla que la disparó (drilldown al catálogo). */
  ruleId: string;
  mitre?: string;
  /** Estado del triage. */
  status: AlertStatus;
  /** El evento crudo que la originó: la prueba. */
  evidence: AlertEvidence;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  info: 0, low: 1, medium: 2, high: 3, critical: 4,
};

/** Esquema de consulta del SOC (la "barra de búsqueda" del SIEM). */
const ALERT_SCHEMA: QuerySchema<Alert> = {
  isKnownField(field) {
    return [
      "severity", "host", "title", "detail", "rule", "ruleid", "mitre",
      "status", "tick", "text", "open", "ack", "escalated", "false_positive",
    ].includes(field.toLowerCase());
  },
  value(a, field) {
    switch (field.toLowerCase()) {
      case "severity": return a.severity;
      case "host": return a.host;
      case "title": return a.title;
      case "detail": return a.detail;
      case "rule":
      case "ruleid": return `${a.ruleId} ${RULE_BY_ID.get(a.ruleId)?.name ?? ""}`;
      case "mitre": return a.mitre ?? "";
      case "status": return a.status;
      case "tick": return a.tick;
      case "text": return `${a.title} ${a.detail} ${a.host} ${a.ruleId}`;
      case "open": return a.status === "open";
      case "ack": return a.status === "ack";
      case "escalated": return a.status === "escalated";
      case "false_positive": return a.status === "false_positive";
      default: return undefined;
    }
  },
  ordinal(field, raw) {
    if (field.toLowerCase() !== "severity") return undefined;
    return SEVERITY_ORDER[String(raw).toLowerCase() as Severity];
  },
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

  /** Traduce un evento de runtime en alerta aplicando el catálogo de reglas. */
  private ingest(e: RuntimeEvent): void {
    switch (e.kind) {
      case "service.stopped":
        this.raise("ND-001", e, `El servicio ${e.service} de ${e.host} se detuvo.`);
        break;
      case "process.killed":
        this.raise("ND-002", e, `${e.detail} en ${e.host}.`);
        break;
      case "login.success":
        this.raise("ND-003", e, `${e.detail}.`);
        break;
      case "login.failure":
        this.trackBruteForce(e);
        break;
      case "port.blocked":
        this.raise("ND-006", e, `${e.detail} en ${e.host}.`);
        break;
      case "connection.refused":
        this.raise("ND-007", e, `${e.detail} en ${e.host}.`);
        break;
      case "host.down":
        this.raise("ND-008", e, `${e.host} dejó de responder.`);
        break;
      default:
        this.raise("ND-009", e, `${e.detail} en ${e.host}.`);
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
      this.raise("ND-005", e, `${hits.length} intentos de acceso fallidos a ${e.host} en poco tiempo.`);
    } else {
      this.raise("ND-004", e, `${e.detail}.`);
    }
  }

  private raise(ruleId: string, e: RuntimeEvent, detail: string): void {
    const rule = RULE_BY_ID.get(ruleId);
    this.alerts.push({
      id: `a${++this.seq}`,
      severity: rule?.severity ?? "info",
      title: rule?.name ?? "Alerta",
      host: e.host,
      detail,
      tick: e.tick,
      ruleId,
      mitre: rule?.mitre,
      status: "open",
      evidence: {
        kind: e.kind,
        host: e.host,
        service: e.service,
        port: e.port,
        detail: e.detail,
        tick: e.tick,
      },
    });
  }

  /* --------------------------------------------------------------- triage */

  /** Cambia el estado de triage de una alerta. Devuelve si existía. */
  setStatus(id: string, status: AlertStatus): boolean {
    const a = this.alerts.find((x) => x.id === id);
    if (!a) return false;
    a.status = status;
    return true;
  }
  acknowledge(id: string): boolean { return this.setStatus(id, "ack"); }
  falsePositive(id: string): boolean { return this.setStatus(id, "false_positive"); }
  escalate(id: string): boolean { return this.setStatus(id, "escalated"); }

  countByStatus(): Record<AlertStatus, number> {
    const out: Record<AlertStatus, number> = { open: 0, ack: 0, false_positive: 0, escalated: 0 };
    for (const a of this.alerts) out[a.status] += 1;
    return out;
  }

  /* -------------------------------------------------------------- consulta */

  /** El catálogo de reglas que el SOC sabe detectar. */
  rules(): DetectionRule[] {
    return [...DETECTION_RULES];
  }

  /** Cuántas alertas disparó cada regla (para ver qué detecta de verdad). */
  byRule(): { rule: DetectionRule; count: number }[] {
    const counts = new Map<string, number>();
    for (const a of this.alerts) counts.set(a.ruleId, (counts.get(a.ruleId) ?? 0) + 1);
    return DETECTION_RULES.map((rule) => ({ rule, count: counts.get(rule.id) ?? 0 }))
      .sort((x, y) => y.count - x.count);
  }

  /** Búsqueda con el lenguaje del SIEM. Sintaxis mala → lista vacía. */
  query(expr: string, limit = 200): Alert[] {
    return runQuery(this.alerts, expr, ALERT_SCHEMA).slice(-limit).reverse();
  }

  /** Valida una consulta: {ok, error} (para la barra roja/verde). */
  validateQuery(expr: string): { ok: boolean; error?: string } {
    const c = compileQuery(expr, ALERT_SCHEMA);
    return { ok: c.ok, error: c.error };
  }

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
