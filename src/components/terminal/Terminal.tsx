import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { VirtualKernel } from "../../core/VirtualKernel";
import { sound } from "../../core/audio/Sound";
import { VirtualTerminal } from "../../core/terminal/VirtualTerminal";

interface TerminalProps {
  kernel: VirtualKernel;
}

/** Una línea ya impresa, con el tono con el que se dibuja. */
interface Line {
  text: string;
  kind: "out" | "cmd" | "err" | "ok" | "muted";
}

/** Una pestaña = una sesión independiente (su propia shell, cwd e historial). */
interface Tab {
  id: number;
  terminal: VirtualTerminal;
  lines: Line[];
  input: string;
  history: string[];
  historyIndex: number;
}

/** Temas de color intercambiables, como en Kitty. */
const THEMES = ["nande", "dracula", "gruvbox", "nord", "solarized", "matrix"] as const;

/**
 * Cabecera que ve el usuario al abrir o limpiar la terminal. Se dibuja con
 * carácter (no un vacío negro): quién sos, qué es esto y por dónde empezar.
 */
const BANNER: Line[] = [
  { text: "  ÑANDE OS", kind: "ok" },
  { text: "  Terminal de hacking · 100% laboratorio, 0% daño real", kind: "muted" },
  { text: "", kind: "muted" },
  { text: "  Empezá con:", kind: "out" },
  { text: "   ▸ guia              — tu primera misión, paso a paso", kind: "ok" },
  { text: "   ▸ help              — todos los comandos", kind: "ok" },
  { text: "   ▸ toolkit           — el arsenal de herramientas reales", kind: "ok" },
  { text: "   ▸ scan banco.nande  — escaneá tu primer objetivo", kind: "ok" },
  { text: "", kind: "muted" },
];

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
  const nextId = useRef(1);
  const makeTab = useCallback(
    (): Tab => ({
      id: nextId.current++,
      terminal: new VirtualTerminal(kernel),
      lines: [...BANNER],
      input: "",
      history: [],
      historyIndex: -1,
    }),
    [kernel],
  );

  const [tabs, setTabs] = useState<Tab[]>(() => [makeTab()]);
  const [activeId, setActiveId] = useState<number>(() => tabs[0].id);
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem("nd-term-theme") ?? "nande";
    } catch {
      return "nande";
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const directory = active.terminal.getCurrentDirectory();
  const displayDirectory = directory === "/home/student" ? "~" : directory;

  useEffect(() => {
    try {
      localStorage.setItem("nd-term-theme", theme);
    } catch {
      /* modo privado: seguimos sin persistir */
    }
  }, [theme]);

  /** Actualiza una pestaña por id de forma inmutable. */
  function patchTab(id: number, patch: (t: Tab) => Tab) {
    setTabs((prev) => prev.map((t) => (t.id === id ? patch(t) : t)));
  }

  function runCommand(command: string) {
    if (!command) return;

    const tab = tabs.find((t) => t.id === activeId);
    if (!tab) return;

    // Guardamos el prompt ANTES de ejecutar, para que "cd /" aparezca con el
    // directorio desde el que realmente se corrió.
    const dir = tab.terminal.getCurrentDirectory();
    const promptBefore = `student@nande-os:${dir === "/home/student" ? "~" : dir}$`;

    const output = tab.terminal.execute(command);

    if (output === "\x1b[CLEAR") {
      patchTab(tab.id, (t) => ({
        ...t,
        lines: [...BANNER],
        input: "",
        history: [...t.history.filter((h) => h !== command), command],
        historyIndex: -1,
      }));
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    patchTab(tab.id, (t) => ({
      ...t,
      input: "",
      history: [...t.history.filter((h) => h !== command), command],
      historyIndex: -1,
      lines: [
        ...t.lines,
        { text: `${promptBefore} ${command}`, kind: "cmd" as const },
        ...(output
          ? output.split("\n").map((text) => ({ text, kind: classify(text) }))
          : []),
      ],
    }));

    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // La app de aprendizaje puede pedir que la terminal ejecute algo (arrancar
  // una lección, por ejemplo). Va SIEMPRE a la pestaña activa. Usamos un ref
  // para que el handler del evento vea siempre el runCommand más nuevo.
  const runRef = useRef(runCommand);
  runRef.current = runCommand;

  useEffect(() => {
    if (kernel.pendingCommand) {
      const cmd = kernel.pendingCommand;
      kernel.pendingCommand = null;
      runRef.current(cmd);
    }

    return kernel.events.subscribe<{ command: string }>(
      "terminal.run",
      (event) => {
        kernel.pendingCommand = null;
        runRef.current(event.data.command);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kernel]);

  // La salida nueva (o el cambio de pestaña) queda siempre a la vista.
  useEffect(() => {
    const scroll = scrollRef.current;
    if (scroll) scroll.scrollTop = scroll.scrollHeight;
  }, [active.lines, activeId]);

  function newTab() {
    const tab = makeTab();
    setTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeTab(id: number) {
    setTabs((prev) => {
      if (prev.length === 1) return prev; // nunca cerramos la última
      const next = prev.filter((t) => t.id !== id);
      if (id === activeId) {
        const idx = prev.findIndex((t) => t.id === id);
        const fallback = next[Math.max(0, idx - 1)] ?? next[0];
        setActiveId(fallback.id);
      }
      return next;
    });
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function tabTitle(t: Tab, i: number): string {
    const dir = t.terminal.getCurrentDirectory();
    const base = dir === "/home/student" ? "~" : dir.split("/").filter(Boolean).pop() || "/";
    return `${i + 1}: ${base}`;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Atajos de pestañas estilo Kitty (con Alt, para no pisar los del navegador).
    if (event.altKey) {
      if (event.key === "t" || event.key === "T") {
        event.preventDefault();
        newTab();
        return;
      }
      if (event.key === "w" || event.key === "W") {
        event.preventDefault();
        closeTab(activeId);
        return;
      }
      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        const target = tabs[Number(event.key) - 1];
        if (target) setActiveId(target.id);
        return;
      }
    }

    // Vida audiovisual: un clic sutil por tecla (silenciable en Config).
    if (event.key.length === 1) sound.play("key");
    else if (event.key === "Enter") sound.play("click");

    if (event.key === "Enter") {
      event.preventDefault();
      runCommand(active.input.trim());
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (active.history.length === 0) return;
      const nextIndex =
        active.historyIndex === -1
          ? active.history.length - 1
          : Math.max(0, active.historyIndex - 1);
      patchTab(active.id, (t) => ({
        ...t,
        historyIndex: nextIndex,
        input: t.history[nextIndex] ?? "",
      }));
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (active.history.length === 0 || active.historyIndex === -1) return;
      const nextIndex = active.historyIndex + 1;
      if (nextIndex >= active.history.length) {
        patchTab(active.id, (t) => ({ ...t, historyIndex: -1, input: "" }));
        return;
      }
      patchTab(active.id, (t) => ({
        ...t,
        historyIndex: nextIndex,
        input: t.history[nextIndex] ?? "",
      }));
      return;
    }
  }

  return (
    <div className="nd-kitty" data-term-theme={theme}>
      <div className="nd-kitty__tabbar" role="tablist">
        {tabs.map((t, i) => (
          <div
            key={t.id}
            role="tab"
            aria-selected={t.id === activeId}
            className={`nd-kitty__tab${t.id === activeId ? " nd-kitty__tab--active" : ""}`}
            onClick={() => {
              setActiveId(t.id);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            title={tabTitle(t, i)}
          >
            <span className="nd-kitty__tab-title">{tabTitle(t, i)}</span>
            {tabs.length > 1 && (
              <span
                className="nd-kitty__tab-close"
                role="button"
                aria-label="Cerrar pestaña"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.id);
                }}
              >
                ×
              </span>
            )}
          </div>
        ))}
        <button
          type="button"
          className="nd-kitty__newtab"
          onClick={newTab}
          aria-label="Nueva pestaña (Alt+T)"
          title="Nueva pestaña (Alt+T)"
        >
          +
        </button>

        <span className="nd-kitty__spacer" />

        <select
          className="nd-kitty__theme"
          value={theme}
          onChange={(e) => {
            setTheme(e.target.value);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          aria-label="Tema de la terminal"
          title="Tema de color"
        >
          {THEMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="nd-term" onClick={() => inputRef.current?.focus()}>
        <div className="nd-term__scroll" ref={scrollRef}>
          {active.lines.map((line, index) => (
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
            value={active.input}
            onChange={(event) =>
              patchTab(active.id, (t) => ({
                ...t,
                input: event.target.value,
                historyIndex: -1,
              }))
            }
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Entrada de la terminal"
          />
        </div>
      </div>
    </div>
  );
}
