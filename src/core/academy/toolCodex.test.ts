import { beforeEach, describe, expect, it } from "vitest";
import { TOOL_CODEX, findTool, explainTool } from "./toolCodex";
import { Assistant } from "../ai/Assistant";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Códice de herramientas OSS reales", () => {
  it("tiene un catálogo amplio, sin ids repetidos y bien formado", () => {
    expect(TOOL_CODEX.length).toBeGreaterThanOrEqual(15);
    const ids = TOOL_CODEX.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TOOL_CODEX) {
      expect(t.name.length).toBeGreaterThan(1);
      expect(t.what.length).toBeGreaterThan(20);
      expect(t.realExample.length).toBeGreaterThan(3);
      expect(t.nande.length).toBeGreaterThan(2);
    }
  });

  it("findTool encuentra por id y por nombre", () => {
    expect(findTool("sqlmap")?.id).toBe("sqlmap");
    expect(findTool("SQLMap")?.id).toBe("sqlmap");
    expect(findTool("wireshark")?.name).toBe("Wireshark");
    expect(findTool("noexiste")).toBeNull();
  });

  it("explainTool incluye lo real y el equivalente ÑANDE", () => {
    const t = findTool("nmap")!;
    const out = explainTool(t);
    expect(out).toContain("Nmap");
    expect(out).toContain("En la vida real");
    expect(out).toContain("En ÑANDE");
  });
});

describe("Ñandú explica herramientas reales y ofrece probarlas", () => {
  let kernel: VirtualKernel;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("'¿qué es sqlmap?' → explicación real + demo ejecutable en ÑANDE", () => {
    const a = new Assistant(kernel);
    const r = a.respond("¿qué es sqlmap?");
    expect(r.text.toLowerCase()).toContain("inyección sql");
    expect(r.action?.command).toContain("sqlmap");
  });

  it("'¿cómo uso wireshark?' → apunta a sniff (NandeShark)", () => {
    const a = new Assistant(kernel);
    const r = a.respond("¿cómo uso wireshark?");
    expect(r.text).toContain("Wireshark");
    expect(r.action?.command).toBe("sniff");
  });

  it("'explicame hydra' explica la herramienta real", () => {
    const a = new Assistant(kernel);
    const r = a.respond("explicame hydra");
    expect(r.text).toContain("Hydra");
  });
});

describe("terminal: comando toolkit", () => {
  it("'toolkit' lista el arsenal y 'toolkit nmap' lo detalla", () => {
    resetStorage();
    seedRandom();
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);
    const list = term.execute("toolkit");
    expect(list).toContain("ARSENAL");
    expect(list.toLowerCase()).toContain("nmap");
    const detail = term.execute("toolkit nmap");
    expect(detail).toContain("En ÑANDE");
    expect(term.execute("toolkit noexiste").toLowerCase()).toContain("no tengo");
    kernel.dispose();
  });
});
