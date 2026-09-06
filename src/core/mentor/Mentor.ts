import type { EventBus } from "../events/EventBus";
import type { Campaign, Objective } from "../campaign/Campaign";

/**
 * La Mani 🥜 — el mentor adaptativo de ÑANDE.
 *
 * ÑANDE es un juego complejo y es fácil perderse. La Mani acompaña: mira
 * lo que hace el jugador, entiende en qué objetivo está, y da ayuda EN
 * ESCALERA — un empujoncito primero, y sólo si sigue trabado, la pista, el
 * comando exacto y, al final, "hacelo conmigo". Y lo más importante: se
 * DESVANECE por tema cuando el jugador demuestra que ya sabe. Cuando ya no
 * hace falta para algo, la Mani lo dice y te suelta.
 *
 * Todo determinista y local; se apoya en el bus de eventos que ya observa
 * todo lo que pasa en el mundo.
 */

/** Nivel de ayuda que se está mostrando ahora mismo. */
export type HelpLevel = 0 | 1 | 2 | 3;

export const HELP_LABEL: Record<HelpLevel, string> = {
  0: "Empujoncito",
  1: "Pista",
  2: "Comando",
  3: "Hacelo conmigo",
};

/** Tema de aprendizaje: la Mani se gradúa por tema. */
export type Topic =
  | "sqli"
  | "union"
  | "crack"
  | "jwt"
  | "idor"
  | "xss"
  | "cmdi"
  | "traversal"
  | "navegar"
  | "general";

/** Veces que hay que resolver algo solo para que la Mani te suelte ese tema. */
const MASTERY_THRESHOLD = 2;

export interface MentorState {
  /** Veces que se resolvió cada tema (sin pedir el comando exacto). */
  mastery: Record<string, number>;
  /** Temas de los que la Mani ya se graduó (te suelta). */
  graduated: string[];
  /** ¿El jugador silenció a la Mani? */
  muted: boolean;
  /** ¿Ya se presentó? */
  greeted: boolean;
}

export interface Advice {
  /** Texto que muestra la Mani. */
  text: string;
  level: HelpLevel;
  /** Comando sugerido, si el nivel llegó a "comando"/"hacelo conmigo". */
  command?: string;
  /** Tema al que corresponde. */
  topic: Topic;
  /** Objetivo actual, si hay campaña activa. */
  objectiveId?: string;
  /** Si la Mani se está despidiendo de un tema. */
  graduating?: boolean;
}

const STORAGE_KEY = "nande-mentor";

/** Deriva el tema de un objetivo por su bandera/pista. */
function topicOf(objective: Objective): Topic {
  const f = (objective.flag + " " + objective.hint).toLowerCase();
  if (f.includes("union")) return "union";
  if (f.includes("sqli") || f.includes("login") || f.includes("' or")) return "sqli";
  if (f.includes("crack")) return "crack";
  if (f.includes("jwt")) return "jwt";
  if (f.includes("idor") || f.includes("album")) return "idor";
  if (f.includes("cmd") || f.includes("cat flag")) return "cmdi";
  if (f.includes("traversal") || f.includes("../")) return "traversal";
  if (f.includes("xss")) return "xss";
  return "general";
}

export class Mentor {
  private state: MentorState;
  private events?: EventBus;
  private campaign?: Campaign;

  /** Cuánta "fricción" lleva el objetivo actual (intentos sin éxito, ayudas pedidas). */
  private friction = 0;
  /** Objetivo sobre el que se está midiendo la fricción. */
  private focusedObjective: string | null = null;
  /** ¿El jugador pidió el comando exacto para este objetivo? (rompe la maestría). */
  private askedForCommand = false;

  constructor(events?: EventBus, campaign?: Campaign) {
    this.events = events;
    this.campaign = campaign;
    this.state = this.load() ?? {
      mastery: {},
      graduated: [],
      muted: false,
      greeted: false,
    };
  }

  private load(): MentorState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as MentorState;
      if (!s.mastery) return null;
      return s;
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Se puede jugar sin persistir.
    }
  }

  getState(): MentorState {
    return structuredClone(this.state);
  }

  mute(v: boolean): void {
    this.state.muted = v;
    this.save();
  }

  markGreeted(): void {
    this.state.greeted = true;
    this.save();
  }

  /** ¿La Mani ya se graduó de este tema (te suelta)? */
  hasGraduated(topic: Topic): boolean {
    return this.state.graduated.includes(topic);
  }

  /**
   * El jugador (o la UI) pide ayuda: sube un escalón de la escalera. Cada
   * vez que se pide, la ayuda es más concreta.
   */
  askMore(): void {
    this.friction += 1;
    if (this.friction >= 2) this.askedForCommand = true;
  }

  /**
   * Se avisa que el jugador intentó algo y falló (una consulta rota, un
   * comando que no capturó nada): sube la fricción, así la Mani ofrece más.
   */
  noteFailedAttempt(): void {
    this.friction += 1;
  }

  /**
   * Se capturó una señal/bandera: si corresponde al objetivo enfocado y el
   * jugador NO tuvo que pedir el comando exacto, cuenta como maestría.
   * Cuando alcanza el umbral, la Mani se gradúa de ese tema.
   */
  noteSolved(topic: Topic): { graduated: boolean } {
    // Resolverlo sin haber pedido el comando exacto demuestra dominio.
    if (!this.askedForCommand) {
      this.state.mastery[topic] = (this.state.mastery[topic] ?? 0) + 1;
    }

    let graduated = false;
    if (
      !this.state.graduated.includes(topic) &&
      (this.state.mastery[topic] ?? 0) >= MASTERY_THRESHOLD
    ) {
      this.state.graduated.push(topic);
      graduated = true;
    }

    // Reset para el próximo objetivo.
    this.friction = 0;
    this.askedForCommand = false;
    this.focusedObjective = null;
    this.save();

    this.events?.emit("mission.progress", { mentor: true });
    return { graduated };
  }

  /**
   * El consejo actual de la Mani, según el objetivo de campaña vigente y
   * cuánta ayuda se pidió. Devuelve null si no hay nada que aconsejar o si
   * la Mani ya se graduó del tema (te dejó ir).
   */
  advise(): Advice | null {
    const chapter = this.campaign?.currentChapter();
    if (!chapter) {
      return this.state.graduated.length > 0
        ? {
            text: "Ya no me necesitás para lo básico. Explorá el mundo: hackeá cualquier sitio que veas, seguí el hilo hasta las personas.",
            level: 0,
            topic: "general",
          }
        : null;
    }

    const objective =
      chapter.objectives.find((o) => !this.campaign!.isObjectiveDone(o.id)) ??
      chapter.objectives[0];

    const topic = topicOf(objective);

    // Si se enfocó un objetivo distinto, reinicia la medición.
    if (this.focusedObjective !== objective.id) {
      this.focusedObjective = objective.id;
      this.friction = 0;
      this.askedForCommand = false;
    }

    // Si la Mani ya se graduó de este tema, no acompaña: te suelta.
    if (this.state.graduated.includes(topic)) {
      return {
        text: `Esto ya lo dominás. Confío en vos — resolvé "${objective.text}" sin mi ayuda. 🥜`,
        level: 0,
        topic,
        objectiveId: objective.id,
      };
    }

    // Escalera de ayuda según la fricción acumulada.
    const level = Math.min(3, this.friction) as HelpLevel;
    const parts = this.ladder(objective, topic);

    return {
      text: parts[level].text,
      command: parts[level].command,
      level,
      topic,
      objectiveId: objective.id,
    };
  }

  /** Los cuatro escalones de ayuda para un objetivo. */
  private ladder(
    objective: Objective,
    topic: Topic,
  ): { text: string; command?: string }[] {
    const nudges: Record<Topic, string> = {
      sqli: "El login arma la consulta pegando tu texto. ¿Qué pasa si metés una comilla en el usuario?",
      union: "Un UNION pega los resultados de OTRA consulta. ¿Cuántas columnas devuelve el buscador?",
      crack: "Un hash sin sal es una contraseña disfrazada. Hay una herramienta que prueba miles por vos.",
      jwt: "Un token JWT se firma con una clave. Si la clave es débil… ¿la podrías adivinar?",
      idor: "El recurso se ve por un número en la URL. ¿Y si probás otros números?",
      cmdi: "Tu texto va directo a un comando del sistema. ¿Cómo encadenarías otro comando?",
      traversal: "El visor abre archivos de una carpeta. ¿Cómo saldrías de esa carpeta?",
      xss: "Lo que escribís se muestra tal cual, sin filtrar. ¿Qué pasaría con una etiqueta <script>?",
      navegar: "Escribí un host en la barra del Navegador, o palabras para buscar.",
      general: "Mirá bien el objetivo y probá. Equivocarte también enseña.",
    };

    return [
      { text: `🥜 ${nudges[topic]}` },
      { text: `🥜 Pista: ${objective.hint}` },
      {
        text: `🥜 Probá exactamente esto:`,
        command: this.extractCommand(objective.hint),
      },
      {
        text: `🥜 Vamos juntos. Copiá esto y ejecutalo — después te explico por qué funciona:`,
        command: this.extractCommand(objective.hint),
      },
    ];
  }

  /** Saca el comando concreto de una pista ("Probá X: cmd" → "cmd"). */
  private extractCommand(hint: string): string {
    const m = hint.match(/(?:probá|proba|escribí|escribi|usá|usa)[:\s]+(.+)$/i);
    if (m) return m[1].trim();
    // Si la pista trae un comando reconocible, lo devuelve tal cual.
    const cmd = hint.match(/(curl|crack|jwt|nmap|sqlmap)[^.]*/i);
    return cmd ? cmd[0].trim() : hint;
  }
}
