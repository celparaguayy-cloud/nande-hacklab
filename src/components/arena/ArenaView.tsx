import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import type { CtfChallenge, CtfNivel, CtfScore } from "../../core/game/CtfArena";

interface Props {
  kernel: VirtualKernel;
  onOpenApp?: (id: string) => void;
}

/**
 * Arena CTF — modo contrarreloj: te dan un objetivo, corre el cronómetro y
 * ganás puntos por capturar la bandera rápido. Detecta la captura mirando las
 * banderas del jugador (mismo runtime), así que se vulnera "de verdad".
 */
export function ArenaView({ kernel, onOpenApp }: Props) {
  const [current, setCurrent] = useState<CtfChallenge | null>(() => kernel.ctf.current());
  const [elapsed, setElapsed] = useState(0);
  const [board, setBoard] = useState<CtfScore[]>(() => kernel.ctf.leaderboard());
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      setElapsed(kernel.ctf.elapsed());
      // ¿Se capturó la bandera del reto activo? → resolver y puntuar.
      if (kernel.ctf.isSolved(kernel.player.capturedFlags())) {
        const s = kernel.ctf.solve();
        if (s) {
          setFlash(`✅ ¡Capturaste ${s.host}! +${s.score} pts (${s.seconds}s)`);
          setBoard(kernel.ctf.leaderboard());
          setCurrent(null);
        }
      }
    };
    const un = kernel.events.subscribe("world.tick", tick);
    const id = setInterval(tick, 1000);
    return () => { un(); clearInterval(id); };
  }, [kernel]);

  const start = (n?: CtfNivel) => {
    setFlash(null);
    const c = kernel.ctf.start(n);
    setCurrent(c);
    setElapsed(0);
    // Deja el objetivo listo para atacar: abre el navegador en el host.
    kernel.navigateBrowser(`http://${c.host}/`);
  };

  const rendir = () => {
    kernel.ctf.abandon();
    setCurrent(null);
  };

  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div style={container}>
      <div style={header}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>🏁 Arena CTF</div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#8b98a5" }}>
          Mejor puntaje: <b style={{ color: "#ffd479" }}>{kernel.ctf.best()}</b>
        </div>
      </div>

      {flash && <div style={flashBox}>{flash}</div>}

      {current ? (
        <div style={card}>
          <div style={{ fontSize: 13, color: "#8b98a5" }}>Objetivo activo · {current.nivel}</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{mmss(elapsed)}</div>
          <div style={{ marginTop: 8 }}>
            <div><b>IP:</b> <code style={code}>{current.ip}</code></div>
            <div><b>Host:</b> <code style={code}>{current.host}</code></div>
            <div style={{ marginTop: 6, color: "#c9d3dd", fontSize: 13 }}>💡 {current.pista}</div>
          </div>
          <div style={{ fontSize: 12, color: "#8b98a5", marginTop: 10 }}>
            Vulneralo y capturá su bandera <code style={code}>ND{"{...}"}</code>. El cronómetro corre.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button style={btnPrimary} onClick={() => onOpenApp?.("browser")}>Abrir Navegador</button>
            <button style={btnGhost} onClick={() => onOpenApp?.("terminal")}>Abrir Terminal</button>
            <button style={btnGhost} onClick={() => onOpenApp?.("asistente")}>🤖 Pedir ayuda</button>
            <button style={btnDanger} onClick={rendir}>Rendirme</button>
          </div>
        </div>
      ) : (
        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Empezá un reto contrarreloj:</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={btnLevel("#7ee2a8")} onClick={() => start("fácil")}>Fácil</button>
            <button style={btnLevel("#ffd479")} onClick={() => start("medio")}>Medio</button>
            <button style={btnLevel("#ff8f8f")} onClick={() => start("difícil")}>Difícil</button>
            <button style={btnLevel("#7cc4ff")} onClick={() => start(undefined)}>Sorpresa</button>
          </div>
          <div style={{ fontSize: 12, color: "#8b98a5", marginTop: 10 }}>
            Puntaje = base del nivel − segundos. ¡Cuanto más rápido, más puntos!
          </div>
        </div>
      )}

      <div style={{ ...card, flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>🏆 Tabla de puntajes</div>
        {board.length === 0 && <div style={{ color: "#8b98a5", fontSize: 13 }}>Todavía no hay puntajes. ¡Jugá un reto!</div>}
        {board.map((s, i) => (
          <div key={i} style={row}>
            <span style={{ width: 22, color: "#8b98a5" }}>{i + 1}.</span>
            <span style={{ flex: 1 }}>{s.host}</span>
            <span style={{ color: "#8b98a5", fontSize: 12 }}>{s.nivel} · {s.seconds}s</span>
            <b style={{ color: "#ffd479", width: 60, textAlign: "right" }}>{s.score}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

const container: CSSProperties = { height: "100%", display: "flex", flexDirection: "column", gap: 10, padding: 12, background: "#0b1016", color: "#e6edf3", fontFamily: "system-ui, sans-serif" };
const header: CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const card: CSSProperties = { background: "#0e141b", border: "1px solid #1b2733", borderRadius: 10, padding: 12 };
const flashBox: CSSProperties = { background: "#16351f", border: "1px solid #2f7d46", borderRadius: 8, padding: "8px 12px", color: "#86efac", fontSize: 14 };
const code: CSSProperties = { background: "#111820", padding: "1px 6px", borderRadius: 4, fontFamily: "ui-monospace, monospace" };
const row: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #131b24", fontSize: 14 };
const btnPrimary: CSSProperties = { background: "#0284c7", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" };
const btnGhost: CSSProperties = { background: "#111820", color: "#e6edf3", border: "1px solid #1b2733", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" };
const btnDanger: CSSProperties = { background: "transparent", color: "#fca5a5", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" };
const btnLevel = (c: string): CSSProperties => ({ background: "#111820", color: c, border: `1px solid ${c}55`, borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" });

export default ArenaView;
