import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * hydra — pruebas de REALIDAD. La fuerza bruta golpea la autenticación REAL del
 * host: la credencial que encuentra es la que de verdad abre la sesión, y los
 * intentos fallidos dejan evidencia real que el SOC correlaciona.
 */
describe("hydra — fuerza bruta real contra credenciales del mundo", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => { resetStorage(); seedRandom(); kernel = new VirtualKernel(); term = new VirtualTerminal(kernel); });

  it("encuentra la credencial real de un host y permite conectarse con ella", () => {
    const out = term.execute("hydra ssh://server.nande");
    expect(out).toContain("login: soporte");
    expect(out).toContain("password: Verano2024");
    // La credencial encontrada es la REAL: abre la sesión de verdad.
    expect(kernel.hosts.authenticate("server.nande", "soporte", "Verano2024").ok).toBe(true);
  });

  it("una clave fuera del diccionario no cae (fuerza bruta acotada)", () => {
    // caja.interna sólo se ve pivotando; sin ruta directa hydra ni la alcanza.
    const out = term.execute("hydra -l admin -P rockyou.txt caja.interna.nande");
    expect(out).not.toContain("password: GiraSol#2024");
  });

  it("exige que el servicio esté abierto (nmap primero)", () => {
    kernel.hosts.stopService("server.nande", "sshd");
    const out = term.execute("hydra ssh://server.nande");
    expect(out).toContain("no expone");
  });

  it("respeta -l / -P y reporta el total de intentos", () => {
    const out = term.execute("hydra -l soporte -P rockyou.txt server.nande");
    expect(out).toContain("1 usuario(s)");
    expect(out).toContain("login: soporte");
  });

  it("los intentos fallidos dejan evidencia que el SOC correlaciona en UNA alerta", () => {
    term.execute("hydra ssh://server.nande");
    const alerts = kernel.soc.query("", 500);
    const brute = alerts.filter((a) => a.ruleId === "ND-005");
    // NO una alerta por intento: una sola correlacionada con el total.
    expect(brute.length).toBe(1);
    expect(brute[0].detail).toMatch(/\d+ intentos de acceso fallidos/);
    expect(alerts.length).toBeLessThan(10);
  });

  it("rechaza objetivos fuera del sandbox", () => {
    expect(term.execute("hydra ssh://github.com")).toContain("fuera del sandbox");
  });
});
