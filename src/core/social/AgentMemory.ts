export type MemoryType =
  | "person"
  | "event"
  | "project"
  | "message"
  | "fact";

export interface AgentMemoryEntry {
  id: string;
  agentId: string;
  type: MemoryType;
  text: string;
  importance: number;
  tick: number;
}

export class AgentMemory {
  private memories: Map<
    string,
    AgentMemoryEntry[]
  >;

  private counter = 1;

  constructor() {
    this.memories = new Map();
  }

  remember(
    agentId: string,
    type: MemoryType,
    text: string,
    tick: number,
    importance: number = 5,
  ): void {
    const list =
      this.memories.get(agentId) ?? [];

    list.push({
      id: `memory-${this.counter++}`,
      agentId,
      type,
      text,
      importance: Math.max(
        1,
        Math.min(10, importance),
      ),
      tick,
    });

    // Cada agente conserva como máximo
    // las 100 memorias más relevantes/recientes.
    if (list.length > 100) {
      list.sort(
        (a, b) =>
          b.importance - a.importance ||
          b.tick - a.tick,
      );

      list.splice(100);
    }

    this.memories.set(agentId, list);
  }

  getMemories(
    agentId: string,
  ): AgentMemoryEntry[] {
    return (
      this.memories
        .get(agentId)
        ?.map((memory) =>
          structuredClone(memory),
        ) ?? []
    );
  }

  getImportantMemories(
    agentId: string,
    minimumImportance: number = 7,
  ): AgentMemoryEntry[] {
    return this.getMemories(agentId).filter(
      (memory) =>
        memory.importance >=
        minimumImportance,
    );
  }

  rememberPerson(
    agentId: string,
    personId: string,
    description: string,
    tick: number,
  ): void {
    this.remember(
      agentId,
      "person",
      `${personId}: ${description}`,
      tick,
      7,
    );
  }

  rememberEvent(
    agentId: string,
    description: string,
    tick: number,
    importance: number = 6,
  ): void {
    this.remember(
      agentId,
      "event",
      description,
      tick,
      importance,
    );
  }

  rememberProject(
    agentId: string,
    description: string,
    tick: number,
  ): void {
    this.remember(
      agentId,
      "project",
      description,
      tick,
      8,
    );
  }

  rememberMessage(
    agentId: string,
    description: string,
    tick: number,
  ): void {
    this.remember(
      agentId,
      "message",
      description,
      tick,
      5,
    );
  }

  clear(agentId: string): void {
    this.memories.delete(agentId);
  }

  clearAll(): void {
    this.memories.clear();
  }
}
