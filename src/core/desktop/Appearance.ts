import type { EventBus } from "../events/EventBus";

/**
 * Apariencia del escritorio de ÑANDE.
 *
 * Permite personalizar el fondo y el color de acento. Se guarda, así que
 * el escritorio recuerda cómo lo dejaste. Todo local.
 */

export interface WallpaperPreset {
  id: string;
  name: string;
  css: string;
}

export const WALLPAPERS: WallpaperPreset[] = [
  {
    id: "nande",
    name: "ÑANDE (por defecto)",
    css: "radial-gradient(circle at top right, #17212b 0%, #080b10 55%, #05070a 100%)",
  },
  {
    id: "matrix",
    name: "Matrix",
    css: "linear-gradient(160deg, #04120a 0%, #071b0f 50%, #020806 100%)",
  },
  {
    id: "cyber",
    name: "Cyber",
    css: "linear-gradient(160deg, #1a0b2e 0%, #0f1b3a 60%, #05070a 100%)",
  },
  {
    id: "sunset",
    name: "Atardecer",
    css: "linear-gradient(160deg, #2b1a1a 0%, #1b1220 60%, #05070a 100%)",
  },
  {
    id: "ocean",
    name: "Océano",
    css: "linear-gradient(160deg, #0a1f2b 0%, #08131b 60%, #05070a 100%)",
  },
];

export const ACCENTS = ["#7cc4ff", "#7ee2a8", "#ffd479", "#c084fc", "#ff8f8f"];

export interface AppearanceState {
  wallpaperId: string;
  accent: string;
}

const STORAGE_KEY = "nande-appearance";

export class Appearance {
  private state: AppearanceState;
  private events?: EventBus;

  constructor(events?: EventBus) {
    this.events = events;
    this.state = this.load() ?? { wallpaperId: "nande", accent: "#7cc4ff" };
  }

  private load(): AppearanceState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as AppearanceState;
      if (!saved || !saved.wallpaperId) return null;
      return saved;
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // El escritorio funciona igual sin guardar la apariencia.
    }
  }

  getState(): AppearanceState {
    return { ...this.state };
  }

  /** CSS del fondo elegido. */
  wallpaperCss(): string {
    const wp = WALLPAPERS.find((w) => w.id === this.state.wallpaperId);
    return wp?.css ?? WALLPAPERS[0].css;
  }

  get accent(): string {
    return this.state.accent;
  }

  setWallpaper(id: string): void {
    if (WALLPAPERS.some((w) => w.id === id)) {
      this.state.wallpaperId = id;
      this.save();
      this.events?.emit("appearance.changed", this.getState());
    }
  }

  setAccent(color: string): void {
    this.state.accent = color;
    this.save();
    this.events?.emit("appearance.changed", this.getState());
  }
}
