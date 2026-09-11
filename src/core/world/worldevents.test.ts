import { describe, expect, it } from "vitest";
import { eventsActiveOn } from "./WorldEvents";

describe("eventos dinámicos del mundo", () => {
  it("siempre hay al menos un evento activo y es determinista", () => {
    const a = eventsActiveOn(1);
    const b = eventsActiveOn(1);
    expect(a.length).toBeGreaterThan(0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b)); // reproducible
  });

  it("cada evento tiene ventana y días restantes coherentes", () => {
    const evs = eventsActiveOn(7);
    for (const e of evs) {
      expect(e.startDay).toBeLessThanOrEqual(7);
      expect(e.endDay).toBeGreaterThanOrEqual(7);
      expect(e.diasRestantes).toBeGreaterThan(0);
      expect(e.title.length).toBeGreaterThan(3);
    }
  });

  it("los eventos cambian con el correr de los días", () => {
    const dia1 = eventsActiveOn(1).map((e) => e.id).join();
    const dia30 = eventsActiveOn(30).map((e) => e.id).join();
    expect(dia1).not.toBe(dia30);
  });
});
