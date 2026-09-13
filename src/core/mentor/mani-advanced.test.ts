import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * La Mani AVANZADA: la ÚNICA ayuda ahora que los labs no tienen pistas. Sabe en
 * qué sitio estás y da una escalera técnica (pensamiento → método → técnica →
 * comando exacto), enseñando el porqué.
 */
describe("Mani avanzada — ayuda por sitio, en escalera", () => {
  let kernel: VirtualKernel;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("conoce los laboratorios principales y no inventa para sitios random", () => {
    expect(kernel.mentor.knowsSite("blog.yvoty.nande")).toBe(true);
    expect(kernel.mentor.knowsSite("banco.nande")).toBe(true);
    expect(kernel.mentor.knowsSite("sitio-inexistente.nande")).toBe(false);
    expect(kernel.mentor.adviseForSite("sitio-inexistente.nande", 0)).toBeNull();
  });

  it("la escalera concreta la ayuda: el último escalón trae el comando", () => {
    const l0 = kernel.mentor.adviseForSite("blog.yvoty.nande", 0)!;
    const l3 = kernel.mentor.adviseForSite("blog.yvoty.nande", 3)!;
    expect(l0.text).not.toContain("curl");
    expect(l0.command).toBeUndefined();
    expect(l3.command).toContain("curl");
    expect(l3.topic).toBe("xss");
  });

  it("el navegador recuerda el sitio actual (contexto para La Mani)", () => {
    kernel.browser.request("GET", "fotos.arandu.nande", "/");
    expect(kernel.browser.currentSite()).toBe("fotos.arandu.nande");
    const adv = kernel.mentor.adviseForSite(kernel.browser.currentSite(), 2)!;
    expect(adv.topic).toBe("idor");
  });
});
