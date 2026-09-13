import type {
  AIProvider,
  AIMessage,
  AIGenerateOptions,
  AIGenerateResult,
} from "./AIProvider";
import { OfflineProvider } from "./OfflineProvider";
import { AISettings } from "./AISettings";
import { presetFor, type ProviderPreset } from "./providers";

/**
 * AIService — la fachada de IA del juego. Decide qué proveedor usar:
 *
 *   - Sin clave (por defecto)  → OfflineProvider (determinista, sin red).
 *   - Con proveedor + clave    → OpenAI/Anthropic/Gemini/OpenRouter/… (modo
 *                                conectado), cargados de forma perezosa desde
 *                                src/core/ai/net/ para aislar la red.
 *
 * Si el modo conectado falla (sin red, clave inválida, CORS), cae al offline:
 * el juego nunca se rompe por la IA. Ese fallback es la garantía de que ÑANDE
 * siempre es jugable, con o sin internet.
 */
export class AIService {
  private settings: AISettings;
  private offline = new OfflineProvider();
  /** Último error del modo conectado (para mostrarle al jugador por qué falló). */
  private lastError: string | null = null;

  constructor(settings: AISettings = new AISettings()) {
    this.settings = settings;
  }

  /** Motivo del último fallo del modo conectado (o null si anduvo/está offline). */
  getLastError(): string | null {
    return this.lastError;
  }

  /**
   * Prueba la conexión con el proveedor del jugador: manda un "ping" real y
   * devuelve si funcionó y por qué no (clave inválida, modelo, CORS, red).
   */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.settings.isConnected()) {
      return {
        ok: false,
        message:
          "Sin configurar: estás en modo offline. Elegí un proveedor y pegá tu clave (o una URL base para un endpoint local).",
      };
    }
    const cfg = this.settings.get();
    const preset = presetFor(cfg.provider);
    const connected = await this.connectedProvider().catch((e) => {
      this.lastError = errText(e);
      return null;
    });
    if (!connected)
      return {
        ok: false,
        message: `No se pudo cargar el proveedor: ${this.lastError ?? "?"}`,
      };
    const ping = async (p: AIProvider) =>
      (
        await p.generate([{ role: "user", content: "Respondé sólo con: OK" }], {
          maxTokens: 8,
        })
      ).text;
    try {
      const text = await ping(connected);
      this.lastError = null;
      return {
        ok: true,
        message: `Conexión OK (${preset.label} · ${cfg.model}). Respuesta: ${text.slice(0, 40) || "(vacía)"}`,
      };
    } catch (e) {
      this.lastError = errText(e);
      // Auto-recuperación de modelo si dio 404 (nombre inválido para la clave).
      if (/404|not found|model|does not exist|no such model/i.test(this.lastError)) {
        const fixed = await this.autoFixModel(preset, cfg).catch(() => null);
        if (fixed && fixed !== cfg.model) {
          this.settings.setModel(fixed);
          const retry = await this.connectedProvider().catch(() => null);
          if (retry) {
            try {
              const text = await ping(retry);
              this.lastError = null;
              return {
                ok: true,
                message: `Conexión OK. Ajusté el modelo a "${fixed}" (el anterior no existía). Respuesta: ${text.slice(0, 30)}`,
              };
            } catch (e2) {
              this.lastError = errText(e2);
            }
          }
        }
      }
      return { ok: false, message: diagnose(this.lastError, preset) };
    }
  }

  /** Descubre un modelo válido para la clave/endpoint (o null). */
  private async autoFixModel(
    preset: ProviderPreset,
    cfg: { apiKey: string; baseUrl: string },
  ): Promise<string | null> {
    const mod = await import("./net/ConnectedProviders");
    if (preset.kind === "gemini") {
      const models = await mod.listGeminiModels(cfg.apiKey);
      return mod.pickGeminiModel(models);
    }
    if (preset.kind === "openai") {
      const base = cfg.baseUrl || preset.baseUrl || "";
      if (!base) return null;
      const models = await mod.listOpenAIModels(base, cfg.apiKey);
      return models[0] ?? null;
    }
    return null;
  }

  config() {
    return this.settings.get();
  }

  getSettings(): AISettings {
    return this.settings;
  }

  /** "conectado" si hay proveedor externo configurado; si no, "offline". */
  mode(): "offline" | "connected" {
    return this.settings.isConnected() ? "connected" : "offline";
  }

  /** El preset del proveedor actual (para la UI). */
  preset(): ProviderPreset {
    return presetFor(this.settings.get().provider);
  }

  /** Carga perezosa del proveedor conectado (aísla la red en ai/net). */
  private async connectedProvider(): Promise<AIProvider | null> {
    const cfg = this.settings.get();
    if (!this.settings.isConnected()) return null;
    const preset = presetFor(cfg.provider);
    const mod = await import("./net/ConnectedProviders");
    if (preset.kind === "gemini") {
      return new mod.GeminiProvider(cfg.apiKey, cfg.model);
    }
    if (preset.kind === "anthropic") {
      return new mod.AnthropicProvider(
        cfg.apiKey,
        cfg.model,
        cfg.baseUrl || preset.baseUrl,
      );
    }
    if (preset.kind === "openai") {
      const base = cfg.baseUrl || preset.baseUrl || "";
      if (!base) return null;
      // OpenRouter recomienda identificar la app; es opcional y no expone datos.
      const extra: Record<string, string> =
        preset.id === "openrouter"
          ? { "HTTP-Referer": "https://nande-hacklab.local", "X-Title": "ÑANDE Hacklab" }
          : {};
      return new mod.OpenAICompatibleProvider(base, cfg.apiKey, cfg.model, extra);
    }
    return null;
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerateOptions,
  ): Promise<AIGenerateResult> {
    const connected = await this.connectedProvider().catch((e) => {
      this.lastError = errText(e);
      return null;
    });
    if (connected) {
      try {
        const r = await connected.generate(messages, options);
        if (r.text.trim()) {
          this.lastError = null;
          return r;
        }
        this.lastError = "El modelo devolvió una respuesta vacía.";
      } catch (e) {
        // Guardamos el motivo para poder mostrarlo; caemos al offline para que
        // el juego nunca se rompa por la IA.
        this.lastError = errText(e);
      }
    }
    return this.offline.generate(messages, options);
  }
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Traduce un error crudo a algo accionable para el jugador, según el proveedor. */
function diagnose(err: string, preset: ProviderPreset): string {
  const e = err.toLowerCase();
  if (e.includes("401") || e.includes("403") || e.includes("api key") || e.includes("unauthorized") || e.includes("permission")) {
    return `Clave inválida o sin permisos (${err}). Revisá tu clave de ${preset.label}${preset.keyUrl ? ` (${preset.keyUrl})` : ""}.`;
  }
  if (e.includes("404") || e.includes("not found") || e.includes("model") || e.includes("does not exist")) {
    return `Modelo no encontrado (${err}). Probá otro modelo en Configuración${preset.suggestedModels?.length ? `, ej. ${preset.suggestedModels[0]}` : ""}.`;
  }
  if (e.includes("429") || e.includes("rate")) return `Límite de uso alcanzado (${err}). Esperá un rato o revisá tu cuota en ${preset.label}.`;
  if (e.includes("failed to fetch") || e.includes("networkerror") || e.includes("cors") || e.includes("load failed")) {
    if (preset.browserOk === false) {
      return `No se pudo conectar: ${preset.label} bloquea el navegador (CORS). Es esperable. Alternativas que SÍ andan desde el navegador: Gemini, OpenRouter (una clave llega a todos los modelos) o Anthropic. O corré ÑANDE con un proxy/escritorio.`;
    }
    return `No se pudo conectar (red/CORS): ${err}. Revisá tu internet${preset.customBaseUrl ? " y que la URL base + CORS del endpoint local estén bien (Ollama: OLLAMA_ORIGINS=*)" : " y la clave"}.`;
  }
  return `Falló la conexión con ${preset.label}: ${err}`;
}
