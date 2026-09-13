import type { ReactNode } from "react";

/**
 * Set de glifos de línea compartido — el MISMO lenguaje visual que los iconos
 * del dock. Reemplaza a los emoji del contenido (estrellas, fuego, rangos,
 * atajos), que chocaban con el resto: mezclar dos sistemas de iconos hacía
 * ver el juego "sin terminar". Todos toman `currentColor`, así heredan el
 * color del contexto (acento, gris, etc.).
 */

export type GlyphName =
  | "star"
  | "target"
  | "flame"
  | "sprout"
  | "book"
  | "search"
  | "mask"
  | "gem"
  | "crown"
  | "eye"
  | "drop"
  | "dice"
  | "code"
  | "wallet"
  | "medal"
  | "bell"
  | "heart"
  | "comment"
  | "trend"
  | "person"
  | "nandu";

/** Glifos rellenos (fill = currentColor). */
const FILLED: Partial<Record<GlyphName, ReactNode>> = {
  star: <path d="M12 3.2l2.5 5.6 6.1.6-4.6 4.1 1.4 6L12 16.9 6.6 19.5l1.4-6L3.4 9.4l6.1-.6z" />,
  flame: (
    <path d="M13 2c.4 2.8-.6 4.6-2 6-1.6 1.6-3 3.2-3 5.6a5 5 0 0 0 10 .2c0-2-.8-3.6-1.9-4.9-.2 1-.8 1.7-1.7 2.1.9-2.9-.2-5.8-1.5-9zM12 21a2.6 2.6 0 0 1-2.6-2.6c0-1.3.8-2.2 1.6-3 .2.9.7 1.4 1.4 1.6-.5-1.7.2-3 .9-4 .8 1 1.9 2 1.9 3.8A2.6 2.6 0 0 1 12 21z" />
  ),
  drop: <path d="M12 3c3.6 4.6 6 7.1 6 10.1a6 6 0 0 1-12 0c0-3 2.4-5.5 6-10.1z" />,
  heart: <path d="M12 20.5l-1.4-1.3C6 15 3.5 12.8 3.5 9.9 3.5 7.7 5.2 6 7.4 6c1.4 0 2.7.7 3.6 1.8l1 1.2 1-1.2C14.9 6.7 16.2 6 17.6 6c2.2 0 3.9 1.7 3.9 3.9 0 2.9-2.5 5.1-7.1 9.3z" />,
};

/** Glifos de trazo (stroke = currentColor). */
const STROKED: Partial<Record<GlyphName, ReactNode>> = {
  target: (
    <>
      <circle cx={12} cy={12} r={8} />
      <circle cx={12} cy={12} r={3.6} />
      <circle cx={12} cy={12} r={0.6} fill="currentColor" stroke="none" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-7.5" />
      <path d="M12 13.5C8.6 13.5 6.4 11.4 6.4 8 9.8 8 12 10.1 12 13.5z" />
      <path d="M12 13.5C12 10.4 14.2 8.3 17.6 8.3 17.6 11.7 15.4 13.5 12 13.5z" />
    </>
  ),
  book: (
    <>
      <path d="M4 6c3-1.2 5.6-1 8 .8 2.4-1.8 5-2 8-.8v11.6c-3-1.2-5.6-1-8 .8-2.4-1.8-5-2-8-.8z" />
      <path d="M12 7.6v11.6" />
    </>
  ),
  search: (
    <>
      <circle cx={10.5} cy={10.5} r={6} />
      <path d="M15 15l4.6 4.6" />
    </>
  ),
  mask: (
    <>
      <path d="M4.6 8.5c4-1.6 10.8-1.6 14.8 0 .5 5-2.2 10-7.4 11.3C6.8 18.5 4.1 13.5 4.6 8.5z" />
      <circle cx={9.6} cy={12} r={1.2} fill="currentColor" stroke="none" />
      <circle cx={14.4} cy={12} r={1.2} fill="currentColor" stroke="none" />
    </>
  ),
  gem: (
    <>
      <path d="M5 5h14l2.6 4.6L12 20 2.4 9.6z" />
      <path d="M9 5l-1.4 4.6M15 5l1.4 4.6M2.4 9.6h19.2" />
    </>
  ),
  crown: (
    <>
      <path d="M4 8.5l3.4 3.6L12 6l4.6 6.1L20 8.5V17H4z" />
      <path d="M4 17h16" />
    </>
  ),
  eye: (
    <>
      <path d="M2.6 12S6 6 12 6s9.4 6 9.4 6-3.4 6-9.4 6-9.4-6-9.4-6z" />
      <circle cx={12} cy={12} r={2.5} />
    </>
  ),
  dice: (
    <>
      <rect x={5} y={5} width={14} height={14} rx={3} />
      <g fill="currentColor" stroke="none">
        <circle cx={9} cy={9} r={1.15} />
        <circle cx={15} cy={9} r={1.15} />
        <circle cx={12} cy={12} r={1.15} />
        <circle cx={9} cy={15} r={1.15} />
        <circle cx={15} cy={15} r={1.15} />
      </g>
    </>
  ),
  code: <path d="M9 7.5l-4.5 4.5 4.5 4.5M15 7.5l4.5 4.5-4.5 4.5" />,
  wallet: (
    <>
      <rect x={3.5} y={6} width={17} height={13} rx={2.4} />
      <path d="M3.5 9.5h17M16.5 12.5h1.2" />
    </>
  ),
  medal: (
    <>
      <path d="M9 3l3 5 3-5" />
      <circle cx={12} cy={15} r={5} />
      <path d="M12 12.6l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2L9.1 14.7l2-.3z" fill="currentColor" stroke="none" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 16.5c1-1 1.5-2.2 1.5-4.5 0-3 1.8-5 4-5s4 2 4 5c0 2.3.5 3.5 1.5 4.5z" />
      <path d="M10.4 19.2a2 2 0 0 0 3.2 0" />
    </>
  ),
  comment: <path d="M4.5 6.5h15a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H12l-4 3v-3H4.5A1.5 1.5 0 0 1 3 15V8a1.5 1.5 0 0 1 1.5-1.5z" />,
  trend: (
    <>
      <path d="M3 16l5.5-5.5 3.5 3.5 8-8" />
      <path d="M15.5 6H20v4.5" />
    </>
  ),
  person: (
    <>
      <circle cx={12} cy={8.5} r={3.4} />
      <path d="M5.5 20c0-3.6 2.9-6.2 6.5-6.2S18.5 16.4 18.5 20" />
    </>
  ),
  nandu: (
    <>
      <ellipse cx={22} cy={31} rx={11} ry={8} />
      <path d="M26 24c-1.2-5 1.8-8.4 4-10.4" />
      <circle cx={31} cy={12} r={3.3} />
      <path d="M34 12l4.2 1.3-4.2 1.3" />
      <circle cx={31.4} cy={11} r={0.9} fill="currentColor" stroke="none" />
      <path d="M19 38v6M25 38v6M16.5 44.5h4M22.5 44.5h4" />
      <path d="M11.5 28c-3.2-1.2-5.4-.2-6.6 2" />
    </>
  ),
};

interface GlyphProps {
  name: GlyphName;
  size?: number;
  /** Trazo del glifo (sólo aplica a los de línea). */
  strokeWidth?: number;
}

/** Un glifo de línea/relleno que hereda el color del texto (currentColor). */
export function Glyph({ name, size = 20, strokeWidth = 1.9 }: GlyphProps) {
  const filled = FILLED[name];
  const isNandu = name === "nandu";
  return (
    <svg
      width={size}
      height={size}
      viewBox={isNandu ? "0 0 48 48" : "0 0 24 24"}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={isNandu ? 2 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden
    >
      {filled ?? STROKED[name]}
    </svg>
  );
}
