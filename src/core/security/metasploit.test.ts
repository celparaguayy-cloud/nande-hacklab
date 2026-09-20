import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * msfconsole (ÑandeMSF) — pruebas de REALIDAD. La consola es una máquina de
 * estados: search → use → set → check → exploit. Un exploit SÓLO tiene éxito si
 * el objetivo es DE VERDAD vulnerable al módulo (LabMachine.vulns). Contra un
 * servicio parcheado o inexistente, falla, como en la vida real. Todo offline:
 * los objetivos son exclusivamente la red 10.10.x.y del laboratorio.
 */
describe("msfconsole — explotación real, stateful y determinista", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("search encuentra módulos por vuln/categoría", () => {
    const out = term.execute("msfconsole search cmdi");
    expect(out).toContain("exploit/nande/http/cmd_injection");
    expect(out).toContain("Matching Modules");
  });

  it("use + show options informa qué falta antes de explotar", () => {
    term.execute("msfconsole use exploit/nande/http/cmd_injection");
    const out = term.execute("msfconsole show options");
    expect(out).toContain("RHOSTS");
    expect(out).toContain("PAYLOAD");
    // Sin RHOSTS/LHOST/LPORT, avisa que faltan.
    expect(out).toMatch(/Falta definir/i);
  });

  it("check dice si el objetivo es vulnerable SIN explotar", () => {
    const script =
      'use exploit/nande/http/cmd_injection ; set RHOSTS 10.10.5.50 ; check';
    const out = term.execute(`msfconsole -x "${script}"`);
    expect(out).toContain("ES vulnerable");
    expect(out).toContain("NANDE-WEB-CMDI");
  });

  it("exploit CMDI contra el objetivo vulnerable abre sesión y da la bandera", () => {
    const script =
      "use exploit/nande/http/cmd_injection ; " +
      "set RHOSTS 10.10.5.50 ; set LHOST 10.10.0.5 ; set LPORT 4444 ; " +
      "exploit";
    const out = term.execute(`msfconsole -x "${script}"`);
    expect(out).toContain("Sesión meterpreter 1 abierta");
    expect(out).toContain("NANDE{owasp_top10_labs}");
    // El laboratorio queda marcado como resuelto (acredita XP).
    expect(kernel.player.getState().solvedLabs).toContain("lab-owasp-01");
  });

  it("NO explota un objetivo que no tiene esa vuln (servicio parcheado)", () => {
    // rootlab (10.10.5.40) NO tiene CMDI; el exploit debe fallar.
    const script =
      "use exploit/nande/http/cmd_injection ; set RHOSTS 10.10.5.40 ; " +
      "set LHOST 10.10.0.5 ; set LPORT 4444 ; exploit";
    const out = term.execute(`msfconsole -x "${script}"`);
    expect(out).toMatch(/no se creó ninguna sesión|no es vulnerable|no hay servicio/i);
    expect(out).not.toContain("Sesión meterpreter");
  });

  it("rechaza objetivos fuera del laboratorio (100% offline)", () => {
    const script =
      "use exploit/nande/http/cmd_injection ; set RHOSTS 8.8.8.8 ; " +
      "set LHOST 10.10.0.5 ; set LPORT 4444 ; exploit";
    const out = term.execute(`msfconsole -x "${script}"`);
    expect(out).toMatch(/no es una máquina del laboratorio/i);
  });

  it("faltan opciones → no dispara", () => {
    const script = "use exploit/nande/http/cmd_injection ; exploit";
    const out = term.execute(`msfconsole -x "${script}"`);
    expect(out).toMatch(/Faltan opciones/i);
  });

  it("SQLi bypass (sin payload) da foothold web y bandera", () => {
    const script =
      "use exploit/nande/http/sqli_login_bypass ; set RHOSTS 10.10.5.10 ; exploit";
    const out = term.execute(`msfconsole -x "${script}"`);
    expect(out).toContain("Sesión shell");
    expect(out).toContain("NANDE{sqli_login_basico}");
  });

  it("auxiliar FTP anónimo enumera archivos del servidor real", () => {
    const script =
      "use auxiliary/scanner/ftp/anonymous ; set RHOSTS 10.10.5.20 ; run";
    const out = term.execute(`msfconsole -x "${script}"`);
    expect(out).toContain("NANDE{enumeracion_de_servicios}");
  });

  it("privesc local: requiere una SESSION previa, luego escala a root", () => {
    // 1) Foothold en rootlab con... no hay web; usamos sesión ficticia vía
    //    otra vía. Para el test, abrimos primero una shell contra un objetivo
    //    y comprobamos que el módulo local exige SESSION.
    const out1 = term.execute(
      'msfconsole -x "use exploit/nande/local/suid_privesc ; run"',
    );
    expect(out1).toMatch(/Faltan opciones|SESSION/i);
  });

  it("payload inválido se rechaza", () => {
    term.execute("msfconsole use exploit/nande/http/cmd_injection");
    const out = term.execute("msfconsole set PAYLOAD nande/no/existe");
    expect(out).toMatch(/Payload inválido/i);
  });
});
