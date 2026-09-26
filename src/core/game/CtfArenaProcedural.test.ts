import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { ARCHETYPE_NIVEL, type Archetype } from "./CtfForge";
import { md5 } from "../crypto/hash";
import { WORDLIST } from "../crypto/cracker";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * La Arena CTF usa el motor procedural real: un reto "sorpresa" es un host de
 * verdad, nmap-visible, con bandera capturable por el mismo camino que
 * cualquier otro. Nada scripteado (contrato §4/§5/§11/§20).
 */
describe("Arena CTF — retos procedurales inyectados desde el motor", () => {
  let kernel: VirtualKernel;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("el kernel conecta el proveedor procedural a la Arena", () => {
    expect(kernel.ctf.hasProcedural()).toBe(true);
  });

  it("un reto procedural es un host real, nmap-visible y navegable", () => {
    const c = kernel.ctf.startProcedural("fácil");
    expect(c.procedural).toBe(true);
    expect(c.nivel).toBe("fácil");
    expect(kernel.hosts.has(c.host)).toBe(true);
    expect(kernel.browser.isWebApp(c.host)).toBe(true);
    // nmap lo ve (registrado en el runtime de hosts).
    expect(kernel.dns.resolve(c.host)).toBe(c.ip);
  });

  it("no pisa el reto del terminal `retos` (viven en paralelo)", () => {
    const term1 = kernel.ctfForge.generate(123);
    kernel.ctf.startProcedural("medio");
    // El reto del terminal sigue siendo el mismo.
    expect(kernel.ctfForge.current()!.hostname).toBe(term1.hostname);
    expect(kernel.browser.isWebApp(term1.hostname)).toBe(true);
  });

  it("resolver el reto por la ruta secreta captura la bandera y puntúa", () => {
    const c = kernel.ctf.startProcedural("fácil");
    const gen = kernel.ctfForge.current(); // ojo: la arena usa su propio slot
    void gen;
    expect(kernel.ctf.isSolved(kernel.player.capturedFlags())).toBe(false);

    // Accedemos al recurso real por la ruta secreta del reto activo.
    // (secretPath no está en CtfChallenge; lo reconstruimos por arquetipo vía curl real.)
    solveViaBrowser(kernel, c.host, c.archetype as Archetype);

    expect(kernel.player.capturedFlags()).toContain(c.flag);
    expect(kernel.ctf.isSolved(kernel.player.capturedFlags())).toBe(true);
    const score = kernel.ctf.solve();
    expect(score).not.toBeNull();
    expect(score!.procedural).toBe(true);
    expect(score!.score).toBeGreaterThan(0);
  });

  it("cada arquetipo procedural tiene una ruta real que entrega la bandera", () => {
    const seen = new Set<Archetype>();
    // Generamos muchos hasta cubrir todos los arquetipos (determinista).
    for (let i = 0; i < 200 && seen.size < 6; i += 1) {
      const gen = kernel.ctfForge.spawnForArena(i * 7 + 1);
      if (seen.has(gen.archetype)) continue;
      seen.add(gen.archetype);
      // La ruta secreta SIEMPRE devuelve la bandera.
      const [path, query] = gen.secretPath.split("?");
      const { response } = kernel.browser.request("GET", gen.hostname, path + (query ? "?" + query : ""));
      expect(response.body, `${gen.archetype} ${gen.secretPath}`).toContain(gen.flag);
      expect(ARCHETYPE_NIVEL[gen.archetype]).toBeTruthy();
    }
    expect(seen.size).toBe(6);
  });

  it("arquetipo hash: la clave real está en el diccionario y su md5 coincide", () => {
    // Buscamos un reto hash determinista.
    let host = "";
    let flag = "";
    let shown = "";
    for (let i = 0; i < 500; i += 1) {
      const gen = kernel.ctfForge.spawnForArena(i * 13 + 3);
      if (gen.archetype === "hash") {
        host = gen.hostname;
        flag = gen.flag;
        // La página filtra el md5.
        const home = kernel.browser.request("GET", host, "/").response.body;
        shown = home.match(/md5 = ([0-9a-f]+)/)?.[1] ?? "";
        break;
      }
    }
    expect(shown).toMatch(/^[0-9a-f]{32}$/);
    // Crackeamos con el MISMO diccionario y md5 reales del juego.
    const word = WORDLIST.find((w) => md5(w) === shown);
    expect(word, "la clave debe estar en el diccionario").toBeTruthy();
    // Login con la clave crackeada entrega la bandera.
    const res = kernel.browser.request("GET", host, `/login?pass=${word}`).response.body;
    expect(res).toContain(flag);
  });

  it("racha: el segundo reto seguido suma bonus; rendirse la corta", () => {
    let t = 0;
    // Reemplazamos el reloj no es trivial acá; usamos solve inmediato (0s).
    // Primer reto: sin bonus.
    kernel.ctf.startProcedural("fácil");
    const s1 = forceSolve(kernel);
    expect(s1.streakBonus).toBe(0);
    // Segundo reto seguido: bonus de racha.
    kernel.ctf.startProcedural("fácil");
    const s2 = forceSolve(kernel);
    expect(s2.streakBonus).toBe(20);
    // Rendirse corta la racha.
    kernel.ctf.startProcedural("fácil");
    kernel.ctf.abandon();
    expect(kernel.ctf.currentStreak()).toBe(0);
    void t;
  });
});

/** Resuelve el reto activo capturando su bandera vía el recurso real. */
function solveViaBrowser(kernel: VirtualKernel, host: string, archetype: Archetype): void {
  // Reconstruimos el camino de solución por arquetipo, todo con curl real.
  const get = (p: string) => kernel.browser.request("GET", host, p).response.body;
  switch (archetype) {
    case "robots": {
      const robots = get("/robots.txt");
      const path = robots.match(/Disallow: (\/\S+)/)?.[1] ?? "/";
      kernel.scanForSignals(get(path));
      break;
    }
    case "backup": {
      const bak = get("/backup.txt");
      const path = bak.match(/PANEL_INTERNO=(\/\S+)/)?.[1] ?? "/";
      kernel.scanForSignals(get(path));
      break;
    }
    case "apiv1":
      kernel.scanForSignals(get("/api/v1/flag"));
      break;
    case "env":
      kernel.scanForSignals(get("/.env"));
      break;
    case "idor": {
      for (let id = 2; id <= 9; id += 1) {
        const body = get(`/album?id=${id}`);
        if (/ND\{/.test(body)) { kernel.scanForSignals(body); break; }
      }
      break;
    }
    case "hash": {
      const shown = get("/").match(/md5 = ([0-9a-f]+)/)?.[1] ?? "";
      const word = WORDLIST.find((w) => md5(w) === shown);
      kernel.scanForSignals(get(`/login?pass=${word}`));
      break;
    }
  }
}

/** Captura la bandera del reto activo directamente por su arquetipo. */
function forceSolve(kernel: VirtualKernel): NonNullable<ReturnType<VirtualKernel["ctf"]["solve"]>> {
  const c = kernel.ctf.current()!;
  solveViaBrowser(kernel, c.host, c.archetype as Archetype);
  return kernel.ctf.solve()!;
}
