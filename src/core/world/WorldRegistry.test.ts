import { beforeEach, describe, expect, it } from "vitest";
import { WorldRegistry } from "./WorldRegistry";
import { resetStorage } from "../../test/setup";

describe("WorldRegistry", () => {
  beforeEach(() => {
    resetStorage();
  });

  it("crea entidades con identificador propio", () => {
    const registry = new WorldRegistry();

    const first = registry.create("app", "App Uno", "Primera", "person-1", 10);
    const second = registry.create("lab", "Lab Dos", "Segunda", "person-2", 11);

    expect(first.id).not.toBe(second.id);
    expect(first.createdTick).toBe(10);
    expect(registry.count()).toBe(2);
  });

  it("devuelve copias, no las entidades internas", () => {
    const registry = new WorldRegistry();
    const created = registry.create("app", "App", "Desc", "person-1", 1);

    const fetched = registry.get(created.id)!;
    fetched.name = "Modificado desde afuera";

    expect(registry.get(created.id)!.name).toBe("App");
  });

  it("actualiza y elimina", () => {
    const registry = new WorldRegistry();
    const created = registry.create("app", "App", "Desc", "person-1", 1);

    const updated = registry.update(created.id, 5, { name: "App v2" })!;
    expect(updated.name).toBe("App v2");
    expect(updated.updatedTick).toBe(5);

    expect(registry.remove(created.id)).toBe(true);
    expect(registry.remove(created.id)).toBe(false);
    expect(registry.get(created.id)).toBeUndefined();
  });

  it("filtra por tipo, propietario y busqueda", () => {
    const registry = new WorldRegistry();

    registry.create("app", "Nodo Arandu", "Herramienta", "person-1", 1, ["redes"]);
    registry.create("lab", "Lab Yvoty", "Laboratorio", "person-2", 2, ["seguridad"]);
    registry.create("app", "App Tape", "Otra", "person-1", 3);

    expect(registry.getByType("app")).toHaveLength(2);
    expect(registry.getByOwner("person-1")).toHaveLength(2);
    expect(registry.search("yvoty")).toHaveLength(1);
    expect(registry.search("seguridad")).toHaveLength(1);
    expect(registry.search("")).toHaveLength(0);
    expect(registry.search("no-existe")).toHaveLength(0);
  });

  it("cuenta por tipo sin clonar", () => {
    const registry = new WorldRegistry();

    registry.create("app", "A", "d", "p1", 1);
    registry.create("app", "B", "d", "p1", 2);
    registry.create("game", "C", "d", "p2", 3);

    expect(registry.countByType()).toEqual({ app: 2, game: 1 });
  });

  it("recent() devuelve las mas nuevas primero", () => {
    const registry = new WorldRegistry();

    registry.create("app", "Vieja", "d", "p1", 1);
    registry.create("app", "Media", "d", "p1", 2);
    registry.create("app", "Nueva", "d", "p1", 3);

    const recent = registry.recent(2);

    expect(recent.map((entity) => entity.name)).toEqual(["Nueva", "Media"]);
  });

  it("persiste y se recupera tras reabrir la aplicacion", () => {
    const registry = new WorldRegistry();
    const created = registry.create("course", "Curso Ñande", "Desc", "person-9", 7);

    registry.flush();

    // Una instancia nueva simula recargar la pagina.
    const reloaded = new WorldRegistry();
    const recovered = reloaded.get(created.id);

    expect(recovered?.name).toBe("Curso Ñande");
    expect(recovered?.ownerId).toBe("person-9");
  });

  it("no asigna identificadores repetidos despues de recargar", () => {
    const registry = new WorldRegistry();
    const first = registry.create("app", "A", "d", "p1", 1);
    registry.flush();

    const reloaded = new WorldRegistry();
    const second = reloaded.create("app", "B", "d", "p1", 2);

    expect(second.id).not.toBe(first.id);
  });

  it("sigue funcionando sin localStorage disponible", () => {
    const original = globalThis.localStorage;

    Object.defineProperty(globalThis, "localStorage", {
      get() {
        throw new Error("almacenamiento deshabilitado");
      },
      configurable: true,
    });

    try {
      const registry = new WorldRegistry();
      const created = registry.create("app", "Sin storage", "d", "p1", 1);

      expect(registry.get(created.id)?.name).toBe("Sin storage");
      expect(() => registry.flush()).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: original,
        writable: true,
        configurable: true,
      });
    }
  });

  it("mantiene el registro acotado descartando lo mas antiguo", () => {
    const registry = new WorldRegistry();

    for (let index = 0; index < 1200; index++) {
      registry.create("app", `App ${index}`, "d", "p1", index);
    }

    expect(registry.count()).toBe(1000);
    // Las primeras se descartaron; las ultimas siguen presentes.
    expect(registry.search("App 1199")).toHaveLength(1);
    expect(registry.search("App 0")).toHaveLength(0);
  });
});
