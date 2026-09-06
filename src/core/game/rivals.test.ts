import { describe, expect, it } from "vitest";
import { RIVALS, rivalNotoriety, leaderboard } from "./RivalHackers";

describe("hackers rivales (competencia interna)", () => {
  it("los rivales progresan con el tiempo", () => {
    const r = RIVALS[0];
    expect(rivalNotoriety(r, 30)).toBeGreaterThan(rivalNotoriety(r, 2));
  });

  it("un rival con más habilidad progresa más rápido", () => {
    const bueno = RIVALS.find((r) => r.skill === 92)!;
    const novato = RIVALS.find((r) => r.skill === 40)!;
    expect(rivalNotoriety(bueno, 40)).toBeGreaterThan(rivalNotoriety(novato, 40));
  });

  it("el jugador aparece en el ranking y puede escalar", () => {
    const bajo = leaderboard("Yo", 5, 20);
    const alto = leaderboard("Yo", 9999, 20);
    const posBajo = bajo.findIndex((r) => r.isPlayer);
    const posAlto = alto.findIndex((r) => r.isPlayer);
    expect(posAlto).toBeLessThan(posBajo); // más notoriedad = mejor puesto
    expect(posAlto).toBe(0);
  });

  it("es determinista: mismo día, mismo ranking", () => {
    expect(leaderboard("Yo", 50, 15)).toEqual(leaderboard("Yo", 50, 15));
  });
});
