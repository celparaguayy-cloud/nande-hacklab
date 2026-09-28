import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { Directory } from "./Directory";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * AD virtual + NandeBlood — pruebas de REALIDAD. El grafo es estado: cuando
 * poseés un nodo, la ruta de ataque se recalcula desde ese estado. Anti-mock:
 * la escalada completa cambia quién posee qué y termina comprometiendo el
 * dominio de verdad (no un texto pregrabado).
 */
describe("Directory / NandeBlood — el grafo es estado real", () => {
  let dir: Directory;

  beforeEach(() => {
    dir = new Directory();
  });

  it("arranca con el foothold poseído y una ruta hacia Domain Admins", () => {
    const owned = dir.owned().map((p) => p.name);
    expect(owned).toContain("JUGADOR@NANDE.LOCAL");
    expect(dir.domainOwned()).toBe(false);
    const path = dir.pathToDomainAdmins();
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });

  it("kerberoast + crack con clave correcta posee la cuenta de servicio", () => {
    const r = dir.kerberoast("SVC-SQL@NANDE.LOCAL");
    expect(r.ok).toBe(true);
    expect(r.hash).toContain("krb5tgs");

    expect(dir.crack("SVC-SQL@NANDE.LOCAL", "malaclave").ok).toBe(false);
    expect(dir.get("SVC-SQL@NANDE.LOCAL")!.owned).toBe(false);

    const cracked = dir.crack("SVC-SQL@NANDE.LOCAL", "Verano2024!");
    expect(cracked.ok).toBe(true);
    expect(dir.get("SVC-SQL@NANDE.LOCAL")!.owned).toBe(true);
  });

  it("DCSync exige Domain Admin y luego replica TODOS los hashes, incluido krbtgt", () => {
    // Sin controlar el dominio, DCSync no procede (necesita replicación).
    expect(dir.dcsync().ok).toBe(false);
    // Comprometé el dominio poseyendo un miembro de Domain Admins.
    dir.own("ADMIN-SQL@NANDE.LOCAL");
    expect(dir.domainOwned()).toBe(true);
    const r = dir.dcsync();
    expect(r.ok).toBe(true);
    expect(r.krbtgt).toBeTruthy();
    expect(r.krbtgt).toBe(dir.krbtgtHash());
    // Vuelca a todas las cuentas del dominio, marcando a los Domain Admins.
    expect(r.hashes.length).toBe(dir.all().filter((p) => p.kind === "user").length);
    expect(r.hashes.some((h) => h.isDomainAdmin)).toBe(true);
  });

  it("Golden Ticket = persistencia: sobrevive 1 rotación de krbtgt, muere con la 2ª", () => {
    dir.own("ADMIN-SQL@NANDE.LOCAL"); // dominio comprometido
    // Sin el hash de krbtgt de otro modo, con domainOwned alcanza para forjar.
    expect(dir.forgeGoldenTicket().ok).toBe(true);
    expect(dir.hasDomainPersistence()).toBe(true);
    // Una rotación NO alcanza (el KDC honra la clave anterior).
    const r1 = dir.rotateKrbtgt();
    expect(r1.persistenceBroken).toBe(false);
    expect(dir.hasDomainPersistence()).toBe(true);
    // La segunda rotación sí invalida el Golden Ticket.
    const r2 = dir.rotateKrbtgt();
    expect(r2.persistenceBroken).toBe(true);
    expect(dir.hasDomainPersistence()).toBe(false);
  });

  it("forjar un Golden Ticket exige el hash de krbtgt (o ya controlar el dominio)", () => {
    // Sin dominio y sin hash correcto: no se puede.
    expect(dir.forgeGoldenTicket("deadbeef").ok).toBe(false);
    expect(dir.hasDomainPersistence()).toBe(false);
    // Con el hash real de krbtgt (el que da un DCSync), sí.
    expect(dir.forgeGoldenTicket(dir.krbtgtHash()).ok).toBe(true);
    expect(dir.hasDomainPersistence()).toBe(true);
  });

  it("AS-REP Roasting: cuenta sin pre-auth se roastea sin credenciales y crackea (T1558.004)", () => {
    expect(dir.asrepRoastable().some((p) => p.name === "LEGACY-SVC@NANDE.LOCAL")).toBe(true);
    const r = dir.asrepRoast("LEGACY-SVC@NANDE.LOCAL");
    expect(r.ok).toBe(true);
    expect(r.hash).toContain("krb5asrep");
    // Una cuenta CON pre-auth (SPN) no es AS-REP roasteable.
    expect(dir.asrepRoast("SVC-SQL@NANDE.LOCAL").ok).toBe(false);
    // El hash de AS-REP se crackea igual que el de Kerberoasting.
    expect(dir.crack("LEGACY-SVC@NANDE.LOCAL", "malo").ok).toBe(false);
    expect(dir.crack("LEGACY-SVC@NANDE.LOCAL", "Legacy2019!").ok).toBe(true);
    expect(dir.get("LEGACY-SVC@NANDE.LOCAL")!.owned).toBe(true);
  });

  it("ruta ALTERNATIVA a Domain Admins (regla 11): AS-REP → FILE01 → PtH del DBA", () => {
    // Camino B, distinto del de SVC-SQL/DB01: dos rutas al mismo objetivo.
    dir.own("LEGACY-SVC@NANDE.LOCAL");
    expect(dir.domainOwned()).toBe(false);
    expect(dir.abuse("LEGACY-SVC@NANDE.LOCAL", "FILE01@NANDE.LOCAL").ok).toBe(true);
    // El DBA tiene sesión en FILE01: al poseerlo, su hash es volcable.
    expect(dir.dumpableCredentials().some((c) => c.name === "ADMIN-SQL@NANDE.LOCAL")).toBe(true);
    const pth = dir.passTheHash("ADMIN-SQL@NANDE.LOCAL");
    expect(pth.ok).toBe(true);
    expect(dir.domainOwned()).toBe(true);
  });

  it("NandeBlood recalcula: tras poseer LEGACY-SVC hay ruta a DA que NO pasa por SVC-SQL", () => {
    dir.own("LEGACY-SVC@NANDE.LOCAL");
    const path = dir.pathToDomainAdmins();
    expect(path).not.toBeNull();
    const nodes = path!.flatMap((s) => [s.from, s.to]);
    expect(nodes).toContain("FILE01@NANDE.LOCAL");
    expect(nodes).not.toContain("SVC-SQL@NANDE.LOCAL");
  });

  it("ADCS ESC1 (2 pasos): emitir el cert NO es autenticarse; PKINIT sí posee al DA", () => {
    // La CA publica una plantilla vulnerable (NandeUser) y una segura (WebServer).
    expect(dir.esc1Vulnerable("NandeUser")).toBe(true);
    expect(dir.esc1Vulnerable("WebServer")).toBe(false);
    expect(dir.esc1Templates().map((t) => t.name)).toEqual(["NandeUser"]);
    // Antes de nada no controlás el dominio; el DBA no es tuyo.
    expect(dir.domainOwned()).toBe(false);
    expect(dir.get("ADMIN-SQL@NANDE.LOCAL")!.owned).toBe(false);
    // Paso 1: desde el foothold (JUGADOR) EMITÍS un cert con SAN = un Domain Admin.
    const req = dir.requestCertificate("NandeUser", "ADMIN-SQL@NANDE.LOCAL");
    expect(req.ok).toBe(true);
    expect(req.certificate).toContain("SAN(UPN)=ADMIN-SQL@NANDE.LOCAL");
    // TENER el cert NO es autenticarse: todavía NO poseés la cuenta.
    expect(dir.hasCertificateFor("ADMIN-SQL@NANDE.LOCAL")).toBe(true);
    expect(dir.get("ADMIN-SQL@NANDE.LOCAL")!.owned).toBe(false);
    expect(dir.domainOwned()).toBe(false);
    // Paso 2: PKINIT con el cert → poseés al DBA y recuperás su hash NT.
    const auth = dir.authenticateWithCertificate("ADMIN-SQL@NANDE.LOCAL");
    expect(auth.ok).toBe(true);
    expect(auth.domainOwned).toBe(true);
    expect(auth.ntHash).toBe(dir.ntHash("ADMIN-SQL@NANDE.LOCAL"));
    expect(dir.get("ADMIN-SQL@NANDE.LOCAL")!.owned).toBe(true);
    expect(dir.domainOwned()).toBe(true);
  });

  it("ESC1: no podés autenticar sin haber emitido el cert (PKINIT exige el .pfx)", () => {
    // Sin req previo, auth falla y no posee nada.
    const auth = dir.authenticateWithCertificate("ADMIN-SQL@NANDE.LOCAL");
    expect(auth.ok).toBe(false);
    expect(auth.message).toMatch(/no tenés un certificado/);
    expect(dir.get("ADMIN-SQL@NANDE.LOCAL")!.owned).toBe(false);
    expect(dir.domainOwned()).toBe(false);
  });

  it("ESC1: la plantilla segura NO es explotable y explica qué condición falta", () => {
    const r = dir.requestCertificate("WebServer", "ADMIN-SQL@NANDE.LOCAL");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/no es vulnerable a ESC1/);
    expect(dir.hasCertificateFor("ADMIN-SQL@NANDE.LOCAL")).toBe(false);
    expect(dir.domainOwned()).toBe(false);
    // Una plantilla inexistente tampoco emite nada.
    expect(dir.requestCertificate("NoExiste", "ADMIN-SQL@NANDE.LOCAL").ok).toBe(false);
  });

  it("ESC1 remediación (azul): endurecer la plantilla CIERRA la ruta de verdad", () => {
    // Vulnerable de arranque.
    expect(dir.esc1Vulnerable("NandeUser")).toBe(true);
    // El azul endurece: efecto REAL en el estado.
    const fix = dir.hardenCertTemplate("NandeUser");
    expect(fix.ok).toBe(true);
    expect(fix.changed).toBe(true);
    // Ya no es vulnerable ni aparece en el reporte de vulnerables.
    expect(dir.esc1Vulnerable("NandeUser")).toBe(false);
    expect(dir.esc1Templates()).toEqual([]);
    // Y certipy req deja de poder impersonar.
    const req = dir.requestCertificate("NandeUser", "ADMIN-SQL@NANDE.LOCAL");
    expect(req.ok).toBe(false);
    expect(req.message).toMatch(/no es vulnerable a ESC1/);
    expect(dir.hasCertificateFor("ADMIN-SQL@NANDE.LOCAL")).toBe(false);
    // Endurecer una plantilla ya sana es un no-op (ok, sin cambio); una inexistente falla.
    const again = dir.hardenCertTemplate("NandeUser");
    expect(again.ok).toBe(true);
    expect(again.changed).toBe(false);
    expect(dir.hardenCertTemplate("NoExiste").ok).toBe(false);
  });

  it("ESC1 es una TERCERA ruta a DA, independiente de Kerberoasting y AS-REP", () => {
    // Sin tocar SVC-SQL ni LEGACY-SVC: el foothold llega directo a DA por ADCS.
    expect(dir.get("SVC-SQL@NANDE.LOCAL")!.owned).toBe(false);
    expect(dir.get("LEGACY-SVC@NANDE.LOCAL")!.owned).toBe(false);
    dir.requestCertificate("NandeUser", "ADMIN-SQL@NANDE.LOCAL");
    dir.authenticateWithCertificate("ADMIN-SQL@NANDE.LOCAL");
    expect(dir.domainOwned()).toBe(true);
    // No pasó por las otras cuentas de servicio.
    expect(dir.get("SVC-SQL@NANDE.LOCAL")!.owned).toBe(false);
    expect(dir.get("LEGACY-SVC@NANDE.LOCAL")!.owned).toBe(false);
  });

  it("no podés abusar un borde cuyo origen no poseés", () => {
    // SVC-SQL no está poseído al inicio → no podés abusar su AdminTo.
    const r = dir.abuse("SVC-SQL@NANDE.LOCAL", "DB01@NANDE.LOCAL");
    expect(r.ok).toBe(false);
    expect(dir.get("DB01@NANDE.LOCAL")!.owned).toBe(false);
  });

  it("la escalada completa compromete el dominio y la ruta desaparece", () => {
    // 1) Foothold → Mesa de Ayuda (heredada por MemberOf) → ForceChangePassword a Lore
    dir.abuse("MESA-AYUDA@NANDE.LOCAL", "LORE.MARTINEZ@NANDE.LOCAL");
    expect(dir.get("LORE.MARTINEZ@NANDE.LOCAL")!.owned).toBe(true);

    // 2) Lore tiene GenericAll sobre SVC-SQL → tomarla
    dir.abuse("LORE.MARTINEZ@NANDE.LOCAL", "SVC-SQL@NANDE.LOCAL");
    // 3) SVC-SQL AdminTo DB01
    dir.abuse("SVC-SQL@NANDE.LOCAL", "DB01@NANDE.LOCAL");
    // 4) En DB01 hay sesión de ADMIN-SQL → robar
    dir.abuse("DB01@NANDE.LOCAL", "ADMIN-SQL@NANDE.LOCAL");

    // ADMIN-SQL es MemberOf Domain Admins → heredado al poseerlo.
    expect(dir.domainOwned()).toBe(true);
    expect(dir.pathToDomainAdmins()).toBeNull(); // ya no hay ruta: llegaste
  });

  it("desde la terminal: kerberoast → crack → NandeBlood ve la cuenta poseída", () => {
    resetStorage();
    seedRandom();
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    term.execute("kerberoast SVC-SQL@NANDE.LOCAL");
    const out = term.execute("crack-tgs SVC-SQL@NANDE.LOCAL Verano2024!");
    expect(out).toContain("crackeada");
    expect(kernel.directory.get("SVC-SQL@NANDE.LOCAL")!.owned).toBe(true);

    const blood = term.execute("nandeblood");
    expect(blood).toContain("SVC-SQL@NANDE.LOCAL");
    expect(blood).toContain("🔴"); // marcado como poseído
  });

  it("comprometer el dominio desde la terminal captura la bandera", () => {
    resetStorage();
    seedRandom();
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    term.execute("abuse MESA-AYUDA@NANDE.LOCAL LORE.MARTINEZ@NANDE.LOCAL");
    term.execute("abuse LORE.MARTINEZ@NANDE.LOCAL SVC-SQL@NANDE.LOCAL");
    term.execute("abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL");
    const out = term.execute("abuse DB01@NANDE.LOCAL ADMIN-SQL@NANDE.LOCAL");

    expect(kernel.directory.domainOwned()).toBe(true);
    expect(out).toContain("ND{dominio_comprometido}");
    // La bandera queda en el historial del jugador (consecuencia real).
    expect(kernel.player.capturedFlags()).toContain("ND{dominio_comprometido}");
  });
});
