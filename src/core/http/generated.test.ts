import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("sitios de NPC hackeables", () => {
  it("un sitio sembrado es navegable Y atacable, y suelta la cuenta del dueño", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();

    // Un sitio sembrado conocido.
    const host = "arandu-software.nande";
    expect(k.browser.isWebApp(host)).toBe(true);

    // 1. Navegable: la portada trae contenido.
    const front = k.browser.request("GET", host, "/");
    expect(front.response.body.length).toBeGreaterThan(50);

    // 2. Atacable: UNION en el buscador saca usuarios + hash.
    const inj =
      "%' UNION SELECT id, usuario, password FROM usuarios -- ";
    const res = k.browser.request(
      "GET",
      host,
      `/buscar?q=${encodeURIComponent(inj)}`,
    );
    // Aparece un hash MD5 (32 hex) en la respuesta.
    expect(res.response.body).toMatch(/[0-9a-f]{32}/);
  });

  it("cadena completa por terminal: UNION saca el hash, crack lo rompe", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    const host = "yvyra-scanner.nande";

    // Sacar el hash del dueño con UNION.
    const out = t.execute(
      `curl "http://${host}/buscar?q=%25' UNION SELECT id, usuario, password FROM usuarios -- "`,
    );
    const hash = out.match(/[0-9a-f]{32}/)?.[0];
    expect(hash).toBeTruthy();

    // Crackearlo: la contraseña es débil (del diccionario) a propósito.
    const cracked = t.execute(`crack ${hash}`);
    expect(cracked).toMatch(/Contraseña:/);
  });

  it("toma de cuenta: crackeás la clave y entrás al panel privado del dueño", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    const host = "arandu-software.nande";

    // El login revela quién es el admin (usuario), no la clave.
    const loginPage = k.browser.request("GET", host, "/login");
    const user = loginPage.response.body.match(
      /usuario admin es\s*<code>([^<]+)<\/code>/,
    )?.[1];
    expect(user).toBeTruthy();

    // Sacar el hash del admin con UNION y crackearlo.
    const inj = "%' UNION SELECT id, usuario, password FROM usuarios WHERE rol='admin' -- ";
    const res = k.browser.request("GET", host, `/buscar?q=${encodeURIComponent(inj)}`);
    const hash = res.response.body.match(/[0-9a-f]{32}/)?.[0];
    expect(hash).toBeTruthy();
    const password = t.execute(`crack ${hash}`).match(/Contraseña:\s*([^\s\\]+)/)?.[1];
    expect(password).toBeTruthy();

    // Con clave incorrecta: no entra.
    const bad = k.browser.request("POST", host, "/login", {
      usuario: user!,
      password: "nope",
    });
    expect(bad.response.body).not.toContain("Billetera");

    // Con la clave crackeada: entra al panel privado (sigue la redirección).
    const ok = k.browser.request("POST", host, "/login", {
      usuario: user!,
      password: password!,
    });
    expect(ok.finalPath).toBe("/panel");
    expect(ok.response.body).toContain("Billetera");
    expect(ok.response.body).toMatch(/ND\{acceso:[^}]+\}/);
  });

  it("el panel privado exige sesión: sin cookie válida, 401", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const host = "yvyra-scanner.nande";
    const res = k.browser.request("GET", host, "/panel");
    expect(res.response.status).toBe(401);
    expect(res.response.body).not.toContain("Billetera");
  });

  it("sacar la bandera de secretos da notoriedad (comprometés al usuario)", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    const host = "cocina-nande.nande";
    const before = k.notoriety.getState().notoriety;
    t.execute(
      `curl "http://${host}/buscar?q=%25' UNION SELECT id, dato, 'x' FROM secretos -- "`,
    );
    expect(k.notoriety.getState().notoriety).toBeGreaterThan(before);
  });
});
