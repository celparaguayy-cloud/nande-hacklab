import type {
  AIProvider,
  AIMessage,
  AIGenerateOptions,
  AIGenerateResult,
} from "./AIProvider";
import { OfflineProvider } from "./OfflineProvider";
import { AISettings } from "./AISettings";

/**
 * AIService — la fachada de IA del juego. Decide qué proveedor usar:
 *
 *   - Sin clave (por defecto)  → OfflineProvider (determinista, sin red).
 *   - Con clave del jugador    → Groq o Gemini (modo conectado), cargados de
 *                                forma perezosa desde src/core/ai/net/.
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
      return { ok: false, message: "Sin clave: estás en modo offline. Pegá tu clave de Groq o Gemini." };
    }
    const connected = await this.connectedProvider().catch(
      (e) => { this.lastError = errText(e); return null; },
    );
    if (!connected) return { ok: false, message: `No se pudo cargar el proveedor: ${this.lastError ?? "?"}` };
    try {
      const r = await connected.generate(
        [{ role: "user", content: "Respondé sólo con: OK" }],
        { maxTokens: 8 },
      );
      this.lastError = null;
      return { ok: true, message: `Conexión OK (${this.settings.get().model}). Respuesta: ${r.text.slice(0, 40) || "(vacía)"}` };
    } catch (e) {
      this.lastError = errText(e);
      return { ok: false, message: diagnose(this.lastError, this.settings.get().provider) };
    }
  }

  config() {
    return this.settings.get();
  }

  getSettings(): AISettings {
    return this.settings;
  }

  /** "conectado" si hay proveedor externo + clave; si no, "offline". */
  mode(): "offline" | "connected" {
    return this.settings.isConnected() ? "connected" : "offline";
  }

  /** Carga perezosa del proveedor conectado (aísla la red en ai/net). */
  private async connectedProvider(): Promise<AIProvider | null> {
    const cfg = this.settings.get();
    if (!this.settings.isConnected()) return null;
    const mod = await import("./net/ConnectedProviders");
    if (cfg.provider === "groq") return new mod.GroqProvider(cfg.apiKey, cfg.model);
    if (cfg.provider === "gemini") return new mod.GeminiProvider(cfg.apiKey, cfg.model);
    return null;
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerateOptions,
  ): Promise<AIGenerateResult> {
    const connected = await this.connectedProvider().catch(
      (e) => { this.lastError = errText(e); return null; },
    );
    if (connected) {
      try {
        const r = await connected.generate(messages, options);
        if (r.text.trim()) { this.lastError = null; return r; }
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

/** Traduce un error crudo a algo accionable para el jugador. */
function diagnose(err: string, provider: string): string {
  const e = err.toLowerCase();
  if (e.includes("401") || e.includes("403") || e.includes("api key") || e.includes("unauthorized")) {
    return `Clave inválida o sin permisos (${err}). Revisá tu clave de ${provider}.`;
  }
  if (e.includes("404") || e.includes("not found") || e.includes("model")) {
    return `Modelo no encontrado (${err}). Probá otro modelo en Configuración.`;
  }
  if (e.includes("429")) return `Límite de uso alcanzado (${err}). Esperá un rato.`;
  if (e.includes("failed to fetch") || e.includes("networkerror") || e.includes("cors")) {
    return provider === "groq"
      ? "No se pudo conectar (posible CORS): Groq a veces bloquea el navegador. Probá Gemini, que sí anda desde el celu."
      : "No se pudo conectar (red/CORS). Revisá tu internet y la clave.";
  }
  return `Falló la conexión: ${err}`;
}
