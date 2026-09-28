import type { AttackSignal } from "../ad/Directory";
import type { Directory } from "../ad/Directory";
import type { HostRuntime } from "../net/HostRuntime";
import type { OpPhaseId } from "./Operation";

/**
 * AdversaryEmulator — el MEGA motor: un adversario VIVO que corre una campaña
 * completa contra ÑANDE, y contra el cual el jugador defiende en tiempo real.
 * Estilo MITRE Caldera / adversary emulation, pero conectado a los motores
 * REALES: cada paso del playbook ejecuta una técnica de verdad (emite la señal
 * ATT&CK que ven el SOC, el DFIR, la matriz y el equipo azul) y avanza la
 * kill chain del adversario hacia su objetivo (dominio u OT).
 *
 * Lo que lo hace un sistema y no un guion (reglas 3/5/10/11): cada paso DEPENDE
 * de un activo real (una cuenta de dominio o un host). Si el defensor CONTIENE
 * ese activo antes —deshabilita la cuenta con `contain account`, aísla el host
 * con `contain host`— el paso queda BLOQUEADO y el adversario no avanza. La
 * contención del jugador frena de verdad a un adversario en marcha. Es el
 * ejercicio purple-team completo: detectás (SOC/DFIR) y contenés (Containment)
 * antes de que el adversario cumpla su objetivo, o perdés la ronda.
 *
 * No toca la posesión del JUGADOR (no ensucia su operación): mantiene su propio
 * progreso y sólo emite señales + consulta si sus activos fueron contenidos.
 */

export type EmuStatus = "idle" | "running" | "blocked" | "succeeded" | "stopped";

export interface EmuStep {
  id: string;
  name: string;
  tactic: string;
  mitreId: string;
  phase: OpPhaseId;
  detail: string;
  /** Activo del que depende: si el defensor lo contiene, el paso se bloquea. */
  requires?: { host?: string; account?: string };
}

export interface AdversaryProfile {
  id: string;
  name: string;
  objective: string;
  description: string;
  playbook: EmuStep[];
}

export interface EmuLogEntry {
  seq: number;
  tick: number;
  step: string;
  mitreId: string;
  outcome: "ejecutado" | "bloqueado";
  note: string;
}

const PROFILES: AdversaryProfile[] = [
  {
    id: "ana-reta",
    name: "Aña Retã (APT de dominio)",
    objective: "domain",
    description:
      "Grupo APT que va por el Directorio Activo: entra por una estación, roba una cuenta de servicio, se mueve lateral y replica los secretos del DC hasta ser Domain Admin.",
    playbook: [
      { id: "s1", name: "Reconocimiento del dominio", tactic: "Reconnaissance", mitreId: "T1590.002", phase: "recon",
        detail: "Enumeración de DNS/AD para mapear cuentas y servicios." },
      { id: "s2", name: "Acceso inicial (estación de trabajo)", tactic: "Initial Access", mitreId: "T1078", phase: "initial-access",
        detail: "Credenciales válidas en la estación de una analista.", requires: { host: "server.nande" } },
      { id: "s3", name: "Kerberoasting de la cuenta de servicio", tactic: "Credential Access", mitreId: "T1558.003", phase: "credential-access",
        detail: "Pide el TGS de SVC-SQL y lo crackea offline.", requires: { account: "SVC-SQL@NANDE.LOCAL" } },
      { id: "s4", name: "Movimiento lateral a DB01", tactic: "Lateral Movement", mitreId: "T1021", phase: "lateral-movement",
        detail: "SVC-SQL es admin local de DB01: salta ahí.", requires: { account: "SVC-SQL@NANDE.LOCAL" } },
      { id: "s5", name: "Volcado de credenciales del DBA", tactic: "Credential Access", mitreId: "T1003", phase: "credential-access",
        detail: "En DB01 hay sesión del DBA (ADMIN-SQL): roba su hash.", requires: { account: "ADMIN-SQL@NANDE.LOCAL" } },
      { id: "s6", name: "DCSync / Domain Admins", tactic: "Impact", mitreId: "T1078.002", phase: "domain-dominance",
        detail: "Con el DBA replica los secretos del dominio: control total.", requires: { account: "ADMIN-SQL@NANDE.LOCAL" } },
    ],
  },
  {
    id: "karai-ot",
    name: "Karaí OT (sabotaje industrial)",
    objective: "ot",
    description:
      "Actor estilo TRITON que cruza de IT a OT: pivotea por la LAN corporativa hasta la planta, deshabilita el sistema de seguridad (SIS) y fuerza el proceso a un estado destructivo.",
    playbook: [
      { id: "o1", name: "Reconocimiento externo", tactic: "Reconnaissance", mitreId: "T1590.002", phase: "recon",
        detail: "Mapea la exposición y el jump host." },
      { id: "o2", name: "Acceso al jump host", tactic: "Initial Access", mitreId: "T1078", phase: "initial-access",
        detail: "Entra al servidor puente de la LAN interna.", requires: { host: "server.nande" } },
      { id: "o3", name: "Pivote a la LAN interna (NAS)", tactic: "Lateral Movement", mitreId: "T1021", phase: "lateral-movement",
        detail: "Salta al NAS de respaldos del segmento interno.", requires: { host: "nas.interna.nande" } },
      { id: "o4", name: "Salto IT→OT (consola HMI)", tactic: "Lateral Movement", mitreId: "T1021", phase: "lateral-movement",
        detail: "Alcanza la consola del operador de la planta.", requires: { host: "hmi.planta.nande" } },
      { id: "o5", name: "Deshabilitar el SIS", tactic: "Inhibit Response Function", mitreId: "T0858", phase: "impact",
        detail: "Cambia el modo del controlador de seguridad: sin red de protección.", requires: { host: "plc.planta.nande" } },
      { id: "o6", name: "Sabotaje del proceso físico", tactic: "Impact", mitreId: "T0879", phase: "impact",
        detail: "Fuerza la sobrepresión: daño físico irreversible.", requires: { host: "plc.planta.nande" } },
    ],
  },
];

interface EmuDeps {
  emit: (signal: AttackSignal) => void;
  directory: Directory;
  hosts: HostRuntime;
  clock: () => number;
  onBreach?: (profile: AdversaryProfile) => void;
}

export class AdversaryEmulator {
  private deps: EmuDeps;
  private profileId: string | null = null;
  private idx = 0;
  private stance: EmuStatus = "idle";
  private log: EmuLogEntry[] = [];
  private seq = 0;
  private lastBlock?: string;

  constructor(deps: EmuDeps) {
    this.deps = deps;
  }

  profiles(): AdversaryProfile[] {
    return PROFILES.map((p) => ({ ...p, playbook: p.playbook.map((s) => ({ ...s })) }));
  }

  private profile(): AdversaryProfile | null {
    return PROFILES.find((p) => p.id === this.profileId) ?? null;
  }

  /** Arma un adversario y lo deja listo para correr (resetea el progreso). */
  start(id: string): { ok: boolean; message: string } {
    const p = PROFILES.find((x) => x.id === id);
    if (!p) return { ok: false, message: `adversario desconocido: ${id}` };
    this.profileId = p.id;
    this.idx = 0;
    this.stance = "running";
    this.log = [];
    this.seq = 0;
    this.lastBlock = undefined;
    return { ok: true, message: `Adversario "${p.name}" armado. Objetivo: ${p.objective}. Corré la simulación (adversario step / run) y defendé.` };
  }

  stop(): void {
    if (this.stance === "running" || this.stance === "blocked") this.stance = "stopped";
  }

  /** ¿El activo que necesita el paso fue contenido por el defensor? */
  private blockedReason(step: EmuStep): string | null {
    if (step.requires?.account && this.deps.directory.isDisabled(step.requires.account)) {
      return `la cuenta ${step.requires.account} está DESHABILITADA (contención)`;
    }
    if (step.requires?.host && this.deps.hosts.isIsolated(step.requires.host)) {
      return `el host ${step.requires.host} está AISLADO (contención)`;
    }
    return null;
  }

  /**
   * Avanza UN paso del adversario. Si el activo que necesita fue contenido, el
   * paso queda bloqueado (no avanza) y el adversario espera. Si no, ejecuta la
   * técnica REAL (emite la señal ATT&CK que ve todo el stack azul) y avanza.
   */
  step(): { status: EmuStatus; blocked: boolean; done: boolean; note: string } {
    const p = this.profile();
    if (!p || (this.stance !== "running" && this.stance !== "blocked")) {
      return { status: this.stance, blocked: false, done: this.stance === "succeeded", note: "el adversario no está corriendo" };
    }
    const step = p.playbook[this.idx];
    const reason = this.blockedReason(step);
    if (reason) {
      this.stance = "blocked";
      this.lastBlock = reason;
      this.log.push({ seq: ++this.seq, tick: this.deps.clock(), step: step.name, mitreId: step.mitreId, outcome: "bloqueado", note: reason });
      return { status: this.stance, blocked: true, done: false, note: `Bloqueado en "${step.name}": ${reason}` };
    }
    // Ejecuta la técnica REAL: emite la señal (SOC/DFIR/MITRE/azul la ven).
    this.deps.emit({
      technique: step.name,
      tactic: step.tactic,
      mitreId: step.mitreId,
      detail: `[${p.name}] ${step.detail}`,
      host: step.requires?.host ?? step.requires?.account ?? "NANDE.LOCAL",
    });
    this.lastBlock = undefined;
    this.log.push({ seq: ++this.seq, tick: this.deps.clock(), step: step.name, mitreId: step.mitreId, outcome: "ejecutado", note: step.detail });
    this.idx += 1;
    this.stance = "running";
    if (this.idx >= p.playbook.length) {
      this.stance = "succeeded";
      this.deps.onBreach?.(p);
      return { status: this.stance, blocked: false, done: true, note: `El adversario CUMPLIÓ su objetivo (${p.objective}).` };
    }
    return { status: this.stance, blocked: false, done: false, note: `Ejecutado: ${step.name}` };
  }

  /** Corre pasos hasta cumplir el objetivo, bloquearse o agotar el tope. */
  run(maxSteps = 20): { status: EmuStatus; executed: number; note: string } {
    let executed = 0;
    for (let i = 0; i < maxSteps; i += 1) {
      const before = this.idx;
      const r = this.step();
      if (r.blocked) return { status: this.stance, executed, note: r.note };
      if (this.idx > before) executed += 1;
      if (r.done) return { status: this.stance, executed, note: r.note };
      if (this.stance !== "running") break;
    }
    return { status: this.stance, executed, note: `Ejecutados ${executed} paso(s).` };
  }

  /** Estado vivo del adversario: dónde va, qué necesita el próximo paso. */
  state(): {
    profile: AdversaryProfile | null;
    status: EmuStatus;
    idx: number;
    total: number;
    nextStep: EmuStep | null;
    nextRequires: string | null;
    blockedReason?: string;
    log: EmuLogEntry[];
  } {
    const p = this.profile();
    const nextStep = p && this.idx < p.playbook.length ? p.playbook[this.idx] : null;
    const req = nextStep?.requires;
    return {
      profile: p,
      status: this.stance,
      idx: this.idx,
      total: p?.playbook.length ?? 0,
      nextStep,
      nextRequires: req?.account ? `cuenta ${req.account}` : req?.host ? `host ${req.host}` : null,
      blockedReason: this.stance === "blocked" ? this.lastBlock : undefined,
      log: [...this.log],
    };
  }
}
