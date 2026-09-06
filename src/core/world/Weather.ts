import type { WorldClock } from "./VirtualWorld";

/**
 * Clima del mundo de ÑANDE.
 *
 * No guarda estado ni sortea nada: el clima se deriva del reloj del mundo.
 * Así el mismo día a la misma hora da siempre el mismo tiempo, el widget
 * del escritorio no parpadea entre renders, y se puede probar sin mockear
 * el azar.
 */

export type Sky = "despejado" | "nublado" | "lluvia" | "tormenta";

export interface WeatherReading {
  sky: Sky;
  /** Temperatura actual en grados. */
  temp: number;
  /** Máxima y mínima del día. */
  high: number;
  low: number;
}

/** Ciclo de cielos: se repite cada 7 días del mundo. */
const SKY_CYCLE: Sky[] = [
  "despejado",
  "despejado",
  "nublado",
  "lluvia",
  "nublado",
  "despejado",
  "tormenta",
];

/** Cuánto baja la sensación térmica según el cielo. */
const SKY_OFFSET: Record<Sky, number> = {
  despejado: 2,
  nublado: -1,
  lluvia: -4,
  tormenta: -6,
};

/**
 * Temperatura del día: oscila con una onda suave entre días para que no
 * salte de 15° a 30° de un día al otro.
 */
function baseForDay(day: number): number {
  return 22 + Math.round(6 * Math.sin(day / 2.4));
}

/**
 * Curva diaria: mínimo cerca de las 5 de la mañana y máximo cerca de las
 * 3 de la tarde, como un día real.
 */
function hourCurve(hour: number): number {
  return Math.sin(((hour - 9) / 24) * 2 * Math.PI);
}

export function weatherFor(clock: WorldClock): WeatherReading {
  const day = Math.max(1, Math.floor(clock.day));
  const hour = Math.min(23, Math.max(0, Math.floor(clock.hour)));

  const sky = SKY_CYCLE[(day - 1) % SKY_CYCLE.length];
  const base = baseForDay(day) + SKY_OFFSET[sky];

  return {
    sky,
    temp: Math.round(base + 5 * hourCurve(hour)),
    high: Math.round(base + 5),
    low: Math.round(base - 5),
  };
}
