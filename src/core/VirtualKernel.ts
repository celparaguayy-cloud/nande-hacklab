import { EventBus } from "./events/EventBus";
import { VirtualFilesystem } from "./filesystem/VirtualFilesystem";
import { VirtualOS } from "./os/VirtualOS";
import { VirtualProcesses } from "./processes/VirtualProcesses";
import { VirtualWorld } from "./world/VirtualWorld";
import { VirtualUsers } from "./users/VirtualUsers";

export class VirtualKernel {
  readonly world: VirtualWorld;
  readonly os: VirtualOS;
  readonly filesystem: VirtualFilesystem;
  readonly users: VirtualUsers;
  readonly processes: VirtualProcesses;
  readonly events: EventBus;

  constructor() {
    this.events = new EventBus();
    this.world = new VirtualWorld();
    this.os = new VirtualOS(this.world);
    this.filesystem = new VirtualFilesystem();
    this.users = new VirtualUsers();
    this.processes = new VirtualProcesses();
  }

  tick(): void {
    this.os.tick();

    this.events.emit("world.tick", {
      world: this.world.getState(),
      os: this.os.getState(),
    });
  }

  getSnapshot() {
    return {
      world: this.world.getState(),
      os: this.os.getState(),
      users: this.users.getAllUsers(),
      processes: this.processes.getAllProcesses(),
    };
  }
}
