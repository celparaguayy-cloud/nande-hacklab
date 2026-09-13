import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";

interface Props {
  kernel: VirtualKernel;
}

/**
 * NandeReverse — app de ingeniería inversa, accionable. El hexdump son los
 * bytes reales; el botón de fuerza bruta EJECUTA el XOR real sobre las 256
 * claves y revela la bandera (que se captura de verdad). No es una vitrina:
 * hacés reversing con un toque y ves el resultado verdadero.
 */
export function ReverseView({ kernel }: Props) {
  const cm = kernel.crackme;
  const [tab, setTab] = useState<"hex" | "dis">("hex");
  const [result, setResult] = useState<string>("");
  const [solved, setSolved] = useState<boolean>(() => kernel.player.capturedFlags().includes(cm.flag));
  const [key, setKey] = useState<string>("");

  const brute = () => {
    const hits = cm.bruteforce();
    if (hits.length === 0) { setResult("Ninguna clave dio texto con pinta de bandera."); return; }
    const lines = hits.map((h) => `KEY=0x${h.key.toString(16).padStart(2, "0")} (${h.key}) → ${h.text}`);
    const notes = kernel.scanForSignals(hits.map((h) => h.text).join("\n"));
    if (notes.length) setSolved(true);
    setResult(lines.join("\n"));
  };

  const tryKey = () => {
    const k = key.startsWith("0x") ? parseInt(key, 16) : parseInt(key, 10);
    if (Number.isNaN(k)) { setResult("Clave inválida. Poné un número 0..255 o 0x.."); return; }
    const r = cm.decrypt(k);
    if (r.looksLikeFlag) {
      const notes = kernel.scanForSignals(r.text);
      if (notes.length) setSolved(true);
      setResult(`✔ KEY=${k}: ${r.text}`);
    } else {
      setResult(`KEY=${k}: ${r.printable ? r.text : "(bytes no imprimibles)"}`);
    }
  };

  return (
    <div style={container}>
      <div style={header}>
        <span style={{ fontSize: 20 }}>🔍</span>
        <div style={{ fontWeight: 700 }}>NandeReverse — {cm.name}</div>
        {solved && <span style={{ marginLeft: "auto", color: "#86efac", fontSize: 12 }}>✅ resuelto</span>}
      </div>

      <div style={intro}>
        Hay una bandera cifrada con <b>XOR de un byte</b> dentro del binario.
        Mirá el hexdump, y probá las 256 claves (fuerza bruta) hasta que aparezca <code>ND&#123;…&#125;</code>.
      </div>

      <div style={tabs}>
        <button style={tab === "hex" ? tabActive : tabBtn} onClick={() => setTab("hex")}>hexdump</button>
        <button style={tab === "dis" ? tabActive : tabBtn} onClick={() => setTab("dis")}>disasm</button>
      </div>
      <pre style={code_}>{tab === "hex" ? cm.hexdump() : cm.disasm()}</pre>

      <div style={{ display: "flex", gap: 6, padding: "0 12px", flexWrap: "wrap", alignItems: "center" }}>
        <button style={primaryBtn} onClick={brute}>⚙ Fuerza bruta (256 claves)</button>
        <input style={keyInput} value={key} onChange={(e) => setKey(e.target.value)} placeholder="probar clave (0x2a)" />
        <button style={btn} onClick={tryKey}>Probar</button>
      </div>

      {result && <pre style={resultBox}>{result}</pre>}
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif", overflowY: "auto" };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #1b2733" };
const intro: CSSProperties = { padding: "10px 12px", fontSize: 12.5, color: "#c9d3dd", lineHeight: 1.6 };
const tabs: CSSProperties = { display: "flex", gap: 6, padding: "0 12px" };
const tabBtn: CSSProperties = { background: "#111820", color: "#8b98a5", border: "1px solid #1b2733", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" };
const tabActive: CSSProperties = { ...tabBtn, background: "#1b2733", color: "#e6edf3" };
const code_: CSSProperties = { margin: "8px 12px", background: "#08110a", border: "1px solid #14532d", borderRadius: 8, padding: "8px 10px", fontSize: 11.5, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace", color: "#b7f7c2" };
const primaryBtn: CSSProperties = { background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, padding: "7px 12px", fontSize: 12.5, cursor: "pointer", fontWeight: 600 };
const keyInput: CSSProperties = { background: "#0b1016", color: "#e6edf3", border: "1px solid #1b2733", borderRadius: 6, padding: "6px 10px", fontSize: 12, width: 120 };
const btn: CSSProperties = { background: "#111820", color: "#8b98a5", border: "1px solid #1b2733", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" };
const resultBox: CSSProperties = { margin: "10px 12px", background: "#0e141b", border: "1px solid #1b2733", borderRadius: 8, padding: "8px 10px", fontSize: 11.5, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, monospace", color: "#e6edf3" };

export default ReverseView;
