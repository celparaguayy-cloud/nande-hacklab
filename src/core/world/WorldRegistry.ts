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

export class WorldRegistry {
  private entities: Map<string, WorldEntity>;
  private counter: number;

  constructor() {
    const saved = this.loadFromStorage();

    this.entities = saved?.entities ?? new Map();
    this.counter = saved?.counter ?? 1;
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

  private saveToStorage(): void {
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
    this.saveToStorage();

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
    this.saveToStorage();

    return structuredClone(entity);
  }

  remove(id: string): boolean {
    const removed = this.entities.delete(id);

    if (removed) {
      this.saveToStorage();
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
}
