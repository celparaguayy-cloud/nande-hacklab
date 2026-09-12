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
