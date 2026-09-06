/**
 * Fondo de pantalla del escritorio.
 *
 * Es un paisaje dibujado en SVG, no una foto: ÑANDE tiene que funcionar
 * sin red (el test de aislamiento lo exige) y entrar en el APK sin sumar
 * megabytes. Cada preset de Appearance define su paleta.
 */

interface Palette {
  skyTop: string;
  skyBottom: string;
  sun: string;
  sunGlow: string;
  far: string;
  mid: string;
  near: string;
  waterTop: string;
  waterBottom: string;
}

const PALETTES: Record<string, Palette> = {
  nande: {
    skyTop: "#0b1c2c",
    skyBottom: "#2b6d8f",
    sun: "#ffd9a0",
    sunGlow: "#ffb46b",
    far: "#33627d",
    mid: "#20455c",
    near: "#122938",
    waterTop: "#1c5573",
    waterBottom: "#08151f",
  },
  matrix: {
    skyTop: "#01120a",
    skyBottom: "#0c5233",
    sun: "#b7ffcf",
    sunGlow: "#3ddc84",
    far: "#146b45",
    mid: "#0d4630",
    near: "#062418",
    waterTop: "#0c5238",
    waterBottom: "#020c07",
  },
  cyber: {
    skyTop: "#1a0733",
    skyBottom: "#7b2b8f",
    sun: "#ffd6f5",
    sunGlow: "#ff5fd2",
    far: "#5b2a7a",
    mid: "#3a1c57",
    near: "#1d0f30",
    waterTop: "#4a2270",
    waterBottom: "#0b0518",
  },
  sunset: {
    skyTop: "#2a1030",
    skyBottom: "#e0713f",
    sun: "#fff0c4",
    sunGlow: "#ff9448",
    far: "#8a4a4a",
    mid: "#57303c",
    near: "#2a1822",
    waterTop: "#a4543c",
    waterBottom: "#170a10",
  },
  ocean: {
    skyTop: "#02121c",
    skyBottom: "#1d7a94",
    sun: "#d6fbff",
    sunGlow: "#5fd6e8",
    far: "#1f6d85",
    mid: "#134a5e",
    near: "#07222e",
    waterTop: "#12617a",
    waterBottom: "#020c12",
  },
};

/** Línea del horizonte dentro del lienzo de 1600x900. */
const HORIZON = 545;

/**
 * Silueta de una cadena de montañas.
 *
 * Los puntos son fijos a propósito: un fondo que cambia de forma en cada
 * render se nota como parpadeo al abrir una ventana.
 */
function ridge(points: number[][], baseline: number): string {
  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  return `M-40,${baseline} L${line} L1640,${baseline} Z`;
}

const FAR = ridge(
  [
    [-40, 470],
    [130, 388],
    [268, 442],
    [402, 350],
    [560, 430],
    [700, 372],
    [858, 438],
    [1010, 366],
    [1168, 434],
    [1320, 380],
    [1470, 440],
    [1640, 396],
  ],
  HORIZON,
);

const MID = ridge(
  [
    [-40, 512],
    [96, 428],
    [214, 470],
    [352, 396],
    [498, 462],
    [640, 410],
    [792, 476],
    [944, 404],
    [1096, 468],
    [1252, 418],
    [1418, 480],
    [1640, 430],
  ],
  HORIZON,
);

const NEAR = ridge(
  [
    [-40, 544],
    [70, 486],
    [190, 520],
    [330, 452],
    [452, 508],
    [596, 466],
    [744, 524],
    [900, 470],
    [1046, 516],
    [1210, 462],
    [1372, 520],
    [1520, 484],
    [1640, 530],
  ],
  HORIZON,
);

interface WallpaperProps {
  wallpaperId: string;
}

export default function Wallpaper({ wallpaperId }: WallpaperProps) {
  const p = PALETTES[wallpaperId] ?? PALETTES.nande;

  return (
    <svg
      className="nd-wallpaper"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="nd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="1" stopColor={p.skyBottom} />
        </linearGradient>

        <linearGradient id="nd-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.waterTop} />
          <stop offset="1" stopColor={p.waterBottom} />
        </linearGradient>

        <radialGradient id="nd-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={p.sunGlow} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.sunGlow} stopOpacity="0" />
        </radialGradient>

        {/* El reflejo se desvanece hacia abajo, como en el agua real. */}
        <linearGradient id="nd-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        <mask id="nd-reflection-mask">
          <rect x="0" y={HORIZON} width="1600" height={900 - HORIZON} fill="url(#nd-fade)" />
        </mask>

        <linearGradient id="nd-sunpath" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sun} stopOpacity="0.11" />
          <stop offset="1" stopColor={p.sun} stopOpacity="0" />
        </linearGradient>

        {/* Oscurecido en los bordes: da profundidad y hace legible el reloj. */}
        <radialGradient id="nd-vignette" cx="0.5" cy="0.46" r="0.78">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>

      <rect width="1600" height={HORIZON} fill="url(#nd-sky)" />
      <circle cx="1180" cy="300" r="300" fill="url(#nd-glow)" />
      <circle cx="1180" cy="300" r="40" fill={p.sun} opacity="0.92" />

      <path d={FAR} fill={p.far} opacity="0.72" />
      <path d={MID} fill={p.mid} opacity="0.88" />
      <path d={NEAR} fill={p.near} />

      <rect y={HORIZON} width="1600" height={900 - HORIZON} fill="url(#nd-water)" />

      {/* Reflejo: la misma silueta espejada bajo el horizonte. */}
      <g mask="url(#nd-reflection-mask)" transform={`translate(0 ${HORIZON * 2}) scale(1 -1)`}>
        <path d={FAR} fill={p.far} opacity="0.5" />
        <path d={MID} fill={p.mid} opacity="0.6" />
        <path d={NEAR} fill={p.near} opacity="0.7" />
        <circle cx="1180" cy="300" r="40" fill={p.sun} opacity="0.5" />
      </g>

      {/* Camino de luz del sol sobre el agua: un triángulo que se abre
          hacia abajo y se desvanece, como el reflejo real. */}
      <path
        d={`M1180,${HORIZON} L1520,900 L840,900 Z`}
        fill="url(#nd-sunpath)"
      />

      <rect width="1600" height="900" fill="url(#nd-vignette)" />
    </svg>
  );
}
