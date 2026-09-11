import { describe, expect, it } from "vitest";
import { TONES, tensionLevel, sound } from "./Sound";

describe("sonido procedural (tanda 17)", () => {
  it("cada sonido tiene una ficha coherente", () => {
    for (const name of ["key", "success", "alert", "levelup", "click", "error"] as const) {
      const t = TONES[name];
      expect(t.freq).toBeGreaterThan(0);
      expect(t.dur).toBeGreaterThan(0);
      expect(t.gain).toBeGreaterThan(0);
    }
  });

  it("tensionLevel mapea calor 0-100 a 0-1 y se satura", () => {
    expect(tensionLevel(0)).toBe(0);
    expect(tensionLevel(100)).toBe(1);
    expect(tensionLevel(50)).toBeCloseTo(0.5, 2);
    expect(tensionLevel(999)).toBe(1);
    expect(tensionLevel(-10)).toBe(0);
  });

  it("play() no rompe aunque no haya audio, y el mute alterna", () => {
    expect(() => sound.play("key")).not.toThrow(); // sin AudioContext en el test: no-op
    const antes = sound.isMuted();
    const despues = sound.toggleMuted();
    expect(despues).toBe(!antes);
    sound.setMuted(antes); // restaurar
  });
});
