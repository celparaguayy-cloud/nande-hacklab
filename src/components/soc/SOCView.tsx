import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { Alert, Severity } from "../../core/security/BlueTeam";

interface SOCViewProps {
  kernel: VirtualKernel;
}

const COLORS: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#38bdf8",
  info: "#64748b",
};

/**
 * ÑANDE SOC — panel del Blue Team. Muestra, en vivo, las alertas que genera
 * el runtime: cada una nació de algo REAL (un servicio caído, un login
 * fallido, un proceso muerto). No es una pantalla decorativa: si no pasa nada,
 * está vacía; provocás un evento y aparece.
 */
export function SOCView({ kernel }: SOCViewProps) {
  const [alerts, setAlerts] = useState<Alert[]>(() => kernel.soc.list());

  useEffect(() => {
    const refresh = () => setAlerts(kernel.soc.list());
    const un1 = kernel.events.subscribe("runtime.host", refresh);
    const un2 = kernel.events.subscribe("world.tick", refresh);
    return () => {
      un1();
      un2();
    };
  }, [kernel]);

  const counts = kernel.soc.countBySeverity();
  const openInc = kernel.threats.openIncidents();
  const tick = () => kernel.world.getState().clock.tick;

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>🛡️ Centro de Operaciones (Blue Team)</div>
        <button style={clearBtn} onClick={() => { kernel.soc.clear(); setAlerts([]); }}>
          Archivar
        </button>
      </div>

      {openInc.length > 0 && (
        <div style={{ background: "#2a1010", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px", margin: "0 12px" }}>
          <div style={{ fontWeight: 700, color: "#fca5a5", marginBottom: 6 }}>
            🔴 {openInc.length} incidente(s) activo(s) en tu data center
          </div>
          {openInc.map((i) => (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "2px 0" }}>
              <span style={{ flex: 1 }}>{i.rival} tiró <b>{i.service}</b> de {i.host}</span>
              <button
                style={{ ...clearBtn, background: "#15803d", color: "#fff", border: "none" }}
                onClick={() => { kernel.threats.contain(i.id, tick()); setAlerts(kernel.soc.list()); }}
              >
                Contener
              </button>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#8b98a5", marginTop: 4 }}>
            Puntaje defensa: {kernel.threats.scoreState().score} · {kernel.threats.rank()}
          </div>
        </div>
      )}

      <div style={counters}>
        {(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => (
          <div key={s} style={{ ...counter, borderColor: COLORS[s] }}>
            <span style={{ color: COLORS[s], fontWeight: 700 }}>{counts[s]}</span>
            <span style={{ fontSize: 10, color: "#8b98a5" }}>{s}</span>
          </div>
        ))}
      </div>

      <div style={list}>
        {alerts.length === 0 && (
          <div style={empty}>
            Sin alertas. Provocá un evento (por ejemplo, en la Terminal:
            <br />
            <code style={code}>service-stop nginx server.nande</code>
            <br />
            y mirá cómo aparece acá.
          </div>
        )}
        {alerts.map((a) => (
          <div key={a.id} style={{ ...row, borderLeftColor: COLORS[a.severity] }}>
            <div style={rowTop}>
              <span style={{ ...pill, background: COLORS[a.severity] }}>{a.severity.toUpperCase()}</span>
              <span style={{ fontWeight: 600 }}>{a.title}</span>
              <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 11 }}>{a.host}</span>
            </div>
            <div style={{ color: "#c9d3dd", fontSize: 12 }}>{a.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const container: CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#0b1016",
  color: "#e6edf3",
  fontFamily: "system-ui, sans-serif",
};
const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderBottom: "1px solid #1b2733",
};
const clearBtn: CSSProperties = {
  marginLeft: "auto",
  background: "#111820",
  color: "#8b98a5",
  border: "1px solid #1b2733",
  borderRadius: 6,
  padding: "5px 10px",
  fontSize: 12,
  cursor: "pointer",
};
const counters: CSSProperties = { display: "flex", gap: 8, padding: "10px 12px", flexWrap: "wrap" };
const counter: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: 52,
  padding: "6px 8px",
  border: "1px solid",
  borderRadius: 8,
  background: "#0e141b",
};
const list: CSSProperties = { flex: 1, overflowY: "auto", padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 };
const empty: CSSProperties = { color: "#8b98a5", fontSize: 13, lineHeight: 1.7, marginTop: 16, textAlign: "center" };
const code: CSSProperties = { background: "#111820", padding: "2px 6px", borderRadius: 4, fontFamily: "ui-monospace, monospace" };
const row: CSSProperties = {
  background: "#0e141b",
  border: "1px solid #1b2733",
  borderLeft: "3px solid",
  borderRadius: 6,
  padding: "8px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};
const rowTop: CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const pill: CSSProperties = { color: "#05080c", fontWeight: 700, fontSize: 10, padding: "1px 6px", borderRadius: 999 };

export default SOCView;
