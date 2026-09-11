import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("reversing y análisis de malware (tanda 13)", () => {
  it("radare2 sobre el binario con clave hardcodeada la revela", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    expect(t.execute("radare2 licencia.bin")).toContain("ND{reversing_clave_hardcodeada}");
    // Otro binario no revela la clave.
    expect(t.execute("radare2 otro.bin")).not.toContain("ND{reversing_clave_hardcodeada}");
  });

  it("cuckoo detecta la muestra maliciosa y sus IOCs", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    const out = t.execute("cuckoo factura.exe");
    expect(out).toContain("ND{malware_iocs}");
    expect(out).toContain("IOC");
    // Un archivo limpio no da bandera.
    expect(t.execute("cuckoo carta.txt")).not.toContain("ND{malware_iocs}");
  });
});
