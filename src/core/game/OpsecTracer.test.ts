import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * OPSEC tracer — pruebas de REALIDAD. Atacar es ruidoso: si no enrutás por la
 * red de anonimato, tu IP real queda expuesta y el calor sube de verdad; con
 * Tor, el mundo sólo ve el nodo de salida. Anti-mock: el mismo ataque produce
 * distinto rastro según tu OPSEC, y el calor cambia el estado del jugador.
 */
describe("OpsecTracer — el mundo te rastrea", () => {
  let kernel: VirtualKernel;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("atacar sin anonimato te expone y sube el calor", () => {
    expect(kernel.anonymity.isTorEnabled()).toBe(false);
    const heat0 = kernel.notoriety.getState().heat;

    kernel.directory.kerberoast("SVC-SQL@NANDE.LOCAL"); // técnica ruidosa real

    const s = kernel.opsec.state();
    expect(s.exposedCount).toBe(1);
    expect(s.maskedCount).toBe(0);
    expect(kernel.notoriety.getState().heat).toBeGreaterThan(heat0);
    expect(kernel.opsec.atRisk()).toBe(true);
  });

  it("con Tor activo, el mismo ataque queda enmascarado (ve el nodo de salida)", () => {
    kernel.anonymity.enableTor();
    kernel.directory.kerberoast("SVC-SQL@NANDE.LOCAL");

    const s = kernel.opsec.state();
    expect(s.maskedCount).toBe(1);
    expect(s.exposedCount).toBe(0);
    const trace = kernel.opsec.timeline(1)[0];
    expect(trace.exposed).toBe(false);
    // El origen visto NO es la IP real del jugador.
    expect(trace.seenSource).not.toBe("10.10.0.5");
    expect(kernel.opsec.atRisk()).toBe(false);
  });

  it("suficiente ruido expuesto termina en redada (bust)", () => {
    // Cadena de escalada completa, toda expuesta: mucho ruido → redada.
    kernel.directory.abuse("MESA-AYUDA@NANDE.LOCAL", "LORE.MARTINEZ@NANDE.LOCAL");
    kernel.directory.abuse("LORE.MARTINEZ@NANDE.LOCAL", "SVC-SQL@NANDE.LOCAL");
    kernel.directory.abuse("SVC-SQL@NANDE.LOCAL", "DB01@NANDE.LOCAL");
    kernel.directory.abuse("DB01@NANDE.LOCAL", "ADMIN-SQL@NANDE.LOCAL");
    for (let i = 0; i < 6; i += 1) {
      kernel.directory.kerberoast("SVC-SQL@NANDE.LOCAL");
    }
    expect(kernel.opsec.state().busts).toBeGreaterThan(0);
  });

  it("una explotación web sin anonimato también te expone (coherencia con el SOC)", () => {
    expect(kernel.anonymity.isTorEnabled()).toBe(false);
    kernel.browser.request("GET", "tools.pyta.nande", "/ping?host=x; cat flag", {});
    const s = kernel.opsec.state();
    expect(s.exposedCount).toBeGreaterThan(0);
    expect(kernel.opsec.atRisk()).toBe(true);
  });

  it("con Tor, la misma explotación web queda enmascarada", () => {
    kernel.anonymity.enableTor();
    kernel.browser.request("GET", "tools.pyta.nande", "/ping?host=x; cat flag", {});
    const s = kernel.opsec.state();
    expect(s.maskedCount).toBeGreaterThan(0);
    expect(s.exposedCount).toBe(0);
  });

  it("tráfico web benigno no deja rastro OPSEC (sin falsos positivos)", () => {
    kernel.browser.request("GET", "blog.yvoty.nande", "/buscar?q=hola", {});
    expect(kernel.opsec.state().exposedCount).toBe(0);
  });
});
