import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Pivoting por TÚNEL (chisel/proxychains) — pruebas de REALIDAD. Un túnel por un
 * host comprometido EXTIENDE de verdad el alcance del jugador a la red interna
 * del pivote (canReach lo respeta desde una sola regla). Es aditivo: sin túnel,
 * el alcance es el de siempre. Y respeta la contención: aislar el pivote mata el
 * túnel. No se tuneliza por un host que no controlás.
 */
describe("Túneles / pivoting — extienden el alcance del atacante de verdad", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("sin túnel, el jugador NO alcanza el segmento interno (comportamiento de siempre)", () => {
    expect(kernel.hosts.canReach(null, "db-core.interna.nande")).toBe(false);
  });

  it("un túnel por un pivote comprometido ABRE su red interna al jugador", () => {
    // Tomá el pivote de verdad (registro de compromiso).
    kernel.compromises.record({
      hostname: "nas.interna.nande", ip: "10.10.66.20", os: "nas", user: "respaldo", level: "user", via: "server.nande",
    });
    // Antes del túnel: db-core (detrás del NAS) no se alcanza desde la máquina del jugador.
    expect(kernel.hosts.canReach(null, "db-core.interna.nande")).toBe(false);
    const out = term.execute("chisel nas.interna.nande");
    expect(out).toMatch(/Túnel abierto|proxychains/);
    // Después: el jugador alcanza db-core con sus propias herramientas.
    expect(kernel.hosts.canReach(null, "db-core.interna.nande")).toBe(true);
    // Y quedó la técnica MITRE de tunneling (la ve el SOC/OPSEC).
    expect(kernel.mitre.recent(10).map((d) => d.mitreId)).toContain("T1572");
  });

  it("no se tuneliza por un host que NO comprometiste", () => {
    const out = term.execute("chisel nas.interna.nande");
    expect(out).toMatch(/COMPROMETER|no controlás/i);
    expect(kernel.hosts.canReach(null, "db-core.interna.nande")).toBe(false);
  });

  it("la contención mata el túnel: aislar el pivote corta el alcance", () => {
    kernel.compromises.record({
      hostname: "nas.interna.nande", ip: "10.10.66.20", os: "nas", user: "respaldo", level: "user", via: "server.nande",
    });
    term.execute("chisel nas.interna.nande");
    expect(kernel.hosts.canReach(null, "db-core.interna.nande")).toBe(true);
    // El equipo azul aísla el pivote → el túnel deja de servir.
    kernel.containment.isolateHost("nas.interna.nande");
    expect(kernel.hosts.canReach(null, "db-core.interna.nande")).toBe(false);
  });

  it("route muestra la cadena de pivoteo real hasta el segmento OT", () => {
    const out = term.execute("route plc.planta.nande");
    // La topología real: entrada pública → NAS → db-core → HMI → PLC.
    expect(out).toContain("plc.planta.nande");
    expect(out).toContain("nas.interna.nande");
    expect(out).toMatch(/hmi\.planta\.nande|db-core\.interna\.nande/);
    // Sin comprometer nada, avisa qué pivotes tomar primero.
    expect(out).toMatch(/Comprometé|pendiente/i);
  });

  it("chisel auto tuneliza por TODA la infraestructura tomada de una", () => {
    // Comprometé una cadena de pivotes.
    for (const h of [
      { hostname: "nas.interna.nande", ip: "10.10.66.20" },
      { hostname: "db-core.interna.nande", ip: "10.10.99.10" },
    ]) {
      kernel.compromises.record({ hostname: h.hostname, ip: h.ip, os: "x", user: "root", level: "root", via: "server.nande" });
    }
    const out = term.execute("chisel auto");
    expect(out).toMatch(/chisel auto/);
    // Con ambos pivotes tunelizados, alcanzás el segmento tras db-core (hmi).
    expect(kernel.hosts.activeTunnels()).toContain("nas.interna.nande");
    expect(kernel.hosts.activeTunnels()).toContain("db-core.interna.nande");
    expect(kernel.hosts.canReach(null, "hmi.planta.nande")).toBe(true);
    expect(kernel.mitre.recent(10).map((d) => d.mitreId)).toContain("T1572");
  });

  it("chisel stop cierra el túnel y vuelve el alcance de siempre", () => {
    kernel.compromises.record({
      hostname: "nas.interna.nande", ip: "10.10.66.20", os: "nas", user: "respaldo", level: "user", via: "server.nande",
    });
    term.execute("chisel nas.interna.nande");
    expect(kernel.hosts.activeTunnels()).toContain("nas.interna.nande");
    term.execute("chisel stop nas.interna.nande");
    expect(kernel.hosts.activeTunnels()).not.toContain("nas.interna.nande");
    expect(kernel.hosts.canReach(null, "db-core.interna.nande")).toBe(false);
  });
});
