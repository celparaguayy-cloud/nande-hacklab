import { useEffect, useRef, useState } from "react";
import "./boot.css";

interface BootProps {
  /** Se llama con el alias elegido al terminar el arranque. */
  onReady: (alias: string) => void;
}

/** Líneas del "arranque" tipo BIOS/CRT. */
const BOOT_LINES = [
  "ÑANDE BIOS v4.8 ... OK",
  "Comprobando memoria .............. 640K OK",
  "Inicializando kernel virtual ..... OK",
  "Montando sistema de archivos ..... OK",
  "Conectando a La Grid ............. OK",
  "Cargando 2000 habitantes ......... OK",
  "Motor SQL ........................ OK",
  "Servidor web virtual ............. OK",
  "Aislamiento de red real .......... ACTIVO",
  "",
  "> Canal cifrado entrante...",
  "> KUÑA (Colectivo Año'ῖ): ¿Estás ahí? Te necesitamos.",
];

type Phase = "booting" | "identify";

/**
 * Pantalla de arranque de ÑANDE.
 *
 * Reemplaza el "escritorio vacío" por una entrada con historia: un booteo
 * CRT y la creación del agente. En segundos ya estás dentro de algo, no
 * mirando íconos sin saber qué tocar. Se muestra una sola vez (se recuerda
 * en localStorage, desde el escritorio).
 */
export default function Boot({ onReady }: BootProps) {
  const [phase, setPhase] = useState<Phase>("booting");
  const [shown, setShown] = useState(0);
  const [alias, setAlias] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Va revelando las líneas del booteo.
  useEffect(() => {
    if (phase !== "booting") return;
    if (shown >= BOOT_LINES.length) {
      const id = setTimeout(() => setPhase("identify"), 700);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setShown((n) => n + 1), 190);
    return () => clearTimeout(id);
  }, [shown, phase]);

  useEffect(() => {
    if (phase === "identify") inputRef.current?.focus();
  }, [phase]);

  function confirm() {
    onReady(alias.trim() || "anon");
  }

  return (
    <div className="boot">
      <div className="boot__scan" />
      <div className="boot__crt">
        <pre className="boot__log">
          {BOOT_LINES.slice(0, shown).join("\n")}
          {phase === "booting" && <span className="boot__cursor">▊</span>}
        </pre>

        {phase === "identify" && (
          <div className="boot__identify">
            <p className="boot__q">
              Antes de empezar, necesito un alias para vos. Nadie usa su nombre
              real en La Grid.
            </p>
            <div className="boot__row">
              <span className="boot__prompt">agente@nande:~$</span>
              <input
                ref={inputRef}
                className="boot__input"
                value={alias}
                maxLength={20}
                spellCheck={false}
                placeholder="tu alias"
                onChange={(e) => setAlias(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirm()}
              />
            </div>
            <button className="boot__go" onClick={confirm}>
              Entrar a ÑANDE ▸
            </button>
            <p className="boot__tip">
              Tu primera misión te espera en el Centro de Mando. Kuña te va a
              guiar. Objetivo: Mbarete Bank.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
