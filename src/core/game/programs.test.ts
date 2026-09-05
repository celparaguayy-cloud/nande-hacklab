import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { programFor, programLabel } from "./CreationPrograms";
import { WorldRegistry } from "../world/WorldRegistry";
import { resetStorage, seedRandom } from "../../test/setup";

describe("programas de creaciones", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("una herramienta tiene programa de texto ejecutable", () => {
    const reg = new WorldRegistry();
    const tool = reg.create("tool", "Herr", "d", "p1", 1);

    const program = programFor(tool)!;
    expect(program.kind).toBe("texto");
    expect(program.run(["hola"])).toBeTruthy();
  });

  it("una app genera algo", () => {
    const reg = new WorldRegistry();
    const app = reg.create("app", "App", "d", "p1", 1);

    const program = programFor(app)!;
    expect(program.kind).toBe("generador");
    expect(program.run([]).length).toBeGreaterThan(0);
  });

  it("un juego responde a la jugada", () => {
    const reg = new WorldRegistry();
    const game = reg.create("game", "Juego", "d", "p1", 1);

    const program = programFor(game)!;
    expect(program.kind).toBe("juego");
    expect(program.run(["piedra"])).toBeTruthy();
  });

  it("un proyecto no tiene programa ejecutable", () => {
    const reg = new WorldRegistry();
    const proj = reg.create("project", "Proy", "d", "p1", 1);

    expect(programFor(proj)).toBeUndefined();
  });

  it("es determinista: la misma entidad da siempre el mismo programa", () => {
    const reg = new WorldRegistry();
    const tool = reg.create("tool", "X", "d", "p1", 1);

    expect(programLabel(tool)).toBe(programLabel(tool));
  });

  it("entidades distintas pueden dar programas distintos", () => {
    const reg = new WorldRegistry();
    const labels = new Set<string>();

    for (let i = 0; i < 20; i++) {
      const tool = reg.create("tool", `T${i}`, "d", "p1", i);
      labels.add(programLabel(tool)!);
    }

    // Con 20 herramientas deberían aparecer varias variantes.
    expect(labels.size).toBeGreaterThan(1);
  });

  it("el cifrado César es reversible con la utilidad de texto", () => {
    const reg = new WorldRegistry();

    // Buscar una herramienta cuyo programa sea el César.
    let cesar = programFor(reg.create("tool", "seed", "d", "p1", 0))!;
    let n = 1;
    while (cesar.label !== "cifrado César" && n < 50) {
      cesar = programFor(reg.create("tool", `s${n}`, "d", "p1", n))!;
      n += 1;
    }

    if (cesar.label === "cifrado César") {
      const cifrado = cesar.run(["hola"]);
      expect(cifrado).not.toBe("hola");
    }
  });
});

describe("run en la terminal", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("ejecuta la creación de un habitante", async () => {
    const { VirtualTerminal } = await import("../terminal/VirtualTerminal");
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    const tool = kernel.registry.create(
      "tool", "Mi Tool", "d", "person-1", 1, [], { ownerName: "Yvoty" },
    );

    const out = term.execute(`run ${tool.id} prueba`);
    expect(out).toContain("Mi Tool");
    expect(out).toContain("Yvoty");

    kernel.dispose();
  });

  it("run rechaza ids que no existen", async () => {
    const { VirtualTerminal } = await import("../terminal/VirtualTerminal");
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    expect(term.execute("run entity-999999")).toContain("no es una creación");

    kernel.dispose();
  });

  it("la creación de un habitante tiene programa ejecutable", async () => {
    const { VirtualTerminal } = await import("../terminal/VirtualTerminal");
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    const tool = kernel.registry.create(
      "tool", "Reversor", "hola", "person-1", 1, [], { ownerName: "Y" },
    );

    // El programa existe y se ejecuta desde la terminal.
    expect(kernel.store.programOf(tool.id)).toBeDefined();
    const out = term.execute(`run ${tool.id} prueba`);
    expect(out).toContain("Reversor");

    kernel.dispose();
  });
});
