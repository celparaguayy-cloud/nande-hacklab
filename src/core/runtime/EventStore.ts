import type { EventBus, EventType } from "../events/EventBus";

/**
 * EventStore — el registro único de eventos del universo. Se suscribe al
 * EventBus y guarda un log consultable y reproducible de lo que pasa: es la
 * memoria del mundo que consultan el SOC, la observabilidad y el correlador.
 *
 * "The world remembers": cada evento queda con su tick y su orden, y se puede
 * filtrar por tipo, por tiempo, o reproducir (replay) para depurar.
 */
export interface StoredEvent {
  seq: number;
  type: EventType;
  tick: number;
  data: unknown;
}

/** Tipos de evento que vale la pena recordar (los de consecuencia real). */
const TRACKED: EventType[] = [
  "world.entity.created",
  "process.created",
  "process.stopped",
  "process.killed",
  "file.created",
  "file.modified",
  "file.deleted",
  "user.created",
  "network.request",
  "security.alert",
  "mission.progress",
  "mission.completed",
  "lab.solved",
  "world.news.created",
  "player.xp",
  "skill.levelup",
  "achievement.unlocked",
  "company.attack",
  "community.joined",
  "economy.tick",
  "mail.received",
  "chat.received",
  "group.joined",
  "group.op",
  "runtime.host",
  "attack.technique",
];

export class EventStore {
  private log: StoredEvent[] = [];
  private seq = 0;
  private limit: number;
  private clock: () => number;
  private unsubs: (() => void)[] = [];

  constructor(events: EventBus, clock: () => number, limit = 3000) {
    this.clock = clock;
    this.limit = limit;
    for (const type of TRACKED) {
      this.unsubs.push(
        events.subscribe(type, (event) => this.record(type, event.data)),
      );
    }
  }

  private record(type: EventType, data: unknown): void {
    this.log.push({ seq: ++this.seq, type, tick: this.clock(), data });
    if (this.log.length > this.limit) {
      this.log.splice(0, this.log.length - this.limit);
    }
  }

  dispose(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  /* -------------------------------------------------------------- consulta */

  count(): number {
    return this.seq;
  }

  all(): StoredEvent[] {
    return [...this.log];
  }

  recent(n = 50): StoredEvent[] {
    return this.log.slice(-n);
  }

  byType(type: EventType): StoredEvent[] {
    return this.log.filter((e) => e.type === type);
  }

  since(tick: number): StoredEvent[] {
    return this.log.filter((e) => e.tick >= tick);
  }

  /** Reproduce los eventos en orden (para depurar/correlacionar). */
  replay(fn: (e: StoredEvent) => void): void {
    for (const e of this.log) fn(e);
  }

  /** Resumen por tipo, para tableros de observabilidad. */
  countByType(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const e of this.log) out[e.type] = (out[e.type] ?? 0) + 1;
    return out;
  }
}
