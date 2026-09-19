import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * sqlmap y gobuster — pruebas de REALIDAD. Golpean las apps web REALES del
 * mundo (con su motor SQL de verdad): sqlmap detecta la inyección por la
 * diferencia real de respuestas y extrae la bandera del panel siguiendo el
 * redirect; gobuster reporta el STATUS real de cada ruta. Nada pre-calculado.
 */
describe("sqlmap — inyección real contra el motor SQL del mundo", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => { resetStorage(); seedRandom(); kernel = new VirtualKernel(); term = new VirtualTerminal(kernel); });

  it("detecta la SQLi del login del banco y extrae la bandera de verdad", () => {
    const out = term.execute('sqlmap -u http://banco.nande/login --data "usuario=admin&password=x"');
    expect(out).toContain("inyectable");
    expect(out).toContain("ND{sqli_login_bypass}");
    expect(kernel.player.capturedFlags()).toContain("ND{sqli_login_bypass}");
  });

  it("la detección es real: sale de la diferencia de respuestas de la app", () => {
    // Prueba de que NO está hardcodeado: un endpoint sin el param vulnerable
    // no reporta inyección.
    const out = term.execute('sqlmap -u http://banco.nande/login --data "otro=1"');
    expect(out).toContain("no parece inyectable");
    expect(out).not.toContain("ND{sqli_login_bypass}");
  });

  it("pide parámetros y respeta el sandbox", () => {
    expect(term.execute("sqlmap -u http://banco.nande/")).toContain("no hay parámetros");
    expect(term.execute("sqlmap -u http://evil.com/?x=1")).toContain("fuera del sandbox");
  });
});

describe("gobuster — enumeración real de rutas del servidor web", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => { resetStorage(); seedRandom(); kernel = new VirtualKernel(); term = new VirtualTerminal(kernel); });

  it("reporta el status real de cada ruta (200 login, 401 panel protegido)", () => {
    const out = term.execute("gobuster -u http://banco.nande");
    expect(out).toMatch(/\/login\s+\(Status: 200\)/);
    expect(out).toMatch(/\/panel\s+\(Status: 401\)/);
    expect(out).toContain("protegida");
  });

  it("una ruta inexistente (404) no aparece en los resultados", () => {
    const out = term.execute("gobuster -u http://banco.nande");
    expect(out).not.toContain("/noexiste");
  });

  it("ffuf comparte el motor real y reporta como fuzzing", () => {
    const out = term.execute("ffuf -u http://banco.nande");
    expect(out).toContain("fuzzing de rutas");
    expect(out).toMatch(/\/login\s+\(Status: 200\)/);
  });
});
