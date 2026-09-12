/**
 * AISettings — configuración de IA del jugador, guardada SOLO en su navegador.
 *
 * Regla dura: la clave de API NUNCA está en el código (el repo es público).
 * Es del propio jugador y vive en localStorage de su dispositivo. Por defecto
 * el juego está en modo OFFLINE (sin clave, sin red). Si el jugador pega su
 * clave de Groq o Gemini, se habilita el "modo conectado".
 */

export type AIProviderName = "offline" | "groq" | "gemini";

export interface AIConfig {
  provider: AIProviderName;
  apiKey: string;
  model: string;
}

const STORAGE_KEY = "nande-ai-config";

const DEFAULTS: Record<AIProviderName, string> = {
  offline: "nande-offline",
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-1.5-flash",
};

export class AISettings {
  private config: AIConfig;

  constructor() {
    this.config = this.load();
  }

  private load(): AIConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const c = JSON.parse(raw) as Partial<AIConfig>;
        const provider: AIProviderName =
          c.provider === "groq" || c.provider === "gemini" ? c.provider : "offline";
        return {
          provider,
          apiKey: typeof c.apiKey === "string" ? c.apiKey : "",
          model: typeof c.model === "string" && c.model ? c.model : DEFAULTS[provider],
        };
      }
    } catch {
      /* sin storage: quedamos offline */
    }
    return { provider: "offline", apiKey: "", model: DEFAULTS.offline };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      /* sin persistencia */
    }
  }

  get(): AIConfig {
    return { ...this.config };
  }

  /** ¿Hay modo conectado usable? Necesita proveedor externo + clave. */
  isConnected(): boolean {
    return this.config.provider !== "offline" && this.config.apiKey.trim().length > 0;
  }

  setProvider(provider: AIProviderName): void {
    this.config.provider = provider;
    if (!this.config.model || this.config.model === "nande-offline" || provider === "offline") {
      this.config.model = DEFAULTS[provider];
    }
    this.save();
  }

  setApiKey(key: string): void {
    this.config.apiKey = key.trim();
    this.save();
  }

  setModel(model: string): void {
    this.config.model = model.trim() || DEFAULTS[this.config.provider];
    this.save();
  }

  /** Borra la clave y vuelve a modo offline. */
  reset(): void {
    this.config = { provider: "offline", apiKey: "", model: DEFAULTS.offline };
    this.save();
  }
}
