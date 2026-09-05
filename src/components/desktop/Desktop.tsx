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
import { VirtualKernel } from "../../core/VirtualKernel";

const iconStyle = {
  width: "90px",
  height: "90px",
  background: "rgba(20, 27, 35, 0.9)",
  border: "1px solid #34414d",
  borderRadius: "12px",
  color: "#e6edf3",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  fontSize: "13px",
  cursor: "pointer",
};

function Desktop() {
  const kernel = useMemo(() => new VirtualKernel(), []);
  const [clock, setClock] = useState(
    () => kernel.world.getState().clock,
  );
  const [online, setOnline] = useState(
    () => kernel.world.getState().online,
  );
  const [player, setPlayer] = useState(() => kernel.player.getState());
  const [wallpaper, setWallpaper] = useState(() =>
    kernel.appearance.wallpaperCss(),
  );

  // El fondo se actualiza cuando cambia la apariencia en Configuración.
  useEffect(() => {
    return kernel.events.subscribe("appearance.changed", () => {
      setWallpaper(kernel.appearance.wallpaperCss());
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
    const refresh = () => setPlayer(kernel.player.getState());

    const unsubs = [
      kernel.events.subscribe("player.xp", refresh),
      kernel.events.subscribe("achievement.unlocked", refresh),
      kernel.events.subscribe("mission.completed", refresh),
      kernel.events.subscribe("lab.solved", refresh),
    ];

    return () => {
      for (const off of unsubs) {
        off();
      }
    };
  }, [kernel]);

  const formattedTime = `${String(clock.hour).padStart(2, "0")}:${String(
    clock.minute,
  ).padStart(2, "0")}`;

  const openerRef = useRef<(id: string) => void>(() => {});

  function openWindow(id: string) {
    openerRef.current(id);
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
    }),
    [kernel],
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: wallpaper,
        color: "#e6edf3",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          height: "42px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          boxSizing: "border-box",
          background: "rgba(8, 11, 16, 0.92)",
          borderBottom: "1px solid #26313b",
          fontSize: "14px",
        }}
      >
        <strong>ÑANDE OS</strong>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "13px",
          }}
        >
          <span style={{ color: online ? "#7ee2a8" : "#e2857e" }}>
            ● {online ? "ONLINE" : "OFFLINE"}
          </span>

          <span style={{ color: "#8b98a5" }}>
            día {clock.day}
          </span>

          <span>{formattedTime}</span>

          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              paddingLeft: "12px",
              borderLeft: "1px solid #26313b",
            }}
            title="Tu progreso en ÑANDE"
          >
            <span style={{ color: "#ffd479" }}>⭐ Lv.{player.level}</span>
            <span style={{ color: "#7ee2a8" }}>💰 N$ {player.wallet}</span>
            <span style={{ color: "#8b98a5" }}>👤 {player.name}</span>
          </span>
        </div>
      </div>

      <div
        style={{
          padding: "24px",
          display: "flex",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => openWindow("terminal")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            &gt;_
          </div>
          Terminal
        </button>

        <button
          onClick={() => openWindow("files")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            📁
          </div>
          Files
        </button>

        <button
          onClick={() => openWindow("processes")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            📊
          </div>
          Processes
        </button>

        <button
          onClick={() => openWindow("settings")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            ⚙️
          </div>
          Settings
        </button>

        <button
          onClick={() => openWindow("network")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            🌐
          </div>
          Network
        </button>

        
        <button
          onClick={() => openWindow("browser")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            🌍
          </div>
          Browser
        </button>

        <button
          onClick={() => openWindow("world")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            🌎
          </div>
          ÑANDE World
        </button>

        <button
          onClick={() => openWindow("map")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            🗺️
          </div>
          Mapa
        </button>

        <button
          onClick={() => openWindow("market")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            📈
          </div>
          Bolsa
        </button>

        <button
          onClick={() => openWindow("mail")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            ✉️
          </div>
          Mail
        </button>

        <button
          onClick={() => openWindow("chat")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            💬
          </div>
          Chat
        </button>

        <button
          onClick={() => openWindow("notes")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            📝
          </div>
          Notas
        </button>

        <button
          onClick={() => openWindow("games")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            🎮
          </div>
          Juegos
        </button>

        <button
          onClick={() => openWindow("world2d")}
          style={iconStyle}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>
            🌆
          </div>
          Mundo 2D
        </button>
      </div>

      <WindowManager apps={apps} openerRef={openerRef} />
    </div>
  );
}

export default Desktop;
