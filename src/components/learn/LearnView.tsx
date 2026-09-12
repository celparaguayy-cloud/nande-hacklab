import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import { RANKS, rankForLevel } from "../../core/game/Progression";
import { DEFENSES } from "../../core/academy/Defenses";
import { certificationsFor, flagLabel } from "../../core/game/Certifications";
import { buildReport } from "../../core/game/Report";

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
      {tab === "inicio" && (
        <>
          <div style={hero}>
            <div style={{ fontSize: 34 }}>🤖</div>
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
            <Stat icon="⭐" value={`Nv.${player.level}`} label={rank.name} />
            <Stat icon="🎯" value={`${done.size}`} label="completadas" />
            <Stat icon="🔥" value={`${player.achievements.length}`} label="logros" />
          </div>

          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{rank.icon} {rank.name}</strong>
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
                  <div style={{ fontSize: 18 }}>{r.icon}</div>
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
          {lessons.map((l) => (
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

      {tab === "perfil" && (
        <>
          <div style={hero}>
            <div style={{ fontSize: 30 }}>{rank.icon}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{player.name}</div>
              <div style={{ opacity: 0.85, fontSize: 13 }}>
                {rank.name} · Nivel {player.level}
              </div>
            </div>
          </div>
          <div style={statRow}>
            <Stat icon="⭐" value={`${player.xp}`} label="XP total" />
            <Stat icon="💰" value={`N$${player.wallet}`} label="saldo" />
            <Stat icon="🏆" value={`${player.achievements.length}`} label="logros" />
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
                <strong>🏆 {a.title}</strong>
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

      <div style={tabBar}>
        {([
          ["inicio", "🏠", "Inicio"],
          ["rutas", "🚩", "Rutas"],
          ["lecciones", "🖥️", "Lecciones"],
          ["defensa", "🛡️", "Defensa"],
          ["trofeos", "🏆", "Trofeos"],
          ["informe", "📄", "Informe"],
          ["perfil", "👤", "Perfil"],
        ] as [Tab, string, string][]).map(([id, icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              ...tabBtn,
              color: tab === id ? accent : "#8b98a5",
              background: tab === id ? "rgba(124,196,255,0.1)" : "transparent",
            }}
          >
            <div style={{ fontSize: 18 }}>{icon}</div>
            <div style={{ fontSize: 11 }}>{label}</div>
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

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div style={statCard}>
      <div style={{ fontSize: 20 }}>{icon}</div>
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

const accent = "#7cc4ff";

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
  width: "100%", height: "100%", overflow: "auto", boxSizing: "border-box",
  padding: "14px 14px 70px", background: "#0b0f14", color: "#e6edf3",
  fontFamily: "system-ui, sans-serif", position: "relative",
};
const hero: CSSProperties = {
  display: "flex", gap: 12, alignItems: "center", padding: 16, borderRadius: 14,
  background: "linear-gradient(135deg, #2a4d63, #1b2f3e)", marginBottom: 14,
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
  background: "rgba(124,196,255,0.12)", color: "#7cc4ff", whiteSpace: "nowrap",
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
  position: "sticky", bottom: 0, left: 0, right: 0, marginTop: 14,
  display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: 8,
  background: "rgba(11,15,20,0.96)", borderTop: "1px solid #26313b",
};
const tabBtn: CSSProperties = {
  border: "none", borderRadius: 10, padding: "6px", cursor: "pointer",
  display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
};

export default LearnView;
