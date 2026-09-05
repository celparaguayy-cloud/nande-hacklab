import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../core/VirtualKernel";
import { WorldRegistry } from "../core/world/WorldRegistry";
import { resetStorage } from "./setup";

/**
 * Recorrido completo del mundo.
 *
 * Comprueba la cadena entera con la que un habitante hace aparecer algo
 * en la Internet virtual:
 *
 *   agente -> entidad -> EventBus -> dominio -> sitio -> indice ->
 *   busqueda -> navegacion -> persistencia
 */
describe("recorrido completo del mundo", () => {
  beforeEach(() => resetStorage());

  it("lo que crea un habitante termina siendo navegable y buscable", () => {
    const kernel = new VirtualKernel();

    // 1. El mundo avanza solo hasta que algun habitante crea algo.
    let tick = 0;

    while (kernel.registry.count() === 0 && tick < 4000) {
      tick += 1;
      kernel.tick();
    }

    expect(kernel.registry.count()).toBeGreaterThan(0);

    // 2. La entidad quedo registrada con su autor.
    const entity = kernel.registry.recent(1)[0];
    const author = kernel.worldEngine.getPerson(entity.ownerId);

    expect(author).toBeDefined();
    expect(entity.metadata.profession).toBe(author!.profession);

    // 3. El EventBus disparo la publicacion: hay dominio en el DNS.
    const published = kernel.publisher.listPublished();
    expect(published.length).toBeGreaterThan(0);

    const hostname = published[published.length - 1];
    const address = kernel.dns.resolve(hostname);

    expect(address).toMatch(/^10\.10\./);

    // 4. El sitio existe y es alcanzable por la red virtual.
    expect(kernel.internet.hasSite(hostname)).toBe(true);
    expect(kernel.network.isReachable(address!)).toBe(true);

    // 5. Se puede navegar desde el navegador virtual.
    const page = kernel.browser.open(hostname);

    expect(page.address).toBe(address);
    expect(page.content.length).toBeGreaterThan(0);

    // 6. Y aparece en el buscador.
    const results = kernel.search.search(page.title);
    expect(results.some((r) => r.hostname === hostname)).toBe(true);

    // 7. El agente recuerda haberlo creado.
    const memories = kernel.worldEngine
      .getAgents()
      .getAgentMemories(entity.ownerId);

    expect(
      memories.some((m) => m.type === "project"),
    ).toBe(true);

    kernel.dispose();
  });

  it("el mundo sobrevive a recargar la aplicacion", () => {
    const kernel = new VirtualKernel();

    for (let tick = 1; tick <= 1500; tick++) {
      kernel.tick();
    }

    const entidades = kernel.registry.count();
    const reloj = kernel.world.getState().clock.tick;

    expect(entidades).toBeGreaterThan(0);
    expect(reloj).toBe(1500);

    // stop() baja a disco lo pendiente, como al cerrar la pestana.
    kernel.dispose();

    // Un kernel nuevo simula recargar la pagina.
    const recargado = new WorldRegistry();

    expect(recargado.count()).toBe(entidades);
    expect(recargado.recent(1)[0].name).toBe(
      kernel.registry.recent(1)[0].name,
    );
  });

  it("la actividad social acompana al mundo", () => {
    const kernel = new VirtualKernel();

    for (let tick = 1; tick <= 1000; tick++) {
      kernel.tick();
    }

    const social = kernel.worldEngine.getSocial();

    expect(social.getPosts().length).toBeGreaterThan(0);
  });

  it("un solo loop avanza el mundo aunque se arranque dos veces", () => {
    const kernel = new VirtualKernel();

    // StrictMode monta dos veces en desarrollo: start() es idempotente.
    kernel.start(10);
    kernel.start(10);

    expect(kernel.isRunning()).toBe(true);

    kernel.stop();

    expect(kernel.isRunning()).toBe(false);

    kernel.dispose();
  });

  it("los contadores del resumen coinciden con el mundo real", () => {
    const kernel = new VirtualKernel();

    for (let tick = 1; tick <= 600; tick++) {
      kernel.tick();
    }

    const summary = kernel.summary();

    expect(summary.peopleCount).toBe(
      kernel.worldEngine.getPeople().length,
    );
    expect(summary.onlineCount).toBe(
      kernel.worldEngine.getOnlinePeople().length,
    );
    expect(summary.entityCount).toBe(kernel.registry.count());
    expect(summary.clock.tick).toBe(600);

    kernel.dispose();
  });
});
