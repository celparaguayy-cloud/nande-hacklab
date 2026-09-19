import { beforeEach, describe, expect, it } from "vitest";
import { RETOS } from "./Tracks";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Anti-mock de los RETOS: cada desafío tiene que ser REALMENTE completable.
 * Ejecutamos sus pasos, en orden, contra el motor de verdad (kernel+terminal)
 * y exigimos que la bandera prometida quede capturada. Si un reto deja de ser
 * resoluble (un cambio de motor, una URL, una credencial), este test lo caza
 * antes que el alumno se frustre.
 *
 * Los pasos son comandos de terminal (curl, hydra, la cadena de aircrack, etc.)
 * que golpean el mismo mundo que ve el jugador.
 */
describe("Retos — completables de punta a punta", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  for (const reto of RETOS) {
    it(`${reto.id} captura ${reto.flag}`, () => {
      for (const step of reto.steps) {
        term.execute(step);
      }
      expect(
        kernel.player.capturedFlags(),
        `el reto ${reto.id} debería capturar ${reto.flag} corriendo sus pasos`,
      ).toContain(reto.flag);
    });
  }
});
