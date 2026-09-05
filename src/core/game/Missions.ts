import type { EventBus } from "../events/EventBus";
import type { Progression, SkillId } from "./Progression";

/**
 * Misiones de ÑANDE.
 *
 * Una misión conecta el aprendizaje con una recompensa concreta: resolver
 * un laboratorio, usar una herramienta o completar un curso da XP, moneda
 * y sube una habilidad. Es el motor que hace sentir progreso.
 *
 * Los objetivos se cumplen por eventos del mundo (una bandera capturada,
 * un curso completado), no por autoconfirmación.
 */

export type MissionKind =
  | "tutorial"
  | "lab"
  | "course"
  | "tool"
  | "investigation";

export interface MissionReward {
  xp: number;
  coins: number;
  skill?: SkillId;
}

export interface MissionDef {
  id: string;
  title: string;
  /** Historia breve, en tono claro. */
  brief: string;
  kind: MissionKind;
  difficulty: "🟢" | "🔵" | "🟠" | "🔴";
  /** Cómo se cumple: laboratorio a resolver, curso a completar, etc. */
  target: { type: "lab" | "course" | "tool"; id: string };
  reward: MissionReward;
  /** Misiones que deben completarse antes (ids). */
  requires: string[];
  hint: string;
}

export interface MissionProgress {
  id: string;
  status: "bloqueada" | "disponible" | "completada";
}

/** Catálogo de misiones. Se apoya en labs, cursos y herramientas ya existentes. */
export const MISSIONS: MissionDef[] = [
  {
    id: "m-primer-comando",
    title: "Tu primer comando",
    brief:
      "Todo empieza por saber dónde estás parado. Abrí la Terminal y averiguá tu carpeta actual.",
    kind: "tutorial",
    difficulty: "🟢",
    target: { type: "course", id: "linux" },
    reward: { xp: 50, coins: 50, skill: "linux" },
    requires: [],
    hint: "Completá el curso 'linux' de la academia.",
  },
  {
    id: "m-primer-escaneo",
    title: "Mirá antes de tocar",
    brief:
      "Una máquina apareció en la red de laboratorio. Averiguá qué servicios ofrece antes de hacer nada.",
    kind: "lab",
    difficulty: "🟢",
    target: { type: "lab", id: "lab-net-01" },
    reward: { xp: 100, coins: 100, skill: "redes" },
    requires: ["m-primer-comando"],
    hint: "Usá 'nmap 10.10.5.20' y capturá la bandera del laboratorio.",
  },
  {
    id: "m-login-roto",
    title: "El login que confía de más",
    brief:
      "weblab01 tiene un formulario de acceso mal hecho. Demostrá que se puede engañar a su base de datos.",
    kind: "lab",
    difficulty: "🔵",
    target: { type: "lab", id: "lab-web-01" },
    reward: { xp: 200, coins: 150, skill: "web" },
    requires: ["m-primer-escaneo"],
    hint: "Probá 'sqlmap http://10.10.5.10/login user'.",
  },
  {
    id: "m-tienda-fisurada",
    title: "La tienda con fisuras",
    brief:
      "shoplab deja ver pedidos ajenos. Encontrá el fallo de control de acceso.",
    kind: "lab",
    difficulty: "🔵",
    target: { type: "lab", id: "lab-web-02" },
    reward: { xp: 250, coins: 200, skill: "web" },
    requires: ["m-login-roto"],
    hint: "Explorá las rutas con 'gobuster 10.10.5.30'.",
  },
  {
    id: "m-ser-root",
    title: "De invitado a dueño",
    brief:
      "Entraste a rootlab como usuario común. Encontrá el descuido que te da control total.",
    kind: "lab",
    difficulty: "🟠",
    target: { type: "lab", id: "lab-linux-01" },
    reward: { xp: 400, coins: 300, skill: "pentesting" },
    requires: ["m-login-roto"],
    hint: "Corré 'linpeas 10.10.5.40' y capturá la bandera.",
  },
  {
    id: "m-defensor",
    title: "Del otro lado",
    brief:
      "Alguien atacó weblab01. Revisá los registros y entendé qué pasó. Ahora defendés vos.",
    kind: "course",
    difficulty: "🟠",
    target: { type: "course", id: "blue-team" },
    reward: { xp: 350, coins: 250, skill: "blue-team" },
    requires: ["m-primer-escaneo"],
    hint: "Completá el curso 'blue-team' y mirá 'logview weblab01.lab'.",
  },
];

export class MissionEngine {
  private defs: Map<string, MissionDef>;
  private completed: Set<string>;
  private progression: Progression;
  private events?: EventBus;

  constructor(progression: Progression, events?: EventBus) {
    this.defs = new Map(MISSIONS.map((mission) => [mission.id, mission]));
    this.completed = new Set();
    this.progression = progression;
    this.events = events;
  }

  all(): MissionDef[] {
    return MISSIONS.map((mission) => ({ ...mission }));
  }

  get(id: string): MissionDef | undefined {
    const mission = this.defs.get(id);

    return mission ? { ...mission } : undefined;
  }

  count(): number {
    return this.defs.size;
  }

  isCompleted(id: string): boolean {
    return this.completed.has(id);
  }

  /** Estado de una misión según requisitos y lo ya completado. */
  status(id: string): MissionProgress["status"] {
    if (this.completed.has(id)) {
      return "completada";
    }

    const mission = this.defs.get(id);

    if (!mission) {
      return "bloqueada";
    }

    const ready = mission.requires.every((req) => this.completed.has(req));

    return ready ? "disponible" : "bloqueada";
  }

  /** Todas las misiones con su estado actual. */
  progress(): Array<MissionDef & { status: MissionProgress["status"] }> {
    return this.all().map((mission) => ({
      ...mission,
      status: this.status(mission.id),
    }));
  }

  /** Misiones disponibles ahora mismo. */
  available(): MissionDef[] {
    return this.all().filter((m) => this.status(m.id) === "disponible");
  }

  /**
   * Completa las misiones cuyo objetivo coincide con lo logrado.
   * Devuelve las misiones que se completaron en esta llamada.
   */
  private complete(
    type: "lab" | "course" | "tool",
    id: string,
    tick: number,
  ): MissionDef[] {
    const done: MissionDef[] = [];

    for (const mission of this.defs.values()) {
      if (
        this.status(mission.id) !== "disponible" ||
        mission.target.type !== type ||
        mission.target.id !== id
      ) {
        continue;
      }

      this.completed.add(mission.id);

      this.progression.award(mission.reward.xp, {
        skill: mission.reward.skill,
        coins: mission.reward.coins,
        tick,
      });

      this.events?.emit("mission.completed", {
        id: mission.id,
        title: mission.title,
        reward: mission.reward,
        tick,
      });

      done.push({ ...mission });
    }

    return done;
  }

  /** Reporta que un laboratorio fue resuelto (bandera capturada). */
  onLabSolved(labId: string, tick: number = 0): MissionDef[] {
    return this.complete("lab", labId, tick);
  }

  /** Reporta que un curso fue completado. */
  onCourseCompleted(courseId: string, tick: number = 0): MissionDef[] {
    return this.complete("course", courseId, tick);
  }
}
