import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * panel.nande es un servicio web REAL con login y sesión (no un lab). El flujo
 * de auth funciona de verdad: sin sesión te manda al login; con credenciales
 * correctas la cookie te deja entrar al dashboard.
 */
describe("panel.nande — web real con login y sesión", () => {
  let kernel: VirtualKernel;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("sin sesión, el dashboard redirige al login", () => {
    const { response, finalPath } = kernel.browser.request("GET", "panel.nande", "/dashboard");
    // El navegador sigue el redirect hasta la portada (login).
    expect(finalPath).toBe("/");
    expect(response.body.toLowerCase()).toContain("ingresá");
  });

  it("login correcto deja entrar al dashboard (sesión por cookie)", () => {
    const login = kernel.browser.request("POST", "panel.nande", "/login", {
      usuario: "operador",
      password: "nande2024",
    });
    // Tras el POST, el navegador siguió el redirect al dashboard.
    expect(login.finalPath).toBe("/dashboard");
    expect(login.response.body).toContain("Tablero");

    // La sesión persiste: pedir el dashboard de nuevo funciona sin re-login.
    const again = kernel.browser.request("GET", "panel.nande", "/dashboard");
    expect(again.finalPath).toBe("/dashboard");
    expect(again.response.body).toContain("operador");
  });

  it("login incorrecto no entra", () => {
    const bad = kernel.browser.request("POST", "panel.nande", "/login", {
      usuario: "operador",
      password: "mala",
    });
    expect(bad.response.body.toLowerCase()).toContain("incorrect");
  });
});
