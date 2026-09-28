import type { AdversaryEmulator } from "./AdversaryEmulator";

/**
 * SimulationDirector — el motor que MUEVE el juego. El kernel ya late (tick):
 * mundo, economía, amenazas y el red team NPC avanzan con el reloj. Lo que
 * faltaba era que la CAMPAÑA del adversario (AdversaryEmulator) avance sola con
 * ese mismo latido, en vez de sólo cuando el jugador tipea `apt step`. El
 * Director es el director de orquesta: en cada pulso decide qué se mueve, a qué
 * TEMPO, y lleva la bitácora del mundo vivo.
 *
 * Consecuencia real (reglas 10/25): con el Director en "vivo", un adversario
 * armado avanza su kill chain contra reloj — cada paso emite su técnica (la ven
 * SOC/DFIR/matriz/azul) — y el jugador tiene que DETECTAR y CONTENER a tiempo,
 * en tiempo real, o el adversario cumple su objetivo. El tiempo es el enemigo.
 *
 * Apagado por defecto ("paused"): no cambia el juego ni los tests hasta que se
 * activa. Determinista y testeable: pulse(tick) es una función pura del reloj.
 */

export type Tempo = "paused" | "slow" | "normal" | "fast";

/** Ticks del mundo entre pasos del adversario, por tempo. */
const CADENCE: Record<Tempo, number> = { paused: 0, slow: 60, normal: 30, fast: 12 };

export interface DirectorBeat {
  tick: number;
  what: string;
}

interface DirectorDeps {
  adversary: AdversaryEmulator;
  clock: () => number;
  /** Lecturas extra para el tablero del mundo vivo (opcional, sólo lectura). */
  pulseInfo?: () => { redteam?: string; heat?: number; threats?: number };
}

export class SimulationDirector {
  private deps: DirectorDeps;
  private tempoV: Tempo = "paused";
  private beats: DirectorBeat[] = [];
  private lastStepTick = -Infinity;

  constructor(deps: DirectorDeps) {
    this.deps = deps;
  }

  tempo(): Tempo {
    return this.tempoV;
  }
  cadence(): number {
    return CADENCE[this.tempoV];
  }

  setTempo(t: Tempo): void {
    this.tempoV = t;
    // Al (re)activar, alineá el próximo paso a la cadencia desde ahora.
    if (t !== "paused") this.lastStepTick = this.deps.clock();
  }

  private log(tick: number, what: string): void {
    this.beats.push({ tick, what });
    if (this.beats.length > 100) this.beats.splice(0, this.beats.length - 100);
  }

  /**
   * El latido: lo llama el kernel en cada tick. Si el tempo no es "paused" y ya
   * pasó la cadencia, avanza UN paso de la campaña del adversario en marcha.
   * Puro respecto del reloj que le pasan: en tests se maneja con pulse(tick).
   */
  pulse(tick: number): void {
    if (this.tempoV === "paused") return;
    const cad = CADENCE[this.tempoV];
    if (cad <= 0 || tick - this.lastStepTick < cad) return;
    const st = this.deps.adversary.state();
    if (st.status !== "running" && st.status !== "blocked") return; // nada armado en marcha
    this.lastStepTick = tick;
    const r = this.deps.adversary.step();
    this.log(tick, `${r.blocked ? "⛔" : r.done ? "🏁" : "▶"} ${r.note}`);
  }

  /** Fuerza N pasos del adversario ahora (fast-forward manual del director). */
  beat(times = 1): number {
    let moved = 0;
    for (let i = 0; i < times; i += 1) {
      const st = this.deps.adversary.state();
      if (st.status !== "running" && st.status !== "blocked") break;
      const r = this.deps.adversary.step();
      this.log(this.deps.clock(), `${r.blocked ? "⛔" : r.done ? "🏁" : "▶"} ${r.note}`);
      moved += 1;
      if (r.done) break;
    }
    return moved;
  }

  recentBeats(n = 12): DirectorBeat[] {
    return this.beats.slice(-n);
  }

  /** Tablero del mundo vivo: tempo + campaña + pulso general. */
  state(): {
    tempo: Tempo;
    cadence: number;
    live: boolean;
    beats: DirectorBeat[];
    adversary: ReturnType<AdversaryEmulator["state"]>;
    info: { redteam?: string; heat?: number; threats?: number };
  } {
    return {
      tempo: this.tempoV,
      cadence: CADENCE[this.tempoV],
      live: this.tempoV !== "paused",
      beats: this.recentBeats(),
      adversary: this.deps.adversary.state(),
      info: this.deps.pulseInfo?.() ?? {},
    };
  }
}
