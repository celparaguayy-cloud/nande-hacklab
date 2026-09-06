import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("home inicial", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("ls en el home no viene vacío", () => {
    const t = new VirtualTerminal(new VirtualKernel());

    expect(t.getCurrentDirectory()).toBe("/home/student");
    expect(t.execute("ls").trim()).not.toBe("");
  });

  it("la bienvenida se puede leer y explica cómo arrancar", () => {
    const t = new VirtualTerminal(new VirtualKernel());
    const out = t.execute("cat bienvenida.txt");

    expect(out).toContain("ÑANDE OS");
    expect(out).toContain("learn");
  });

  it("los primeros pasos están en documentos/", () => {
    const t = new VirtualTerminal(new VirtualKernel());

    expect(t.execute("ls documentos")).toContain("primeros-pasos.md");
  });
});
