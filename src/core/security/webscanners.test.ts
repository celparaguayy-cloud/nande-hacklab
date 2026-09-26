import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Pase de de-fakery de los escáneres web: dalfox, commix, nikto, whatweb y
 * wpscan ya NO devuelven salida hardcodeada. Cuando el objetivo es una webapp
 * real del mundo, mandan el payload/petición de verdad y reportan sólo lo que
 * el servidor confirma (§3/§6/§13/§219, misma fuente de verdad que curl/gobuster).
 */
describe("escáneres web — ataque real contra el motor HTTP", () => {
  let k: VirtualKernel;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    k = new VirtualKernel();
  });

  it("dalfox confirma XSS reflejado enviando el payload y captura la bandera", () => {
    const r = k.tools.run("dalfox", ["http://blog.yvoty.nande/buscar"]);
    expect(r.output).toContain("XSS reflejado");
    expect(r.flag).toBe("ND{xss_reflejado}");
  });

  it("dalfox es honesto cuando NO hay XSS (host sin reflejo)", () => {
    const r = k.tools.run("dalfox", ["http://docs.tape.nande/"]);
    expect(r.output).toContain("sin XSS");
    expect(r.flag).toBeUndefined();
  });

  it("commix confirma inyección de comandos real y captura la bandera", () => {
    const r = k.tools.run("commix", ["http://tools.pyta.nande/ping"]);
    expect(r.output).toContain("VULNERABLE a inyección de comandos");
    expect(r.flag).toBe("ND{cmd_injection_pwned}");
  });

  it("nikto detecta rutas realmente expuestas y evita los soft-404", () => {
    // blackbox expone robots + api de verdad → hallazgos reales.
    const bb = k.tools.run("nikto", ["blackbox.nande"]);
    expect(bb.output).toMatch(/robots\.txt/);
    expect(bb.output).toMatch(/api\/clientes/);
    // fotos NO expone esas rutas (devuelve soft-200) → cero falsos positivos.
    const fotos = k.tools.run("nikto", ["fotos.arandu.nande"]);
    expect(fotos.output).toContain("0 hallazgo(s)");
  });

  it("nikto confirma la XSS de blog enviando el payload", () => {
    const r = k.tools.run("nikto", ["blog.yvoty.nande"]);
    expect(r.output).toContain("XSS reflejado");
    expect(r.flag).toBe("ND{xss_reflejado}");
  });

  it("whatweb lee el fingerprint real (status + servicio real)", () => {
    const r = k.tools.run("whatweb", ["blog.yvoty.nande"]);
    expect(r.output).toContain("Status[200]");
    expect(r.output).toMatch(/nginx/);
  });

  it("wpscan es honesto: no inventa WordPress donde no lo hay", () => {
    const r = k.tools.run("wpscan", ["blog.yvoty.nande"]);
    expect(r.output).not.toMatch(/simulaci|ficticio/);
    expect(r.output).toContain("No se detectó WordPress");
  });

  it("los escáneres web siguen rechazando objetivos reales (fuera del sandbox)", () => {
    expect(k.tools.run("dalfox", ["http://8.8.8.8/x"]).output).toContain("fuera del sandbox");
    expect(k.tools.run("wpscan", ["http://8.8.8.8/"]).output).toContain("fuera del sandbox");
    expect(k.tools.run("commix", ["http://8.8.8.8/x"]).output).toContain("fuera del sandbox");
  });
});
