import { beforeEach, describe, expect, it } from "vitest";
import { VirtualDNS } from "../dns/VirtualDNS";
import { VirtualInternet } from "./VirtualInternet";
import { VirtualNetwork } from "../network/VirtualNetwork";
import { VirtualBrowser } from "../browser/VirtualBrowser";
import { VirtualSearch } from "../search/VirtualSearch";
import { WorldPublisher, slugify } from "./WorldPublisher";
import { WorldRegistry } from "../world/WorldRegistry";
import { resetStorage, seedRandom } from "../../test/setup";

function buildStack() {
  const dns = new VirtualDNS();
  const internet = new VirtualInternet();
  const network = new VirtualNetwork();
  const search = new VirtualSearch();
  const browser = new VirtualBrowser(dns, internet, network);
  const publisher = new WorldPublisher(dns, internet, search);

  return { dns, internet, network, search, browser, publisher };
}

describe("VirtualDNS", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("resuelve los dominios base de ÑANDE", () => {
    const { dns } = buildStack();

    for (const host of [
      "www.nande",
      "search.nande",
      "video.nande",
      "academy.nande",
      "news.nande",
      "git.nande",
      "ctf.nande",
      "shop.nande",
    ]) {
      expect(dns.resolve(host), host).toMatch(/^10\.10\./);
    }
  });

  it("no resuelve dominios de fuera del mundo", () => {
    const { dns } = buildStack();

    expect(dns.resolve("google.com")).toBeUndefined();
    expect(dns.resolve("github.com")).toBeUndefined();
    expect(dns.resolve("localhost")).toBeUndefined();
  });

  it("registra y da de baja dominios", () => {
    const { dns } = buildStack();

    dns.register("startup.nande", "10.10.1.5");
    expect(dns.resolve("startup.nande")).toBe("10.10.1.5");
    expect(dns.has("startup.nande")).toBe(true);

    expect(dns.remove("startup.nande")).toBe(true);
    expect(dns.resolve("startup.nande")).toBeUndefined();
  });

  it("es indiferente a mayusculas", () => {
    const { dns } = buildStack();

    expect(dns.resolve("WWW.NANDE")).toBe(dns.resolve("www.nande"));
  });
});

describe("VirtualNetwork", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("alcanza toda la subred virtual con eth0 activa", () => {
    const { network } = buildStack();

    expect(network.isReachable("10.10.0.30")).toBe(true);
    expect(network.isReachable("10.10.1.7")).toBe(true);
    expect(network.isReachable("127.0.0.1")).toBe(true);
  });

  it("no alcanza nada fuera de la subred virtual", () => {
    const { network } = buildStack();

    expect(network.isReachable("8.8.8.8")).toBe(false);
    expect(network.isReachable("142.250.0.1")).toBe(false);
    expect(network.isReachable("192.168.1.1")).toBe(false);
  });

  it("al bajar eth0 la red virtual deja de responder", () => {
    const { network } = buildStack();

    network.setInterfaceState("eth0", false);

    expect(network.isReachable("10.10.0.30")).toBe(false);
    expect(network.isReachable("127.0.0.1")).toBe(true);
  });
});

describe("VirtualBrowser", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("abre los sitios base", () => {
    const { browser } = buildStack();

    const page = browser.open("www.nande", "/");

    expect(page.hostname).toBe("www.nande");
    expect(page.address).toMatch(/^10\.10\./);
    expect(page.content).toContain("ÑANDE");
  });

  it("navega rutas internas de un sitio", () => {
    const { browser } = buildStack();

    const page = browser.open("video.nande", "/watch/redes");

    expect(page.path).toBe("/watch/redes");
    expect(page.content).toContain("redes");
  });

  it("falla ante un dominio que no existe", () => {
    const { browser } = buildStack();

    expect(() => browser.open("noexiste.nande")).toThrow(/DNS/);
    expect(browser.canOpen("noexiste.nande")).toBe(false);
  });

  it("rechaza dominios reales", () => {
    const { browser } = buildStack();

    expect(() => browser.open("google.com")).toThrow(/DNS/);
    expect(browser.canOpen("github.com")).toBe(false);
  });

  it("deja de navegar si se baja la interfaz de red", () => {
    const { browser, network } = buildStack();

    expect(browser.canOpen("www.nande")).toBe(true);

    network.setInterfaceState("eth0", false);

    expect(() => browser.open("www.nande")).toThrow(/no es alcanzable/);
  });

  it("falla ante una ruta inexistente del sitio", () => {
    const { browser } = buildStack();

    expect(() => browser.open("www.nande", "/no/existe")).toThrow(
      /no disponible/,
    );
  });
});

describe("VirtualSearch", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("encuentra los sitios base", () => {
    const { search } = buildStack();

    expect(search.search("academy").length).toBeGreaterThan(0);
    expect(search.search("")).toHaveLength(0);
    expect(search.search("xyzynoexiste")).toHaveLength(0);
  });

  it("indexa contenido nuevo y lo puede quitar", () => {
    const { search } = buildStack();

    search.index({
      hostname: "nueva.nande",
      title: "Nueva",
      description: "Sitio recien creado",
      keywords: ["prueba"],
    });

    expect(search.search("recien")).toHaveLength(1);

    search.removeByHostname("nueva.nande");
    expect(search.search("recien")).toHaveLength(0);
  });
});

describe("WorldPublisher", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("normaliza nombres a etiquetas de dominio", () => {
    expect(slugify("App Yvoty")).toBe("app-yvoty");
    expect(slugify("Ñande Porã")).toBe("nande-pora");
    expect(slugify("  Lab   Kuarahy  ")).toBe("lab-kuarahy");
  });

  it("publica una entidad como sitio navegable y buscable", () => {
    const { publisher, dns, browser, search } = buildStack();
    const registry = new WorldRegistry();

    const entity = registry.create(
      "app",
      "App Yvoty",
      "Una aplicación de prueba",
      "person-1",
      42,
      ["programación"],
      { ownerName: "Yvoty" },
    );

    const hostname = publisher.publish(entity);

    // Dominio dado de alta en el DNS virtual.
    expect(hostname).toBe("app-yvoty.nande");
    expect(dns.resolve(hostname)).toMatch(/^10\.10\./);

    // Navegable desde el navegador virtual.
    const page = browser.open(hostname);
    expect(page.title).toBe("App Yvoty");
    expect(page.content).toContain("Yvoty");
    expect(page.content).toContain("programación");

    // Y buscable.
    const results = search.search("Yvoty");
    expect(results.some((r) => r.hostname === hostname)).toBe(true);
    expect(results[0].entityId).toBe(entity.id);
  });

  it("evita colisiones de dominio entre entidades homonimas", () => {
    const { publisher } = buildStack();
    const registry = new WorldRegistry();

    const a = registry.create("app", "App Yvoty", "d", "p1", 1);
    const b = registry.create("app", "App Yvoty", "d", "p2", 2);

    const hostA = publisher.publish(a);
    const hostB = publisher.publish(b);

    expect(hostA).not.toBe(hostB);
  });

  it("escapa el contenido para no romper la pagina", () => {
    const { publisher, browser } = buildStack();
    const registry = new WorldRegistry();

    const entity = registry.create(
      "app",
      "Test",
      '<script>alert("x")</script>',
      "p1",
      1,
    );

    const page = browser.open(publisher.publish(entity));

    expect(page.content).not.toContain("<script>");
    expect(page.content).toContain("&lt;script&gt;");
  });
});
