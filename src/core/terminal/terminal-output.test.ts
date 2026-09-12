import { describe, expect, it, beforeEach } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "./VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Regresión: la salida de la terminal debe traer saltos de línea REALES, no
 * el texto literal "\n". Un bug viejo escribía `\\n` (barra + barra + n) dentro
 * de plantillas, así que herramientas como `crack` o `jwt` mostraban todo en
 * una sola línea pegoteada — parecían "no funcionar". Este test lo blinda.
 */
describe("salida de la terminal: saltos de línea reales", () => {
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    term = new VirtualTerminal(new VirtualKernel());
  });

  it("crack rompe el hash y muestra varias líneas, sin literal \\n", () => {
    const out = term.execute("crack 5f4dcc3b5aa765d61d8327deb882cf99");
    expect(out).not.toContain("\\n");
    expect(out).toContain("\n");
    expect(out).toContain("Contraseña: password");
  });

  it("jwt sin argumentos muestra la ayuda en varias líneas, sin literal \\n", () => {
    const out = term.execute("jwt");
    expect(out).not.toContain("\\n");
    expect(out.split("\n").length).toBeGreaterThan(2);
  });

  it("printf convierte la secuencia \\n del usuario en un salto real", () => {
    const out = term.execute('printf "linea1\\nlinea2"');
    expect(out).toContain("linea1\nlinea2");
    expect(out).not.toContain("linea1\\nlinea2");
  });

  it("ninguna salida común deja el literal \\n a la vista", () => {
    for (const cmd of ["jwt decode", "crack noesunhash", "printf hola"]) {
      expect(term.execute(cmd)).not.toContain("\\n");
    }
  });
});
