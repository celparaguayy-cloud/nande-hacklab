import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * ContainmentEngine (respuesta a incidentes) — pruebas de REALIDAD. La
 * contención no es un botón: cambia el estado del mundo. Aislar un host corta
 * el pivoteo de verdad (la MISMA regla de alcance lo respeta), y deshabilitar
 * una cuenta corta su autenticación y sus privilegios de verdad. El plan se
 * deriva del estado real (qué comprometió el atacante), no de un guion.
 */
describe("ContainmentEngine — respuesta a incidentes con efecto real", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("aislar un host corta el pivoteo REAL (rompe el movimiento lateral)", () => {
    const h = kernel.hosts;
    // Antes: desde el NAS se pivotea a la base central del segmento restringido.
    expect(h.canReach("nas.interna.nande", "db-core.interna.nande")).toBe(true);
    expect(h.canReach("server.nande", "nas.interna.nande")).toBe(true);

    const r = kernel.containment.isolateHost("nas.interna.nande");
    expect(r.ok).toBe(true);

    // Después: el NAS aislado ya no es alcanzable NI sirve de pivote.
    expect(h.canReach("server.nande", "nas.interna.nande")).toBe(false);
    expect(h.canReach("nas.interna.nande", "db-core.interna.nande")).toBe(false);
    expect(kernel.containment.isolatedHosts()).toContain("nas.interna.nande");

    // Reversible: reintegrar restaura el alcance.
    expect(kernel.containment.releaseHost("nas.interna.nande").ok).toBe(true);
    expect(h.canReach("nas.interna.nande", "db-core.interna.nande")).toBe(true);
  });

  it("deshabilitar una cuenta comprometida corta su uso (abuse/login/PtH fallan)", () => {
    const dir = kernel.directory;
    dir.own("SVC-SQL@NANDE.LOCAL"); // el atacante la posee
    // Antes de contener, la cuenta poseída sí puede abusar su AdminTo.
    expect(dir.isDisabled("SVC-SQL@NANDE.LOCAL")).toBe(false);

    const r = kernel.containment.disableAccount("SVC-SQL@NANDE.LOCAL");
    expect(r.ok).toBe(true);
    expect(dir.isDisabled("SVC-SQL@NANDE.LOCAL")).toBe(true);

    // Ya no puede usar privilegios ni autenticarse.
    expect(dir.abuse("SVC-SQL@NANDE.LOCAL", "DB01@NANDE.LOCAL").ok).toBe(false);
    expect(dir.smbLogin("svc-sql", "Verano2024!").ok).toBe(false);
    expect(dir.kerberoast("SVC-SQL@NANDE.LOCAL").ok).toBe(false);

    // Rehabilitar la devuelve.
    expect(kernel.containment.enableAccount("SVC-SQL@NANDE.LOCAL").ok).toBe(true);
    expect(dir.isDisabled("SVC-SQL@NANDE.LOCAL")).toBe(false);
  });

  it("recommend() arma el plan desde el estado real (pivotes y DA primero)", () => {
    // El atacante tomó un host pivote y una cuenta de dominio.
    kernel.compromises.record({
      hostname: "nas.interna.nande", ip: "10.10.66.20", os: "ÑandeNAS", user: "respaldo", level: "user", via: "server.nande",
    });
    kernel.directory.own("SVC-SQL@NANDE.LOCAL");

    const plan = kernel.containment.recommend();
    const nas = plan.find((r) => r.target === "nas.interna.nande");
    expect(nas).toBeDefined();
    expect(nas!.action).toBe("isolate-host");
    expect(nas!.priority).toBe(1); // es pivote hacia db-core
    expect(plan.some((r) => r.target === "SVC-SQL@NANDE.LOCAL" && r.action === "disable-account")).toBe(true);
    // El foothold inicial del atacante (JUGADOR) NO se recomienda deshabilitar.
    expect(plan.some((r) => r.target === "JUGADOR@NANDE.LOCAL")).toBe(false);
  });

  it("contain auto aplica el plan completo (aísla y deshabilita de verdad)", () => {
    kernel.compromises.record({
      hostname: "nas.interna.nande", ip: "10.10.66.20", os: "ÑandeNAS", user: "respaldo", level: "user", via: "server.nande",
    });
    kernel.directory.own("SVC-SQL@NANDE.LOCAL");

    const out = term.execute("contain auto");
    expect(out).toContain("AISLADO");
    expect(out).toContain("DESHABILITADA");
    expect(kernel.hosts.isIsolated("nas.interna.nande")).toBe(true);
    expect(kernel.directory.isDisabled("SVC-SQL@NANDE.LOCAL")).toBe(true);
  });

  it("por terminal: contain host/release y el plan reflejan el estado", () => {
    const iso = term.execute("contain host nas.interna.nande");
    expect(iso).toContain("AISLADO");
    expect(kernel.hosts.isIsolated("nas.interna.nande")).toBe(true);

    const status = term.execute("contain");
    expect(status).toContain("nas.interna.nande"); // aparece en "Aislados"

    term.execute("contain release nas.interna.nande");
    expect(kernel.hosts.isIsolated("nas.interna.nande")).toBe(false);
  });

  it("la contención queda registrada y el SOC la ve como evidencia", () => {
    const before = kernel.soc.count();
    kernel.containment.isolateHost("nas.interna.nande");
    expect(kernel.soc.count()).toBeGreaterThan(before); // el SOC ingirió el evento
    expect(kernel.containment.actions().some((a) => a.kind === "host.isolate")).toBe(true);
  });
});
