import { ZONES } from "./WorldMap";

/**
 * Mundo 2D de ÑANDE: la lógica de los avatares.
 *
 * Un diorama vivo estilo juego pixelado: los habitantes se mueven por un
 * mapa de zonas según su rutina (trabajan en su zona de día, socializan a
 * la tarde, etc.). Esta parte es pura y testeable; el dibujo lo hace el
 * componente en un canvas.
 */

/** Tamaño de cada celda de zona en el espacio del mundo. */
export const CELL = 100;
/** Tamaño total del mundo (3x3 celdas). */
export const WORLD_SIZE = CELL * 3;

export interface Avatar {
  id: string;
  name: string;
  profession: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  zoneId: string;
  /** Color del avatar (por profesión). */
  color: string;
}

/** Color por profesión, para distinguir a la gente. */
const PROF_COLOR: Record<string, string> = {
  developer: "#7cc4ff",
  "security-analyst": "#e2857e",
  student: "#7ee2a8",
  teacher: "#c084fc",
  journalist: "#ffd479",
  gamer: "#ff8fd8",
  designer: "#8fffe0",
  merchant: "#e0c08f",
  technician: "#8f9fff",
  entrepreneur: "#ffb08f",
  researcher: "#a0ff8f",
  user: "#b5c0cc",
};

export function professionColor(profession: string): string {
  return PROF_COLOR[profession] ?? "#b5c0cc";
}

/** Centro (x,y) de una zona en el espacio del mundo. */
export function zoneCenter(zoneId: string): { x: number; y: number } {
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  return { x: zone.col * CELL + CELL / 2, y: zone.row * CELL + CELL / 2 };
}

/** Un punto al azar dentro de una zona (con margen para no pegarse al borde). */
function randomInZone(zoneId: string, rnd: () => number): { x: number; y: number } {
  const zone = ZONES.find((z) => z.id === zoneId) ?? ZONES[0];
  const m = 12;
  return {
    x: zone.col * CELL + m + rnd() * (CELL - 2 * m),
    y: zone.row * CELL + m + rnd() * (CELL - 2 * m),
  };
}

export interface PersonLike {
  id: string;
  name: string;
  profession: string;
}

/** Crea los avatares en su zona inicial. */
export function createAvatars(
  people: PersonLike[],
  zoneOf: (id: string) => string,
  rnd: () => number = Math.random,
): Avatar[] {
  return people.map((p) => {
    const zoneId = zoneOf(p.id);
    const pos = randomInZone(zoneId, rnd);
    return {
      id: p.id,
      name: p.name,
      profession: p.profession,
      x: pos.x,
      y: pos.y,
      targetX: pos.x,
      targetY: pos.y,
      zoneId,
      color: professionColor(p.profession),
    };
  });
}

/**
 * Actualiza a dónde va cada avatar según su zona actual (que puede cambiar
 * con la hora del día). Si cambió de zona, elige un destino nuevo ahí.
 */
export function retarget(
  avatars: Avatar[],
  zoneOf: (id: string) => string,
  rnd: () => number = Math.random,
): void {
  for (const a of avatars) {
    const zone = zoneOf(a.id);

    if (zone !== a.zoneId) {
      a.zoneId = zone;
      const pos = randomInZone(zone, rnd);
      a.targetX = pos.x;
      a.targetY = pos.y;
    } else if (Math.hypot(a.targetX - a.x, a.targetY - a.y) < 3) {
      // Ya llegó: se elige un nuevo punto dentro de la misma zona (deambula).
      const pos = randomInZone(zone, rnd);
      a.targetX = pos.x;
      a.targetY = pos.y;
    }
  }
}

/** Avanza a los avatares hacia su destino. speed en unidades por paso. */
export function step(avatars: Avatar[], speed: number = 1.2): void {
  for (const a of avatars) {
    const dx = a.targetX - a.x;
    const dy = a.targetY - a.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= speed) {
      a.x = a.targetX;
      a.y = a.targetY;
    } else {
      a.x += (dx / dist) * speed;
      a.y += (dy / dist) * speed;
    }
  }
}

/** Avatar más cercano a un punto, dentro de un radio. */
export function avatarAt(
  avatars: Avatar[],
  x: number,
  y: number,
  radius: number = 8,
): Avatar | undefined {
  let best: Avatar | undefined;
  let bestDist = radius;

  for (const a of avatars) {
    const d = Math.hypot(a.x - x, a.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }

  return best;
}
