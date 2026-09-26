import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Reputación unificada: una sola fuente de verdad para el "cuánto valés" del
 * jugador, sumando lo ofensivo (notoriedad) y lo defensivo (Blue Team). Antes
 * la defensa no contaba en ningún ranking; este test fija que ahora sí, y que
 * el total es exactamente ofensiva + defensa (sin dobles conteos ni magia).
 */
describe("reputation() — ofensiva + defensa en un solo perfil", () => {
  let kernel: VirtualKernel;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("arranca en cero y es la suma de sus partes", () => {
    const r0 = kernel.reputation();
    expect(r0).toEqual({ offensive: 0, defensive: 0, total: 0 });
  });

  it("ganar notoriedad (ofensiva) sube la reputación", () => {
    kernel.notoriety.addNotoriety(120);
    const r = kernel.reputation();
    expect(r.offensive).toBe(120);
    expect(r.total).toBe(r.offensive + r.defensive);
  });

  it("contener un incidente (defensa) también cuenta en la reputación", () => {
    const inc = kernel.threats.maybeAttack(100)!;
    const before = kernel.reputation().defensive;
    const res = kernel.threats.contain(inc.id, 101);
    expect(res.ok).toBe(true);
    const r = kernel.reputation();
    expect(r.defensive).toBeGreaterThan(before); // la defensa suma
    expect(r.total).toBe(r.offensive + r.defensive); // total = ofensiva + defensa
  });

  it("ofensiva y defensa se combinan en el total (perfil único)", () => {
    kernel.notoriety.addNotoriety(50);
    const inc = kernel.threats.maybeAttack(200)!;
    kernel.threats.contain(inc.id, 201);
    const r = kernel.reputation();
    expect(r.offensive).toBe(50);
    expect(r.defensive).toBeGreaterThan(0);
    expect(r.total).toBe(r.offensive + r.defensive);
  });
});
