import type { CompromiseLog } from "../net/CompromiseLog";
import type { Directory } from "../ad/Directory";
import type { MitreCorrelator } from "../soc/Mitre";
import type { OpsecTracer } from "../game/OpsecTracer";
import type { BlueTeamResponder } from "../soc/BlueResponder";
import type { ContainmentEngine } from "../soc/Containment";

/**
 * OperationEngine — el motor que convierte "una colección de herramientas" en
 * UNA operación coherente (regla maestra 25). No es un guion lineal como la
 * campaña: es una máquina de fases de la kill chain (alineada a MITRE ATT&CK)
 * cuyo avance se DERIVA del estado REAL de todos los demás motores —recon (DNS/
 * escaneo), acceso inicial (hosts comprometidos), acceso a credenciales (AD),
 * movimiento lateral (pivoteo), dominancia de dominio (Domain Admins) e impacto
 * (sabotaje OT)— más la presión del equipo azul autónomo y la exposición OPSEC.
 *
 * Dos jugadores llegan a la misma fase por caminos distintos y ambos cuentan
 * (regla 11): la fase está "hecha" porque el MUNDO lo demuestra, no porque se
 * tipeó un comando concreto. Es la conciencia situacional de un pentest entero
 * y su informe final. 100% derivado del estado; si no pasó, no figura.
 */

export type OpPhaseId =
  | "recon"
  | "initial-access"
  | "credential-access"
  | "lateral-movement"
  | "domain-dominance"
  | "impact";

export interface OpPhase {
  id: OpPhaseId;
  name: string;
  /** Táctica ATT&CK que representa. */
  tactic: string;
  /** Qué hay que lograr (objetivo de la fase). */
  goal: string;
  /** ¿Está lograda AHORA? Derivado del estado real. */
  done: boolean;
  /** La evidencia que el motor observó (por qué está o no hecha). */
  detail: string;
  /** El próximo paso concreto si falta (regla 15: siempre hay uno). */
  nextHint: string;
}

export interface OperationStatus {
  phases: OpPhase[];
  completedCount: number;
  totalPhases: number;
  /** La fase pendiente más temprana (el foco actual), o null si terminó. */
  current: OpPhase | null;
  domainOwned: boolean;
  /** El objetivo central (Domain Admins) está cumplido. */
  objectiveMet: boolean;
  /** Impacto físico/negocio logrado (fase final opcional). */
  impactAchieved: boolean;
  /** Técnicas ATT&CK únicas observadas. */
  techniques: string[];
  /** Contención sufrida (interferencia del equipo azul). */
  detections: number;
  contained: { hosts: string[]; accounts: string[] };
  /** OPSEC: ¿quedaste expuesto? + calor actual. */
  exposed: boolean;
  heat: number;
}

interface OperationDeps {
  compromises: CompromiseLog;
  directory: Directory;
  mitre: MitreCorrelator;
  opsec: OpsecTracer;
  blue: BlueTeamResponder;
  containment: ContainmentEngine;
  flags: () => string[];
}

const RECON_IDS = new Set(["T1590.002", "T1046", "T1595", "T1595.001", "T1595.002"]);
const CRED_IDS = new Set(["T1558.003", "T1558.004", "T1003.006", "T1003", "T1649", "T1550", "T1550.002", "T1110", "T1040"]);
const LATERAL_IDS = new Set(["T1021", "T1021.001", "T1550.002", "T1570"]);
const IMPACT_IDS = new Set(["T0879", "T0880", "T0828", "T0831", "T0858", "T1489", "T1486", "T1485"]);
const FOOTHOLD = "JUGADOR@NANDE.LOCAL";

export class OperationEngine {
  private deps: OperationDeps;

  constructor(deps: OperationDeps) {
    this.deps = deps;
  }

  /** Estado vivo de la operación, derivado de TODOS los motores ahora mismo. */
  status(): OperationStatus {
    const techIds = new Set(this.deps.mitre.techniques().map((t) => t.mitreId));
    const has = (set: Set<string>) => [...techIds].some((id) => set.has(id));
    const comp = this.deps.compromises.all();
    const flags = this.deps.flags();
    const ownedUsers = this.deps.directory
      .owned()
      .filter((p) => p.kind === "user" && p.name !== FOOTHOLD);
    const pivoted = comp.some((c) => c.via !== null);
    const domainOwned = this.deps.directory.domainOwned();
    const otFlag = flags.some((f) => /^ND\{ot_/.test(f));
    const contained = {
      hosts: this.deps.containment.isolatedHosts(),
      accounts: this.deps.containment.disabledAccounts(),
    };
    const opsec = this.deps.opsec.state();

    const reconDone = has(RECON_IDS) || comp.length > 0 || ownedUsers.length > 0 || domainOwned;
    const accessDone = comp.length > 0 || ownedUsers.length > 0 || domainOwned;
    const credDone = ownedUsers.length > 0 || has(CRED_IDS) || domainOwned;
    const lateralDone = pivoted || comp.length >= 2 || has(LATERAL_IDS) || domainOwned;
    const impactDone = otFlag || has(IMPACT_IDS);

    const phases: OpPhase[] = [
      {
        id: "recon", name: "Reconocimiento", tactic: "Reconnaissance",
        goal: "Mapear la red y descubrir hosts/servicios/nombres internos.",
        done: reconDone,
        detail: reconDone
          ? "Actividad de recon observada (escaneo/DNS) o ya hay activos comprometidos."
          : "Todavía sin recon registrado.",
        nextHint: "Escaneá (nmap 10.10.0.0/24), o probá recon de DNS: dig axfr interna.nande",
      },
      {
        id: "initial-access", name: "Acceso inicial", tactic: "Initial Access",
        goal: "Conseguir el primer foothold en un host de la red.",
        done: accessDone,
        detail: accessDone
          ? `${comp.length} host(s) comprometido(s).`
          : "Sin foothold todavía.",
        nextHint: "Explotá un servicio/web o entrá por credenciales débiles: connect <host> <user> <clave>",
      },
      {
        id: "credential-access", name: "Acceso a credenciales", tactic: "Credential Access",
        goal: "Robar credenciales / cuentas de dominio (hashes, tickets, certs).",
        done: credDone,
        detail: credDone
          ? `${ownedUsers.length} cuenta(s) de dominio poseída(s)${has(CRED_IDS) ? " + técnicas de robo detectadas" : ""}.`
          : "Sin credenciales de dominio todavía.",
        nextHint: "enum4linux nande.local; luego kerberoast / asreproast / certipy (ESC1) y crackéalo.",
      },
      {
        id: "lateral-movement", name: "Movimiento lateral", tactic: "Lateral Movement",
        goal: "Pivotar hacia segmentos internos usando lo comprometido.",
        done: lateralDone,
        detail: lateralDone
          ? pivoted ? "Pivoteo confirmado (acceso vía un host puente)." : `${comp.length} host(s): movimiento lateral en curso.`
          : "Sin pivoteo todavía.",
        nextHint: "Desde un host comprometido: netmap para ver la red interna, y connect al siguiente salto.",
      },
      {
        id: "domain-dominance", name: "Dominancia de dominio", tactic: "Impact / Persistence",
        goal: "Comprometer Domain Admins: control total del Directorio Activo.",
        done: domainOwned,
        detail: domainOwned ? "🏆 Dominio COMPROMETIDO (Domain Admins)." : "El dominio sigue en pie.",
        nextHint: "Encadená la escalada en nandeblood; o ESC1 (certipy) / DCSync (mimikatz) hacia un DA.",
      },
      {
        id: "impact", name: "Impacto / objetivos", tactic: "Impact",
        goal: "Acción sobre objetivos: sabotaje OT, DoS o destrucción (opcional).",
        done: impactDone,
        detail: impactDone ? "Impacto logrado (OT/negocio)." : "Sin impacto físico/negocio (fase opcional).",
        nextHint: "Si el objetivo lo pide: salto IT→OT (modbus) y sabotaje del proceso. OJO con el SIS.",
      },
    ];

    const current = phases.find((p) => !p.done && p.id !== "impact") ?? phases.find((p) => !p.done) ?? null;

    return {
      phases,
      completedCount: phases.filter((p) => p.done).length,
      totalPhases: phases.length,
      current,
      domainOwned,
      objectiveMet: domainOwned,
      impactAchieved: impactDone,
      techniques: [...techIds].sort(),
      detections: this.deps.blue.count(),
      contained,
      exposed: this.deps.opsec.atRisk(),
      heat: opsec.heat,
    };
  }

  /** Informe de la operación (after-action report), listo para leer/pegar. */
  report(): string {
    const s = this.status();
    const line = (p: OpPhase) => `  ${p.done ? "✔" : "○"} ${p.name} (${p.tactic}) — ${p.detail}`;
    const verdict = s.objectiveMet
      ? (s.impactAchieved
        ? "OBJETIVO CUMPLIDO + IMPACTO: dominio comprometido y acción sobre objetivos lograda."
        : "OBJETIVO CUMPLIDO: control total del dominio (Domain Admins).")
      : `EN CURSO: ${s.completedCount}/${s.totalPhases} fases. Foco: ${s.current?.name ?? "—"}.`;
    return [
      "══════════ INFORME DE OPERACIÓN (after-action) ══════════",
      `Veredicto: ${verdict}`,
      `Progreso de la kill chain: ${s.completedCount}/${s.totalPhases} fases`,
      "",
      "Fases:",
      ...s.phases.map(line),
      "",
      `Técnicas ATT&CK ejecutadas (${s.techniques.length}): ${s.techniques.join(", ") || "—"}`,
      `OPSEC: ${s.exposed ? "⚠ EXPUESTO" : "🕶️ sin exposición"} · calor ${s.heat}`,
      `Equipo azul: ${s.detections} respuesta(s) de contención` +
        (s.contained.hosts.length || s.contained.accounts.length
          ? ` · aislados: ${s.contained.hosts.join(", ") || "—"} · deshabilitados: ${s.contained.accounts.join(", ") || "—"}`
          : ""),
    ].join("\n");
  }
}
