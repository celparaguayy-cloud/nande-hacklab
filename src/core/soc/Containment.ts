import type { HostRuntime } from "../net/HostRuntime";
import type { Directory } from "../ad/Directory";
import type { CompromiseLog } from "../net/CompromiseLog";

/**
 * ContainmentEngine — la RESPUESTA a incidentes del universo (el tercer acto del
 * Blue Team: detectar → investigar → RESPONDER). No es un botón decorativo:
 * orquesta cambios de estado REALES en dos motores a la vez —la red
 * (HostRuntime) y la identidad (Directory)— y deja un registro auditable de cada
 * acción de contención.
 *
 * Dos acciones, ambas con consecuencia verificable:
 *  - AISLAR un host: deja de ser alcanzable y no sirve de pivote. Corta el
 *    movimiento lateral de verdad (canReach lo respeta desde una sola regla).
 *  - DESHABILITAR una cuenta: no puede autenticarse ni usar sus privilegios.
 *    Es la eviction real de una cuenta comprometida (abuse/PtH/PKINIT fallan).
 *
 * Y organiza: `recommend()` LEE el estado real (qué hosts tomó el atacante en
 * CompromiseLog, qué cuentas posee en el Directorio) y arma un plan de IR
 * priorizado —los pivotes y los Domain Admins primero—. `applyPlan()` lo
 * ejecuta. Es el motor que convierte "sé que me comprometieron" en "los
 * expulso", derivado del estado, no de un guion.
 */

export type ContainmentKind =
  | "host.isolate"
  | "host.release"
  | "account.disable"
  | "account.enable";

export interface ContainmentAction {
  seq: number;
  tick: number;
  kind: ContainmentKind;
  target: string;
  detail: string;
}

export interface ContainmentResult {
  ok: boolean;
  message: string;
  action?: ContainmentAction;
}

export type RecommendedAction = "isolate-host" | "disable-account";

export interface Recommendation {
  action: RecommendedAction;
  target: string;
  reason: string;
  /** 1 = urgente (pivote / Domain Admin); 2 = importante. */
  priority: 1 | 2;
}

/** El foothold del atacante: no es una "cuenta comprometida a deshabilitar". */
const ATTACKER_FOOTHOLD = "JUGADOR@NANDE.LOCAL";

export class ContainmentEngine {
  private hosts: HostRuntime;
  private directory: Directory;
  private compromises: CompromiseLog;
  private clock: () => number;
  private log: ContainmentAction[] = [];
  private seq = 0;

  constructor(
    hosts: HostRuntime,
    directory: Directory,
    compromises: CompromiseLog,
    clock: () => number = () => 0,
  ) {
    this.hosts = hosts;
    this.directory = directory;
    this.compromises = compromises;
    this.clock = clock;
  }

  private record(kind: ContainmentKind, target: string, detail: string): ContainmentAction {
    const action: ContainmentAction = { seq: ++this.seq, tick: this.clock(), kind, target, detail };
    this.log.push(action);
    return action;
  }

  /* --------------------------------------------------- acciones de red ---- */

  /** Aísla un host de la red (corta alcance y pivoteo). Estado real. */
  isolateHost(ref: string): ContainmentResult {
    const host = this.hosts.resolve(ref);
    if (!host) return { ok: false, message: `host desconocido: ${ref}` };
    if (host.isolated) return { ok: false, message: `${host.hostname} ya estaba aislado` };
    this.hosts.setIsolated(host.hostname, true);
    const action = this.record("host.isolate", host.hostname, `Host ${host.hostname} (${host.ip}) aislado: sin alcance ni pivoteo.`);
    return { ok: true, message: `${host.hostname} AISLADO. El atacante ya no llega ni pivotea por él.`, action };
  }

  /** Reintegra un host aislado a la red. */
  releaseHost(ref: string): ContainmentResult {
    const host = this.hosts.resolve(ref);
    if (!host) return { ok: false, message: `host desconocido: ${ref}` };
    if (!host.isolated) return { ok: false, message: `${host.hostname} no estaba aislado` };
    this.hosts.setIsolated(host.hostname, false);
    const action = this.record("host.release", host.hostname, `Host ${host.hostname} reintegrado a la red.`);
    return { ok: true, message: `${host.hostname} reintegrado a la red.`, action };
  }

  /* ----------------------------------------------- acciones de identidad -- */

  /** Deshabilita una cuenta comprometida (no puede autenticarse ni abusar). */
  disableAccount(name: string): ContainmentResult {
    const r = this.directory.setEnabled(name, false);
    if (!r.ok) {
      return { ok: false, message: r.principal ? `${r.principal} ya estaba deshabilitada` : `cuenta desconocida o no deshabilitable: ${name}` };
    }
    const action = this.record("account.disable", r.principal!, `Cuenta ${r.principal} deshabilitada: se corta su autenticación y sus privilegios.`);
    return { ok: true, message: `${r.principal} DESHABILITADA. El atacante ya no puede usarla.`, action };
  }

  /** Rehabilita una cuenta deshabilitada. */
  enableAccount(name: string): ContainmentResult {
    const r = this.directory.setEnabled(name, true);
    if (!r.ok) {
      return { ok: false, message: r.principal ? `${r.principal} ya estaba habilitada` : `cuenta desconocida: ${name}` };
    }
    const action = this.record("account.enable", r.principal!, `Cuenta ${r.principal} rehabilitada.`);
    return { ok: true, message: `${r.principal} rehabilitada.`, action };
  }

  /* -------------------------------------------------- plan / organización - */

  /**
   * Plan de contención derivado del ESTADO REAL: aísla los hosts que el atacante
   * comprometió (los pivotes primero, porque sostienen el movimiento lateral) y
   * deshabilita las cuentas de dominio que posee (los Domain Admins primero).
   * No inventa: lee CompromiseLog (hosts tomados) y Directory (cuentas poseídas).
   */
  recommend(): Recommendation[] {
    const recs: Recommendation[] = [];
    for (const c of this.compromises.all()) {
      if (this.hosts.isIsolated(c.hostname)) continue;
      const isPivot = this.hosts.reachableFrom(c.hostname).length > 0;
      recs.push({
        action: "isolate-host",
        target: c.hostname,
        reason: isPivot ? "pivote hacia hosts internos" : "host comprometido",
        priority: isPivot ? 1 : 2,
      });
    }
    for (const p of this.directory.owned()) {
      if (p.kind !== "user" || p.name === ATTACKER_FOOTHOLD) continue;
      if (this.directory.isDisabled(p.name)) continue;
      const isDA = this.directory.isDomainAdmin(p.name);
      recs.push({
        action: "disable-account",
        target: p.name,
        reason: isDA ? "miembro de Domain Admins" : "cuenta de dominio comprometida",
        priority: isDA ? 1 : 2,
      });
    }
    return recs.sort((a, b) => a.priority - b.priority || a.target.localeCompare(b.target));
  }

  /** Ejecuta el plan recomendado. Devuelve las acciones aplicadas. */
  applyPlan(): ContainmentResult[] {
    return this.recommend().map((r) =>
      r.action === "isolate-host" ? this.isolateHost(r.target) : this.disableAccount(r.target),
    );
  }

  /* -------------------------------------------------------------- consulta */

  actions(): ContainmentAction[] {
    return [...this.log];
  }

  /** Hosts actualmente aislados por contención. */
  isolatedHosts(): string[] {
    return this.hosts.all().filter((h) => h.isolated).map((h) => h.hostname).sort();
  }

  /** Cuentas actualmente deshabilitadas por contención. */
  disabledAccounts(): string[] {
    return this.directory.all().filter((p) => p.disabled).map((p) => p.name).sort();
  }

  count(): number {
    return this.log.length;
  }

  reset(): void {
    this.log = [];
    this.seq = 0;
  }
}
