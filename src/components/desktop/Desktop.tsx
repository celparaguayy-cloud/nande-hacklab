import { useEffect, useMemo, useRef, useState } from "react";
import WindowManager from "../window/WindowManager";
import Terminal from "../terminal/Terminal";
import { Files } from "../files/Files";
import { ProcessMonitor } from "../processes/ProcessMonitor";
import { Settings } from "../settings/Settings";
import { NetworkManager } from "../network/NetworkManager";
import Browser from "../browser/Browser";
import WorldMonitor from "../world/WorldMonitor";
import WorldMapView from "../map/WorldMapView";
import MarketView from "../market/MarketView";
import MailView from "../mail/MailView";
import ChatView from "../chat/ChatView";
import NotesView from "../notes/NotesView";
import GamesView from "../games/GamesView";
import World2DView from "../world2d/World2DView";
import LearnView from "../learn/LearnView";
import MissionControl from "../mission/MissionControl";
import Boot from "../boot/Boot";
import { VirtualKernel } from "../../core/VirtualKernel";
import { weatherFor } from "../../core/world/Weather";
import { APPS, CATEGORIES, type AppCategory } from "./apps";
import { AppIcon } from "./AppIcon";
import Wallpaper from "./Wallpaper";
import "../../styles/theme.css";
import "../../styles/pixel.css";

/** Nombre de los días y meses del mundo, para el widget del reloj. */
const DAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/** Iconos del clima, dibujados para combinar con el resto del escritorio. */
function WeatherIcon({ sky, size = 44 }: { sky: string; size?: number }) {
  const cloud = (
    <path
      d="M17 30h13a5 5 0 0 0 .6-9.96A8 8 0 0 0 15.2 21 4.6 4.6 0 0 0 17 30z"
      fill="rgba(255,255,255,0.9)"
    />
  );

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      {sky === "despejado" ? (
        <g>
          <circle cx="24" cy="24" r="8.5" fill="#ffd479" />
          <g stroke="#ffd479" strokeWidth="2.4" strokeLinecap="round">
            <path d="M24 8.5v4M24 35.5v4M39.5 24h-4M12.5 24h-4M34.9 13.1l-2.8 2.8M15.9 32.1l-2.8 2.8M34.9 34.9l-2.8-2.8M15.9 15.9l-2.8-2.8" />
          </g>
        </g>
      ) : (
        <g>
          {sky !== "nublado" && (
            <circle cx="30" cy="17" r="6.5" fill="#ffd479" opacity="0.95" />
          )}
          {cloud}
          {sky === "lluvia" && (
            <g stroke="#7cc4ff" strokeWidth="2.2" strokeLinecap="round">
              <path d="M19 34l-1.6 4M25 34l-1.6 4M31 34l-1.6 4" />
            </g>
          )}
          {sky === "tormenta" && (
            <path
              d="M25.5 33l-5 6h4l-2 5.5 7-7.5h-4l2.4-4z"
              fill="#ffd479"
            />
          )}
        </g>
      )}
    </svg>
  );
}

/** Icono de rejilla del botón de aplicaciones, como el de Plasma. */
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <g fill="currentColor">
        {[1, 6.5, 12].map((y) =>
          [1, 6.5, 12].map((x) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" rx="0.8" />
          )),
        )}
      </g>
    </svg>
  );
}

function Desktop() {
  const kernel = useMemo(() => new VirtualKernel(), []);
  const [clock, setClock] = useState(() => kernel.world.getState().clock);
  const [online, setOnline] = useState(() => kernel.world.getState().online);
  const [player, setPlayer] = useState(() => kernel.player.getState());
  const [noto, setNoto] = useState(() => kernel.notoriety.getState());
  const [booted, setBooted] = useState(() => {
    try {
      return localStorage.getItem("nande-booted") === "1";
    } catch {
      return false;
    }
  });
  const [appearance, setAppearance] = useState(() =>
    kernel.appearance.getState(),
  );

  const [launcherOpen, setLauncherOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AppCategory | null>(null);
  const [openWindows, setOpenWindows] = useState<string[]>([]);

  const searchRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);

  // El fondo y el acento se actualizan al tocarlos en Configuración.
  useEffect(() => {
    return kernel.events.subscribe("appearance.changed", () => {
      setAppearance(kernel.appearance.getState());
    });
  }, [kernel]);

  // Unico loop del mundo: lo arranca el escritorio y lo detiene al salir.
  useEffect(() => {
    kernel.start();

    return () => {
      kernel.stop();
    };
  }, [kernel]);

  // La barra observa el mundo por eventos, no con su propio intervalo.
  useEffect(() => {
    return kernel.events.subscribe("world.tick", () => {
      const state = kernel.world.getState();

      setClock(state.clock);
      setOnline(state.online);
    });
  }, [kernel]);

  // El HUD del jugador se refresca cuando gana XP, sube de nivel,
  // desbloquea un logro o completa una misión.
  useEffect(() => {
    const refresh = () => {
      setPlayer(kernel.player.getState());
      setNoto(kernel.notoriety.getState());
    };

    const unsubs = [
      kernel.events.subscribe("player.xp", refresh),
      kernel.events.subscribe("achievement.unlocked", refresh),
      kernel.events.subscribe("mission.completed", refresh),
      kernel.events.subscribe("mission.progress", refresh),
      kernel.events.subscribe("security.alert", refresh),
      kernel.events.subscribe("world.tick", refresh),
      kernel.events.subscribe("lab.solved", refresh),
    ];

    return () => {
      for (const off of unsubs) {
        off();
      }
    };
  }, [kernel]);

  // El lanzador se cierra con Escape o tocando fuera, como el de Plasma.
  useEffect(() => {
    if (!launcherOpen) return;

    searchRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setLauncherOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement;

      if (
        !launcherRef.current?.contains(target) &&
        !target.closest("[data-launcher-toggle]")
      ) {
        setLauncherOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [launcherOpen]);

  const openerRef = useRef<(id: string) => void>(() => {});

  function finishBoot(alias: string) {
    kernel.player.rename(alias);
    setPlayer(kernel.player.getState());
    try {
      localStorage.setItem("nande-booted", "1");
    } catch {
      // Se puede jugar sin persistir.
    }
    setBooted(true);
    // Abre el Centro de Mando con la primera misión.
    setTimeout(() => openerRef.current("mission"), 200);
  }

  function openWindow(id: string) {
    openerRef.current(id);
    setLauncherOpen(false);
    setQuery("");
  }

  // Se memoiza para no recrear las aplicaciones en cada render.
  const apps = useMemo(
    () => ({
      terminal: <Terminal kernel={kernel} />,
      files: <Files kernel={kernel} />,
      processes: <ProcessMonitor kernel={kernel} />,
      settings: <Settings kernel={kernel} />,
      network: <NetworkManager kernel={kernel} />,
      browser: <Browser kernel={kernel} />,
      world: <WorldMonitor kernel={kernel} />,
      map: <WorldMapView kernel={kernel} />,
      market: <MarketView kernel={kernel} />,
      mail: <MailView kernel={kernel} />,
      chat: <ChatView kernel={kernel} />,
      notes: <NotesView kernel={kernel} />,
      games: <GamesView kernel={kernel} />,
      world2d: <World2DView kernel={kernel} onOpenApp={openWindow} />,
      learn: <LearnView kernel={kernel} onOpenApp={openWindow} />,
      mission: <MissionControl kernel={kernel} onOpenApp={openWindow} />,
    }),
    [kernel],
  );

  const time = `${String(clock.hour).padStart(2, "0")}:${String(
    clock.minute,
  ).padStart(2, "0")}`;

  const weather = weatherFor(clock);
  const dayName = DAY_NAMES[clock.day % 7];
  const heatColor =
    noto.heat > 70 ? "var(--nd-danger)" : noto.heat > 35 ? "var(--nd-warn)" : "var(--nd-text-dim)";

  // Filtro del lanzador: la búsqueda gana sobre la categoría elegida,
  // igual que en el menú de Plasma.
  const visibleApps = APPS.filter((app) => {
    const q = query.trim().toLowerCase();

    if (q) {
      return (
        app.name.toLowerCase().includes(q) ||
        app.summary.toLowerCase().includes(q) ||
        app.id.includes(q)
      );
    }

    return category === null || app.category === category;
  });

  const dockApps = APPS.filter((app) => app.dock);

  return (
    <>
    {!booted && <Boot onReady={finishBoot} />}
    <div
      className="nd-root nd-desktop"
      style={
        {
          "--nd-accent": appearance.accent,
          "--nd-accent-soft": `${appearance.accent}28`,
          "--nd-accent-line": `${appearance.accent}80`,
        } as React.CSSProperties
      }
    >
      <Wallpaper wallpaperId={appearance.wallpaperId} />

      {/* ---------------- Panel superior ---------------- */}
      <div className="nd-topbar">
        <button
          data-launcher-toggle
          data-open={launcherOpen}
          className="nd-panel-btn"
          onClick={() => setLauncherOpen((open) => !open)}
          title="Aplicaciones"
        >
          <GridIcon />
          <span className="nd-only-wide">Aplicaciones</span>
        </button>

        <div className="nd-topbar__center">
          <span style={{ color: "var(--nd-text-dim)" }}>
            día {clock.day} · {dayName}
          </span>
          <span style={{ opacity: 0.4 }}>|</span>
          <strong style={{ fontWeight: 600 }}>{time}</strong>
        </div>

        <div className="nd-topbar__right">
          {/* En el teléfono el reloj del centro se apagaría contra la
              bandeja, así que ahí la hora vive acá. */}
          <span className="nd-tray-item nd-only-narrow" title="Hora del mundo">
            <strong style={{ fontWeight: 600, color: "var(--nd-text)" }}>
              {time}
            </strong>
          </span>

          <span className="nd-tray-item" title="Estado de la red virtual">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: online ? "var(--nd-ok)" : "var(--nd-danger)",
              }}
            />
            <span className="nd-only-wide">
              {online ? "en línea" : "sin red"}
            </span>
          </span>

          <span className="nd-tray-sep nd-only-wide" />

          <button
            className="nd-tray-item nd-tray-item--btn"
            onClick={() => openWindow("mission")}
            title="Calor: cuánto te persigue el Blue Team"
          >
            <span style={{ color: heatColor }}>🔥 {Math.round(noto.heat)}</span>
          </button>

          <button
            className="nd-tray-item nd-tray-item--btn nd-only-wide"
            onClick={() => openWindow("mission")}
            title="Tu notoriedad como hacker"
          >
            <span style={{ color: "var(--nd-accent)" }}>★ {noto.notoriety}</span>
          </button>

          <span className="nd-tray-item" title="Tu nivel">
            <span style={{ color: "var(--nd-warn)" }}>Lv.{player.level}</span>
          </span>

          <span className="nd-tray-item" title="Tu billetera">
            <span style={{ color: "var(--nd-ok)" }}>N$ {player.wallet}</span>
          </span>

          <button
            className="nd-tray-item nd-tray-item--btn nd-only-wide"
            onClick={() => openWindow("settings")}
            title="Configuración del sistema"
          >
            {player.name}
          </button>
        </div>
      </div>

      {/* ---------------- Lanzador ---------------- */}
      {launcherOpen && (
        <div className="nd-launcher" ref={launcherRef}>
          <div className="nd-launcher__head">
            <input
              ref={searchRef}
              className="nd-search"
              placeholder="Buscar aplicaciones…"
              value={query}
              spellCheck={false}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && visibleApps[0]) {
                  openWindow(visibleApps[0].id);
                }
              }}
            />
          </div>

          <div className="nd-launcher__body">
            <div className="nd-launcher__apps">
              {visibleApps.map((app) => (
                <button
                  key={app.id}
                  className="nd-app-tile"
                  onClick={() => openWindow(app.id)}
                  title={app.summary}
                >
                  <AppIcon id={app.id} size={44} />
                  <span className="nd-app-tile__label">{app.name}</span>
                </button>
              ))}

              {visibleApps.length === 0 && (
                <p className="nd-empty">No hay aplicaciones para «{query}».</p>
              )}
            </div>

            <div className="nd-launcher__cats">
              <button
                className="nd-cat"
                data-active={category === null}
                onClick={() => {
                  setCategory(null);
                  setQuery("");
                }}
              >
                Todas
              </button>

              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className="nd-cat"
                  data-active={category === cat}
                  onClick={() => {
                    setCategory(cat);
                    setQuery("");
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Widgets del fondo ---------------- */}
      <div className="nd-widgets">
        <div className="nd-widget-clock">{time}</div>
        <div className="nd-widget-date">
          {dayName} · día {clock.day}
        </div>

        <div className="nd-widget-weather">
          <WeatherIcon sky={weather.sky} />
          <div>
            <div className="nd-widget-weather__temp">{weather.temp}°</div>
            <div className="nd-widget-weather__label">
              {weather.sky} · {weather.high}° / {weather.low}°
            </div>
          </div>
        </div>
      </div>

      <WindowManager
        apps={apps}
        openerRef={openerRef}
        onOpenWindowsChange={setOpenWindows}
      />

      {/* ---------------- Dock ---------------- */}
      <div className="nd-dock-wrap">
        <div className="nd-dock">
          {dockApps.map((app) => (
            <button
              key={app.id}
              className="nd-dock-btn"
              data-open={openWindows.includes(app.id)}
              onClick={() => openWindow(app.id)}
              title={`${app.name} — ${app.summary}`}
            >
              <AppIcon id={app.id} size={34} />
            </button>
          ))}

          <span className="nd-dock-sep" />

          <button
            className="nd-dock-btn"
            data-launcher-toggle
            onClick={() => setLauncherOpen((open) => !open)}
            title="Todas las aplicaciones"
          >
            <span style={{ color: "var(--nd-text-dim)" }}>
              <GridIcon />
            </span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

export default Desktop;
