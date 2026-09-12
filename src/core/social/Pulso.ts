import type { VirtualPerson } from "../world/WorldEngine";
import { weakPasswordFor } from "../crypto/cracker";

/**
 * Pulso — la red social de ÑANDE (estilo Twitter/Instagram).
 *
 * La gente publica quejas, logros, fotos y detalles de su día. Podés
 * seguirla y ganar seguidores (fama). Pero, sobre todo, Pulso es el
 * terreno de la INGENIERÍA SOCIAL: los NPC filtran su propia información
 * sin darse cuenta — dónde trabajan, el nombre de su mascota (que es su
 * pregunta de seguridad), y a veces su contraseña. Y esa filtración es
 * REAL: la contraseña que aparece en el feed de alguien es la misma que
 * abre su sitio, así que husmear Pulso te ahorra el crackeo.
 *
 * Todo determinista a partir del nombre de la persona y del día del mundo.
 */

export interface PulsoPost {
  id: string;
  authorId: string;
  authorName: string;
  handle: string;
  /** Días atrás en que se publicó (0 = hoy). */
  daysAgo: number;
  text: string;
  likes: number;
  /** Si el post filtra info aprovechable, qué tipo. */
  leak?: "password" | "pet" | "work" | "birthday";
  /** El dato filtrado, si lo hay. */
  leakValue?: string;
}

export interface Profile {
  id: string;
  name: string;
  handle: string;
  bio: string;
  followers: number;
  posts: PulsoPost[];
  /** ¿Lo sigue el jugador? */
  following: boolean;
}

const STORAGE_KEY = "nande-pulso";

function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length];
}

function handleOf(name: string, id?: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 10);
  // El mundo tiene homónimos; se agrega un sufijo del id para que dos "Ana
  // López" no compartan el mismo @usuario.
  const suffix = id ? id.replace(/\D/g, "").slice(-3) : "";
  return "@" + base + suffix;
}

const PETS = [
  "Luna", "Rocky", "Michi", "Toby", "Nube", "Simba", "Kiki", "Rex",
  "Chaco", "Pelusa", "Coco", "Manchas", "Tobías", "Lola", "Duque", "Canela",
];
const WORKPLACES = [
  "Arandu Software", "Banco Justicia", "Vortex Media", "Nimbus Cloud",
  "Pixela Games", "Guaraní Tech", "Pytã Security", "Yvoty Media",
  "Redix", "Bytebox", "Codeá", "Nova Sistemas", "Gulu", "Tapé Logística",
];

const COMPLAINTS = [
  "otra vez se cayó el sistema en el trabajo, no doy más 😤",
  "3 horas esperando al técnico y no vino nadie",
  "¿por qué todo tiene que pedir contraseña nueva cada mes? 🙄",
  "el wifi de la oficina anda peor que mi paciencia",
  "me cambiaron el turno sin avisar, un desastre la gestión",
  "otra reunión que podría haber sido un mail 📧",
  "se me trabó la compu justo cuando estaba por guardar, quiero llorar",
  "el sistema del banco caído de nuevo, no puedo pagar nada",
  "mi jefe manda mensajes a las 11 de la noche, ¿en serio?",
  "pagué el delivery y llegó frío, gracias por nada",
  "el colectivo pasó lleno y no paró, llego tardísimo",
  "actualicé la app y ahora anda peor que antes 🤦",
  "me llamaron de un número raro diciendo que gané un premio, obvio no",
  "la impresora del trabajo tiene vida propia y me odia",
];
const BRAGS = [
  "por fin terminé el proyecto en el que estaba hace semanas 🚀",
  "me ascendieron 🎉 gracias a todos los que confiaron",
  "aprendí algo nuevo hoy y no puedo parar de aplicarlo",
  "cerré un trato importante, semana redonda ✨",
  "primer maratón terminado 🏃 las piernas no me responden pero valió la pena",
  "arranqué un curso nuevo y me tiene enganchadísimo",
  "hoy me animé a presentar mi idea y salió mejor de lo que esperaba",
  "cociné algo que en teoría no sabía cocinar y quedó increíble 👩‍🍳",
  "mi equipo salió campeón del torneo del barrio ⚽",
  "junté el ahorro para la compu nueva, después de meses 💻",
  "planté un huerto en el balcón y ya salió el primer tomate 🍅",
];
const PHOTOS = [
  "📷 atardecer desde la oficina",
  "📷 mi setup nuevo, quedó hermoso",
  "📷 café ☕ y a programar",
  "📷 finde en familia ❤️",
  "📷 la vista desde el cerro, valió cada escalón",
  "📷 asado con los pibes 🔥",
  "📷 lluvia y mate, combo perfecto 🧉",
  "📷 mi gato durmiendo arriba del teclado otra vez",
  "📷 feria del barrio, me llevé de todo",
  "📷 tereré con la banda a la sombra 🌳",
];

/** Genera los posts de una persona según su antigüedad social. */
/**
 * Un post con el color de la persona: su oficio y sus intereses. Hace que el
 * feed no sea un muro de frases repetidas, sino gente distinta hablando de lo
 * suyo. Determinista: la misma persona dice siempre lo mismo.
 */
function personalPost(person: VirtualPerson, s: number): string {
  const oficio = person.profession || "vecino";
  const interes = person.interests?.[s % Math.max(1, person.interests.length)] ?? "mis proyectos";
  const plantillas = [
    `otro día de ${oficio} 💼 se hace lo que se puede`,
    `metido con ${interes} otra vez, no me canso`,
    `alguien más de ${oficio} por acá que la sufra conmigo? 😅`,
    `fin de semana para ponerme al día con ${interes}`,
    `hoy alguien me preguntó cómo es ser ${oficio}… largo de explicar jaja`,
    `si te interesa ${interes}, escribime que la charlamos`,
    `orgulloso de lo que hacemos, ${oficio} no es para cualquiera 💪`,
    `probando cosas nuevas de ${interes}, después les cuento`,
  ];
  return pick(plantillas, s);
}

function postsFor(person: VirtualPerson, day: number): PulsoPost[] {
  // Se siembra por ID (único), no por nombre: el mundo tiene muchos homónimos
  // y antes TODOS los "Benjamín Benítez" publicaban exactamente lo mismo, así
  // que el feed parecía el mismo post repetido una y otra vez.
  const seed = seedOf(person.id);
  const handle = handleOf(person.name, person.id);
  const count = 3 + (seed % 4);
  const posts: PulsoPost[] = [];

  for (let i = 0; i < count; i += 1) {
    const s = seedOf(`${person.id}-${i}`);
    const kind = s % 4;
    // Parte de los posts "normales" hablan del oficio/intereses de la persona,
    // para que cada uno suene distinto (sin tocar las filtraciones del OSINT).
    const personal = (s >>> 7) % 5 < 2;
    let text: string;
    let leak: PulsoPost["leak"];
    let leakValue: string | undefined;

    if (kind === 0) text = personal ? personalPost(person, s) : pick(COMPLAINTS, s);
    else if (kind === 1) text = personal ? personalPost(person, s >>> 3) : pick(BRAGS, s);
    else if (kind === 2) text = pick(PHOTOS, s);
    else {
      // Post que FILTRA algo. Determinista, para que el OSINT sea estable.
      const leakKind = (s >>> 2) % 4;
      if (leakKind === 0) {
        leak = "pet";
        leakValue = pick(PETS, s);
        text = `feliz cumple a mi perro ${leakValue} 🐶 el mejor compañero`;
      } else if (leakKind === 1) {
        leak = "work";
        leakValue = pick(WORKPLACES, s);
        text = `orgulloso de trabajar en ${leakValue}, gran equipo 💪`;
      } else if (leakKind === 2) {
        // La filtración jugosa: la contraseña, "sin querer".
        leak = "password";
        leakValue = weakPasswordFor(person.name);
        text = `nota mental para no olvidarme: la clave nueva es "${leakValue}" 🙈 (después la borro)`;
      } else {
        leak = "birthday";
        leakValue = `${1 + (s % 28)}/${1 + (s % 12)}`;
        text = `¡hoy es mi cumple! 🎂 ${leakValue} de fiesta`;
      }
    }

    posts.push({
      id: `${person.id}-p${i}`,
      authorId: person.id,
      authorName: person.name,
      handle,
      daysAgo: i,
      text,
      likes: (s >>> 5) % 500,
      leak,
      leakValue,
    });
    void day;
  }

  return posts;
}

export interface PulsoComment {
  text: string;
  day: number;
  /** Autor: "vos" para el jugador. */
  author: string;
}

interface PulsoState {
  following: string[];
  /** Posts del propio jugador. */
  myPosts: { text: string; day: number }[];
  /** Ids de posts que el jugador likeó. */
  liked?: string[];
  /** Comentarios del jugador por post. */
  comments?: Record<string, PulsoComment[]>;
}

export class Pulso {
  private getPeople: () => VirtualPerson[];
  private currentDay: () => number;
  private state: PulsoState;

  constructor(
    getPeople: () => VirtualPerson[],
    currentDay: () => number,
  ) {
    this.getPeople = getPeople;
    this.currentDay = currentDay;
    this.state = this.load() ?? { following: [], myPosts: [] };
    this.state.liked = this.state.liked ?? [];
    this.state.comments = this.state.comments ?? {};
  }

  private load(): PulsoState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as PulsoState;
      if (!Array.isArray(s.following)) return null;
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

  /** Feed principal: una muestra de posts recientes del mundo. */
  feed(limit = 30): PulsoPost[] {
    const people = this.getPeople();
    const day = this.currentDay();
    const posts: PulsoPost[] = [];

    // Muestra determinista de personas, para no recorrer 2000 por render.
    const step = Math.max(1, Math.floor(people.length / 40));
    for (let i = 0; i < people.length; i += step) {
      const p = people[i];
      if (p) posts.push(...postsFor(p, day));
      if (posts.length > limit * 3) break;
    }

    // Orden estable por "frescura" (menos daysAgo primero) y algo de mezcla.
    posts.sort((a, b) => a.daysAgo - b.daysAgo || b.likes - a.likes);
    return posts.slice(0, limit);
  }

  /** Perfil de una persona por id, con sus posts y filtraciones. */
  profile(personId: string): Profile | null {
    const person = this.getPeople().find((p) => p.id === personId);
    if (!person) return null;

    const posts = postsFor(person, this.currentDay());
    return {
      id: person.id,
      name: person.name,
      handle: handleOf(person.name, person.id),
      bio: `${person.profession} · ${person.interests.slice(0, 2).join(", ")}`,
      followers: 20 + (seedOf(person.id) % 5000),
      posts,
      following: this.state.following.includes(person.id),
    };
  }

  /** Buscar personas por nombre o handle. */
  search(query: string): Profile[] {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (!q) return [];
    return this.getPeople()
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          handleOf(p.name, p.id).includes(q),
      )
      .slice(0, 12)
      .map((p) => this.profile(p.id)!)
      .filter(Boolean);
  }

  follow(personId: string): void {
    if (!this.state.following.includes(personId)) {
      this.state.following.push(personId);
      this.save();
    }
  }

  unfollow(personId: string): void {
    this.state.following = this.state.following.filter((id) => id !== personId);
    this.save();
  }

  isFollowing(personId: string): boolean {
    return this.state.following.includes(personId);
  }

  followingCount(): number {
    return this.state.following.length;
  }

  /** Publica un post del jugador. */
  post(text: string): void {
    const clean = text.trim().slice(0, 240);
    if (clean) {
      this.state.myPosts.unshift({ text: clean, day: this.currentDay() });
      this.state.myPosts = this.state.myPosts.slice(0, 30);
      this.save();
    }
  }

  myPosts(): { text: string; day: number }[] {
    return [...this.state.myPosts];
  }

  /* ------------------------------------------------- likes y comentarios */

  /** ¿El jugador le dio like a este post? */
  hasLiked(postId: string): boolean {
    return (this.state.liked ?? []).includes(postId);
  }

  /** Alterna el like del jugador. Devuelve el nuevo estado. */
  toggleLike(postId: string): boolean {
    const liked = this.state.liked ?? (this.state.liked = []);
    const i = liked.indexOf(postId);
    if (i === -1) liked.push(postId);
    else liked.splice(i, 1);
    this.save();
    return liked.includes(postId);
  }

  /** Total de likes visible: base del post + 1 si vos likeaste. */
  likeCountFor(post: PulsoPost): number {
    return post.likes + (this.hasLiked(post.id) ? 1 : 0);
  }

  /** Comentarios (los del jugador) de un post. */
  commentsFor(postId: string): PulsoComment[] {
    return [...((this.state.comments ?? {})[postId] ?? [])];
  }

  /** Agrega un comentario del jugador a un post. */
  comment(postId: string, text: string): void {
    const clean = text.trim().slice(0, 200);
    if (!clean) return;
    const map = this.state.comments ?? (this.state.comments = {});
    (map[postId] = map[postId] ?? []).push({
      text: clean,
      day: this.currentDay(),
      author: "vos",
    });
    this.save();
  }
}
