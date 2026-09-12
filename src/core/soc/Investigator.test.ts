import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { REDTEAM_TARGET } from "../game/RedTeamAgent";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * DFIR — pruebas de REALIDAD. La reconstrucción no es un guion: sale de los
 * eventos que el mundo recordó. Anti-mock: primero ocurre un ataque real
 * (kill-chain del red team) y DESPUÉS el investigador lo reconstruye con sus
 * técnicas y hosts verdaderos.
 */
describe("Investigator (DFIR) — reconstruye desde eventos reales", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("sin actividad, no hay incidente que investigar", () => {
    expect(kernel.dfir.reconstruct()).toBeNull();
  });

  it("tras el ataque del red team, reconstruye el incidente con sus técnicas", () => {
    // Kill-chain real completa del adversario NPC.
    for (let i = 0; i < 8 && !kernel.redteam.compromised(); i += 1) {
      kernel.redteam.act(100 + i);
    }
    const inc = kernel.dfir.reconstruct();
    expect(inc).not.toBeNull();
    expect(inc!.hostsAffected).toContain(REDTEAM_TARGET);
    // La fuerza bruta y el impacto quedaron mapeados a MITRE.
    expect(inc!.techniques).toContain("T1110");
    expect(inc!.severity).toBe("high"); // hubo servicio caído
    // La línea de tiempo está ordenada en el tiempo.
    const ticks = inc!.timeline.map((e) => e.tick);
    expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
  });

  it("el veredicto refleja el patrón real (brute force + impacto)", () => {
    for (let i = 0; i < 8 && !kernel.redteam.compromised(); i += 1) {
      kernel.redteam.act(200 + i);
    }
    const inc = kernel.dfir.reconstruct()!;
    expect(inc.verdict.toLowerCase()).toContain("impacto");
  });

  it("desde la terminal, 'dfir' muestra la reconstrucción con evidencia", () => {
    for (let i = 0; i < 8 && !kernel.redteam.compromised(); i += 1) {
      kernel.redteam.act(300 + i);
    }
    const out = term.execute("dfir");
    expect(out).toContain("reconstrucción del incidente");
    expect(out).toContain(REDTEAM_TARGET);
    expect(out).toContain("T1110");
  });
});
