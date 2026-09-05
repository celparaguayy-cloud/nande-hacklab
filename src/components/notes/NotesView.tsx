import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { Note } from "../../core/notes/Notes";

interface NotesViewProps {
  kernel: VirtualKernel;
}

/** Bloc de notas del escritorio: crear, editar y borrar, todo persistido. */
function NotesView({ kernel }: NotesViewProps) {
  const [notes, setNotes] = useState<Note[]>(() => kernel.notes.all());
  const [openId, setOpenId] = useState<string | null>(
    () => kernel.notes.all()[0]?.id ?? null,
  );

  const tick = () => kernel.world.getState().clock.tick;
  const current = openId ? kernel.notes.get(openId) : undefined;

  const refresh = () => setNotes(kernel.notes.all());

  const create = () => {
    const note = kernel.notes.create("Nueva nota", "", tick());
    setOpenId(note.id);
    refresh();
  };

  const edit = (field: "title" | "body", value: string) => {
    if (!openId) return;
    kernel.notes.update(openId, { [field]: value }, tick());
    refresh();
  };

  const remove = (id: string) => {
    kernel.notes.remove(id);
    const rest = kernel.notes.all();
    setOpenId(rest[0]?.id ?? null);
    refresh();
  };

  return (
    <div style={container}>
      <div style={sidebar}>
        <button onClick={create} style={newBtn}>
          + Nueva nota
        </button>
        {notes.length === 0 && (
          <div style={{ color: "#8b98a5", fontSize: 12, marginTop: 8 }}>
            Sin notas todavía.
          </div>
        )}
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => setOpenId(n.id)}
            style={{
              ...item,
              background: n.id === openId ? "#16222c" : "#111820",
            }}
          >
            {n.title || "Sin título"}
          </button>
        ))}
      </div>

      <div style={panel}>
        {current ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                value={current.title}
                onChange={(e) => edit("title", e.target.value)}
                style={titleInput}
                placeholder="Título"
              />
              <button onClick={() => remove(current.id)} style={delBtn}>
                🗑️
              </button>
            </div>
            <textarea
              value={current.body}
              onChange={(e) => edit("body", e.target.value)}
              style={bodyArea}
              placeholder="Escribí tu nota... (se guarda sola)"
            />
          </>
        ) : (
          <div style={{ color: "#8b98a5", padding: 20 }}>
            Creá una nota para empezar.
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
  background: "#0b0f14",
  color: "#e6edf3",
  fontFamily: "system-ui, sans-serif",
  boxSizing: "border-box",
};
const sidebar: CSSProperties = {
  width: 180,
  minWidth: 150,
  padding: 12,
  borderRight: "1px solid #26313b",
  overflow: "auto",
};
const newBtn: CSSProperties = {
  width: "100%",
  padding: "8px",
  marginBottom: 10,
  border: "1px solid #2f5a3f",
  borderRadius: 8,
  background: "#16311f",
  color: "#7ee2a8",
  cursor: "pointer",
};
const item: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 10px",
  marginBottom: 6,
  border: "1px solid #26313b",
  borderRadius: 8,
  color: "#e6edf3",
  cursor: "pointer",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const panel: CSSProperties = {
  flex: 1,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};
const titleInput: CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #34414d",
  background: "#0e151c",
  color: "#e6edf3",
  fontWeight: 700,
  outline: "none",
};
const delBtn: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #5a3f3f",
  background: "#2a1616",
  cursor: "pointer",
};
const bodyArea: CSSProperties = {
  flex: 1,
  padding: 12,
  borderRadius: 8,
  border: "1px solid #34414d",
  background: "#0e151c",
  color: "#e6edf3",
  outline: "none",
  resize: "none",
  fontFamily: "inherit",
  fontSize: 14,
  lineHeight: 1.5,
};

export default NotesView;
