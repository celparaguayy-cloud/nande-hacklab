export type EventType =
  | "world.tick"
  | "world.entity.created"
  | "process.created"
  | "process.stopped"
  | "process.killed"
  | "file.created"
  | "file.modified"
  | "file.deleted"
  | "user.created"
  | "network.request"
  | "security.alert"
  | "mission.progress"
  // Mundo social y emergente. Se agregan solo los que tienen consumidor:
  // un evento por accion de agente seria ruido de cientos por tick.
  | "social.post.created"
  | "social.comment.created"
  | "relationship.changed"
  | "world.news.created";

export interface VirtualEvent<T = unknown> {
  type: EventType;
  timestamp: number;
  data: T;
}

type EventHandler<T = unknown> = (event: VirtualEvent<T>) => void;

export class EventBus {
  private handlers: Map<EventType, Set<EventHandler>>;

  constructor() {
    this.handlers = new Map();
  }

  subscribe<T>(
    type: EventType,
    handler: EventHandler<T>,
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    const handlers = this.handlers.get(type)!;

    handlers.add(handler as EventHandler);

    return () => {
      handlers.delete(handler as EventHandler);
    };
  }

  emit<T>(type: EventType, data: T): void {
    const event: VirtualEvent<T> = {
      type,
      timestamp: Date.now(),
      data,
    };

    const handlers = this.handlers.get(type);

    if (!handlers) {
      return;
    }

    handlers.forEach((handler) => {
      handler(event);
    });
  }

  clear(): void {
    this.handlers.clear();
  }
}
