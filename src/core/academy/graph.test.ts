import { describe, expect, it } from "vitest";
import { COURSES, Academy } from "./Academy";

/**
 * Integridad de la ruta de aprendizaje: los cursos nuevos de 5.0 no deben
 * romper el grafo. Cada prerrequisito tiene que existir, no puede haber ids
 * repetidos, y todo curso debe ser alcanzable desde cero (sin dependencias
 * colgadas). Anti-regresión barata para cuando se agregan cursos.
 */
describe("Academy — grafo de cursos íntegro", () => {
  const ids = new Set(COURSES.map((c) => c.id));

  it("no hay ids de curso repetidos", () => {
    expect(ids.size).toBe(COURSES.length);
  });

  it("todo prerrequisito apunta a un curso existente", () => {
    for (const course of COURSES) {
      for (const req of course.requires) {
        expect(ids.has(req), `${course.id} requiere ${req} inexistente`).toBe(true);
      }
    }
  });

  it("los cursos 5.0 están presentes y son alcanzables", () => {
    const academy = new Academy();
    const nuevos = ["nandeshark", "active-directory", "purple-mitre", "opsec-5", "ctf-procedural"];
    for (const id of nuevos) {
      expect(academy.get(id), `falta el curso ${id}`).toBeDefined();
    }
    // Con toda la ruta completada, ningún curso queda con requisitos faltantes.
    const all = COURSES.map((c) => c.id);
    for (const course of COURSES) {
      expect(academy.missingRequirements(course.id, all)).toEqual([]);
    }
  });
});
