import { describe, expect, it } from "vitest";
import { MACHINES, machineProgress } from "./Machines";
import { RETOS } from "../academy/Tracks";
import { CURSOS } from "../academy/Curriculum";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Las MÁQUINAS son salas reales, no decoración: cada bandera que prometen tiene
 * que existir y ser capturable, y su comando de arranque tiene que funcionar.
 * Atamos cada bandera a un RETO (que retos.functional prueba capturable de punta
 * a punta), así una máquina nunca promete algo que el mundo no entrega.
 */
describe("Máquinas — salas de práctica reales", () => {
  const retoFlags = new Set(RETOS.map((r) => r.flag));
  const courseIds = new Set(CURSOS.map((c) => c.id));

  it("los ids de máquina son únicos", () => {
    const ids = MACHINES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const m of MACHINES) {
    describe(`máquina ${m.id}`, () => {
      it("tiene metadatos y al menos un objetivo", () => {
        expect(m.name.length).toBeGreaterThan(0);
        expect(m.host).toMatch(/\.nande$/); // objetivo del sandbox
        expect(m.tasks.length).toBeGreaterThanOrEqual(1);
        expect(m.points).toBeGreaterThan(0);
        if (m.courseId) expect(courseIds.has(m.courseId), `curso inexistente ${m.courseId}`).toBe(true);
      });

      it("cada bandera es real y capturable (ligada a un reto)", () => {
        for (const t of m.tasks) {
          expect(t.flag).toMatch(/^ND\{.+\}$/);
          expect(retoFlags.has(t.flag), `la máquina promete ${t.flag} pero ningún reto lo entrega`).toBe(true);
        }
      });

      it("el comando de arranque es una herramienta real (no 'comando no encontrado')", () => {
        resetStorage();
        seedRandom();
        const term = new VirtualTerminal(new VirtualKernel());
        const out = term.execute(m.entry);
        expect(out, `arranque roto: ${m.entry}`).not.toMatch(/comando no encontrado/i);
      });
    });
  }

  it("machineProgress cuenta banderas capturadas y marca rooted", () => {
    const m = MACHINES.find((x) => x.tasks.length >= 1)!;
    const none = machineProgress(m, []);
    expect(none.captured).toBe(0);
    expect(none.rooted).toBe(false);
    const all = machineProgress(m, m.tasks.map((t) => t.flag));
    expect(all.captured).toBe(m.tasks.length);
    expect(all.rooted).toBe(true);
  });
});
