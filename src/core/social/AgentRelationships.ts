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

export class AgentRelationships {
  private relationships: Map<
    string,
    AgentRelationship
  >;

  private counter = 1;

  constructor() {
    this.relationships = new Map();
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

  interact(
    fromId: string,
    toId: string,
    tick: number,
    trustChange: number = 1,
  ): AgentRelationship {
    const existing =
      this.get(fromId, toId);

    const relationship =
      existing ??
      this.create(
        fromId,
        toId,
        "acquaintance",
        tick,
      );

    relationship.interactions += 1;
    relationship.trust = Math.max(
      0,
      Math.min(
        100,
        relationship.trust +
          trustChange,
      ),
    );

    this.relationships.set(
      this.key(fromId, toId),
      relationship,
    );

    return structuredClone(
      relationship,
    );
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
