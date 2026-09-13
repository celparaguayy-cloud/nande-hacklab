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
 * Estos proveedores llaman a la API de Groq o Gemini con la clave del PROPIO
 * jugador (nunca una clave del proyecto; el repo es público). Es opt-in: sin
 * clave, el juego jamás llega acá y usa el OfflineProvider.
 *
 * El test de aislamiento permite red SÓLO en esta carpeta (src/core/ai/net/).
 * Todo el resto del juego sigue 100% offline y determinista. La IA nunca toca
 * el host ni recibe datos que el jugador no haya puesto: se le manda texto y
 * devuelve texto.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

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

export class GroqProvider implements AIProvider {
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
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 512,
      }),
    });

    if (!res.ok) {
      throw new Error(`Groq: HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      model: this.model,
    };
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
    const system = messages.find((m) => m.role === "system")?.content;
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const url = `${GEMINI_BASE}/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          maxOutputTokens: options?.maxTokens ?? 512,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini: HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { text, model: this.model };
  }
}
