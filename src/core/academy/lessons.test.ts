import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { LESSONS, LessonEngine } from "./Lessons";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("catálogo de lecciones", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("hay lecciones con pasos completos", () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(5);

    for (const lesson of LESSONS) {
      expect(lesson.steps.length).toBeGreaterThan(0);
      for (const step of lesson.steps) {
        expect(step.explain).not.toBe("");
        expect(step.task).not.toBe("");
        expect(step.hint).not.toBe("");
        expect(step.debrief).not.toBe("");
        expect(typeof step.check).toBe("function");
      }
    }
  });

  it("no hay ids repetidos", () => {
    const ids = LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("el motor entrega lecciones", () => {
    const engine = new LessonEngine();
    expect(engine.count()).toBe(LESSONS.length);
    expect(engine.get("l-nmap")?.title).toContain("nmap");
  });
});

describe("lección guiada de punta a punta", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("un paso solo avanza si el alumno hace lo correcto", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    term.execute("learn l-nmap");

    // Un comando equivocado no avanza ni da recompensa.
    const wrong = term.execute("ls");
    expect(wrong).not.toContain("Paso 2");
    expect(kernel.player.getState().xp).toBe(0);

    kernel.dispose();
  });

  it("completar los pasos da XP, moneda y logro", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    term.execute("learn l-nmap");
    term.execute("ping 10.10.5.20");
    const last = term.execute("nmap 10.10.5.20");

    expect(last).toContain("Lección completada");

    const p = kernel.player.getState();
    expect(p.xp).toBe(80);
    expect(p.wallet).toBe(560);
    expect(p.completedCourses).toContain("lesson:l-nmap");
    expect(p.achievements.some((a) => a.id === "primera-leccion")).toBe(true);

    kernel.dispose();
  });

  it("la lección de SQLi enseña a encontrar la inyección", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    term.execute("learn l-sqli");
    term.execute("nmap 10.10.5.10");
    const done = term.execute("sqlmap http://10.10.5.10/login user");

    expect(done).toContain("Lección completada");
    expect(kernel.player.getState().completedCourses).toContain("lesson:l-sqli");

    kernel.dispose();
  });

  it("hint muestra la ayuda del paso actual", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    term.execute("learn l-nmap");
    expect(term.execute("hint")).toContain("ping 10.10.5.20");

    kernel.dispose();
  });

  it("learn stop abandona la lección", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    term.execute("learn l-nmap");
    expect(term.execute("learn stop")).toContain("abandonada");
    // Ya sin lección activa, un comando no otorga nada.
    term.execute("ping 10.10.5.20");
    expect(kernel.player.getState().xp).toBe(0);

    kernel.dispose();
  });

  it("no se cobra dos veces la misma lección", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    const play = () => {
      term.execute("learn l-nmap");
      term.execute("ping 10.10.5.20");
      term.execute("nmap 10.10.5.20");
    };

    play();
    const xp = kernel.player.getState().xp;
    play();
    expect(kernel.player.getState().xp).toBe(xp);

    kernel.dispose();
  });
});
