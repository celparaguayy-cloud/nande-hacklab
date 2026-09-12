import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

describe("foro.nande — foro navegable del mundo", () => {
  let kernel: VirtualKernel;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("la portada lista hilos con enlaces a cada uno", () => {
    const page = kernel.browser.open("foro.nande", "/");
    expect(page.content).toContain("Foro Tapé");
    expect(page.content).toContain('href="/t/t0"');
  });

  it("un hilo muestra su contenido y respuestas", () => {
    const page = kernel.browser.open("foro.nande", "/t/t0");
    expect(page.content).toContain("vistas");
    expect(page.content).toContain("forum-thread");
    expect(page.content).toContain("Volver al foro");
  });

  it("un hilo inexistente no se puede abrir", () => {
    expect(kernel.browser.canOpen("foro.nande", "/t/t999")).toBe(false);
  });

  it("es determinista: misma seed, mismos hilos", () => {
    const a = kernel.browser.open("foro.nande", "/").content;
    resetStorage();
    seedRandom();
    const b = new VirtualKernel().browser.open("foro.nande", "/").content;
    expect(a).toBe(b);
  });
});
