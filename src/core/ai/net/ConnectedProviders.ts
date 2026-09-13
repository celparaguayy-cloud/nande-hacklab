import type {
  AIProvider,
  AIMessage,
  AIGenerateOptions,
  AIGenerateResult,
} from "../AIProvider";

/**
 * ============================================================================
 *  MODO CONECTADO — la ÚNICA parte del proyecto que hace red real.
 * ============================================================================
 *
 * Estos proveedores llaman a la API de IA con la clave del PROPIO jugador
 * (nunca una clave del proyecto; el repo es público). Es opt-in: sin clave, el
 * juego jamás llega acá y usa el OfflineProvider.
 *
 * Tres "formas" de API cubren todo el ecosistema:
 *   - OpenAICompatibleProvider → Chat Completions estilo OpenAI. Cubre OpenAI,
 *     Groq, OpenRouter, Mistral, DeepSeek, Together, xAI, Ollama/LM Studio
 *     local y cualquier endpoint compatible (base URL a medida).
 *   - GeminiProvider    → Google Gemini (generateContent).
 *   - AnthropicProvider → Anthropic Claude (/v1/messages).
 *
 * El test de aislamiento permite red SÓLO en esta carpeta (src/core/ai/net/).
 * Todo el resto del juego sigue 100% offline y determinista. La IA nunca toca
 * el host ni recibe datos que el jugador no haya puesto: se le manda texto y
 * devuelve texto.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const ANTHROPIC_VERSION = "2023-06-01";

/** Normaliza una URL base (sin barra final) para armar endpoints. */
function trimBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
//  Mapeos de forma de mensaje — funciones puras, testeables sin red.
// ---------------------------------------------------------------------------

/** Cuerpo para la API Chat Completions (OpenAI y compatibles). */
export function toOpenAIBody(
  model: string,
  messages: AIMessage[],
  options?: AIGenerateOptions,
): Record<string, unknown> {
  return {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 512,
  };
}

/** Extrae el texto de una respuesta Chat Completions. */
export function parseOpenAIText(data: unknown): string {
  const d = data as { choices?: { message?: { content?: string } }[] };
  return d.choices?.[0]?.message?.content ?? "";
}

/** Cuerpo para la API de Anthropic (/v1/messages): system va aparte. */
export function toAnthropicBody(
  model: string,
  messages: AIMessage[],
  options?: AIGenerateOptions,
): Record<string, unknown> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const turns = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));
  return {
    model,
    max_tokens: options?.maxTokens ?? 512,
    temperature: options?.temperature ?? 0.7,
    ...(system ? { system } : {}),
    messages: turns,
  };
}

/** Extrae el texto de una respuesta de Anthropic. */
export function parseAnthropicText(data: unknown): string {
  const d = data as { content?: { type?: string; text?: string }[] };
  return (d.content ?? [])
    .filter((b) => b.type === "text" || typeof b.text === "string")
    .map((b) => b.text ?? "")
    .join("");
}

/** Cuerpo para Gemini (generateContent): system como systemInstruction. */
export function toGeminiBody(
  messages: AIMessage[],
  options?: AIGenerateOptions,
): Record<string, unknown> {
  const system = messages.find((m) => m.role === "system")?.content;
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  return {
    contents,
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 512,
    },
  };
}

/** Extrae el texto de una respuesta de Gemini. */
export function parseGeminiText(data: unknown): string {
  const d = data as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return (
    d.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? ""
  );
}

// ---------------------------------------------------------------------------
//  Descubrimiento de modelos (evita 404 por adivinar nombres).
// ---------------------------------------------------------------------------

/**
 * Lista los modelos de Gemini que la clave del jugador realmente tiene y que
 * soportan generateContent. Sirve para NO adivinar un nombre de modelo que dé
 * 404: preguntamos a la API cuáles existen y elegimos uno que ande.
 */
export async function listGeminiModels(apiKey: string): Promise<string[]> {
  const res = await fetch(
    `${GEMINI_BASE}?key=${encodeURIComponent(apiKey)}&pageSize=200`,
  );
  if (!res.ok) throw new Error(`Gemini list: HTTP ${res.status}`);
  const data = (await res.json()) as {
    models?: { name?: string; supportedGenerationMethods?: string[] }[];
  };
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => (m.name ?? "").replace(/^models\//, ""))
    .filter(Boolean);
}

/**
 * Elige el mejor modelo de una lista: prioriza flash estables (rápidos y con
 * cuota gratis generosa), evitando previews/experimentales cuando hay opción.
 */
export function pickGeminiModel(models: string[]): string | null {
  if (models.length === 0) return null;
  const score = (m: string): number => {
    let s = 0;
    if (/flash/.test(m)) s += 10;
    if (/2\.5|2\.0/.test(m)) s += 5;
    if (/latest/.test(m)) s += 3;
    if (/exp|preview|thinking|vision|tts|image/.test(m)) s -= 8;
    if (/1\.5/.test(m)) s += 1;
    return s;
  };
  return [...models].sort((a, b) => score(b) - score(a))[0];
}

/**
 * Lista los modelos de un endpoint compatible con OpenAI (GET /models). No
 * todos lo exponen; si falla, devolvemos []. Sirve para sugerir/validar.
 */
export async function listOpenAIModels(
  baseUrl: string,
  apiKey: string,
): Promise<string[]> {
  const res = await fetch(`${trimBase(baseUrl)}/models`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  if (!res.ok) throw new Error(`models: HTTP ${res.status}`);
  const data = (await res.json()) as { data?: { id?: string }[] };
  return (data.data ?? []).map((m) => m.id ?? "").filter(Boolean);
}

// ---------------------------------------------------------------------------
//  Proveedores.
// ---------------------------------------------------------------------------

/**
 * Proveedor genérico para cualquier API compatible con OpenAI Chat Completions.
 * Un solo cliente cubre OpenAI, Groq, OpenRouter, Mistral, DeepSeek, Together,
 * xAI, Ollama/LM Studio local y endpoints a medida.
 */
export class OpenAICompatibleProvider implements AIProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private extraHeaders: Record<string, string>;

  constructor(
    baseUrl: string,
    apiKey: string,
    model: string,
    extraHeaders: Record<string, string> = {},
  ) {
    this.baseUrl = trimBase(baseUrl);
    this.apiKey = apiKey;
    this.model = model;
    this.extraHeaders = extraHeaders;
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerateOptions,
  ): Promise<AIGenerateResult> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.extraHeaders,
    };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(toOpenAIBody(this.model, messages, options)),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}${await errBody(res)}`);
    }
    return { text: parseOpenAIText(await res.json()), model: this.model };
  }
}

/**
 * Groq: compatible con OpenAI. Se mantiene como clase propia por compatibilidad,
 * delegando en el cliente genérico.
 */
export class GroqProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string, model: string) {
    super("https://api.groq.com/openai/v1", apiKey, model);
  }
}

export class AnthropicProvider implements AIProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(
    apiKey: string,
    model: string,
    baseUrl = "https://api.anthropic.com/v1",
  ) {
    this.baseUrl = trimBase(baseUrl);
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerateOptions,
  ): Promise<AIGenerateResult> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        // Anthropic bloquea el navegador por defecto; este header habilita el
        // acceso directo desde el cliente (la clave es del propio jugador).
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(toAnthropicBody(this.model, messages, options)),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}${await errBody(res)}`);
    }
    return { text: parseAnthropicText(await res.json()), model: this.model };
  }
}

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerateOptions,
  ): Promise<AIGenerateResult> {
    const url = `${GEMINI_BASE}/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toGeminiBody(messages, options)),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}${await errBody(res)}`);
    }
    return { text: parseGeminiText(await res.json()), model: this.model };
  }
}

/** Lee un poco del cuerpo de error para dar un mensaje accionable (best-effort). */
async function errBody(res: Response): Promise<string> {
  try {
    const t = (await res.text()).slice(0, 160).replace(/\s+/g, " ").trim();
    return t ? ` — ${t}` : "";
  } catch {
    return "";
  }
}
