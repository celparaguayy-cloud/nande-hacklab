import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Purple Team (tanda 19)", () => {
  const host = "purple.nande";
  it("responder bien las 5 preguntas aprueba el ejercicio", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    expect(k.browser.isWebApp(host)).toBe(true);
    const url = "/evaluar?que=" + encodeURIComponent("inyección sql union") +
      "&deteccion=" + encodeURIComponent("401 repetidos en los logs") +
      "&evidencia=" + encodeURIComponent("la consulta union en el registro") +
      "&control=" + encodeURIComponent("sin consultas parametrizadas ni rate limit") +
      "&mejora=" + encodeURIComponent("prepared statements, bcrypt y waf");
    expect(k.browser.request("GET", host, url).response.body).toContain("ND{purple_team}");
  });
  it("respuestas incompletas no aprueban", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const flojo = k.browser.request("GET", host, "/evaluar?que=phishing&deteccion=?&evidencia=?&control=?&mejora=?");
    expect(flojo.response.body).not.toContain("ND{purple_team}");
  });
});
