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
    this.state = {
      clock: {
        tick: 0,
        day: 1,
        hour: 8,
        minute: 0,
      },
      hostname: "nande-os",
      online: true,
    };
  }

  getState(): VirtualWorldState {
    return structuredClone(this.state);
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
  }

  setOnline(status: boolean): void {
    this.state.online = status;
  }

  setHostname(hostname: string): void {
    this.state.hostname = hostname;
  }
}
