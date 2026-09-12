import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { Crackme } from "./Crackme";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * NandeReverse — pruebas de REALIDAD. La desencriptación es matemática real:
 * la clave correcta revela la bandera porque el XOR se ejecuta de verdad, y
 * ninguna otra clave la produce. Anti-mock: fuerza bruta real sobre 256 claves.
 */
describe("Crackme — reversing con XOR real", () => {
  it("es determinista: misma semilla, misma bandera y mismo cifrado", () => {
    const a = new Crackme(7);
    const b = new Crackme(7);
    expect(b.flag).toBe(a.flag);
    expect(b.hexdump()).toBe(a.hexdump());
  });

  it("existe exactamente una clave que revela la bandera", () => {
    const cm = new Crackme(7);
    let solutions = 0;
    for (let k = 1; k <= 255; k += 1) {
      if (cm.isSolution(k)) solutions += 1;
    }
    expect(solutions).toBe(1);
  });

  it("la fuerza bruta encuentra la bandera real", () => {
    const cm = new Crackme(7);
    const hits = cm.bruteforce();
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.text === cm.flag)).toBe(true);
  });

  it("una clave incorrecta NO produce la bandera (no hay texto falso)", () => {
    const cm = new Crackme(7);
    // Buscar una clave incorrecta cualquiera.
    let wrong = 1;
    while (cm.isSolution(wrong)) wrong += 1;
    expect(cm.decrypt(wrong).text).not.toBe(cm.flag);
  });

  it("desde la terminal, 'reverse brute' captura la bandera", () => {
    resetStorage();
    seedRandom();
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    const out = term.execute("reverse brute");
    expect(out).toContain(kernel.crackme.flag);
    expect(kernel.player.capturedFlags()).toContain(kernel.crackme.flag);
  });
});
