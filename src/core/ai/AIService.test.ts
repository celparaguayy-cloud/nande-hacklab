import { beforeEach, describe, expect, it } from "vitest";
import { AIService } from "./AIService";
import { AISettings } from "./AISettings";
import { OfflineProvider } from "./OfflineProvider";
import { resetStorage } from "../../test/setup";

describe("IA opcional — offline por defecto, conectada con la clave del jugador", () => {
  beforeEach(() => {
    resetStorage();
  });

  it("por defecto está en modo offline (sin clave, sin red)", () => {
    const svc = new AIService(new AISettings());
    expect(svc.mode()).toBe("offline");
  });

  it("el OfflineProvider es determinista y responde sin red", async () => {
    const p = new OfflineProvider();
    const a = await p.generate([
      { role: "system", content: "Sos un tutor de hacking." },
      { role: "user", content: "¿cómo hago un SQLi en el login?" },
    ]);
    const b = await p.generate([
      { role: "system", content: "Sos un tutor de hacking." },
      { role: "user", content: "¿cómo hago un SQLi en el login?" },
    ]);
    expect(a.text).toBe(b.text); // determinista
    expect(a.model).toBe("nande-offline");
    expect(a.text.toLowerCase()).toContain("comilla");
  });

  it("poner una clave activa el modo conectado; borrarla vuelve a offline", () => {
    const settings = new AISettings();
    const svc = new AIService(settings);

    settings.setProvider("groq");
    expect(svc.mode()).toBe("offline"); // proveedor sí, pero sin clave todavía

    settings.setApiKey("gsk_ficticia_del_jugador");
    expect(svc.mode()).toBe("connected");
    expect(settings.get().model).toContain("llama");

    settings.reset();
    expect(svc.mode()).toBe("offline");
    expect(settings.get().apiKey).toBe("");
  });

  it("generate() responde aunque no haya clave (usa offline)", async () => {
    const svc = new AIService(new AISettings());
    const r = await svc.generate([{ role: "user", content: "hola" }]);
    expect(r.text.length).toBeGreaterThan(0);
    expect(r.model).toBe("nande-offline");
  });

  it("la config persiste en localStorage", () => {
    const s1 = new AISettings();
    s1.setProvider("gemini");
    s1.setApiKey("clave-del-jugador");
    const s2 = new AISettings();
    expect(s2.get().provider).toBe("gemini");
    expect(s2.isConnected()).toBe(true);
  });
});
