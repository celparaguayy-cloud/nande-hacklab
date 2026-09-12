import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "./VirtualKernel";
import { resetStorage, seedRandom } from "../test/setup";

/**
 * EL TEST MÁS IMPORTANTE (Phase 59): "sin UI".
 *
 * Operamos el mundo SÓLO por los runtimes del kernel, sin instanciar ninguna
 * interfaz (ni Terminal ni componentes React). Si el runtime igual sabe qué
 * existe, qué corre, qué está apagado, qué usuario se autenticó, qué
 * herramienta existe y qué evento ocurrió, entonces la arquitectura es
 * correcta: el mundo vive en el runtime, no en la pantalla.
 */
describe("WorldState sin UI — la realidad vive en el runtime", () => {
  let k: VirtualKernel;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    k = new VirtualKernel();
  });

  it("el runtime conoce hosts, servicios y su estado tras apagarlos", () => {
    const ws0 = k.worldState();
    expect(ws0.hosts.length).toBeGreaterThan(0);
    const server0 = ws0.hosts.find((h) => h.hostname === "server.nande")!;
    expect(server0.services.find((s) => s.name === "nginx")!.state).toBe("running");

    // Acción por el runtime, sin UI.
    k.hosts.stopService("server.nande", "nginx");

    const server1 = k.worldState().hosts.find((h) => h.hostname === "server.nande")!;
    expect(server1.services.find((s) => s.name === "nginx")!.state).toBe("stopped");
    // Y el HTTP dejó de estar disponible (lo sabe el runtime, no la UI).
    expect(k.hosts.httpReachable("server.nande")).toBe(false);
  });

  it("el runtime sabe qué usuario se autenticó y qué evento ocurrió", () => {
    k.hosts.authenticate("server.nande", "soporte", "Verano2024");
    const kinds = k.hosts.timeline().map((e) => e.kind);
    expect(kinds).toContain("login.success");
    // El SOC (que escucha eventos, no la UI) lo registró.
    expect(k.soc.count()).toBeGreaterThan(0);
  });

  it("el runtime sabe qué herramientas existen (jugador y NPC)", () => {
    const before = k.worldState().tools.length;
    k.toolRuntime.install('print("hola " + args[0]);', { name: "saludo" }, "player");
    const after = k.worldState();
    expect(after.tools.length).toBe(before + 1);
    expect(after.tools.some((t) => t.name === "saludo")).toBe(true);
    // Corre de verdad.
    const r = k.toolRuntime.run("saludo", ["mundo"]);
    expect(r.output).toContain("hola mundo");
  });

  it("el runtime conoce la red interna oculta (pivoting) sin ninguna vista", () => {
    // caja.interna.nande es interna: no es pública.
    const caja = k.worldState().hosts.find((h) => h.hostname === "caja.interna.nande");
    expect(caja?.internal).toBe(true);
    // Sólo alcanzable desde server.nande.
    expect(k.hosts.reachableFrom("server.nande").some((h) => h.hostname === "caja.interna.nande")).toBe(true);
  });

  it("worldState agrega todos los runtimes de forma coherente", () => {
    const ws = k.worldState();
    expect(ws.people).toBeGreaterThan(0);
    expect(ws.databases).toContain("padron");
    expect(ws.ai).toBe("offline");
    expect(Object.keys(ws.alerts)).toEqual(["info", "low", "medium", "high", "critical"]);
  });
});
