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
/** Recuerda si el panel quedó abierto o plegado (por defecto, plegado). */
function loadOpen(): boolean {
  try {
    return localStorage.getItem("nande-mani-open") === "1";
  } catch {
    return false;
  }
}

/** Herramientas de la terminal: si el "comando" empieza con una, se ejecuta;
 *  si no, es un payload para un campo de la web y se copia. */
const TERMINAL_TOOLS = [
  "crack", "jwt", "nmap", "curl", "proxychains", "tcpdump", "sqlmap", "ping",
  "nslookup", "dig", "hydra", "gobuster", "hashcat", "john", "ssh", "cat",
  "ls", "cd", "whoami", "traceroute", "wifi", "arp", "nc", "netcat",
];
function isTerminalCommand(cmd: string): boolean {
  const first = cmd.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return TERMINAL_TOOLS.includes(first);
}

export default function Mani({ kernel, onRunCommand }: ManiProps) {
  // Arranca PLEGADA (el manícito): así no tapa el escritorio ni las ventanas.
  // Se abre cuando el jugador la toca, y se recuerda su estado.
  const [open, setOpenRaw] = useState<boolean>(loadOpen);
  const setOpen = (v: boolean) => {
    setOpenRaw(v);
    try {
      localStorage.setItem("nande-mani-open", v ? "1" : "0");
    } catch {
      /* se puede jugar sin persistir */
    }
  };
  const [advice, setAdvice] = useState<Advice | null>(() => kernel.mentor.advise());
  const [muted, setMuted] = useState(() => kernel.mentor.getState().muted);
  const [copied, setCopied] = useState(false);
  // Ayuda en el modo CTF: cuando hay un reto activo, la Mani ayuda con ESE
  // objetivo (no solo con la campaña). Se refresca con el reloj del mundo.
  const [, force] = useState(0);
  const [ctfHint, setCtfHint] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setAdvice(kernel.mentor.advise());
    const bump = () => force((n) => n + 1);
    const unsubs = [
      kernel.events.subscribe("mission.progress", refresh),
      kernel.events.subscribe("mission.completed", refresh),
      kernel.events.subscribe("player.xp", refresh),
      kernel.events.subscribe("world.news.created", refresh),
      // Para detectar cuándo empieza/termina un reto CTF y aparecer ahí.
      kernel.events.subscribe("world.tick", bump),
    ];
    return () => unsubs.forEach((u) => u());
  }, [kernel]);

  const ctfChallenge = kernel.ctf.current();

  // Al cambiar (o terminar) el reto CTF, olvidar la pista anterior.
  useEffect(() => {
    setCtfHint(null);
  }, [ctfChallenge?.host]);

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
        {ctfChallenge ? (
          <>
            <p className="mani__text">
              🎯 Estás en un reto CTF contra <b>{ctfChallenge.host}</b> ({ctfChallenge.ip}).
              {ctfHint ? ` ${ctfHint}` : " ¿Necesitás una mano? Te doy una pista (te cuesta puntos)."}
            </p>
            {ctfHint && /(?:curl|nmap|connect|cat|service-)/.test(ctfHint) && (
              <div className="mani__cmd">
                <button
                  className="mani__run"
                  onClick={() => {
                    try { navigator.clipboard?.writeText(ctfHint.replace(/^🥜\s*(Comando exacto:|Comandos:)?\s*/, "")); } catch { /* sin portapapeles */ }
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                >
                  {copied ? "¡Copiado!" : "Copiar comando"}
                </button>
              </div>
            )}
            <div className="mani__actions">
              <button
                className="mani__btn"
                onClick={() => {
                  const h = kernel.ctf.hint();
                  if (h) setCtfHint(h.text);
                }}
              >
                🥜 Dame una pista
              </button>
              <button className="mani__btn mani__btn--ghost" onClick={() => setOpen(false)}>
                Dale, sigo solo
              </button>
            </div>
          </>
        ) : advice ? (
          <>
            <p className="mani__text">{advice.text}</p>

            {advice.command && (
              <div className="mani__cmd">
                <code>{advice.command}</code>
                {isTerminalCommand(advice.command) ? (
                  onRunCommand && (
                    <button
                      className="mani__run"
                      onClick={() => onRunCommand(advice.command!)}
                    >
                      Ejecutar
                    </button>
                  )
                ) : (
                  // No es un comando de terminal (es un payload para un campo
                  // de la web, como admin'--). Ejecutarlo en la terminal no
                  // tiene sentido: mejor copiarlo para pegarlo en el sitio.
                  <button
                    className="mani__run"
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(advice.command!);
                      } catch {
                        /* sin portapapeles */
                      }
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    }}
                  >
                    {copied ? "¡Copiado!" : "Copiar"}
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
              {advice.level < 2 && (
                <button
                  className="mani__btn"
                  onClick={() => {
                    kernel.mentor.reveal();
                    setAdvice(kernel.mentor.advise());
                  }}
                >
                  Mostrame el comando
                </button>
              )}
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
