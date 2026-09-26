import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { Duel } from "./Duel";
import { RIVALS } from "./RivalHackers";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Duel — PvP en vivo contra un bot, dentro del sandbox. Anti-mock: el ritmo del
 * bot es determinista (función pura del tick + skill) y el ganador sale del
 * ESTADO real (banderas del jugador), no de un texto. Si el jugador captura la
 * bandera antes, gana; si se duerme, gana el bot; trabar lo hace retroceder de
 * verdad. Los rivales son los del ranking (una sola fuente de verdad).
 */
describe("Duel — carrera PvP contra un bot", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("el avance del bot es determinista y monótono con el tick", () => {
    const d = new Duel();
    d.start(0);
    const p10 = d.botProgressAt(10);
    const p10b = d.botProgressAt(10);
    expect(p10).toBe(p10b); // reproducible
    expect(d.botProgressAt(5)).toBeLessThanOrEqual(p10);
    expect(d.botProgressAt(0)).toBe(0);
    // Con suficientes ticks, el bot llega a 100.
    expect(d.botProgressAt(1000)).toBe(100);
  });

  it("el rival es una identidad REAL del ranking (una fuente de verdad)", () => {
    const d = new Duel();
    const s = d.start(0);
    const alias = new Set(RIVALS.map((r) => r.alias));
    expect(alias.has(s.rival), `alias inventado: ${s.rival}`).toBe(true);
  });

  it("el jugador GANA capturando la bandera antes que el bot (motor real)", () => {
    term.execute("duel empezar");
    // El jugador corre la entrada real: connect + cat.
    term.execute("connect duelo.corp.nande visitante Duelo2024");
    term.execute("cat /root/flag.txt");
    term.execute("exit");
    expect(kernel.player.capturedFlags()).toContain("ND{duelo_ganado}");
    const out = term.execute("duel");
    expect(out).toContain("GANASTE");
    // El resultado quedó fijado en el estado del duelo.
    expect(kernel.duel.snapshot(kernel.world.getState().clock.tick, kernel.player.capturedFlags()).winner).toBe("vos");
  });

  it("el bot GANA si el jugador no hace nada (el reloj corre)", () => {
    term.execute("duel empezar");
    for (let i = 0; i < 60; i++) kernel.tick(); // dejar correr el mundo
    const out = term.execute("duel");
    expect(out).toContain("Te ganó");
    expect(kernel.player.capturedFlags()).not.toContain("ND{duelo_ganado}");
  });

  it("trabar hace retroceder al bot de verdad", () => {
    const d = new Duel();
    d.start(0);
    const before = d.botProgressAt(15);
    d.disrupt(15, 30);
    const after = d.botProgressAt(15);
    expect(after).toBe(Math.max(0, before - 30));
  });

  it("no se puede trabar si no hay duelo abierto", () => {
    const out = term.execute("duel trabar");
    expect(out).toContain("No hay un duelo abierto");
  });

  it("man duel documenta el comando", () => {
    expect(term.execute("man duel")).toContain("PvP");
  });

  it("el rival CONTRAATACA: rota la credencial y te deja afuera (estado real)", () => {
    kernel.duel.start(0);
    // Avanzá hasta pasar el umbral de rotación de credencial (~45%).
    kernel.duel.advance(11, kernel.player.capturedFlags());
    const cred = kernel.hosts.resolve("duelo.corp.nande")!.creds[0];
    expect(cred.password).not.toBe("Duelo2024"); // la clave conocida ya no sirve
    // Y connect con la clave conocida falla de verdad.
    const fail = term.execute("connect duelo.corp.nande visitante Duelo2024");
    expect(fail).toContain("inválid");
    // Trabar deshace el sabotaje: recuperás la credencial original.
    const r = kernel.duel.disrupt(11);
    expect(r.undone).toContain("la credencial");
    expect(kernel.hosts.resolve("duelo.corp.nande")!.creds[0].password).toBe("Duelo2024");
    expect(term.execute("connect duelo.corp.nande visitante Duelo2024")).toContain("conectado");
  });

  it("el rival FILTRA tu SSH y connect se rechaza; trabar lo reabre", () => {
    kernel.duel.start(0);
    // Avanzá hasta pasar el umbral de bloqueo de SSH (~75%).
    kernel.duel.advance(18, kernel.player.capturedFlags());
    expect(kernel.hosts.resolve("duelo.corp.nande")!.firewall).toContain(22);
    // connect se rechaza por puerto filtrado (no por credenciales).
    const refused = term.execute("connect duelo.corp.nande visitante Duelo2024");
    expect(refused).toContain("filtrado");
    // Trabar reabre el SSH y restaura el acceso.
    const r = kernel.duel.disrupt(18);
    expect(r.undone.some((u) => u.includes("SSH"))).toBe(true);
    expect(kernel.hosts.resolve("duelo.corp.nande")!.firewall).not.toContain(22);
  });

  it("el contraataque es idempotente: cada etapa se ejecuta una sola vez", () => {
    kernel.duel.start(0);
    kernel.duel.advance(11, []);
    const rotada = kernel.hosts.resolve("duelo.corp.nande")!.creds[0].password;
    // Volver a avanzar al mismo punto NO vuelve a rotar (misma etapa).
    kernel.duel.advance(12, []);
    expect(kernel.hosts.resolve("duelo.corp.nande")!.creds[0].password).toBe(rotada);
  });

  it("al terminar el duelo el objetivo queda LIMPIO (sin sabotaje colgado)", () => {
    kernel.duel.start(0);
    kernel.duel.advance(18, []); // dispara sabotaje (cred + SSH)
    // El jugador gana capturando la bandera.
    term.execute("connect duelo.corp.nande visitante Duelo2024"); // falla (filtrado) — recuperamos primero
    kernel.duel.disrupt(18);
    term.execute("connect duelo.corp.nande visitante Duelo2024");
    term.execute("cat /root/flag.txt");
    term.execute("exit");
    kernel.duel.advance(19, kernel.player.capturedFlags());
    const host = kernel.hosts.resolve("duelo.corp.nande")!;
    expect(host.creds[0].password).toBe("Duelo2024");
    expect(host.firewall).not.toContain(22);
  });

  it("si GANA el bot el objetivo también queda limpio, y el próximo duelo no lo brickea", () => {
    const d = new Duel(kernel.hosts);
    const cleanPass = kernel.hosts.resolve("duelo.corp.nande")!.creds[0].password;
    d.start(0);
    d.advance(18, []); // sabotaje: credencial rotada + SSH filtrado
    d.advance(1000, []); // el bot llega a 100 y gana
    expect(d.snapshot(1000, []).winner).not.toBe("vos");
    const host = kernel.hosts.resolve("duelo.corp.nande")!;
    // Tras la derrota, el rival se repliega: nada de sabotaje colgado.
    expect(host.creds[0].password).toBe(cleanPass);
    expect(host.firewall).not.toContain(22);
    // Y arrancar otro duelo NO captura una credencial rotada como "original".
    d.start(2000);
    d.advance(2000, []); // sin llegar al umbral de rotación todavía
    expect(kernel.hosts.resolve("duelo.corp.nande")!.creds[0].password).toBe(cleanPass);
  });
});
