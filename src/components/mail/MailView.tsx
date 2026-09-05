import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { MailMessage } from "../../core/mail/VirtualMail";

interface MailViewProps {
  kernel: VirtualKernel;
}

/** Correo virtual: bandeja, lectura y misiones que te mandan los habitantes. */
function MailView({ kernel }: MailViewProps) {
  const [inbox, setInbox] = useState<MailMessage[]>(() => kernel.mail.inbox());
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    const refresh = () => setInbox(kernel.mail.inbox());
    refresh();
    const unsub = kernel.events.subscribe("mail.received", refresh);
    return () => unsub();
  }, [kernel]);

  const open = (m: MailMessage) => {
    kernel.mail.markRead(m.id);
    setOpenId(m.id);
    setInbox(kernel.mail.inbox());
    setNote("");
  };

  const accept = (m: MailMessage) => {
    if (!m.missionId) return;
    const mission = kernel.missions.get(m.missionId);
    setNote(
      mission
        ? `Misión aceptada: ${mission.title}. ${mission.hint}`
        : "La misión ya no está disponible.",
    );
  };

  const current = inbox.find((m) => m.id === openId);

  return (
    <div style={container}>
      <div style={header}>
        <h2 style={{ margin: 0 }}>✉️ ÑANDE Mail</h2>
        <span style={{ color: "#8b98a5", fontSize: 13 }}>
          {kernel.mail.unreadCount()} sin leer · student@mail.nande
        </span>
      </div>

      {inbox.length === 0 ? (
        <div style={empty}>
          📭 Bandeja vacía. Los habitantes te van a escribir con el tiempo.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={list}>
            {inbox.slice(0, 20).map((m) => (
              <button
                key={m.id}
                onClick={() => open(m)}
                style={{
                  ...listItem,
                  background: m.id === openId ? "#16222c" : "#111820",
                  fontWeight: m.read ? 400 : 700,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{m.read ? "" : "● "}{m.fromName}</span>
                  {m.missionId && <span>📋</span>}
                </div>
                <div style={{ color: "#8b98a5", fontSize: 12 }}>{m.subject}</div>
              </button>
            ))}
          </div>

          <div style={reader}>
            {current ? (
              <>
                <div style={{ color: "#8b98a5", fontSize: 12 }}>
                  De {current.fromName} &lt;{current.fromAddress}&gt;
                </div>
                <h3 style={{ margin: "6px 0 12px" }}>{current.subject}</h3>
                <p style={{ lineHeight: 1.6 }}>{current.body}</p>

                {current.missionId && (
                  <button onClick={() => accept(current)} style={acceptBtn}>
                    📋 Aceptar misión
                  </button>
                )}

                {note && <div style={noteBox}>{note}</div>}
              </>
            ) : (
              <div style={{ color: "#8b98a5" }}>
                Elegí un mensaje para leerlo.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const container: CSSProperties = {
  width: "100%",
  height: "100%",
  overflow: "auto",
  boxSizing: "border-box",
  padding: 16,
  background: "#0b0f14",
  color: "#e6edf3",
  fontFamily: "system-ui, sans-serif",
};
const header: CSSProperties = { marginBottom: 14 };
const empty: CSSProperties = {
  padding: 20,
  border: "1px solid #26313b",
  borderRadius: 8,
  color: "#8b98a5",
};
const list: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 240,
  flex: "1 1 240px",
};
const listItem: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  border: "1px solid #26313b",
  borderRadius: 8,
  color: "#e6edf3",
  cursor: "pointer",
};
const reader: CSSProperties = {
  flex: "2 1 320px",
  minWidth: 280,
  padding: 14,
  border: "1px solid #26313b",
  borderRadius: 8,
  background: "#111820",
};
const acceptBtn: CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #2f5a3f",
  borderRadius: 6,
  background: "#16311f",
  color: "#7ee2a8",
  cursor: "pointer",
};
const noteBox: CSSProperties = {
  marginTop: 12,
  padding: "8px 10px",
  borderRadius: 6,
  background: "#12202a",
  color: "#7ee2a8",
  fontSize: 13,
};

export default MailView;
