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

  /**
   * Calificación profesional de la operación (0–100 + letra). No premia sólo
   * "llegar": premia CÓMO llegaste. Tres ejes que reflejan un pentest real:
   *  - Progreso/objetivo: cuánto de la kill chain lograste (Domain Admins pesa).
   *  - Sigilo/OPSEC: la exposición y cada contención del equipo azul restan —
   *    tomar el dominio en silencio (Tor, sin detecciones) vale más que a los
   *    gritos. Refuerza la lección de OPSEC.
   *  - Tradecraft: la diversidad de técnicas ATT&CK ejecutadas (cobertura).
   * Todo derivado del estado real (regla 20).
   */
  grade(): {
    score: number;
    letter: string;
    objectiveMet: boolean;
    breakdown: { label: string; points: number; max: number; note: string }[];
    notes: string[];
  } {
    const s = this.status();
    // Progreso (máx 50): 40 por reservar el peso al objetivo (Domain Admins) y el
    // resto repartido en las demás fases logradas.
    const nonImpactDone = s.phases.filter((p) => p.done && p.id !== "domain-dominance").length;
    const progress = (s.objectiveMet ? 30 : 0) + Math.min(20, nonImpactDone * 4);
    // Sigilo (máx 30): partís de 30; exposición y contenciones restan.
    const stealth = Math.max(0, 30 - (s.exposed ? 15 : 0) - Math.min(15, s.detections * 5));
    // Tradecraft (máx 20): 3 puntos por técnica distinta.
    const tradecraft = Math.min(20, s.techniques.length * 3);
    const score = Math.round(progress + stealth + tradecraft);
    const letter = score >= 90 ? "S" : score >= 75 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
    const notes: string[] = [];
    notes.push(s.objectiveMet ? "✔ Objetivo cumplido: control del dominio." : "○ Objetivo pendiente: aún no controlás el dominio.");
    notes.push(s.exposed
      ? "⚠ OPSEC: quedaste EXPUESTO (IP real rastreable). Enrutá por Tor para no delatarte."
      : "🕶️ OPSEC: operaste sin exposición.");
    notes.push(s.detections === 0
      ? "🥷 Sigilo: el equipo azul no te contuvo."
      : `📣 Ruido: el equipo azul te contuvo ${s.detections} vez/veces (perdés puntos de sigilo).`);
    notes.push(s.techniques.length >= 7
      ? "🧰 Tradecraft amplio: buena diversidad de técnicas."
      : `🧰 Técnicas ejecutadas: ${s.techniques.length} (ampliá la cobertura para más puntos).`);
    if (s.impactAchieved) notes.push("💥 Impacto sobre objetivos logrado (fase final).");
    return {
      score,
      letter,
      objectiveMet: s.objectiveMet,
      breakdown: [
        { label: "Progreso / objetivo", points: progress, max: 50, note: `${s.completedCount}/${s.totalPhases} fases; dominio ${s.objectiveMet ? "comprometido" : "en pie"}` },
        { label: "Sigilo / OPSEC", points: stealth, max: 30, note: `${s.exposed ? "expuesto" : "sin exposición"}, ${s.detections} contención(es)` },
        { label: "Tradecraft (ATT&CK)", points: tradecraft, max: 20, note: `${s.techniques.length} técnica(s) distinta(s)` },
      ],
      notes,
    };
  }

  /**
   * Próximas jugadas CONCRETAS derivadas del estado real (el asesor ofensivo,
   * espejo del recommend() del ContainmentEngine). No es el consejo genérico de
   * la fase: lee el grafo de AD, las cuentas con SPN, las plantillas ESC1 y lo ya
   * comprometido para decir el comando exacto que más te acerca al objetivo.
   * Regla 15 hecha acción: siempre hay un próximo paso, y es específico.
   */
  nextActions(): { command: string; why: string }[] {
    const dir = this.deps.directory;
    const out: { command: string; why: string }[] = [];

    if (!dir.domainOwned()) {
      // 1) Ruta más corta del grafo (NandeBlood): el primer borde abusable.
      const path = dir.pathToDomainAdmins();
      const step = path?.[0];
      if (step && step.type !== "MemberOf") {
        out.push({ command: `abuse ${step.from} ${step.to}`, why: `avanza hacia Domain Admins por el grafo (${step.how})` });
      }
      // 2) Cuenta de servicio con SPN sin poseer → Kerberoasting.
      const spn = dir.kerberoastable().find((p) => !p.owned && !p.disabled);
      if (spn) {
        out.push({ command: `kerberoast ${spn.name}`, why: "cuenta de servicio con SPN: pedí el TGS y crackéalo offline" });
      }
      // 3) ADCS ESC1: si hay plantilla vulnerable, impersoná a un Domain Admin.
      const esc1 = dir.esc1Templates()[0];
      const da = dir.domainAdmins().find((p) => !p.owned);
      if (esc1 && da) {
        out.push({ command: `certipy req -template ${esc1.name} -upn ${da.name}`, why: "ADCS ESC1: emití un cert como un Domain Admin (luego certipy auth)" });
      }
    } else {
      // Ya tenés el dominio: persistencia e impacto (fase final opcional).
      const flags = this.deps.flags();
      if (!flags.includes("ND{golden_ticket_persistencia}")) {
        out.push({ command: "mimikatz lsadump::dcsync", why: "volcá krbtgt para forjar persistencia (Golden Ticket)" });
      }
      if (!flags.some((f) => /^ND\{ot_/.test(f))) {
        out.push({ command: "netmap", why: "buscá el salto IT→OT para el impacto físico (opcional)" });
      }
    }

    if (out.length === 0) {
      const s = this.status();
      if (s.current) out.push({ command: "", why: s.current.nextHint });
    }
    return out.slice(0, 3);
  }

  /** Informe de la operación (after-action report), listo para leer/pegar. */
  report(): string {
    const s = this.status();
    const g = this.grade();
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
      "",
      `─────────── CALIFICACIÓN: ${g.letter}  (${g.score}/100) ───────────`,
      ...g.breakdown.map((b) => `  ${b.label.padEnd(22)} ${String(b.points).padStart(2)}/${b.max}   (${b.note})`),
      ...g.notes.map((n) => `  ${n}`),
    ].join("\n");
  }
}
