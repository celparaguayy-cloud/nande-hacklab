import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Pase de de-fakery OSINT: shodan, theHarvester, whois y sslscan ya NO
 * inventan datos. Leen el ESTADO REAL del mundo (hosts, servicios y DNS,
 * fuente única §2/§12) y son honestos sobre el sandbox (§6/§219).
 */
describe("OSINT — recon sobre el estado real del mundo", () => {
  let k: VirtualKernel;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    k = new VirtualKernel();
  });

  it("shodan lista servicios REALES de hosts públicos (no un catálogo fijo)", () => {
    const r = k.tools.run("shodan", []);
    // Aparecen hosts reales del mundo con su IP real.
    expect(r.output).toMatch(/blog\.yvoty\.nande/);
    expect(r.output).toMatch(/10\.10\.7\.11/);
    // Ya no está el catálogo hardcodeado viejo.
    expect(r.output).not.toContain("ÑandeHTTPd/1.4  puerto 80");
  });

  it("shodan filtra por servicio de verdad (ssh sólo trae sshd)", () => {
    const r = k.tools.run("shodan", ["ssh"]);
    expect(r.output).toContain("ssh");
    expect(r.output).not.toMatch(/\bnginx\/80\b/);
  });

  it("shodan no muestra hosts internos (sólo lo público)", () => {
    const r = k.tools.run("shodan", []);
    // Un host interno (sólo por pivoting) no debe aparecer.
    const internos = k.hosts.all().filter((h) => !k.hosts.isPublic(h.hostname));
    for (const h of internos.slice(0, 3)) {
      expect(r.output).not.toContain(h.hostname);
    }
  });

  it("theHarvester enumera subdominios REALES vía DNS (bug de despacho arreglado)", () => {
    const r = k.tools.run("theharvester", ["vortex.nande"]);
    expect(r.output).not.toContain("sin implementación");
    expect(r.output).toContain("api.vortex.nande");
    expect(r.output).toContain("preview.vortex.nande");
    // Y por nombre de comando también despacha.
    expect(k.tools.run("harvester", ["vortex.nande"]).output).toContain("api.vortex.nande");
  });

  it("whois deriva sus datos del estado real (IP, visibilidad, servicios)", () => {
    const r = k.tools.run("whois", ["blog.yvoty.nande"]);
    expect(r.output).toContain("10.10.7.11");
    expect(r.output).toContain("público");
    expect(r.output).not.toMatch(/ficticio/);
  });

  it("sslscan es honesto: los sitios sirven HTTP en claro (lección real)", () => {
    const r = k.tools.run("sslscan", ["blog.yvoty.nande"]);
    expect(r.output).toContain("HTTP en claro");
    expect(r.output).not.toContain("TLS 1.0  aceptado"); // nada de handshake inventado
  });

  it("las OSINT siguen respetando el sandbox (nada de dominios reales)", () => {
    expect(k.tools.run("whois", ["google.com"]).output).toContain("solo dominios");
    expect(k.tools.run("theharvester", ["google.com"]).output).toContain("solo dominios");
  });
});
