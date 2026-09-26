import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { HostArtifacts, Ioc } from "../../core/soc/Investigator";

interface Props {
  kernel: VirtualKernel;
}

const SEV_COLOR: Record<string, string> = {
  info: "#64748b", low: "#38bdf8", medium: "#eab308", high: "#f97316", critical: "#ef4444",
};

const IOC_COLOR: Record<Ioc["kind"], string> = {
  ip: "#38bdf8",
  host: "#93c5fd",
  usuario: "#c4b5fd",
  puerto: "#fbbf24",
  credencial: "#f87171",
  amenaza: "#fb7185",
};

type Tab = "caso" | "ioc" | "triaje";

/**
 * DFIR — la mesa de trabajo del respondedor a incidentes.
 *
 * Nada acá está narrado: la línea de tiempo se reconstruye de los eventos que
 * el mundo recordó, los indicadores se extraen de esa evidencia y del tráfico
 * capturado, y la recolección de un host lee su estado VIVO (procesos,
 * servicios, firewall, cuentas) con una huella de integridad — si la evidencia
 * cambia, la huella cambia, que es de lo que se trata la cadena de custodia.
 *
 * El flujo es el de verdad: reconstruir → paciente cero → indicadores →
 * pivotear → recolectar el host tocado → informe.
 */
export function DfirView({ kernel }: Props) {
  const d = kernel.dfir;
  const [tab, setTab] = useState<Tab>("caso");
  const [ran, setRan] = useState(false);
  const [, setNonce] = useState(0);
  const refresh = () => setNonce((n) => n + 1);

  const [filterHost, setFilterHost] = useState("");
  const [filterText, setFilterText] = useState("");
  const [art, setArt] = useState<HostArtifacts | null>(null);
  const [report, setReport] = useState<string | null>(null);

  const inc = ran ? d.reconstruct() : null;
  const zero = ran ? d.patientZero() : null;
  const iocs = ran ? d.iocs() : [];
  const rows = ran ? d.timeline({ host: filterHost || undefined, text: filterText || undefined }) : [];

  const open = () => { setRan(true); refresh(); };

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>DFIR — respuesta a incidentes</div>
        {inc && (
          <span style={{ ...badge, color: SEV_COLOR[inc.severity], borderColor: SEV_COLOR[inc.severity] }}>
            {inc.severity}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button style={runBtn} onClick={open}>{ran ? "Actualizar caso" : "Abrir caso"}</button>
        {ran && <button style={btn} onClick={() => setReport(d.report())}>Informe</button>}
      </div>

      {!ran && (
        <div style={body}>
          <div style={hint}>
            Tocá <b>Abrir caso</b>: junto la evidencia real que el mundo recordó (logins,
            servicios caídos, técnicas detectadas, tráfico capturado) y armo la línea de
            tiempo del ataque. Después vas a poder sacar indicadores, pivotear sobre ellos
            y recolectar el host que tocaron. El adversario NPC ataca solo con el tiempo,
            así que casi siempre hay algo que investigar.
          </div>
        </div>
      )}

      {ran && !inc && (
        <div style={body}>
          <div style={hint}>
            Nada que investigar todavía: el mundo está tranquilo. Dejalo correr (o generá
            actividad desde la terminal) y volvé a abrir el caso.
          </div>
        </div>
      )}

      {inc && (
        <>
          <div style={tabs}>
            {([["caso", "Caso"], ["ioc", `Indicadores (${iocs.length})`], ["triaje", "Recolección"]] as [Tab, string][]).map(
              ([id, label]) => (
                <button key={id} style={id === tab ? tabActive : tabBtn} onClick={() => setTab(id)}>{label}</button>
              ),
            )}
          </div>

          <div style={body}>
            {tab === "caso" && (
              <>
                <div style={{ ...card, borderLeft: `3px solid ${SEV_COLOR[inc.severity]}` }}>
                  <div style={{ fontSize: 13 }}>{inc.verdict}</div>
                  <div style={{ fontSize: 12, color: "#8b98a5", marginTop: 6 }}>
                    Hosts: {inc.hostsAffected.join(", ")} · ventana t={inc.firstTick}→{inc.lastTick}
                  </div>
                  <div style={{ fontSize: 12, color: "#60a5fa", marginTop: 4, fontFamily: "ui-monospace, monospace" }}>
                    ATT&CK: {inc.techniques.join(", ") || "—"}
                  </div>
                  {zero && (
                    <div style={zeroBox}>
                      <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 11 }}>PACIENTE CERO</span>
                      <div style={{ fontSize: 12, marginTop: 3 }}>
                        t={zero.tick} · {zero.host} · {zero.kind} — {zero.detail}
                      </div>
                    </div>
                  )}
                </div>

                <div style={filters}>
                  <select style={select} value={filterHost} onChange={(e) => setFilterHost(e.target.value)}>
                    <option value="">todos los hosts</option>
                    {inc.hostsAffected.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <input
                    style={input}
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="buscar en la evidencia"
                  />
                  <span style={{ fontSize: 11, color: "#8b98a5" }}>{rows.length} de {inc.timeline.length}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {rows.map((e, i) => (
                    <div key={i} style={tlRow}>
                      <span style={tickCol}>t={e.tick}</span>
                      <span style={hostCol}>{e.host}</span>
                      <span style={{ flex: 1, fontSize: 12, color: "#c9d3dd", minWidth: 0 }}>
                        <span style={{ color: e.kind === "detection" ? "#f97316" : "#8b98a5" }}>{e.kind}</span>
                        {e.mitreId && <span style={{ color: "#60a5fa", fontFamily: "ui-monospace, monospace" }}> [{e.mitreId}]</span>}
                        {" — "}{e.detail}
                      </span>
                    </div>
                  ))}
                  {rows.length === 0 && <div style={hint}>Ningún evento coincide con el filtro.</div>}
                </div>
              </>
            )}

            {tab === "ioc" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={hint}>
                  Extraídos de la evidencia, no de una lista fija. Tocá uno para ver
                  dónde más aparece (eso es pivotear).
                </div>
                {iocs.map((i) => (
                  <button
                    key={`${i.kind}-${i.value}`}
                    style={iocRow}
                    onClick={() => { setFilterText(i.value.split("=").pop() ?? i.value); setFilterHost(""); setTab("caso"); }}
                  >
                    <span style={{ ...iocKind, color: IOC_COLOR[i.kind], borderColor: IOC_COLOR[i.kind] }}>{i.kind}</span>
                    <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, wordBreak: "break-all", flex: 1, minWidth: 0, textAlign: "left" }}>
                      {i.value}
                    </span>
                    <span style={{ fontSize: 11, color: "#8b98a5", whiteSpace: "nowrap" }}>×{i.hits} · t={i.firstTick}→{i.lastTick}</span>
                  </button>
                ))}
                {iocs.length === 0 && <div style={hint}>Sin indicadores todavía.</div>}
              </div>
            )}

            {tab === "triaje" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={filters}>
                  <select
                    style={select}
                    value={art?.host ?? ""}
                    onChange={(e) => setArt(e.target.value ? d.collect(e.target.value) : null)}
                  >
                    <option value="">elegí un host para recolectar…</option>
                    {d.collectable().map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {art && (
                    <button style={btn} onClick={() => setArt(d.collect(art.host))}>Recolectar de nuevo</button>
                  )}
                </div>

                {!art && (
                  <div style={hint}>
                    La recolección lee el host tal como está AHORA: procesos vivos, servicios,
                    puertos bloqueados, cuentas y archivos. Se le calcula una huella: si la
                    evidencia cambia después, la huella deja de coincidir.
                  </div>
                )}

                {art && (
                  <>
                    <div style={card}>
                      <div style={{ fontWeight: 700 }}>{art.host} <span style={{ color: "#8b98a5", fontWeight: 400 }}>({art.ip})</span></div>
                      <div style={{ fontSize: 12, color: "#8b98a5", marginTop: 3 }}>
                        {art.os} · {art.up ? "encendido" : "apagado"} · recolectado en t={art.collectedAtTick}
                      </div>
                      <div style={custody}>
                        <span style={{ color: d.verify(art) ? "#86efac" : "#f87171", fontSize: 11, fontWeight: 700 }}>
                          {d.verify(art) ? "CADENA DE CUSTODIA ÍNTEGRA" : "EVIDENCIA ALTERADA"}
                        </span>
                        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#8b98a5" }}>{art.digest}</span>
                      </div>
                    </div>

                    <div style={card}>
                      <div style={boxTitle}>Procesos ({art.processes.length})</div>
                      {art.processes.map((p) => (
                        <div key={p.pid} style={mono}>
                          {String(p.pid).padStart(5)}  {p.owner.padEnd(10)} {p.name}{p.service ? ` (servicio ${p.service})` : ""}
                        </div>
                      ))}
                    </div>

                    <div style={card}>
                      <div style={boxTitle}>Servicios ({art.services.length})</div>
                      {art.services.map((sv) => (
                        <div key={sv.name + sv.port} style={mono}>
                          {String(sv.port).padStart(5)}/tcp  <span style={{ color: sv.state === "running" ? "#86efac" : "#f87171" }}>{sv.state.padEnd(8)}</span> {sv.name} {sv.version}
                        </div>
                      ))}
                      <div style={{ ...mono, color: "#8b98a5", marginTop: 4 }}>
                        firewall bloquea: {art.blockedPorts.join(", ") || "nada"}
                      </div>
                    </div>

                    <div style={card}>
                      <div style={boxTitle}>Cuentas y archivos</div>
                      <div style={mono}>cuentas: {art.accounts.join(", ") || "—"}</div>
                      <div style={{ ...mono, wordBreak: "break-all" }}>archivos: {art.files.join(", ") || "—"}</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {report !== null && (
        <div style={reportBox}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={boxTitle}>Informe del caso</span>
            <div style={{ flex: 1 }} />
            <button style={btn} onClick={() => setReport(null)}>Cerrar</button>
          </div>
          <pre style={reportPre}>{report}</pre>
        </div>
      )}
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif", minHeight: 0 };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #1b2733", flexWrap: "wrap" };
const badge: CSSProperties = { fontSize: 10.5, border: "1px solid", borderRadius: 999, padding: "2px 9px", textTransform: "uppercase", fontWeight: 700 };
const tabs: CSSProperties = { display: "flex", gap: 6, padding: "8px 12px 0", flexWrap: "wrap" };
const tabBtn: CSSProperties = { background: "#111820", color: "#8b98a5", border: "1px solid #1b2733", borderRadius: 6, padding: "5px 11px", fontSize: 12, cursor: "pointer" };
const tabActive: CSSProperties = { ...tabBtn, background: "#1b2733", color: "#e6edf3" };
const body: CSSProperties = { flex: 1, overflowY: "auto", padding: 12, minHeight: 0 };
const hint: CSSProperties = { color: "#8b98a5", fontSize: 12.5, lineHeight: 1.7 };
const card: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderRadius: 8, padding: 12, marginBottom: 10 };
const zeroBox: CSSProperties = { marginTop: 8, background: "#130f04", border: "1px solid #78350f", borderRadius: 6, padding: "6px 9px" };
const filters: CSSProperties = { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 };
const select: CSSProperties = { background: "#0e141b", color: "#e6edf3", border: "1px solid #1b2733", borderRadius: 6, padding: "5px 8px", fontSize: 12 };
const input: CSSProperties = { flex: 1, minWidth: 120, background: "#080f16", color: "#e6edf3", border: "1px solid #1b2733", borderRadius: 6, padding: "5px 9px", fontSize: 12 };
const tlRow: CSSProperties = { display: "flex", gap: 8, alignItems: "baseline", padding: "3px 0", borderBottom: "1px solid #131c26" };
const tickCol: CSSProperties = { color: "#64748b", minWidth: 56, fontFamily: "ui-monospace, monospace", fontSize: 11 };
const hostCol: CSSProperties = { minWidth: 120, fontSize: 12, color: "#e6edf3" };
const iocRow: CSSProperties = { display: "flex", gap: 8, alignItems: "center", background: "#0e141b", border: "1px solid #1b2733", borderRadius: 6, padding: "6px 9px", cursor: "pointer", color: "#e6edf3", width: "100%" };
const iocKind: CSSProperties = { fontSize: 10, border: "1px solid", borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" };
const custody: CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: "1px solid #1b2733" };
const boxTitle: CSSProperties = { fontSize: 10.5, color: "#93c5fd", fontWeight: 700, letterSpacing: 0.3, marginBottom: 5 };
const mono: CSSProperties = { fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: "#c9d3dd", whiteSpace: "pre-wrap", padding: "1px 0" };
const runBtn: CSSProperties = { background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12.5, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" };
const btn: CSSProperties = { background: "#111820", color: "#c9d3dd", border: "1px solid #1b2733", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" };
const reportBox: CSSProperties = { borderTop: "1px solid #1b2733", background: "#0e141b", padding: "8px 12px", maxHeight: "45%", overflowY: "auto" };
const reportPre: CSSProperties = { margin: 0, fontFamily: "ui-monospace, monospace", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#c9d3dd" };

export default DfirView;
