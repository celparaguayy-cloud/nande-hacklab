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

/** Hash estable de un texto, para elegir variantes sin azar. */
function hashText(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Elige una variante de forma estable según el texto (misma frase, misma respuesta). */
function pick(variants: string[], text: string): string {
  return variants[hashText(text) % variants.length];
}

/**
 * Genera la respuesta de un habitante. Reconoce muchos temas y tiene
 * varias respuestas por tema, elegidas de forma estable según el mensaje,
 * así la charla se siente fluida y con carácter, no repetida. `turn` es la
 * cantidad de mensajes previos, para dar seguimiento.
 */
export function replyFor(
  person: VirtualPerson,
  text: string,
  turn: number = 0,
): string {
  const persona = PERSONA[person.profession] ?? PERSONA.user;
  const t = text.toLowerCase().trim();
  const interest = person.interests[hashText(t) % person.interests.length];

  // Saludo (con seguimiento si ya venían hablando).
  if (/\b(hola|buenas|hey|holi|qué tal|que tal|holaa|ola)\b/.test(t)) {
    if (turn > 2) {
      return pick([
        "¡De nuevo por acá! ¿Qué contás?",
        "Ey, otra vez 😄 ¿todo bien?",
        "¡Hola! ¿Seguimos charlando?",
      ], t);
    }
    return pick([persona.hi, "¡Buenas! ¿Cómo va todo?", "¡Hola! ¿Qué andás haciendo?"], t);
  }

  // Despedida.
  if (/\b(chau|adios|adiós|nos vemos|hasta luego|me voy|bye)\b/.test(t)) {
    return pick([
      "¡Chau! Escribime cuando quieras.",
      "Nos vemos, ¡éxitos! 👋",
      "Dale, cuidate. Acá ando si necesitás algo.",
    ], t);
  }

  // ¿Cómo estás?
  if (/(cómo estás|como estas|todo bien|qué hacés|que haces|cómo va|como va)/.test(t)) {
    return pick([
      `Todo bien, metido con ${interest}. ¿Y vos?`,
      `Acá andamos, ${persona.topic} como siempre. ¿Vos qué contás?`,
      `Bien, aprovechando el día. ¿Qué andás haciendo?`,
    ], t);
  }

  // ¿Quién sos? / tu nombre / tu trabajo.
  if (/(quién sos|quien sos|tu nombre|cómo te llamás|a qué te dedicás|qué hacés de|trabajás de|trabajas de)/.test(t)) {
    return `Soy ${person.name}, ${person.profession}. Me gusta ${interest} y ${persona.topic}.`;
  }

  // Intereses / hobbies.
  if (/(hobby|hobbies|gusta|interés|interes|te copa|pasatiempo|tiempo libre)/.test(t)) {
    return pick([
      `Me copa ${interest}, y también ${persona.topic}. ¿A vos?`,
      `En mi tiempo libre ando con ${interest}. ¿Compartimos gustos?`,
    ], t);
  }

  // Ayuda / no sé.
  if (/\b(ayuda|help|no sé|no se|no entiendo|estoy perdido|me perdí)\b/.test(t)) {
    return pick([
      `Tranqui, te ayudo. Yo me manejo bien con ${persona.topic}. ¿Qué necesitás?`,
      `Nada, para eso estamos. Contame qué te traba y vemos.`,
      `Dale, sin drama. ¿Con qué te doy una mano?`,
    ], t);
  }

  // Hacking / seguridad.
  if (/\b(hack|hackear|nmap|sqli|exploit|vulnerab|pentest|seguridad|ctf)\b/.test(t)) {
    if (person.profession === "security-analyst") {
      return pick([
        "¡Ese es mi tema! Siempre en los labs, nunca en objetivos reales. Probá 'learn' en la terminal.",
        "Buenísimo que te interese. Arrancá por 'learn l-nmap', paso a paso.",
        "El truco es entender antes de tocar. En ÑANDE está todo aislado, dale tranquilo.",
      ], t);
    }
    return pick([
      "Ojo con eso: solo en los laboratorios de ÑANDE. Preguntale a alguien de seguridad.",
      "No es lo mío, pero sé que acá se practica en labs. Buscá 'academy'.",
    ], t);
  }

  // Plata / economía / bolsa.
  if (/\b(plata|dinero|bolsa|acciones|invertir|precio|guita|mercado|comprar acciones)\b/.test(t)) {
    return pick([
      "La bolsa viene en alza, pero con altibajos. Yo miro el índice antes de comprar. ¿Viste 'market'?",
      "El mercado crece de fondo. No pongas todo en una sola acción, ¿eh?",
      "Si querés invertir, arrancá de a poco. La app Bolsa te muestra todo.",
    ], t);
  }

  // Compras / tienda.
  if (/\b(comprar|tienda|shop|producto|ferretería|ferreteria|necesito comprar)\b/.test(t)) {
    return pick([
      "Para comprar, abrí el Browser y buscá lo que querés. shop.nande tiene de todo.",
      "En la tienda hay categorías: electrónica, ferretería, cursos... buscá y comprás con N$.",
    ], t);
  }

  // Misión / trabajo / encargo.
  if (/\b(misión|mision|trabajo|encargo|tarea|laburo|changa)\b/.test(t)) {
    return pick([
      "Mirá tu correo, a veces mandamos encargos por ahí. Escribí 'mail'.",
      "Si buscás misiones, revisá el mail o escribí 'missions' en la terminal.",
    ], t);
  }

  // Agradecimiento.
  if (/\b(gracias|genial|buenísimo|buenisimo|copado|joya|de diez|crack|grande)\b/.test(t)) {
    return pick([
      "¡De nada! Cualquier cosa me escribís. 😊",
      "¡Para eso estamos! Éxitos.",
      "Un gusto. Acá ando si necesitás otra cosa.",
    ], t);
  }

  // Acuerdo.
  if (/\b(sí|si|dale|obvio|claro|exacto|tal cual|de una)\b/.test(t) && t.length < 15) {
    return pick([
      "¡Eso! Me gusta cómo pensás.",
      "Tal cual. Estamos en la misma.",
      "Dale, sigamos por ahí entonces.",
    ], t);
  }

  // Chiste / risa.
  if (/\b(jaja|jeje|lol|jajaja|xd|risa|chiste)\b/.test(t)) {
    return pick([
      "Jaja, sos un fenómeno 😄",
      "Jeje, me hiciste reír. ¿Seguimos?",
      "Jaja, bien ahí. Contame más.",
    ], t);
  }

  // Pregunta abierta (termina en ?).
  if (/\?$/.test(text.trim())) {
    return pick([
      `Buena pregunta. Desde lo mío (${persona.topic}) te diría que lo pruebes y me contás.`,
      `Mmm, depende. Yo con ${interest} aprendí que conviene probar y ver.`,
      `No sé todo, pero preguntale también a alguien que sepa de eso. Yo te tiro mi opinión igual.`,
    ], t);
  }

  // Genérica, con seguimiento y sabor a la profesión.
  const generic = [
    `Interesante. Yo ando metido en ${interest} últimamente. ¿Y vos?`,
    "Ja, te entiendo. Contame más, me copa charlar.",
    `Buenísimo. Si te interesa ${persona.topic}, hacemos algo juntos.`,
    `Dale. ¿Y cómo venís con lo tuyo?`,
    `Mirá vos. Yo de eso poco, pero de ${interest} te hablo todo el día.`,
  ];
  // El seguimiento entra en la elección para que no repita seguido.
  return generic[(hashText(t) + turn) % generic.length];
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

    // El turno (mensajes previos) da seguimiento a la respuesta.
    const reply = replyFor(person, text, convo.messages.length);
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
