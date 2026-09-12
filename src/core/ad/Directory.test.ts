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
