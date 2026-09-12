/**
 * Directory — un Directorio Activo (AD) virtual: dominio NANDE.LOCAL con
 * usuarios, grupos y equipos, y un grafo de relaciones (MemberOf, AdminTo,
 * HasSession, GenericAll…) igual que el que dibuja BloodHound.
 *
 * No es un decorado: el grafo es ESTADO REAL. Cuando "poseés" un principal
 * (porque crackeaste su hash de Kerberoasting o abusaste de una ACL), el
 * conjunto de nodos poseídos cambia, y NandeBlood recalcula la ruta de ataque
 * más corta hacia Domain Admins DESDE ese estado. La ruta no está escrita:
 * se deriva del grafo y de lo que ya conquistaste.
 *
 * Todo es ficticio y sandboxeado: cero identidades reales, cero red real.
 */

export type PrincipalKind = "user" | "group" | "computer";

export interface Principal {
  name: string;
  kind: PrincipalKind;
  owned: boolean;
  /** Cuenta de servicio (SPN): objetivo de Kerberoasting. */
  spn?: string;
  /** Contraseña "débil" que un crack offline revelaría (solo cuentas SPN). */
  weakPassword?: string;
  /** Notas para el jugador (dónde encaja en la historia). */
  note?: string;
}

export type EdgeType =
  | "MemberOf"
  | "AdminTo"
  | "HasSession"
  | "GenericAll"
  | "ForceChangePassword"
  | "CanRDP";

export interface Edge {
  from: string;
  to: string;
  type: EdgeType;
}

export interface AttackStep {
  from: string;
  to: string;
  type: EdgeType;
  /** Cómo se recorre este borde (la técnica). */
  how: string;
}

/** Señal ofensiva que el correlador MITRE puede detectar. */
export interface AttackSignal {
  technique: string;
  tactic: string;
  mitreId: string;
  detail: string;
  host: string;
}

const DA_GROUP = "DOMAIN ADMINS@NANDE.LOCAL";

export class Directory {
  private principals = new Map<string, Principal>();
  private edges: Edge[] = [];
  private onSignal?: (s: AttackSignal) => void;
  readonly domain = "NANDE.LOCAL";

  constructor(onSignal?: (s: AttackSignal) => void) {
    this.onSignal = onSignal;
    this.seed();
  }

  /** Emite una señal ofensiva para que la detecte el correlador (Purple). */
  private signal(s: AttackSignal): void {
    this.onSignal?.(s);
  }

  private add(p: Principal): void {
    this.principals.set(p.name.toUpperCase(), p);
  }

  private edge(from: string, to: string, type: EdgeType): void {
    this.edges.push({ from: from.toUpperCase(), to: to.toUpperCase(), type });
  }

  /**
   * Siembra un dominio pequeño pero realista con una cadena de escalada
   * clásica: foothold → grupo → GenericAll → cuenta SPN kerberoasteable →
   * admin de un equipo donde el DA tiene sesión → Domain Admins.
   */
  private seed(): void {
    this.add({ name: "JUGADOR@NANDE.LOCAL", kind: "user", owned: true, note: "Tu foothold inicial (usuario de dominio sin privilegios)." });
    this.add({ name: "MESA-AYUDA@NANDE.LOCAL", kind: "group", owned: false, note: "Grupo de soporte técnico." });
    this.add({ name: "LORE.MARTINEZ@NANDE.LOCAL", kind: "user", owned: false, note: "Analista. Podés forzarle el cambio de clave desde Mesa de Ayuda." });
    this.add({ name: "SVC-SQL@NANDE.LOCAL", kind: "user", owned: false, spn: "MSSQL/db01.nande.local", weakPassword: "Verano2024!", note: "Cuenta de servicio con SPN: kerberoasteable (clave débil)." });
    this.add({ name: "WS-LORE@NANDE.LOCAL", kind: "computer", owned: false, note: "Estación de trabajo de Lore." });
    this.add({ name: "DB01@NANDE.LOCAL", kind: "computer", owned: false, note: "Servidor de base de datos." });
    this.add({ name: "ADMIN-SQL@NANDE.LOCAL", kind: "user", owned: false, note: "DBA con sesión en DB01 y miembro de Domain Admins." });
    this.add({ name: DA_GROUP, kind: "group", owned: false, note: "El objetivo: control total del dominio." });

    // Cadena de ataque (cada borde es una técnica real de AD):
    this.edge("JUGADOR@NANDE.LOCAL", "MESA-AYUDA@NANDE.LOCAL", "MemberOf");
    this.edge("MESA-AYUDA@NANDE.LOCAL", "LORE.MARTINEZ@NANDE.LOCAL", "ForceChangePassword");
    this.edge("LORE.MARTINEZ@NANDE.LOCAL", "WS-LORE@NANDE.LOCAL", "AdminTo");
    this.edge("SVC-SQL@NANDE.LOCAL", "WS-LORE@NANDE.LOCAL", "HasSession");
    this.edge("LORE.MARTINEZ@NANDE.LOCAL", "SVC-SQL@NANDE.LOCAL", "GenericAll");
    this.edge("SVC-SQL@NANDE.LOCAL", "DB01@NANDE.LOCAL", "AdminTo");
    this.edge("ADMIN-SQL@NANDE.LOCAL", "DB01@NANDE.LOCAL", "HasSession");
    this.edge("DB01@NANDE.LOCAL", "ADMIN-SQL@NANDE.LOCAL", "HasSession");
    this.edge("ADMIN-SQL@NANDE.LOCAL", DA_GROUP, "MemberOf");

    // El foothold ya hereda su membresía inicial (Mesa de Ayuda).
    this.propagateMembership();
  }

  /* ------------------------------------------------------------- consulta */

  all(): Principal[] {
    return [...this.principals.values()];
  }

  get(name: string): Principal | undefined {
    return this.principals.get(name.toUpperCase());
  }

  owned(): Principal[] {
    return this.all().filter((p) => p.owned);
  }

  allEdges(): Edge[] {
    return [...this.edges];
  }

  /** ¿Ya tenés control total del dominio? (poseés Domain Admins) */
  domainOwned(): boolean {
    return this.get(DA_GROUP)?.owned ?? false;
  }

  /** Cuentas con SPN: los objetivos de Kerberoasting. */
  kerberoastable(): Principal[] {
    return this.all().filter((p) => p.spn);
  }

  /* ------------------------------------------------------------- acciones */

  /** Marca un principal como poseído (por crack, abuso de ACL, etc.). */
  own(name: string): boolean {
    const p = this.get(name);
    if (!p || p.owned) return false;
    p.owned = true;
    this.propagateMembership();
    return true;
  }

  /**
   * Posesión transitiva de membresía: si poseés un principal, poseés los
   * grupos de los que es MemberOf (heredás su membresía). Se aplica hasta
   * punto fijo, así una cadena de grupos se resuelve de una.
   */
  private propagateMembership(): void {
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of this.edges) {
        if (e.type !== "MemberOf") continue;
        const from = this.get(e.from);
        const to = this.get(e.to);
        if (from?.owned && to && !to.owned) {
          to.owned = true;
          changed = true;
        }
      }
    }
  }

  /**
   * Kerberoasting: pedís el ticket de una cuenta SPN y obtenés un "hash"
   * crackeable offline. Devuelve el hash simulado (no revela la clave).
   */
  kerberoast(spnUser: string): { ok: boolean; hash?: string; message: string } {
    const p = this.get(spnUser);
    if (!p || !p.spn) {
      return { ok: false, message: `${spnUser} no tiene SPN (no es kerberoasteable)` };
    }
    // Pedir el TGS deja rastro en el DC (evento 4769): es detectable.
    this.signal({
      technique: "Kerberoasting",
      tactic: "Credential Access",
      mitreId: "T1558.003",
      detail: `Solicitud de TGS para la cuenta de servicio ${p.name} (SPN ${p.spn}).`,
      host: this.domain,
    });
    // "Hash" determinista y ficticio: sólo sirve dentro del sandbox.
    const hash = `$krb5tgs$23$*${p.name}*$${fakeHash(p.name + (p.weakPassword ?? ""))}`;
    return { ok: true, hash, message: `TGS de ${p.name} obtenido. Crackéalo offline.` };
  }

  /**
   * Crack offline del hash de Kerberoasting: si la clave es débil (está en el
   * "diccionario"), revienta y poseés la cuenta de servicio. Real: cambia el
   * estado de posesión, y NandeBlood recalcula la ruta.
   */
  crack(spnUser: string, guess: string): { ok: boolean; message: string } {
    const p = this.get(spnUser);
    if (!p || !p.spn) return { ok: false, message: `${spnUser} no es una cuenta SPN` };
    if (p.owned) return { ok: true, message: `${p.name} ya estaba comprometida` };
    if (guess === p.weakPassword) {
      this.own(p.name);
      return { ok: true, message: `¡Clave crackeada! Poseés ${p.name} (${guess}).` };
    }
    return { ok: false, message: `Clave incorrecta para ${p.name}` };
  }

  /**
   * Abusa de un borde ofensivo (GenericAll / ForceChangePassword / AdminTo /
   * HasSession) para tomar el nodo destino: sólo funciona si ya poseés el
   * origen del borde. Es el "recorrer una arista" de BloodHound, con efecto
   * real en el estado.
   */
  abuse(from: string, to: string): { ok: boolean; message: string } {
    const f = this.get(from);
    const t = this.get(to);
    if (!f || !t) return { ok: false, message: "principal desconocido" };
    if (!f.owned) return { ok: false, message: `todavía no poseés ${f.name}` };
    const edge = this.edges.find(
      (e) => e.from === f.name && e.to === t.name,
    );
    if (!edge) return { ok: false, message: `no hay relación de ${f.name} a ${t.name}` };
    if (edge.type === "MemberOf") {
      return { ok: false, message: "MemberOf no se 'abusa': la membresía se hereda al poseer" };
    }
    this.own(t.name);
    this.signal(abuseSignal(edge.type, f.name, t.name));
    if (this.domainOwned()) {
      this.signal({
        technique: "Domain Dominance",
        tactic: "Impact",
        mitreId: "T1078.002",
        detail: `Compromiso de Domain Admins en ${this.domain} tras la cadena de escalada.`,
        host: this.domain,
      });
    }
    return {
      ok: true,
      message: `Abusaste ${edge.type} (${f.name} → ${t.name}). Ahora poseés ${t.name}.`,
    };
  }

  /* --------------------------------------------------------- NandeBlood */

  /**
   * NandeBlood: la ruta de ataque más corta DESDE cualquier nodo poseído hacia
   * el objetivo (por defecto Domain Admins). BFS sobre el grafo real. Devuelve
   * la lista de pasos (o null si aún no hay ruta desde lo que poseés).
   */
  pathToDomainAdmins(target = DA_GROUP): AttackStep[] | null {
    const goal = target.toUpperCase();
    // Si ya poseés el objetivo, no hay ruta pendiente: llegaste.
    if (this.get(goal)?.owned) return null;
    const starts = this.owned().map((p) => p.name);
    if (starts.length === 0) return null;

    const prev = new Map<string, { from: string; type: EdgeType }>();
    const queue: string[] = [...starts];
    const seen = new Set<string>(starts);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur === goal) break;
      for (const e of this.edges) {
        if (e.from !== cur) continue;
        if (seen.has(e.to)) continue;
        seen.add(e.to);
        prev.set(e.to, { from: cur, type: e.type });
        queue.push(e.to);
      }
    }

    if (!seen.has(goal)) return null;

    // Reconstruir la ruta desde el objetivo hacia atrás.
    const steps: AttackStep[] = [];
    let node = goal;
    while (prev.has(node)) {
      const { from, type } = prev.get(node)!;
      steps.unshift({ from, to: node, type, how: howTo(type) });
      node = from;
    }
    return steps;
  }
}

/** Mapea el abuso de un borde a su técnica MITRE. */
function abuseSignal(type: EdgeType, from: string, to: string): AttackSignal {
  const base = { detail: `Abuso ${type}: ${from} → ${to}.`, host: "NANDE.LOCAL" };
  switch (type) {
    case "ForceChangePassword":
      return { ...base, technique: "Account Manipulation", tactic: "Persistence", mitreId: "T1098" };
    case "GenericAll":
      return { ...base, technique: "Domain Policy Modification", tactic: "Privilege Escalation", mitreId: "T1484" };
    case "AdminTo":
      return { ...base, technique: "Valid Accounts / Local Admin", tactic: "Lateral Movement", mitreId: "T1078" };
    case "HasSession":
      return { ...base, technique: "Credential Dumping (token)", tactic: "Credential Access", mitreId: "T1003" };
    case "CanRDP":
      return { ...base, technique: "Remote Services (RDP)", tactic: "Lateral Movement", mitreId: "T1021.001" };
    case "MemberOf":
      return { ...base, technique: "Group Membership", tactic: "Privilege Escalation", mitreId: "T1078" };
  }
}

/** Descripción de la técnica para recorrer un borde del grafo. */
function howTo(type: EdgeType): string {
  switch (type) {
    case "MemberOf": return "heredás la membresía del grupo";
    case "AdminTo": return "sos admin local del equipo → volcás credenciales";
    case "HasSession": return "hay una sesión activa → robás su token/hash";
    case "GenericAll": return "control total del objeto → le forzás la clave o SPN";
    case "ForceChangePassword": return "le cambiás la contraseña y entrás";
    case "CanRDP": return "te conectás por RDP";
  }
}

/** Hash ficticio determinista (NO criptográfico): sólo para el sandbox. */
function fakeHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").repeat(4);
}
