import {
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

export default function Terminal({ kernel }: TerminalProps) {
  const terminal = useMemo(
    () => new VirtualTerminal(kernel),
    [kernel],
  );
  const [lines, setLines] = useState<string[]>([
    "ÑANDE OS Terminal",
    "Escribe 'help' para ver los comandos disponibles.",
    "",
  ]);

  const [input, setInput] = useState("");

  const [history, setHistory] = useState<string[]>(
    [],
  );

  const [historyIndex, setHistoryIndex] =
    useState(-1);

  const inputRef =
    useRef<HTMLInputElement>(null);

  function getPrompt(): string {
    const directory =
      terminal.getCurrentDirectory();

    const displayDirectory =
      directory === "/home/student"
        ? "~"
        : directory;

    return `student@nande-os:${displayDirectory}$`;
  }

  function executeCommand() {
    const command = input.trim();

    if (!command) {
      return;
    }

    // Guardamos el prompt ANTES de ejecutar.
    // Así "cd /" aparece con el directorio desde
    // el que realmente se ejecutó.
    const promptBefore = getPrompt();

    const output = terminal.execute(command);

    setHistory((previous) => [
      ...previous.filter(
        (item) => item !== command,
      ),
      command,
    ]);

    setHistoryIndex(-1);

    if (output === "\x1b[CLEAR") {
      setLines([
        "ÑANDE OS Terminal",
        "Escribe 'help' para ver los comandos disponibles.",
        "",
      ]);

      setInput("");

      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);

      return;
    }

    setLines((previous) => [
      ...previous,
      `${promptBefore} ${command}`,
      ...(output
        ? output.split("\n")
        : []),
    ]);

    setInput("");

    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
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
          : Math.max(
              0,
              historyIndex - 1,
            );

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

      const nextIndex =
        historyIndex + 1;

      if (
        nextIndex >=
        history.length
      ) {
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
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0b0f14",
        color: "#d7f9e9",
        fontFamily: "monospace",
        padding: "16px",
        boxSizing: "border-box",
        overflow: "auto",
      }}
      onClick={() =>
        inputRef.current?.focus()
      }
    >
      {lines.map((line, index) => (
        <div
          key={index}
          style={{
            whiteSpace: "pre-wrap",
          }}
        >
          {line}
        </div>
      ))}

      <div
        style={{
          display: "flex",
        }}
      >
        <span>
          {getPrompt()}&nbsp;
        </span>

        <input
          ref={inputRef}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setHistoryIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "inherit",
            fontFamily: "inherit",
            fontSize: "inherit",
          }}
        />
      </div>
    </div>
  );
}
