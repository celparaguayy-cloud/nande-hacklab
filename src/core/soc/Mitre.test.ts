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

  it("una inyección SQL real por HTTP enciende T1190 en el SOC", () => {
    term.execute("curl -X POST http://banco.nande/login -d \"usuario=admin' OR '1'='1 --&password=x\"");
    const ids = kernel.mitre.techniques().map((t) => t.mitreId);
    expect(ids).toContain("T1190");
  });

  it("una inyección de comandos enciende T1059", () => {
    term.execute("curl \"http://tools.pyta.nande/ping?host=x; cat flag\"");
    const det = kernel.mitre.all().find((d) => d.mitreId === "T1059");
    expect(det).toBeDefined();
    expect(det!.host).toBe("tools.pyta.nande");
  });

  it("un XSS reflejado enciende T1059.007", () => {
    term.execute("curl \"http://blog.yvoty.nande/buscar?q=<script>alert(1)</script>\"");
    expect(kernel.mitre.techniques().map((t) => t.mitreId)).toContain("T1059.007");
  });

  it("un path traversal enciende T1083", () => {
    term.execute("curl \"http://docs.tape.nande/ver?archivo=../config/secrets.env\"");
    expect(kernel.mitre.techniques().map((t) => t.mitreId)).toContain("T1083");
  });

  it("tráfico web benigno NO genera detección (sin falsos positivos)", () => {
    kernel.browser.request("GET", "blog.yvoty.nande", "/buscar?q=hola", {});
    kernel.browser.request("POST", "banco.nande", "/login", { usuario: "ana", password: "Clave123" });
    const ids = kernel.mitre.techniques().map((t) => t.mitreId);
    expect(ids).not.toContain("T1190");
    expect(ids).not.toContain("T1059");
    expect(ids).not.toContain("T1059.007");
    expect(ids).not.toContain("T1083");
  });
});
