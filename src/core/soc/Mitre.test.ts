import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * MITRE ATT&CK — pruebas de REALIDAD del Purple Team. Cada detección nace de
 * una acción ofensiva que de verdad ocurrió. Anti-mock: ejecutamos la técnica
 * y comprobamos que aparece SU detección con su ID de MITRE, no un texto fijo.
 */
describe("MitreCorrelator — el ataque enciende la defensa", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("sin acciones, no hay detecciones (no inventa nada)", () => {
    expect(kernel.mitre.count()).toBe(0);
  });

  it("varios logins fallidos disparan T1110 Brute Force", () => {
    for (let i = 0; i < 4; i += 1) {
      kernel.hosts.authenticate("server.nande", "root", `mala${i}`);
    }
    const brute = kernel.mitre.all().find((d) => d.mitreId === "T1110");
    expect(brute).toBeDefined();
    expect(brute!.tactic).toBe("Credential Access");
  });

  it("kerberoast dispara T1558.003 (detección Purple del ataque a AD)", () => {
    kernel.directory.kerberoast("SVC-SQL@NANDE.LOCAL");
    const det = kernel.mitre.all().find((d) => d.mitreId === "T1558.003");
    expect(det).toBeDefined();
    expect(det!.technique).toContain("Kerberoast");
  });

  it("una credencial en claro por HTTP dispara T1040 Network Sniffing", () => {
    kernel.browser.request("POST", "banco.nande", "/login", {
      user: "ana",
      password: "EnClaro123",
    });
    const det = kernel.mitre.all().find((d) => d.mitreId === "T1040");
    expect(det).toBeDefined();
    expect(det!.host).toBe("banco.nande");
  });

  it("comprometer el dominio agrega su técnica y la matriz lo refleja", () => {
    term.execute("abuse MESA-AYUDA@NANDE.LOCAL LORE.MARTINEZ@NANDE.LOCAL");
    term.execute("abuse LORE.MARTINEZ@NANDE.LOCAL SVC-SQL@NANDE.LOCAL");
    term.execute("abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL");
    term.execute("abuse DB01@NANDE.LOCAL ADMIN-SQL@NANDE.LOCAL");

    expect(kernel.directory.domainOwned()).toBe(true);
    const ids = kernel.mitre.techniques().map((t) => t.mitreId);
    expect(ids).toContain("T1078.002"); // Domain Dominance / Impact

    const out = term.execute("mitre");
    expect(out).toContain("ATT&CK");
    expect(out).toContain("T1078.002");
  });
});
