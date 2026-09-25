import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { NetworkLife } from "./NetworkLife";
import { RIVALS } from "../game/RivalHackers";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * NetworkLife — la red interna VIVA (sensación de multijugador dentro del
 * sandbox). Anti-mock: la presencia de cada habitante es una función PURA del
 * reloj del mundo (determinista y reproducible), no texto al azar. Los rivales
 * reusan la identidad real del ranking (una sola fuente de verdad). Si esto se
 * rompe —presencia no determinista, rival inventado, who que no incluye al
 * jugador— el test lo caza.
 */
describe("NetworkLife — la red poblada por otros 'jugadores'", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("la presencia es determinista y reproducible por tick", () => {
    const life = new NetworkLife(() => 0);
    const a = life.sessionsOn("db-core.interna.nande", 42);
    const b = life.sessionsOn("db-core.interna.nande", 42);
    expect(a).toEqual(b); // mismo tick → mismo estado, siempre
  });

  it("el mundo respira: hay habitantes en algunos ticks y en otros no", () => {
    const life = new NetworkLife(() => 0);
    let conAlguien = 0;
    let vacio = 0;
    for (let tk = 0; tk < 200; tk++) {
      const n = life.sessionsOn("db-core.interna.nande", tk).length;
      if (n > 0) conAlguien++;
      else vacio++;
    }
    // No siempre está el mismo (no es estático) ni nunca (no es un adorno muerto).
    expect(conAlguien).toBeGreaterThan(0);
    expect(vacio).toBeGreaterThan(0);
  });

  it("el rival reusa una identidad REAL del ranking (una fuente de verdad)", () => {
    const life = new NetworkLife(() => 0);
    const rival = life.rivalOn("objetivo.corp.nande", 0);
    expect(rival, "debería haber un rival adentro en tick 0").toBeTruthy();
    const alias = new Set(RIVALS.map((r) => r.alias));
    expect(alias.has(rival!.user), `alias inventado: ${rival!.user}`).toBe(true);
  });

  it("who/w dentro de una sesión remota muestra al staff y a tu propia sesión", () => {
    term.execute("connect server.nande soporte Verano2024");
    const out = term.execute("who");
    expect(out).toContain("USUARIO");
    expect(out).toContain("«vos»"); // tu propia sesión aparece
    // Hay staff trabajando en server.nande en el tick 0 (ventana activa).
    expect(out).toContain("10.10.0.15"); // IP del soporte NPC
    // 'w' es alias de 'who'.
    expect(term.execute("w")).toContain("USUARIO");
  });

  it("who avisa cuando OTRO operador (rival) está en la misma máquina", () => {
    // objetivo.corp.nande es público (svc-backup/Backup#2024). En tick 0 el
    // rival está adentro: who lo delata (multijugador real, no estás solo).
    expect(kernel.world.getState().clock.tick).toBe(0);
    term.execute("connect objetivo.corp.nande svc-backup Backup#2024");
    const out = term.execute("who");
    expect(out).toContain("«rival»");
    expect(out).toContain("OTRO operador");
  });

  it("man who documenta el comando", () => {
    const man = term.execute("man who");
    expect(man).toContain("logueado");
  });
});
