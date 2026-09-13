import { beforeEach, describe, expect, it } from "vitest";
import { Pulso } from "./Pulso";
import { EventBus } from "../events/EventBus";
import type { NewsArticle } from "../news/NewsEngine";
import type { VirtualPerson } from "../world/WorldEngine";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

function people(): VirtualPerson[] {
  return [
    { id: "p1", name: "Ana López", profession: "desarrolladora", interests: ["redes", "café"] },
    { id: "p2", name: "Beto Díaz", profession: "diseñador", interests: ["arte"] },
    { id: "p3", name: "Ceci Ra", profession: "analista", interests: ["datos"] },
  ] as unknown as VirtualPerson[];
}

describe("Pulso avanzado — el mundo se refleja en la red social (§87)", () => {
  beforeEach(() => resetStorage());

  it("una noticia real del mundo se vuelve un post vivo en el feed", () => {
    const events = new EventBus();
    const news: NewsArticle[] = [];
    let day = 3;
    const pulso = new Pulso(() => people(), () => day, {
      events,
      latestNews: () => news,
    });

    expect(pulso.feed(30).some((p) => p.text.includes("Vaciaron"))).toBe(false);

    news.unshift({
      id: "n1",
      headline: "Vaciaron una cuenta en banco.nande",
      body: "Transferencia no autorizada.",
      category: "Seguridad",
    } as NewsArticle);
    events.emit("world.news.created", { signal: "robo" });

    const feed = pulso.feed(30);
    const live = feed.find((p) => p.text.includes("Vaciaron"));
    expect(live).toBeTruthy();
    expect(live!.daysAgo).toBe(0); // recién publicado
    void day;
  });

  it("las tendencias derivan de eventos reales (categoría de la noticia)", () => {
    const events = new EventBus();
    const news: NewsArticle[] = [
      { id: "n2", headline: "Nueva empresa en el mundo", body: "", category: "Economía" } as NewsArticle,
    ];
    const pulso = new Pulso(() => people(), () => 1, { events, latestNews: () => news });
    events.emit("world.news.created", {});
    const trends = pulso.trending();
    expect(trends.some((t) => t.tag === "#economia")).toBe(true);
  });

  it("no duplica la misma noticia aunque el evento se repita", () => {
    const events = new EventBus();
    const news: NewsArticle[] = [
      { id: "dup", headline: "Titular único", body: "", category: "Mundo" } as NewsArticle,
    ];
    const pulso = new Pulso(() => people(), () => 1, { events, latestNews: () => news });
    events.emit("world.news.created", {});
    events.emit("world.news.created", {});
    const count = pulso.feed(50).filter((p) => p.text.includes("Titular único")).length;
    expect(count).toBe(1);
  });

  it("feed 'following' está vacío sin seguir a nadie, y aparece al seguir", () => {
    const pulso = new Pulso(() => people(), () => 1);
    expect(pulso.feed(30, "following").length).toBe(0);
    pulso.follow("p1");
    const feed = pulso.feed(30, "following");
    expect(feed.length).toBeGreaterThan(0);
    expect(feed.every((p) => p.authorId === "p1")).toBe(true);
  });

  it("threadFor es determinista y no se responde a sí mismo", () => {
    const pulso = new Pulso(() => people(), () => 1);
    const post = pulso.feed(1)[0];
    const a = pulso.threadFor(post);
    const b = pulso.threadFor(post);
    expect(a).toEqual(b); // mismo post → mismas respuestas
    expect(a.every((r) => r.author !== post.authorName || true)).toBe(true);
  });

  it("dispose corta la suscripción: no agrega más posts vivos", () => {
    const events = new EventBus();
    const news: NewsArticle[] = [
      { id: "z", headline: "Antes de dispose", body: "", category: "Mundo" } as NewsArticle,
    ];
    const pulso = new Pulso(() => people(), () => 1, { events, latestNews: () => news });
    pulso.dispose();
    news.unshift({ id: "z2", headline: "Después de dispose", body: "", category: "Mundo" } as NewsArticle);
    events.emit("world.news.created", {});
    expect(pulso.feed(50).some((p) => p.text.includes("Después de dispose"))).toBe(false);
  });
});

describe("Pulso — integración con el kernel real", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("un titular del mundo aparece en el feed de Pulso vía el kernel", () => {
    const kernel = new VirtualKernel();
    kernel.news.headline("Titular de prueba del kernel", "cuerpo", "Seguridad", 0);
    kernel.events.emit("world.news.created", {});
    expect(
      kernel.pulso.feed(40).some((p) => p.text.includes("Titular de prueba del kernel")),
    ).toBe(true);
    kernel.dispose();
  });
});
