import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { ToolArtifact } from "../../core/code/ToolRuntime";

interface CodeIDEProps {
  kernel: VirtualKernel;
}

const STARTER = `// Mi primera herramienta. Corre en el sandbox de ÑANDE.
// 'args' son los argumentos; 'print(...)' escribe la salida;
// 'nande.scan(host)' / 'nande.http(url)' tocan el mundo virtual.
var objetivo = args[0] || "server.nande";
print("Escaneando " + objetivo + " ...");
var puertos = nande.scan(objetivo);
for (var i = 0; i < puertos.length; i++) {
  print(puertos[i].port + "/tcp  " + puertos[i].state + "  " + puertos[i].service);
}
`;

/**
 * ÑANDE Code — un IDE de verdad dentro del juego. Escribís código, lo
 * compilás, lo probás en el sandbox y lo instalás como herramienta ejecutable.
 * Lo mismo que hace la terminal (code/compile/tool-install/run), pero táctil.
 */
export function CodeIDE({ kernel }: CodeIDEProps) {
  const [tools, setTools] = useState<ToolArtifact[]>(() => kernel.toolRuntime.list());
  const [name, setName] = useState("mi-tool");
  const [source, setSource] = useState(STARTER);
  const [args, setArgs] = useState("server.nande");
  const [output, setOutput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [wish, setWish] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "err" | ""; msg: string }>({
    kind: "",
    msg: "",
  });

  const refresh = () => setTools(kernel.toolRuntime.list());

  const compile = () => {
    const r = kernel.sandbox.compile(source);
    if (r.ok) {
      setStatus({
        kind: "ok",
        msg: `✔ compila${r.warnings.length ? " · avisos: " + r.warnings.join("; ") : ""}`,
      });
    } else {
      setStatus({ kind: "err", msg: "✘ " + r.errors.join(" · ") });
    }
  };

  const test = () => {
    const r = kernel.toolRuntime.runSource(source, args.split(/\s+/).filter(Boolean));
    setOutput(r.output + (r.error ? `\n[error] ${r.error}` : ""));
    setStatus(
      r.ok
        ? { kind: "ok", msg: "▶ ejecutado" }
        : { kind: "err", msg: "✘ " + (r.error ?? "error") },
    );
  };

  const install = () => {
    const r = kernel.toolRuntime.install(source, { name }, "player");
    if (r.ok) {
      setStatus({ kind: "ok", msg: `✔ instalada como "${r.name}" — usala con: run ${r.name}` });
      refresh();
    } else {
      setStatus({ kind: "err", msg: "✘ " + r.errors.join(" · ") });
    }
  };

  const askAI = async () => {
    setAiBusy(true);
    setStatus({ kind: "", msg: `🤖 pensando (${kernel.ai.mode()})…` });
    try {
      const r = await kernel.ai.generate([
        {
          role: "system",
          content:
            "Sos un tutor de programación de herramientas de hacking ético en ÑANDE. " +
            "El código corre en un sandbox con print(...), args[], nande.scan(host), " +
            "nande.http(url) y nande.resolve(host). Respondé breve y en español rioplatense.",
        },
        { role: "user", content: `Revisá o mejorá esta herramienta:\n\n${source}` },
      ]);
      setOutput(`🤖 ${r.model}:\n${r.text}`);
      setStatus({ kind: "ok", msg: "respuesta lista" });
    } catch {
      setStatus({ kind: "err", msg: "la IA no respondió" });
    } finally {
      setAiBusy(false);
    }
  };

  const generar = async () => {
    const pedido = wish.trim();
    if (!pedido) {
      setStatus({ kind: "err", msg: "Describí qué herramienta querés (ej: «una tool que pruebe el diccionario contra un login»)." });
      return;
    }
    setGenBusy(true);
    setStatus({ kind: "", msg: `🪄 generando con ${kernel.ai.mode() === "connected" ? "tu IA" : "el forjador offline"}…` });
    try {
      const r = await kernel.toolSynthesizer.synthesize(pedido);
      setSource(r.source);
      setName(r.suggestedName);
      setOutput(
        `🪄 ${r.note}\n` +
          `motor: ${r.engine}` +
          (r.warnings.length ? `\navisos: ${r.warnings.join("; ")}` : "") +
          "\n\n// Revisá el código, tocá ▶ Probar y después Instalar.",
      );
      setStatus(
        r.ok
          ? { kind: "ok", msg: `✔ código listo (${r.engine}). Probalo e instalalo.` }
          : { kind: "err", msg: "✘ " + (r.error ?? "no compiló") },
      );
    } catch {
      setStatus({ kind: "err", msg: "no se pudo generar la herramienta" });
    } finally {
      setGenBusy(false);
    }
  };

  const nueva = () => {
    setName(`tool-${kernel.toolRuntime.count() + 1}`);
    setSource(STARTER);
    setOutput("");
    setStatus({ kind: "ok", msg: "Nueva herramienta lista. Editá, Probá e Instalá." });
  };

  const load = (t: ToolArtifact) => {
    setName(t.manifest.name);
    setSource(t.source);
    setStatus({
      kind: "",
      msg: `${t.manifest.name} v${t.manifest.version} · ${t.origin === "npc" ? "hecha por un NPC" : "tuya"}`,
    });
  };

  const remove = (n: string) => {
    kernel.toolRuntime.remove(n);
    refresh();
  };

  return (
    <div style={container}>
      <div style={sidebar}>
        <div style={sideTitle}>Herramientas</div>
        {tools.length === 0 && <div style={hint}>Todavía no hay ninguna.</div>}
        {tools.map((t) => (
          <div key={t.manifest.name} style={toolRow}>
            <button onClick={() => load(t)} style={toolBtn} title={t.manifest.description}>
              <span>{t.manifest.name}</span>
              <span style={badge(t.origin)}>{t.origin === "npc" ? "NPC" : "vos"}</span>
            </button>
            <button onClick={() => remove(t.manifest.name)} style={delBtn} title="Desinstalar">
              ✕
            </button>
          </div>
        ))}
        <button onClick={refresh} style={smallBtn}>
          ↻ Actualizar
        </button>
      </div>

      <div style={main}>
        <div style={toolbar}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={nameInput}
            placeholder="nombre"
            spellCheck={false}
          />
          <button onClick={nueva} style={{ ...btn, background: "#1f2937" }}>Nueva</button>
          <button onClick={compile} style={btn}>Compilar</button>
          <button onClick={test} style={{ ...btn, background: "#0e7490" }}>▶ Probar</button>
          <button onClick={install} style={{ ...btn, background: "#15803d" }}>Instalar</button>
          <button onClick={askAI} disabled={aiBusy} style={{ ...btn, background: "#6d28d9", opacity: aiBusy ? 0.6 : 1 }}>
            🤖 Ayuda IA
          </button>
        </div>

        <div style={wishRow}>
          <input
            value={wish}
            onChange={(e) => setWish(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !genBusy) generar();
            }}
            style={wishInput}
            spellCheck={false}
            placeholder="Describí la herramienta que querés… (ej: escanear la red y guardar un reporte)"
          />
          <button
            onClick={generar}
            disabled={genBusy}
            style={{ ...btn, background: "#b45309", opacity: genBusy ? 0.6 : 1, whiteSpace: "nowrap" }}
          >
            🪄 Generar
          </button>
        </div>

        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          style={editor}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />

        <div style={argsRow}>
          <span style={{ color: "#8b98a5", fontSize: 12 }}>args:</span>
          <input
            value={args}
            onChange={(e) => setArgs(e.target.value)}
            style={argsInput}
            spellCheck={false}
            placeholder="argumentos separados por espacio"
          />
        </div>

        {status.msg && (
          <div
            style={{
              ...statusBar,
              color: status.kind === "err" ? "#fca5a5" : status.kind === "ok" ? "#86efac" : "#8b98a5",
            }}
          >
            {status.msg}
          </div>
        )}

        <pre style={outputPane}>{output || "// la salida de 'Probar' aparece acá"}</pre>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ estilos */

const container: CSSProperties = {
  display: "flex",
  height: "100%",
  background: "#0b1016",
  color: "#e6edf3",
  fontFamily: "system-ui, sans-serif",
};
const sidebar: CSSProperties = {
  width: 160,
  minWidth: 120,
  borderRight: "1px solid #1b2733",
  padding: 8,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
const sideTitle: CSSProperties = { fontSize: 12, color: "#8b98a5", fontWeight: 700, marginBottom: 4 };
const hint: CSSProperties = { fontSize: 12, color: "#8b98a5" };
const toolRow: CSSProperties = { display: "flex", gap: 4, alignItems: "stretch" };
const toolBtn: CSSProperties = {
  flex: 1,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 6,
  background: "#111820",
  color: "#e6edf3",
  border: "1px solid #1b2733",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  cursor: "pointer",
  textAlign: "left",
};
const badge = (origin: string): CSSProperties => ({
  fontSize: 9,
  padding: "1px 5px",
  borderRadius: 999,
  background: origin === "npc" ? "#3730a3" : "#166534",
  color: "#fff",
});
const delBtn: CSSProperties = {
  background: "#111820",
  color: "#8b98a5",
  border: "1px solid #1b2733",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 11,
  padding: "0 6px",
};
const smallBtn: CSSProperties = {
  marginTop: "auto",
  background: "#111820",
  color: "#8b98a5",
  border: "1px solid #1b2733",
  borderRadius: 6,
  padding: "6px",
  fontSize: 12,
  cursor: "pointer",
};
const main: CSSProperties = { flex: 1, display: "flex", flexDirection: "column", padding: 8, gap: 8, minWidth: 0 };
const toolbar: CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" };
const nameInput: CSSProperties = {
  flex: "1 1 120px",
  minWidth: 90,
  background: "#0b1016",
  color: "#e6edf3",
  border: "1px solid #1b2733",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 13,
};
const btn: CSSProperties = {
  background: "#374151",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 13,
  cursor: "pointer",
};
const editor: CSSProperties = {
  flex: 1,
  minHeight: 160,
  background: "#0b1016",
  color: "#c9f7c9",
  border: "1px solid #1b2733",
  borderRadius: 6,
  padding: 10,
  fontFamily: "ui-monospace, monospace",
  fontSize: 13,
  lineHeight: 1.5,
  resize: "none",
  whiteSpace: "pre",
  overflow: "auto",
};
const wishRow: CSSProperties = { display: "flex", gap: 6, alignItems: "center" };
const wishInput: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "#0b1016",
  color: "#e6edf3",
  border: "1px solid #b4530955",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 13,
};
const argsRow: CSSProperties = { display: "flex", gap: 8, alignItems: "center" };
const argsInput: CSSProperties = {
  flex: 1,
  background: "#0b1016",
  color: "#e6edf3",
  border: "1px solid #1b2733",
  borderRadius: 6,
  padding: "6px 8px",
  fontFamily: "ui-monospace, monospace",
  fontSize: 13,
};
const statusBar: CSSProperties = { fontSize: 12, fontFamily: "ui-monospace, monospace" };
const outputPane: CSSProperties = {
  margin: 0,
  minHeight: 90,
  maxHeight: 200,
  overflow: "auto",
  background: "#05080c",
  color: "#e6edf3",
  border: "1px solid #1b2733",
  borderRadius: 6,
  padding: 10,
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
  whiteSpace: "pre-wrap",
};

export default CodeIDE;
