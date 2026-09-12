import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "./VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("objetivo — modo 'te dan una IP y la vulnerás'", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("asigna un objetivo con IP y pista", () => {
    const out = term.execute("objetivo");
    expect(out).toContain("OBJETIVO ASIGNADO");
    expect(out).toContain("IP:");
    expect(out).toContain("Pista:");
  });

  it("al capturar la bandera del objetivo, avanza al siguiente", () => {
    const first = term.execute("objetivo");
    // El primer objetivo es el XSS del blog (10.10.7.11).
    expect(first).toContain("10.10.7.11");

    // Capturar su bandera vulnerando de verdad el lab de XSS.
    term.execute('curl "http://blog.yvoty.nande/buscar?q=<script>alert(1)</script>"');
    expect(kernel.player.capturedFlags()).toContain("ND{xss_reflejado}");

    // Ahora 'objetivo' ya no ofrece ese: pasa al siguiente.
    const next = term.execute("objetivo");
    expect(next).not.toContain("10.10.7.11");
    expect(next).toContain("OBJETIVO ASIGNADO");
  });

  it("objetivo lista muestra el progreso", () => {
    expect(term.execute("objetivo lista")).toContain("vulnerados");
  });
});
