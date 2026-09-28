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

  it("coherencia AD↔red: el DC es un host REAL descubrible por nmap (puertos de AD)", () => {
    const scan = term.execute(`nmap ${kernel.directory.dcIp}`);
    expect(scan).toContain("88/tcp"); // Kerberos
    expect(scan).toContain("389/tcp"); // LDAP
    expect(scan).toContain("445/tcp"); // SMB
    // El dominio resuelve al DC (fuente única).
    expect(kernel.dns.resolve("nande.local")).toBe(kernel.directory.dcIp);
  });

  it("coherencia AD↔red: enumerar el dominio exige apuntar al DC real, no a cualquier host", () => {
    // server.nande existe y es alcanzable, pero NO es el controlador de dominio.
    const out = term.execute("enum4linux server.nande");
    expect(out).toMatch(/no es un controlador de dominio|El DC es/i);
    // Contra el DC sí enumera.
    expect(term.execute("enum4linux dc01.nande.local")).toContain("SVC-SQL@NANDE.LOCAL");
  });

  it("coherencia AD↔red: sin ruta al DC no hay Kerberoasting (kerberoast pasa por el KDC)", () => {
    // Apagá el DC: el KDC deja de responder y el ataque no puede pedir el TGS.
    kernel.hosts.setHostUp(kernel.directory.dcHostname, false);
    const out = term.execute("kerberoast SVC-SQL@NANDE.LOCAL");
    expect(out).toMatch(/DC|ruta|caído|88/i);
    expect(out).not.toContain("$krb5tgs$");
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

  it("AS-REP roasting por terminal: enum lo marca, se roastea (T1558.004) y crackea la cuenta", () => {
    const en = term.execute("enum4linux nande.local");
    expect(en).toContain("AS-REP roasteable");
    expect(en).toContain("LEGACY-SVC@NANDE.LOCAL");
    const roast = term.execute("asreproast LEGACY-SVC@NANDE.LOCAL");
    expect(roast).toContain("krb5asrep");
    expect(kernel.mitre.recent(20).map((d) => d.mitreId)).toContain("T1558.004");
    term.execute("crack-tgs LEGACY-SVC@NANDE.LOCAL Legacy2019!");
    expect(kernel.directory.get("LEGACY-SVC@NANDE.LOCAL")?.owned).toBe(true);
  });

  it("ADCS/ESC1 por terminal (2 pasos): enum→find→req(emite)→auth(PKINIT) cae el dominio (T1649+T1550)", () => {
    // enum4linux descubre AD CS y la plantilla vulnerable.
    const en = term.execute("enum4linux nande.local");
    expect(en).toContain("AD CS detectado");
    expect(en).toContain("ESC1");
    // certipy find -vulnerable enumera la plantilla vulnerable REAL de la CA.
    const find = term.execute("certipy find -vulnerable");
    expect(find).toContain("NandeUser");
    expect(find).toContain("VULNERABLE");
    // Paso 1: certipy req EMITE el cert pero NO autentica: el dominio sigue en pie.
    const req = term.execute("certipy req -template NandeUser -upn ADMIN-SQL@NANDE.LOCAL");
    expect(req).toContain("paso 1/2");
    expect(req).not.toContain("ND{dominio_comprometido}");
    expect(kernel.directory.domainOwned()).toBe(false);
    // Paso 2: certipy auth (PKINIT) impersona al DA → dominio comprometido de verdad.
    const auth = term.execute("certipy auth -pfx ADMIN-SQL@NANDE.LOCAL");
    expect(auth).toContain("NT hash");
    expect(auth).toContain("ND{adcs_esc1}");
    expect(auth).toContain("ND{dominio_comprometido}");
    expect(kernel.directory.domainOwned()).toBe(true);
    // Señales MITRE T1649 (forja) y T1550 (PKINIT) emitidas; banderas capturadas.
    const ids = kernel.mitre.recent(20).map((d) => d.mitreId);
    expect(ids).toContain("T1649");
    expect(ids).toContain("T1550");
    const flags = kernel.player.capturedFlags();
    expect(flags).toContain("ND{adcs_esc1}");
    expect(flags).toContain("ND{dominio_comprometido}");
  });

  it("ESC1 por terminal: auth sin cert emitido falla (PKINIT exige el .pfx)", () => {
    const auth = term.execute("certipy auth -pfx ADMIN-SQL@NANDE.LOCAL");
    expect(auth).toMatch(/no tenés un certificado/);
    expect(kernel.directory.domainOwned()).toBe(false);
  });

  it("ESC1 exige alcanzar la CA/DC real y la plantilla segura NO explota", () => {
    // Sin ruta al DC (caído), certipy no enumera ni emite.
    kernel.hosts.setHostUp(kernel.directory.dcHostname, false);
    expect(term.execute("certipy find")).toMatch(/DC|ruta|caído/i);
    kernel.hosts.setHostUp(kernel.directory.dcHostname, true);
    // La plantilla segura no es explotable por ESC1.
    const req = term.execute("certipy req -template WebServer -upn ADMIN-SQL@NANDE.LOCAL");
    expect(req).toMatch(/no es vulnerable a ESC1/);
    expect(kernel.directory.domainOwned()).toBe(false);
  });
});
