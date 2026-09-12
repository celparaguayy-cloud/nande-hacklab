import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
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
 * NandeShark — el analizador de tráfico del mundo. No dibuja paquetes de
 * adorno: muestra, en vivo, lo que de verdad viajó por la red virtual. Si no
 * navegás nada, está vacío; hacés una petición o un login y aparece el paquete.
 * Las credenciales enviadas en claro se resaltan como fuga (🔓).
 */
export function SharkView({ kernel }: SharkViewProps) {
  const [packets, setPackets] = useState<Packet[]>(() => kernel.shark.recent(200));
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Packet | null>(null);

  useEffect(() => {
    const refresh = () => setPackets(kernel.shark.recent(200));
    const un1 = kernel.events.subscribe("network.request", refresh);
    const un2 = kernel.events.subscribe("runtime.host", refresh);
    const un3 = kernel.events.subscribe("world.tick", refresh);
    return () => {
      un1();
      un2();
      un3();
    };
  }, [kernel]);

  const shown = useMemo(() => {
    if (!filter.trim()) return packets;
    return kernel.shark.filter(filter);
  }, [packets, filter, kernel]);

  const creds = kernel.shark.credentials();

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>🦈 NandeShark</div>
        <input
          style={search}
          placeholder="filtro: http · auth · host==banco.nande · texto"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button style={btn} onClick={() => { kernel.shark.clear(); setPackets([]); setSelected(null); }}>
          Limpiar
        </button>
      </div>

      {creds.length > 0 && (
        <div style={leakBanner}>
          🔓 <b>{creds.length}</b> credencial(es) vista(s) en claro — viajaron sin cifrar (HTTP).
        </div>
      )}

      <div style={body}>
        <div style={listCol}>
          {shown.length === 0 && (
            <div style={empty}>
              Sin paquetes. NandeShark sólo captura tráfico REAL.
              <br />
              Abrí el Navegador y entrá a un sitio, o en la Terminal probá:
              <br />
              <code style={code}>curl banco.nande</code>
              <br />
              y mirá cómo aparece el paquete acá.
            </div>
          )}
          {shown.map((p) => (
            <div
              key={p.seq}
              onClick={() => setSelected(p)}
              style={{
                ...row,
                borderLeftColor: PROTO_COLOR[p.proto],
                background: selected?.seq === p.seq ? "#132030" : "#0e141b",
              }}
            >
              <span style={{ ...proto, color: PROTO_COLOR[p.proto] }}>{p.proto}</span>
              <span style={{ color: "#8b98a5", fontSize: 11, minWidth: 46 }}>t={p.tick}</span>
              <span style={{ flex: 1, fontSize: 12 }}>{p.summary}</span>
              {p.leak && <span title="credencial en claro">🔓</span>}
            </div>
          ))}
        </div>

        <div style={detailCol}>
          {selected ? (
            <>
              <div style={{ fontWeight: 700, marginBottom: 8, color: PROTO_COLOR[selected.proto] }}>
                Paquete #{selected.seq} · {selected.proto}
              </div>
              <div style={kv}><span style={k}>Origen</span><span>{selected.src}</span></div>
              <div style={kv}><span style={k}>Destino</span><span>{selected.dst}</span></div>
              <div style={kv}><span style={k}>Tick</span><span>{selected.tick}</span></div>
              <div style={{ marginTop: 10, color: "#8b98a5", fontSize: 11 }}>Contenido en el cable:</div>
              <pre style={raw}>{selected.detail}</pre>
              {selected.leak && (
                <div style={leakDetail}>
                  🔓 Fuga: <b>{selected.leak.field}</b> = <b>{selected.leak.value}</b>
                  <div style={{ color: "#8b98a5", fontSize: 11, marginTop: 4 }}>
                    Viajó sin cifrar. Con HTTPS este contenido no sería legible.
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: "#8b98a5", fontSize: 12, marginTop: 12 }}>
              Elegí un paquete para ver su contenido en el cable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif" };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #1b2733" };
const search: CSSProperties = { flex: 1, background: "#0e141b", border: "1px solid #1b2733", borderRadius: 6, color: "#e6edf3", padding: "6px 10px", fontSize: 12, fontFamily: "ui-monospace, monospace" };
const btn: CSSProperties = { background: "#111820", color: "#8b98a5", border: "1px solid #1b2733", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" };
const leakBanner: CSSProperties = { background: "#2a1010", border: "1px solid #7f1d1d", color: "#fca5a5", fontSize: 12, padding: "6px 12px", margin: "8px 12px 0", borderRadius: 8 };
const body: CSSProperties = { flex: 1, display: "flex", minHeight: 0 };
const listCol: CSSProperties = { flex: 1.4, overflowY: "auto", padding: "8px 8px 8px 12px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 };
const detailCol: CSSProperties = { flex: 1, overflowY: "auto", padding: "12px", borderLeft: "1px solid #1b2733", minWidth: 0 };
const empty: CSSProperties = { color: "#8b98a5", fontSize: 13, lineHeight: 1.7, marginTop: 16, textAlign: "center" };
const code: CSSProperties = { background: "#111820", padding: "2px 6px", borderRadius: 4, fontFamily: "ui-monospace, monospace" };
const row: CSSProperties = { display: "flex", alignItems: "center", gap: 8, borderLeft: "3px solid", borderRadius: 4, padding: "5px 8px", cursor: "pointer" };
const proto: CSSProperties = { fontWeight: 700, fontSize: 11, minWidth: 40 };
const kv: CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", fontFamily: "ui-monospace, monospace" };
const k: CSSProperties = { color: "#8b98a5" };
const raw: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderRadius: 6, padding: "8px 10px", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "ui-monospace, monospace", color: "#c9d3dd" };
const leakDetail: CSSProperties = { background: "#2a1010", border: "1px solid #7f1d1d", color: "#fca5a5", fontSize: 13, padding: "8px 10px", borderRadius: 6, marginTop: 10 };

export default SharkView;
