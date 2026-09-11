import { useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import { SPECIALISTS, consult, type Domain } from "../../core/team/Specialists";

interface TeamViewProps {
  kernel: VirtualKernel;
}

const TEMAS: { label: string; q: string; dom: Domain }[] = [
  { label: "🔐 Cripto", q: "crackear un hash o un jwt", dom: "cripto" },
  { label: "🧵 Forense", q: "analizar los logs del incidente", dom: "forense" },
  { label: "💾 Programación", q: "input que entra al código (ssti, deserialización)", dom: "programacion" },
  { label: "🛰️ Redes", q: "pivoting y tráfico de red", dom: "redes" },
  { label: "🐧 Linux", q: "escalar privilegios en linux (suid)", dom: "linux" },
  { label: "🔎 Investigación", q: "por dónde arranco la investigación", dom: "investigacion" },
];

/**
 * ÑANDE Equipo: tus compañeros especialistas. No son la Mani (que te guía en
 * la campaña): son expertos por área a los que consultás. Ojo — a veces
 * discrepan, y esa es la idea: aprendé a contrastar.
 */
function TeamView(_props: TeamViewProps) {
  const [tema, setTema] = useState(TEMAS[0].q);
  const r = consult(tema);

  return (
    <div style={container}>
      <div style={hero}>
        <div style={{ fontSize: 30 }}>🤝</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Tu equipo</div>
          <div style={{ opacity: 0.85, fontSize: 13 }}>
            Seis especialistas. Preguntales — pero no les creas ciegamente.
          </div>
        </div>
      </div>

      <div style={grid}>
        {SPECIALISTS.map((s) => (
          <div key={s.id} style={card}>
            <div style={{ fontSize: 22 }}>{s.emoji}</div>
            <strong>{s.name}</strong>
            <div style={{ fontSize: 11, color: accent, textTransform: "uppercase", letterSpacing: ".05em" }}>{s.domain}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{s.persona}</div>
          </div>
        ))}
      </div>

      <h3 style={sectionTitle}>Consultar al equipo</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {TEMAS.map((t) => (
          <button
            key={t.q}
            onClick={() => setTema(t.q)}
            style={{ ...chip, ...(tema === t.q ? chipActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ ...card, borderLeft: `3px solid ${accent}` }}>
        <div style={{ fontWeight: 700 }}>
          {r.experto.specialist.emoji} {r.experto.specialist.name}
          <span style={conf}>confianza {r.experto.confidence}%</span>
        </div>
        <div style={{ marginTop: 4 }}>{r.experto.text}</div>
      </div>

      <div style={{ ...card, borderLeft: "3px solid #8b98a5", marginTop: 8 }}>
        <div style={{ fontWeight: 700 }}>
          {r.segundaOpinion.specialist.emoji} {r.segundaOpinion.specialist.name} · segunda opinión
          <span style={conf}>confianza {r.segundaOpinion.confidence}%</span>
        </div>
        <div style={{ marginTop: 4, opacity: 0.9 }}>{r.segundaOpinion.text}</div>
        {r.segundaOpinion.defersTo ? (
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            (te deriva a {r.segundaOpinion.defersTo})
          </div>
        ) : null}
      </div>

      <p style={{ fontSize: 12, opacity: 0.6, marginTop: 12 }}>
        Cuando dos expertos no coinciden, no adivines: buscá la evidencia que
        confirme o descarte cada hipótesis. Eso es pensar como analista.
      </p>
    </div>
  );
}

const accent = "#7cc4ff";
const container: CSSProperties = { padding: 16, color: "#e6edf3", overflowY: "auto", height: "100%" };
const hero: CSSProperties = { display: "flex", gap: 12, alignItems: "center", marginBottom: 14 };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 };
const card: CSSProperties = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 12 };
const sectionTitle: CSSProperties = { margin: "18px 0 10px", fontSize: 16 };
const chip: CSSProperties = { padding: "7px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#e6edf3", cursor: "pointer", fontSize: 13 };
const chipActive: CSSProperties = { background: "rgba(124,196,255,0.15)", borderColor: accent, color: accent };
const conf: CSSProperties = { float: "right", fontSize: 11, opacity: 0.7, fontWeight: 400 };

export default TeamView;
