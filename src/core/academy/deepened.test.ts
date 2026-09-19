import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Lecciones profundizadas a labs de varios pasos: se resuelven con comandos
 * REALES contra el mundo, paso a paso, hasta completarse. Anti-mock: cada paso
 * verifica la salida real de la herramienta.
 */
describe("Academia — lecciones profundizadas (multi-paso, comandos reales)", () => {
  it("l-gobuster: recon → abrir ruta oculta → robots.txt", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    expect(k.lessons.get("l-gobuster")!.steps.length).toBe(3);
    t.execute("learn l-gobuster");
    t.execute("gobuster 10.10.5.10");
    t.execute("curl http://10.10.5.10/admin");
    t.execute("curl http://10.10.5.10/robots.txt");
    expect(k.player.getState().completedCourses).toContain("lesson:l-gobuster");
  });

  it("l-dns: nslookup dos nombres + dig", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    expect(k.lessons.get("l-dns")!.steps.length).toBe(3);
    t.execute("learn l-dns");
    t.execute("nslookup banco.nande");
    t.execute("nslookup server.nande");
    t.execute("dig banco.nande");
    expect(k.player.getState().completedCourses).toContain("lesson:l-dns");
  });

  it("las pistas de un paso escalan (hints[])", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    t.execute("learn l-gobuster");
    const h1 = t.execute("hint");
    const h2 = t.execute("hint");
    expect(h1).toContain("Pista 1/3");
    expect(h2).toContain("Pista 2/3");
    expect(h1).not.toBe(h2);
  });
});
