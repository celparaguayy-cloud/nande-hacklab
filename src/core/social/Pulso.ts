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

function handleOf(name: string): string {
  return (
    "@" +
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 12)
  );
}

const PETS = ["Luna", "Rocky", "Michi", "Toby", "Nube", "Simba", "Kiki", "Rex"];
const WORKPLACES = [
  "Arandu Software", "Banco Justicia", "Vortex Media", "Nimbus Cloud",
  "Pixela Games", "Guaraní Tech", "Pytã Security", "Yvoty Media",
];

const COMPLAINTS = [
  "otra vez se cayó el sistema en el trabajo, no doy más 😤",
  "3 horas esperando al técnico y no vino nadie",
  "¿por qué todo tiene que pedir contraseña nueva cada mes? 🙄",
  "el wifi de la oficina anda peor que mi paciencia",
  "me cambiaron el turno sin avisar, un desastre la gestión",
];
const BRAGS = [
  "por fin terminé el proyecto en el que estaba hace semanas 🚀",
  "me ascendieron 🎉 gracias a todos los que confiaron",
  "aprendí algo nuevo hoy y no puedo parar de aplicarlo",
  "cerré un trato importante, semana redonda ✨",
];
const PHOTOS = [
  "📷 atardecer desde la oficina",
  "📷 mi setup nuevo, quedó hermoso",
  "📷 café ☕ y a programar",
  "📷 finde en familia ❤️",
];

/** Genera los posts de una persona según su antigüedad social. */
function postsFor(person: VirtualPerson, day: number): PulsoPost[] {
  const seed = seedOf(person.name);
  const handle = handleOf(person.name);
  const count = 3 + (seed % 4);
  const posts: PulsoPost[] = [];

  for (let i = 0; i < count; i += 1) {
    const s = seedOf(`${person.name}-${i}`);
    const kind = s % 4;
    let text: string;
    let leak: PulsoPost["leak"];
    let leakValue: string | undefined;

    if (kind === 0) text = pick(COMPLAINTS, s);
    else if (kind === 1) text = pick(BRAGS, s);
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

interface PulsoState {
  following: string[];
  /** Posts del propio jugador. */
  myPosts: { text: string; day: number }[];
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
      handle: handleOf(person.name),
      bio: `${person.profession} · ${person.interests.slice(0, 2).join(", ")}`,
      followers: 20 + (seedOf(person.name) % 5000),
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
          handleOf(p.name).includes(q),
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
}
