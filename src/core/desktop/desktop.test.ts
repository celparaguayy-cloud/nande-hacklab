import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { Appearance, WALLPAPERS } from "./Appearance";
import { Notes } from "../notes/Notes";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Appearance", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("arranca con el fondo por defecto", () => {
    const a = new Appearance();
    expect(a.getState().wallpaperId).toBe("nande");
    expect(a.wallpaperCss()).toContain("gradient");
  });

  it("cambia y persiste el fondo y el acento", () => {
    const a = new Appearance();
    a.setWallpaper("matrix");
    a.setAccent("#7ee2a8");

    expect(a.getState().wallpaperId).toBe("matrix");

    const reloaded = new Appearance();
    expect(reloaded.getState().wallpaperId).toBe("matrix");
    expect(reloaded.accent).toBe("#7ee2a8");
  });

  it("ignora un fondo inexistente", () => {
    const a = new Appearance();
    a.setWallpaper("no-existe");
    expect(a.getState().wallpaperId).toBe("nande");
  });

  it("todos los presets tienen css", () => {
    for (const wp of WALLPAPERS) {
      expect(wp.css).toContain("gradient");
    }
  });
});

describe("Notes", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("crea, edita y borra notas", () => {
    const n = new Notes();
    const note = n.create("Mi nota", "contenido", 1);

    expect(n.count()).toBe(1);
    expect(n.get(note.id)?.title).toBe("Mi nota");

    n.update(note.id, { body: "editado" }, 2);
    expect(n.get(note.id)?.body).toBe("editado");

    expect(n.remove(note.id)).toBe(true);
    expect(n.count()).toBe(0);
  });

  it("una nota sin título usa un título por defecto", () => {
    const n = new Notes();
    const note = n.create("   ", "x", 1);
    expect(note.title).toBe("Sin título");
  });

  it("las notas más recientes van primero", () => {
    const n = new Notes();
    n.create("A", "", 1);
    const b = n.create("B", "", 2);
    expect(n.all()[0].id).toBe(b.id);
  });

  it("persisten entre sesiones", () => {
    const n = new Notes();
    n.create("Guardada", "texto", 1);

    const reloaded = new Notes();
    expect(reloaded.count()).toBe(1);
    expect(reloaded.all()[0].title).toBe("Guardada");
  });
});

describe("escritorio en el kernel", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("el kernel expone apariencia y notas", () => {
    const kernel = new VirtualKernel();
    expect(kernel.appearance.wallpaperCss()).toContain("gradient");
    expect(kernel.notes.count()).toBe(0);

    kernel.notes.create("test", "", kernel.world.getState().clock.tick);
    expect(kernel.notes.count()).toBe(1);

    kernel.dispose();
  });
});
