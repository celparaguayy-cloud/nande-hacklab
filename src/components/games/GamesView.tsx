import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";

interface GamesViewProps {
  kernel: VirtualKernel;
}

// El azar de los juegos vive en helpers de módulo (no en el cuerpo de un
// componente), para que quede claro que no se llama durante el render.
function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function randomDelay(): number {
  return 1000 + Math.random() * 3000;
}

/** Centro de minijuegos del escritorio. */
function GamesView({ kernel }: GamesViewProps) {
  const [game, setGame] = useState<string | null>(null);

  const games = [
    { id: "guess", name: "🔢 Adiviná el número", desc: "Del 1 al 100." },
    { id: "rps", name: "✊ Piedra, papel o tijera", desc: "Contra la máquina." },
    { id: "reaction", name: "⚡ Reacción", desc: "Tocá cuando cambie." },
  ];

  if (game === "guess") return <GuessGame kernel={kernel} onBack={() => setGame(null)} />;
  if (game === "rps") return <RpsGame onBack={() => setGame(null)} />;
  if (game === "reaction") return <ReactionGame onBack={() => setGame(null)} />;

  return (
    <div style={container}>
      <h2 style={{ marginTop: 0 }}>🎮 Juegos</h2>
      <div style={grid}>
        {games.map((g) => (
          <button key={g.id} onClick={() => setGame(g.id)} style={card}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{g.name}</div>
            <div style={{ color: "#8b98a5", fontSize: 13 }}>{g.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function GuessGame({ kernel, onBack }: { kernel: VirtualKernel; onBack: () => void }) {
  const [secret, setSecret] = useState(() => 1 + randomInt(100));
  const [guess, setGuess] = useState("");
  const [msg, setMsg] = useState("Adiviná un número del 1 al 100.");
  const [tries, setTries] = useState(0);
  const [won, setWon] = useState(false);

  const check = () => {
    const n = Number(guess);
    if (!n) return;
    setTries((t) => t + 1);
    if (n === secret) {
      setMsg(`🎯 ¡Acertaste ${secret} en ${tries + 1} intentos!`);
      setWon(true);
      // Un premio simbólico por ganar.
      kernel.player.earn(20);
    } else {
      setMsg(n < secret ? `${n} es muy bajo. Más alto.` : `${n} es muy alto. Más bajo.`);
    }
    setGuess("");
  };

  const reset = () => {
    setSecret(1 + randomInt(100));
    setTries(0);
    setWon(false);
    setMsg("Adiviná un número del 1 al 100.");
  };

  return (
    <div style={container}>
      <BackBar onBack={onBack} title="Adiviná el número" />
      <p style={{ fontSize: 16 }}>{msg}</p>
      {!won ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && check()}
            style={input}
            placeholder="Tu número"
          />
          <button onClick={check} style={btn}>Probar</button>
        </div>
      ) : (
        <button onClick={reset} style={btn}>Jugar de nuevo (+N$20 ganado)</button>
      )}
    </div>
  );
}

function RpsGame({ onBack }: { onBack: () => void }) {
  const [result, setResult] = useState("Elegí tu jugada.");
  const [score, setScore] = useState({ vos: 0, cpu: 0 });

  const play = (you: string) => {
    const opts = ["piedra", "papel", "tijera"];
    const cpu = opts[randomInt(3)];
    const wins: Record<string, string> = { piedra: "tijera", papel: "piedra", tijera: "papel" };
    let r: string;
    if (you === cpu) r = "empate";
    else if (wins[you] === cpu) {
      r = "¡ganaste!";
      setScore((s) => ({ ...s, vos: s.vos + 1 }));
    } else {
      r = "perdiste";
      setScore((s) => ({ ...s, cpu: s.cpu + 1 }));
    }
    setResult(`Vos: ${you} · Máquina: ${cpu} → ${r}`);
  };

  return (
    <div style={container}>
      <BackBar onBack={onBack} title="Piedra, papel o tijera" />
      <p style={{ fontSize: 16 }}>{result}</p>
      <div style={{ display: "flex", gap: 8 }}>
        {["piedra", "papel", "tijera"].map((o) => (
          <button key={o} onClick={() => play(o)} style={btn}>{o}</button>
        ))}
      </div>
      <p style={{ color: "#8b98a5" }}>Vos {score.vos} — {score.cpu} Máquina</p>
    </div>
  );
}

function ReactionGame({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<"idle" | "waiting" | "go" | "result">("idle");
  const [startAt, setStartAt] = useState(0);
  const [ms, setMs] = useState(0);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    setState("waiting");
    const delay = randomDelay();
    const t = setTimeout(() => {
      setStartAt(Date.now());
      setState("go");
    }, delay);
    setTimer(t);
  };

  const click = () => {
    if (state === "waiting") {
      if (timer) clearTimeout(timer);
      setState("idle");
      setMs(-1); // adelantado
    } else if (state === "go") {
      setMs(Date.now() - startAt);
      setState("result");
    }
  };

  return (
    <div style={container}>
      <BackBar onBack={onBack} title="Reacción" />
      {state === "idle" && (
        <>
          {ms === -1 && <p style={{ color: "#e2857e" }}>¡Muy rápido! Esperá al verde.</p>}
          <button onClick={start} style={btn}>Empezar</button>
        </>
      )}
      {state === "waiting" && (
        <button onClick={click} style={{ ...bigBtn, background: "#5a3f3f" }}>
          Esperá el verde...
        </button>
      )}
      {state === "go" && (
        <button onClick={click} style={{ ...bigBtn, background: "#16311f" }}>
          ¡TOCÁ AHORA!
        </button>
      )}
      {state === "result" && (
        <>
          <p style={{ fontSize: 20 }}>⚡ {ms} ms</p>
          <button onClick={() => setState("idle")} style={btn}>Otra vez</button>
        </>
      )}
    </div>
  );
}

function BackBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <button onClick={onBack} style={btn}>←</button>
      <h2 style={{ margin: 0 }}>{title}</h2>
    </div>
  );
}

const container: CSSProperties = {
  width: "100%",
  height: "100%",
  overflow: "auto",
  boxSizing: "border-box",
  padding: 18,
  background: "#0b0f14",
  color: "#e6edf3",
  fontFamily: "system-ui, sans-serif",
};
const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};
const card: CSSProperties = {
  padding: 18,
  border: "1px solid #26313b",
  borderRadius: 12,
  background: "#111820",
  color: "#e6edf3",
  cursor: "pointer",
  textAlign: "left",
};
const btn: CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #34414d",
  borderRadius: 8,
  background: "#1b2430",
  color: "#e6edf3",
  cursor: "pointer",
};
const bigBtn: CSSProperties = {
  width: "100%",
  padding: "40px 0",
  border: "none",
  borderRadius: 12,
  color: "#e6edf3",
  fontSize: 20,
  cursor: "pointer",
};
const input: CSSProperties = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #34414d",
  background: "#0e151c",
  color: "#e6edf3",
  outline: "none",
};

export default GamesView;
