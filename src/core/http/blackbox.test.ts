import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Examen final ÑANDE Blackbox (tanda 9)", () => {
  const host = "blackbox.nande";

  it("el rastro de investigación lleva del recon a la evidencia", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    expect(k.browser.isWebApp(host)).toBe(true);
    // recon: robots revela rutas ocultas
    expect(k.browser.request("GET", host, "/robots.txt").response.body).toContain("/api/clientes");
    // IDOR: id=42 expone la cuenta interna
    expect(k.browser.request("GET", host, "/api/clientes?id=42").response.body).toContain("admin.interno");
    // evidencia: el access.log muestra la exfiltración
    expect(k.browser.request("GET", host, "/respaldos/access.log").response.body).toContain("clientes-2024.sql");
  });

  it("un informe correcto aprueba el examen; uno flojo no", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const ok = k.browser.request("GET", host,
      "/informe?vuln=idor&causa=" + encodeURIComponent("falta de autorización") +
      "&impacto=" + encodeURIComponent("exfiltración de la base de clientes") +
      "&mitigacion=" + encodeURIComponent("validar permisos en el servidor"));
    expect(ok.response.body).toContain("ND{blackbox_aprobado}");

    const flojo = k.browser.request("GET", host, "/informe?vuln=xss&causa=?&impacto=?&mitigacion=?");
    expect(flojo.response.body).not.toContain("ND{blackbox_aprobado}");
  });
});
