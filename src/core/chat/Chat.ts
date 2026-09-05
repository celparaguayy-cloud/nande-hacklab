import type { EventBus } from "../events/EventBus";
import type { VirtualPerson } from "../world/WorldEngine";

/**
 * Chat / red social de ÑANDE.
 *
 * El jugador puede escribirle a cualquier habitante y este le responde. Las
 * respuestas se arman según la profesión, los intereses y lo que dijo el
 * jugador (no son al azar puro): un desarrollador habla de código, un
 * analista de seguridad de hacking, etc. De vez en cuando un habitante
 * también escribe primero. Todo dentro del mundo, sin servicios externos.
 */

export interface ChatMessage {
  from: "me" | "them";
  text: string;
  tick: number;
}

export interface Conversation {
  personId: string;
  personName: string;
  profession: string;
  messages: ChatMessage[];
  /** Mensajes de ellos sin leer. */
  unread: number;
}

const STORAGE_KEY = "nande-chat";
const MAX_MESSAGES = 40;
const MAX_CONVERSATIONS = 30;

/** Frases de saludo por profesión, para dar carácter. */
const PERSONA: Record<string, { hi: string; topic: string }> = {
  developer: { hi: "¡Eh! ¿Programando algo?", topic: "código y proyectos" },
  "security-analyst": {
    hi: "Hola. ¿Practicando seguridad?",
    topic: "hacking ético y defensa",
  },
  student: { hi: "Hola 😄 ¿vos también estudiás acá?", topic: "aprender" },
  teacher: { hi: "Hola, ¿en qué andás aprendiendo?", topic: "enseñar" },
  journalist: { hi: "Buenas, ¿viste las últimas noticias?", topic: "noticias" },
  gamer: { hi: "¿Jugamos algo? 🎮", topic: "juegos" },
  designer: { hi: "Hola, ando con un diseño nuevo.", topic: "diseño" },
  merchant: { hi: "¡Buenas! ¿Buscás algo en la tienda?", topic: "comercio" },
  technician: { hi: "Hola, ¿problemas de red?", topic: "redes y sistemas" },
  entrepreneur: { hi: "Hola, tengo una idea de proyecto.", topic: "negocios" },
  researcher: { hi: "Hola, ando investigando algo interesante.", topic: "investigación" },
  user: { hi: "¡Hola! 👋", topic: "la comunidad" },
};

/** Genera la respuesta de un habitante según su perfil y el mensaje. */
export function replyFor(person: VirtualPerson, text: string): string {
  const persona = PERSONA[person.profession] ?? PERSONA.user;
  const t = text.toLowerCase();

  if (/\b(hola|buenas|hey|holi|qué tal|que tal)\b/.test(t)) {
    return persona.hi;
  }
  if (/\b(ayuda|help|no sé|no se|cómo|como)\b/.test(t)) {
    return `Tranqui, te ayudo. Yo me manejo bien con ${persona.topic}. ¿Qué necesitás?`;
  }
  if (/\b(hack|nmap|sqli|exploit|vulnerab|pentest|seguridad)\b/.test(t)) {
    return person.profession === "security-analyst"
      ? "¡Ese es mi tema! Acordate: siempre en los labs, nunca en objetivos reales. Probá 'learn' en la terminal."
      : "Ojo con eso, hacelo solo en los laboratorios de ÑANDE. Si querés, preguntale a alguien de seguridad.";
  }
  if (/\b(plata|dinero|bolsa|acciones|invertir|precio)\b/.test(t)) {
    return "La bolsa se mueve bastante. Yo miro el índice antes de comprar. ¿Ya viste 'market'?";
  }
  if (/\b(gracias|genial|buenísimo|copado|joya)\b/.test(t)) {
    return "¡De nada! Cualquier cosa me escribís. 😊";
  }
  if (/\b(misión|mision|trabajo|encargo|tarea)\b/.test(t)) {
    return "Mirá tu correo, a veces mandamos encargos por ahí. Escribí 'mail' en la terminal.";
  }
  if (/\?$/.test(text.trim())) {
    return `Buena pregunta. Desde lo mío (${persona.topic}) te diría que lo pruebes y me contás.`;
  }

  // Respuesta genérica con sabor a la profesión.
  const generic = [
    `Interesante. Yo ando metido en ${persona.topic} últimamente.`,
    "Ja, te entiendo. ¿Y en qué más andás?",
    "Buenísimo. Escribime cuando quieras, che.",
    `Dale. Si te copa ${persona.topic}, hacemos algo juntos.`,
  ];

  // Elección estable por longitud del texto (no azar), para que se sienta consistente.
  return generic[text.length % generic.length];
}

interface ChatState {
  conversations: Record<string, Conversation>;
  order: string[];
}

export class Chat {
  private state: ChatState;
  private events?: EventBus;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(events?: EventBus) {
    this.events = events;
    this.state = this.load() ?? { conversations: {}, order: [] };
  }

  private load(): ChatState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as ChatState;
      if (!saved || !saved.conversations) return null;
      return { conversations: saved.conversations, order: saved.order ?? [] };
    } catch {
      return null;
    }
  }

  private write(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // El chat sigue en memoria aunque no se guarde.
    }
  }

  private save(): void {
    if (this.saveTimer !== null) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.write();
    }, 600);
  }

  flush(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.write();
  }

  private ensure(person: VirtualPerson): Conversation {
    let convo = this.state.conversations[person.id];

    if (!convo) {
      convo = {
        personId: person.id,
        personName: person.name,
        profession: person.profession,
        messages: [],
        unread: 0,
      };
      this.state.conversations[person.id] = convo;
      this.state.order.push(person.id);

      // Se acota la cantidad de conversaciones.
      while (this.state.order.length > MAX_CONVERSATIONS) {
        const oldest = this.state.order.shift()!;
        delete this.state.conversations[oldest];
      }
    }

    return convo;
  }

  private trim(convo: Conversation): void {
    if (convo.messages.length > MAX_MESSAGES) {
      convo.messages.splice(0, convo.messages.length - MAX_MESSAGES);
    }
  }

  conversations(): Conversation[] {
    return this.state.order
      .map((id) => this.state.conversations[id])
      .filter((c): c is Conversation => c !== undefined)
      .map((c) => structuredClone(c))
      .reverse();
  }

  history(personId: string): Conversation | undefined {
    const c = this.state.conversations[personId];
    return c ? structuredClone(c) : undefined;
  }

  unreadTotal(): number {
    return Object.values(this.state.conversations).reduce(
      (sum, c) => sum + c.unread,
      0,
    );
  }

  markRead(personId: string): void {
    const c = this.state.conversations[personId];
    if (c && c.unread > 0) {
      c.unread = 0;
      this.save();
    }
  }

  /**
   * El jugador le escribe a un habitante y este responde.
   * Devuelve la respuesta del habitante.
   */
  send(person: VirtualPerson, text: string, tick: number): string {
    const convo = this.ensure(person);

    convo.messages.push({ from: "me", text, tick });

    const reply = replyFor(person, text);
    convo.messages.push({ from: "them", text: reply, tick });

    this.trim(convo);

    // Se lleva la conversación al final (más reciente).
    this.state.order = this.state.order.filter((id) => id !== person.id);
    this.state.order.push(person.id);

    this.save();
    return reply;
  }

  /** Un habitante escribe primero (mensaje proactivo). */
  incoming(person: VirtualPerson, tick: number): void {
    const convo = this.ensure(person);
    const persona = PERSONA[person.profession] ?? PERSONA.user;

    convo.messages.push({ from: "them", text: persona.hi, tick });
    convo.unread += 1;
    this.trim(convo);

    this.events?.emit("chat.received", {
      personId: person.id,
      personName: person.name,
    });

    this.save();
  }
}
