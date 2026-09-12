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
      "Interceptamos un hash MD5 de otra cuenta interna: " +
      "b9da943bf1dcb00b784cf3612d450f91. No está salado —error de novato de " +
      "ellos. Crackealo y conseguí la contraseña con  crack <hash>  en la terminal.",
    objectives: [
      {
        id: "c3-o1",
        text: "Crackeá el hash MD5 filtrado",
        flag: "CRACK:girasol",
        hint: "En la Terminal: crack b9da943bf1dcb00b784cf3612d450f91",
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
  {
    id: "c5",
    number: 5,
    title: "El Golpe · Puente al interior",
    briefing:
      "Kuña de nuevo. Mbarete mueve la plata sucia por una red interna que no se ve desde afuera " +
      "(10.10.9.x). Pero ya tenemos una máquina tomada con pata en las dos redes. Pivoteá por ella " +
      "y alcanzá el panel interno.",
    objectives: [
      {
        id: "c5-o1",
        text: "Llegá a la red interna 10.10.9.x pivoteando",
        flag: "ND{pivot_interno}",
        hint: "En la Terminal: proxychains 10.10.9.10",
      },
    ],
    reward: { xp: 500, coins: 350, notoriety: 25 },
    debrief:
      "Estás adentro de la red interna. Ahora hay que escuchar qué se dice ahí.",
  },
  {
    id: "c6",
    number: 6,
    title: "El Golpe · Escuchar el cable",
    briefing:
      "En ese segmento hay un servicio viejo que manda credenciales sin cifrar. Poné a escuchar la red " +
      "y capturá el usuario y la contraseña que pasan en texto plano.",
    objectives: [
      {
        id: "c6-o1",
        text: "Capturá credenciales en claro con un sniffer",
        flag: "ND{sniff_credenciales}",
        hint: "En la Terminal: tcpdump 10.10.5.20  (una máquina con servicio sin cifrar)",
      },
    ],
    reward: { xp: 550, coins: 400, notoriety: 20 },
    debrief:
      "Credenciales en la mano. Con eso vamos por las llaves de su nube.",
  },
  {
    id: "c7",
    number: 7,
    title: "El Golpe · La llave de la nube",
    briefing:
      "Su previsualizador de enlaces trae URLs desde el servidor. Hacelo pedir la metadata interna de la " +
      "nube y robá las credenciales de administrador que solo el server puede ver (SSRF).",
    objectives: [
      {
        id: "c7-o1",
        text: "Robá las credenciales de la nube por SSRF",
        flag: "ND{ssrf_metadata_robada}",
        hint: "En preview.vortex.nande, previsualizá  http://169.254.169.254/latest/meta-data/",
      },
    ],
    reward: { xp: 600, coins: 450, notoriety: 30 },
    debrief:
      "Tenés las llaves del reino. Solo falta lo que vinimos a hacer: el golpe.",
  },
  {
    id: "c8",
    number: 8,
    title: "El Golpe · Vaciar la caja",
    briefing:
      "El final. Tomá la cuenta de Banco Justicia: conseguí la clave del dueño (husmeando en Pulso o con " +
      "SQLi + crack), entrá a su panel privado y transferí la caja a tu billetera. Que ÑANDE se entere.",
    objectives: [
      {
        id: "c8-o1",
        text: "Tomá la cuenta de banco-justicia.nande y vaciá la caja",
        flag: "ND{acceso:banco-justicia}",
        hint: "En banco-justicia.nande: SQLi en /buscar o buscá su clave en Pulso, crackeala, login y entrá al panel; después Transferir.",
      },
    ],
    reward: { xp: 800, coins: 700, notoriety: 50 },
    debrief:
      "El golpe salió. La caja de Mbarete/Banco Justicia quedó en cero y todo ÑANDE habla de vos. " +
      "Sos leyenda del colectivo Año'ῖ. Fin de Operación Génesis.",
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
