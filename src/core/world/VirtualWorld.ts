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

export class VirtualWorld {
  private state: VirtualWorldState;

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

  private saveToStorage(): void {
    try {
      localStorage.setItem(
        "nande-os-world",
        JSON.stringify(this.state),
      );
    } catch {
      // El almacenamiento puede estar deshabilitado.
    }
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
