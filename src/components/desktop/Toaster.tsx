import { useEffect, useRef, useState } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import { Glyph, type GlyphName } from "../ui/Glyph";
import "./toaster.css";

interface Toast {
  id: number;
  glyph: GlyphName;
  title: string;
  text: string;
  tone: "gold" | "cyan";
}

/**
 * Toaster — feedback efímero cuando pasa algo bueno (subís de nivel, ganás un
 * logro). Da esa capa de "sensación" que un producto pulido tiene: la acción
 * responde. Escucha los eventos reales del kernel; no inventa nada.
 */
export function Toaster({ kernel }: { kernel: VirtualKernel }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    const push = (t: Omit<Toast, "id">) => {
      const id = (seq.current += 1);
      setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, 4000);
    };

    const unsubs = [
      kernel.events.subscribe("achievement.unlocked", (e) => {
        const a = e.data as { title?: string } | undefined;
        push({
          glyph: "medal",
          title: "Logro desbloqueado",
          text: a?.title ?? "¡Bien ahí!",
          tone: "gold",
        });
      }),
      kernel.events.subscribe("skill.levelup", (e) => {
        const p = e.data as { level?: number } | undefined;
        push({
          glyph: "star",
          title: "¡Subiste de nivel!",
          text: p?.level ? `Ahora sos nivel ${p.level}` : "Nuevo nivel",
          tone: "cyan",
        });
      }),
    ];

    // Gancho de desarrollo: dispara un toast de prueba para poder verlo sin
    // jugar una partida entera. Se elimina del build de producción.
    let offTest: (() => void) | undefined;
    if (import.meta.env.DEV) {
      const onTest = () =>
        push({ glyph: "medal", title: "Logro desbloqueado", text: "Primer acceso", tone: "gold" });
      window.addEventListener("nande:test-toast", onTest);
      offTest = () => window.removeEventListener("nande:test-toast", onTest);
    }

    return () => {
      for (const off of unsubs) off();
      offTest?.();
    };
  }, [kernel]);

  if (toasts.length === 0) return null;

  return (
    <div className="nd-toaster" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="nd-toast" data-tone={t.tone}>
          <span className="nd-toast__icon">
            <Glyph name={t.glyph} size={20} />
          </span>
          <span className="nd-toast__body">
            <strong className="nd-toast__title">{t.title}</strong>
            <span className="nd-toast__text">{t.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
