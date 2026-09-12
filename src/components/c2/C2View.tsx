import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import {
  buildBotnet, runTask, C2_TASKS, DETECTION_OPTIONS, checkDetection, detectionRisk,
} from "../../core/game/C2";
import { sound } from "../../core/audio/Sound";

interface C2ViewProps {
  kernel: VirtualKernel;
}

/**
 * Centro de mando (C2) educativo y simulado. Tu botnet son las máquinas que
 * ya comprometiste en el juego. Coordinás bots… y aprendés cómo el Blue Team
 * detecta un C2. Nada operativo: es un panel conceptual dentro del sandbox.
 */
function C2View({ kernel }: C2ViewProps) {
  const solved = kernel.player.getState().solvedLabs;
  const flags = kernel.player.capturedFlags();
  const solvedKey = solved.join();
  const flagsKey = flags.join();
  const bots = useMemo(
    () => buildBotnet(solvedKey ? solvedKey.split(",") : [], flagsKey ? flagsKey.split(",") : []),
    [solvedKey, flagsKey],
  );
  const risk = detectionRisk(bots);

  const [salida, setSalida] = useState<string[]>([]);
  const [quiz, setQuiz] = useState<string>("");

  const ejecutar = (taskId: string) => {
    if (bots.length === 0) return;
    sound.play("click");
    const linea = bots.map((b) => runTask(b, taskId));
    setSalida((prev) => [...linea, ...prev].slice(0, 12));
  };

  const responder = (id: string) => {
    if (checkDetection(id)) {
      kernel.player.recordFlag("ND{c2_deteccion}");
      sound.play("success");
      setQuiz("ok");
    } else {
      setQuiz("no");
    }
  };

  const riskColor = risk.nivel === "alto" ? "#ff7b72" : risk.nivel === "medio" ? "#f5b544" : "#7ee787";

  return (
    <div style={container}>
      <div style={hero}>
        <div style={{ fontSize: 30 }}>📡</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Centro de mando (C2)</div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>
            Simulado y educativo · tu botnet son las máquinas que ya comprometiste
          </div>
        </div>
      </div>

      {bots.length === 0 ? (
        <div style={{ ...card, color: "#8b98a5" }}>
          Todavía no controlás ninguna máquina. Resolvé laboratorios o tomá la
          cuenta de un sitio y acá aparecen como bots.
        </div>
      ) : (
        <>
          <div style={{ ...card, borderLeft: `3px solid ${riskColor}`, marginBottom: 10 }}>
            <b>Riesgo de detección:</b>{" "}
            <span style={{ color: riskColor, textTransform: "uppercase", fontWeight: 700 }}>{risk.nivel}</span>
            <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 3 }}>{risk.nota}</div>
          </div>

          <h3 style={sectionTitle}>Botnet ({bots.length})</h3>
          <div style={{ display: "grid", gap: 6 }}>
            {bots.map((b) => (
              <div key={b.id} style={{ ...card, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <strong>{b.online ? "🟢" : "⚪"} {b.host}</strong>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{b.os} · beacon cada {b.beaconSec}s</div>
                </div>
              </div>
            ))}
          </div>

          <h3 style={sectionTitle}>Ordenar a la botnet</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {C2_TASKS.map((t) => (
              <button key={t.id} onClick={() => ejecutar(t.id)} style={btn}>{t.nombre}</button>
            ))}
          </div>
          {salida.length > 0 && (
            <pre style={consola}>{salida.join("\n")}</pre>
          )}
        </>
      )}

      <h3 style={sectionTitle}>🛡️ ¿Cómo te detecta el Blue Team?</h3>
      <div style={card}>
        <p style={{ marginTop: 0, fontSize: 13, opacity: 0.9 }}>
          Un C2 deja una huella. ¿Cuál es la señal principal que lo delata?
        </p>
        <div style={{ display: "grid", gap: 6 }}>
          {DETECTION_OPTIONS.map((o) => (
            <button key={o.id} onClick={() => responder(o.id)} style={{ ...btn, textAlign: "left" }}>
              {o.texto}
            </button>
          ))}
        </div>
        {quiz === "ok" && (
          <div style={{ marginTop: 10, color: "#7ee787", fontWeight: 600 }}>
            ✓ Correcto: el <b>beaconing</b> (conexiones periódicas y regulares) es la
            firma clásica de un C2. Defensa: detectar el patrón, aleatorizar es evasión.
            Bandera: ND&#123;c2_deteccion&#125;
          </div>
        )}
        {quiz === "no" && (
          <div style={{ marginTop: 10, color: "#ff9b7b" }}>
            No es esa. Pensá qué hace un bot una y otra vez, siempre igual.
          </div>
        )}
      </div>

      <p style={{ fontSize: 11.5, opacity: 0.6, marginTop: 12 }}>
        Todo acá es simulado y ficticio: no hay malware, ni red real, ni canal de
        mando operativo. Es para entender el ataque y, sobre todo, la defensa.
      </p>
    </div>
  );
}

const accent = "#7cc4ff";
const container: CSSProperties = { padding: 16, color: "#e6edf3", overflowY: "auto", height: "100%" };
const hero: CSSProperties = { display: "flex", gap: 12, alignItems: "center", marginBottom: 14 };
const card: CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12 };
const sectionTitle: CSSProperties = { margin: "18px 0 8px", fontSize: 15 };
const btn: CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(124,196,255,0.12)", color: accent, fontWeight: 600, cursor: "pointer", fontSize: 12.5 };
const consola: CSSProperties = { marginTop: 10, padding: 10, background: "#0f1319", borderRadius: 8, color: "#d5dae3", fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto" };

export default C2View;
