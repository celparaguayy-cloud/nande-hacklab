import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "./VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("guia — inicio guiado", () => {
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    term = new VirtualTerminal(new VirtualKernel());
  });

  it("guia explica los primeros pasos y menciona Misión y Learn", () => {
    const out = term.execute("guia");
    expect(out).toContain("EMPEZAR");
    expect(out).toContain("Misión");
    expect(out).toContain("Learn");
    expect(out).toContain("nmap server.nande");
  });

  it("empezar y start son alias de guia", () => {
    expect(term.execute("empezar")).toContain("EMPEZAR");
    expect(term.execute("start")).toContain("EMPEZAR");
  });

  it("help menciona la guía", () => {
    expect(term.execute("help")).toContain("guia");
  });
});
