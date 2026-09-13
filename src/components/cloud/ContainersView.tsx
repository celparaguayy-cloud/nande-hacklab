import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";

interface Props {
  kernel: VirtualKernel;
}

/**
 * NandeContainers — panel de contenedores/K8s accionable. No es una lista
 * muerta: cada botón EJECUTA la operación real del runtime (leer el env,
 * intentar el escape) y muestra el resultado verdadero. Los secretos y la
 * bandera se capturan por la falla real, igual que en la terminal.
 */
export function ContainersView({ kernel }: Props) {
  const cr = kernel.containers;
  const [sel, setSel] = useState<string>(cr.list()[0]?.name ?? "");
  const [out, setOut] = useState<string>("");
  const [flash, setFlash] = useState<string>("");

  const containers = cr.list();
  const c = cr.get(sel);

  const say = (t: string) => setOut(t);

  const doEnv = () => {
    const env = cr.env(sel);
    if (!env) return;
    const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n");
    const leaks = cr.leakedSecrets(sel);
    // Capturar de verdad lo que salga (bandera en el env).
    const notes = kernel.scanForSignals(lines);
    if (notes.length) setFlash(notes.join(" "));
    say(
      `$ kubectl exec ${sel} -- env\n\n${lines}` +
        (leaks.length ? `\n\n🔓 Secretos filtrados: ${leaks.map((l) => l.key).join(", ")}` : ""),
    );
  };

  const doEscape = () => {
    const r = cr.escape(sel);
    if (!r.ok) { say(`✘ ${r.message}`); return; }
    const notes = kernel.scanForSignals(r.content ?? "");
    if (notes.length) setFlash(notes.join(" "));
    say(`$ escape ${sel}\n\n✔ ${r.message}\n${r.content}`);
  };

  return (
    <div style={container}>
      <div style={header}>
        <span style={{ fontSize: 20 }}>☸️</span>
        <div style={{ fontWeight: 700 }}>NandeContainers — clúster virtual</div>
      </div>

      <div style={body}>
        <div style={listCol}>
          {containers.map((k) => (
            <div
              key={k.name}
              onClick={() => { setSel(k.name); setOut(""); }}
              style={{ ...row, borderLeftColor: k.privileged ? "#ef4444" : "#334155", background: sel === k.name ? "#132030" : "#0e141b" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>{k.status === "Running" ? "🟢" : "🔴"}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{k.name}</span>
                {k.privileged && <span style={privTag}>privileged ⚠</span>}
              </div>
              <div style={{ fontSize: 11, color: "#8b98a5" }}>{k.image} · ns={k.namespace}</div>
            </div>
          ))}
        </div>

        <div style={detailCol}>
          {c ? (
            <>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{c.name}</div>
              <div style={kv}><span style={k}>Imagen</span><span>{c.image}</span></div>
              <div style={kv}><span style={k}>Namespace</span><span>{c.namespace}</span></div>
              <div style={kv}><span style={k}>Privilegiado</span><span>{c.privileged ? "SÍ ⚠" : "no"}</span></div>
              <div style={kv}><span style={k}>Montajes</span><span>{c.mounts.map((m) => `${m.hostPath}→${m.containerPath}`).join(", ") || "ninguno"}</span></div>

              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <button style={actBtn} onClick={doEnv}>exec env (buscar secretos)</button>
                <button
                  style={{ ...actBtn, opacity: cr.canEscape(c.name) ? 1 : 0.5 }}
                  onClick={doEscape}
                >
                  intentar escape
                </button>
              </div>

              {flash && <div style={flashBox}>{flash}</div>}
              {out && <pre style={console_}>{out}</pre>}
            </>
          ) : (
            <div style={{ color: "#8b98a5" }}>Elegí un contenedor.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif" };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #1b2733" };
const body: CSSProperties = { flex: 1, display: "flex", minHeight: 0 };
const listCol: CSSProperties = { flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 };
const detailCol: CSSProperties = { flex: 1.3, overflowY: "auto", padding: 12, borderLeft: "1px solid #1b2733", minWidth: 0 };
const row: CSSProperties = { borderLeft: "3px solid", borderRadius: 6, padding: "7px 9px", cursor: "pointer" };
const privTag: CSSProperties = { fontSize: 10, color: "#fca5a5", border: "1px solid #7f1d1d", borderRadius: 4, padding: "0 4px" };
const kv: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, padding: "2px 0", fontFamily: "ui-monospace, monospace" };
const k: CSSProperties = { color: "#8b98a5" };
const actBtn: CSSProperties = { background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" };
const flashBox: CSSProperties = { marginTop: 10, background: "#052e1a", border: "1px solid #15803d", color: "#86efac", borderRadius: 8, padding: "8px 10px", fontSize: 12.5 };
const console_: CSSProperties = { marginTop: 10, background: "#08110a", border: "1px solid #14532d", borderRadius: 8, padding: "8px 10px", fontSize: 11.5, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, monospace", color: "#b7f7c2" };

export default ContainersView;
