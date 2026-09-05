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

    this.create("init", "root", 0.2, 12);
    this.create("network-manager", "root", 0.4, 28);
    this.create("terminal", "student", 0.8, 36);
  }

  create(
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

    return structuredClone(process);
  }

  find(pid: number): VirtualProcess | undefined {
    const process = this.processes.get(pid);

    return process ? structuredClone(process) : undefined;
  }

  list(): VirtualProcess[] {
    return Array.from(this.processes.values()).map((process) =>
      structuredClone(process),
    );
  }

  stop(pid: number): void {
    const process = this.processes.get(pid);

    if (!process) {
      throw new Error(`Proceso no encontrado: ${pid}`);
    }

    process.status = "stopped";
  }

  start(pid: number): void {
    const process = this.processes.get(pid);

    if (!process) {
      throw new Error(`Proceso no encontrado: ${pid}`);
    }

    process.status = "running";
  }

  kill(pid: number): void {
    if (!this.processes.has(pid)) {
      throw new Error(`Proceso no encontrado: ${pid}`);
    }

    this.processes.delete(pid);
  }

  count(): number {
    return this.processes.size;
  }
}
