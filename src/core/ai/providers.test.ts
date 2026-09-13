import { beforeEach, describe, expect, it } from "vitest";
import {
  ALL_PRESETS,
  CONNECTED_PRESETS,
  OFFLINE_PRESET,
  presetFor,
  isKnownProvider,
} from "./providers";
import { AISettings } from "./AISettings";
import { AIService } from "./AIService";
import { resetStorage } from "../../test/setup";

describe("catálogo de proveedores de IA", () => {
  it("incluye a los grandes: OpenAI, Anthropic, Gemini, OpenRouter, Groq, local", () => {
    const ids = CONNECTED_PRESETS.map((p) => p.id);
    for (const id of ["openai", "anthropic", "gemini", "openrouter", "groq", "ollama", "custom"]) {
      expect(ids).toContain(id);
    }
  });

  it("cada preset conectado declara forma de API y modelo por defecto", () => {
    for (const p of CONNECTED_PRESETS) {
      expect(["openai", "gemini", "anthropic"]).toContain(p.kind);
      // custom deja el modelo/base en blanco a propósito (los pone el jugador).
      if (p.id !== "custom") {
        expect(p.defaultModel.length).toBeGreaterThan(0);
        if (p.kind !== "gemini") expect(p.baseUrl && p.baseUrl.length > 0).toBe(true);
      }
    }
  });

  it("hay al menos tres proveedores que andan desde el navegador", () => {
    const browserOk = CONNECTED_PRESETS.filter((p) => p.browserOk);
    expect(browserOk.length).toBeGreaterThanOrEqual(3);
    expect(browserOk.map((p) => p.id)).toContain("gemini");
    expect(browserOk.map((p) => p.id)).toContain("openrouter");
  });

  it("presetFor devuelve offline ante un id desconocido", () => {
    expect(presetFor("no-existe").id).toBe("offline");
    expect(presetFor("openai").id).toBe("openai");
    expect(isKnownProvider("anthropic")).toBe(true);
    expect(isKnownProvider("inventado")).toBe(false);
  });

  it("offline no necesita clave y siempre anda", () => {
    expect(OFFLINE_PRESET.noKey).toBe(true);
    expect(ALL_PRESETS[0].id).toBe("offline");
  });
});

describe("AISettings — multi-proveedor", () => {
  beforeEach(() => resetStorage());

  it("elegir OpenAI adopta su modelo y base por defecto", () => {
    const s = new AISettings();
    s.setProvider("openai");
    const c = s.get();
    expect(c.provider).toBe("openai");
    expect(c.model).toBe("gpt-4o-mini");
    expect(c.baseUrl).toContain("api.openai.com");
  });

  it("Anthropic queda conectado con una clave", () => {
    const s = new AISettings();
    const svc = new AIService(s);
    s.setProvider("anthropic");
    expect(svc.mode()).toBe("offline"); // sin clave todavía
    s.setApiKey("sk-ant-ficticia");
    expect(svc.mode()).toBe("connected");
    expect(svc.preset().kind).toBe("anthropic");
  });

  it("un endpoint local (Ollama) queda conectado sin clave pero con base URL", () => {
    const s = new AISettings();
    const svc = new AIService(s);
    s.setProvider("ollama");
    // Ollama trae una base por defecto, así que ya queda conectado sin clave.
    expect(svc.mode()).toBe("connected");
    s.setBaseUrl("");
    expect(svc.mode()).toBe("offline"); // sin base URL, no hay a dónde ir
  });

  it("un endpoint a medida necesita base URL", () => {
    const s = new AISettings();
    const svc = new AIService(s);
    s.setProvider("custom");
    s.setApiKey("clave");
    expect(svc.mode()).toBe("offline"); // falta la base URL
    s.setBaseUrl("https://mi-proxy.local/v1");
    expect(svc.mode()).toBe("connected");
  });

  it("la config multi-proveedor persiste (proveedor, modelo y base)", () => {
    const s1 = new AISettings();
    s1.setProvider("openrouter");
    s1.setApiKey("or-ficticia");
    s1.setModel("anthropic/claude-3.5-haiku");
    const s2 = new AISettings();
    expect(s2.get().provider).toBe("openrouter");
    expect(s2.get().model).toBe("anthropic/claude-3.5-haiku");
    expect(s2.get().baseUrl).toContain("openrouter.ai");
  });
});
