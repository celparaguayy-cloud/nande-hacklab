import { useEffect, useMemo, useState } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import { MACHINES, machineProgress, type MachineDifficulty, type PracticeMachine } from "../../core/range/Machines";
import { Glyph } from "../ui/Glyph";

interface MachinesViewProps {
  kernel: VirtualKernel;
  onOpenApp?: (id: string) => void;
}

const DIFF_LABEL: Record<MachineDifficulty, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  experto: "Experto",
};

/** Un tono por dificultad (verde → rojo), como los niveles de HTB. */
const DIFF_HUE: Record<MachineDifficulty, number> = {
  principiante: 140,
  intermedio: 45,
  avanzado: 20,
  experto: 0,
};

export default function MachinesView({ kernel, onOpenApp }: MachinesViewProps) {
  const [, setNonce] = useState(0);
  const [selectedId, setSelectedId] = useState<string>(MACHINES[0].id);

  // Refresco en vivo: cuando cae una bandera (award → player.xp) el progreso
  // de las salas se actualiza solo.
  useEffect(() => {
    const refresh = () => setNonce((n) => n + 1);
    const offs = [
      kernel.events.subscribe("player.xp", refresh),
      kernel.events.subscribe("achievement.unlocked", refresh),
      kernel.events.subscribe("world.tick", refresh),
    ];
    return () => offs.forEach((off) => off());
  }, [kernel]);

  const flags = kernel.player.capturedFlags();
  const selected = MACHINES.find((m) => m.id === selectedId) ?? MACHINES[0];

  const totals = useMemo(() => {
    let rooted = 0;
    let points = 0;
    for (const m of MACHINES) {
      const p = machineProgress(m, flags);
      if (p.rooted) {
        rooted += 1;
        points += m.points;
      }
    }
    return { rooted, points, total: MACHINES.length };
  }, [flags]);

  const start = (m: PracticeMachine) => {
    onOpenApp?.("terminal");
    kernel.queueCommand(m.entry);
  };

  const sel = machineProgress(selected, flags);

  return (
    <div className="nd-maq">
      <header className="nd-maq__head">
        <div className="nd-maq__title">
          <Glyph name="target" size={22} />
          <div>
            <h1>Máquinas</h1>
            <p>Salas de práctica: vulnerá cada objetivo de punta a punta, con herramientas reales.</p>
          </div>
        </div>
        <div className="nd-maq__score">
          <span className="nd-maq__score-num">{totals.rooted}/{totals.total}</span>
          <span className="nd-maq__score-lbl">rooteadas · {totals.points} pts</span>
        </div>
      </header>

      <div className="nd-maq__body">
        <div className="nd-maq__list" role="list">
          {MACHINES.map((m) => {
            const p = machineProgress(m, flags);
            const active = m.id === selectedId;
            return (
              <button
                type="button"
                key={m.id}
                role="listitem"
                className={`nd-maq__card${active ? " nd-maq__card--active" : ""}${p.rooted ? " nd-maq__card--rooted" : ""}`}
                style={{ ["--maq-hue" as string]: String(DIFF_HUE[m.difficulty]) }}
                onClick={() => setSelectedId(m.id)}
              >
                <div className="nd-maq__card-top">
                  <span className="nd-maq__card-name">{m.name}</span>
                  {p.rooted ? (
                    <span className="nd-maq__badge nd-maq__badge--root">ROOT</span>
                  ) : p.started ? (
                    <span className="nd-maq__badge">{p.captured}/{p.total}</span>
                  ) : null}
                </div>
                <div className="nd-maq__card-host">{m.host}</div>
                <div className="nd-maq__card-meta">
                  <span className="nd-maq__diff">{DIFF_LABEL[m.difficulty]}</span>
                  <span className="nd-maq__pts">{m.points} pts</span>
                </div>
                <div className="nd-maq__tags">
                  {m.tags.map((t) => (
                    <span key={t} className="nd-maq__tag">{t}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="nd-maq__detail" style={{ ["--maq-hue" as string]: String(DIFF_HUE[selected.difficulty]) }}>
          <div className="nd-maq__detail-head">
            <div>
              <h2>{selected.name}</h2>
              <div className="nd-maq__detail-host">
                {selected.host}{selected.ip ? ` · ${selected.ip}` : ""} · {selected.os}
              </div>
            </div>
            <span className="nd-maq__diff nd-maq__diff--big">{DIFF_LABEL[selected.difficulty]}</span>
          </div>

          <div className="nd-maq__tags">
            {selected.tags.map((t) => (
              <span key={t} className="nd-maq__tag">{t}</span>
            ))}
          </div>

          <p className="nd-maq__brief">{selected.brief}</p>

          <div className="nd-maq__tasks">
            <div className="nd-maq__tasks-title">Objetivos ({sel.captured}/{sel.total})</div>
            {selected.tasks.map((t) => {
              const got = flags.includes(t.flag);
              return (
                <div key={t.flag} className={`nd-maq__task${got ? " nd-maq__task--done" : ""}`}>
                  <span className="nd-maq__task-check">{got ? "✓" : "○"}</span>
                  <span className="nd-maq__task-label">{t.label}</span>
                  <span className="nd-maq__task-flag">{got ? t.flag : "ND{· · ·}"}</span>
                </div>
              );
            })}
          </div>

          <p className="nd-maq__hint">💡 {selected.hint}</p>

          <div className="nd-maq__actions">
            <button type="button" className="nd-maq__btn nd-maq__btn--primary" onClick={() => start(selected)}>
              {sel.started ? "Seguir en la terminal" : "Empezar en la terminal"}
            </button>
            {selected.courseId && (
              <button type="button" className="nd-maq__btn" onClick={() => onOpenApp?.("learn")}>
                Repasar el curso
              </button>
            )}
          </div>

          {sel.rooted && (
            <div className="nd-maq__rooted-note">
              🏴 Máquina rooteada. Todas las banderas capturadas — +{selected.points} pts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
