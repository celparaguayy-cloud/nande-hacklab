import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Amenazas vivas + Defensa (Blue Team jugable): un ataque tira un servicio de
 * tu data center (evento real → alerta del SOC); contenerlo lo restaura y
 * suma puntos. Anti-mock: efectos cruzados reales, no textos.
 */
describe("ThreatEngine — el mundo ataca y vos defendés", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("un ataque tira un servicio del data center y genera alerta en el SOC", () => {
    const socAntes = kernel.soc.count();
    const inc = kernel.threats.maybeAttack(100);
    expect(inc).not.toBeNull();

    // El servicio atacado quedó caído (efecto real en el HostRuntime).
    const host = kernel.hosts.byHost("midc.nande")!;
    const svc = host.services.find((s) => s.name === inc!.service)!;
    expect(svc.state).toBe("stopped");

    // El SOC lo vio como alerta (misma verdad, eventos reales).
    expect(kernel.soc.count()).toBeGreaterThan(socAntes);
  });

  it("contener restaura el servicio y suma puntos", () => {
    const inc = kernel.threats.maybeAttack(100)!;
    const out = term.execute(`contener ${inc.id}`);
    expect(out).toContain("restaurado");

    const host = kernel.hosts.byHost("midc.nande")!;
    const svc = host.services.find((s) => s.name === inc.service)!;
    expect(svc.state).toBe("running"); // restaurado

    expect(kernel.threats.scoreState().score).toBeGreaterThan(0);
    expect(kernel.threats.scoreState().contained).toBe(1);
  });

  it("no encima dos ataques a la vez (uno abierto a la vez)", () => {
    expect(kernel.threats.maybeAttack(100)).not.toBeNull();
    expect(kernel.threats.maybeAttack(110)).toBeNull(); // ya hay uno abierto
  });

  it("responder rápido puntúa más que tarde", () => {
    resetStorage(); seedRandom();
    const k1 = new VirtualKernel();
    const i1 = k1.threats.maybeAttack(100)!;
    const p1 = k1.threats.contain(i1.id, 105).points!; // 5 ticks

    resetStorage(); seedRandom();
    const k2 = new VirtualKernel();
    const i2 = k2.threats.maybeAttack(100)!;
    const p2 = k2.threats.contain(i2.id, 190).points!; // 90 ticks
    expect(p1).toBeGreaterThan(p2);
  });
});
