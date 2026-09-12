import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * El SOC consume eventos REALES: una acción del jugador genera una alerta
 * detectable. Anti-mock: no comprobamos textos precocidos, comprobamos que el
 * evento del runtime llegó al SOC y se clasificó.
 */
describe("BlueTeamSOC — una acción real genera una alerta", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("apagar un servicio genera una alerta 'high' en el SOC", () => {
    const antes = kernel.soc.count();
    term.execute("service-stop nginx server.nande");
    expect(kernel.soc.count()).toBeGreaterThan(antes);

    const alerts = kernel.soc.list();
    expect(alerts.some((a) => a.severity === "high" && a.host === "server.nande")).toBe(true);

    // Visible por el comando soc.
    expect(term.execute("soc alerts")).toContain("server.nande");
  });

  it("varios logins fallidos escalan a 'critical' (fuerza bruta)", () => {
    term.execute("connect server.nande soporte mala1");
    term.execute("connect server.nande soporte mala2");
    term.execute("connect server.nande soporte mala3");

    expect(kernel.soc.topSeverity()).toBe("critical");
    expect(term.execute("soc")).toContain("crítica:");
  });

  it("soc clear archiva las alertas", () => {
    term.execute("service-stop nginx server.nande");
    expect(kernel.soc.count()).toBeGreaterThan(0);
    term.execute("soc clear");
    expect(kernel.soc.count()).toBe(0);
  });
});
