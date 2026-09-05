import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { Conversation } from "../../core/chat/Chat";

interface ChatViewProps {
  kernel: VirtualKernel;
}

/** Red social de ÑANDE: chateá con los habitantes y ellos te responden. */
function ChatView({ kernel }: ChatViewProps) {
  const [convos, setConvos] = useState<Conversation[]>(() =>
    kernel.chat.conversations(),
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [tick, setTick] = useState(0);

  // Contactos en línea para iniciar charlas nuevas.
  const contacts = useMemo(
    () => kernel.worldEngine.getOnlinePeople().slice(0, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kernel, tick],
  );

  useEffect(() => {
    const refresh = () => {
      setConvos(kernel.chat.conversations());
      setTick((t) => t + 1);
    };
    refresh();
    const unsubs = [
      kernel.events.subscribe("chat.received", refresh),
      kernel.events.subscribe("world.tick", () => setTick((t) => t + 1)),
    ];
    return () => {
      for (const off of unsubs) off();
    };
  }, [kernel]);

  const current = openId
    ? kernel.chat.history(openId) ??
      convos.find((c) => c.personId === openId)
    : undefined;

  const openConvo = (personId: string) => {
    kernel.chat.markRead(personId);
    setOpenId(personId);
    setConvos(kernel.chat.conversations());
  };

  const send = () => {
    if (!openId || !draft.trim()) return;
    const person = kernel.worldEngine.getPerson(openId);
    if (!person) return;
    kernel.chat.send(person, draft.trim(), kernel.world.getState().clock.tick);
    setDraft("");
    setConvos(kernel.chat.conversations());
  };

  return (
    <div style={container}>
      <div style={sidebar}>
        <h3 style={{ margin: "0 0 8px" }}>💬 Chats</h3>

        {convos.length === 0 && (
          <div style={{ color: "#8b98a5", fontSize: 12, marginBottom: 10 }}>
            Todavía sin charlas.
          </div>
        )}

        {convos.map((c) => (
          <button
            key={c.personId}
            onClick={() => openConvo(c.personId)}
            style={{
              ...contactBtn,
              background: c.personId === openId ? "#16222c" : "#111820",
              fontWeight: c.unread > 0 ? 700 : 400,
            }}
          >
            {c.unread > 0 ? "● " : ""}
            {c.personName}
            <div style={{ fontSize: 11, color: "#8b98a5" }}>{c.profession}</div>
          </button>
        ))}

        <div style={{ margin: "12px 0 6px", color: "#8b98a5", fontSize: 12 }}>
          En línea
        </div>
        {contacts.map((p) => (
          <button
            key={p.id}
            onClick={() => openConvo(p.id)}
            style={{ ...contactBtn, background: "#0e151c" }}
          >
            {p.name}
            <div style={{ fontSize: 11, color: "#7ee2a8" }}>● {p.profession}</div>
          </button>
        ))}
      </div>

      <div style={panel}>
        {current ? (
          <>
            <div style={chatHeader}>{current.personName}</div>
            <div style={thread}>
              {current.messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    ...bubble,
                    alignSelf: m.from === "me" ? "flex-end" : "flex-start",
                    background: m.from === "me" ? "#1b3a4a" : "#1b2430",
                  }}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <div style={composer}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder={`Escribile a ${current.personName}...`}
                style={input}
              />
              <button onClick={send} style={sendBtn}>
                Enviar
              </button>
            </div>
          </>
        ) : (
          <div style={{ color: "#8b98a5", padding: 20 }}>
            Elegí un contacto para chatear. Los habitantes te responden según
            su profesión e intereses.
          </div>
        )}
      </div>
    </div>
  );
}

const container: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  boxSizing: "border-box",
  background: "#0b0f14",
  color: "#e6edf3",
  fontFamily: "system-ui, sans-serif",
};
const sidebar: CSSProperties = {
  width: 200,
  minWidth: 160,
  padding: 12,
  borderRight: "1px solid #26313b",
  overflow: "auto",
};
const contactBtn: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 10px",
  marginBottom: 6,
  border: "1px solid #26313b",
  borderRadius: 8,
  color: "#e6edf3",
  cursor: "pointer",
};
const panel: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};
const chatHeader: CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #26313b",
  fontWeight: 700,
};
const thread: CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
const bubble: CSSProperties = {
  maxWidth: "78%",
  padding: "8px 12px",
  borderRadius: 12,
  fontSize: 14,
  lineHeight: 1.4,
};
const composer: CSSProperties = {
  display: "flex",
  gap: 8,
  padding: 12,
  borderTop: "1px solid #26313b",
};
const input: CSSProperties = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #34414d",
  background: "#0e151c",
  color: "#e6edf3",
  outline: "none",
};
const sendBtn: CSSProperties = {
  padding: "8px 16px",
  border: "1px solid #2f5a3f",
  borderRadius: 8,
  background: "#16311f",
  color: "#7ee2a8",
  cursor: "pointer",
};

export default ChatView;
