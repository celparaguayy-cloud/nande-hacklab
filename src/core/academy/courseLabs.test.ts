import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";
import { CURSOS } from "./Curriculum";

/**
 * Guardia de REALIDAD de los labs: cada botón "Practicá" del currículo manda su
 * `command` a la terminal tal cual. Este test corre TODOS esos comandos y exige:
 *   1) ninguno cae en "comando no encontrado" (herramienta que no existe), y
 *   2) todo lab que en su explicación PROMETE una bandera ND{...} de verdad la
 *      captura al correr su comando (de un tiro, en un mundo limpio).
 *
 * Nació de un pedido concreto: "algunos comandos del curso no funcionan". Si un
 * lab vuelve a prometer una bandera que su comando no entrega, este test lo caza.
 * Las lecciones (`learn X`) se ARRANCAN con el comando pero se completan paso a
 * paso: sus banderas no caen con el arranque, así que sólo se les exige (1).
 */
describe("Currículo — los comandos de los labs funcionan de verdad", () => {
  const labs = CURSOS.flatMap((c) =>
    c.slides
      .filter((s) => s.kind === "lab")
      .map((s) => ({ courseId: c.id, slide: s as Extract<typeof s, { kind: "lab" }> })),
  );

  for (const { courseId, slide } of labs) {
    it(`[${courseId}] ${slide.command.slice(0, 60)}`, () => {
      resetStorage();
      seedRandom();
      const k = new VirtualKernel();
      const t = new VirtualTerminal(k);
      const out = t.execute(slide.command);

      // (1) La herramienta existe (no "comando no encontrado").
      expect(out, `comando no reconocido: ${slide.command}`).not.toMatch(/comando no encontrado/i);

      // (2) Si el lab promete una bandera y NO es un arranque de lección, debe caer.
      const promised = [...slide.explain.matchAll(/ND\{[^}]+\}/g)].map((m) => m[0]);
      const isLessonStarter = /^\s*learn\s+/.test(slide.command);
      if (promised.length > 0 && !isLessonStarter) {
        const captured = k.player.capturedFlags();
        const got = promised.some((f) => captured.includes(f) || out.includes(f));
        expect(got, `promete ${promised.join(",")} pero el comando no la entrega`).toBe(true);
      }
    });
  }
});
