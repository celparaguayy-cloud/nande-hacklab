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

        const c = zoneCenter(z.id);
        ctx.font = `${Math.round(14 * scale)}px system-ui`;
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(`${z.icon}`, c.x * scale, (z.row * CELL + 20) * scale);
        ctx.font = `${Math.round(7 * scale)}px system-ui`;
        ctx.fillText(z.name, c.x * scale, (z.row * CELL + 30) * scale);
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
      <div style={header}>
        <h2 style={{ margin: 0 }}>🌆 ÑANDE World 2D</h2>
        <span style={{ color: "#8b98a5", fontSize: 12 }}>
          Movete con WASD o flechas · tocá a alguien para verlo
        </span>
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
  overflow: "auto",
  boxSizing: "border-box",
  padding: 12,
  background: "#0b0f14",
  color: "#e6edf3",
  fontFamily: "system-ui, sans-serif",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};
const header: CSSProperties = {
  width: "100%",
  marginBottom: 10,
};
const canvasStyle: CSSProperties = {
  width: "min(100%, 600px)",
  aspectRatio: "1 / 1",
  imageRendering: "pixelated",
  border: "1px solid #26313b",
  borderRadius: 8,
  cursor: "crosshair",
  background: "#05070a",
};
const tooltip: CSSProperties = {
  marginTop: 10,
  padding: "8px 12px",
  border: "1px solid #26313b",
  borderRadius: 8,
  background: "#111820",
  display: "flex",
  alignItems: "center",
  gap: 10,
};
const chatBtn: CSSProperties = {
  padding: "4px 10px",
  border: "1px solid #2f5a3f",
  borderRadius: 6,
  background: "#16311f",
  color: "#7ee2a8",
  cursor: "pointer",
};

export default World2DView;
