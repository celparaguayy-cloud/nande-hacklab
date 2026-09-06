import { describe, expect, it } from "vitest";
import { Livelihoods } from "./Livelihoods";
import type { VirtualPerson } from "./WorldEngine";

function persona(id: string, prof: VirtualPerson["profession"], tech = 5): VirtualPerson {
  return {
    id,
    name: `P ${id}`,
    age: 30,
    profession: prof,
    interests: [],
    technicalLevel: tech,
    activity: 0.5,
    online: true,
  };
}

describe("medios de vida", () => {
  it("cada persona arranca con riqueza y habilidad", () => {
    const l = new Livelihoods([persona("1", "developer")]);
    const v = l.get("1")!;
    expect(v.wealth).toBeGreaterThan(0);
    expect(v.skill).toBeGreaterThan(0);
  });

  it("la riqueza crece con los días trabajados", () => {
    const gente = Array.from({ length: 40 }, (_, i) => persona(`p${i}`, "developer"));
    const l = new Livelihoods(gente);
    const antes = l.stats((id) => id).totalWealth;

    // Muchos ticks con cambio de día: la gente cobra.
    for (let i = 0; i < 60; i += 1) l.tick(true, (id) => id);

    expect(l.stats((id) => id).totalWealth).toBeGreaterThan(antes);
  });

  it("la habilidad mejora con la práctica", () => {
    const l = new Livelihoods([persona("1", "developer", 1)]);
    const antes = l.get("1")!.skill;
    for (let i = 0; i < 300; i += 1) l.tick(false, (id) => id);
    expect(l.get("1")!.skill).toBeGreaterThan(antes);
  });

  it("produce fuerza por sector para la bolsa", () => {
    const l = new Livelihoods([
      persona("1", "developer"),
      persona("2", "security-analyst"),
    ]);
    const s = l.sectorStrength();
    expect(s["ARA"]).toBeGreaterThan(0);
    expect(s["PYT"]).toBeGreaterThan(0);
  });
});
