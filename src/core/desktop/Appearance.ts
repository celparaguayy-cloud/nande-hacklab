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
  {
    id: "aurora",
    name: "Aurora",
    css: "radial-gradient(1200px 600px at 20% -10%, #0e3b3b 0%, transparent 60%), radial-gradient(1000px 500px at 90% 10%, #2a1150 0%, transparent 55%), linear-gradient(160deg, #06121a 0%, #05070a 100%)",
  },
  {
    id: "guarani",
    name: "Guaraní",
    css: "radial-gradient(900px 500px at 80% 0%, #123a1a 0%, transparent 55%), linear-gradient(160deg, #0c1a10 0%, #0a1408 60%, #05070a 100%)",
  },
  {
    id: "synthwave",
    name: "Synthwave",
    css: "linear-gradient(180deg, #241035 0%, #3a1150 40%, #7a1f5a 72%, #ff7a59 100%)",
  },
  {
    id: "carbon",
    name: "Carbón",
    css: "repeating-linear-gradient(45deg, #0d0f12 0px, #0d0f12 8px, #0f1216 8px, #0f1216 16px)",
  },
  {
    id: "asuncion",
    name: "Asunción noche",
    css: "linear-gradient(180deg, #0a1526 0%, #12233f 45%, #21324d 78%, #3a2a1a 100%)",
  },
  {
    id: "terminal",
    name: "Fósforo",
    css: "radial-gradient(circle at 50% 120%, #06240f 0%, #04140a 45%, #020806 100%)",
  },
  {
    id: "rosa",
    name: "Amanecer",
    css: "linear-gradient(160deg, #2a1526 0%, #3a1b30 45%, #b5546a 100%)",
  },
];

export const ACCENTS = [
  "#7cc4ff",
  "#7ee2a8",
  "#ffd479",
  "#c084fc",
  "#ff8f8f",
  "#f472b6",
  "#34d399",
  "#fb923c",
  "#60a5fa",
  "#a3e635",
];

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
