import type { EventBus } from "../events/EventBus";

/**
 * Economía y bolsa de valores de ÑANDE.
 *
 * Un mercado con empresas cuyas acciones suben y bajan, habitantes que
 * mueven dinero, y una macroeconomía observable: el índice del mercado y
 * cuánta plata circula. Todo en moneda virtual N$, dentro del sandbox.
 */

export interface Stock {
  ticker: string;
  name: string;
  price: number;
  prevPrice: number;
  shares: number;
}

export interface EconomySnapshot {
  stocks: Stock[];
  index: number;
  moneyMoved: number;
  marketCap: number;
  portfolio: Record<string, number>;
  portfolioValue: number;
}

const STORAGE_KEY = "nande-economy";

const SEED_STOCKS: Array<Omit<Stock, "prevPrice">> = [
  { ticker: "ÑND", name: "Ñande Corp", price: 120, shares: 100000 },
  { ticker: "GUA", name: "Guaraní Tech", price: 85, shares: 80000 },
  { ticker: "PYT", name: "Pytã Security", price: 210, shares: 40000 },
  { ticker: "ARA", name: "Arandu Software", price: 64, shares: 120000 },
  { ticker: "YVO", name: "Yvoty Media", price: 45, shares: 150000 },
  { ticker: "TAP", name: "Tapé Networks", price: 158, shares: 60000 },
  { ticker: "KUA", name: "Kuarahy Energy", price: 92, shares: 90000 },
  { ticker: "MBA", name: "Mbarete Bank", price: 300, shares: 30000 },
];

const PRICE_INTERVAL = 5;
const VOLATILITY = 0.05;

/** Sesgo alcista: la economía crece de fondo, con altibajos. */
const GROWTH_BIAS = 0.0015;

interface EconomyState {
  stocks: Stock[];
  moneyMoved: number;
  portfolio: Record<string, number>;
  baseIndex: number;
}

export class Economy {
  private state: EconomyState;
  private events?: EventBus;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(events?: EventBus) {
    this.events = events;

    const saved = this.load();

    this.state = saved ?? {
      stocks: SEED_STOCKS.map((s) => ({ ...s, prevPrice: s.price })),
      moneyMoved: 0,
      portfolio: {},
      baseIndex: SEED_STOCKS.reduce((sum, s) => sum + s.price, 0),
    };
  }

  private load(): EconomyState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const saved = JSON.parse(raw) as EconomyState;
      if (!saved || !Array.isArray(saved.stocks)) return null;

      return {
        stocks: saved.stocks,
        moneyMoved: saved.moneyMoved ?? 0,
        portfolio: saved.portfolio ?? {},
        baseIndex: saved.baseIndex ?? 1,
      };
    } catch {
      return null;
    }
  }

  private write(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // La economía sigue aunque no se pueda guardar.
    }
  }

  private save(): void {
    if (this.saveTimer !== null) return;

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.write();
    }, 800);
  }

  flush(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.write();
  }

  /** Índice del mercado normalizado a base 1000. */
  index(): number {
    const sum = this.state.stocks.reduce((s, st) => s + st.price, 0);
    return Math.round((sum / this.state.baseIndex) * 1000);
  }

  marketCap(): number {
    return this.state.stocks.reduce((sum, s) => sum + s.price * s.shares, 0);
  }

  getStock(ticker: string): Stock | undefined {
    const s = this.state.stocks.find(
      (st) => st.ticker.toLowerCase() === ticker.toLowerCase(),
    );
    return s ? { ...s } : undefined;
  }

  /**
   * Sacude el precio de una acción por un factor (ej. -0.35 = cae 35%).
   * Es la vía por la que un hack del jugador impacta la bolsa: filtrás la
   * brecha de un banco y su acción se desploma.
   */
  shock(ticker: string, factor: number): boolean {
    const stock = this.state.stocks.find(
      (st) => st.ticker.toLowerCase() === ticker.toLowerCase(),
    );
    if (!stock) return false;

    stock.prevPrice = stock.price;
    stock.price = Math.max(1, Math.round(stock.price * (1 + factor)));
    this.save();

    this.events?.emit("economy.tick", {
      index: this.index(),
      moneyMoved: this.state.moneyMoved,
    });

    return true;
  }

  portfolioValue(): number {
    let value = 0;
    for (const [ticker, qty] of Object.entries(this.state.portfolio)) {
      const stock = this.getStock(ticker);
      if (stock) value += stock.price * qty;
    }
    return Math.round(value);
  }

  snapshot(): EconomySnapshot {
    return {
      stocks: this.state.stocks.map((s) => ({ ...s })),
      index: this.index(),
      moneyMoved: this.state.moneyMoved,
      marketCap: this.marketCap(),
      portfolio: { ...this.state.portfolio },
      portfolioValue: this.portfolioValue(),
    };
  }

  tick(tick: number, fundamentals: Record<string, number> = {}): void {
    if (tick % PRICE_INTERVAL !== 0) return;

    for (const stock of this.state.stocks) {
      stock.prevPrice = stock.price;

      // El precio se mueve por tres cosas: ruido de corto plazo, el sesgo
      // de crecimiento del mundo, y —lo nuevo— los fundamentos del sector:
      // si la gente de esa industria mejora su habilidad y prospera, la
      // acción sube; si el sector se debilita, baja. Así la bolsa refleja
      // la economía real de los habitantes, no solo azar.
      const strength = fundamentals[stock.ticker];
      const fundamental =
        strength === undefined ? 0 : (strength - 0.5) * 0.02;

      const noise = (Math.random() * 2 - 1) * VOLATILITY;
      const change = noise + GROWTH_BIAS + fundamental;
      stock.price = Math.max(1, Math.round(stock.price * (1 + change)));

      this.state.moneyMoved +=
        Math.abs(stock.price - stock.prevPrice) *
        Math.round(stock.shares / 100);
    }

    this.state.moneyMoved += Math.round(Math.random() * 5000);

    this.events?.emit("economy.tick", {
      index: this.index(),
      moneyMoved: this.state.moneyMoved,
    });

    this.save();
  }

  buy(
    ticker: string,
    qty: number,
    spend: (amount: number) => boolean,
  ): { ok: boolean; message: string } {
    const stock = this.getStock(ticker);
    if (!stock) return { ok: false, message: `No cotiza "${ticker}".` };
    if (qty <= 0) return { ok: false, message: "Cantidad inválida." };

    const cost = stock.price * qty;
    if (!spend(cost)) {
      return { ok: false, message: `No te alcanza: cuesta N$${cost}.` };
    }

    this.state.portfolio[stock.ticker] =
      (this.state.portfolio[stock.ticker] ?? 0) + qty;
    this.state.moneyMoved += cost;
    this.save();

    return {
      ok: true,
      message: `Compraste ${qty} ${stock.ticker} a N$${stock.price} (total N$${cost}).`,
    };
  }

  sell(
    ticker: string,
    qty: number,
    earn: (amount: number) => void,
  ): { ok: boolean; message: string } {
    const stock = this.getStock(ticker);
    if (!stock) return { ok: false, message: `No cotiza "${ticker}".` };

    const held = this.state.portfolio[stock.ticker] ?? 0;
    if (qty <= 0 || qty > held) {
      return { ok: false, message: `No tenés ${qty} de ${stock.ticker}.` };
    }

    const income = stock.price * qty;
    this.state.portfolio[stock.ticker] = held - qty;
    if (this.state.portfolio[stock.ticker] === 0) {
      delete this.state.portfolio[stock.ticker];
    }

    earn(income);
    this.state.moneyMoved += income;
    this.save();

    return {
      ok: true,
      message: `Vendiste ${qty} ${stock.ticker} a N$${stock.price} (+N$${income}).`,
    };
  }
}
