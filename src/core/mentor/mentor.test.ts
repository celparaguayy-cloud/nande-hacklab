import { beforeEach, describe, expect, it } from "vitest";
import { Mentor } from "./Mentor";
import { Campaign } from "../campaign/Campaign";
import { resetStorage, seedRandom } from "../../test/setup";

describe("La Mani — mentor adaptativo", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("aconseja sobre el objetivo actual de la campaña", () => {
    const c = new Campaign();
    const m = new Mentor(undefined, c);
    const a = m.advise();
    expect(a).toBeTruthy();
    expect(a!.objectiveId).toBe("c1-o1");
    expect(a!.level).toBe(0); // arranca con el empujoncito
  });

  it("la ayuda sube en escalera al pedir más", () => {
    const c = new Campaign();
    const m = new Mentor(undefined, c);
    expect(m.advise()!.level).toBe(0);
    m.askMore();
    expect(m.advise()!.level).toBe(1);
    m.askMore();
    const a2 = m.advise()!;
    expect(a2.level).toBe(2);
    expect(a2.command).toBeTruthy(); // ya muestra el comando
    m.askMore();
    expect(m.advise()!.level).toBe(3);
  });

  it("se gradúa de un tema tras dominarlo sin pedir el comando", () => {
    const c = new Campaign();
    const m = new Mentor(undefined, c);
    // Resolver dos veces sin pedir el comando exacto.
    expect(m.noteSolved("sqli").graduated).toBe(false);
    const g = m.noteSolved("sqli");
    expect(g.graduated).toBe(true);
    expect(m.hasGraduated("sqli")).toBe(true);
  });

  it("si pediste el comando exacto, NO cuenta como maestría", () => {
    const c = new Campaign();
    const m = new Mentor(undefined, c);
    m.askMore(); m.askMore(); // llega a pedir el comando
    m.noteSolved("sqli");
    m.askMore(); m.askMore();
    m.noteSolved("sqli");
    // No debería haberse graduado, porque siempre pidió el comando.
    expect(m.hasGraduated("sqli")).toBe(false);
  });

  it("cuando se gradúa, te suelta ese tema", () => {
    const c = new Campaign();
    const m = new Mentor(undefined, c);
    m.noteSolved("sqli");
    m.noteSolved("sqli");
    const a = m.advise()!;
    // El objetivo 1 es de sqli → la Mani te suelta.
    expect(a.text.toLowerCase()).toMatch(/dominás|confío|solo|sin mi/);
  });
});
