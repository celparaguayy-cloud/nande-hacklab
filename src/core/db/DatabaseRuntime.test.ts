import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("DatabaseRuntime — SQL real consultable", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("db-list muestra la base de práctica", () => {
    expect(term.execute("db-list")).toContain("padron");
  });

  it("db-query ejecuta SQL de verdad (no un mock)", () => {
    // Filtro numérico (evita acentos en el literal SQL).
    const out = term.execute("db-query padron SELECT nombre FROM personas WHERE edad > 45");
    expect(out).toContain("Duarte"); // Porã Duarte, 52
    expect(out).not.toContain("Kamba"); // 29, quedó filtrado
    expect(out).toContain("1 fila");
  });

  it("consultar una tabla inexistente devuelve error del motor", () => {
    const out = term.execute("db-query padron SELECT * FROM noexiste");
    expect(out.toLowerCase()).toContain("tabla");
  });
});
