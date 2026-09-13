import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import { RANKS, rankForLevel } from "../../core/game/Progression";
import { DEFENSES } from "../../core/academy/Defenses";
import { certificationsFor, flagLabel } from "../../core/game/Certifications";
import { buildReport } from "../../core/game/Report";
import { Glyph, type GlyphName } from "../ui/Glyph";

/** Cada rango, con su glifo de línea (mismo lenguaje que el dock). */
const RANK_GLYPH: Record<string, GlyphName> = {
  Novato: "sprout",
  Aprendiz: "book",
  Auditor: "search",
  Hacker: "mask",
  Élite: "gem",
  Elite: "gem",
  Leyenda: "crown",
};
function rankGlyph(name: string): GlyphName {
  return RANK_GLYPH[name] ?? "star";
}

interface LearnViewProps {
  kernel: VirtualKernel;
  onOpenApp?: (id: string) => void;
}

type Tab = "inicio" | "rutas" | "lecciones" | "defensa" | "trofeos" | "informe" | "perfil";

/**
 * ÑANDE Learn: la app para aprender hacking, ordenada de lo básico a lo
 * avanzado, con tarjetas, progreso y rangos. Estilo app de cursos.
 */
function LearnView({ kernel, onOpenApp }: LearnViewProps) {
  const [tab, setTab] = useState<Tab>("inicio");
  const [player, setPlayer] = useState(() => kernel.player.getState());

  useEffect(() => {
    const refresh = () => setPlayer(kernel.player.getState());
    const unsubs = [
      kernel.events.subscribe("player.xp", refresh),
      kernel.events.subscribe("achievement.unlocked", refresh),
    ];
    return () => {
      for (const off of unsubs) off();
    };
  }, [kernel]);

  const courses = kernel.academy.all();
  const lessons = kernel.lessons.all();
  const rank = rankForLevel(player.level);
  const done = new Set(player.completedCourses);
  const flags = kernel.player.capturedFlags();
  const certs = certificationsFor(flags);
  const report = buildReport(flags);

  // Practicar una lección: abre la terminal y la arranca.
  const startLesson = (id: string) => {
    onOpenApp?.("terminal");
    kernel.queueCommand(`learn ${id}`);
  };

  return (
    <div style={container}>
      <div style={scrollArea}>
      {tab === "inicio" && (
        <>
          <div style={hero}>
            <div style={mascotBadge}>
              <Glyph name="nandu" size={38} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                ¡Hola, {player.name}!
              </div>
              <div style={{ opacity: 0.85, fontSize: 13 }}>
                Aprendé hacking, lección a lección.
              </div>
            </div>
          </div>

          <div style={statRow}>
            <Stat glyph="star" value={`Nv.${player.level}`} label={rank.name} />
            <Stat glyph="target" value={`${done.size}`} label="completadas" />
            <Stat glyph="medal" value={`${player.achievements.length}`} label="logros" />
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: accent }}><Glyph name={rankGlyph(rank.name)} size={18} /></span>
                {rank.name}
              </strong>
              <span style={{ color: accent }}>
                {player.xp} / {kernel.player.xpToNext() + player.xp} XP
              </span>
            </div>
            <Progress value={player.xp} max={kernel.player.xpToNext() + player.xp} />
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
              Te faltan {kernel.player.xpToNext()} XP para subir de nivel.
            </div>

            <div style={rankLadder}>
              {RANKS.map((r) => (
                <div
                  key={r.name}
                  style={{
                    ...rankChip,
                    background: r.name === rank.name ? accent : "#111820",
                    color: r.name === rank.name ? "#05070a" : "#8b98a5",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 3 }}>
                    <Glyph name={rankGlyph(r.name)} size={19} />
                  </div>
                  <div style={{ fontSize: 10 }}>{r.name}</div>
                  <div style={{ fontSize: 9, opacity: 0.7 }}>Nv{r.minLevel}</div>
                </div>
              ))}
            </div>
          </div>

          <h3 style={sectionTitle}>Empezá acá</h3>
          {lessons.slice(0, 3).map((l) => (
            <LessonCard
              key={l.id}
              title={l.title}
              level={l.level}
              summary={l.summary}
              done={done.has(`lesson:${l.id}`)}
              onStart={() => startLesson(l.id)}
            />
          ))}
        </>
      )}

      {tab === "rutas" && (
        <>
          <h3 style={sectionTitle}>Ruta completa · de cero a experto</h3>
          {courses.map((c) => (
            <div key={c.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong>{c.title}</strong>
                <span style={levelBadge(c.level)}>{c.level}</span>
              </div>
              <p style={{ fontSize: 13, opacity: 0.85, margin: "8px 0" }}>{c.simple}</p>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {c.requires.length ? `Antes: ${c.requires.join(", ")}` : "Sin requisitos"}
                {" · "}{c.topics.slice(0, 4).join(" · ")}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "lecciones" && (
        <>
          <h3 style={sectionTitle}>Lecciones guiadas · practicá haciendo</h3>
          {(["principiante", "intermedio", "avanzado", "experto"] as const).map(
            (nivel) => {
              const delNivel = lessons.filter((l) => l.level === nivel);
              if (delNivel.length === 0) return null;
              const hechas = delNivel.filter((l) => done.has(`lesson:${l.id}`)).length;
              return (
                <div key={nivel} style={{ marginBottom: 14 }}>
                  <div style={levelHeader}>
                    <span style={levelBadge(nivel)}>{nivel}</span>
                    <span style={{ color: "#8b98a5", fontSize: 12 }}>
                      {hechas}/{delNivel.length} completadas
                    </span>
                  </div>
                  {delNivel.map((l) => (
                    <LessonCard
                      key={l.id}
                      title={l.title}
                      level={l.level}
                      summary={l.summary}
                      done={done.has(`lesson:${l.id}`)}
                      onStart={() => startLesson(l.id)}
                    />
                  ))}
                </div>
              );
            },
          )}
        </>
      )}

      {tab === "perfil" && (
        <>
          <div style={hero}>
            <div style={mascotBadge}>
              <span style={{ color: "#e6edf3" }}><Glyph name={rankGlyph(rank.name)} size={26} /></span>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{player.name}</div>
              <div style={{ opacity: 0.85, fontSize: 13 }}>
                {rank.name} · Nivel {player.level}
              </div>
            </div>
          </div>
          <div style={statRow}>
            <Stat glyph="star" value={`${player.xp}`} label="XP total" />
            <Stat glyph="wallet" value={`N$${player.wallet}`} label="saldo" />
            <Stat glyph="medal" value={`${player.achievements.length}`} label="logros" />
          </div>
          <h3 style={sectionTitle}>Habilidades</h3>
          <div style={card}>
            {Object.entries(player.skills).map(([id, xp]) => {
              const lv = Math.floor(Math.sqrt((xp as number) / 50));
              return (
                <div key={id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>{id}</span>
                    <span style={{ color: accent }}>Nv.{lv}</span>
                  </div>
                  <Progress value={(xp as number) % 200} max={200} />
                </div>
              );
            })}
          </div>
          <h3 style={sectionTitle}>Logros</h3>
          {player.achievements.length === 0 ? (
            <div style={{ ...card, color: "#8b98a5" }}>Todavía sin logros. ¡A practicar!</div>
          ) : (
            player.achievements.map((a) => (
              <div key={a.id} style={card}>
                <strong style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <span style={{ color: accent }}><Glyph name="medal" size={17} /></span>
                  {a.title}
                </strong>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{a.description}</div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "defensa" && (
        <>
          <h3 style={sectionTitle}>Defensa · cómo se tapa cada ataque</h3>
          <div style={{ ...card, color: "#8b98a5", fontSize: 13 }}>
            🛡️ Por cada técnica que aprendés a explotar, acá está cómo evitarla.
            Saber atacar sin saber defender es media carrera.
          </div>
          {DEFENSES.map((d) => (
            <div key={d.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <strong>{d.icon} {d.attack}</strong>
                <span style={stdBadge}>{d.standard}</span>
              </div>
              <p style={{ fontSize: 12.5, color: "#ff9b7b", margin: "8px 0 10px" }}>⚠ {d.risk}</p>
              <div style={codeLabel}>✗ Vulnerable</div>
              <pre style={vulnBox}>{d.vulnerable}</pre>
              <div style={codeLabel}>✓ Corregido</div>
              <pre style={fixBox}>{d.fixed}</pre>
              <p style={{ fontSize: 12.5, opacity: 0.9, margin: "10px 0 6px" }}>{d.why}</p>
              <div style={principleBox}>🔑 {d.principle}</div>
            </div>
          ))}
        </>
      )}

      {tab === "trofeos" && (
        <>
          <h3 style={sectionTitle}>Certificaciones · por competencia demostrada</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {certs.map((c) => (
              <div key={c.cert.id} style={{ ...card, opacity: c.earned ? 1 : 0.7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{c.cert.icon} {c.cert.name}</strong>
                  <span style={{ color: c.earned ? "#6ee787" : accent, fontSize: 13 }}>
                    {c.earned ? "✓ obtenida" : `${c.have}/${c.need}`}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, opacity: 0.8, margin: "4px 0 8px" }}>{c.cert.description}</div>
                <Progress value={Math.min(c.have, c.need)} max={c.need} />
              </div>
            ))}
          </div>

          <h3 style={sectionTitle}>Sala de trofeos · lo que ya dominás</h3>
          {flags.length === 0 ? (
            <div style={{ ...card, color: "#8b98a5" }}>
              Todavía sin banderas. Cada técnica que captures aparece acá con su defensa.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {flags.map((f) => {
                const info = flagLabel(f);
                return (
                  <div key={f} style={card}>
                    <strong>🏁 {info.tecnica}</strong>
                    {info.defensa ? (
                      <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 3 }}>
                        🛡️ {info.defensa}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "informe" && (
        <>
          <h3 style={sectionTitle}>Informe de competencia ÑANDE</h3>
          <div style={card}>
            <div style={{ fontSize: 13, opacity: 0.9 }}>{report.resumen}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span style={{ ...sevBadge, background: "rgba(248,113,113,0.15)", color: "#ff7b72" }}>
                {report.porSeveridad["crítica"]} críticos
              </span>
              <span style={{ ...sevBadge, background: "rgba(245,181,68,0.15)", color: "#f5b544" }}>
                {report.porSeveridad["alta"]} altos
              </span>
              <span style={{ ...sevBadge, background: "rgba(124,196,255,0.15)", color: "#7cc4ff" }}>
                {report.porSeveridad["media"]} medios
              </span>
            </div>
            <div style={{ marginTop: 10, fontWeight: 600, color: accent }}>{report.competencia}</div>
          </div>

          {report.findings.length > 0 ? (
            <>
              <h3 style={sectionTitle}>Hallazgos</h3>
              <div style={{ display: "grid", gap: 8 }}>
                {report.findings.map((f) => {
                  const c = f.severidad === "crítica" ? "#ff7b72" : f.severidad === "alta" ? "#f5b544" : "#7cc4ff";
                  return (
                    <div key={f.flag} style={{ ...card, borderLeft: `3px solid ${c}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong>{f.tecnica}</strong>
                        <span style={{ color: c, fontSize: 12, textTransform: "uppercase" }}>{f.severidad}</span>
                      </div>
                      <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4 }}>🛡️ {f.remediacion}</div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ ...card, color: "#8b98a5" }}>
              Capturá banderas en los laboratorios y acá se arma tu informe, con
              cada hallazgo, su severidad y su remediación.
            </div>
          )}
        </>
      )}
      </div>

      <div style={tabBar}>
        {([
          ["inicio", "Inicio"],
          ["rutas", "Rutas"],
          ["lecciones", "Lecciones"],
          ["defensa", "Defensa"],
          ["trofeos", "Trofeos"],
          ["informe", "Informe"],
          ["perfil", "Perfil"],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              ...tabBtn,
              color: tab === id ? accent : "#8b98a5",
              background: tab === id ? accentSoft : "transparent",
            }}
          >
            <NavGlyph id={id} />
            <div style={{ fontSize: 10 }}>{label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LessonCard({
  title, level, summary, done, onStart,
}: {
  title: string; level: string; summary: string; done: boolean; onStart: () => void;
}) {
  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <strong>{title}</strong>
        <span style={levelBadge(level)}>{level}</span>
      </div>
      <p style={{ fontSize: 13, opacity: 0.85, margin: "8px 0" }}>{summary}</p>
      <button onClick={onStart} style={startBtn}>
        {done ? "✅ Repasar" : "▶ Empezar"}
      </button>
    </div>
  );
}

function Stat({ glyph, value, label }: { glyph: GlyphName; value: string; label: string }) {
  return (
    <div style={statCard}>
      <div style={{ color: accent }}>
        <Glyph name={glyph} size={22} />
      </div>
      <strong style={{ fontSize: 16 }}>{value}</strong>
      <div style={{ fontSize: 11, opacity: 0.75 }}>{label}</div>
    </div>
  );
}

function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ height: 8, borderRadius: 6, background: "#0e151c", overflow: "hidden", marginTop: 6 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: accent }} />
    </div>
  );
}

const accent = "#3daee9";
const accentSoft = "rgba(61,174,233,0.14)";

/** Glifos de línea de la barra de navegación, al mismo estilo que el dock
 *  (nada de emoji): toman el color del tab (acento si está activo). */
const NAV_GLYPHS: Record<Tab, ReactNode> = {
  inicio: <path d="M4 11l8-6 8 6M6.5 9.5V19h11V9.5M10 19v-5h4v5" />,
  rutas: <path d="M6 21V4M6 5h11l-2.4 3.5L17 12H6" />,
  lecciones: <path d="M12 6.5C10.5 5.2 8 4.8 5 5v12c3-.2 5.5.2 7 1.5 1.5-1.3 4-1.7 7-1.5V5c-3-.2-5.5.2-7 1.5zM12 6.5V18" />,
  defensa: <path d="M12 3l7 3v5c0 4.2-3 7.3-7 8-4-.7-7-3.8-7-8V6z" />,
  trofeos: <path d="M8 4h8v4.5a4 4 0 0 1-8 0zM8 5.5H5.5V7a3 3 0 0 0 3 3M16 5.5h2.5V7a3 3 0 0 1-3 3M10 20h4M9.5 20l.5-3h4l.5 3" />,
  informe: <path d="M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h5M9.5 16h5" />,
  perfil: (
    <>
      <circle cx={12} cy={8} r={3.2} />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </>
  ),
};

function NavGlyph({ id }: { id: Tab }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block" }}
      aria-hidden
    >
      {NAV_GLYPHS[id]}
    </svg>
  );
}

const levelHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 2px 8px",
  borderBottom: "1px solid #1b2733",
  marginBottom: 8,
};

function levelBadge(level: string): CSSProperties {
  const c: Record<string, string> = {
    principiante: "#7ee2a8", intermedio: "#7cc4ff", avanzado: "#ffd479", experto: "#ff8f8f",
  };
  return {
    fontSize: 11, padding: "2px 8px", borderRadius: 10,
    background: "#111820", color: c[level] ?? "#8b98a5", whiteSpace: "nowrap", height: "fit-content",
  };
}

const container: CSSProperties = {
  width: "100%", height: "100%", boxSizing: "border-box",
  display: "flex", flexDirection: "column", overflow: "hidden",
  background: "#0b0f14", color: "#e6edf3",
  fontFamily: "system-ui, sans-serif", position: "relative",
};
const scrollArea: CSSProperties = {
  flex: 1, minHeight: 0, overflowY: "auto", boxSizing: "border-box",
  padding: "14px 14px 16px",
};
const hero: CSSProperties = {
  display: "flex", gap: 12, alignItems: "center", padding: 16, borderRadius: 14,
  background: "linear-gradient(135deg, #2a4d63, #1b2f3e)", marginBottom: 14,
};
const mascotBadge: CSSProperties = {
  flexShrink: 0, width: 52, height: 52, borderRadius: 14,
  display: "flex", alignItems: "center", justifyContent: "center",
  background: "rgba(61,174,233,0.16)", border: "1px solid rgba(61,174,233,0.3)",
  color: "#7fd4ff",
};
const statRow: CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14,
};
const statCard: CSSProperties = {
  padding: 12, borderRadius: 12, background: "#111820", border: "1px solid #26313b",
  textAlign: "center", display: "flex", flexDirection: "column", gap: 2, alignItems: "center",
};
const card: CSSProperties = {
  padding: 14, borderRadius: 12, background: "#111820", border: "1px solid #26313b", marginBottom: 12,
};
const sectionTitle: CSSProperties = { margin: "18px 0 10px", fontSize: 16 };
const sevBadge: CSSProperties = { fontSize: 11.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999 };
const stdBadge: CSSProperties = {
  fontSize: 10.5, padding: "3px 7px", borderRadius: 6,
  background: "rgba(61,174,233,0.12)", color: "#3daee9", whiteSpace: "nowrap",
};
const codeLabel: CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
  margin: "6px 0 3px", opacity: 0.85,
};
const codeBase: CSSProperties = {
  margin: 0, padding: "9px 11px", borderRadius: 8, fontSize: 11.5,
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  whiteSpace: "pre", overflowX: "auto", lineHeight: 1.6,
  border: "1px solid rgba(255,255,255,0.06)",
};
const vulnBox: CSSProperties = {
  ...codeBase, background: "rgba(248,113,113,0.09)", color: "#ffb4a8",
};
const fixBox: CSSProperties = {
  ...codeBase, background: "rgba(110,231,135,0.09)", color: "#8ff0a6",
};
const principleBox: CSSProperties = {
  fontSize: 12.5, fontWeight: 600, padding: "8px 10px", borderRadius: 8,
  background: "rgba(245,181,68,0.1)", color: "#f5c15a",
  borderLeft: "3px solid #f5b544",
};
const startBtn: CSSProperties = {
  width: "100%", padding: "10px", borderRadius: 10, border: "none",
  background: accent, color: "#05070a", fontWeight: 700, cursor: "pointer", fontSize: 14,
};
const rankLadder: CSSProperties = {
  display: "flex", gap: 6, marginTop: 12, overflowX: "auto",
};
const rankChip: CSSProperties = {
  minWidth: 54, padding: "8px 4px", borderRadius: 10, textAlign: "center",
  border: "1px solid #26313b",
};
const tabBar: CSSProperties = {
  flexShrink: 0,
  display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 4,
  padding: "8px 6px",
  background: "#0b0f14", borderTop: "1px solid #26313b",
  boxShadow: "0 -10px 22px rgba(11,15,20,0.55)",
};
const tabBtn: CSSProperties = {
  border: "none", borderRadius: 10, padding: "7px 3px", cursor: "pointer",
  flex: "1 1 auto", minWidth: 44, maxWidth: 132,
  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
};

export default LearnView;
