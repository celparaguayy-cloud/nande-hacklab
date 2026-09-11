/**
 * Vida audiovisual de ÑANDE (idea #10).
 *
 * Sonido 100% PROCEDURAL: se sintetiza con Web Audio en el momento, sin
 * ningún archivo externo (nada que cargar, funciona offline y no viola la
 * CSP). Todo está blindado en try/catch y detrás de una detección de
 * capacidad: si el navegador no puede, simplemente queda en silencio —nunca
 * rompe el juego—. El jugador puede silenciarlo, y la preferencia persiste.
 *
 * La parte pura (qué sonido va con cada evento, y cómo el "calor" sube la
 * tensión) es testeable sin depender de audio real.
 */

export type SoundName = "key" | "success" | "alert" | "levelup" | "click" | "error";

interface Tone {
  freq: number;
  /** Duración en segundos. */
  dur: number;
  type: OscillatorType;
  /** Volumen 0–1 (antes de escalar por el master). */
  gain: number;
  /** Segundo tono opcional (para un "ding" de dos notas). */
  then?: { freq: number; delay: number };
}

/** Ficha de cada sonido. Data pura: fácil de testear. */
export const TONES: Record<SoundName, Tone> = {
  key: { freq: 220, dur: 0.03, type: "square", gain: 0.04 },
  click: { freq: 330, dur: 0.05, type: "triangle", gain: 0.06 },
  success: { freq: 660, dur: 0.12, type: "sine", gain: 0.12, then: { freq: 990, delay: 0.1 } },
  levelup: { freq: 523, dur: 0.14, type: "sine", gain: 0.14, then: { freq: 784, delay: 0.12 } },
  alert: { freq: 180, dur: 0.25, type: "sawtooth", gain: 0.12 },
  error: { freq: 140, dur: 0.16, type: "sawtooth", gain: 0.1 },
};

/**
 * Nivel de tensión (0–1) a partir del calor (0–100). La UI puede usarlo para
 * subir un zumbido de fondo o teñir la pantalla cuando el calor aprieta.
 * Función pura.
 */
export function tensionLevel(heat: number): number {
  const h = Math.max(0, Math.min(100, heat));
  return Math.round((h / 100) * 100) / 100;
}

const STORAGE_KEY = "nande-sound-muted";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private supported: boolean;

  constructor() {
    this.muted = this.loadMuted();
    this.supported =
      typeof window !== "undefined" &&
      typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) !== "undefined";
  }

  private loadMuted(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(v: boolean): void {
    this.muted = v;
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* se puede jugar sin persistir */
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Crea (perezosamente) el contexto de audio. Requiere gesto del usuario. */
  private ensureCtx(): AudioContext | null {
    if (!this.supported || this.muted) return null;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      this.supported = false;
      return null;
    }
  }

  /** Reproduce un sonido con nombre. No-op si está silenciado o no hay audio. */
  play(name: SoundName): void {
    const tone = TONES[name];
    if (!tone) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      this.blip(ctx, tone.freq, tone.dur, tone.type, tone.gain, 0);
      if (tone.then) this.blip(ctx, tone.then.freq, tone.dur, tone.type, tone.gain, tone.then.delay);
    } catch {
      /* nunca romper por audio */
    }
  }

  private blip(
    ctx: AudioContext,
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    delay: number,
  ): void {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    // Envolvente rápida: ataque corto y caída, para que no "clickee".
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
}

/** Instancia única para toda la app. */
export const sound = new SoundEngine();
