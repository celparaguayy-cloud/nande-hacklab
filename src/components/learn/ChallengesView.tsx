import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { Challenge } from "../../core/academy/Tracks";

interface Props {
  kernel: VirtualKernel;
  /** Banderas ya capturadas por el jugador (para marcar ✓). */
  flags: string[];
  onOpenApp?: (id: string) => void;
  /** Abrir el curso que enseña la técnica (repasar). */
  onOpenCourse?: (courseId: string) => void;
}

const accent = "#3daee9";

const DIFF_COLOR: Record<Challenge["difficulty"], string> = {
  "fácil": "#7ee2a8",
  "media": "#ffd479",
  "difícil": "#ff8f8f",
};

/**
 * Tablero de Retos (CTF): desafíos donde el alumno APLICA lo aprendido
 * capturando una bandera REAL en el mundo ÑANDE. No se regala nada: un reto
 * queda ✓ sólo cuando su bandera aparece en el historial del jugador.
 */
function ChallengesView({ kernel, flags, onOpenApp, onOpenCourse }: Props) {
  const retos = kernel.tracks.challenges();
  const captured = new Set(flags);
  const hechos = retos.filter((r) => captured.has(r.flag)).length;

  return (
    <>
      <div style={{ ...card, background: "linear-gradient(135deg,#3a1c3f,#1d1424)", borderColor: "#5a2f5f" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: 15 }}>🚩 Retos · Captura la Bandera</strong>
          <span style={{ fontSize: 13, color: accent, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
            {hechos}/{retos.length}
          </span>
        </div>
        <p style={{ fontSize: 13, opacity: 0.88, margin: "6px 0 0", lineHeight: 1.5 }}>
          Escenarios reales: usá las herramientas para capturar cada bandera
          <code style={{ color: "#b98cff" }}> ND&#123;...&#125;</code>. No hay atajo — se
          logra haciéndolo. Sin límite de tiempo.
        </p>
      </div>

      {retos.map((r) => (
        <RetoCard
          key={r.id}
          reto={r}
          done={captured.has(r.flag)}
          onPractice={(cmd) => {
            onOpenApp?.("terminal");
            kernel.queueCommand(cmd);
          }}
          onReview={r.courseId && onOpenCourse ? () => onOpenCourse(r.courseId!) : undefined}
        />
      ))}
    </>
  );
}

function RetoCard({
  reto, done, onPractice, onReview,
}: {
  reto: Challenge;
  done: boolean;
  onPractice: (cmd: string) => void;
  onReview?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const diffColor = DIFF_COLOR[reto.difficulty];

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden", borderColor: done ? "#2f6f45" : "#26313b" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", textAlign: "left", cursor: "pointer", border: "none",
          background: done ? "rgba(110,231,135,0.08)" : "transparent", color: "#e6edf3",
          padding: 14, display: "flex", gap: 10, alignItems: "center",
        }}
      >
        <span style={{ fontSize: 20 }}>{done ? "🏆" : "🚩"}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14 }}>{reto.title}</strong>
            <span style={{ ...diffBadge, color: diffColor, border: `1px solid ${diffColor}44` }}>{reto.difficulty}</span>
            {done && <span style={{ fontSize: 11, color: "#6ee787" }}>✓ capturada</span>}
          </span>
          <span style={{ display: "block", fontSize: 12.5, opacity: 0.8, marginTop: 3 }}>{reto.objective}</span>
        </span>
        <span style={{ color: "#8b98a5", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.55, margin: "4px 0 12px" }}>{reto.scenario}</p>

          <div style={sectionLabel}>🎯 Objetivo</div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            {reto.objective} → bandera <code style={{ color: "#b98cff" }}>{reto.flag}</code>
          </div>

          <div style={sectionLabel}>⌨ Pasos sugeridos</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {reto.steps.map((cmd, i) => (
              <div key={i} style={stepRow}>
                <code style={{ flex: 1, minWidth: 0, overflowX: "auto", fontSize: 12 }}>{cmd}</code>
                <button onClick={() => onPractice(cmd)} style={runBtn}>▶</button>
              </div>
            ))}
          </div>

          {hintsShown > 0 && (
            <div style={{ marginBottom: 10 }}>
              {reto.hints.slice(0, hintsShown).map((h, i) => (
                <div key={i} style={hintBox}>💡 {h}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {hintsShown < reto.hints.length && (
              <button onClick={() => setHintsShown((n) => n + 1)} style={ghostBtn}>
                💡 Pista ({hintsShown}/{reto.hints.length})
              </button>
            )}
            {onReview && (
              <button onClick={onReview} style={ghostBtn}>📘 Repasar el curso</button>
            )}
            <span style={{ marginLeft: "auto", fontSize: 12, color: accent, fontWeight: 600 }}>
              +{reto.reward.xp} XP
            </span>
          </div>

          {done && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "rgba(110,231,135,0.1)", border: "1px solid #2f6f45", fontSize: 13, color: "#8ff0a6" }}>
              🏆 ¡Bandera capturada! Dominás esta técnica.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const card: CSSProperties = {
  padding: 14, borderRadius: 12, background: "#111820", border: "1px solid #26313b", marginBottom: 12,
};
const diffBadge: CSSProperties = {
  fontSize: 10.5, padding: "1px 7px", borderRadius: 999, background: "#0e141b", whiteSpace: "nowrap",
};
const sectionLabel: CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", opacity: 0.8, margin: "2px 0 5px",
};
const stepRow: CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8,
  background: "#0a1017", border: "1px solid #22303c",
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
};
const runBtn: CSSProperties = {
  flexShrink: 0, width: 30, height: 26, borderRadius: 7, border: "none",
  background: accent, color: "#05070a", cursor: "pointer", fontWeight: 700, fontSize: 12,
};
const hintBox: CSSProperties = {
  fontSize: 12.5, lineHeight: 1.5, padding: "8px 11px", borderRadius: 9, marginBottom: 6,
  background: "rgba(245,181,68,0.1)", border: "1px solid rgba(245,181,68,0.25)", color: "#f5c15a",
};
const ghostBtn: CSSProperties = {
  padding: "8px 12px", borderRadius: 9, border: "1px solid #2c3a48", background: "transparent",
  color: "#c3d0dc", fontWeight: 600, fontSize: 12.5, cursor: "pointer",
};

export default ChallengesView;
