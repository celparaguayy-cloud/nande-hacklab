import { VirtualAgents } from "../social/VirtualAgents";
import { generatePeople } from "./VirtualPeople";
import { WorldRegistry } from "./WorldRegistry";
import { EventBus } from "../events/EventBus";
import { VirtualSocial } from "../social/VirtualSocial";
import { Communities } from "../social/Communities";
import { lifeAt, isAwake } from "./DailyLife";
import type { LifeState, LifeActivity } from "./DailyLife";
export type VirtualProfession =
  | "student"
  | "developer"
  | "security-analyst"
  | "teacher"
  | "journalist"
  | "gamer"
  | "designer"
  | "merchant"
  | "technician"
  | "entrepreneur"
  | "researcher"
  | "user";

export interface VirtualPerson {
  id: string;
  name: string;
  age: number;
  profession: VirtualProfession;
  interests: string[];
  technicalLevel: number;
  activity: number;
  online: boolean;
}

export interface WorldEvent {
  id: string;
  tick: number;
  type: "login" | "logout" | "post" | "comment" | "project";
  actorId: string;
  description: string;
}

const PEOPLE: VirtualPerson[] = generatePeople(2000);

/** Como se nombra cada vinculo en los avisos del mundo. */
const TIPO_VINCULO: Record<string, string> = {
  friend: "amigos",
  colleague: "colegas",
  acquaintance: "conocidos",
  rival: "rivales",
};

export class WorldEngine {
  private people: Map<string, VirtualPerson>;
  private events: WorldEvent[];
  private eventBus: EventBus;
  private eventCounter: number;
  private social: VirtualSocial;
  private agents: VirtualAgents;
  private registry: WorldRegistry;
  private communities: Communities;
  private onlineCount: number;

  constructor(registry: WorldRegistry, events: EventBus) {
    this.people = new Map(
      PEOPLE.map((person) => [person.id, structuredClone(person)]),
    );

    this.events = [];
    this.eventCounter = 1;

    this.onlineCount = 0;

    for (const person of this.people.values()) {
      if (person.online) {
        this.onlineCount += 1;
      }
    }

    const people = this.getPeople();

    this.social = new VirtualSocial(
      people.map((person) => person.id),
    );

    this.communities = new Communities(people, events);

    this.registry = registry;
    this.eventBus = events;

    this.agents = new VirtualAgents(
      people,
      (type, name, description, ownerId, tick, tags, metadata) =>
        this.createEntity(
          type,
          name,
          description,
          ownerId,
          tick,
          tags,
          metadata,
        ),
    );

    // Cuando un vinculo entre habitantes cambia de tipo, el mundo lo anuncia.
    this.agents.onRelationshipChanged = (relationship, agentId, tick) => {
      const person = this.people.get(agentId);
      const other = this.people.get(relationship.toId);

      if (person && other) {
        this.addEvent(
          "project",
          agentId,
          `${person.name} y ${other.name} ahora son ${TIPO_VINCULO[relationship.type]}.`,
          tick,
        );
      }

      this.eventBus.emit("relationship.changed", relationship);
    };
  }

  getPeople(): VirtualPerson[] {
    return Array.from(this.people.values()).map((person) =>
      structuredClone(person),
    );
  }

  getOnlinePeople(): VirtualPerson[] {
    return this.getPeople().filter((person) => person.online);
  }

  /** Contador sin clonar: la UI solo necesita el numero. */
  getPeopleCount(): number {
    return this.people.size;
  }

  /** Contador incremental, actualizado por setOnline(). */
  getOnlineCount(): number {
    return this.onlineCount;
  }

  getPerson(id: string): VirtualPerson | undefined {
    const person = this.people.get(id);

    return person ? structuredClone(person) : undefined;
  }

  getEvents(): WorldEvent[] {
    return structuredClone(this.events);
  }

  /** Ultimos hechos del mundo, del mas nuevo al mas viejo. */
  getRecentEvents(limit: number = 10): WorldEvent[] {
    const start = Math.max(0, this.events.length - limit);
    const recent: WorldEvent[] = [];

    for (let index = this.events.length - 1; index >= start; index--) {
      recent.push(structuredClone(this.events[index]));
    }

    return recent;
  }

  setOnline(id: string, online: boolean, tick: number): void {
    const person = this.people.get(id);

    if (!person || person.online === online) {
      return;
    }

    person.online = online;
    this.onlineCount += online ? 1 : -1;

    this.events.push({
      id: `event-${this.eventCounter++}`,
      tick,
      type: online ? "login" : "logout",
      actorId: id,
      description: `${person.name} ${online ? "se conectó" : "se desconectó"} de ÑANDE.`,
    });
  }

  addEvent(
    type: WorldEvent["type"],
    actorId: string,
    description: string,
    tick: number,
  ): void {
    if (!this.people.has(actorId)) {
      return;
    }

    this.events.push({
      id: `event-${this.eventCounter++}`,
      tick,
      type,
      actorId,
      description,
    });
  }

  tick(tick: number, hour: number = 12): void {
    // El estado en línea sigue el ritmo del día: la gente despierta tiende
    // a conectarse y la dormida a desconectarse, en vez de prender y apagar
    // al azar. Así hay más habitantes de día y menos de noche.
    for (const person of this.people.values()) {
      const awake = isAwake(person, hour);

      if (awake && !person.online && Math.random() < 0.12) {
        this.setOnline(person.id, true, tick);
      } else if (!awake && person.online && Math.random() < 0.3) {
        this.setOnline(person.id, false, tick);
      } else if (awake && person.online && Math.random() < 0.02) {
        this.setOnline(person.id, false, tick);
      }
    }

    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }

    // Se pasan las referencias internas: clonar 2000 personas por tick
    // era el mayor costo del motor. Los consumidores solo leen.
    this.agents.tick(
      tick,
      this.people.values(),
      this.social,
      this.people,
    );

    const onlineIds: string[] = [];

    for (const person of this.people.values()) {
      if (person.online) {
        onlineIds.push(person.id);
      }
    }

    this.social.tick(tick, onlineIds);

    // Las comunidades crecen con una muestra de habitantes en linea.
    if (onlineIds.length > 0) {
      const sample: VirtualPerson[] = [];
      const step = Math.max(1, Math.floor(onlineIds.length / 50));

      for (let i = 0; i < onlineIds.length; i += step) {
        const person = this.people.get(onlineIds[i]);
        if (person) {
          sample.push(person);
        }
      }

      this.communities.tick(tick, sample);
    }
  }

  getSocial(): VirtualSocial {
    return this.social;
  }

  getCommunities(): Communities {
    return this.communities;
  }

  /** Profesiones de todos los habitantes, para el mapa. */
  professions(): string[] {
    return Array.from(this.people.values()).map((p) => p.profession);
  }

  /** Estado de vida de una persona a la hora dada. */
  getPersonLife(id: string, hour: number): LifeState | undefined {
    const person = this.people.get(id);

    return person ? lifeAt(person, hour) : undefined;
  }

  /** Cuánta gente hace cada cosa ahora mismo. */
  lifeBreakdown(hour: number): Record<LifeActivity, number> {
    const counts: Record<LifeActivity, number> = {
      durmiendo: 0,
      trabajando: 0,
      estudiando: 0,
      socializando: 0,
      creando: 0,
      descansando: 0,
      "en-linea": 0,
    };

    for (const person of this.people.values()) {
      counts[lifeAt(person, hour).activity] += 1;
    }

    return counts;
  }

  /** Cuánta gente está ahora en cada zona (según su rutina). */
  presenceByZone(hour: number): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const person of this.people.values()) {
      const zone = lifeAt(person, hour).zoneId;
      counts[zone] = (counts[zone] ?? 0) + 1;
    }

    return counts;
  }

  getAgents(): VirtualAgents {
    return this.agents;
  }

  getRegistry(): WorldRegistry {
    return this.registry;
  }

  createEntity(
    type: Parameters<WorldRegistry["create"]>[0],
    name: string,
    description: string,
    ownerId: string,
    tick: number,
    tags: string[] = [],
    metadata: Record<string, string> = {},
  ) {
    const entity = this.registry.create(
      type,
      name,
      description,
      ownerId,
      tick,
      tags,
      metadata,
    );

    this.eventBus.emit("world.entity.created", entity);

    return entity;
  }

}
