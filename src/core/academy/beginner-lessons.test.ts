import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { LESSONS } from "./Lessons";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Reality test de las lecciones "cero absoluto": se juegan de punta a punta
 * con la terminal REAL. Si los comandos que enseñan no producen la salida que
 * el check espera, el test falla — así garantizamos que enseñan algo que de
 * verdad funciona en el sandbox, no un guion inventado.
 */
describe("lecciones desde cero — verificadas contra la terminal real", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("existen las tres lecciones cero, al principio del catálogo", () => {
    const ids = LESSONS.slice(0, 3).map((l) => l.id);
    expect(ids).toEqual(["l-cero-consola", "l-cero-mirar", "l-cero-moverse"]);
  });

  it("cero-consola: whoami + pwd la completan", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);
    term.execute("learn l-cero-consola");
    term.execute("whoami");
    const done = term.execute("pwd");
    expect(done).toContain("Lección completada");
    kernel.dispose();
  });

  it("cero-mirar: ls + cat bienvenida.txt la completan", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);
    term.execute("learn l-cero-mirar");
    term.execute("ls");
    const done = term.execute("cat bienvenida.txt");
    expect(done).toContain("Lección completada");
    kernel.dispose();
  });

  it("cero-moverse: cd documentos + pwd la completan", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);
    term.execute("learn l-cero-moverse");
    term.execute("cd documentos");
    const done = term.execute("pwd");
    expect(done).toContain("Lección completada");
    kernel.dispose();
  });
});
