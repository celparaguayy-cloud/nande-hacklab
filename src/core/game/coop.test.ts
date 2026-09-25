import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * CoopArena — co-op hot-seat (dos personas, un dispositivo, por turnos). No hay
 * red: comparten el MISMO mundo. Anti-mock: las jugadas son operaciones REALES
 * del runtime (start/stop de servicios sobre midc.nande) y el ganador sale del
 * puntaje/estado, no de un texto. El test cuida los invariantes: turnos
 * alternos, efecto real en el host, y que una jugada inválida no consuma turno.
 */
describe("CoopArena — co-op hot-seat rojo vs azul", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("empieza con Rojo, servicios arriba y puntajes en cero", () => {
    const s = kernel.coop.start("Ana", "Beto");
    expect(s.turn).toBe("rojo");
    expect(s.rojo.name).toBe("Ana");
    expect(s.azul.name).toBe("Beto");
    expect(s.rojo.score).toBe(0);
    expect(s.servicesDown).toBe(0);
    expect(s.active).toBe(true);
  });

  it("respeta el turno: Azul no puede jugar en el turno de Rojo", () => {
    kernel.coop.start("Ana", "Beto");
    const bad = kernel.coop.move("azul", "nginx");
    expect(bad.ok).toBe(false);
    expect(bad.message).toContain("no es tu turno");
  });

  it("la jugada de Rojo TIRA el servicio de verdad (estado real del host)", () => {
    kernel.coop.start("Ana", "Beto");
    expect(kernel.hosts.isPortOpen("midc.nande", 80)).toBe(true);
    const r = kernel.coop.move("rojo", "nginx");
    expect(r.ok).toBe(true);
    // Consecuencia real: nginx quedó caído en el host (no es un contador aparte).
    expect(kernel.hosts.resolve("midc.nande")!.services.find((s) => s.name === "nginx")!.state).toBe("stopped");
    expect(kernel.hosts.isPortOpen("midc.nande", 80)).toBe(false);
    // Y Azul lo restaura de verdad.
    const d = kernel.coop.move("azul", "nginx");
    expect(d.ok).toBe(true);
    expect(kernel.hosts.isPortOpen("midc.nande", 80)).toBe(true);
  });

  it("una jugada inválida NO consume el turno", () => {
    kernel.coop.start("Ana", "Beto");
    // Rojo intenta tirar un servicio que no existe → falla, sigue siendo su turno.
    expect(kernel.coop.move("rojo", "inexistente").ok).toBe(false);
    expect(kernel.coop.snapshot().turn).toBe("rojo");
    // Rojo intenta restaurar (rol equivocado en su propia jugada no aplica);
    // ahora tira uno válido → recién ahí pasa el turno.
    expect(kernel.coop.move("rojo", "sshd").ok).toBe(true);
    expect(kernel.coop.snapshot().turn).toBe("azul");
  });

  it("declara un ganador decisivo desde el puntaje (Rojo con jugada extra)", () => {
    // 3 jugadas: Rojo, Azul, Rojo → Rojo hace 2 y Azul 1.
    kernel.coop.start("Ana", "Beto", 3);
    expect(kernel.coop.move("rojo", "nginx").ok).toBe(true);
    expect(kernel.coop.move("azul", "nginx").ok).toBe(true);
    expect(kernel.coop.move("rojo", "postgres").ok).toBe(true); // última jugada
    const s = kernel.coop.snapshot();
    expect(s.finished).toBe(true);
    expect(s.winner).toBe("Ana");
    expect(s.rojo.score).toBeGreaterThan(s.azul.score);
  });

  it("el comando coop expone el flujo y man coop lo documenta", () => {
    expect(term.execute("coop empezar Ana Beto")).toContain("hot-seat");
    expect(term.execute("coop rojo nginx")).toContain("tiró");
    expect(term.execute("man coop")).toContain("hot-seat");
  });
});
