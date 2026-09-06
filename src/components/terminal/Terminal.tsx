import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { VirtualKernel } from "../../core/VirtualKernel";
import { VirtualTerminal } from "../../core/terminal/VirtualTerminal";

interface TerminalProps {
  kernel: VirtualKernel;
}

/** Cabecera que ve el usuario al abrir o limpiar la terminal. */
const BANNER = [
  "ÑANDE OS Terminal",
  "Escribe 'help' para ver los comandos disponibles.",
  "",
];

/** Una línea ya impresa, con el tono con el que se dibuja. */
interface Line {
  text: string;
  kind: "out" | "cmd" | "err" | "ok" | "muted";
}

/** Marcas típicas de error en la salida de los comandos. */
const ERROR_HINTS = [
  "command not found",
  "no such file",
  "not found",
  "permission denied",
  "no existe",
  "no se encontró",
  "error:",
  "falló",
  "denegado",
];

/** Marcas de éxito: sirven para pintar de verde los aciertos. */
const OK_HINTS = ["✓", "correcto", "completada", "desbloquea", "conseguiste"];

function classify(text: string): Line["kind"] {
  const lower = text.toLowerCase();

  if (ERROR_HINTS.some((hint) => lower.includes(hint))) return "err";
  if (OK_HINTS.some((hint) => lower.includes(hint))) return "ok";

  return "out";
}

export default function Terminal({ kernel }: TerminalProps) {
  const terminal = useMemo(() => new VirtualTerminal(kernel), [kernel]);

  const [lines, setLines] = useState<Line[]>(() =>
    BANNER.map((text) => ({ text, kind: "muted" as const })),
  );

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const directory = terminal.getCurrentDirectory();

  const displayDirectory =
    directory === "/home/student" ? "~" : directory;

  function getPrompt(): string {
    return `student@nande-os:${displayDirectory}$`;
  }

  function executeCommand() {
    runCommand(input.trim());
  }

  function runCommand(command: string) {
    if (!command) {
      return;
    }

    // Guardamos el prompt ANTES de ejecutar.
    // Así "cd /" aparece con el directorio desde
    // el que realmente se ejecutó.
    const promptBefore = getPrompt();

    const output = terminal.execute(command);

    setHistory((previous) => [
      ...previous.filter((item) => item !== command),
      command,
    ]);

    setHistoryIndex(-1);

    if (output === "\x1b[CLEAR") {
      setLines(BANNER.map((text) => ({ text, kind: "muted" as const })));
      setInput("");

      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);

      return;
    }

    setLines((previous) => [
      ...previous,
      { text: `${promptBefore} ${command}`, kind: "cmd" as const },
      ...(output
        ? output
            .split("\n")
            .map((text) => ({ text, kind: classify(text) }))
        : []),
    ]);

    setInput("");

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  // La app de aprendizaje puede pedir que la terminal ejecute algo
  // (por ejemplo, arrancar una lección). Se consume al abrir y por evento.
  useEffect(() => {
    if (kernel.pendingCommand) {
      const cmd = kernel.pendingCommand;
      kernel.pendingCommand = null;
      runCommand(cmd);
    }

    return kernel.events.subscribe<{ command: string }>(
      "terminal.run",
      (event) => {
        kernel.pendingCommand = null;
        runCommand(event.data.command);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kernel]);

  // La salida nueva queda siempre a la vista: antes había que scrollear a
  // mano después de cada comando largo.
  useEffect(() => {
    const scroll = scrollRef.current;

    if (scroll) {
      scroll.scrollTop = scroll.scrollHeight;
    }
  }, [lines]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      executeCommand();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (history.length === 0) {
        return;
      }

      const nextIndex =
        historyIndex === -1
          ? history.length - 1
          : Math.max(0, historyIndex - 1);

      setHistoryIndex(nextIndex);
      setInput(history[nextIndex] ?? "");

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (history.length === 0) {
        return;
      }

      if (historyIndex === -1) {
        return;
      }

      const nextIndex = historyIndex + 1;

      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setInput("");
        return;
      }

      setHistoryIndex(nextIndex);
      setInput(history[nextIndex] ?? "");

      return;
    }
  }

  return (
    <div className="nd-term" onClick={() => inputRef.current?.focus()}>
      <div className="nd-term__scroll" ref={scrollRef}>
        {lines.map((line, index) => (
          <div
            key={index}
            className={`nd-term__line nd-term__line--${line.kind}`}
          >
            {line.text}
          </div>
        ))}
      </div>

      <div className="nd-term__inputrow">
        <span className="nd-term__prompt">
          <span className="nd-term__prompt-user">student@nande-os</span>
          <span className="nd-term__prompt-sign">:</span>
          <span className="nd-term__prompt-path">{displayDirectory}</span>
          <span className="nd-term__prompt-sign">$</span>
        </span>

        <input
          ref={inputRef}
          className="nd-term__input"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setHistoryIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Entrada de la terminal"
        />
      </div>
    </div>
  );
}
