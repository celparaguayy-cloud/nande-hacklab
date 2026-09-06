import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { RANKS, rankForLevel } from "./Progression";
import { resetStorage, seedRandom } from "../../test/setup";

// La app "ÑANDE Learn" muestra la escalera de rangos y arranca lecciones
// mandando el comando a la terminal por kernel.queueCommand().
describe("ÑANDE Learn", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("la escalera de rangos va de menor a mayor nivel", () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].minLevel).toBeGreaterThan(RANKS[i - 1].minLevel);
    }
  });

  it("rankForLevel devuelve el rango correcto según el nivel", () => {
    expect(rankForLevel(1).name).toBe("Novato");
    expect(rankForLevel(2).name).toBe("Novato");
    expect(rankForLevel(3).name).toBe("Aprendiz");
    expect(rankForLevel(6).name).toBe("Auditor");
    expect(rankForLevel(15).name).toBe("Hacker");
    expect(rankForLevel(21).name).toBe("Élite");
    expect(rankForLevel(999).name).toBe("Leyenda");
  });

  it("queueCommand deja el comando pendiente y avisa a la terminal", () => {
    const kernel = new VirtualKernel();
    let recibido = "";

    const off = kernel.events.subscribe<{ command: string }>(
      "terminal.run",
      (event) => {
        recibido = event.data.command;
      },
    );

    kernel.queueCommand("learn l-nmap");

    expect(kernel.pendingCommand).toBe("learn l-nmap");
    expect(recibido).toBe("learn l-nmap");

    off();
  });
});
