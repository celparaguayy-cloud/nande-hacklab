import { describe, expect, it, beforeEach } from "vitest";
import { PlayerCompany, CONTROLS, ATTACKS } from "./PlayerCompany";
import { resetStorage } from "../../test/setup";

describe("mi empresa (defensa desde el dueño)", () => {
  beforeEach(() => resetStorage());

  it("fundar exige nombre válido y luego existe con caja", () => {
    const c = new PlayerCompany();
    expect(c.exists()).toBe(false);
    expect(c.found("x", 1)).toBe(false);       // nombre corto
    expect(c.found("Mi SA", 1)).toBe(true);
    expect(c.exists()).toBe(true);
    expect(c.get()!.treasury).toBeGreaterThan(0);
  });

  it("un ataque sin el control correcto saca plata; con el control se repele", () => {
    const c = new PlayerCompany();
    c.found("Defendida SA", 1);
    const sqliIdx = ATTACKS.findIndex((a) => a.id === "sqli");
    const antes = c.get()!.treasury;

    // Sin WAF: el sqli pega y saca plata.
    const r1 = c.receiveAttack(sqliIdx)!;
    expect(r1.repelido).toBe(false);
    expect(c.get()!.treasury).toBeLessThan(antes);

    // Activo el WAF (repele sqli) y ahora se repele.
    const waf = CONTROLS.find((x) => x.repele === "sqli")!;
    expect(c.addControl(waf.id)).toBe(true);
    const r2 = c.receiveAttack(sqliIdx)!;
    expect(r2.repelido).toBe(true);
  });

  it("no se puede activar un control sin caja suficiente", () => {
    const c = new PlayerCompany();
    c.found("Pobre SA", 1);
    // Vaciar la caja con ataques repetidos.
    for (let i = 0; i < 10; i++) c.receiveAttack(0);
    expect(c.get()!.treasury).toBe(0);
    expect(c.addControl(CONTROLS[0].id)).toBe(false);
  });
});
