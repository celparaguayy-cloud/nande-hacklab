import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Blue Team: SOC completo (tanda 7)", () => {
  const host = "soc.nande";

  it("triage: abrir la alerta real (no un falso positivo) da la bandera", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    expect(k.browser.isWebApp(host)).toBe(true);
    const real = k.browser.request("GET", host, "/triage?id=A3");
    expect(real.response.body).toContain("ND{soc_triage}");
    const falso = k.browser.request("GET", host, "/triage?id=A1");
    expect(falso.response.body).not.toContain("ND{soc_triage}");
  });

  it("SIEM: buscar por la IP del atacante correlaciona toda su cadena", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const ok = k.browser.request("GET", host, "/siem?q=10.10.66.13");
    expect(ok.response.body).toContain("ND{siem_correlacion}");
    const nope = k.browser.request("GET", host, "/siem?q=10.10.4.7");
    expect(nope.response.body).not.toContain("ND{siem_correlacion}");
  });

  it("DFIR: reconstruir primer paso + causa raíz da la bandera", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const ok = k.browser.request("GET", host, "/incidente?primero=fuerza+bruta&causa=inyeccion+sql");
    expect(ok.response.body).toContain("ND{dfir_timeline}");
    const bad = k.browser.request("GET", host, "/incidente?primero=phishing&causa=malware");
    expect(bad.response.body).not.toContain("ND{dfir_timeline}");
  });

  it("compatibilidad: el reporte directo sigue dando la bandera forense", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const ok = k.browser.request("GET", host, "/reportar?ip=10.10.66.13&tecnica=" + encodeURIComponent("inyección SQL"));
    expect(ok.response.body).toContain("ND{forense_intrusion}");
  });
});
