import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import { ZONES } from "../../core/world/WorldMap";
import {
  CELL,
  WORLD_SIZE,
  createAvatars,
  retarget,
  step,
  zoneCenter,
  avatarAt,
} from "../../core/world/PixelWorld";
import type { Avatar } from "../../core/world/PixelWorld";
import { AppIcon } from "../desktop/AppIcon";

interface World2DViewProps {
  kernel: VirtualKernel;
  /** Para abrir otra app del escritorio (ej. el chat). */
  onOpenApp?: (id: string) => void;
}

/** Cuántos habitantes se muestran caminando (una muestra, por rendimiento). */
const SAMPLE = 60;

/** Mundo 2D pixelado: los habitantes caminan por las zonas según su rutina. */
function World2DView({ kernel, onOpenApp }: World2DViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarsRef = useRef<Avatar[]>([]);
  const playerRef = useRef({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
  const keysRef = useRef<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ name: string; profession: string; id: string } | null>(null);

  // Zona actual de una persona según la hora del mundo.
  const zoneOf = (id: string) => {
    const hour = kernel.world.getState().clock.hour;
    return kernel.worldEngine.getPersonLife(id, hour)?.zoneId ?? "residencial";
  };

  // Inicializa los avatares con una muestra de habitantes.
  useEffect(() => {
    const people = kernel.worldEngine.getPeople().slice(0, SAMPLE);
    avatarsRef.current = createAvatars(people, zoneOf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kernel]);

  // Teclado para mover al jugador (WASD / flechas).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(e.key.toLowerCase())) {
        keysRef.current.add(e.key.toLowerCase());
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Bucle de animación y dibujo.
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let retargetAcc = 0;

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      if (time - last < 45) return; // ~22 fps
      const dt = time - last;
      last = time;

      // Mover jugador.
      const k = keysRef.current;
      const sp = 2.4;
      const pl = playerRef.current;
      if (k.has("arrowup") || k.has("w")) pl.y -= sp;
      if (k.has("arrowdown") || k.has("s")) pl.y += sp;
      if (k.has("arrowleft") || k.has("a")) pl.x -= sp;
      if (k.has("arrowright") || k.has("d")) pl.x += sp;
      pl.x = Math.max(4, Math.min(WORLD_SIZE - 4, pl.x));
      pl.y = Math.max(4, Math.min(WORLD_SIZE - 4, pl.y));

      // NPCs.
      retargetAcc += dt;
      if (retargetAcc > 800) {
        retarget(avatarsRef.current, zoneOf);
        retargetAcc = 0;
      }
      step(avatarsRef.current);

      draw();
    };

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = canvas.width / WORLD_SIZE;
      ctx.imageSmoothingEnabled = false;

      // Zonas.
      for (const z of ZONES) {
        ctx.fillStyle = z.color;
        ctx.fillRect(z.col * CELL * scale, z.row * CELL * scale, CELL * scale, CELL * scale);
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.strokeRect(z.col * CELL * scale, z.row * CELL * scale, CELL * scale, CELL * scale);

        // El rótulo va debajo del icono con aire suficiente: con la
        // separación anterior el nombre se dibujaba encima del dibujo.
        const c = zoneCenter(z.id);
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = `${Math.round(13 * scale)}px system-ui`;
        ctx.fillText(`${z.icon}`, c.x * scale, (z.row * CELL + 19) * scale);
        ctx.font = `600 ${Math.round(7 * scale)}px system-ui`;
        ctx.fillText(z.name, c.x * scale, (z.row * CELL + 31) * scale);
      }

      // Avatares (figuritas pixeladas).
      const s = scale;
      for (const a of avatarsRef.current) {
        drawAvatar(ctx, a.x * s, a.y * s, a.color, s);
      }

      // Jugador (con contorno).
      const pl = playerRef.current;
      drawAvatar(ctx, pl.x * s, pl.y * s, "#ffffff", s, true);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kernel]);

  // Click: seleccionar el habitante más cercano.
  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / WORLD_SIZE;
    const x = ((e.clientX - rect.left) * (canvas.width / rect.width)) / scale;
    const y = ((e.clientY - rect.top) * (canvas.height / rect.height)) / scale;
    const a = avatarAt(avatarsRef.current, x, y, 10);
    setSelected(a ? { name: a.name, profession: a.profession, id: a.id } : null);
  };

  const openChat = () => {
    if (!selected) return;
    onOpenApp?.("chat");
  };

  return (
    <div style={container}>
      <div className="nd-app-head" style={header}>
        <span className="nd-app-head__icon">
          <AppIcon id="world2d" size={30} />
        </span>

        <div className="nd-app-head__text">
          <h2>ÑANDE World 2D</h2>
          <span className="nd-app-head__sub">
            Movete con WASD o flechas · tocá a alguien para verlo
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        onClick={onClick}
        style={canvasStyle}
      />

      {selected && (
        <div style={tooltip}>
          <strong>{selected.name}</strong>
          <span style={{ color: "#8b98a5" }}> · {selected.profession}</span>
          <button onClick={openChat} style={chatBtn}>💬 Chatear</button>
        </div>
      )}
    </div>
  );
}

/** Dibuja una figurita pixelada simple (cabeza + cuerpo). */
function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  scale: number,
  outline = false,
) {
  const px = Math.max(1, Math.round(2 * scale));
  if (outline) {
    ctx.fillStyle = "#000";
    ctx.fillRect(x - px * 1.5, y - px * 2.5, px * 3, px * 5);
  }
  // cuerpo
  ctx.fillStyle = color;
  ctx.fillRect(x - px, y - px, px * 2, px * 3);
  // cabeza
  ctx.fillStyle = "#f0d9b5";
  ctx.fillRect(x - px, y - px * 3, px * 2, px * 2);
}

const container: CSSProperties = {
  width: "100%",
  height: "100%",
  // Sin scroll: el lienzo se adapta al alto de la ventana. Antes el mundo
  // medía 600px fijos y quedaba cortado por abajo en cualquier ventana
  // más baja que eso.
  overflow: "hidden",
  boxSizing: "border-box",
  padding: 12,
  background: "var(--nd-surface)",
  color: "var(--nd-text)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};
const header: CSSProperties = {
  width: "100%",
  marginBottom: 0,
};
const canvasStyle: CSSProperties = {
  flex: "1 1 auto",
  minHeight: 0,
  width: "auto",
  maxWidth: "100%",
  aspectRatio: "1 / 1",
  imageRendering: "pixelated",
  border: "1px solid var(--nd-border)",
  borderRadius: "var(--nd-r-md)",
  cursor: "crosshair",
  background: "#05070a",
};
const tooltip: CSSProperties = {
  flexShrink: 0,
  padding: "7px 12px",
  border: "1px solid var(--nd-border)",
  borderRadius: "var(--nd-r-md)",
  background: "var(--nd-surface-2)",
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 13,
};
const chatBtn: CSSProperties = {
  padding: "4px 10px",
  border: "1px solid var(--nd-accent-line)",
  borderRadius: "var(--nd-r-sm)",
  background: "var(--nd-accent-soft)",
  color: "var(--nd-accent)",
  font: "inherit",
  fontSize: 12.5,
  cursor: "pointer",
};

export default World2DView;
