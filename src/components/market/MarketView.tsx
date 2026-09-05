import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { EconomySnapshot } from "../../core/economy/Economy";

interface MarketViewProps {
  kernel: VirtualKernel;
}

/** Bolsa de ÑANDE: precios en vivo, tu cartera y la macroeconomía. */
function MarketView({ kernel }: MarketViewProps) {
  const [eco, setEco] = useState<EconomySnapshot>(() =>
    kernel.economy.snapshot(),
  );
  const [wallet, setWallet] = useState(() => kernel.player.wallet);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const refresh = () => {
      setEco(kernel.economy.snapshot());
      setWallet(kernel.player.wallet);
    };
    refresh();
    const unsubs = [
      kernel.events.subscribe("economy.tick", refresh),
      kernel.events.subscribe("player.xp", refresh),
    ];
    return () => {
      for (const off of unsubs) off();
    };
  }, [kernel]);

  const trade = (ticker: string, action: "buy" | "sell") => {
    const result =
      action === "buy"
        ? kernel.economy.buy(ticker, 1, (a) => kernel.player.spend(a))
        : kernel.economy.sell(ticker, 1, (a) => kernel.player.earn(a));
    setMsg(result.message);
    setEco(kernel.economy.snapshot());
    setWallet(kernel.player.wallet);
  };

  return (
    <div style={container}>
      <div style={header}>
        <h2 style={{ margin: 0 }}>📈 Bolsa de ÑANDE</h2>
        <div style={{ color: "#8b98a5", fontSize: 13 }}>
          Índice {eco.index} · 💸 N${eco.moneyMoved.toLocaleString()} movidos
        </div>
      </div>

      <div style={statsRow}>
        <Stat label="Tu efectivo" value={`N$${wallet.toLocaleString()}`} />
        <Stat
          label="Tu cartera"
          value={`N$${eco.portfolioValue.toLocaleString()}`}
        />
        <Stat
          label="Capitalización"
          value={`N$${(eco.marketCap / 1e6).toFixed(1)}M`}
        />
      </div>

      {msg && <div style={msgBox}>{msg}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {eco.stocks.map((s) => {
          const diff = s.price - s.prevPrice;
          const held = eco.portfolio[s.ticker] ?? 0;
          const up = diff > 0;
          const down = diff < 0;

          return (
            <div key={s.ticker} style={row}>
              <div style={{ minWidth: 46, fontWeight: 700 }}>{s.ticker}</div>
              <div style={{ flex: 1, color: "#b5c0cc" }}>{s.name}</div>
              <div style={{ minWidth: 70, textAlign: "right" }}>
                N${s.price}
              </div>
              <div
                style={{
                  minWidth: 46,
                  textAlign: "right",
                  color: up ? "#7ee2a8" : down ? "#e2857e" : "#8b98a5",
                }}
              >
                {up ? "▲" : down ? "▼" : "="}
                {Math.abs(diff)}
              </div>
              <div style={{ minWidth: 40, textAlign: "right", color: "#8b98a5" }}>
                {held > 0 ? `×${held}` : ""}
              </div>
              <button onClick={() => trade(s.ticker, "buy")} style={btn}>
                Comprar
              </button>
              <button
                onClick={() => trade(s.ticker, "sell")}
                style={{ ...btn, opacity: held > 0 ? 1 : 0.4 }}
                disabled={held === 0}
              >
                Vender
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCard}>
      <div style={{ color: "#8b98a5", fontSize: 12 }}>{label}</div>
      <strong style={{ fontSize: 18 }}>{value}</strong>
    </div>
  );
}

const container: CSSProperties = {
  width: "100%",
  height: "100%",
  overflow: "auto",
  boxSizing: "border-box",
  padding: 16,
  background: "#0b0f14",
  color: "#e6edf3",
  fontFamily: "system-ui, sans-serif",
};
const header: CSSProperties = { marginBottom: 14 };
const statsRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 8,
  marginBottom: 14,
};
const statCard: CSSProperties = {
  padding: 10,
  border: "1px solid #26313b",
  borderRadius: 8,
  background: "#111820",
};
const row: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  border: "1px solid #26313b",
  borderRadius: 8,
  background: "#111820",
  fontSize: 14,
};
const btn: CSSProperties = {
  padding: "5px 10px",
  border: "1px solid #34414d",
  borderRadius: 6,
  background: "#1b2430",
  color: "#e6edf3",
  cursor: "pointer",
  fontSize: 12,
};
const msgBox: CSSProperties = {
  marginBottom: 10,
  padding: "6px 10px",
  borderRadius: 6,
  background: "#12202a",
  color: "#7ee2a8",
  fontSize: 13,
};

export default MarketView;
