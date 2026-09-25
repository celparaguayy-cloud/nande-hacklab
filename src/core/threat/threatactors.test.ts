import { beforeEach, describe, expect, it } from "vitest";
import { THREAT_ACTORS, actorAliases, findActor } from "./ThreatActors";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Coherencia del CAST de amenazas (regla 2/8/16). Antes había tres listas
 * desconectadas de adversarios; ahora hay una sola. Este test cierra el lazo
 * aprender↔jugar: el actor que te ataca (data center / kill-chain) es
 * EXACTAMENTE el que aparece documentado en la plataforma de Threat Intelligence
 * y el que podés atribuir. Si alguien vuelve a inventar un atacante fuera del
 * registro, o la atribución deja de funcionar, este test lo caza.
 */
describe("Actores de amenaza — una sola fuente de verdad", () => {
  let kernel: VirtualKernel;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("el registro tiene actores bien formados con IOCs ficticios (.invalid/mutex)", () => {
    expect(THREAT_ACTORS.length).toBeGreaterThanOrEqual(2);
    for (const a of THREAT_ACTORS) {
      expect(a.alias.length).toBeGreaterThan(0);
      expect(a.infra.length).toBeGreaterThan(0);
      // Nada de infraestructura real: dominios .invalid o mutex en MAYÚSCULAS.
      for (const ioc of a.infra) {
        expect(/\.invalid$|^[A-Z0-9_]+$/.test(ioc), `IOC sospechoso: ${ioc}`).toBe(true);
      }
    }
  });

  it("el que ATACA tu data center es un actor DOCUMENTADO (atribuible)", () => {
    const inc = kernel.threats.maybeAttack(100);
    expect(inc).not.toBeNull();
    expect(findActor(inc!.rival), `atacante no documentado: ${inc!.rival}`).toBeTruthy();
  });

  it("el que corre la kill-chain (red team) también es un actor documentado", () => {
    const rival = kernel.redteam.rival();
    expect(findActor(rival), `atacante no documentado: ${rival}`).toBeTruthy();
    expect(actorAliases()).toContain(rival);
  });

  it("la plataforma de TI documenta a esos MISMOS actores (lazo aprender↔jugar)", () => {
    const body = kernel.browser.request("GET", "ti.nande", "/actores").response.body;
    // Cada actor del registro aparece en la plataforma de inteligencia.
    for (const a of THREAT_ACTORS) {
      expect(body).toContain(a.nombre);
    }
  });

  it("la atribución del curso sigue funcionando (no rompimos la bandera)", () => {
    const ok = kernel.browser.request(
      "GET",
      "ti.nande",
      "/atribuir?ioc=" + encodeURIComponent("update.badcorp.invalid") + "&actor=GRIS+FANTASMA",
    );
    expect(ok.response.body).toContain("ND{ti_atribucion}");
  });
});
