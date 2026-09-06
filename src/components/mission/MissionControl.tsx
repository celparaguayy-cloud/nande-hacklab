import { useEffect, useState } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import { HEAT_BUST } from "../../core/game/Notoriety";
import "./mission.css";

interface Props {
  kernel: VirtualKernel;
  onOpenApp?: (id: string) => void;
}

const ALIGN_LABEL: Record<string, string> = {
  white: "Sombrero blanco",
  grey: "Sombrero gris",
  black: "Sombrero negro",
};

/**
 * Centro de Mando — el corazón "de juego" de ÑANDE.
 *
 * Reúne en una sola pantalla la misión actual de la campaña, tus stats de
 * operador (notoriedad, calor, reputación con las facciones) y las últimas
 * reacciones del mundo a tus hacks. Es el tablero desde el que se juega.
 */
export default function MissionControl({ kernel, onOpenApp }: Props) {
  const [tick, setTick] = useState(0);

  // Se refresca con los eventos del juego.
  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    const unsubs = [
      kernel.events.subscribe("mission.completed", refresh),
      kernel.events.subscribe("mission.progress", refresh),
      kernel.events.subscribe("player.xp", refresh),
      kernel.events.subscribe("security.alert", refresh),
      kernel.events.subscribe("world.news.created", refresh),
      kernel.events.subscribe("economy.tick", refresh),
    ];
    return () => unsubs.forEach((u) => u());
  }, [kernel]);

  void tick;

  const chapter = kernel.campaign.currentChapter();
  const campaign = kernel.campaign.getState();
  const noto = kernel.notoriety.getState();
  const player = kernel.player.getState();
  const news = kernel.news.latest(5);
  const chapters = kernel.campaign.chapters();

  const heatPct = Math.min(100, (noto.heat / HEAT_BUST) * 100);

  return (
    <div className="mc">
      <div className="mc__head">
        <div>
          <h2>Centro de Mando</h2>
          <div className="mc__sub">Operación Génesis · agente {player.name}</div>
        </div>
        <div className="mc__align" data-align={noto.alignment}>
          {ALIGN_LABEL[noto.alignment]}
        </div>
      </div>

      {/* Stats de operador */}
      <div className="mc__stats">
        <Stat label="Nivel" value={`Lv.${player.level}`} />
        <Stat label="Notoriedad" value={String(noto.notoriety)} accent />
        <Stat label="Cartera" value={`N$ ${player.wallet}`} />
        <Stat label="Detecciones" value={String(noto.busts)} />
      </div>

      {/* Medidor de calor */}
      <div className="mc__card">
        <div className="mc__row">
          <strong>Calor</strong>
          <span className={heatPct > 70 ? "mc__danger" : "mc__dim"}>
            {Math.round(noto.heat)} / {HEAT_BUST}
          </span>
        </div>
        <div className="mc__bar">
          <div
            className="mc__bar-fill"
            style={{
              width: `${heatPct}%`,
              background: heatPct > 70 ? "var(--nd-danger)" : "var(--nd-warn)",
            }}
          />
        </div>
        <p className="mc__hint">
          El calor sube cuando hacés ruido y baja solo con el tiempo. Si llega
          al tope, el Blue Team te detecta.
        </p>
      </div>

      {/* Misión actual */}
      {chapter ? (
        <div className="mc__mission">
          <div className="mc__chapter">
            Capítulo {chapter.number} · {chapter.title}
          </div>
          <p className="mc__brief">{chapter.briefing}</p>

          <div className="mc__objectives">
            {chapter.objectives.map((o) => {
              const done = kernel.campaign.isObjectiveDone(o.id);
              return (
                <div key={o.id} className="mc__obj" data-done={done}>
                  <span className="mc__check">{done ? "✓" : "○"}</span>
                  <div>
                    <div className="mc__obj-text">{o.text}</div>
                    {!done && <div className="mc__obj-hint">💡 {o.hint}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mc__actions">
            <button className="nd-btn nd-btn--primary" onClick={() => onOpenApp?.("browser")}>
              Abrir Navegador
            </button>
            <button className="nd-btn" onClick={() => onOpenApp?.("terminal")}>
              Abrir Terminal
            </button>
          </div>
        </div>
      ) : campaign.finished ? (
        <div className="mc__mission mc__done">
          <div className="mc__chapter">🏆 Operación Génesis completada</div>
          <p className="mc__brief">
            Expusiste a Mbarete Bank ante todo ÑANDE. Sos un operador de pleno
            derecho. Nuevas operaciones vendrán en próximas actualizaciones.
          </p>
        </div>
      ) : null}

      {/* Reputación por facción */}
      <div className="mc__card">
        <strong>Reputación</strong>
        <div className="mc__factions">
          <Faction label="Colectivo Año'ῖ" value={noto.reputation.colectivo} />
          <Faction label="Corporaciones" value={noto.reputation.corporacion} />
          <Faction label="Agencias" value={noto.reputation.agencia} />
        </div>
      </div>

      {/* Progreso de capítulos */}
      <div className="mc__card">
        <strong>Campaña</strong>
        <div className="mc__chapters">
          {chapters.map((c, i) => (
            <div
              key={c.id}
              className="mc__chip"
              data-state={
                campaign.finished || i < campaign.current
                  ? "done"
                  : i === campaign.current
                    ? "current"
                    : "locked"
              }
            >
              {c.number}
            </div>
          ))}
        </div>
      </div>

      {/* Reacciones del mundo */}
      <div className="mc__card">
        <strong>El mundo reacciona</strong>
        {news.length === 0 ? (
          <p className="mc__dim">Todavía no hiciste ruido. Hackeá algo.</p>
        ) : (
          <div className="mc__news">
            {news.map((n) => (
              <div key={n.id} className="mc__news-item">
                <span className="mc__news-cat">{n.category}</span>
                {n.headline}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="mc__stat">
      <div className="mc__stat-label">{label}</div>
      <strong className="mc__stat-value" style={accent ? { color: "var(--nd-accent)" } : undefined}>
        {value}
      </strong>
    </div>
  );
}

function Faction({ label, value }: { label: string; value: number }) {
  const tone = value > 0 ? "var(--nd-ok)" : value < 0 ? "var(--nd-danger)" : "var(--nd-text-dim)";
  return (
    <div className="mc__faction">
      <span>{label}</span>
      <span style={{ color: tone }}>{value > 0 ? `+${value}` : value}</span>
    </div>
  );
}
