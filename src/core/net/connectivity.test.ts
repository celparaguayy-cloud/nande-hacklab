import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Motor de conectividad L2/L3/L4 — la verdad del mundo sobre "¿llega el
 * paquete?". Anti-fakery (§3/§5/§13/§19): ping/traceroute/arp/nc/netstat leen
 * el estado REAL de HostRuntime, no un prefijo de IP ni una tabla fija. Este
 * test caza la regresión que motivó el pase: antes `ping <host real>` fallaba
 * y `ping <IP fantasma>` respondía. Ahora es al revés — como debe ser.
 */
describe("Motor de conectividad (ping/traceroute/arp/nc/netstat)", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
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

  it("ping en la terminal: responde a un host real y RECHAZA una IP fantasma", () => {
    const real = term.execute("ping server.nande");
    expect(real).toContain("10.10.0.42");
    expect(real).toContain("3 recibidos");

    const fantasma = term.execute("ping 10.10.250.99");
    expect(fantasma).not.toContain("3 recibidos");
    expect(fantasma).toMatch(/nadie responde|inalcanzable/i);

    const interno = term.execute("ping caja.interna.nande");
    expect(interno).toMatch(/interno/i);
    expect(interno).not.toContain("3 recibidos");
  });

  it("ping funciona desde una sesión remota (pivoting) al segmento interno", () => {
    expect(term.execute("connect server.nande soporte Verano2024")).toContain("conectado");
    const out = term.execute("ping caja.interna.nande");
    expect(out).toContain("10.10.66.10");
    expect(out).toContain("3 recibidos");
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
    const tr = term.execute("traceroute caja.interna.nande");
    expect(tr).toContain("* * *");
    expect(tr).toMatch(/pivotar/i);
  });

  /* -------------------------------------------------------------- arp */

  it("arp sólo muestra el segmento local (L2) y nunca los internos", () => {
    const rows = kernel.hosts.arpNeighbors("10.10.0");
    const names = rows.map((r) => r.hostname);
    expect(names).toContain("gateway");
    expect(names).toContain("server.nande");
    // Un host de otro /24 nunca aparece en el ARP local.
    expect(names).not.toContain("banco.nande");
    expect(names).not.toContain("caja.interna.nande");
    // MAC determinista y reproducible.
    expect(kernel.hosts.macOf("10.10.0.42")).toBe(kernel.hosts.macOf("10.10.0.42"));
    const out = term.execute("arp");
    expect(out).toContain("server.nande");
    expect(out).not.toContain("caja.interna.nande");
  });

  /* --------------------------------------------------------------- nc */

  it("nc: puerto abierto trae banner, cerrado da refused, filtrado da timeout", () => {
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
    // Firewall → filtrado.
    h.blockPort("server.nande", 22);
    expect(h.probePort(null, "server.nande", 22).status).toBe("filtered");
    // Interno desde el jugador: sin ruta.
    expect(h.probePort(null, "caja.interna.nande", 22).status).toBe("no-route");

    const out = term.execute("nc -v server.nande 80");
    expect(out).toMatch(/succeeded/i);
  });

  it("nc coincide con nmap: un servicio detenido cierra el puerto en ambos", () => {
    kernel.hosts.stopService("server.nande", "sshd");
    expect(kernel.hosts.probePort(null, "server.nande", 22).status).toBe("closed");
    const nmap = term.execute("nmap -p22 server.nande");
    expect(nmap).toMatch(/22\/tcp\s+closed/);
  });

  /* ------------------------------------------------------------ netstat */

  it("netstat en un host comprometido refleja servicios vivos y sesiones reales", () => {
    term.execute("connect server.nande soporte Verano2024");
    const out = term.execute("netstat");
    // Los puertos LISTEN son los servicios corriendo del host (fuente única).
    expect(out).toMatch(/0\.0\.0\.0:80\s.*LISTEN\s+nginx/);
    expect(out).toMatch(/0\.0\.0\.0:22\s.*LISTEN\s+sshd/);
    // Tu propia sesión entrante aparece como ESTABLISHED.
    expect(out).toContain("«vos»");
  });
});
