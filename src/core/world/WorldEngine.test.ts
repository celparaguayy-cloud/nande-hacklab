import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { WorldEngine } from "./WorldEngine";
import { WorldRegistry } from "./WorldRegistry";
import { EventBus } from "../events/EventBus";
import type { WorldEntity } from "./WorldRegistry";
import { resetStorage } from "../../test/setup";

function buildEngine() {
  const registry = new WorldRegistry();
  const events = new EventBus();
  const engine = new WorldEngine(registry, events);

  return { registry, events, engine };
}

/** Avanza el mundo y devuelve las entidades emitidas por el bus. */
function run(ticks: number) {
  const { registry, events, engine } = buildEngine();
  const created: WorldEntity[] = [];

  events.subscribe<WorldEntity>("world.entity.created", (event) => {
    created.push(event.data);
  });

  for (let tick = 1; tick <= ticks; tick++) {
    engine.tick(tick);
  }

  return { registry, engine, created };
}

describe("WorldEngine", () => {
  beforeEach(() => {
    resetStorage();
  });

  // Una sola simulacion larga compartida: reconstruir el mundo en cada
  // test hacia que la suite tardara varios minutos.
  let sim: ReturnType<typeof run>;

  beforeAll(() => {
    resetStorage();
    sim = run(4000);
  });

  it("puebla el mundo con habitantes", () => {
    const { engine } = buildEngine();

    expect(engine.getPeopleCount()).toBe(2000);
    expect(engine.getPeople()).toHaveLength(2000);
  });

  it("mantiene el contador de conectados en sincronia", () => {
    const { engine } = buildEngine();

    for (let tick = 1; tick <= 50; tick++) {
      engine.tick(tick);
    }

    // El contador incremental debe coincidir con el recuento real.
    expect(engine.getOnlineCount()).toBe(engine.getOnlinePeople().length);
  });

  it("emite world.entity.created por cada entidad creada", () => {
    const { registry, created } = sim;

    expect(created.length).toBeGreaterThan(0);
    expect(registry.count()).toBeGreaterThan(0);

    for (const entity of created) {
      expect(entity.id).toBeTruthy();
      expect(entity.name.length).toBeGreaterThan(0);
      expect(entity.ownerId).toMatch(/^person-/);
    }
  });

  it("no explota en entidades durante una simulacion larga", () => {
    const { registry } = sim;

    // El tope del registro debe sostenerse pase lo que pase.
    expect(registry.count()).toBeLessThanOrEqual(1000);
  });

  it("respeta el maximo de creaciones por agente", () => {
    const { created } = sim;

    const porAgente = new Map<string, number>();

    for (const entity of created) {
      porAgente.set(
        entity.ownerId,
        (porAgente.get(entity.ownerId) ?? 0) + 1,
      );
    }

    const maximo = Math.max(...porAgente.values());

    expect(maximo).toBeLessThanOrEqual(5);
  });

  it("respeta el cooldown entre creaciones de un mismo agente", () => {
    const { created } = sim;

    const ultimoTick = new Map<string, number>();

    for (const entity of created) {
      const previo = ultimoTick.get(entity.ownerId);

      if (previo !== undefined) {
        expect(entity.createdTick - previo).toBeGreaterThanOrEqual(250);
      }

      ultimoTick.set(entity.ownerId, entity.createdTick);
    }
  });

  it("genera nombres distintos para cada creacion de un agente", () => {
    const { created } = sim;

    const nombres = new Map<string, string[]>();

    for (const entity of created) {
      const lista = nombres.get(entity.ownerId) ?? [];
      lista.push(entity.name);
      nombres.set(entity.ownerId, lista);
    }

    const conVarias = [...nombres.values()].filter(
      (lista) => lista.length > 1,
    );

    expect(conVarias.length).toBeGreaterThan(0);

    for (const lista of conVarias) {
      expect(new Set(lista).size).toBe(lista.length);
    }
  });

  it("asigna el tipo de entidad segun la profesion", () => {
    const { engine, created } = sim;

    expect(created.length).toBeGreaterThan(0);

    for (const entity of created) {
      const person = engine.getPerson(entity.ownerId)!;

      expect(entity.metadata.profession).toBe(person.profession);

      if (person.profession === "teacher") {
        expect(entity.type).toBe("course");
      }

      if (person.profession === "security-analyst") {
        expect(entity.type).toBe("lab");
      }
    }
  });

  it("registra la creacion en la memoria del agente", () => {
    const { engine, created } = sim;

    expect(created.length).toBeGreaterThan(0);

    const entity = created[0];
    const memories = engine
      .getAgents()
      .getAgentMemories(entity.ownerId);

    const proyecto = memories.find(
      (memory) => memory.type === "project",
    );

    expect(proyecto?.text).toContain(entity.name);
  });
});
