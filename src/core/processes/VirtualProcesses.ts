export type ProcessStatus = "running" | "sleeping" | "stopped";

export interface VirtualProcess {
  pid: number;
  name: string;
  owner: string;
  status: ProcessStatus;
  cpu: number;
  memory: number;
}

export class VirtualProcesses {
  private processes: Map<number, VirtualProcess>;
  private nextPid: number;

  constructor() {
    this.processes = new Map();
    this.nextPid = 1;

    this.createProcess("init", "root", 0.1, 2);
    this.createProcess("network-manager", "root", 0.2, 8);
    this.createProcess("terminal", "student", 0.5, 16);
  }

  createProcess(
    name: string,
    owner: string,
    cpu = 0,
    memory = 0,
  ): VirtualProcess {
    const process: VirtualProcess = {
      pid: this.nextPid++,
      name,
      owner,
      status: "running",
      cpu,
      memory,
    };

    this.processes.set(process.pid, process);

    return { ...process };
  }

  getProcess(pid: number): VirtualProcess | undefined {
    const process = this.processes.get(pid);

    return process ? { ...process } : undefined;
  }

  getAllProcesses(): VirtualProcess[] {
    return Array.from(this.processes.values()).map((process) => ({
      ...process,
    }));
  }

  stopProcess(pid: number): void {
    const process = this.processes.get(pid);

    if (!process) {
      throw new Error(`Proceso no encontrado: ${pid}`);
    }

    process.status = "stopped";
  }

  startProcess(pid: number): void {
    const process = this.processes.get(pid);

    if (!process) {
      throw new Error(`Proceso no encontrado: ${pid}`);
    }

    process.status = "running";
  }

  killProcess(pid: number): void {
    if (!this.processes.has(pid)) {
      throw new Error(`Proceso no encontrado: ${pid}`);
    }

    this.processes.delete(pid);
  }
}
