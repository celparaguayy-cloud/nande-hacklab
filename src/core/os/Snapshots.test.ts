import { beforeEach, describe, expect, it } from "vitest";
import { SnapshotManager } from "./Snapshots";
import { resetStorage } from "../../test/setup";

/**
 * Experimento G: guardar una foto, modificar el mundo, restaurar y comprobar
 * que el estado anterior volvió. Anti-mock: verifica el estado real en
 * storage, no un mensaje.
 */
describe("SnapshotManager — guardar y volver a un estado", () => {
  beforeEach(() => resetStorage());

  it("restaurar revierte los cambios hechos después de la foto", () => {
    const snaps = new SnapshotManager(() => 10);

    localStorage.setItem("nande-progreso", JSON.stringify({ xp: 100 }));
    localStorage.setItem("nande-notas", "hola");

    snaps.create("antes");

    // Modificar el mundo después de la foto.
    localStorage.setItem("nande-progreso", JSON.stringify({ xp: 999 }));
    localStorage.setItem("nande-notas", "cambiado");
    localStorage.setItem("nande-nuevo", "algo que no existía");

    const r = snaps.restore("antes");
    expect(r.ok).toBe(true);

    expect(localStorage.getItem("nande-progreso")).toBe(JSON.stringify({ xp: 100 }));
    expect(localStorage.getItem("nande-notas")).toBe("hola");
    // Lo creado después de la foto se borra al restaurar.
    expect(localStorage.getItem("nande-nuevo")).toBeNull();
  });

  it("list y remove funcionan; la foto no se borra a sí misma", () => {
    const snaps = new SnapshotManager(() => 5);
    localStorage.setItem("nande-x", "1");
    snaps.create("uno");
    snaps.create("dos");

    expect(snaps.list().map((s) => s.name).sort()).toEqual(["dos", "uno"]);
    expect(snaps.remove("uno")).toBe(true);
    expect(snaps.list().map((s) => s.name)).toEqual(["dos"]);

    // Restaurar no destruye la propia lista de fotos.
    snaps.restore("dos");
    expect(snaps.list().length).toBe(1);
  });
});
