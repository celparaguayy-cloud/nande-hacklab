import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { Incident } from "../../core/soc/Investigator";

interface Props {
  kernel: VirtualKernel;
}

const SEV_COLOR: Record<string, string> = {
  info: "#64748b", low: "#38bdf8", medium: "#eab308", high: "#f97316", critical: "#ef4444",
};

/**
 * DFIR — respuesta a incidentes, accionable. Un botón RECONSTRUYE el incidente
 * desde los eventos reales que el mundo recordó: veredicto, técnicas MITRE y la
 * línea de tiempo verdadera. Si el mundo está quieto, no hay caso (y lo dice).
 */
export function DfirView({ kernel }: Props) {
  const [inc, setInc] = useState<Incident | null>(null);
  const [ran, setRan] = useState(false);

  const reconstruct = () => {
    setInc(kernel.dfir.reconstruct());
    setRan(true);
  };

  return (
    <div style={container}>
      <div style={header}>
        <span style={{ fontSize: 20 }}>🕵️</span>
        <div style={{ fontWeight: 700 }}>DFIR — respuesta a incidentes</div>
        <button style={runBtn} onClick={reconstruct}>Reconstruir incidente</button>
      </div>

      <div style={body}>
        {!ran && (
          <div style={hint}>
            Tocá <b>Reconstruir incidente</b>: junto los eventos reales que el mundo
            recordó (logins, servicios caídos, técnicas detectadas) y armo la
            línea de tiempo del ataque. El adversario NPC ataca solo con el tiempo,
            así que casi siempre hay algo que investigar.
          </div>
        )}
        {ran && !inc && (
          <div style={hint}>
            Nada que investigar todavía: el mundo está tranquilo. Dejalo correr
            (o generá actividad) y volvé a reconstruir.
          </div>
        )}
        {inc && (
          <>
            <div style={{ ...card, borderLeft: `3px solid ${SEV_COLOR[inc.severity]}` }}>
              <div style={{ fontWeight: 700, color: SEV_COLOR[inc.severity], textTransform: "uppercase" }}>
                Severidad: {inc.severity}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>{inc.verdict}</div>
              <div style={{ fontSize: 12, color: "#8b98a5", marginTop: 6 }}>
                Hosts: {inc.hostsAffected.join(", ")} · Ventana t={inc.firstTick}→{inc.lastTick}
              </div>
              <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 4, fontFamily: "ui-monospace, monospace" }}>
                MITRE: {inc.techniques.join(", ") || "—"}
              </div>
            </div>

            <div style={sectionTitle}>Línea de tiempo (evidencia real)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {inc.timeline.slice(-30).map((e, i) => (
                <div key={i} style={tlRow}>
                  <span style={{ color: "#64748b", minWidth: 54, fontFamily: "ui-monospace, monospace", fontSize: 11 }}>t={e.tick}</span>
                  <span style={{ minWidth: 130, fontSize: 12 }}>{e.host}</span>
                  <span style={{ flex: 1, fontSize: 12, color: "#c9d3dd" }}>
                    {e.kind}{e.mitreId ? ` [${e.mitreId}]` : ""} — {e.detail}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif" };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #1b2733" };
const runBtn: CSSProperties = { marginLeft: "auto", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12.5, cursor: "pointer", fontWeight: 600 };
const body: CSSProperties = { flex: 1, overflowY: "auto", padding: 12 };
const hint: CSSProperties = { color: "#8b98a5", fontSize: 13, lineHeight: 1.7 };
const card: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderRadius: 8, padding: 12 };
const sectionTitle: CSSProperties = { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", margin: "16px 0 8px" };
const tlRow: CSSProperties = { display: "flex", gap: 8, alignItems: "baseline", padding: "3px 0", borderBottom: "1px solid #131c26" };

export default DfirView;
