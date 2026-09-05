import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { Economy } from "./Economy";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Economy", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("arranca con empresas cotizando y un índice", () => {
    const eco = new Economy();
    const snap = eco.snapshot();

    expect(snap.stocks.length).toBeGreaterThan(0);
    expect(snap.index).toBeGreaterThan(0);
    expect(snap.marketCap).toBeGreaterThan(0);
  });

  it("los precios se mueven con el tiempo y se mueve dinero", () => {
    const eco = new Economy();
    const before = eco.snapshot();

    for (let t = 1; t <= 100; t++) eco.tick(t);

    const after = eco.snapshot();
    expect(after.moneyMoved).toBeGreaterThan(before.moneyMoved);
    // Al menos un precio cambió.
    const changed = after.stocks.some(
      (s, i) => s.price !== before.stocks[i].price,
    );
    expect(changed).toBe(true);
  });

  it("la economía crece a largo plazo, con altibajos", () => {
    const eco = new Economy();
    const i0 = eco.snapshot().index;
    for (let t = 1; t <= 3000; t++) eco.tick(t);
    // Tendencia claramente alcista pero no hiperinflacionaria.
    const i1 = eco.snapshot().index;
    expect(i1).toBeGreaterThan(i0);
    expect(i1).toBeLessThan(i0 * 100);
  });

  it("ningún precio baja de 1", () => {
    const eco = new Economy();
    for (let t = 1; t <= 500; t++) eco.tick(t);
    for (const s of eco.snapshot().stocks) {
      expect(s.price).toBeGreaterThanOrEqual(1);
    }
  });

  it("comprar descuenta y vender acredita", () => {
    const eco = new Economy();
    let cash = 10000;
    const spend = (a: number) => {
      if (cash < a) return false;
      cash -= a;
      return true;
    };
    const earn = (a: number) => {
      cash += a;
    };

    const stock = eco.getStock("ÑND")!;
    const buy = eco.buy("ÑND", 10, spend);
    expect(buy.ok).toBe(true);
    expect(cash).toBe(10000 - stock.price * 10);
    expect(eco.snapshot().portfolio["ÑND"]).toBe(10);

    const sell = eco.sell("ÑND", 5, earn);
    expect(sell.ok).toBe(true);
    expect(eco.snapshot().portfolio["ÑND"]).toBe(5);
  });

  it("no se puede comprar sin saldo ni vender lo que no se tiene", () => {
    const eco = new Economy();
    expect(eco.buy("ÑND", 1, () => false).ok).toBe(false);
    expect(eco.sell("ÑND", 1, () => {}).ok).toBe(false);
    expect(eco.buy("XXX", 1, () => true).ok).toBe(false);
  });

  it("persiste el mercado y la cartera", () => {
    const eco = new Economy();
    eco.buy("ARA", 3, () => true);
    for (let t = 1; t <= 20; t++) eco.tick(t);
    eco.flush();

    const reloaded = new Economy();
    expect(reloaded.snapshot().portfolio["ARA"]).toBe(3);
    expect(reloaded.snapshot().moneyMoved).toBeGreaterThan(0);
  });
});

describe("economía en el mundo", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("el jugador empieza con capital para invertir", () => {
    const kernel = new VirtualKernel();
    expect(kernel.player.wallet).toBe(5000);
    kernel.dispose();
  });

  it("invertir desde la terminal mueve el saldo real del jugador", () => {
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    const before = kernel.player.wallet;
    const out = term.execute("buy-stock ARA 5");
    expect(out).toContain("Compraste");
    expect(kernel.player.wallet).toBeLessThan(before);

    term.execute("sell-stock ARA 5");
    expect(kernel.player.wallet).toBeGreaterThan(0);

    kernel.dispose();
  });

  it("el mundo reporta cuánto dinero se mueve", () => {
    const kernel = new VirtualKernel();
    for (let t = 1; t <= 100; t++) kernel.tick();

    const summary = kernel.summary();
    expect(summary.economy.moneyMoved).toBeGreaterThan(0);
    expect(summary.economy.index).toBeGreaterThan(0);

    kernel.dispose();
  });
});
