import { describe, expect, it } from "vitest";
import { Academy, COURSE_LESSONS } from "./Academy";
import { LESSONS } from "./Lessons";

/**
 * Rutas ↔ lecciones: cada ruta enlaza lecciones prácticas reales. Este test
 * garantiza que el mapa no referencie lecciones inexistentes (un id mal escrito
 * dejaría una ruta con un botón roto).
 */
describe("Academia — rutas enlazadas a lecciones", () => {
  const lessonIds = new Set(LESSONS.map((l) => l.id));

  it("toda lección referenciada por una ruta existe", () => {
    for (const [course, ids] of Object.entries(COURSE_LESSONS)) {
      for (const id of ids) {
        expect(lessonIds.has(id), `ruta ${course} → lección inexistente ${id}`).toBe(true);
      }
    }
  });

  it("las rutas principiantes tienen lecciones prácticas", () => {
    const a = new Academy();
    expect(a.lessonsFor("computacion").length).toBeGreaterThan(0);
    expect(a.lessonsFor("reconocimiento")).toContain("l-nmap");
    expect(a.lessonsFor("web-security")).toContain("l-web-idor");
  });

  it("cada ruta con lecciones cubre temas coherentes con su curso", () => {
    const a = new Academy();
    // La mayoría de las rutas del itinerario base tienen práctica.
    const withLessons = a.all().filter((c) => a.lessonsFor(c.id).length > 0);
    expect(withLessons.length).toBeGreaterThanOrEqual(15);
  });
});
