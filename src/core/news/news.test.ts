import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { NewsEngine } from "./NewsEngine";
import { WorldRegistry } from "../world/WorldRegistry";
import { resetStorage, seedRandom } from "../../test/setup";

describe("NewsEngine", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("cubre lo que merece nota y descarta el resto", () => {
    const news = new NewsEngine();
    const registry = new WorldRegistry();

    const empresa = registry.create(
      "company", "Cooperativa Ñande", "Una empresa nueva", "p1", 10,
    );
    const evento = registry.create(
      "event", "Encuentro", "Un evento", "p2", 11,
    );

    const nota = news.coverEntity(empresa, "Yvoty", "coop.nande");

    expect(nota?.headline).toContain("Yvoty");
    expect(nota?.headline).toContain("funda");
    expect(nota?.category).toBe("Economía");

    // "event" no tiene cobertura definida: no todo es noticia.
    expect(news.coverEntity(evento, "Tape")).toBeUndefined();
    expect(news.count()).toBe(1);
  });

  it("mantiene acotado el archivo de noticias", () => {
    const news = new NewsEngine();
    const registry = new WorldRegistry();

    for (let i = 0; i < 100; i++) {
      const e = registry.create("app", `App ${i}`, "d", "p1", i);
      news.coverEntity(e, "Autor");
    }

    expect(news.count()).toBe(60);
    expect(news.latest(1)[0].headline).toContain("App 99");
  });

  it("escapa el contenido en portada y en la nota", () => {
    const news = new NewsEngine();
    const registry = new WorldRegistry();

    const e = registry.create(
      "app", "<script>alert(1)</script>", "malo", "p1", 1,
    );
    const nota = news.coverEntity(e, "Autor")!;

    expect(news.renderFront()).not.toContain("<script>");
    expect(news.renderArticle(nota.id)).not.toContain("<script>");
  });

  it("el diario sobrevive a recargar la aplicacion", () => {
    const news = new NewsEngine();
    const registry = new WorldRegistry();

    const e = registry.create("company", "Cooperativa Ñande", "d", "p1", 5);
    const nota = news.coverEntity(e, "Yvoty", "coop.nande")!;

    news.flush();

    // Una instancia nueva simula recargar la pagina.
    const recargado = new NewsEngine();

    expect(recargado.count()).toBe(1);
    expect(recargado.get(nota.id)?.headline).toBe(nota.headline);

    // Y el contador sigue donde estaba: no se repiten identificadores.
    const otra = recargado.coverEntity(
      registry.create("app", "App Dos", "d", "p2", 6),
      "Tape",
    )!;

    expect(otra.id).not.toBe(nota.id);
  });

  it("portada vacia cuando el mundo recien empieza", () => {
    const news = new NewsEngine();

    expect(news.renderFront()).toContain("Todavía no hay noticias");
    expect(news.renderArticle("news-999")).toBeUndefined();
  });
});

describe("mundo emergente", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("una creacion se vuelve sitio, noticia y resultado de busqueda", () => {
    const kernel = new VirtualKernel();

    let tick = 0;
    while (kernel.news.count() === 0 && tick < 6000) {
      tick += 1;
      kernel.tick();
    }

    expect(kernel.news.count()).toBeGreaterThan(0);

    const nota = kernel.news.latest(1)[0];

    // 1. La nota habla de un habitante real del mundo.
    expect(kernel.worldEngine.getPerson(nota.subjectId!)).toBeDefined();

    // 2. news.nande la muestra en portada, generada al momento.
    const portada = kernel.browser.open("news.nande");
    expect(portada.content).toContain(nota.headline);

    // 3. La nota tiene su propia pagina navegable.
    const articulo = kernel.browser.open("news.nande", `/article/${nota.id}`);
    expect(articulo.content).toContain(nota.headline);

    // 4. Y enlaza al sitio de la entidad, que existe.
    expect(nota.relatedHostname).toBeTruthy();
    expect(kernel.browser.canOpen(nota.relatedHostname!)).toBe(true);

    // 5. Se encuentra desde el buscador.
    expect(
      kernel.search.search(nota.headline.split(" ")[0]).length,
    ).toBeGreaterThan(0);

    kernel.dispose();
  });

  it("los habitantes forman vinculos que evolucionan", () => {
    const kernel = new VirtualKernel();

    for (let t = 1; t <= 2500; t++) {
      kernel.tick();
    }

    const rel = kernel.worldEngine.getAgents().getRelationships();

    expect(rel.count()).toBeGreaterThan(0);

    const tipos = new Set(rel.all().map((r) => r.type));

    // Al menos deben existir conocidos; el resto surge con el trato.
    expect(tipos.has("acquaintance") || tipos.has("colleague")).toBe(true);

    // Ningun agente acumula vinculos sin limite.
    for (const r of rel.all()) {
      expect(rel.countForAgent(r.fromId)).toBeLessThanOrEqual(20);
    }

    kernel.dispose();
  });

  it("la portada de news cambia a medida que avanza el mundo", () => {
    const kernel = new VirtualKernel();

    const inicial = kernel.browser.open("news.nande").content;
    expect(inicial).toContain("Todavía no hay noticias");

    let tick = 0;
    while (kernel.news.count() === 0 && tick < 6000) {
      tick += 1;
      kernel.tick();
    }

    const despues = kernel.browser.open("news.nande").content;

    expect(despues).not.toBe(inicial);
    expect(despues).not.toContain("Todavía no hay noticias");

    kernel.dispose();
  });
});
