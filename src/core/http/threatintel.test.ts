import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Threat Intelligence (tanda 14)", () => {
  const host = "ti.nande";
  it("atribuir con un IOC de alta confianza al actor correcto da la bandera", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    expect(k.browser.isWebApp(host)).toBe(true);
    const ok = k.browser.request("GET", host, "/atribuir?ioc=" + encodeURIComponent("update.badcorp.invalid") + "&actor=GRIS+FANTASMA");
    expect(ok.response.body).toContain("ND{ti_atribucion}");
  });
  it("atribuir con un rumor de baja confianza NO da la bandera y advierte", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const rumor = k.browser.request("GET", host, "/atribuir?ioc=203.0.113.66&actor=GRIS+FANTASMA");
    expect(rumor.response.body).not.toContain("ND{ti_atribucion}");
    expect(rumor.response.body.toLowerCase()).toContain("confianza baja");
  });
});
