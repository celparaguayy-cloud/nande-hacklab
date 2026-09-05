/**
 * Hardware de la PC virtual de ÑANDE.
 *
 * Da la sensación de una computadora real: CPU, RAM, disco, GPU, red. Son
 * datos del sandbox; algunas simulaciones pueden mirarlos (por ejemplo, un
 * crackeo "más rápido" con mejor GPU), pero nada de esto es hardware real.
 */

export interface HardwareSpec {
  hostname: string;
  cpu: { model: string; cores: number; ghz: number };
  ram: { total: number; used: number }; // en MB
  storage: { total: number; used: number }; // en GB
  gpu: string;
  os: string;
  kernel: string;
}

const STORAGE_KEY = "nande-hardware";

function defaultSpec(): HardwareSpec {
  return {
    hostname: "student-pc",
    cpu: { model: "Ñande Core i-Virtual", cores: 4, ghz: 3.2 },
    ram: { total: 8192, used: 2048 },
    storage: { total: 120, used: 34 },
    gpu: "Ñande Graphics 2 (virtual)",
    os: "ÑANDE OS 1.0",
    kernel: "nande-kernel 1.0-virtual",
  };
}

export class VirtualHardware {
  private spec: HardwareSpec;

  constructor() {
    this.spec = this.load() ?? defaultSpec();
  }

  private load(): HardwareSpec | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      const saved = JSON.parse(raw) as HardwareSpec;

      if (!saved || !saved.cpu || !saved.ram) {
        return null;
      }

      return { ...defaultSpec(), ...saved };
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.spec));
    } catch {
      // El sistema sigue aunque no se pueda guardar.
    }
  }

  getSpec(): HardwareSpec {
    return structuredClone(this.spec);
  }

  setHostname(hostname: string): void {
    const clean = hostname.trim().slice(0, 32);

    if (clean) {
      this.spec.hostname = clean;
      this.save();
    }
  }

  /** Uso de RAM como porcentaje entero. */
  ramUsagePercent(): number {
    return Math.round((this.spec.ram.used / this.spec.ram.total) * 100);
  }

  /** Uso de disco como porcentaje entero. */
  storageUsagePercent(): number {
    return Math.round(
      (this.spec.storage.used / this.spec.storage.total) * 100,
    );
  }

  /**
   * Un "puntaje" de la máquina, para que las specs importen en algunas
   * simulaciones (más CPU/GPU = más rápido).
   */
  power(): number {
    const cpu = this.spec.cpu.cores * this.spec.cpu.ghz;
    const gpu = this.spec.gpu.includes("virtual") ? 2 : 4;

    return Math.round(cpu * gpu);
  }

  /** Resumen tipo neofetch para la terminal. */
  render(): string {
    const s = this.spec;

    return [
      `        ___        student@${s.hostname}`,
      `       /   \\       ${"-".repeat(20)}`,
      `      | Ñ Ñ |      OS:     ${s.os}`,
      `      |  ^  |      Kernel: ${s.kernel}`,
      `       \\___/       CPU:    ${s.cpu.model} (${s.cpu.cores} núcleos @ ${s.cpu.ghz}GHz)`,
      `      /|   |\\      GPU:    ${s.gpu}`,
      `     / |   | \\     RAM:    ${s.ram.used}/${s.ram.total} MB (${this.ramUsagePercent()}%)`,
      `       |___|       Disco:  ${s.storage.used}/${s.storage.total} GB (${this.storageUsagePercent()}%)`,
      `                   Potencia: ${this.power()}`,
    ].join("\n");
  }
}
