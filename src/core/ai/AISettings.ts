import { presetFor, isKnownProvider, OFFLINE_PRESET } from "./providers";

/**
 * AISettings — configuración de IA del jugador, guardada SOLO en su navegador.
 *
 * Regla dura: la clave de API NUNCA está en el código (el repo es público).
 * Es del propio jugador y vive en localStorage de su dispositivo. Por defecto
 * el juego está en modo OFFLINE (sin clave, sin red). Si el jugador elige un
 * proveedor y pega su clave, se habilita el "modo conectado".
 *
 * El proveedor es cualquiera del catálogo (providers.ts): OpenAI, Anthropic,
 * OpenRouter, Gemini, Groq, Mistral, DeepSeek, xAI, Together, Ollama local o un
 * endpoint a medida compatible con OpenAI.
 */

/** El id del proveedor es libre (viene del catálogo); "offline" es el especial. */
export type AIProviderName = string;

export interface AIConfig {
  provider: AIProviderName;
  apiKey: string;
  model: string;
  /** URL base para proveedores a medida / locales (Ollama, proxy propio). */
  baseUrl: string;
}

const STORAGE_KEY = "nande-ai-config";

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
        const provider =
          typeof c.provider === "string" && isKnownProvider(c.provider)
            ? c.provider
            : "offline";
        const preset = presetFor(provider);
        return {
          provider,
          apiKey: typeof c.apiKey === "string" ? c.apiKey : "",
          model:
            typeof c.model === "string" && c.model
              ? c.model
              : preset.defaultModel,
          baseUrl:
            typeof c.baseUrl === "string" && c.baseUrl
              ? c.baseUrl
              : preset.baseUrl ?? "",
        };
      }
    } catch {
      /* sin storage: quedamos offline */
    }
    return {
      provider: "offline",
      apiKey: "",
      model: OFFLINE_PRESET.defaultModel,
      baseUrl: "",
    };
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

  /**
   * ¿Hay modo conectado usable? Necesita proveedor externo y, salvo los
   * locales sin clave (Ollama/LM Studio), una clave. Los custom/locales
   * necesitan además una URL base.
   */
  isConnected(): boolean {
    if (this.config.provider === "offline") return false;
    const preset = presetFor(this.config.provider);
    const hasKey = this.config.apiKey.trim().length > 0;
    const hasBase =
      !preset.customBaseUrl || this.config.baseUrl.trim().length > 0;
    return (preset.noKey || hasKey) && hasBase;
  }

  setProvider(provider: AIProviderName): void {
    const preset = presetFor(provider);
    this.config.provider = preset.id;
    // Al cambiar de proveedor, adoptamos su modelo y base por defecto (a menos
    // que sea un endpoint a medida, donde el jugador escribe la base).
    this.config.model = preset.defaultModel;
    this.config.baseUrl = preset.baseUrl ?? "";
    this.save();
  }

  setApiKey(key: string): void {
    this.config.apiKey = key.trim();
    this.save();
  }

  setModel(model: string): void {
    const preset = presetFor(this.config.provider);
    this.config.model = model.trim() || preset.defaultModel;
    this.save();
  }

  setBaseUrl(baseUrl: string): void {
    this.config.baseUrl = baseUrl.trim();
    this.save();
  }

  /** Borra la clave y vuelve a modo offline. */
  reset(): void {
    this.config = {
      provider: "offline",
      apiKey: "",
      model: OFFLINE_PRESET.defaultModel,
      baseUrl: "",
    };
    this.save();
  }
}
