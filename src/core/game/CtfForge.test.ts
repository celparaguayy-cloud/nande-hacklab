import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { CtfForge, type Archetype } from "./CtfForge";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * CTF procedural — pruebas de REALIDAD. La bandera no es un texto: vive detrás
 * de una app web real y sólo se obtiene accediendo al recurso real siguiendo
 * la falla. Anti-mock: recorremos la app con curl de verdad y capturamos la
 * bandera por el mismo camino que cualquier otra.
 */
describe("CtfForge — retos procedurales con bandera real", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("misma semilla → mismo reto (determinista)", () => {
    const forge = new CtfForge(kernel.web, kernel.dns, kernel.hosts);
    const a = forge.generate(42);
    const b = forge.generate(42);
    expect(b.flag).toBe(a.flag);
    expect(b.archetype).toBe(a.archetype);
    expect(b.secretPath).toBe(a.secretPath);
  });

  it("el reto inicial existe y su host es una webapp navegable con nmap", () => {
    const ch = kernel.ctfForge.current();
    expect(ch).not.toBeNull();
    expect(kernel.browser.isWebApp(ch!.hostname)).toBe(true);
    // nmap lo ve (host registrado en el runtime).
    expect(kernel.hosts.has(ch!.hostname)).toBe(true);
  });

  it("la ruta secreta entrega la bandera y se captura de verdad", () => {
    const ch = kernel.ctfForge.current()!;
    // Acceder al recurso real por el path secreto:
    const out = term.execute(`curl http://${ch.hostname}${ch.secretPath}`);
    expect(out).toContain(ch.flag);
    // La bandera quedó capturada en el historial (consecuencia real).
    expect(kernel.player.capturedFlags()).toContain(ch.flag);
  });

  it("cada arquetipo es descubrible con la técnica que enseña", () => {
    const forge = kernel.ctfForge;
    const cases: { seed: number; archetype: Archetype; reconPath: string }[] = [];
    // Buscar una semilla por arquetipo para probar los tres caminos.
    for (let s = 1; s < 60 && cases.length < 3; s += 1) {
      const ch = forge.generate(s);
      if (!cases.some((c) => c.archetype === ch.archetype)) {
        const reconPath =
          ch.archetype === "robots" ? "/robots.txt" : ch.archetype === "backup" ? "/backup.txt" : "/api";
        cases.push({ seed: s, archetype: ch.archetype, reconPath });
      }
    }
    expect(cases.length).toBe(3); // los tres arquetipos aparecen

    for (const c of cases) {
      const ch = forge.generate(c.seed);
      // 1) El paso de recon revela la pista (la ruta secreta o la vía).
      const recon = term.execute(`curl http://${ch.hostname}${c.reconPath}`);
      expect(recon.length).toBeGreaterThan(0);
      // 2) La ruta secreta entrega la bandera.
      const flagOut = term.execute(`curl http://${ch.hostname}${ch.secretPath}`);
      expect(flagOut).toContain(ch.flag);
    }
  });

  it("generar un reto nuevo reemplaza al anterior (no acumula hosts)", () => {
    const first = kernel.ctfForge.current()!;
    const second = kernel.ctfForge.generate(777);
    expect(second.hostname).not.toBe(first.hostname);
    // El host viejo ya no es webapp (se quitó del WebServer).
    expect(kernel.browser.isWebApp(first.hostname)).toBe(false);
    expect(kernel.browser.isWebApp(second.hostname)).toBe(true);
  });
});
