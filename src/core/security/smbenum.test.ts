import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * enum4linux / smbclient / crackmapexec — pruebas de REALIDAD. Ninguno inventa
 * salida: enum4linux y crackmapexec leen/escriben el Directorio Activo REAL
 * (kernel.directory), y smbclient lista los archivos REALES de la máquina de
 * laboratorio. crackmapexec cambia el ESTADO del dominio (posesión), que
 * NandeBlood recalcula. Todo 100% offline (NANDE.LOCAL / 10.10.x.y).
 */
describe("SMB/AD enumeración — reflejan y mutan el dominio real", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("enum4linux vuelca los principals REALES del dominio (usuarios/SPN)", () => {
    const out = term.execute("enum4linux nande.local");
    expect(out).toContain("NANDE.LOCAL");
    expect(out).toContain("SVC-SQL@NANDE.LOCAL");
    expect(out).toContain("[SPN"); // marca la cuenta kerberoasteable
    expect(out).toContain("ADMIN-SQL@NANDE.LOCAL");
    expect(out).toContain("DOMAIN ADMINS@NANDE.LOCAL");
  });

  it("enum4linux rechaza objetivos fuera del sandbox (offline)", () => {
    const out = term.execute("enum4linux microsoft.com");
    expect(out).toMatch(/sandbox|offline/i);
  });

  it("crackmapexec con la clave correcta compromete la cuenta (estado real)", () => {
    // Antes: SVC-SQL no es tuya.
    expect(kernel.directory.get("SVC-SQL@NANDE.LOCAL")?.owned).toBe(false);
    const out = term.execute("crackmapexec smb dc01.nande.local -u svc-sql -p Verano2024!");
    expect(out).toContain("Pwn3d!"); // es admin local de DB01 (borde AdminTo)
    // Después: el Directorio cambió DE VERDAD.
    expect(kernel.directory.get("SVC-SQL@NANDE.LOCAL")?.owned).toBe(true);
  });

  it("crackmapexec con clave incorrecta NO compromete nada", () => {
    const out = term.execute("crackmapexec smb dc01.nande.local -u svc-sql -p incorrecta");
    expect(out).toMatch(/STATUS_LOGON_FAILURE/);
    expect(kernel.directory.get("SVC-SQL@NANDE.LOCAL")?.owned).toBe(false);
  });

  it("crackmapexec spray prueba la clave contra todo el dominio y encuentra la débil", () => {
    const out = term.execute("cme smb nande.local -u users.txt -p Verano2024!");
    expect(out).toContain("SVC-SQL"); // svc-sql cae con la clave débil
    expect(kernel.directory.get("SVC-SQL@NANDE.LOCAL")?.owned).toBe(true);
  });

  it("crackmapexec rechaza objetivos fuera del sandbox", () => {
    const out = term.execute("crackmapexec smb 8.8.8.8 -u admin -p x");
    expect(out).toMatch(/sandbox|offline/i);
  });

  it("smbclient -L lista comparticiones y smbclient //host/files los archivos REALES", () => {
    // rootlab (10.10.5.40) tiene archivos reales (notes.txt, backup.sh).
    const shares = term.execute("smbclient -L 10.10.5.40");
    expect(shares).toContain("files");
    const files = term.execute("smbclient //10.10.5.40/files");
    expect(files).toContain("/home/student/notes.txt");
  });

  it("smbclient lee el contenido REAL de un archivo de la máquina", () => {
    const out = term.execute("smbclient //10.10.5.40/files /opt/backup.sh");
    expect(out).toContain("script de respaldo");
  });

  it("smbclient rechaza hosts fuera del sandbox", () => {
    const out = term.execute("smbclient -L 1.1.1.1");
    expect(out).toMatch(/sandbox|offline/i);
  });
});
