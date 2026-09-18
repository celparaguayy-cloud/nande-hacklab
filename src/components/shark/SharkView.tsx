import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { L7, Packet } from "../../core/net/PacketCapture";

interface SharkViewProps {
  kernel: VirtualKernel;
}

const PROTO_COLOR: Record<L7, string> = {
  HTTP: "#38bdf8",
  AUTH: "#f97316",
  TCP: "#a78bfa",
  SSH: "#34d399",
  ICMP: "#eab308",
};

/**
 * NandeShark — un analizador de tráfico de VERDAD, al estilo Wireshark. Captura
 * el tráfico REAL de la red virtual y te deja diseccionarlo como la herramienta
 * real: filtro de visualización con su lenguaje (http.request.method == "POST"),
 * columnas No./Tiempo/Origen/Destino/Protocolo/Long/Info, árbol de protocolos,
 * volcado hexadecimal del cable, seguir stream y jerarquía de protocolos.
 */
export function SharkView({ kernel }: SharkViewProps) {
  const [packets, setPackets] = useState<Packet[]>(() => kernel.shark.recent(400));
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Packet | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stream, setStream] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setPackets(kernel.shark.recent(400));
    const unsub = [
      kernel.events.subscribe("network.request", refresh),
      kernel.events.subscribe("runtime.host", refresh),
      kernel.events.subscribe("world.tick", refresh),
    ];
    return () => unsub.forEach((u) => u());
  }, [kernel]);

  const valid = kernel.shark.validateFilter(filter);
  const shown = useMemo(() => {
    if (!filter.trim()) return packets;
    return valid.ok ? kernel.shark.filter(filter) : [];
  }, [packets, filter, valid.ok, kernel]);

  const creds = kernel.shark.credentials();
  const hierarchy = kernel.shark.protocolHierarchy();

  const genTraffic = (kind: "browse" | "login") => {
    try {
      if (kind === "browse") kernel.browser.request("GET", "banco.nande", "/");
      else kernel.browser.request("POST", "banco.nande", "/login", { usuario: "cliente", password: "Verano2024" });
    } catch { /* servicio caído: nada */ }
    setPackets(kernel.shark.recent(400));
  };

  const dstLabel = (p: Packet) => p.host ?? p.dst;

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>NandeShark</div>
        <input
          style={{ ...search, borderColor: filter && !valid.ok ? "#ef4444" : "#1b2733", color: filter && !valid.ok ? "#fca5a5" : "#e6edf3" }}
          placeholder='filtro:  http.request.method == "POST"   ·   ip.addr == 10.10.0.5 and http   ·   frame contains "pass"'
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          spellCheck={false}
        />
        <button style={btn} onClick={() => setShowStats((s) => !s)} title="Jerarquía de protocolos">
          Estadísticas
        </button>
        <button style={btn} onClick={() => { kernel.shark.clear(); setPackets([]); setSelected(null); }}>Limpiar</button>
      </div>

      {filter && !valid.ok && (
        <div style={filterErr}>Filtro inválido: {valid.error}</div>
      )}

      <div style={toolbar}>
        <span style={{ fontSize: 11, color: "#8b98a5", alignSelf: "center" }}>Generar tráfico real:</span>
        <button style={genBtn} onClick={() => genTraffic("browse")}>GET banco.nande</button>
        <button style={genBtn} onClick={() => genTraffic("login")}>POST /login (mirá la fuga)</button>
        {selected && (
          <button style={{ ...genBtn, color: "#fcd34d", borderColor: "#7c5e12" }} onClick={() => setStream(kernel.shark.followStream(selected).text)}>
            Seguir stream
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#64748b", alignSelf: "center" }}>
          {shown.length} / {packets.length} paquetes
        </span>
      </div>

      {creds.length > 0 && (
        <div style={leakBanner}>
          🔓 <b>{creds.length}</b> credencial(es) en claro capturada(s) — viajaron sin cifrar (HTTP).
        </div>
      )}

      {showStats && (
        <div style={statsBox}>
          <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 700, marginBottom: 6 }}>JERARQUÍA DE PROTOCOLOS</div>
          {hierarchy.length === 0 && <div style={{ color: "#64748b", fontSize: 12 }}>Sin tráfico todavía.</div>}
          {hierarchy.map((h) => (
            <div key={h.proto} style={statRow}>
              <span style={{ color: PROTO_COLOR[h.proto], fontWeight: 700, minWidth: 52 }}>{h.proto}</span>
              <span style={{ flex: 1, height: 8, background: "#0e141b", borderRadius: 4, overflow: "hidden" }}>
                <span style={{ display: "block", width: `${h.pct}%`, height: "100%", background: PROTO_COLOR[h.proto] }} />
              </span>
              <span style={{ minWidth: 96, textAlign: "right", color: "#8b98a5", fontSize: 11 }}>
                {h.count} pkt · {h.bytes} B · {h.pct}%
              </span>
            </div>
          ))}
        </div>
      )}

      {stream !== null && (
        <div style={streamBox}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#fcd34d", fontWeight: 700 }}>SEGUIR STREAM — conversación reensamblada</span>
            <button style={{ ...btn, marginLeft: "auto", padding: "2px 8px" }} onClick={() => setStream(null)}>Cerrar</button>
          </div>
          <pre style={streamPre}>{stream || "Sin datos en este stream."}</pre>
        </div>
      )}

      <div style={colsHead}>
        <span style={{ width: 48 }}>No.</span>
        <span style={{ width: 54 }}>Tiempo</span>
        <span style={{ width: 108 }}>Origen</span>
        <span style={{ width: 146 }}>Destino</span>
        <span style={{ width: 58 }}>Proto</span>
        <span style={{ width: 56, textAlign: "right" }}>Long</span>
        <span style={{ flex: 1, paddingLeft: 8 }}>Info</span>
      </div>

      <div style={body}>
        <div style={listCol}>
          {shown.length === 0 && (
            <div style={empty}>
              {filter && !valid.ok
                ? "Corregí el filtro para ver paquetes."
                : "Sin paquetes que coincidan. NandeShark sólo captura tráfico REAL: navegá un sitio o generá tráfico arriba."}
            </div>
          )}
          {shown.map((p) => (
            <div
              key={p.seq}
              onClick={() => setSelected(p)}
              style={{ ...rowCols, background: selected?.seq === p.seq ? "#15304a" : p.leak ? "#241014" : "transparent" }}
            >
              <span style={{ width: 48, color: "#64748b" }}>{p.seq}</span>
              <span style={{ width: 54, color: "#64748b" }}>{p.tick}</span>
              <span style={{ width: 108, color: "#8b98a5", overflow: "hidden", textOverflow: "ellipsis" }}>{p.src}</span>
              <span style={{ width: 146, color: "#8b98a5", overflow: "hidden", textOverflow: "ellipsis" }}>{dstLabel(p)}</span>
              <span style={{ width: 58, color: PROTO_COLOR[p.proto], fontWeight: 700 }}>{p.proto}</span>
              <span style={{ width: 56, textAlign: "right", color: "#64748b" }}>{p.length}</span>
              <span style={{ flex: 1, paddingLeft: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.leak && "🔓 "}{p.summary}
              </span>
            </div>
          ))}
        </div>

        <div style={detailRow}>
          <div style={detailCol}>
          {selected ? (
            <>
              <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 700, marginBottom: 6 }}>ÁRBOL DE PROTOCOLOS</div>
              <Tree label={`Frame ${selected.seq}: ${selected.length} bytes en el cable`}>
                <Kv k="Tiempo (tick)" v={String(selected.tick)} />
                <Kv k="Longitud" v={`${selected.length} bytes`} />
              </Tree>
              <Tree label={`Internet Protocol — ${selected.src} → ${selected.dst}`}>
                <Kv k="Origen" v={selected.src} />
                <Kv k="Destino" v={selected.dst} />
              </Tree>
              <Tree label={`${selected.proto}`} color={PROTO_COLOR[selected.proto]}>
                {selected.method && <Kv k="http.request.method" v={selected.method} />}
                {selected.path && <Kv k="http.request.uri" v={selected.path} />}
                {selected.host && <Kv k="http.host" v={selected.host} />}
                {selected.status != null && <Kv k="http.response.code" v={String(selected.status)} />}
                {!selected.method && <Kv k="info" v={selected.summary} />}
                {selected.leak && (
                  <div style={leakDetail}>
                    🔓 Fuga: <b>{selected.leak.field}</b> = <b>{selected.leak.value}</b> — en claro (sin TLS).
                  </div>
                )}
              </Tree>

            </>
          ) : (
            <div style={{ color: "#8b98a5", fontSize: 12, marginTop: 12 }}>
              Elegí un paquete de la lista para diseccionarlo (árbol de protocolos + volcado hexadecimal).
            </div>
          )}
          </div>
          {selected && (
            <div style={hexCol}>
              <div style={{ fontSize: 11, color: "#93c5fd", fontWeight: 700, marginBottom: 6 }}>BYTES EN EL CABLE (HEX)</div>
              <pre style={hexPre}>{kernel.shark.hexdump(selected)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tree({ label, color, children }: { label: string; color?: string; children?: ReactNode }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 12, color: color ?? "#c9d3dd", fontWeight: 600 }}>▾ {label}</div>
      <div style={{ paddingLeft: 14, borderLeft: "1px solid #1b2733", marginLeft: 4 }}>{children}</div>
    </div>
  );
}
function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 8, fontSize: 11.5, padding: "1px 0", fontFamily: "ui-monospace, monospace" }}>
      <span style={{ color: "#7c8aa0", minWidth: 152 }}>{k}</span>
      <span style={{ color: "#e6edf3", wordBreak: "break-all" }}>{v}</span>
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif", minHeight: 0 };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #1b2733" };
const search: CSSProperties = { flex: 1, minWidth: 0, background: "#0e141b", border: "1px solid #1b2733", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontFamily: "ui-monospace, monospace" };
const btn: CSSProperties = { background: "#111820", color: "#8b98a5", border: "1px solid #1b2733", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" };
const filterErr: CSSProperties = { background: "#241014", color: "#fca5a5", fontSize: 11, padding: "4px 12px", fontFamily: "ui-monospace, monospace" };
const toolbar: CSSProperties = { display: "flex", gap: 6, padding: "8px 12px 0", flexWrap: "wrap" };
const genBtn: CSSProperties = { background: "#0e2233", color: "#67e8f9", border: "1px solid #164a5f", borderRadius: 999, padding: "4px 10px", fontSize: 12, cursor: "pointer" };
const leakBanner: CSSProperties = { background: "#2a1010", border: "1px solid #7f1d1d", color: "#fca5a5", fontSize: 12, padding: "6px 12px", margin: "8px 12px 0", borderRadius: 8 };
const statsBox: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderRadius: 8, padding: "8px 12px", margin: "8px 12px 0" };
const statRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "3px 0" };
const streamBox: CSSProperties = { background: "#0e141b", border: "1px solid #7c5e12", borderRadius: 8, padding: "8px 12px", margin: "8px 12px 0", maxHeight: 180, overflow: "auto" };
const streamPre: CSSProperties = { margin: 0, fontSize: 11, fontFamily: "ui-monospace, monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", color: "#c9d3dd", lineHeight: 1.5 };
const colsHead: CSSProperties = { display: "flex", gap: 0, padding: "6px 12px", fontSize: 10.5, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #1b2733", marginTop: 8, fontFamily: "ui-monospace, monospace" };
const body: CSSProperties = { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 };
const listCol: CSSProperties = { flex: 1.1, overflowY: "auto", minWidth: 0, fontFamily: "ui-monospace, monospace", fontSize: 12, borderBottom: "1px solid #1b2733" };
const rowCols: CSSProperties = { display: "flex", gap: 0, padding: "3px 12px", cursor: "pointer", alignItems: "center", borderBottom: "1px solid #0e141b" };
const detailRow: CSSProperties = { flex: 1, display: "flex", minHeight: 0 };
const detailCol: CSSProperties = { flex: 1, overflowY: "auto", padding: "10px 12px", minWidth: 0 };
const hexCol: CSSProperties = { flex: 1, overflowY: "auto", padding: "10px 12px", borderLeft: "1px solid #1b2733", minWidth: 0 };
const empty: CSSProperties = { color: "#8b98a5", fontSize: 13, lineHeight: 1.7, margin: "16px 12px", textAlign: "center" };
const hexPre: CSSProperties = { background: "#080f16", border: "1px solid #1b2733", borderRadius: 6, padding: "8px 10px", fontSize: 11, whiteSpace: "pre", overflowX: "auto", fontFamily: "ui-monospace, monospace", color: "#9fe6b0", lineHeight: 1.5 };
const leakDetail: CSSProperties = { background: "#2a1010", border: "1px solid #7f1d1d", color: "#fca5a5", fontSize: 12, padding: "6px 8px", borderRadius: 6, marginTop: 6 };

export default SharkView;
