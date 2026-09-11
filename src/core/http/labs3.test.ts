import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

describe("labs de ataque (tanda 3)", () => {
  it("CSRF: una transferencia sin token anti-CSRF revela la bandera", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "m.banco-justicia.nande";
    expect(k.browser.isWebApp(host)).toBe(true);
    k.browser.request("GET", host, "/"); // inicia sesión (deja cookie)
    const res = k.browser.request("GET", host, "/transferir?para=atacante&monto=99999");
    expect(res.response.body).toContain("ND{csrf_transferencia}");
  });

  it("LFI: incluir la config con ../ filtra secretos", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "portal.nova.nande";
    const res = k.browser.request("GET", host, "/?pg=" + encodeURIComponent("../../config/secretos.env"));
    expect(res.response.body).toContain("ND{lfi_config_incluida}");
    const ok = k.browser.request("GET", host, "/?pg=inicio");
    expect(ok.response.body).not.toContain("ND{");
  });

  it("Subida sin restringir: un .php subido se ejecuta al abrirlo", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "files.bytebox.nande";
    k.browser.request("POST", host, "/subir", { nombre: "shell.php", contenido: "x" });
    const res = k.browser.request("GET", host, "/subidas/shell.php");
    expect(res.response.body).toContain("ND{upload_webshell}");
    // Un archivo inocuo NO se ejecuta.
    k.browser.request("POST", host, "/subir", { nombre: "foto.png", contenido: "img" });
    const png = k.browser.request("GET", host, "/subidas/foto.png");
    expect(png.response.body).not.toContain("ND{");
  });

  it("Deserialización: una sesión con rol admin da acceso de admin", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "cuenta.redix.nande";
    const payload = btoa('{"usuario":"admin","rol":"admin"}');
    const res = k.browser.request("GET", host, "/?sesion=" + encodeURIComponent(payload));
    expect(res.response.body).toContain("ND{deserializacion_insegura}");
    const user = k.browser.request("GET", host, "/");
    expect(user.response.body).not.toContain("ND{deserializacion_insegura}");
  });
});
