import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { AIMessage } from "../../core/ai/AIProvider";

interface Props {
  kernel: VirtualKernel;
  onOpenApp?: (id: string) => void;
}

const SYSTEM: AIMessage = {
  role: "system",
  content:
    "Sos Ñandú, el asistente de hacking ético de ÑANDE Hacklab, un juego-simulador " +
    "100% offline y ficticio. Ayudás a un principiante a aprender seguridad HACIENDO. " +
    "Comandos del juego: nmap, curl, service-stop/start, connect (pivoting), code/tool-install/run, " +
    "anon/macchanger/identidad, exiftool, crack, sqlmap, soc. Respondé breve, en español " +
    "rioplatense, con pasos concretos. Todo es un laboratorio ficticio: nunca objetivos reales.",
};

const QUICK: { label: string; prompt: string }[] = [
  { label: "¿Por dónde empiezo?", prompt: "Soy nuevo en ÑANDE. ¿Cuáles son mis primeros 3 pasos?" },
  { label: "Explicame SQLi", prompt: "Explicame en simple qué es una inyección SQL y cómo la pruebo acá." },
  { label: "¿Cómo me hago anónimo?", prompt: "¿Cómo bajo mi huella en la red dentro del juego?" },
  { label: "Ideas de tools", prompt: "Dame una idea de una herramienta útil que pueda programar en el IDE." },
];

interface Msg { role: "user" | "assistant"; text: string; model?: string }

/**
 * Asistente IA (Ñandú) — el co-piloto de todo el juego. Usa el AIService:
 * sin clave, IA local offline; con la clave de Groq/Gemini del jugador,
 * respuestas potentes. Es la integración de IA accesible desde el dock.
 */
export function AsistenteView({ kernel, onOpenApp }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(() => kernel.ai.mode());
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    const history = [...msgs, { role: "user" as const, text: clean }];
    setMsgs(history);
    setBusy(true);
    try {
      const aiMessages: AIMessage[] = [
        SYSTEM,
        ...history.map((m) => ({ role: m.role, content: m.text })),
      ];
      const r = await kernel.ai.generate(aiMessages, { maxTokens: 400 });
      setMsgs((m) => [...m, { role: "assistant", text: r.text, model: r.model }]);
      setMode(kernel.ai.mode());
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: "No pude responder ahora. Probá de nuevo.", model: "error" },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <div>
            <div style={{ fontWeight: 700 }}>Ñandú · Asistente IA</div>
            <div style={{ fontSize: 11, color: mode === "connected" ? "#86efac" : "#8b98a5" }}>
              {mode === "connected" ? "● conectado (tu clave)" : "○ modo local (offline)"}
            </div>
          </div>
        </div>
        {mode === "offline" && onOpenApp && (
          <button style={cfgBtn} onClick={() => onOpenApp("settings")}>
            Conectar Groq/Gemini
          </button>
        )}
      </div>

      <div style={feed}>
        {msgs.length === 0 && (
          <div style={{ color: "#8b98a5", fontSize: 13, lineHeight: 1.6 }}>
            Preguntame lo que quieras sobre el juego o sobre hacking. Sin tu clave
            respondo con la IA local; con tu clave de Groq o Gemini, mucho mejor.
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {QUICK.map((q) => (
                <button key={q.label} style={quickBtn} onClick={() => send(q.prompt)}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={m.role === "user" ? userRow : botRow}>
            <div style={m.role === "user" ? userBubble : botBubble}>{m.text}</div>
          </div>
        ))}
        {busy && <div style={botRow}><div style={botBubble}>Ñandú está pensando…</div></div>}
        <div ref={endRef} />
      </div>

      <div style={inputRow}>
        <input
          style={inputBox}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
          placeholder="Escribí tu pregunta…"
          disabled={busy}
        />
        <button style={sendBtn} onClick={() => send(input)} disabled={busy}>
          Enviar
        </button>
      </div>
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif" };
const header: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", borderBottom: "1px solid #1b2733" };
const cfgBtn: CSSProperties = { background: "#6d28d9", color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, cursor: "pointer" };
const feed: CSSProperties = { flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 };
const userRow: CSSProperties = { display: "flex", justifyContent: "flex-end" };
const botRow: CSSProperties = { display: "flex", justifyContent: "flex-start" };
const userBubble: CSSProperties = { maxWidth: "80%", background: "#1d4ed8", color: "#fff", borderRadius: "12px 12px 2px 12px", padding: "8px 12px", fontSize: 14, whiteSpace: "pre-wrap" };
const botBubble: CSSProperties = { maxWidth: "85%", background: "#111820", border: "1px solid #1b2733", borderRadius: "12px 12px 12px 2px", padding: "8px 12px", fontSize: 14, whiteSpace: "pre-wrap" };
const quickBtn: CSSProperties = { background: "#111820", color: "#7cc4ff", border: "1px solid #1b2733", borderRadius: 999, padding: "6px 12px", fontSize: 12, cursor: "pointer" };
const inputRow: CSSProperties = { display: "flex", gap: 8, padding: 10, borderTop: "1px solid #1b2733" };
const inputBox: CSSProperties = { flex: 1, background: "#0b1016", color: "#e6edf3", border: "1px solid #1b2733", borderRadius: 8, padding: "10px 12px", fontSize: 14 };
const sendBtn: CSSProperties = { background: "#15803d", color: "#fff", border: "none", borderRadius: 8, padding: "0 16px", fontSize: 14, cursor: "pointer" };

export default AsistenteView;
