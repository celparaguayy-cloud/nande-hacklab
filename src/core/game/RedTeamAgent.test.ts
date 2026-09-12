import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { REDTEAM_TARGET } from "./RedTeamAgent";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Red team autónomo — pruebas de REALIDAD. El adversario NPC no simula: corre
 * operaciones reales del runtime que otros subsistemas detectan de verdad.
 * Anti-mock: la kill-chain cambia el estado del host y enciende el MITRE.
 */
describe("RedTeamAgent — el adversario ataca de verdad", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  /** Corre la kill-chain completa (recon → brute×4 → access → impact). */
  const runChain = () => {
    for (let i = 0; i < 8 && !kernel.redteam.compromised(); i += 1) {
      kernel.redteam.act(100 + i);
    }
  };

  it("la cadena termina tirando el servicio real del objetivo", () => {
    runChain();
    expect(kernel.redteam.compromised()).toBe(true);
    const host = kernel.hosts.byHost(REDTEAM_TARGET)!;
    const nginx = host.services.find((s) => s.name === "nginx")!;
    expect(nginx.state).toBe("stopped"); // impacto real
  });

  it("sus fallos de login encienden T1110 en el correlador MITRE", () => {
    runChain();
    const ids = kernel.mitre.techniques().map((t) => t.mitreId);
    expect(ids).toContain("T1110"); // Brute Force detectado solo
    expect(ids).toContain("T1489"); // Service Stop por el impacto
  });

  it("el SOC ve la caída del servicio provocada por el adversario", () => {
    const before = kernel.soc.count();
    runChain();
    expect(kernel.soc.count()).toBeGreaterThan(before);
  });

  it("expulsar restaura el servicio y rota al siguiente rival", () => {
    const rival1 = kernel.redteam.rival();
    runChain();
    const out = term.execute("redteam expulsar");
    expect(out).toContain("restaurado");

    const host = kernel.hosts.byHost(REDTEAM_TARGET)!;
    const nginx = host.services.find((s) => s.name === "nginx")!;
    expect(nginx.state).toBe("running"); // restaurado de verdad

    expect(kernel.redteam.rival()).not.toBe(rival1); // rotó de rival
    expect(kernel.redteam.currentPhase()).toBe("recon"); // reinició
  });
});
