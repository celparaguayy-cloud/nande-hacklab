import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Blue Team: análisis forense (tanda 6)", () => {
  it("identificar bien la IP y la técnica del ataque da la bandera", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "soc.nande";
    expect(k.browser.isWebApp(host)).toBe(true);
    // Los logs muestran la intrusión.
    expect(k.browser.request("GET", host, "/logs").response.body).toContain("UNION");
    // Reporte correcto: IP del atacante + técnica SQLi.
    const ok = k.browser.request("GET", host, "/reportar?ip=10.10.66.13&tecnica=" + encodeURIComponent("inyección SQL"));
    expect(ok.response.body).toContain("ND{forense_intrusion}");
    // Reporte incorrecto: no da bandera.
    const bad = k.browser.request("GET", host, "/reportar?ip=10.10.4.7&tecnica=phishing");
    expect(bad.response.body).not.toContain("ND{forense_intrusion}");
  });
});
