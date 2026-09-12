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

  constructor(settings: AISettings = new AISettings()) {
    this.settings = settings;
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
    const connected = await this.connectedProvider().catch(() => null);
    if (connected) {
      try {
        const r = await connected.generate(messages, options);
        if (r.text.trim()) return r;
      } catch {
        // Cae al offline: la IA nunca rompe el juego.
      }
    }
    return this.offline.generate(messages, options);
  }
}
