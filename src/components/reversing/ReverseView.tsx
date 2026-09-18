import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";

interface Props {
  kernel: VirtualKernel;
}

type Tab = "dis" | "hex" | "str" | "xref";

const TAB_LABEL: Record<Tab, string> = {
  dis: "Desensamblado",
  hex: "Hexadecimal",
  str: "Cadenas",
  xref: "Referencias",
};

/**
 * NandeReverse — el banco de trabajo de ingeniería inversa.
 *
 * Todo lo que se ve sale del mismo binario: el desensamblado decodifica los
 * bytes, el hexadecimal los muestra, las cadenas se buscan en los datos, las
 * referencias cruzadas salen del desensamblado, y "Ejecutar" corre ESOS bytes
 * en la ÑVM-8. Al parchear un byte cambian los cuatro a la vez, porque es el
 * mismo programa — como en Ghidra o radare2.
 */
export function ReverseView({ kernel }: Props) {
  const cm = kernel.crackme;
  const [tab, setTab] = useState<Tab>("dis");
  const [, setNonce] = useState(0);
  const refresh = () => setNonce((n) => n + 1);

  const [serial, setSerial] = useState("");
  const [out, setOut] = useState<{ text: string; ok: boolean; note?: string } | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [patchByte, setPatchByte] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [solved, setSolved] = useState<boolean>(() => kernel.player.capturedFlags().includes(cm.flag));

  const say = (m: string) => setLog((l) => [m, ...l].slice(0, 5));

  const listing = cm.listing();
  const selected = sel === null ? null : listing.find((i) => i.addr === sel) ?? null;

  const execute = () => {
    const r = cm.run(serial);
    if (r.revealedFlag) {
      if (kernel.scanForSignals(r.output).length) setSolved(true);
      setOut({ text: r.output, ok: true, note: `${r.steps} instrucciones · R1=0x${r.regs[1].toString(16).padStart(2, "0")}` });
      return;
    }
    setOut({
      text: r.output || "(el programa no imprimió nada)",
      ok: false,
      note: r.accepted
        ? "Pasaste el control, pero la bandera salió en basura: la clave de descifrado ERA el serial correcto. Parchear te deja entrar, no recupera los datos."
        : `${r.steps} instrucciones · R1=0x${r.regs[1].toString(16).padStart(2, "0")}`,
    });
  };

  const applyPatch = () => {
    if (sel === null) return;
    const raw = patchByte.trim();
    const v = raw.startsWith("0x") || raw.startsWith("0X") ? parseInt(raw.slice(2), 16) : parseInt(raw, 10);
    const r = cm.patch(sel, Number.isNaN(v) ? -1 : v);
    say(r.ok ? `✔ ${r.message}` : `✘ ${r.message}`);
    setPatchByte("");
    refresh();
  };

  const brute = () => {
    const hits = cm.bruteforce();
    if (hits.length === 0) { say("Ninguna clave dio texto con pinta de bandera."); return; }
    if (kernel.scanForSignals(hits.map((h) => h.text).join("\n")).length) setSolved(true);
    setOut({
      text: hits.map((h) => `KEY=0x${h.key.toString(16).padStart(2, "0")} → ${h.text}`).join("\n"),
      ok: true,
      note: "Fuerza bruta sobre las 256 claves del cifrado.",
    });
  };

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>NandeReverse — {cm.name}</div>
        <span style={badge}>ÑVM-8 · {cm.codeBytes().length} bytes</span>
        {cm.patched() && <span style={{ ...badge, color: "#fbbf24", borderColor: "#78350f" }}>parcheado</span>}
        {solved && <span style={{ ...badge, color: "#86efac", borderColor: "#14532d" }}>resuelto</span>}
        <div style={{ flex: 1 }} />
        <button style={btn} onClick={() => { cm.restore(); say("Binario restaurado."); refresh(); }}>Restaurar</button>
        <button style={btn} onClick={brute}>Fuerza bruta</button>
      </div>

      <div style={intro}>
        El binario pide un <b>serial</b>: le hace un XOR acumulado byte a byte y lo compara
        contra una constante. Leé el desensamblado, encontrá esa constante y fabricá un serial
        que dé ese valor. Podés parchear bytes, pero ojo: la bandera se descifra con el serial
        correcto, así que saltarse el control te deja entrar sin recuperar nada.
      </div>

      <div style={tabs}>
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button key={t} style={t === tab ? tabActive : tabBtn} onClick={() => setTab(t)}>{TAB_LABEL[t]}</button>
        ))}
      </div>

      <div style={pane}>
        {tab === "dis" && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {listing.map((i) => {
              const isSel = i.addr === sel;
              return (
                <button key={i.addr} style={isSel ? insnRowSel : insnRow} onClick={() => setSel(isSel ? null : i.addr)}>
                  <span style={addrCol}>{i.addr.toString(16).padStart(4, "0")}</span>
                  <span style={bytesCol}>{i.bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ")}</span>
                  <span style={textCol}>{i.text}</span>
                  <span style={noteCol}>{i.note}</span>
                </button>
              );
            })}
          </div>
        )}
        {tab === "hex" && (
          <>
            <div style={secTitle}>Código</div>
            <pre style={code_}>{cm.hexdump()}</pre>
            <div style={secTitle}>Datos (acá vive la bandera, cifrada)</div>
            <pre style={code_}>{cm.hexdumpData()}</pre>
          </>
        )}
        {tab === "str" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {cm.strings().map((s) => (
              <div key={s.addr} style={strRow}>
                <span style={addrCol}>{s.addr.toString(16).padStart(4, "0")}</span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{s.text}</span>
              </div>
            ))}
            <div style={{ ...muted, marginTop: 8 }}>
              La bandera no aparece acá: está cifrada. Eso es exactamente lo que se busca
              con <code>strings</code> en un binario real — y cuando no está, hay que seguir leyendo el código.
            </div>
          </div>
        )}
        {tab === "xref" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {cm.xrefs().map((r) => (
              <div key={`${r.kind}-${r.to}`} style={strRow}>
                <span style={{ ...addrCol, color: r.kind === "code" ? "#93c5fd" : "#fbbf24" }}>
                  {r.kind === "code" ? "cod" : "dat"} {r.to.toString(16).padStart(4, "0")}
                </span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#8b98a5" }}>
                  ← {r.from.map((f) => f.toString(16).padStart(4, "0")).join(", ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div style={patchBar}>
          <span style={{ fontSize: 11.5, color: "#c9d3dd", fontFamily: "ui-monospace, monospace" }}>
            {selected.addr.toString(16).padStart(4, "0")}: {selected.text}
          </span>
          <input
            style={input}
            value={patchByte}
            onChange={(e) => setPatchByte(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applyPatch(); }}
            placeholder="byte nuevo (0x41)"
          />
          <button style={primaryBtn} onClick={applyPatch}>Parchear 0x{selected.addr.toString(16).padStart(4, "0")}</button>
        </div>
      )}

      <div style={runBar}>
        <input
          style={{ ...input, flex: 1 }}
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") execute(); }}
          placeholder="serial a probar"
        />
        <button style={primaryBtn} onClick={execute}>Ejecutar</button>
      </div>

      {out && (
        <div style={{ ...outBox, borderColor: out.ok ? "#14532d" : "#1b2733" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, monospace", fontSize: 12, color: out.ok ? "#b7f7c2" : "#e6edf3" }}>
            {out.text}
          </pre>
          {out.note && <div style={{ ...muted, marginTop: 6 }}>{out.note}</div>}
        </div>
      )}

      {log.length > 0 && (
        <div style={logBox}>
          {log.map((l, i) => <div key={i} style={{ fontSize: 11.5, color: "#c9d3dd", padding: "1px 0" }}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif", minHeight: 0 };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #1b2733", flexWrap: "wrap" };
const badge: CSSProperties = { fontSize: 10.5, color: "#8b98a5", border: "1px solid #1b2733", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" };
const intro: CSSProperties = { padding: "8px 12px", fontSize: 12, color: "#8b98a5", lineHeight: 1.6, borderBottom: "1px solid #131c26" };
const tabs: CSSProperties = { display: "flex", gap: 6, padding: "8px 12px 0", flexWrap: "wrap" };
const tabBtn: CSSProperties = { background: "#111820", color: "#8b98a5", border: "1px solid #1b2733", borderRadius: 6, padding: "5px 11px", fontSize: 12, cursor: "pointer" };
const tabActive: CSSProperties = { ...tabBtn, background: "#1b2733", color: "#e6edf3" };
const pane: CSSProperties = { flex: 1, overflow: "auto", padding: "8px 12px", minHeight: 0 };
const insnRow: CSSProperties = { display: "flex", alignItems: "baseline", gap: 10, padding: "3px 6px", background: "transparent", border: "1px solid transparent", borderRadius: 5, cursor: "pointer", textAlign: "left", width: "100%" };
const insnRowSel: CSSProperties = { ...insnRow, background: "#132030", border: "1px solid #2b6cb0" };
const addrCol: CSSProperties = { color: "#64748b", fontFamily: "ui-monospace, monospace", fontSize: 11.5, minWidth: 40 };
const bytesCol: CSSProperties = { color: "#fbbf24", fontFamily: "ui-monospace, monospace", fontSize: 11.5, minWidth: 72 };
const textCol: CSSProperties = { color: "#b7f7c2", fontFamily: "ui-monospace, monospace", fontSize: 12, minWidth: 150 };
const noteCol: CSSProperties = { color: "#64748b", fontSize: 11, flex: 1, minWidth: 0 };
const strRow: CSSProperties = { display: "flex", alignItems: "baseline", gap: 10, padding: "2px 6px" };
const secTitle: CSSProperties = { fontSize: 10.5, color: "#93c5fd", fontWeight: 700, letterSpacing: 0.3, margin: "4px 0 4px" };
const code_: CSSProperties = { margin: "0 0 10px", background: "#080f16", border: "1px solid #1b2733", borderRadius: 8, padding: "8px 10px", fontSize: 11, whiteSpace: "pre", overflowX: "auto", fontFamily: "ui-monospace, monospace", color: "#c9d3dd" };
const patchBar: CSSProperties = { display: "flex", gap: 6, alignItems: "center", padding: "8px 12px", borderTop: "1px solid #1b2733", background: "#0e141b", flexWrap: "wrap" };
const runBar: CSSProperties = { display: "flex", gap: 6, padding: "8px 12px", borderTop: "1px solid #1b2733" };
const input: CSSProperties = { minWidth: 0, background: "#080f16", color: "#e6edf3", border: "1px solid #1b2733", borderRadius: 6, padding: "6px 9px", fontSize: 12, fontFamily: "ui-monospace, monospace" };
const primaryBtn: CSSProperties = { background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" };
const btn: CSSProperties = { background: "#111820", color: "#c9d3dd", border: "1px solid #1b2733", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" };
const outBox: CSSProperties = { margin: "0 12px 10px", background: "#0e141b", border: "1px solid", borderRadius: 8, padding: "8px 10px" };
const logBox: CSSProperties = { margin: "0 12px 10px", background: "#0e141b", border: "1px solid #1b2733", borderRadius: 8, padding: "6px 10px" };
const muted: CSSProperties = { color: "#8b98a5", fontSize: 11.5, lineHeight: 1.6 };

export default ReverseView;
