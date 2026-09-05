import type { EventBus } from "../events/EventBus";
import type { VirtualPerson } from "../world/WorldEngine";

/**
 * Comunidades vivas de ÑANDE.
 *
 * Grupos de habitantes reunidos por interés: programadores, hackers,
 * gamers, etc. No son listas fijas: se fundan con un tema, ganan miembros
 * con el tiempo según los intereses de la gente y acumulan actividad. Así
 * el mundo tiene comunidades que crecen solas.
 */

export interface Community {
  id: string;
  name: string;
  topic: string;
  description: string;
  founderId: string;
  founderName: string;
  createdTick: number;
  memberIds: string[];
  /** Actividad acumulada (mensajes, publicaciones del grupo). */
  activity: number;
}

/** Comunidades semilla, una por gran interés del mundo. */
const SEED_COMMUNITIES: Array<{
  id: string;
  name: string;
  topic: string;
  description: string;
}> = [
  {
    id: "com-programadores",
    name: "Programadores ÑANDE",
    topic: "programación",
    description: "Código, proyectos y ayuda entre desarrolladores.",
  },
  {
    id: "com-hackers",
    name: "Hackers Éticos",
    topic: "ciberseguridad",
    description: "Seguridad, laboratorios y retos, siempre en el sandbox.",
  },
  {
    id: "com-linux",
    name: "Linuxeros",
    topic: "Linux",
    description: "Terminal, sistemas y trucos de Linux.",
  },
  {
    id: "com-redes",
    name: "Redes y Servidores",
    topic: "redes",
    description: "Cómo se conectan las máquinas del mundo.",
  },
  {
    id: "com-gamers",
    name: "Gamers ÑANDE",
    topic: "videojuegos",
    description: "Juegos hechos por habitantes y torneos.",
  },
  {
    id: "com-diseno",
    name: "Diseño Creativo",
    topic: "diseño",
    description: "Interfaces, arte y proyectos visuales.",
  },
];

/** Cada cuántos ticks una comunidad puede sumar un miembro. */
const JOIN_INTERVAL = 40;

/** Tope de miembros que se listan por comunidad (rendimiento). */
const MAX_MEMBERS = 400;

export class Communities {
  private communities: Map<string, Community>;
  private events?: EventBus;

  constructor(people: VirtualPerson[], events?: EventBus) {
    this.events = events;
    this.communities = new Map();

    // Las comunidades semilla se fundan con quien mejor encaje por interés.
    for (const seed of SEED_COMMUNITIES) {
      const founder =
        people.find((p) => p.interests.includes(seed.topic)) ?? people[0];

      this.communities.set(seed.id, {
        id: seed.id,
        name: seed.name,
        topic: seed.topic,
        description: seed.description,
        founderId: founder?.id ?? "person-00001",
        founderName: founder?.name ?? "ÑANDE",
        createdTick: 0,
        memberIds: founder ? [founder.id] : [],
        activity: 0,
      });
    }
  }

  all(): Community[] {
    return Array.from(this.communities.values()).map((c) =>
      structuredClone(c),
    );
  }

  get(id: string): Community | undefined {
    const community = this.communities.get(id);

    return community ? structuredClone(community) : undefined;
  }

  count(): number {
    return this.communities.size;
  }

  /** Comunidades ordenadas por cantidad de miembros. */
  ranking(limit: number = 10): Community[] {
    return this.all()
      .sort((a, b) => b.memberIds.length - a.memberIds.length)
      .slice(0, limit);
  }

  /** Total de membresías (para estadísticas del mundo). */
  totalMembers(): number {
    let total = 0;

    for (const community of this.communities.values()) {
      total += community.memberIds.length;
    }

    return total;
  }

  /**
   * Avanza la vida de las comunidades: de a poco suman miembros afines y
   * acumulan actividad. Recibe algunos habitantes en línea por tick.
   */
  tick(tick: number, onlinePeople: VirtualPerson[]): void {
    if (onlinePeople.length === 0) {
      return;
    }

    if (tick % JOIN_INTERVAL === 0) {
      // Una persona al azar se suma a una comunidad que le interese.
      const person =
        onlinePeople[
          Math.floor(Math.random() * onlinePeople.length)
        ];

      const candidates = Array.from(this.communities.values()).filter(
        (community) =>
          person.interests.includes(community.topic) &&
          !community.memberIds.includes(person.id) &&
          community.memberIds.length < MAX_MEMBERS,
      );

      if (candidates.length > 0) {
        const community =
          candidates[Math.floor(Math.random() * candidates.length)];

        community.memberIds.push(person.id);

        this.events?.emit("community.joined", {
          communityId: community.id,
          personId: person.id,
          tick,
        });
      }
    }

    // Actividad ocasional en una comunidad con miembros.
    if (Math.random() < 0.3) {
      const withMembers = Array.from(this.communities.values()).filter(
        (c) => c.memberIds.length > 1,
      );

      if (withMembers.length > 0) {
        const community =
          withMembers[Math.floor(Math.random() * withMembers.length)];

        community.activity += 1;
      }
    }
  }
}
