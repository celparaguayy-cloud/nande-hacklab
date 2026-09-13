import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";

interface Props {
  kernel: VirtualKernel;
}

/**
 * Anonimato / OPSEC + Dark Web — todo accionable. Botones que CAMBIAN el estado
 * real: activar/desactivar el circuito de anonimato, y navegar servicios .onion
 * (que sólo responden con el circuito activo). La exposición y el calor salen
 * del estado real del OpsecTracer. Nada es decorativo.
 */
export function AnonView({ kernel }: Props) {
  const [, setNonce] = useState(0);
  const refresh = () => setNonce((n) => n + 1);
  const [onionOut, setOnionOut] = useState<string>("");
  const [flash, setFlash] = useState<string>("");

  const anon = kernel.anonymity;
  const opsec = kernel.opsec.state();
  const tor = anon.isTorEnabled();

  const toggleTor = () => {
    if (tor) anon.disableTor();
    else anon.enableTor();
    refresh();
  };
  const newCircuit = () => { anon.newCircuit(); refresh(); };

  const openOnion = (addr: string) => {
    const r = kernel.onion.browse(addr);
    if (!r.ok) { setOnionOut(`⚠ ${r.message}`); return; }
    const notes = r.site!.flag ? kernel.scanForSignals(r.site!.content) : [];
    if (notes.length) setFlash(notes.join(" "));
    setOnionOut(`🧅 ${r.site!.title}\n\n${r.site!.content}`);
  };

  return (
    <div style={container}>
      <div style={header}>
        <span style={{ fontSize: 20 }}>🕵️</span>
        <div style={{ fontWeight: 700 }}>Anonimato · OPSEC · Dark Web</div>
      </div>

      <div style={body}>
        {/* Estado + toggle real */}
        <div style={{ ...card, borderLeft: `3px solid ${tor ? "#22c55e" : "#ef4444"}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Circuito de anonimato: {tor ? "🟢 ACTIVO" : "🔴 apagado"}</div>
              <div style={{ fontSize: 12, color: "#8b98a5", marginTop: 3, fontFamily: "ui-monospace, monospace" }}>
                IP visible: {anon.visibleIp("10.10.0.5")}{tor ? ` · salida ${anon.exitNode().pais}` : " (tu IP real)"}
              </div>
            </div>
            <button style={tor ? offBtn : onBtn} onClick={toggleTor}>{tor ? "Apagar" : "Activar"}</button>
          </div>
          {tor && <button style={smallBtn} onClick={newCircuit}>Nuevo circuito (rotar salida)</button>}
        </div>

        {/* Exposición OPSEC real */}
        <div style={sectionTitle}>Tu rastro (OPSEC)</div>
        <div style={grid}>
          <Stat label="Ataques expuestos" value={opsec.exposedCount} color="#ef4444" />
          <Stat label="Enmascarados" value={opsec.maskedCount} color="#22c55e" />
          <Stat label="Calor" value={opsec.heat} color="#f97316" />
          <Stat label="Redadas" value={opsec.busts} color="#eab308" />
        </div>
        {kernel.opsec.atRisk() && (
          <div style={warn}>⚠ Estás atacando sin anonimato: tu IP real queda expuesta. Activá el circuito.</div>
        )}

        {/* Dark web accionable */}
        <div style={sectionTitle}>Dark web (.onion) — requiere circuito activo</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {kernel.onion.directory().map((s) => (
            <div key={s.address} style={onionRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#8b98a5", fontFamily: "ui-monospace, monospace" }}>{s.address}</div>
              </div>
              <button style={smallBtn} onClick={() => openOnion(s.address)}>Abrir</button>
            </div>
          ))}
        </div>

        {flash && <div style={flashBox}>{flash}</div>}
        {onionOut && <pre style={onionOutBox}>{onionOut}</pre>}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={statBox}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "#8b98a5" }}>{label}</div>
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif" };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #1b2733" };
const body: CSSProperties = { flex: 1, overflowY: "auto", padding: 12 };
const card: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderRadius: 8, padding: 12, marginBottom: 4 };
const sectionTitle: CSSProperties = { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", margin: "16px 0 8px" };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(78px, 1fr))", gap: 8 };
const statBox: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderRadius: 8, padding: "8px 6px", textAlign: "center" };
const onBtn: CSSProperties = { background: "#15803d", color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12.5, cursor: "pointer", fontWeight: 600 };
const offBtn: CSSProperties = { background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12.5, cursor: "pointer", fontWeight: 600 };
const smallBtn: CSSProperties = { background: "#1b2733", color: "#7cc4ff", border: "1px solid #2a3a4a", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", marginTop: 8 };
const onionRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8, background: "#0e141b", border: "1px solid #1b2733", borderRadius: 6, padding: "7px 9px" };
const warn: CSSProperties = { marginTop: 8, background: "#2a1010", border: "1px solid #7f1d1d", color: "#fca5a5", borderRadius: 8, padding: "8px 10px", fontSize: 12.5 };
const flashBox: CSSProperties = { marginTop: 10, background: "#052e1a", border: "1px solid #15803d", color: "#86efac", borderRadius: 8, padding: "8px 10px", fontSize: 12.5 };
const onionOutBox: CSSProperties = { marginTop: 10, background: "#0e141b", border: "1px solid #1b2733", borderRadius: 8, padding: "8px 10px", fontSize: 11.5, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, monospace", color: "#c9d3dd" };

export default AnonView;
