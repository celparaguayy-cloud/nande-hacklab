import { describe, expect, it } from "vitest";
import { weatherFor } from "./Weather";
import type { WorldClock } from "./VirtualWorld";

const clock = (day: number, hour: number): WorldClock => ({
  tick: 0,
  day,
  hour,
  minute: 0,
});

describe("clima del mundo", () => {
  it("es determinista: mismo reloj, mismo clima", () => {
    expect(weatherFor(clock(3, 14))).toEqual(weatherFor(clock(3, 14)));
  });

  it("hace más calor a la tarde que de madrugada", () => {
    expect(weatherFor(clock(1, 15)).temp).toBeGreaterThan(
      weatherFor(clock(1, 5)).temp,
    );
  });

  it("la temperatura queda entre la mínima y la máxima del día", () => {
    for (let day = 1; day <= 14; day += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        const w = weatherFor(clock(day, hour));
        expect(w.temp).toBeGreaterThanOrEqual(w.low);
        expect(w.temp).toBeLessThanOrEqual(w.high);
      }
    }
  });

  it("el cielo cambia con los días y vuelve a repetirse a la semana", () => {
    expect(weatherFor(clock(1, 12)).sky).toBe(weatherFor(clock(8, 12)).sky);
    expect(weatherFor(clock(1, 12)).sky).not.toBe(weatherFor(clock(4, 12)).sky);
  });

  it("tolera relojes fuera de rango sin romperse", () => {
    expect(weatherFor(clock(0, -3)).sky).toBeTruthy();
    expect(Number.isFinite(weatherFor(clock(0, 99)).temp)).toBe(true);
  });
});
