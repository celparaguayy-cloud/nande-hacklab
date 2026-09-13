import type { ReactElement } from "react";
import { APP_BY_ID } from "./apps";

/* ==================================================================
   Iconos
   ------------------------------------------------------------------
   Dibujados a mano en SVG: una pastilla con degradado y un glifo
   blanco encima, al estilo de los temas de icono planos de Plasma.
   Reemplazan a los emoji, que se veían de distinto tamaño en cada
   sistema y no combinaban entre sí.
   ================================================================== */

/** Glifo de cada app, dibujado sobre un lienzo de 48x48. */
const GLYPHS: Record<string, ReactElement> = {
  c2: (
    <g fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round">
      <circle cx={24} cy={24} r={3} fill="#fff" />
      <path d="M18 18a8 8 0 0 0 0 12M30 18a8 8 0 0 1 0 12M14 14a14 14 0 0 0 0 20M34 14a14 14 0 0 1 0 20" />
    </g>
  ),
  company: (
    <g fill="none" stroke="#fff" strokeWidth={2.2} strokeLinejoin="round">
      <rect x={16} y={14} width={16} height={20} rx={1.5} />
      <path d="M20 19h2M26 19h2M20 24h2M26 24h2M20 29h2M26 29h2" />
    </g>
  ),
  team: (
    <g fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={18} cy={19} r={4} />
      <circle cx={30} cy={19} r={4} />
      <path d="M12 32c0-4 3-6 6-6s6 2 6 6" />
      <path d="M24 32c0-4 3-6 6-6s6 2 6 6" />
    </g>
  ),
  pulso: (
    <g fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 24h5l3-7 5 14 3-7h5" />
    </g>
  ),
  mission: (
    <g fill="none" stroke="#fff" strokeWidth={2.4}>
      <circle cx={24} cy={24} r={10} />
      <circle cx={24} cy={24} r={5} />
      <circle cx={24} cy={24} r={1.4} fill="#fff" />
    </g>
  ),
  terminal: (
    <g
      fill="none"
      stroke="#fff"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 19l6 5-6 5" />
      <path d="M26 30h6" />
    </g>
  ),
  files: (
    <g fill="#fff">
      <path
        d="M14 18a2 2 0 0 1 2-2h5.2a2 2 0 0 1 1.5.7l1.4 1.6H32a2 2 0 0 1 2 2v1H14z"
        opacity={0.75}
      />
      <path d="M13.4 23h21.2a1.4 1.4 0 0 1 1.36 1.74l-1.9 7.6A2 2 0 0 1 32.13 34H16.4a2 2 0 0 1-1.94-1.51l-1.9-7.6A1.4 1.4 0 0 1 13.4 23z" />
    </g>
  ),
  browser: (
    <g fill="none" stroke="#fff" strokeWidth={2.2}>
      <circle cx={24} cy={24} r={10.5} />
      <ellipse cx={24} cy={24} rx={4.4} ry={10.5} />
      <path d="M14 20.5h20M14 27.5h20" strokeLinecap="round" />
    </g>
  ),
  mail: (
    <g fill="none" stroke="#fff" strokeWidth={2.3} strokeLinejoin="round">
      <rect x={13} y={17} width={22} height={15} rx={2.6} />
      <path d="M13.8 18.6L24 26l10.2-7.4" strokeLinecap="round" />
    </g>
  ),
  chat: (
    <path
      d="M15 16h18a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H23l-6 4.4V31h-2a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z"
      fill="#fff"
    />
  ),
  network: (
    <g fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round">
      <path d="M13.5 21.5a15 15 0 0 1 21 0" />
      <path d="M17.5 26a9.5 9.5 0 0 1 13 0" />
      <circle cx={24} cy={31} r={2.1} fill="#fff" stroke="none" />
    </g>
  ),
  map: (
    <g fill="#fff">
      <path
        d="M14 18.6l6-2.2v14l-6 2.2a1 1 0 0 1-1.35-.94V19.9a1.4 1.4 0 0 1 .9-1.3z"
        opacity={0.72}
      />
      <path d="M21.4 16.4l5.2 1.9v14l-5.2-1.9z" opacity={0.9} />
      <path d="M28 18.3l6-2.2a1 1 0 0 1 1.35.94v11.96a1.4 1.4 0 0 1-.9 1.3L28 32.4z" />
    </g>
  ),
  world2d: (
    <g fill="#fff">
      <rect x={13} y={22} width={7} height={12} rx={1} opacity={0.72} />
      <rect x={21} y={15} width={7} height={19} rx={1} />
      <rect x={29} y={19} width={6} height={15} rx={1} opacity={0.85} />
    </g>
  ),
  world: (
    <g fill="none" stroke="#fff" strokeWidth={2.3} strokeLinejoin="round">
      <rect x={12.5} y={15} width={23} height={15} rx={2.4} />
      <path d="M20 34h8M24 30v4" strokeLinecap="round" />
      <path d="M17 25l3.6-4 3.2 3 4.2-5.4L31 25" strokeLinecap="round" />
    </g>
  ),
  market: (
    <g fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
      <path d="M13 32l6.5-7 4.5 4 9-11" strokeLinejoin="round" />
      <path d="M28.4 18h4.8v4.8" strokeLinejoin="round" />
    </g>
  ),
  notes: (
    <g fill="none" stroke="#fff" strokeWidth={2.3} strokeLinecap="round">
      <path
        d="M16 14h12.6L34 19.4V32a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2z"
        strokeLinejoin="round"
      />
      <path d="M19 23h10M19 28h7" />
    </g>
  ),
  games: (
    <g fill="#fff">
      <path d="M17.5 19h13a6.5 6.5 0 0 1 6.4 7.7l-.7 3.6A3.1 3.1 0 0 1 31 32c-1.2 0-2-.7-2.8-1.6l-1-1.2h-6.4l-1 1.2c-.8.9-1.6 1.6-2.8 1.6a3.1 3.1 0 0 1-3.1-2.6l-.7-3.7A6.5 6.5 0 0 1 17.5 19z" />
      <g fill="#0f172a">
        <rect x={17.4} y={23.4} width={4.6} height={1.7} rx={0.85} />
        <rect x={18.85} y={21.95} width={1.7} height={4.6} rx={0.85} />
        <circle cx={29.4} cy={23.2} r={1.25} />
        <circle cx={32} cy={25.6} r={1.25} />
      </g>
    </g>
  ),
  processes: (
    <g fill="#fff">
      <rect x={14} y={26} width={4.4} height={8} rx={1.4} opacity={0.72} />
      <rect x={21.8} y={20} width={4.4} height={14} rx={1.4} />
      <rect x={29.6} y={15} width={4.4} height={19} rx={1.4} opacity={0.88} />
    </g>
  ),
  settings: (
    <g fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round">
      <circle cx={24} cy={24} r={4} />
      <path d="M24 13v3.4M24 31.6V35M32.8 19l-2.9 1.7M18.1 27.3L15.2 29M32.8 29l-2.9-1.7M18.1 20.7L15.2 19" />
    </g>
  ),
  learn: (
    <g fill="#fff">
      <path d="M24 14.6l12 5.4-12 5.4-12-5.4z" />
      <path
        d="M17 23.4v5.2c0 2.4 3.2 4.2 7 4.2s7-1.8 7-4.2v-5.2l-7 3.1z"
        opacity={0.85}
      />
      <rect x={35} y={20.4} width={1.8} height={7.4} rx={0.9} opacity={0.85} />
    </g>
  ),
  code: (
    <g fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 18l-6 6 6 6" />
      <path d="M29 18l6 6-6 6" />
      <path d="M26 15l-4 18" />
    </g>
  ),
  observatory: (
    <g fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 30a10.5 10.5 0 0 1 21 0" />
      <path d="M24 30l6.5-5.5" />
      <circle cx={24} cy={30} r={2.1} fill="#fff" stroke="none" />
      <path d="M14 30h1.6M32.4 30H34M18.4 22.4l1.1 1.1M28.5 23.5l1.1-1.1" />
    </g>
  ),
  soc: (
    <g fill="none" stroke="#fff" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 13.5l9 3v6.2c0 6-4 9.6-9 11.3-5-1.7-9-5.3-9-11.3v-6.2z" />
      <path d="M20 23.5l3 3 5.2-6" />
    </g>
  ),
  shark: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 27.5c1.4-7 6-11.2 11.2-12.3-1.5 5.2-1 9.4-4.2 12.3z" fill="#fff" />
      <path
        d="M12 31.5c2.6 0 2.6-2 5.2-2s2.6 2 5.2 2 2.6-2 5.2-2 2.6 2 5.2 2"
        fill="none"
        stroke="#fff"
        strokeWidth={2.4}
      />
    </g>
  ),
  blood: (
    <g stroke="#fff" strokeWidth={2.2} strokeLinecap="round" fill="none">
      <path d="M17 17.5l6.4 6M31 17.5l-6.4 6M24 25v7.2" />
      <g fill="#fff" stroke="none">
        <circle cx={17} cy={16} r={2.7} />
        <circle cx={31} cy={16} r={2.7} />
        <circle cx={24} cy={24} r={2.7} />
        <circle cx={24} cy={33} r={2.7} />
      </g>
    </g>
  ),
  containers: (
    <g fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 13l10 5.5v11L24 35l-10-5.5v-11z" />
      <path d="M14 18.5l10 5.5 10-5.5M24 24v11" />
    </g>
  ),
  reverse: (
    <g fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={18} y={18} width={12} height={12} rx={1.8} />
      <path d="M22 14.5v3.5M26 14.5v3.5M22 30v3.5M26 30v3.5M14.5 22h3.5M14.5 26h3.5M30 22h3.5M30 26h3.5" />
    </g>
  ),
  dfir: (
    <g fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={22} cy={22} r={7} />
      <path d="M27 27l6.5 6.5" />
    </g>
  ),
  anon: (
    <g>
      <path d="M14 18.5c4.5-1.6 15.5-1.6 20 0 .6 5.4-2.2 11.4-10 12.6-7.8-1.2-10.6-7.2-10-12.6z" fill="#fff" />
      <g fill="#0f172a">
        <circle cx={19.6} cy={23.6} r={1.9} />
        <circle cx={28.4} cy={23.6} r={1.9} />
      </g>
    </g>
  ),
  arena: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 14v20" fill="none" stroke="#fff" strokeWidth={2.5} />
      <path d="M18 15h12.5l-3 4 3 4H18z" fill="#fff" stroke="#fff" strokeWidth={1.4} />
    </g>
  ),
  asistente: (
    <g fill="#fff">
      <path d="M23 13.5l2.5 6.8 6.8 2.5-6.8 2.5-2.5 6.8-2.5-6.8-6.8-2.5 6.8-2.5z" />
      <circle cx={32.5} cy={31.5} r={2.1} />
    </g>
  ),
};

interface AppIconProps {
  id: string;
  size?: number;
}

/** Icono de una app. Cae a un glifo genérico si el id es desconocido. */
export function AppIcon({ id, size = 40 }: AppIconProps) {
  const meta = APP_BY_ID[id];
  const from = meta?.from ?? "#94a3b8";
  const to = meta?.to ?? "#475569";
  const gradientId = `nd-icon-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={meta?.name ?? id}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>

      <rect x={2} y={2} width={44} height={44} rx={14} fill={`url(#${gradientId})`} />
      <rect
        x={2}
        y={2}
        width={44}
        height={44}
        rx={14}
        fill="none"
        stroke="rgba(255,255,255,0.22)"
      />

      {GLYPHS[id] ?? (
        <circle cx={24} cy={24} r={7} fill="#fff" opacity={0.9} />
      )}
    </svg>
  );
}
