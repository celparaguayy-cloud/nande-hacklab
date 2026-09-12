import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";

interface BloodViewProps {
  kernel: VirtualKernel;
}

/**
 * NandeBlood — el mapa de ataque del dominio. No es un póster: el grafo es
 * estado real. Cada acción (kerberoast, crack, abusar una ACL) cambia quién
 * poseés, y la ruta a Domain Admins se recalcula al instante. Cuando la ruta
 * desaparece, es porque llegaste.
 */
export function BloodView({ kernel }: BloodViewProps) {
  const dir = kernel.directory;
  const [, setNonce] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const refresh = () => setNonce((n) => n + 1);
  const say = (m: string) => setLog((l) => [m, ...l].slice(0, 6));

  const path = dir.pathToDomainAdmins();
  const done = dir.domainOwned();

  const doKerberoast = (name: string) => {
    const r = dir.kerberoast(name);
    say(r.ok ? `🎫 ${r.message} Probá crack con la clave de temporada.` : `✘ ${r.message}`);
    refresh();
  };
  const doCrack = (name: string) => {
    const guess = window.prompt(`Clave para crackear el TGS de ${name}:`, "");
    if (guess == null) return;
    const r = dir.crack(name, guess);
    say(`${r.ok ? "✔" : "✘"} ${r.message}`);
    if (dir.domainOwned()) kernel.scanForSignals("ND{dominio_comprometido}");
    refresh();
  };
  const doAbuse = (from: string, to: string) => {
    const r = dir.abuse(from, to);
    say(`${r.ok ? "✔" : "✘"} ${r.message}`);
    if (dir.domainOwned()) kernel.scanForSignals("ND{dominio_comprometido}");
    refresh();
  };

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>🩸 NandeBlood — {dir.domain}</div>
        <span style={{ marginLeft: "auto", fontSize: 12, color: done ? "#86efac" : "#8b98a5" }}>
          {done ? "🏆 Dominio comprometido" : `${dir.owned().length} nodo(s) poseído(s)`}
        </span>
      </div>

      <div style={body}>
        <div style={col}>
          <div style={sectionTitle}>Principales del dominio</div>
          {dir.all().map((p) => (
            <div key={p.name} style={{ ...node, borderLeftColor: p.owned ? "#ef4444" : "#334155" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>{p.owned ? "🔴" : "⚪"}</span>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>{p.kind}</span>
              </div>
              {p.note && <div style={{ fontSize: 11, color: "#8b98a5", marginTop: 2 }}>{p.note}</div>}
              {p.spn && !p.owned && (
                <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                  <button style={smallBtn} onClick={() => doKerberoast(p.name)}>Kerberoast</button>
                  <button style={smallBtn} onClick={() => doCrack(p.name)}>Crack TGS</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={col}>
          <div style={sectionTitle}>Ruta de ataque a Domain Admins</div>
          {done ? (
            <div style={win}>🏆 Control total del dominio. Bandera ND&#123;dominio_comprometido&#125; capturada.</div>
          ) : path ? (
            path.map((s, i) => {
              const canAbuse = s.type !== "MemberOf" && dir.get(s.from)?.owned;
              return (
                <div key={i} style={step}>
                  <div style={{ fontSize: 12 }}>
                    <b>{i + 1}.</b> {s.from} <span style={{ color: "#f97316" }}>—{s.type}→</span> {s.to}
                  </div>
                  <div style={{ fontSize: 11, color: "#8b98a5", margin: "2px 0 4px" }}>↳ {s.how}</div>
                  {canAbuse && (
                    <button style={smallBtn} onClick={() => doAbuse(s.from, s.to)}>
                      Abusar {s.type}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ color: "#8b98a5", fontSize: 12 }}>Sin ruta todavía: conseguí un foothold.</div>
          )}

          {log.length > 0 && (
            <>
              <div style={{ ...sectionTitle, marginTop: 12 }}>Registro</div>
              {log.map((l, i) => (
                <div key={i} style={{ fontSize: 11, color: "#c9d3dd", padding: "2px 0" }}>{l}</div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif" };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #1b2733" };
const body: CSSProperties = { flex: 1, display: "flex", minHeight: 0 };
const col: CSSProperties = { flex: 1, overflowY: "auto", padding: "10px 12px", minWidth: 0 };
const sectionTitle: CSSProperties = { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", marginBottom: 8 };
const node: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderLeft: "3px solid", borderRadius: 6, padding: "7px 9px", marginBottom: 6 };
const step: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderRadius: 6, padding: "7px 9px", marginBottom: 6 };
const smallBtn: CSSProperties = { background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 5, padding: "3px 8px", fontSize: 11, cursor: "pointer" };
const win: CSSProperties = { background: "#052e1a", border: "1px solid #15803d", color: "#86efac", borderRadius: 8, padding: "12px", fontSize: 13, textAlign: "center" };

export default BloodView;
