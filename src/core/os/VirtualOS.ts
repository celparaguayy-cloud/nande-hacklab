import { VirtualWorld } from "../world/VirtualWorld";

export interface VirtualOSState {
  name: string;
  version: string;
  hostname: string;
  kernel: string;
  uptime: number;
}

export class VirtualOS {
  private state: VirtualOSState;
  private world: VirtualWorld;

  constructor(world: VirtualWorld) {
    this.world = world;

    this.state = {
      name: "ÑANDE OS",
      version: "1.0.0",
      hostname: world.getState().hostname,
      kernel: "nande-kernel",
      uptime: 0,
    };
  }

  getState(): VirtualOSState {
    return structuredClone(this.state);
  }

  tick(): void {
    this.world.tick();
    this.state.uptime += 1;
  }

  setHostname(hostname: string): void {
    this.state.hostname = hostname;
    this.world.setHostname(hostname);
  }
}
