import { useEffect, useState } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { Advice } from "../../core/mentor/Mentor";
import "./mani.css";

interface ManiProps {
  kernel: VirtualKernel;
  /** Para ejecutar un comando en la terminal ("hacelo conmigo"). */
  onRunCommand?: (command: string) => void;
}

/**
 * La Mani 🥜 — el ayudante flotante que guía al jugador.
 *
 * Aparece abajo a la derecha (o como burbuja plegada). Muestra el consejo
 * del mentor para el objetivo actual, con una escalera de ayuda: "necesito
 * más" sube un escalón (empujón → pista → comando → hacelo conmigo), y
 * "ya entendí" la pliega. Se refresca con los eventos del juego.
 */
export default function Mani({ kernel, onRunCommand }: ManiProps) {
  const [open, setOpen] = useState(true);
  const [advice, setAdvice] = useState<Advice | null>(() => kernel.mentor.advise());
  const [muted, setMuted] = useState(() => kernel.mentor.getState().muted);

  useEffect(() => {
    const refresh = () => setAdvice(kernel.mentor.advise());
    const unsubs = [
      kernel.events.subscribe("mission.progress", refresh),
      kernel.events.subscribe("mission.completed", refresh),
      kernel.events.subscribe("player.xp", refresh),
      kernel.events.subscribe("world.news.created", refresh),
    ];
    return () => unsubs.forEach((u) => u());
  }, [kernel]);

  if (muted) {
    return (
      <button
        className="mani-nub mani-nub--muted"
        onClick={() => {
          kernel.mentor.mute(false);
          setMuted(false);
          setOpen(true);
          setAdvice(kernel.mentor.advise());
        }}
        title="Volver a activar a la Mani"
      >
        🥜
      </button>
    );
  }

  if (!open) {
    return (
      <button className="mani-nub" onClick={() => setOpen(true)} title="La Mani">
        🥜
      </button>
    );
  }

  return (
    <div className="mani">
      <div className="mani__head">
        <span className="mani__who">🥜 La Mani</span>
        <div className="mani__head-actions">
          <button
            className="mani__x"
            title="Silenciar"
            onClick={() => {
              kernel.mentor.mute(true);
              setMuted(true);
            }}
          >
            🔇
          </button>
          <button className="mani__x" title="Plegar" onClick={() => setOpen(false)}>
            ▾
          </button>
        </div>
      </div>

      <div className="mani__body">
        {advice ? (
          <>
            <p className="mani__text">{advice.text}</p>

            {advice.command && (
              <div className="mani__cmd">
                <code>{advice.command}</code>
                {onRunCommand && (
                  <button
                    className="mani__run"
                    onClick={() => onRunCommand(advice.command!)}
                  >
                    Ejecutar
                  </button>
                )}
              </div>
            )}

            <div className="mani__actions">
              <button
                className="mani__btn"
                onClick={() => {
                  kernel.mentor.askMore();
                  setAdvice(kernel.mentor.advise());
                }}
              >
                No entiendo, ayudame más
              </button>
              <button className="mani__btn mani__btn--ghost" onClick={() => setOpen(false)}>
                Ya entendí
              </button>
            </div>
          </>
        ) : (
          <p className="mani__text">
            🥜 Bien ahí. Cuando necesites una mano, tocame. Estoy para que
            aprendas, no para hacerlo por vos.
          </p>
        )}
      </div>
    </div>
  );
}
