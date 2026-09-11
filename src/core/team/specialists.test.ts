import { describe, expect, it } from "vitest";
import { adviceFrom, consult, domainOf, SPECIALISTS } from "./Specialists";

describe("bots especialistas", () => {
  it("cada tema cae en el dominio correcto", () => {
    expect(domainOf("crackear un hash md5")).toBe("cripto");
    expect(domainOf("leer los logs del incidente")).toBe("forense");
    expect(domainOf("pivoting por la red interna")).toBe("redes");
    expect(domainOf("escalar con SUID en linux")).toBe("linux");
  });

  it("el experto responde con confianza; otro deriva", () => {
    // Cipher es de cripto: alta confianza en un tema de hash.
    const cipher = adviceFrom("cipher", "crackear un hash")!;
    expect(cipher.confidence).toBeGreaterThan(70);
    expect(cipher.defersTo).toBeUndefined();
    // Root (linux) ante un tema de cripto: baja confianza y deriva.
    const root = adviceFrom("root", "crackear un hash")!;
    expect(root.confidence).toBeLessThan(70);
    expect(root.defersTo).toBe("Cipher");
  });

  it("consult da experto + segunda opinión (distintos)", () => {
    const c = consult("analizar los logs del SIEM");
    expect(c.experto.specialist.id).toBe("trace");
    expect(c.segundaOpinion.specialist.id).not.toBe("trace");
    expect(SPECIALISTS.length).toBe(6);
  });
});
