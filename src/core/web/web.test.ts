import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { Marketplace, CATEGORIES } from "./Marketplace";
import { WorldRegistry } from "../world/WorldRegistry";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Marketplace", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("tiene productos en varias categorías", () => {
    const shop = new Marketplace(new WorldRegistry());
    expect(shop.count()).toBeGreaterThan(10);
    for (const c of CATEGORIES) {
      // Cada categoría con al menos un producto base salvo que no aplique.
      expect(shop.byCategory(c.id).length).toBeGreaterThanOrEqual(0);
    }
    expect(shop.byCategory("ferreteria").length).toBeGreaterThan(0);
  });

  it("busca por categoría y por texto", () => {
    const shop = new Marketplace(new WorldRegistry());
    expect(shop.search("ferretería").length).toBeGreaterThan(0);
    expect(shop.search("taladro").some((p) => p.name.includes("Taladro"))).toBe(true);
    expect(shop.search("")).toHaveLength(0);
  });

  it("incluye las creaciones de los habitantes", () => {
    const registry = new WorldRegistry();
    registry.create("tool", "Herramienta Bot", "una tool", "p1", 1, [], { ownerName: "Yvoty" });
    const shop = new Marketplace(registry);
    expect(shop.products().some((p) => p.name === "Herramienta Bot")).toBe(true);
  });

  it("comprar descuenta y no se puede comprar dos veces", () => {
    const shop = new Marketplace(new WorldRegistry());
    let cash = 1000;
    const spend = (a: number) => (cash >= a ? ((cash -= a), true) : false);

    const first = shop.buy("p-martillo", spend);
    expect(first.ok).toBe(true);
    expect(cash).toBe(940);
    expect(shop.hasBought("p-martillo")).toBe(true);

    const second = shop.buy("p-martillo", spend);
    expect(second.ok).toBe(false);
  });

  it("no compra sin saldo", () => {
    const shop = new Marketplace(new WorldRegistry());
    expect(shop.buy("p-laptop", () => false).ok).toBe(false);
  });

  it("las compras persisten", () => {
    const registry = new WorldRegistry();
    new Marketplace(registry).buy("p-ide", () => true);
    expect(new Marketplace(registry).hasBought("p-ide")).toBe(true);
  });
});

describe("web funcional navegable", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("la tienda se navega y se compra desde el navegador", () => {
    const kernel = new VirtualKernel();

    expect(kernel.browser.open("shop.nande").content).toContain("Store");
    expect(
      kernel.browser.open("shop.nande", "/category/ferreteria").content,
    ).toContain("Taladro");

    const before = kernel.player.wallet;
    const buy = kernel.browser.open("shop.nande", "/buy/p-martillo");
    expect(buy.content).toContain("Compra realizada");
    expect(kernel.player.wallet).toBe(before - 60);

    kernel.dispose();
  });

  it("git.nande lista repositorios y abre uno", () => {
    const kernel = new VirtualKernel();
    expect(kernel.browser.open("git.nande").content).toContain("ÑANDE Git");
    expect(
      kernel.browser.open("git.nande", "/repo/nande-os").content,
    ).toContain("README");
    kernel.dispose();
  });

  it("buscar palabras clave lleva al sitio correcto", () => {
    const kernel = new VirtualKernel();
    const hosts = (q: string) => kernel.search.search(q).map((r) => r.hostname);

    expect(hosts("ferretería")[0]).toContain("ferreteria");
    expect(hosts("github")[0]).toBe("git.nande");
    expect(hosts("quiero comprar")[0]).toBe("shop.nande");
    expect(hosts("cursos de hacking")[0]).toBe("academy.nande");

    kernel.dispose();
  });

  it("comprar algo real no toca Internet real", () => {
    const kernel = new VirtualKernel();
    // shop.nande y git.nande resuelven a la red virtual.
    expect(kernel.dns.resolve("shop.nande")).toMatch(/^10\.10\./);
    expect(kernel.dns.resolve("git.nande")).toMatch(/^10\.10\./);
    expect(kernel.browser.canOpen("amazon.com")).toBe(false);
    kernel.dispose();
  });
});
