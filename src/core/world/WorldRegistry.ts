export type WorldEntityType =
  | "app"
  | "website"
  | "forum"
  | "community"
  | "company"
  | "tool"
  | "game"
  | "project"
  | "organization"
  | "channel"
  | "video"
  | "course"
  | "lab"
  | "event"
  | "repository";

export interface WorldEntity {
  id: string;
  type: WorldEntityType;
  name: string;
  description: string;
  ownerId: string;
  createdTick: number;
  updatedTick: number;
  tags: string[];
  metadata: Record<string, string>;
}

/** Tope de entidades vivas: mantiene acotado el peso en localStorage. */
const MAX_ENTITIES = 1000;

/** Milisegundos mínimos entre dos escrituras a localStorage. */
const SAVE_INTERVAL_MS = 500;

export class WorldRegistry {
  private entities: Map<string, WorldEntity>;
  private counter: number;
  private saveTimer: ReturnType<typeof setTimeout> | null;
  private lastSave: number;

  constructor() {
    const saved = this.loadFromStorage();

    this.entities = saved?.entities ?? new Map();
    this.counter = saved?.counter ?? 1;
    this.saveTimer = null;
    this.lastSave = 0;
  }

  private loadFromStorage(): {
    entities: Map<string, WorldEntity>;
    counter: number;
  } | null {
    try {
      const raw = localStorage.getItem("nande-world-registry");

      if (!raw) {
        return null;
      }

      const saved = JSON.parse(raw) as {
        entities: WorldEntity[];
        counter: number;
      };

      if (
        !saved ||
        !Array.isArray(saved.entities) ||
        typeof saved.counter !== "number"
      ) {
        return null;
      }

      return {
        entities: new Map(
          saved.entities.map((entity) => [
            entity.id,
            entity,
          ]),
        ),
        counter: saved.counter,
      };
    } catch {
      return null;
    }
  }

  private writeToStorage(): void {
    try {
      localStorage.setItem(
        "nande-world-registry",
        JSON.stringify({
          entities: Array.from(this.entities.values()),
          counter: this.counter,
        }),
      );
    } catch {
      // El mundo sigue funcionando aunque el almacenamiento no esté disponible.
    }
  }

  // Serializar el registro entero en cada cambio congela el mundo cuando
  // hay muchas entidades, así que las escrituras se agrupan.
  private scheduleSave(): void {
    if (this.saveTimer !== null) {
      return;
    }

    const elapsed = Date.now() - this.lastSave;
    const delay = Math.max(0, SAVE_INTERVAL_MS - elapsed);

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.lastSave = Date.now();
      this.writeToStorage();
    }, delay);
  }

  /** Descarta las entidades más antiguas cuando se pasa del tope. */
  private pruneOldest(): void {
    if (this.entities.size <= MAX_ENTITIES) {
      return;
    }

    const ordered = Array.from(this.entities.values()).sort(
      (a, b) => a.createdTick - b.createdTick,
    );

    const excess = this.entities.size - MAX_ENTITIES;

    for (let index = 0; index < excess; index++) {
      this.entities.delete(ordered[index].id);
    }
  }

  /** Fuerza el guardado pendiente, sin esperar al intervalo. */
  flush(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.lastSave = Date.now();
    this.writeToStorage();
  }

  create(
    type: WorldEntityType,
    name: string,
    description: string,
    ownerId: string,
    tick: number,
    tags: string[] = [],
    metadata: Record<string, string> = {},
  ): WorldEntity {
    const entity: WorldEntity = {
      id: `entity-${this.counter++}`,
      type,
      name,
      description,
      ownerId,
      createdTick: tick,
      updatedTick: tick,
      tags: [...tags],
      metadata: { ...metadata },
    };

    this.entities.set(entity.id, entity);
    this.pruneOldest();
    this.scheduleSave();

    return structuredClone(entity);
  }

  get(id: string): WorldEntity | undefined {
    const entity = this.entities.get(id);
    return entity ? structuredClone(entity) : undefined;
  }

  getByType(type: WorldEntityType): WorldEntity[] {
    return Array.from(this.entities.values())
      .filter((entity) => entity.type === type)
      .map((entity) => structuredClone(entity));
  }

  getByOwner(ownerId: string): WorldEntity[] {
    return Array.from(this.entities.values())
      .filter((entity) => entity.ownerId === ownerId)
      .map((entity) => structuredClone(entity));
  }

  search(query: string): WorldEntity[] {
    const normalized = query.toLowerCase().trim();

    if (!normalized) {
      return [];
    }

    return Array.from(this.entities.values())
      .filter((entity) => {
        const text = [
          entity.name,
          entity.description,
          entity.type,
          ...entity.tags,
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(normalized);
      })
      .map((entity) => structuredClone(entity));
  }

  update(
    id: string,
    tick: number,
    changes: Partial<
      Pick<WorldEntity, "name" | "description" | "tags" | "metadata">
    >,
  ): WorldEntity | undefined {
    const entity = this.entities.get(id);

    if (!entity) {
      return undefined;
    }

    if (changes.name !== undefined) {
      entity.name = changes.name;
    }

    if (changes.description !== undefined) {
      entity.description = changes.description;
    }

    if (changes.tags !== undefined) {
      entity.tags = [...changes.tags];
    }

    if (changes.metadata !== undefined) {
      entity.metadata = { ...changes.metadata };
    }

    entity.updatedTick = tick;
    this.scheduleSave();

    return structuredClone(entity);
  }

  remove(id: string): boolean {
    const removed = this.entities.delete(id);

    if (removed) {
      this.scheduleSave();
    }

    return removed;
  }

  all(): WorldEntity[] {
    return Array.from(this.entities.values()).map((entity) =>
      structuredClone(entity),
    );
  }

  count(): number {
    return this.entities.size;
  }

  /** Conteo por tipo sin clonar ninguna entidad. */
  countByType(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const entity of this.entities.values()) {
      counts[entity.type] = (counts[entity.type] ?? 0) + 1;
    }

    return counts;
  }

  /** Ultimas entidades creadas, para paneles de actividad. */
  recent(limit: number = 20): WorldEntity[] {
    const all = Array.from(this.entities.values());
    const start = Math.max(0, all.length - limit);
    const recent: WorldEntity[] = [];

    for (let index = all.length - 1; index >= start; index--) {
      recent.push(structuredClone(all[index]));
    }

    return recent;
  }
}
