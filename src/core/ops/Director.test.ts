import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * SimulationDirector — el motor que MUEVE el juego. Pruebas de REALIDAD: en
 * "vivo", la campaña del adversario avanza SOLA con el latido (pulse), contra
 * reloj; en "pausa" (por defecto) no se mueve nada (no altera el juego base).
 * La contención del jugador sigue bloqueando al adversario aunque corra el
 * tiempo (el tiempo es el enemigo, pero la defensa manda).
 */
describe("SimulationDirector — el latido que mueve el mundo vivo", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("por defecto está en PAUSA: el latido NO mueve la campaña", () => {
    expect(kernel.director.tempo()).toBe("paused");
    kernel.adversary.start("ana-reta");
    for (let t = 1; t <= 300; t += 1) kernel.director.pulse(t);
    expect(kernel.adversary.state().idx).toBe(0); // no avanzó
  });

  it("en VIVO, la campaña avanza sola con el latido (contra reloj)", () => {
    kernel.adversary.start("ana-reta");
    kernel.director.setTempo("fast"); // ~cada 12 ticks
    // Late el mundo un rato: el adversario debe progresar solo.
    for (let t = 1; t <= 200; t += 1) kernel.director.pulse(t);
    const st = kernel.adversary.state();
    expect(st.idx).toBeGreaterThan(0);
    // Con suficientes latidos y sin defensa, cumple el objetivo.
    expect(st.status).toBe("succeeded");
    // Las técnicas se detectaron en el camino (SOC vio la campaña en vivo).
    expect(kernel.soc.count()).toBeGreaterThan(0);
  });

  it("la defensa manda: contener frena la campaña aunque el reloj corra", () => {
    kernel.adversary.start("ana-reta");
    kernel.director.setTempo("fast");
    kernel.containment.disableAccount("SVC-SQL@NANDE.LOCAL"); // corta la cadena
    for (let t = 1; t <= 300; t += 1) kernel.director.pulse(t);
    const st = kernel.adversary.state();
    expect(st.status).toBe("blocked");
    expect(kernel.directory.domainOwned()).toBe(false);
  });

  it("el latido REAL del kernel mueve la campaña cuando el director está vivo", () => {
    kernel.adversary.start("ana-reta");
    kernel.director.setTempo("fast");
    // El heartbeat real del kernel (tick) debe pulsar al director.
    for (let i = 0; i < 250; i += 1) kernel.tick();
    expect(kernel.adversary.state().idx).toBeGreaterThan(0);
  });

  it("por terminal: director live cambia el tempo y el tablero lo refleja", () => {
    expect(term.execute("director live")).toMatch(/EN VIVO/);
    expect(kernel.director.tempo()).not.toBe("paused");
    expect(term.execute("director")).toMatch(/mundo vivo|Tempo/);
    term.execute("director pause");
    expect(kernel.director.tempo()).toBe("paused");
  });
});
