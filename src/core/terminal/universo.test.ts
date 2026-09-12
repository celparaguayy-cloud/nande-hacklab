import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "./VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * El índice del universo 5.0 refleja el ESTADO real, no un texto fijo: si
 * comprometés el dominio, el índice lo dice. Anti-mock ligero de
 * discoverabilidad.
 */
describe("comando 'universo' — índice vivo del 5.0", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("lista las herramientas nuevas con sus comandos", () => {
    const out = term.execute("universo");
    for (const cmd of ["sniff", "nandeblood", "mitre", "redteam", "reto", "opsec"]) {
      expect(out).toContain(cmd);
    }
  });

  it("refleja el estado real: el dominio comprometido aparece como tal", () => {
    expect(term.execute("universo")).toContain("en pie");
    // Escalada completa → el índice cambia.
    term.execute("abuse MESA-AYUDA@NANDE.LOCAL LORE.MARTINEZ@NANDE.LOCAL");
    term.execute("abuse LORE.MARTINEZ@NANDE.LOCAL SVC-SQL@NANDE.LOCAL");
    term.execute("abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL");
    term.execute("abuse DB01@NANDE.LOCAL ADMIN-SQL@NANDE.LOCAL");
    expect(term.execute("universo")).toContain("COMPROMETIDO");
  });
});
