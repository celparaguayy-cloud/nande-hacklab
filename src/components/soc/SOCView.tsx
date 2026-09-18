import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { Alert, AlertStatus, Severity } from "../../core/security/BlueTeam";

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

const STATUS_LABEL: Record<AlertStatus, string> = {
  open: "abierta",
  ack: "reconocida",
  false_positive: "falso positivo",
  escalated: "escalada",
};
const STATUS_COLOR: Record<AlertStatus, string> = {
  open: "#f97316",
  ack: "#38bdf8",
  false_positive: "#64748b",
  escalated: "#ef4444",
};

/**
 * ÑANDE SOC — un SIEM operable, no un panel de adorno. Cada alerta nació de un
 * evento REAL del runtime, la disparó una REGLA con nombre y técnica MITRE, y
 * guarda la EVIDENCIA cruda para hacer drilldown. Se busca con un lenguaje de
 * consulta (severity >= high and host contains server) y se hace triage:
 * reconocer, marcar falso positivo o escalar — como en un SOC de verdad.
 */
export function SOCView({ kernel }: SOCViewProps) {
  const [, setNonce] = useState(0);
  const [query, setQuery] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const refresh = () => setNonce((n) => n + 1);

  useEffect(() => {
    const unsub = [
      kernel.events.subscribe("runtime.host", refresh),
      kernel.events.subscribe("world.tick", refresh),
      kernel.events.subscribe("attack.technique", refresh),
      kernel.events.subscribe("network.request", refresh),
    ];
    return () => unsub.forEach((u) => u());
  }, [kernel]);

  const valid = kernel.soc.validateQuery(query);
  const alerts: Alert[] = query.trim()
    ? (valid.ok ? kernel.soc.query(query) : [])
    : kernel.soc.list(200);

  const counts = kernel.soc.countBySeverity();
  const statusCounts = kernel.soc.countByStatus();
  const rules = kernel.soc.byRule();
  const openInc = kernel.threats.openIncidents();
  const mitre = kernel.mitre.recent(6);
  const tick = () => kernel.world.getState().clock.tick;

  const triage = (id: string, fn: (id: string) => boolean) => { fn(id); refresh(); };

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>ÑANDE SOC</div>
        <input
          style={{ ...search, borderColor: query && !valid.ok ? "#ef4444" : "#1b2733", color: query && !valid.ok ? "#fca5a5" : "#e6edf3" }}
          placeholder='consulta:  severity >= high   ·   host contains "server" and status == open   ·   rule == ND-005'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
        />
        <button style={btn} onClick={() => setShowRules((s) => !s)}>Reglas ({rules.length})</button>
        <button style={btn} onClick={() => { kernel.soc.clear(); refresh(); }}>Archivar</button>
      </div>

      {query && !valid.ok && <div style={queryErr}>Consulta inválida: {valid.error}</div>}

      <div style={counters}>
        {(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => (
          <button key={s} style={{ ...counter, borderColor: COLORS[s] }} onClick={() => setQuery(`severity == ${s}`)} title={`Filtrar ${s}`}>
            <span style={{ color: COLORS[s], fontWeight: 700 }}>{counts[s]}</span>
            <span style={{ fontSize: 10, color: "#8b98a5" }}>{s}</span>
          </button>
        ))}
        <span style={{ width: 1, background: "#1b2733", margin: "0 4px" }} />
        {(["open", "ack", "escalated", "false_positive"] as AlertStatus[]).map((s) => (
          <button key={s} style={{ ...counter, borderColor: STATUS_COLOR[s] }} onClick={() => setQuery(`status == ${s}`)} title={`Filtrar ${STATUS_LABEL[s]}`}>
            <span style={{ color: STATUS_COLOR[s], fontWeight: 700 }}>{statusCounts[s]}</span>
            <span style={{ fontSize: 10, color: "#8b98a5" }}>{STATUS_LABEL[s]}</span>
          </button>
        ))}
      </div>

      {showRules && (
        <div style={panel}>
          <div style={panelTitle}>REGLAS DE DETECCIÓN — lo que el SOC sabe detectar</div>
          {rules.map(({ rule, count }) => (
            <div key={rule.id} style={ruleRow}>
              <span style={{ color: "#60a5fa", fontFamily: "ui-monospace, monospace", minWidth: 60 }}>{rule.id}</span>
              <span style={{ ...pill, background: COLORS[rule.severity], minWidth: 54, textAlign: "center" }}>{rule.severity}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>{rule.name}</b>
                <div style={{ fontSize: 11, color: "#8b98a5" }}>{rule.description}</div>
                {rule.mitre && <div style={{ fontSize: 10.5, color: "#60a5fa" }}>{rule.mitre}</div>}
              </span>
              <span style={{ color: count > 0 ? "#e6edf3" : "#475569", fontSize: 12, minWidth: 64, textAlign: "right" }}>
                {count} disparo{count === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}

      {openInc.length > 0 && (
        <div style={{ ...panel, borderColor: "#7f1d1d", background: "#2a1010" }}>
          <div style={{ fontWeight: 700, color: "#fca5a5", marginBottom: 6, fontSize: 13 }}>
            {openInc.length} incidente(s) activo(s) en tu data center
          </div>
          {openInc.map((i) => (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "2px 0" }}>
              <span style={{ flex: 1 }}>{i.rival} tiró <b>{i.service}</b> de {i.host}</span>
              <button style={{ ...btn, background: "#15803d", color: "#fff", border: "none" }}
                onClick={() => { kernel.threats.contain(i.id, tick()); refresh(); }}>
                Contener
              </button>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#8b98a5", marginTop: 4 }}>
            Puntaje defensa: {kernel.threats.scoreState().score} · {kernel.threats.rank()}
          </div>
        </div>
      )}

      {kernel.redteam.compromised() && (
        <div style={{ ...panel, borderColor: "#7f1d1d", background: "#2a1010", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, fontSize: 13, color: "#fca5a5" }}>
            <b>{kernel.redteam.rival()}</b> comprometió objetivo.corp.nande (kill-chain completa).
          </span>
          <button style={{ ...btn, background: "#b91c1c", color: "#fff", border: "none" }}
            onClick={() => { kernel.redteam.evict(tick()); refresh(); }}>
            Expulsar
          </button>
        </div>
      )}

      {mitre.length > 0 && (
        <div style={{ ...panel, borderColor: "#1e3a5f", background: "#101a2a" }}>
          <div style={{ ...panelTitle, color: "#93c5fd" }}>MITRE ATT&CK — técnicas detectadas ({kernel.mitre.count()})</div>
          {mitre.slice().reverse().map((d) => (
            <div key={d.seq} style={{ display: "flex", gap: 8, fontSize: 12, padding: "2px 0" }}>
              <span style={{ color: "#60a5fa", fontFamily: "ui-monospace, monospace", minWidth: 78 }}>{d.mitreId}</span>
              <span style={{ flex: 1 }}>{d.technique}</span>
              <span style={{ color: "#64748b", fontSize: 11 }}>{d.tactic}</span>
            </div>
          ))}
        </div>
      )}

      <div style={listHead}>
        <span>ALERTAS {query.trim() ? `· ${alerts.length} coinciden` : `· ${kernel.soc.count()} totales`}</span>
        {query.trim() && <button style={{ ...btn, padding: "2px 8px" }} onClick={() => setQuery("")}>Limpiar consulta</button>}
      </div>

      <div style={list}>
        {alerts.length === 0 && (
          <div style={empty}>
            {query.trim()
              ? "Ninguna alerta coincide con la consulta."
              : <>Sin alertas. Provocá un evento real (Terminal: <code style={code}>service-stop nginx server.nande</code>) y aparece acá.</>}
          </div>
        )}
        {alerts.map((a) => {
          const isOpen = openId === a.id;
          return (
            <div key={a.id} style={{ ...row, borderLeftColor: COLORS[a.severity], opacity: a.status === "false_positive" ? 0.55 : 1 }}>
              <div style={rowTop} onClick={() => setOpenId(isOpen ? null : a.id)}>
                <span style={{ ...pill, background: COLORS[a.severity] }}>{a.severity.toUpperCase()}</span>
                <span style={{ fontWeight: 600 }}>{a.title}</span>
                <span style={{ color: "#60a5fa", fontSize: 11, fontFamily: "ui-monospace, monospace" }}>{a.ruleId}</span>
                <span style={{ ...statusPill, color: STATUS_COLOR[a.status], borderColor: STATUS_COLOR[a.status] }}>{STATUS_LABEL[a.status]}</span>
                <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 11 }}>{a.host} · t={a.tick}</span>
              </div>
              <div style={{ color: "#c9d3dd", fontSize: 12 }}>{a.detail}</div>

              {isOpen && (
                <div style={drill}>
                  <div style={{ fontSize: 10.5, color: "#93c5fd", fontWeight: 700, marginBottom: 4 }}>EVIDENCIA (evento crudo del runtime)</div>
                  <div style={kv}><span style={k}>evento</span><span>{a.evidence.kind}</span></div>
                  <div style={kv}><span style={k}>host</span><span>{a.evidence.host}</span></div>
                  {a.evidence.service && <div style={kv}><span style={k}>servicio</span><span>{a.evidence.service}</span></div>}
                  {a.evidence.port != null && <div style={kv}><span style={k}>puerto</span><span>{a.evidence.port}</span></div>}
                  <div style={kv}><span style={k}>detalle</span><span>{a.evidence.detail}</span></div>
                  <div style={kv}><span style={k}>tick</span><span>{a.evidence.tick}</span></div>
                  {a.mitre && <div style={kv}><span style={k}>MITRE</span><span style={{ color: "#60a5fa" }}>{a.mitre}</span></div>}
                </div>
              )}

              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <button style={triBtn} onClick={() => setOpenId(isOpen ? null : a.id)}>
                  {isOpen ? "Ocultar evidencia" : "Ver evidencia"}
                </button>
                <button style={triBtn} onClick={() => triage(a.id, (i) => kernel.soc.acknowledge(i))}>Reconocer</button>
                <button style={triBtn} onClick={() => triage(a.id, (i) => kernel.soc.escalate(i))}>Escalar</button>
                <button style={triBtn} onClick={() => triage(a.id, (i) => kernel.soc.falsePositive(i))}>Falso positivo</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif", minHeight: 0 };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #1b2733" };
const search: CSSProperties = { flex: 1, minWidth: 0, background: "#0e141b", border: "1px solid #1b2733", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontFamily: "ui-monospace, monospace" };
const btn: CSSProperties = { background: "#111820", color: "#8b98a5", border: "1px solid #1b2733", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" };
const queryErr: CSSProperties = { background: "#241014", color: "#fca5a5", fontSize: 11, padding: "4px 12px", fontFamily: "ui-monospace, monospace" };
const counters: CSSProperties = { display: "flex", gap: 6, padding: "10px 12px", flexWrap: "wrap", alignItems: "stretch" };
const counter: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 58, padding: "5px 8px", border: "1px solid", borderRadius: 8, background: "#0e141b", cursor: "pointer" };
const panel: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderRadius: 8, padding: "8px 12px", margin: "0 12px 8px" };
const panelTitle: CSSProperties = { fontSize: 11, color: "#93c5fd", fontWeight: 700, marginBottom: 6, letterSpacing: 0.3 };
const ruleRow: CSSProperties = { display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 0", borderTop: "1px solid #131c26", fontSize: 12.5 };
const listHead: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "2px 12px 6px", fontSize: 10.5, color: "#64748b", letterSpacing: 0.4 };
const list: CSSProperties = { flex: 1, overflowY: "auto", padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 };
const empty: CSSProperties = { color: "#8b98a5", fontSize: 13, lineHeight: 1.7, marginTop: 16, textAlign: "center" };
const code: CSSProperties = { background: "#111820", padding: "2px 6px", borderRadius: 4, fontFamily: "ui-monospace, monospace" };
const row: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderLeft: "3px solid", borderRadius: 6, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 };
const rowTop: CSSProperties = { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexWrap: "wrap" };
const pill: CSSProperties = { color: "#05080c", fontWeight: 700, fontSize: 10, padding: "1px 6px", borderRadius: 999 };
const statusPill: CSSProperties = { fontSize: 10, padding: "0 6px", borderRadius: 999, border: "1px solid" };
const drill: CSSProperties = { background: "#080f16", border: "1px solid #1b2733", borderRadius: 6, padding: "8px 10px", marginTop: 6 };
const kv: CSSProperties = { display: "flex", gap: 8, fontSize: 11.5, padding: "1px 0", fontFamily: "ui-monospace, monospace" };
const k: CSSProperties = { color: "#7c8aa0", minWidth: 72 };
const triBtn: CSSProperties = { background: "#111820", color: "#8b98a5", border: "1px solid #1b2733", borderRadius: 5, padding: "3px 9px", fontSize: 11, cursor: "pointer" };

export default SOCView;
