import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "./VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("man — manual de comandos en la terminal", () => {
  let term: VirtualTerminal;
  let kernel: VirtualKernel;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("'man' sin argumento lista los manuales disponibles", () => {
    const out = term.execute("man");
    expect(out).toContain("Manuales disponibles");
    expect(out).toContain("nmap");
    expect(out).toContain("ls");
  });

  it("'man nmap' explica el comando con uso y ejemplos", () => {
    const out = term.execute("man nmap");
    expect(out).toContain("NOMBRE");
    expect(out).toContain("USO");
    expect(out).toContain("EJEMPLOS");
    expect(out.toLowerCase()).toContain("puerto");
  });

  it("'man' de un comando inexistente avisa, no inventa", () => {
    const out = term.execute("man noexiste");
    expect(out.toLowerCase()).toContain("no hay manual");
  });

  it("'help' menciona man para que se descubra", () => {
    expect(term.execute("help")).toContain("man <comando>");
  });
});
