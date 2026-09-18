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

  it("desde la terminal, 'reverse run' con el serial correcto captura la bandera", () => {
    resetStorage();
    seedRandom();
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);
    const cm = kernel.crackme;

    // El serial sale de leer el desensamblado: la constante del CMP.
    const dis = term.execute("reverse disasm");
    const m = dis.match(/CMP R1, 0x([0-9a-f]{2})/);
    expect(m).not.toBeNull();
    const serial = String.fromCharCode(parseInt(m![1], 16));

    const out = term.execute(`reverse run ${serial}`);
    expect(out).toContain(cm.flag);
    expect(kernel.player.capturedFlags()).toContain(cm.flag);
  });

  it("desde la terminal, parchear cambia el desensamblado y la ejecución", () => {
    resetStorage();
    seedRandom();
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    expect(term.execute("reverse run cualquiera")).toContain("ACCESO DENEGADO");
    const jnzAddr = kernel.crackme.listing().find((i) => i.text.startsWith("JNZ"))!.addr;
    term.execute(`reverse patch 0x${jnzAddr.toString(16)} 0x41`);
    expect(term.execute("reverse disasm")).toContain("PARCHEADO");
    expect(term.execute("reverse run cualquiera")).not.toContain("ACCESO DENEGADO");

    term.execute("reverse restore");
    expect(term.execute("reverse run cualquiera")).toContain("ACCESO DENEGADO");
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
