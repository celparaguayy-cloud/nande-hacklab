import { describe, expect, it } from "vitest";
import { DEFENSES, defenseById } from "./Defenses";

describe("catálogo de defensa (Blue Team)", () => {
  it("cubre los ataques principales del juego", () => {
    const attacks = DEFENSES.map((d) => d.id);
    for (const must of ["d-sqli", "d-hash", "d-jwt", "d-idor", "d-xss", "d-traversal", "d-cmdi"]) {
      expect(attacks).toContain(must);
    }
    expect(DEFENSES.length).toBeGreaterThanOrEqual(8);
  });

  it("cada ficha está completa y el fix difiere del código vulnerable", () => {
    const ids = new Set<string>();
    for (const d of DEFENSES) {
      expect(d.id).toBeTruthy();
      expect(ids.has(d.id)).toBe(false); // ids únicos
      ids.add(d.id);
      expect(d.attack.length).toBeGreaterThan(2);
      expect(d.vulnerable.length).toBeGreaterThan(10);
      expect(d.fixed.length).toBeGreaterThan(10);
      expect(d.fixed).not.toBe(d.vulnerable);
      expect(d.why.length).toBeGreaterThan(20);
      expect(d.principle.length).toBeGreaterThan(10);
    }
  });

  it("defenseById encuentra y falla con gracia", () => {
    expect(defenseById("d-sqli")?.attack).toContain("SQL");
    expect(defenseById("no-existe")).toBeUndefined();
  });
});
