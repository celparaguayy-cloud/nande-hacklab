/**
 * VirtualClock — el ÚNICO reloj del universo ÑANDE. No inventa tiempo: lee el
 * reloj del mundo (VirtualWorld), así todo el sistema comparte la misma línea
 * temporal (NPCs, servicios, timeouts, CTF, eventos). Es una fachada de
 * lectura para no duplicar la fuente del tiempo.
 */
export interface ClockReading {
  tick: number;
  day: number;
  hour: number;
  minute: number;
}

export class VirtualClock {
  private read: () => ClockReading;

  constructor(read: () => ClockReading) {
    this.read = read;
  }

  now(): ClockReading {
    return this.read();
  }

  /** Tick monotónico del mundo (una unidad = un minuto virtual). */
  tick(): number {
    return this.read().tick;
  }

  /** Hora del día como HH:MM. */
  time(): string {
    const c = this.read();
    return `${String(c.hour).padStart(2, "0")}:${String(c.minute).padStart(2, "0")}`;
  }

  day(): number {
    return this.read().day;
  }
}
