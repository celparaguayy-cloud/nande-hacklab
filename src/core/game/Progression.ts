import type { EventBus } from "../events/EventBus";

/**
 * Progresión del jugador: XP, nivel, habilidades, logros y economía.
 *
 * Es la capa que conecta todo el mundo: aprender un curso, resolver un
 * laboratorio o completar una misión da XP, sube habilidades, otorga
 * logros y paga moneda virtual. Nada de esto sale del sandbox.
 */

export type SkillId =
  | "linux"
  | "redes"
  | "web"
  | "pentesting"
  | "blue-team"
  | "forense"
  | "cripto"
  | "osint";

export const SKILL_NAMES: Record<SkillId, string> = {
  linux: "Linux",
  redes: "Redes",
  web: "Web",
  pentesting: "Pentesting",
  "blue-team": "Blue Team",
  forense: "Forense",
  cripto: "Criptografía",
  osint: "OSINT",
};

export interface Achievement {
  id: string;
  title: string;
  description: string;
  tick: number;
}

export interface PlayerState {
  name: string;
  xp: number;
  level: number;
  /** XP acumulada por habilidad. */
  skills: Record<SkillId, number>;
  wallet: number;
  achievements: Achievement[];
  /** Ids de laboratorios ya resueltos, para no pagar dos veces. */
  solvedLabs: string[];
  /** Ids de cursos completados. */
  completedCourses: string[];
}

const STORAGE_KEY = "nande-player";

/** Moneda inicial del jugador. */
const STARTING_WALLET = 500;

/** XP necesaria para pasar del nivel n al n+1: crece de forma suave. */
export function xpForLevel(level: number): number {
  return 100 * level * level;
}

/** Nivel que corresponde a una cantidad de XP. */
export function levelForXp(xp: number): number {
  let level = 1;

  while (xp >= xpForLevel(level)) {
    level += 1;
  }

  return level;
}

function emptySkills(): Record<SkillId, number> {
  return {
    linux: 0,
    redes: 0,
    web: 0,
    pentesting: 0,
    "blue-team": 0,
    forense: 0,
    cripto: 0,
    osint: 0,
  };
}

export class Progression {
  private state: PlayerState;
  private events?: EventBus;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(events?: EventBus) {
    this.events = events;
    this.state = this.load() ?? {
      name: "student",
      xp: 0,
      level: 1,
      skills: emptySkills(),
      wallet: STARTING_WALLET,
      achievements: [],
      solvedLabs: [],
      completedCourses: [],
    };
  }

  private load(): PlayerState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      const saved = JSON.parse(raw) as PlayerState;

      if (!saved || typeof saved.xp !== "number" || !saved.skills) {
        return null;
      }

      // Se completan campos que pudieran faltar de versiones previas.
      return {
        ...saved,
        skills: { ...emptySkills(), ...saved.skills },
        achievements: saved.achievements ?? [],
        solvedLabs: saved.solvedLabs ?? [],
        completedCourses: saved.completedCourses ?? [],
      };
    } catch {
      return null;
    }
  }

  private write(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // El juego sigue aunque no se pueda guardar.
    }
  }

  private save(): void {
    if (this.saveTimer !== null) {
      return;
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.write();
    }, 500);
  }

  flush(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.write();
  }

  getState(): PlayerState {
    return structuredClone(this.state);
  }

  /** XP que falta para el siguiente nivel. */
  xpToNext(): number {
    return xpForLevel(this.state.level) - this.state.xp;
  }

  /**
   * Otorga XP, opcionalmente a una habilidad, y paga moneda.
   * Devuelve si el jugador subió de nivel.
   */
  award(
    xp: number,
    options: { skill?: SkillId; coins?: number; tick?: number } = {},
  ): { leveledUp: boolean; newLevel: number } {
    const previousLevel = this.state.level;

    this.state.xp += Math.max(0, xp);

    if (options.skill) {
      this.state.skills[options.skill] += Math.max(0, xp);
    }

    if (options.coins) {
      this.state.wallet += options.coins;
    }

    this.state.level = levelForXp(this.state.xp);

    const leveledUp = this.state.level > previousLevel;

    this.events?.emit("player.xp", {
      xp: this.state.xp,
      level: this.state.level,
      gained: xp,
      skill: options.skill,
    });

    if (leveledUp) {
      this.events?.emit("skill.levelup", {
        level: this.state.level,
        tick: options.tick,
      });
    }

    this.save();

    return { leveledUp, newLevel: this.state.level };
  }

  /** Registra un logro si es nuevo. Devuelve si se otorgó. */
  unlock(
    id: string,
    title: string,
    description: string,
    tick: number = 0,
  ): boolean {
    if (this.state.achievements.some((a) => a.id === id)) {
      return false;
    }

    const achievement: Achievement = { id, title, description, tick };

    this.state.achievements.push(achievement);

    this.events?.emit("achievement.unlocked", achievement);
    this.save();

    return true;
  }

  hasAchievement(id: string): boolean {
    return this.state.achievements.some((a) => a.id === id);
  }

  /** Cobra moneda; devuelve false si no alcanza. */
  spend(amount: number): boolean {
    if (amount <= 0 || this.state.wallet < amount) {
      return false;
    }

    this.state.wallet -= amount;
    this.save();

    return true;
  }

  earn(amount: number): void {
    this.state.wallet += Math.max(0, amount);
    this.save();
  }

  get wallet(): number {
    return this.state.wallet;
  }

  /** Marca un laboratorio como resuelto. Devuelve si era nuevo. */
  markLabSolved(labId: string): boolean {
    if (this.state.solvedLabs.includes(labId)) {
      return false;
    }

    this.state.solvedLabs.push(labId);
    this.save();

    return true;
  }

  isLabSolved(labId: string): boolean {
    return this.state.solvedLabs.includes(labId);
  }

  markCourseCompleted(courseId: string): boolean {
    if (this.state.completedCourses.includes(courseId)) {
      return false;
    }

    this.state.completedCourses.push(courseId);
    this.save();

    return true;
  }

  completedCourses(): string[] {
    return [...this.state.completedCourses];
  }
}
