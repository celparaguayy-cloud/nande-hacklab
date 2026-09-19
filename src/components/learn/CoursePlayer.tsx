import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { Curso, Slide } from "../../core/academy/Curriculum";
import { ConceptArt } from "./ConceptArt";

interface Props {
  kernel: VirtualKernel;
  curso: Curso;
  /** Slide inicial (para retomar donde se dejó). */
  startAt?: number;
  onExit: () => void;
  onOpenApp?: (id: string) => void;
}

const accent = "#3daee9";

/** Baraja estable (misma entrada → mismo orden), sembrada por el índice. */
function shuffleStable<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed * 9301 + 49297;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Reproductor de cursos interactivos: recorre las pantallas de un curso una a
 * una, con barra de progreso, dibujos (ConceptArt), quizzes, armado de comandos
 * y laboratorios reales que abren la terminal. Al terminar paga XP y marca el
 * curso como completado.
 */
function CoursePlayer({ kernel, curso, startAt = 0, onExit, onOpenApp }: Props) {
  const total = curso.slides.length;
  const [i, setI] = useState(() => Math.min(Math.max(0, startAt), total - 1));
  const [finished, setFinished] = useState(false);
  const slide = curso.slides[i];

  const goto = (next: number) => {
    const clamped = Math.min(Math.max(0, next), total - 1);
    setI(clamped);
    kernel.player.setCourseProgress(curso.id, clamped);
  };

  const finish = () => {
    kernel.player.setCourseProgress(curso.id, total);
    if (kernel.player.markCourseCompleted(`curso:${curso.id}`)) {
      const tick = kernel.world.getState().clock.tick;
      kernel.player.award(curso.reward.xp, {
        coins: curso.reward.coins,
        skill: curso.skill,
        tick,
      });
    }
    setFinished(true);
  };

  const pct = Math.round(((finished ? total : i) / total) * 100);

  return (
    <div style={overlay}>
      {/* barra superior */}
      <div style={topBar}>
        <button onClick={onExit} style={iconBtn} aria-label="Cerrar curso">✕</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {curso.title}
          </div>
          <div style={progTrack}>
            <div style={{ ...progFill, width: `${pct}%` }} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#8b98a5", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {finished ? total : i + 1}/{total}
        </div>
      </div>

      {/* cuerpo */}
      <div style={body}>
        {finished ? (
          <Done curso={curso} onExit={onExit} />
        ) : (
          <SlideView
            key={i}
            slide={slide}
            seed={i}
            kernel={kernel}
            onOpenApp={onOpenApp}
            isLast={i === total - 1}
            onAdvance={() => (i === total - 1 ? finish() : goto(i + 1))}
            onBack={i > 0 ? () => goto(i - 1) : undefined}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------ pantallas ------------------------------ */

function SlideView({
  slide, seed, kernel, onOpenApp, isLast, onAdvance, onBack,
}: {
  slide: Slide;
  seed: number;
  kernel: VirtualKernel;
  onOpenApp?: (id: string) => void;
  isLast: boolean;
  onAdvance: () => void;
  onBack?: () => void;
}) {
  const nextLabel = isLast ? "Finalizar ✓" : "Siguiente →";

  if (slide.kind === "concept") {
    return (
      <>
        <h2 style={h2}>{slide.title}</h2>
        {slide.diagram && <ConceptArt diagram={slide.diagram} />}
        <p style={para}>{slide.body}</p>
        {slide.bullets && (
          <ul style={bullets}>
            {slide.bullets.map((b, k) => <li key={k} style={{ marginBottom: 5 }}>{b}</li>)}
          </ul>
        )}
        <NavRow onBack={onBack} onNext={onAdvance} nextLabel={nextLabel} nextReady />
      </>
    );
  }

  if (slide.kind === "quiz") {
    return <Quiz slide={slide} seed={seed} onAdvance={onAdvance} onBack={onBack} nextLabel={nextLabel} />;
  }

  if (slide.kind === "build") {
    return <BuildPanel slide={slide} seed={seed} onAdvance={onAdvance} onBack={onBack} nextLabel={nextLabel} />;
  }

  // lab
  return (
    <Lab
      slide={slide}
      kernel={kernel}
      onOpenApp={onOpenApp}
      onAdvance={onAdvance}
      onBack={onBack}
      nextLabel={nextLabel}
    />
  );
}

function Quiz({
  slide, seed, onAdvance, onBack, nextLabel,
}: {
  slide: Extract<Slide, { kind: "quiz" }>;
  seed: number; onAdvance: () => void; onBack?: () => void; nextLabel: string;
}) {
  // `picked` guarda el ÍNDICE ORIGINAL de la opción, no la posición en pantalla.
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const right = picked === slide.correct;
  // Barajamos el ORDEN de las opciones (los autores suelen poner la correcta
  // primera). Sin esto, el que aprende toca siempre la de arriba y no lee.
  const order = useMemo(
    () => shuffleStable(slide.options.map((_, i) => i), seed + 13),
    [slide.options, seed],
  );

  return (
    <>
      <div style={kindTag}>❓ Pregunta</div>
      {slide.diagram && <ConceptArt diagram={slide.diagram} />}
      <p style={{ ...para, fontWeight: 600 }}>{slide.prompt}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {order.map((oi) => {
          const opt = slide.options[oi];
          const isCorrect = oi === slide.correct;
          let bg = "#0e141b", border = "#26313b", col = "#e6edf3";
          if (answered) {
            if (isCorrect) { bg = "rgba(110,231,135,0.14)"; border = "#6ee787"; col = "#8ff0a6"; }
            else if (oi === picked) { bg = "rgba(255,123,114,0.12)"; border = "#ff7b72"; col = "#ffb4a8"; }
            else { col = "#8b98a5"; }
          }
          return (
            <button
              key={oi}
              disabled={answered}
              onClick={() => setPicked(oi)}
              style={{
                textAlign: "left", padding: "11px 13px", borderRadius: 10,
                background: bg, border: `1px solid ${border}`, color: col,
                cursor: answered ? "default" : "pointer", fontSize: 13.5, lineHeight: 1.4,
              }}
            >
              {answered && isCorrect ? "✓ " : answered && oi === picked ? "✗ " : ""}{opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <div style={{ ...explainBox, borderLeftColor: right ? "#6ee787" : "#f5b544" }}>
          <strong style={{ color: right ? "#8ff0a6" : "#f5c15a" }}>
            {right ? "¡Correcto!" : "Casi. Mirá por qué:"}
          </strong>
          <div style={{ marginTop: 5 }}>{slide.explain}</div>
        </div>
      )}
      <NavRow onBack={onBack} onNext={onAdvance} nextLabel={nextLabel} nextReady={answered} />
    </>
  );
}

function BuildPanel({
  slide, seed, onAdvance, onBack, nextLabel,
}: {
  slide: Extract<Slide, { kind: "build" }>;
  seed: number; onAdvance: () => void; onBack?: () => void; nextLabel: string;
}) {
  const shuffled = useMemo(() => shuffleStable(slide.pieces, seed + 1), [slide.pieces, seed]);
  // Índices (en `shuffled`) ya colocados, en orden.
  const [placed, setPlaced] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<"none" | "ok" | "bad">("none");

  const used = new Set(placed);

  const add = (idx: number) => {
    if (used.has(idx) || result === "ok") return;
    setPlaced([...placed, idx]);
    setResult("none");
  };
  const removeAt = (pos: number) => {
    if (result === "ok") return;
    setPlaced(placed.filter((_, p) => p !== pos));
    setResult("none");
  };
  const check = () => {
    const ok = placed.map((idx) => shuffled[idx]).join(" ") === slide.answer.join(" ");
    setResult(ok ? "ok" : "bad");
  };
  const reset = () => { setPlaced([]); setResult("none"); };

  return (
    <>
      <div style={kindTag}>🧩 Armá el comando</div>
      <p style={{ ...para, fontWeight: 600 }}>{slide.goal}</p>

      {/* consola: comando en construcción */}
      <div style={consoleBox}>
        <span style={{ color: "#6ee787" }}>$</span>{" "}
        {placed.length === 0 ? (
          <span style={{ color: "#4a5866" }}>tocá las piezas de abajo…</span>
        ) : (
          placed.map((idx, pos) => (
            <button key={pos} onClick={() => removeAt(pos)} style={placedChip} title="quitar">
              {shuffled[idx]}
            </button>
          ))
        )}
        {result === "ok" && <span style={{ color: "#6ee787" }}> ✓</span>}
      </div>

      {/* piezas disponibles */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {shuffled.map((p, idx) => (
          <button
            key={idx}
            disabled={used.has(idx) || result === "ok"}
            onClick={() => add(idx)}
            style={{ ...pieceChip, opacity: used.has(idx) ? 0.28 : 1 }}
          >
            {p}
          </button>
        ))}
      </div>

      {showHint && result !== "ok" && (
        <div style={{ ...explainBox, borderLeftColor: "#f5b544" }}>
          <strong style={{ color: "#f5c15a" }}>Pista:</strong>
          <div style={{ marginTop: 4 }}>{slide.hint}</div>
        </div>
      )}
      {result === "bad" && (
        <div style={{ color: "#ffb4a8", fontSize: 13, marginTop: 10 }}>
          ✗ Todavía no. Fijate el orden y probá de nuevo (tocá una pieza puesta para sacarla).
        </div>
      )}
      {result === "ok" && (
        <div style={{ ...explainBox, borderLeftColor: "#6ee787" }}>
          <strong style={{ color: "#8ff0a6" }}>¡Comando correcto!</strong>
          <div style={{ marginTop: 5 }}>{slide.explain}</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        {result !== "ok" && (
          <>
            <button onClick={check} disabled={placed.length === 0} style={{ ...actionBtn, background: accent, color: "#05070a" }}>
              ▶ Ejecutar
            </button>
            <button onClick={() => setShowHint(true)} style={ghostBtn}>💡 Pista</button>
            {placed.length > 0 && <button onClick={reset} style={ghostBtn}>↺ Reiniciar</button>}
          </>
        )}
      </div>

      <NavRow onBack={onBack} onNext={onAdvance} nextLabel={nextLabel} nextReady={result === "ok"} />
    </>
  );
}

function Lab({
  slide, kernel, onOpenApp, onAdvance, onBack, nextLabel,
}: {
  slide: Extract<Slide, { kind: "lab" }>;
  kernel: VirtualKernel; onOpenApp?: (id: string) => void;
  onAdvance: () => void; onBack?: () => void; nextLabel: string;
}) {
  const [practiced, setPracticed] = useState(false);
  const practice = () => {
    onOpenApp?.("terminal");
    kernel.queueCommand(slide.command);
    setPracticed(true);
  };
  return (
    <>
      <div style={{ ...kindTag, color: "#6ee787", background: "rgba(110,231,135,0.12)" }}>🧪 Laboratorio real</div>
      <h2 style={h2}>{slide.title}</h2>
      {slide.diagram && <ConceptArt diagram={slide.diagram} />}
      <p style={para}>{slide.body}</p>
      <div style={consoleBox}>
        <span style={{ color: "#6ee787" }}>$</span> <span style={{ color: "#e6edf3" }}>{slide.command}</span>
      </div>
      <button onClick={practice} style={{ ...actionBtn, background: accent, color: "#05070a", marginTop: 12, width: "100%" }}>
        ⌨ Practicar en la terminal
      </button>
      {practiced && (
        <div style={{ ...explainBox, borderLeftColor: "#6ee787" }}>
          <strong style={{ color: "#8ff0a6" }}>Enviado a la terminal.</strong>
          <div style={{ marginTop: 5 }}>{slide.explain}</div>
        </div>
      )}
      <NavRow onBack={onBack} onNext={onAdvance} nextLabel={nextLabel} nextReady />
    </>
  );
}

function Done({ curso, onExit }: { curso: Curso; onExit: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 8px" }}>
      <div style={{ fontSize: 54 }}>🎓</div>
      <h2 style={{ ...h2, textAlign: "center" }}>¡Curso completado!</h2>
      <p style={{ ...para, textAlign: "center" }}>
        Terminaste <strong>{curso.title}</strong>. Ya no es teoría suelta: entendés cómo
        encaja cada pieza.
      </p>
      <div style={{ display: "inline-flex", gap: 10, margin: "8px 0 18px", flexWrap: "wrap", justifyContent: "center" }}>
        <span style={rewardChip}>+{curso.reward.xp} XP</span>
        <span style={rewardChip}>+N${curso.reward.coins}</span>
      </div>
      <button onClick={onExit} style={{ ...actionBtn, background: accent, color: "#05070a", width: "100%" }}>
        Volver a los cursos
      </button>
    </div>
  );
}

function NavRow({
  onBack, onNext, nextLabel, nextReady,
}: {
  onBack?: () => void; onNext: () => void; nextLabel: string; nextReady: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
      {onBack && <button onClick={onBack} style={ghostBtn}>← Atrás</button>}
      <button
        onClick={onNext}
        disabled={!nextReady}
        style={{
          ...actionBtn, marginLeft: "auto",
          background: nextReady ? accent : "#1b2733",
          color: nextReady ? "#05070a" : "#5a6b7a",
          cursor: nextReady ? "pointer" : "not-allowed",
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

/* -------------------------------- estilos ------------------------------- */

const overlay: CSSProperties = {
  position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column",
  background: "#0b0f14", color: "#e6edf3",
};
const topBar: CSSProperties = {
  flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
  borderBottom: "1px solid #26313b", background: "#0c1218",
};
const iconBtn: CSSProperties = {
  flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: "1px solid #26313b",
  background: "#111820", color: "#e6edf3", cursor: "pointer", fontSize: 14,
};
const progTrack: CSSProperties = { height: 5, borderRadius: 999, background: "#26313b", overflow: "hidden", marginTop: 5 };
const progFill: CSSProperties = { height: "100%", borderRadius: 999, background: accent, transition: "width .3s ease" };
const body: CSSProperties = { flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 14px 22px" };
const h2: CSSProperties = { fontSize: 19, margin: "4px 0 12px", lineHeight: 1.25, textWrap: "balance" as CSSProperties["textWrap"] };
const para: CSSProperties = { fontSize: 14, lineHeight: 1.6, opacity: 0.92, whiteSpace: "pre-line", margin: "12px 0" };
const bullets: CSSProperties = { fontSize: 13.5, lineHeight: 1.55, opacity: 0.9, paddingLeft: 20, margin: "6px 0" };
const kindTag: CSSProperties = {
  display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
  padding: "3px 10px", borderRadius: 999, background: "rgba(61,174,233,0.14)", color: accent, marginBottom: 10,
};
const explainBox: CSSProperties = {
  marginTop: 14, padding: "11px 13px", borderRadius: 10, background: "#111820",
  border: "1px solid #26313b", borderLeft: "3px solid #6ee787", fontSize: 13, lineHeight: 1.55,
};
const consoleBox: CSSProperties = {
  marginTop: 8, padding: "12px 13px", borderRadius: 10, background: "#0a1017",
  border: "1px solid #22303c", fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 13.5, lineHeight: 1.9, minHeight: 20, wordBreak: "break-word",
};
const pieceChip: CSSProperties = {
  padding: "8px 12px", borderRadius: 9, border: "1px solid #3a4b5a", background: "#16202b",
  color: "#e6edf3", cursor: "pointer", fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 13,
};
const placedChip: CSSProperties = {
  padding: "2px 7px", borderRadius: 6, border: "1px solid rgba(61,174,233,0.5)",
  background: "rgba(61,174,233,0.14)", color: "#cbe8fb", cursor: "pointer",
  fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 13, margin: "0 2px",
};
const actionBtn: CSSProperties = {
  padding: "10px 16px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const ghostBtn: CSSProperties = {
  padding: "10px 14px", borderRadius: 10, border: "1px solid #2c3a48", background: "transparent",
  color: "#c3d0dc", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
};
const rewardChip: CSSProperties = {
  padding: "6px 14px", borderRadius: 999, background: "rgba(61,174,233,0.14)",
  color: accent, fontWeight: 700, fontSize: 14,
};

export default CoursePlayer;
