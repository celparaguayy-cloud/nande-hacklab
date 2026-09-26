import { beforeEach, describe, expect, it } from "vitest";
import { THREAT_ACTORS, actorAliases, findActor } from "./ThreatActors";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
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

  it("el ataque deja un IOC del actor (evidencia real) y se surfacea en defensa", () => {
    const inc = kernel.threats.maybeAttack(100)!;
    expect(inc.ioc, "el incidente debería traer un IOC").toBeTruthy();
    const actor = findActor(inc.rival)!;
    // El IOC pertenece de verdad a la infraestructura de ese actor.
    expect(actor.infra.map((i) => i.toLowerCase())).toContain(inc.ioc!.toLowerCase());
    // El comando 'defensa' muestra el IOC y guía a atribuir en TI.
    const out = new VirtualTerminal(kernel).execute("defensa");
    expect(out).toContain(inc.ioc!);
    expect(out).toContain("ti.nande");
  });

  it("atribuir el incidente vivido (actor + su IOC) da la bandera; el actor equivocado no", () => {
    const inc = kernel.threats.maybeAttack(100)!;
    const actor = findActor(inc.rival)!;
    const attribute = (nombre: string, ioc: string) =>
      kernel.browser.request(
        "GET",
        "ti.nande",
        "/atribuir?ioc=" + encodeURIComponent(ioc) + "&actor=" + encodeURIComponent(nombre),
      ).response.body;
    // Correcto: el actor que te atacó + el IOC que dejó.
    expect(attribute(actor.nombre, inc.ioc!)).toContain("ND{ti_atribucion}");
    // Otro actor documentado, con el MISMO IOC, no cierra (correlación real).
    const otro = THREAT_ACTORS.find((a) => a.id !== actor.id)!;
    expect(attribute(otro.nombre, inc.ioc!)).not.toContain("ND{ti_atribucion}");
  });

  it("el adversario AUTÓNOMO también deja IOC y es atribuible (paridad con el data center)", () => {
    // Antes de actuar no hay incidente del adversario autónomo.
    expect(kernel.redteam.incident()).toBeNull();
    // Avanzá su kill-chain: deja el IOC de su actor y produce eventos reales.
    kernel.redteam.act(45);
    kernel.redteam.act(90);
    const inc = kernel.redteam.incident();
    expect(inc, "debería haber un incidente del adversario autónomo").toBeTruthy();
    expect(inc!.ioc, "el adversario debería dejar un IOC").toBeTruthy();
    const actor = findActor(inc!.rival)!;
    expect(actor.infra.map((i) => i.toLowerCase())).toContain(inc!.ioc!.toLowerCase());
    // El DFIR lo surfacea como indicador de amenaza (investigable).
    expect(kernel.dfir.iocs().some((i) => i.kind === "amenaza" && i.value === inc!.ioc)).toBe(true);
    // Y se atribuye en TI con el actor + su IOC (igual que el ataque al data center).
    const body = kernel.browser.request(
      "GET",
      "ti.nande",
      "/atribuir?ioc=" + encodeURIComponent(inc!.ioc!) + "&actor=" + encodeURIComponent(actor.nombre),
    ).response.body;
    expect(body).toContain("ND{ti_atribucion}");
    // Expulsarlo cierra el incidente (deja de estar en curso).
    kernel.redteam.evict(120);
    expect(kernel.redteam.incident()).toBeNull();
  });
});
