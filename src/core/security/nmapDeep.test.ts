import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * nmap en profundidad: los scripts NSE y el escaneo UDP tienen que HACER algo
 * real, no sólo aceptar la bandera. Si vuelven a quedar vacíos (como antes),
 * este test lo caza — es lo que hacía que el curso pareciera "básico".
 */
describe("nmap — NSE y UDP de verdad", () => {
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    term = new VirtualTerminal(new VirtualKernel());
  });

  it("-sC corre scripts default (hostkey, title, methods)", () => {
    const out = term.execute("nmap -sC server.nande");
    expect(out).toContain("ssh-hostkey");
    expect(out).toContain("http-title");
    expect(out).toContain("http-methods");
    // La huella no debe colapsar a una sola letra repetida.
    expect(out).not.toMatch(/SHA256:(A)\1{6,}/);
  });

  it("--script vuln DELATA las fallas reales del host", () => {
    const banco = term.execute("nmap --script vuln banco.nande");
    expect(banco).toContain("http-sql-injection");
    expect(banco).toContain("/movimientos");

    const fotos = term.execute("nmap --script vuln fotos.arandu.nande");
    expect(fotos).toMatch(/idor/i);
  });

  it("-sU escanea UDP con estados propios (open|filtered)", () => {
    const out = term.execute("nmap -sU server.nande");
    expect(out).toContain("/udp");
    expect(out).toContain("open|filtered");
  });

  it("un escaneo simple NO trae ruido de scripts", () => {
    const out = term.execute("nmap server.nande");
    expect(out).not.toContain("ssh-hostkey");
  });
});
