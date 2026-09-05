import { VirtualWorld } from "./world/VirtualWorld";
import { VirtualOS } from "./os/VirtualOS";
import { VirtualFilesystem } from "./filesystem/VirtualFilesystem";
import { VirtualUsers } from "./users/VirtualUsers";
import { VirtualProcesses } from "./processes/VirtualProcesses";
import { EventBus } from "./events/EventBus";
import { VirtualPrograms } from "./programs/VirtualPrograms";
import { VirtualNetwork } from "./network/VirtualNetwork";

export class VirtualKernel {
  public world: VirtualWorld;
  public os: VirtualOS;
  public filesystem: VirtualFilesystem;
  public users: VirtualUsers;
  public processes: VirtualProcesses;
  public programs: VirtualPrograms;
  public events: EventBus;
  public network: VirtualNetwork;

  constructor() {
    this.world = new VirtualWorld();
    this.os = new VirtualOS(this.world);
    this.filesystem = new VirtualFilesystem();
    this.users = new VirtualUsers();
    this.processes = new VirtualProcesses();
    this.programs = new VirtualPrograms();
    this.events = new EventBus();
    this.network = new VirtualNetwork();
  }

  tick(): void {
    this.os.tick();

    this.events.emit(
      "world.tick",
      this.world.getState(),
    );
  }

  snapshot() {
    return {
      world: this.world.getState(),
      os: this.os.getState(),
      users: this.users,
      processes: this.processes,
      programs: this.programs.all(),
    };
  }
}
