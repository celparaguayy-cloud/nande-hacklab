import type { EventBus } from "../events/EventBus";

/**
 * Campaña de ÑANDE: "Operación Génesis".
 *
 * Convierte los laboratorios sueltos en una historia con hilo. Sos un
 * pentester junior reclutado por un colectivo para investigar a Mbarete
 * Bank, la megacorp que espía a los habitantes. Cada capítulo tiene
 * objetivos que se cumplen con HACKS REALES: capturar tal bandera, romper
 * tal hash. No hay "completar" de mentira — el objetivo lo marca el juego
 * cuando de verdad lo lograste.
 */

export interface Objective {
  id: string;
  text: string;
  /** Bandera o señal que lo completa (se compara con lo capturado). */
  flag: string;
  /** Pista concreta de cómo lograrlo. */
  hint: string;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  /** Quién te habla y qué está en juego. */
  briefing: string;
  objectives: Objective[];
  reward: { xp: number; coins: number; notoriety: number };
  /** Mensaje al cerrar el capítulo. */
  debrief: string;
}

export const CHAPTERS: Chapter[] = [
  {
    id: "c1",
    number: 1,
    title: "El primer acceso",
    briefing:
      "Soy Kuña, del colectivo Año'ῖ. Mbarete Bank está detrás de algo sucio. " +
      "Necesitamos entrar. Su home banking tiene un login mal hecho: entrá como administrador sin la contraseña.",
    objectives: [
      {
        id: "c1-o1",
        text: "Evadí el login de banco.nande y entrá como admin",
        flag: "ND{sqli_login_bypass}",
        hint: "En el Navegador, entrá a banco.nande y probá usuario  admin'--",
      },
    ],
    reward: { xp: 200, coins: 150, notoriety: 10 },
    debrief:
      "Estás dentro. Pero un login roto es solo la puerta. Adentro hay una base de datos entera esperando.",
  },
  {
    id: "c2",
    number: 2,
    title: "La base de datos",
    briefing:
      "Bien hecho. Ahora sacá las credenciales guardadas: el buscador de movimientos es inyectable. " +
      "Usá un UNION para leer la tabla de usuarios y traé la contraseña del admin.",
    objectives: [
      {
        id: "c2-o1",
        text: "Extraé la contraseña del admin con UNION SELECT",
        flag: "M8arete-2024!",
        hint: "En banco.nande/movimientos, inyectá: %' UNION SELECT id, usuario, password, rol FROM usuarios -- ",
      },
    ],
    reward: { xp: 300, coins: 220, notoriety: 15 },
    debrief:
      "Tenemos las credenciales. Con esto probamos que Mbarete guarda todo en claro. El colectivo está impresionado.",
  },
  {
    id: "c3",
    number: 3,
    title: "Romper el candado",
    briefing:
      "Interceptamos un hash de otra cuenta interna. No está salado —error de novato de ellos. " +
      "Crackealo y conseguí la contraseña. Usá  crack <hash>  en la terminal.",
    objectives: [
      {
        id: "c3-o1",
        text: "Crackeá el hash MD5 filtrado",
        flag: "CRACK:girasol",
        hint: "En la Terminal: crack 5f4dcc3b5aa765d61d8327deb882cf99  (o el hash que te pasamos)",
      },
    ],
    reward: { xp: 350, coins: 260, notoriety: 20 },
    debrief:
      "Sin sal, un hash es una contraseña con un disfraz barato. Ya sabés por qué la sal importa.",
  },
  {
    id: "c4",
    number: 4,
    title: "El token de oro",
    briefing:
      "La API de Mbarete usa tokens JWT con una clave débil. Crackeá la clave, forjá un token de admin " +
      "y tomá el control. Usá  jwt  en la terminal.",
    objectives: [
      {
        id: "c4-o1",
        text: "Forjá un JWT de admin válido",
        flag: "ND{jwt_forged_admin}",
        hint: "En la Terminal: jwt crack <token>  y luego  jwt forge <clave> rol=admin",
      },
    ],
    reward: { xp: 450, coins: 320, notoriety: 30 },
    debrief:
      "Control total de la API. Con esto el colectivo puede exponer a Mbarete ante todo ÑANDE. Sos oficialmente un operador.",
  },
];

export interface CampaignState {
  /** Índice del capítulo actual. */
  current: number;
  /** Objetivos ya completados (por id). */
  done: string[];
  finished: boolean;
}

const STORAGE_KEY = "nande-campaign";

export class Campaign {
  private state: CampaignState;
  private events?: EventBus;

  constructor(events?: EventBus) {
    this.events = events;
    this.state = this.load() ?? { current: 0, done: [], finished: false };
  }

  private load(): CampaignState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as CampaignState;
      if (typeof s.current !== "number" || !Array.isArray(s.done)) return null;
      return s;
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Se puede jugar sin guardar.
    }
  }

  getState(): CampaignState {
    return structuredClone(this.state);
  }

  currentChapter(): Chapter | null {
    return CHAPTERS[this.state.current] ?? null;
  }

  isObjectiveDone(id: string): boolean {
    return this.state.done.includes(id);
  }

  chapters(): Chapter[] {
    return CHAPTERS;
  }

  /**
   * Notifica al motor que se capturó una señal (bandera, crack, etc.).
   * Si completa un objetivo del capítulo actual, lo marca; si completa el
   * capítulo, avanza. Devuelve lo que ocurrió, para que la UI lo muestre.
   */
  report(signal: string): {
    objectiveCompleted?: Objective;
    chapterCompleted?: Chapter;
    campaignCompleted?: boolean;
  } {
    const chapter = this.currentChapter();
    if (!chapter || this.state.finished) return {};

    const objective = chapter.objectives.find(
      (o) => o.flag === signal && !this.state.done.includes(o.id),
    );

    if (!objective) return {};

    this.state.done.push(objective.id);
    this.events?.emit("mission.progress", { objectiveId: objective.id });

    const allDone = chapter.objectives.every((o) =>
      this.state.done.includes(o.id),
    );

    if (!allDone) {
      this.save();
      return { objectiveCompleted: objective };
    }

    // Capítulo completo: avanzar.
    const wasLast = this.state.current >= CHAPTERS.length - 1;
    if (wasLast) this.state.finished = true;
    else this.state.current += 1;

    this.save();

    this.events?.emit("mission.completed", { chapterId: chapter.id });

    return {
      objectiveCompleted: objective,
      chapterCompleted: chapter,
      campaignCompleted: wasLast,
    };
  }
}
