import { beforeEach, describe, expect, it } from "vitest";
import { CtfArena } from "./CtfArena";
import { resetStorage } from "../../test/setup";

describe("CtfArena — modo CTF contrarreloj", () => {
  beforeEach(() => resetStorage());

  it("empieza un reto y cuenta el tiempo", () => {
    let t = 1000;
    const ctf = new CtfArena(() => t);
    const c = ctf.start("fácil");
    expect(c.nivel).toBe("fácil");
    expect(ctf.current()).not.toBeNull();
    t = 6000; // +5s
    expect(ctf.elapsed()).toBe(5);
  });

  it("resolver puntúa (más rápido = más puntos) y guarda en la tabla", () => {
    let t = 0;
    const ctf = new CtfArena(() => t);
    const c = ctf.start("medio"); // base 500
    t = 10_000; // 10s
    const score = ctf.solve()!;
    expect(score.host).toBe(c.host);
    expect(score.seconds).toBe(10);
    expect(score.score).toBe(490); // 500 - 10
    expect(ctf.current()).toBeNull();
    expect(ctf.leaderboard()[0].score).toBe(490);
    expect(ctf.best()).toBe(490);
  });

  it("isSolved detecta la bandera capturada del reto activo", () => {
    const ctf = new CtfArena(() => 0);
    const c = ctf.start("fácil");
    expect(ctf.isSolved([])).toBe(false);
    expect(ctf.isSolved([c.flag])).toBe(true);
  });

  it("la tabla persiste entre instancias (localStorage)", () => {
    let t = 0;
    const a = new CtfArena(() => t);
    a.start("fácil");
    t = 5000;
    a.solve();
    const b = new CtfArena(() => t);
    expect(b.leaderboard().length).toBe(1);
  });

  it("La Mani da pistas en escalera y cada una descuenta puntos", () => {
    let t = 0;
    const ctf = new CtfArena(() => t);
    ctf.start("medio"); // base 500
    const h1 = ctf.hint()!;
    expect(h1.text).toContain("🥜");
    expect(h1.used).toBe(1);
    const h2 = ctf.hint()!;
    expect(h2.text).not.toBe(h1.text); // escalera: siguiente pista
    expect(ctf.hintsUsed()).toBe(2);
    t = 10_000; // 10s
    // 500 - 10s - 2 pistas*60 = 370
    expect(ctf.solve()!.score).toBe(370);
  });

  it("el puntaje nunca baja de 10 aunque tardes mucho", () => {
    let t = 0;
    const ctf = new CtfArena(() => t);
    ctf.start("fácil"); // base 300
    t = 999_000; // muchísimo
    expect(ctf.solve()!.score).toBe(10);
  });
});
