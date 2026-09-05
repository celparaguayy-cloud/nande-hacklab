export type RelationshipType =
  | "friend"
  | "colleague"
  | "acquaintance"
  | "rival";

export interface AgentRelationship {
  id: string;
  fromId: string;
  toId: string;
  type: RelationshipType;
  trust: number;
  interactions: number;
  sinceTick: number;
}

/**
 * Vinculos que mantiene un mismo agente. Con 2000 habitantes el total
 * posible es de millones, asi que cada uno conserva solo los mas
 * significativos.
 */
const MAX_PER_AGENT = 20;

/** Interacciones necesarias para pasar de conocido a colega. */
const COLLEAGUE_INTERACTIONS = 3;

/** Confianza a partir de la cual un vinculo se vuelve amistad. */
const FRIEND_TRUST = 75;

/** Confianza por debajo de la cual el vinculo se vuelve rivalidad. */
const RIVAL_TRUST = 20;

export class AgentRelationships {
  private relationships: Map<
    string,
    AgentRelationship
  >;

  /** Indice de vinculos por agente de origen, para no recorrer el total. */
  private byAgent: Map<string, string[]>;

  private counter = 1;

  constructor() {
    this.relationships = new Map();
    this.byAgent = new Map();
  }

  /** Descarta los vinculos mas debiles cuando un agente supera el tope. */
  private prune(agentId: string): void {
    const keys = this.byAgent.get(agentId);

    if (!keys || keys.length <= MAX_PER_AGENT) {
      return;
    }

    // Se conservan los de mas interacciones: los tratados de verdad.
    const ordered = keys
      .map((key) => ({ key, rel: this.relationships.get(key)! }))
      .filter((item) => item.rel !== undefined)
      .sort((a, b) => b.rel.interactions - a.rel.interactions);

    const kept = ordered.slice(0, MAX_PER_AGENT);

    for (const { key } of ordered.slice(MAX_PER_AGENT)) {
      this.relationships.delete(key);
    }

    this.byAgent.set(
      agentId,
      kept.map((item) => item.key),
    );
  }

  /**
   * Ajusta el tipo de vinculo segun como haya ido el trato.
   * Devuelve el tipo anterior si cambio, o undefined si sigue igual.
   */
  private evolve(
    relationship: AgentRelationship,
    sameProfession: boolean,
  ): RelationshipType | undefined {
    const previous = relationship.type;

    if (relationship.trust <= RIVAL_TRUST) {
      relationship.type = "rival";
    } else if (relationship.trust >= FRIEND_TRUST) {
      relationship.type = "friend";
    } else if (
      sameProfession &&
      relationship.interactions >= COLLEAGUE_INTERACTIONS
    ) {
      relationship.type = "colleague";
    }

    return relationship.type === previous ? undefined : previous;
  }

  private key(
    fromId: string,
    toId: string,
  ): string {
    return `${fromId}:${toId}`;
  }

  create(
    fromId: string,
    toId: string,
    type: RelationshipType,
    tick: number,
    trust: number = 50,
  ): AgentRelationship {
    const key = this.key(fromId, toId);
    const existing =
      this.relationships.get(key);

    if (existing) {
      return structuredClone(existing);
    }

    const relationship: AgentRelationship = {
      id: `relationship-${this.counter++}`,
      fromId,
      toId,
      type,
      trust: Math.max(
        0,
        Math.min(100, trust),
      ),
      interactions: 0,
      sinceTick: tick,
    };

    this.relationships.set(
      key,
      relationship,
    );

    const keys = this.byAgent.get(fromId) ?? [];
    keys.push(key);
    this.byAgent.set(fromId, keys);

    return structuredClone(
      relationship,
    );
  }

  get(
    fromId: string,
    toId: string,
  ): AgentRelationship | undefined {
    const relationship =
      this.relationships.get(
        this.key(fromId, toId),
      );

    return relationship
      ? structuredClone(relationship)
      : undefined;
  }

  /**
   * Registra un trato entre dos agentes.
   *
   * `sameProfession` permite que el vinculo derive a colega. El campo
   * `changedFrom` indica el tipo anterior cuando la relacion evoluciono,
   * para que el mundo pueda anunciarlo.
   */
  interact(
    fromId: string,
    toId: string,
    tick: number,
    trustChange: number = 1,
    sameProfession: boolean = false,
  ): AgentRelationship & { changedFrom?: RelationshipType } {
    const key = this.key(fromId, toId);

    if (!this.relationships.has(key)) {
      this.create(fromId, toId, "acquaintance", tick);
    }

    // Se opera sobre el objeto guardado, no sobre una copia.
    const relationship = this.relationships.get(key)!;

    relationship.interactions += 1;
    relationship.trust = Math.max(
      0,
      Math.min(
        100,
        relationship.trust +
          trustChange,
      ),
    );

    const changedFrom = this.evolve(relationship, sameProfession);

    this.prune(fromId);

    return {
      ...structuredClone(relationship),
      ...(changedFrom ? { changedFrom } : {}),
    };
  }

  countForAgent(agentId: string): number {
    return this.byAgent.get(agentId)?.length ?? 0;
  }

  count(): number {
    return this.relationships.size;
  }

  getForAgent(
    agentId: string,
  ): AgentRelationship[] {
    return Array.from(
      this.relationships.values(),
    )
      .filter(
        (relationship) =>
          relationship.fromId ===
            agentId ||
          relationship.toId === agentId,
      )
      .map((relationship) =>
        structuredClone(relationship),
      );
  }

  getFriends(
    agentId: string,
  ): AgentRelationship[] {
    return this.getForAgent(agentId)
      .filter(
        (relationship) =>
          relationship.type ===
          "friend",
      );
  }

  getColleagues(
    agentId: string,
  ): AgentRelationship[] {
    return this.getForAgent(agentId)
      .filter(
        (relationship) =>
          relationship.type ===
          "colleague",
      );
  }

  all(): AgentRelationship[] {
    return Array.from(
      this.relationships.values(),
    ).map((relationship) =>
      structuredClone(relationship),
    );
  }
}
