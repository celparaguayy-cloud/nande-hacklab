import { describe, expect, it } from "vitest";
import { TRACKS, RETOS } from "./Tracks";
import { CURSOS } from "./Curriculum";

/**
 * Los itinerarios tienen que cubrir TODOS los cursos, sin huérfanos ni
 * duplicados, y cada referencia (curso, reto, prerrequisito, bandera) tiene
 * que existir. Un itinerario que apunta a un curso inexistente rompe la UI en
 * silencio; este test lo caza.
 */

const courseIds = new Set(CURSOS.map((c) => c.id));
const retoIds = new Set(RETOS.map((r) => r.id));
const trackIds = new Set(TRACKS.map((t) => t.id));

describe("Itinerarios (Tracks)", () => {
  it("cada curso pertenece a exactamente un itinerario", () => {
    const seen = new Map<string, number>();
    for (const t of TRACKS) {
      for (const id of t.courseIds) seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    // Sin duplicados.
    for (const [id, n] of seen) {
      expect(n, `curso ${id} aparece en ${n} itinerarios`).toBe(1);
    }
    // Sin huérfanos: todos los cursos están en algún itinerario.
    for (const id of courseIds) {
      expect(seen.has(id), `curso ${id} no está en ningún itinerario`).toBe(true);
    }
    // Sin referencias rotas: todo courseId existe.
    for (const id of seen.keys()) {
      expect(courseIds.has(id), `itinerario referencia curso inexistente ${id}`).toBe(true);
    }
  });

  it("ids de itinerario únicos y prerrequisitos válidos", () => {
    expect(trackIds.size).toBe(TRACKS.length);
    for (const t of TRACKS) {
      if (t.requires) {
        expect(trackIds.has(t.requires), `prerrequisito inexistente ${t.requires}`).toBe(true);
      }
      if (t.finalChallenge) {
        expect(retoIds.has(t.finalChallenge), `reto final inexistente ${t.finalChallenge}`).toBe(true);
      }
    }
  });
});

describe("Retos (CTF)", () => {
  it("ids únicos", () => {
    expect(retoIds.size).toBe(RETOS.length);
  });

  for (const r of RETOS) {
    it(`reto ${r.id} bien formado`, () => {
      expect(r.title.length).toBeGreaterThan(0);
      expect(r.scenario.length).toBeGreaterThan(0);
      expect(r.objective.length).toBeGreaterThan(0);
      expect(r.flag, "bandera").toMatch(/^ND\{[a-z0-9_]+\}$/);
      expect(["fácil", "media", "difícil"]).toContain(r.difficulty);
      expect(r.hints.length, "pistas").toBeGreaterThanOrEqual(1);
      expect(r.steps.length, "pasos").toBeGreaterThanOrEqual(1);
      expect(r.reward.xp).toBeGreaterThan(0);
      if (r.courseId) {
        expect(courseIds.has(r.courseId), `reto liga a curso inexistente ${r.courseId}`).toBe(true);
      }
    });
  }
});
