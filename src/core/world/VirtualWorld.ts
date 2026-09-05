export interface WorldClock {
  tick: number;
  day: number;
  hour: number;
  minute: number;
}

export interface VirtualWorldState {
  clock: WorldClock;
  hostname: string;
  online: boolean;
}

/** Milisegundos minimos entre dos escrituras del reloj a localStorage. */
const SAVE_INTERVAL_MS = 2000;

export class VirtualWorld {
  private state: VirtualWorldState;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSave = 0;

  constructor() {
    const saved = this.loadFromStorage();

    this.state = saved ?? {
      clock: {
        tick: 0,
        day: 1,
        hour: 8,
        minute: 0,
      },
      hostname: "nande-os",
      online: true,
    };

    this.saveToStorage();
  }

  getState(): VirtualWorldState {
    return structuredClone(this.state);
  }

  private loadFromStorage(): VirtualWorldState | null {
    try {
      const raw = localStorage.getItem("nande-os-world");

      if (!raw) return null;

      const saved = JSON.parse(raw) as VirtualWorldState;

      if (
        !saved ||
        typeof saved.hostname !== "string" ||
        typeof saved.online !== "boolean" ||
        !saved.clock
      ) {
        return null;
      }

      return saved;
    } catch {
      return null;
    }
  }

  private writeToStorage(): void {
    try {
      localStorage.setItem(
        "nande-os-world",
        JSON.stringify(this.state),
      );
    } catch {
      // El almacenamiento puede estar deshabilitado.
    }
  }

  // El reloj avanza en cada tick; escribir cada vez es innecesario.
  private saveToStorage(): void {
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

  /** Fuerza el guardado pendiente sin esperar al intervalo. */
  flush(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.lastSave = Date.now();
    this.writeToStorage();
  }

  tick(): void {
    this.state.clock.tick += 1;
    this.state.clock.minute += 1;

    if (this.state.clock.minute >= 60) {
      this.state.clock.minute = 0;
      this.state.clock.hour += 1;
    }

    if (this.state.clock.hour >= 24) {
      this.state.clock.hour = 0;
      this.state.clock.day += 1;
    }

    this.saveToStorage();
  }

  setOnline(status: boolean): void {
    this.state.online = status;
    this.saveToStorage();
  }

  setHostname(hostname: string): void {
    this.state.hostname = hostname;
    this.saveToStorage();
  }
}
