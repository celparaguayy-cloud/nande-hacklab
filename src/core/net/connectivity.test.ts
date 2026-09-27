import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Motor de conectividad L2/L3/L4 — la verdad del mundo sobre "¿llega el
 * paquete?". Anti-fakery (§3/§5/§13/§19): la reachability, la ruta, la tabla
 * ARP y el sondeo de puertos salen del estado REAL de HostRuntime (fuente
 * única), no de un prefijo de IP ni de una tabla fija.
 *
 * Este test cubre el MOTOR (regla §7: el motor importa más que la interfaz).
 * Caza la regresión que motivó el pase: en esa IP no vive nadie -> NO responde;
 * un host interno no se alcanza sin pivotar; un servicio detenido cierra el
 * puerto en nc igual que en nmap.
 */
describe("Motor de conectividad (HostRuntime L2/L3/L4)", () => {
  let kernel: VirtualKernel;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  /* ------------------------------------------------------------- icmpEcho */

  it("icmpEcho distingue reply / no-host / no-route / down", () => {
    const h = kernel.hosts;
    // Host público y encendido: responde.
    expect(h.icmpEcho(null, "server.nande").status).toBe("reply");
    expect(h.icmpEcho(null, "10.10.0.42").status).toBe("reply");
    // IP donde no vive nadie: NO responde (fin del ping fantasma).
    expect(h.icmpEcho(null, "10.10.250.99").status).toBe("no-host");
    // Host interno desde la red del jugador: sin ruta (hace falta pivotar).
    expect(h.icmpEcho(null, "caja.interna.nande").status).toBe("no-route");
    // Desde el jump host (server) sí hay ruta al interno.
    expect(h.icmpEcho("server.nande", "caja.interna.nande").status).toBe("reply");
    // Host apagado: alcanzable pero no responde.
    h.setHostUp("panel.nande", false);
    expect(h.icmpEcho(null, "panel.nande").status).toBe("down");
  });

  /* ---------------------------------------------------------- tracePath */

  it("tracePath: vecino del mismo /24 = un salto; otro segmento = pasa por routers", () => {
    const h = kernel.hosts;
    const same = h.tracePath(null, "server.nande"); // 10.10.0.x = mismo /24 que el jugador
    expect(same.status).toBe("reply");
    expect(same.hops).toHaveLength(1);
    expect(same.hops[0].ip).toBe("10.10.0.42");

    const far = h.tracePath(null, "banco.nande"); // 10.10.7.x = otro segmento
    expect(far.status).toBe("reply");
    expect(far.hops.map((x) => x.ip)).toEqual(["10.10.0.1", "10.10.7.1", "10.10.7.10"]);

    // Host interno: la ruta se pierde tras el gateway.
    const dead = h.tracePath(null, "caja.interna.nande");
    expect(dead.status).toBe("no-route");
    expect(dead.hops[0].ip).toBe("10.10.0.1");
  });

  /* -------------------------------------------------------------- arp */

  it("arpNeighbors sólo muestra el segmento local (L2) y nunca los internos", () => {
    const rows = kernel.hosts.arpNeighbors("10.10.0");
    const names = rows.map((r) => r.hostname);
    expect(names).toContain("gateway");
    expect(names).toContain("server.nande");
    // Un host de otro /24 nunca aparece en el ARP local.
    expect(names).not.toContain("banco.nande");
    expect(names).not.toContain("caja.interna.nande");
    // MAC determinista y reproducible.
    expect(kernel.hosts.macOf("10.10.0.42")).toBe(kernel.hosts.macOf("10.10.0.42"));
    expect(kernel.hosts.macOf("10.10.0.1")).toMatch(/^02:00:/);
  });

  /* --------------------------------------------------------------- nc / L4 */

  it("probePort: puerto abierto trae banner, cerrado/filtrado/interno coherentes", () => {
    const h = kernel.hosts;
    // Abierto con banner (SSH saluda).
    const ssh = h.probePort(null, "server.nande", 22);
    expect(ssh.status).toBe("open");
    expect(ssh.banner).toContain("SSH-2.0-");
    // HTTP abierto pero sin banner (no saluda al abrir el socket).
    expect(h.probePort(null, "server.nande", 80).status).toBe("open");
    expect(h.probePort(null, "server.nande", 80).banner).toBeUndefined();
    // Puerto sin servicio: cerrado.
    expect(h.probePort(null, "server.nande", 3389).status).toBe("closed");
    // Firewall -> filtrado.
    h.blockPort("server.nande", 22);
    expect(h.probePort(null, "server.nande", 22).status).toBe("filtered");
    // Interno desde el jugador: sin ruta.
    expect(h.probePort(null, "caja.interna.nande", 22).status).toBe("no-route");
  });

  it("probePort coincide con la verdad de nmap: un servicio detenido cierra el puerto", () => {
    kernel.hosts.stopService("server.nande", "sshd");
    expect(kernel.hosts.probePort(null, "server.nande", 22).status).toBe("closed");
    // openServices (lo que ve nmap) tampoco lo lista ya.
    expect(kernel.hosts.openServices("server.nande").some((s) => s.port === 22)).toBe(false);
  });
});
