import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * CyberRuntime — pruebas de REALIDAD (no de texto). Demuestran el mantra de
 * 5.0: un mundo, un estado, un reloj, un sistema de eventos. Cada tool que
 * pasa por CyberRuntime ve exactamente lo que ven las demás, porque no hay
 * copias del mundo: hay UN estado y varias lecturas derivadas.
 */
describe("CyberRuntime — el runtime ES el mundo", () => {
  let kernel: VirtualKernel;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("un escaneo refleja el estado real de servicios (parar un servicio lo cierra)", () => {
    const rt = kernel.runtime;
    const host = "server.nande";

    // Antes: el puerto web (nginx :80) aparece abierto en el escaneo.
    const before = rt.host.scan(host);
    expect(before.some((p) => p.port === 80)).toBe(true);

    // Paramos nginx a través del runtime (efecto real en el HostRuntime).
    const stop = rt.service.stop(host, "nginx");
    expect(stop.ok).toBe(true);

    // El MISMO escaneo ya no ve el puerto 80: no hay salida falsa, el
    // escáner deriva del estado que acabamos de cambiar.
    const after = rt.host.scan(host);
    expect(after.some((p) => p.port === 80)).toBe(false);
    expect(rt.service.httpUp(host)).toBe(false);
  });

  it("cada acción del runtime queda registrada en el EventStore (la memoria del mundo)", () => {
    const rt = kernel.runtime;
    const before = rt.events.byType("runtime.host").length;

    rt.service.stop("server.nande", "nginx");
    rt.service.start("server.nande", "nginx");

    const after = rt.events.byType("runtime.host").length;
    expect(after).toBeGreaterThan(before);
  });

  it("el reloj del runtime es el reloj del mundo (no un tiempo inventado)", () => {
    const rt = kernel.runtime;
    expect(rt.clock.tick()).toBe(kernel.world.getState().clock.tick);

    kernel.tick(); // avanza el mundo un minuto virtual
    expect(rt.clock.tick()).toBe(kernel.world.getState().clock.tick);
  });

  it("http y navegador comparten el mismo servidor: si el servicio cae, la web también", () => {
    const rt = kernel.runtime;
    const host = "banco.nande";

    // El navegador puede pedir la home mientras nginx corre.
    expect(rt.service.httpUp(host)).toBe(true);

    // Tiramos nginx: httpUp cae y una petición HTTP falla (no responde fake).
    rt.service.stop(host, "nginx");
    expect(rt.service.httpUp(host)).toBe(false);
    expect(() => rt.http.request("GET", host, "/")).toThrow();
  });

  it("firewall real: bloquear un puerto lo oculta del escaneo", () => {
    const rt = kernel.runtime;
    const host = "server.nande";
    expect(rt.host.scan(host).some((p) => p.port === 22)).toBe(true);

    rt.net.firewallBlock(host, 22);
    expect(rt.host.scan(host).some((p) => p.port === 22)).toBe(false);

    rt.net.firewallAllow(host, 22);
    expect(rt.host.scan(host).some((p) => p.port === 22)).toBe(true);
  });
});
