import type { EventBus } from "../events/EventBus";

/**
 * Grupos hacker de ÑANDE.
 *
 * Colectivos de hackers ÉTICOS: equipos rojos y azules, gente de CTF y
 * activistas de privacidad. Trabajan siempre dentro del sandbox y de forma
 * legal (todo es ficticio y educativo). Crecen con el tiempo, hacen
 * operaciones (retos, avisos de seguridad) y el jugador puede unirse a uno.
 */

export interface HackerGroup {
  id: string;
  name: string;
  focus: "red-team" | "blue-team" | "ctf" | "privacidad" | "osint";
  tag: string;
  description: string;
  members: number;
  reputation: number;
  recruiting: boolean;
}

export interface GroupOp {
  id: string;
  groupId: string;
  text: string;
  tick: number;
}

const STORAGE_KEY = "nande-groups";
const MAX_OPS = 40;
const GROW_INTERVAL = 70;

const SEED_GROUPS: HackerGroup[] = [
  {
    id: "g-redteam",
    name: "ÑANDE Red Team",
    focus: "red-team",
    tag: "🔴",
    description: "Equipo rojo ético: emulan atacantes, con permiso, para encontrar fallos antes que los malos. Solo en laboratorios.",
    members: 24,
    reputation: 120,
    recruiting: true,
  },
  {
    id: "g-blueteam",
    name: "Guardianes Azules",
    focus: "blue-team",
    tag: "🔵",
    description: "Equipo azul: defienden, detectan y responden. Vigilan los sistemas del mundo virtual.",
    members: 31,
    reputation: 140,
    recruiting: true,
  },
  {
    id: "g-ctf",
    name: "CTF Collective",
    focus: "ctf",
    tag: "🏴",
    description: "Colectivo que arma y resuelve retos de captura la bandera. Aprenden compitiendo.",
    members: 45,
    reputation: 98,
    recruiting: true,
  },
  {
    id: "g-privacidad",
    name: "Privacidad Guaraní",
    focus: "privacidad",
    tag: "🛡️",
    description: "Activistas de derechos digitales: enseñan a proteger datos y a usar la tecnología con seguridad. Todo legal y educativo.",
    members: 18,
    reputation: 110,
    recruiting: true,
  },
  {
    id: "g-osint",
    name: "OSINT Ñande",
    focus: "osint",
    tag: "🔎",
    description: "Investigan con información pública (ficticia) para aprender correlación y análisis.",
    members: 22,
    reputation: 76,
    recruiting: false,
  },
];

/** Operaciones ejemplo por tipo de grupo (todas legales, en el sandbox). */
const OPS: Record<HackerGroup["focus"], string[]> = {
  "red-team": [
    "publicó un informe de un lab vulnerado (con permiso).",
    "emuló un ataque a una máquina de práctica y documentó las fallas.",
  ],
  "blue-team": [
    "detectó un escaneo sospechoso y publicó cómo defenderse.",
    "endureció la configuración de un servidor de laboratorio.",
  ],
  ctf: [
    "lanzó un nuevo reto de captura la bandera.",
    "resolvió un CTF difícil y compartió la solución.",
  ],
  privacidad: [
    "publicó una guía para proteger tus datos.",
    "dio un taller de privacidad para principiantes.",
  ],
  osint: [
    "armó un caso de investigación con datos ficticios.",
    "compartió técnicas de análisis de información pública.",
  ],
};

interface GroupsState {
  groups: HackerGroup[];
  ops: GroupOp[];
  memberOf: string | null;
  opCounter: number;
  lastGrow: number;
}

export class HackerGroups {
  private state: GroupsState;
  private events?: EventBus;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(events?: EventBus) {
    this.events = events;
    const saved = this.load();
    this.state = saved ?? {
      groups: SEED_GROUPS.map((g) => ({ ...g })),
      ops: [],
      memberOf: null,
      opCounter: 1,
      lastGrow: 0,
    };
  }

  private load(): GroupsState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as GroupsState;
      if (!s || !Array.isArray(s.groups)) return null;
      return s;
    } catch {
      return null;
    }
  }

  private write(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Los grupos siguen en memoria si no se guarda.
    }
  }

  private save(): void {
    if (this.saveTimer !== null) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.write();
    }, 700);
  }

  flush(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.write();
  }

  all(): HackerGroup[] {
    return this.state.groups.map((g) => ({ ...g }));
  }

  get(id: string): HackerGroup | undefined {
    const g = this.state.groups.find((x) => x.id === id);
    return g ? { ...g } : undefined;
  }

  memberOf(): string | null {
    return this.state.memberOf;
  }

  recentOps(limit = 12): GroupOp[] {
    return this.state.ops.slice(-limit).reverse();
  }

  count(): number {
    return this.state.groups.length;
  }

  /** El jugador se une a un grupo (deja el anterior si tenía). */
  join(id: string): { ok: boolean; message: string } {
    const group = this.state.groups.find((g) => g.id === id);
    if (!group) return { ok: false, message: "Ese grupo no existe." };
    if (!group.recruiting && this.state.memberOf !== id) {
      return { ok: false, message: `${group.name} no está reclutando ahora.` };
    }
    if (this.state.memberOf === id) {
      return { ok: false, message: `Ya sos parte de ${group.name}.` };
    }

    this.state.memberOf = id;
    group.members += 1;
    this.save();

    this.events?.emit("group.joined", { groupId: id, name: group.name });

    return { ok: true, message: `Te uniste a ${group.name}. ${group.tag}` };
  }

  leave(): { ok: boolean; message: string } {
    if (!this.state.memberOf) {
      return { ok: false, message: "No estás en ningún grupo." };
    }
    const g = this.state.groups.find((x) => x.id === this.state.memberOf);
    this.state.memberOf = null;
    if (g) g.members = Math.max(0, g.members - 1);
    this.save();
    return { ok: true, message: "Saliste del grupo." };
  }

  /** Con el tiempo los grupos suman gente y publican operaciones. */
  tick(tick: number): void {
    if (tick - this.state.lastGrow < GROW_INTERVAL) return;
    this.state.lastGrow = tick;

    const group =
      this.state.groups[Math.floor(Math.random() * this.state.groups.length)];

    // Crece un poco y sube reputación.
    group.members += 1;
    group.reputation += Math.floor(Math.random() * 3);

    // Publica una operación.
    const options = OPS[group.focus];
    const text = `${group.name} ${options[Math.floor(Math.random() * options.length)]}`;

    this.state.ops.push({
      id: `op-${this.state.opCounter++}`,
      groupId: group.id,
      text,
      tick,
    });

    if (this.state.ops.length > MAX_OPS) {
      this.state.ops.splice(0, this.state.ops.length - MAX_OPS);
    }

    this.events?.emit("group.op", { groupId: group.id, text });
    this.save();
  }
}
