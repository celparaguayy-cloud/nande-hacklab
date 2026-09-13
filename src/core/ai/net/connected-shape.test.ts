import { afterEach, describe, expect, it, vi } from "vitest";
import {
  toOpenAIBody,
  parseOpenAIText,
  toAnthropicBody,
  parseAnthropicText,
  toGeminiBody,
  parseGeminiText,
  OpenAICompatibleProvider,
  AnthropicProvider,
  GroqProvider,
} from "./ConnectedProviders";
import type { AIMessage } from "../AIProvider";

const MSGS: AIMessage[] = [
  { role: "system", content: "Sos Ñandú, tutor de hacking." },
  { role: "user", content: "hola" },
  { role: "assistant", content: "buenas" },
  { role: "user", content: "¿y ahora?" },
];

describe("mapeo de forma de mensaje (funciones puras, sin red)", () => {
  it("OpenAI: pasa messages tal cual y respeta el modelo", () => {
    const body = toOpenAIBody("gpt-4o-mini", MSGS, { maxTokens: 100 }) as Record<string, unknown>;
    expect(body.model).toBe("gpt-4o-mini");
    expect((body.messages as unknown[]).length).toBe(4);
    expect(body.max_tokens).toBe(100);
    expect(parseOpenAIText({ choices: [{ message: { content: "respuesta" } }] })).toBe("respuesta");
  });

  it("Anthropic: separa el system y arma turns user/assistant", () => {
    const body = toAnthropicBody("claude-3-5-haiku-latest", MSGS) as Record<string, unknown>;
    expect(body.model).toBe("claude-3-5-haiku-latest");
    expect(body.system).toContain("Ñandú");
    const turns = body.messages as { role: string }[];
    expect(turns.length).toBe(3); // los 3 no-system
    expect(turns[0].role).toBe("user");
    expect(turns[1].role).toBe("assistant");
    expect(parseAnthropicText({ content: [{ type: "text", text: "hola " }, { type: "text", text: "mundo" }] })).toBe("hola mundo");
  });

  it("Gemini: system va como systemInstruction y roles se mapean a model/user", () => {
    const body = toGeminiBody(MSGS) as Record<string, unknown>;
    expect(body.systemInstruction).toBeTruthy();
    const contents = body.contents as { role: string }[];
    expect(contents.length).toBe(3);
    expect(contents[1].role).toBe("model"); // el assistant
    expect(parseGeminiText({ candidates: [{ content: { parts: [{ text: "ok" }] } }] })).toBe("ok");
  });
});

describe("clientes conectados (fetch mockeado — nunca red real)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("OpenAICompatibleProvider llama a <base>/chat/completions con Bearer", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "hola desde el modelo" } }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const p = new OpenAICompatibleProvider("https://api.groq.com/openai/v1", "k-123", "llama-3.3-70b-versatile");
    const r = await p.generate([{ role: "user", content: "hola" }]);

    expect(r.text).toBe("hola desde el modelo");
    expect(r.model).toBe("llama-3.3-70b-versatile");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k-123");
  });

  it("normaliza la barra final de la base URL", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const p = new OpenAICompatibleProvider("http://localhost:11434/v1/", "", "llama3.2");
    await p.generate([{ role: "user", content: "x" }]);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("http://localhost:11434/v1/chat/completions");
    // Sin clave (endpoint local): no manda Authorization.
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("AnthropicProvider usa /messages con x-api-key y el header de navegador", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ content: [{ type: "text", text: "claude dice hola" }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const p = new AnthropicProvider("sk-ant-xyz", "claude-3-5-haiku-latest");
    const r = await p.generate([{ role: "user", content: "hola" }]);

    expect(r.text).toBe("claude dice hola");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const h = init.headers as Record<string, string>;
    expect(h["x-api-key"]).toBe("sk-ant-xyz");
    expect(h["anthropic-dangerous-direct-browser-access"]).toBe("true");
  });

  it("un HTTP no-2xx se convierte en Error con el código", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const p = new GroqProvider("k", "modelo-inexistente");
    await expect(p.generate([{ role: "user", content: "x" }])).rejects.toThrow(/404/);
  });
});
