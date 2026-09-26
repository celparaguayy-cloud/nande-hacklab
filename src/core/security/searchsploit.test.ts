import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * De-fakery de searchsploit: ya NO devuelve exploits "(ficticios)" fijos.
 * Filtra una base mapeada al software REAL del mundo y CRUZA contra los hosts
 * que corren esa versión (fuente única §2/§12), enlazando al módulo de
 * metasploit cuando existe. Nada inventado (§6/§219).
 */
describe("searchsploit — base real cruzada con el mundo", () => {
  let k: VirtualKernel;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    k = new VirtualKernel();
  });

  it("filtra por producto y muestra los hosts reales afectados", () => {
    const r = k.tools.run("searchsploit", ["ftp"]);
    expect(r.output).toContain("ÑandeFTP");
    expect(r.output).toContain("auxiliary/scanner/ftp/anonymous"); // enlaza a msf
    expect(r.output).toMatch(/lo corren: .*\.lab/); // cruce real con el mundo
    expect(r.output).not.toMatch(/ficticio/);
  });

  it("relaciona versión vieja con hosts que la corren (SSH)", () => {
    const r = k.tools.run("searchsploit", ["ssh"]);
    expect(r.output).toContain("OpenÑSSH");
    // Los labs con OpenÑSSH 7.9/8.2 aparecen como afectados; los hosts con 9.6 no.
    expect(r.output).toMatch(/lo corren: /);
  });

  it("busca por clase de fallo (rce → inyección de comandos con módulo msf)", () => {
    const r = k.tools.run("searchsploit", ["rce"]);
    expect(r.output).toContain("exploit/nande/http/cmd_injection");
  });

  it("es honesto cuando no hay resultados y pide un término", () => {
    expect(k.tools.run("searchsploit", ["zzxq-nada"]).output).toContain("sin resultados");
    expect(k.tools.run("searchsploit", []).output).toContain("pasá un término");
  });
});
