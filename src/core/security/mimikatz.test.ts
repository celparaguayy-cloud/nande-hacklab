import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * mimikatz — post-explotación de credenciales sobre el Directorio Activo REAL.
 * No inventa: sekurlsa::logonpasswords vuelca los hashes NT de las cuentas con
 * sesión en los EQUIPOS que ya poseés, y sekurlsa::pth se autentica con ese
 * hash (Pass-the-Hash), cambiando el ESTADO del dominio. Si la cuenta es Domain
 * Admin, caés el dominio. 100% offline (NANDE.LOCAL).
 */
describe("mimikatz — dumpeo de credenciales y Pass-the-Hash reales", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("sin poseer ningún equipo, no hay credenciales que volcar", () => {
    const out = term.execute("mimikatz sekurlsa::logonpasswords");
    expect(out).toMatch(/No hay credenciales|POSEER un equipo/i);
    expect(out).not.toMatch(/comando no encontrado/i);
  });

  it("tras poseer DB01, vuelca el hash NT del Domain Admin con sesión ahí", () => {
    // Cadena real: cme posee SVC-SQL → abuse AdminTo posee DB01.
    term.execute("crackmapexec smb dc01.nande.local -u svc-sql -p Verano2024!");
    term.execute("abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL");
    expect(kernel.directory.get("DB01@NANDE.LOCAL")?.owned).toBe(true);
    const out = term.execute("mimikatz sekurlsa::logonpasswords");
    expect(out).toContain("ADMIN-SQL@NANDE.LOCAL");
    expect(out).toContain("Domain Admin");
    // El hash mostrado es el determinista del Directorio.
    expect(out).toContain(kernel.directory.ntHash("ADMIN-SQL@NANDE.LOCAL"));
  });

  it("Pass-the-Hash del Domain Admin (ya dumpeable) compromete el dominio", () => {
    term.execute("crackmapexec smb dc01.nande.local -u svc-sql -p Verano2024!");
    term.execute("abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL");
    expect(kernel.directory.domainOwned()).toBe(false);
    const out = term.execute('mimikatz "sekurlsa::pth /user:ADMIN-SQL@NANDE.LOCAL"');
    expect(out).toMatch(/Pass-the-Hash OK|DOMINIO COMPROMETIDO/i);
    expect(kernel.directory.domainOwned()).toBe(true);
  });

  it("Pass-the-Hash con /ntlm correcto también autentica", () => {
    term.execute("crackmapexec smb dc01.nande.local -u svc-sql -p Verano2024!");
    term.execute("abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL");
    const hash = kernel.directory.ntHash("ADMIN-SQL@NANDE.LOCAL");
    const out = term.execute(`mimikatz "sekurlsa::pth /user:ADMIN-SQL@NANDE.LOCAL /ntlm:${hash}"`);
    expect(out).toMatch(/Pass-the-Hash OK/i);
    expect(kernel.directory.get("ADMIN-SQL@NANDE.LOCAL")?.owned).toBe(true);
  });

  it("Pass-the-Hash sin tener el hash (ni sesión en equipo poseído) falla", () => {
    // Sin dumpear nada: no podés autenticarte como ADMIN-SQL.
    const out = term.execute('mimikatz "sekurlsa::pth /user:ADMIN-SQL@NANDE.LOCAL"');
    expect(out).toMatch(/no tenés el hash|incorrecto/i);
    expect(kernel.directory.domainOwned()).toBe(false);
  });
});
