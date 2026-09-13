import { useState, useRef, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { AIMessage } from "../../core/ai/AIProvider";
import { Assistant, type AssistantReply } from "../../core/ai/Assistant";
import { buildWorldContext, worldContextPrompt } from "../../core/ai/WorldContext";

interface Props {
  kernel: VirtualKernel;
  onOpenApp?: (id: string) => void;
}

const SYSTEM: AIMessage = {
  role: "system",
  content:
    "Sos Ñandú, el asistente de hacking ético de ÑANDE Hacklab, un juego-simulador " +
    "100% offline y ficticio. Ayudás a un principiante a aprender seguridad HACIENDO. " +
    "Respondé breve, en español rioplatense, con pasos concretos. Todo es un laboratorio " +
    "ficticio: nunca objetivos reales.",
};

const QUICK: { label: string; prompt: string }[] = [
  { label: "🔍 Escaneá el objetivo", prompt: "escaneá objetivo.corp.nande" },
  { label: "🎯 ¿Qué detectaron?", prompt: "mostrame las técnicas MITRE" },
  { label: "🕵️ Investigá el incidente", prompt: "investigá el incidente" },
  { label: "🩸 Ruta al dominio", prompt: "mostrame el dominio" },
  { label: "🎲 Dame un reto", prompt: "dame un reto" },
  { label: "🐍 Código en Python", prompt: "escribime un port scanner en python" },
];

interface Msg { role: "user" | "assistant" | "tool"; text: string; action?: AssistantReply["action"]; openApp?: string; model?: string }

/**
 * Asistente IA (Ñandú) — un AGENTE, no una vitrina. Interpreta lo que pedís y
 * EJECUTA el comando real del juego, mostrándote la salida verdadera. Escribe
 * código real, responde de verdad, y abre la app que corresponde. Si conectás
 * tu clave de Groq/Gemini, además suma respuestas del modelo para lo abierto.
 */
export function AsistenteView({ kernel, onOpenApp }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(() => kernel.ai.mode());
  const endRef = useRef<HTMLDivElement>(null);
  const agent = useMemo(() => new Assistant(kernel), [kernel]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  /** Corre un comando real del juego y muestra su salida verdadera. */
  const runCommand = (command: string) => {
    const output = agent.run(command);
    setMsgs((m) => [...m, { role: "tool", text: `$ ${command}\n\n${output.trim()}` }]);
  };

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: clean }]);
    setBusy(true);

    try {
      // Snapshot del mundo AHORA: Ñandú responde con la verdad del runtime.
      const ctx = buildWorldContext(kernel);

      // 1) El agente decide qué hacer (acción / código / conocimiento / chat).
      const reply = agent.respond(clean, ctx);
      setMsgs((m) => [...m, { role: "assistant", text: reply.text, action: reply.action, openApp: reply.openApp }]);

      // 2) Si es accionable, EJECUTO el comando real y muestro la salida.
      if (reply.action) {
        const output = agent.run(reply.action.command);
        setMsgs((m) => [...m, { role: "tool", text: `$ ${reply.action!.command}\n\n${output.trim()}` }]);
      }

      // 3) Para charla abierta con clave conectada, sumo la respuesta del modelo.
      //    Si el modelo falla (CORS, red), NO muestro error: el texto del
      //    agente ya respondió algo útil.
      if (reply.kind === "chat" && kernel.ai.mode() === "connected") {
        try {
          // El modelo conectado responde GROUNDED en el estado real del mundo.
          const aiMessages: AIMessage[] = [
            SYSTEM,
            { role: "system", content: worldContextPrompt(ctx) },
            { role: "user", content: clean },
          ];
          const r = await kernel.ai.generate(aiMessages, { maxTokens: 400 });
          if (r.model !== "nande-offline") {
            setMsgs((m) => [...m, { role: "assistant", text: r.text, model: r.model }]);
          } else {
            // Cayó al offline: mostramos POR QUÉ falló la IA conectada.
            const err = kernel.ai.getLastError();
            if (err) setMsgs((m) => [...m, { role: "assistant", text: `⚠ Tu IA conectada no respondió (${err}). Probá "Configuración → Probar conexión". Igual te contesto local.`, model: "aviso" }]);
          }
        } catch {
          /* el agente ya respondió */
        }
      }
      setMode(kernel.ai.mode());
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Uy, algo se trabó. Probá de nuevo o pedime otra cosa." }]);
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
            <div style={{ fontWeight: 700 }}>Ñandú · Asistente que HACE</div>
            <div style={{ fontSize: 11, color: mode === "connected" ? "#86efac" : "#8b98a5" }}>
              {mode === "connected" ? "● conectado (tu clave)" : "○ agente local — ejecuta comandos reales"}
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
            Pedime algo y lo <b>hago</b>: escaneo, investigo un incidente, te doy un reto,
            escribo código. No sólo explico — ejecuto los comandos reales del juego.
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
            {m.role === "tool" ? (
              <pre style={toolBubble}>{m.text}</pre>
            ) : (
              <div style={m.role === "user" ? userBubble : botBubble}>
                {m.text}
                {m.action && (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button style={runBtn} onClick={() => runCommand(m.action!.command)}>
                      {m.action.label} (de nuevo)
                    </button>
                    {m.openApp && onOpenApp && (
                      <button style={openBtn} onClick={() => onOpenApp(m.openApp!)}>
                        Abrir la app
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <div style={botRow}><div style={botBubble}>Ñandú está trabajando…</div></div>}
        <div ref={endRef} />
      </div>

      <div style={inputRow}>
        <input
          style={inputBox}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
          placeholder="Pedime algo: escaneá, investigá, dame un reto…"
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
const userBubble: CSSProperties = { maxWidth: "85%", background: "#1d4ed8", color: "#fff", borderRadius: "12px 12px 2px 12px", padding: "8px 12px", fontSize: 14, whiteSpace: "pre-wrap" };
const botBubble: CSSProperties = { maxWidth: "88%", background: "#111820", border: "1px solid #1b2733", borderRadius: "12px 12px 12px 2px", padding: "8px 12px", fontSize: 14, whiteSpace: "pre-wrap" };
const toolBubble: CSSProperties = { maxWidth: "92%", background: "#08110a", border: "1px solid #14532d", borderRadius: 8, padding: "8px 10px", fontSize: 11.5, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, monospace", color: "#b7f7c2", margin: 0 };
const quickBtn: CSSProperties = { background: "#111820", color: "#7cc4ff", border: "1px solid #1b2733", borderRadius: 999, padding: "6px 12px", fontSize: 12, cursor: "pointer" };
const runBtn: CSSProperties = { background: "#15803d", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" };
const openBtn: CSSProperties = { background: "#1b2733", color: "#7cc4ff", border: "1px solid #2a3a4a", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" };
const inputRow: CSSProperties = { display: "flex", gap: 8, padding: 10, borderTop: "1px solid #1b2733" };
const inputBox: CSSProperties = { flex: 1, background: "#0b1016", color: "#e6edf3", border: "1px solid #1b2733", borderRadius: 8, padding: "10px 12px", fontSize: 14 };
const sendBtn: CSSProperties = { background: "#15803d", color: "#fff", border: "none", borderRadius: 8, padding: "0 16px", fontSize: 14, cursor: "pointer" };

export default AsistenteView;
