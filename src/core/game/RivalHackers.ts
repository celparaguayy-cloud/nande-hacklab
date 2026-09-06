/**
 * Hackers rivales — la competencia interna de ÑANDE.
 *
 * En vez de multijugador, competís contra bots con "inteligencia": cada
 * uno tiene una habilidad y un ritmo, y va acumulando notoriedad con el
 * paso del tiempo (resuelve sus propios objetivos fuera de cámara). Su
 * progreso es determinista a partir del reloj del mundo, así que el
 * ranking es estable y reproducible, pero se siente vivo: cuando volvés,
 * los rivales avanzaron.
 *
 * El jugador aparece en el mismo ranking con su notoriedad real, así que
 * la tabla mide de verdad cómo vas contra ellos.
 */

export interface Rival {
  id: string;
  alias: string;
  /** 0–100: qué tan bueno es. Define su ritmo de progreso. */
  skill: number;
  /** Colectivo/estilo, para dar sabor. */
  faction: string;
  /** Notoriedad base con la que arrancó. */
  base: number;
}

export const RIVALS: Rival[] = [
  { id: "r1", alias: "0xMbói", skill: 92, faction: "Año'ῖ", base: 40 },
  { id: "r2", alias: "Karucte", skill: 78, faction: "Los Tapé", base: 30 },
  { id: "r3", alias: "yvyra", skill: 85, faction: "Año'ῖ", base: 25 },
  { id: "r4", alias: "PombaGira", skill: 70, faction: "Independiente", base: 20 },
  { id: "r5", alias: "n3ike", skill: 64, faction: "Los Tapé", base: 15 },
  { id: "r6", alias: "añaR00t", skill: 55, faction: "Independiente", base: 10 },
  { id: "r7", alias: "guaimi", skill: 48, faction: "Novatos", base: 6 },
  { id: "r8", alias: "b1t0ra", skill: 40, faction: "Novatos", base: 3 },
];

export interface RankRow {
  alias: string;
  faction: string;
  notoriety: number;
  isPlayer: boolean;
  /** Actividad reciente descrita (lo último que "hizo"). */
  lastMove?: string;
}

const MOVES = [
  "vulneró un panel de admin",
  "publicó un 0-day",
  "crackeó una base de datos",
  "defaceó un sitio corporativo",
  "filtró documentos internos",
  "escaló privilegios en un servidor",
  "rompió un token JWT",
  "encadenó una inyección SQL",
];

/**
 * Notoriedad de un rival en un momento dado del mundo.
 * Crece con el tiempo a un ritmo proporcional a su habilidad, con un poco
 * de variación determinista para que no sea una recta perfecta.
 */
export function rivalNotoriety(rival: Rival, day: number): number {
  const pace = rival.skill / 100; // 0.4 .. 0.92 puntos por día, aprox.
  const wobble = Math.sin((day + rival.skill) / 3) * 3;
  return Math.max(0, Math.round(rival.base + day * pace * 4 + wobble));
}

/** Lo último que "hizo" un rival, derivado del día. */
export function rivalLastMove(rival: Rival, day: number): string {
  const seed = (day * 7 + rival.skill) >>> 0;
  return MOVES[seed % MOVES.length];
}

/**
 * Ranking combinado de rivales + jugador, ordenado por notoriedad.
 */
export function leaderboard(
  playerAlias: string,
  playerNotoriety: number,
  day: number,
): RankRow[] {
  const rows: RankRow[] = RIVALS.map((r) => ({
    alias: r.alias,
    faction: r.faction,
    notoriety: rivalNotoriety(r, day),
    isPlayer: false,
    lastMove: rivalLastMove(r, day),
  }));

  rows.push({
    alias: playerAlias,
    faction: "vos",
    notoriety: playerNotoriety,
    isPlayer: true,
  });

  rows.sort((a, b) => b.notoriety - a.notoriety);

  return rows;
}
