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

  /* ------------------------------------------------ tráfico real (sniffer) */

  it("ping deja un eco ICMP real en NandeShark (§5: se ve en el cable)", () => {
    const before = kernel.shark.count();
    term.execute("ping server.nande");
    expect(kernel.shark.count()).toBeGreaterThan(before);
    // Se ve en el sniffer y con el filtro BPF icmp de tcpdump.
    expect(term.execute("sniff")).toMatch(/ICMP echo.*server\.nande/);
    expect(term.execute("tcpdump icmp")).toMatch(/icmp/i);
  });

  it("nc deja el handshake TCP real (con banner) y el escaneo es RUIDOSO", () => {
    term.execute("nc -v server.nande 22");
    // El SYN/ACK y el banner SSH quedan capturados.
    const shark = kernel.shark.all();
    const tcp = shark.filter((p) => p.proto === "TCP" && p.dst === "10.10.0.42");
    expect(tcp.some((p) => p.wire.includes("SYN, ACK") && p.wire.includes("SSH-2.0-"))).toBe(true);
    // Un barrido -z genera un paquete por puerto: escanear se ve.
    const before = kernel.shark.count();
    term.execute("nc -z server.nande 20-25");
    expect(kernel.shark.count() - before).toBeGreaterThanOrEqual(6);
  });

  it("desde una sesión remota el sniffer local NO captura el tráfico del pivot", () => {
    term.execute("connect server.nande soporte Verano2024");
    const before = kernel.shark.count();
    term.execute("ping caja.interna.nande"); // originado en el host pivoteado
    expect(kernel.shark.count()).toBe(before); // no lo ve el sniffer del jugador
  });

  /* ---------------------------------------------- IDS pasivo (Blue Team) */

  it("el IDS detecta un PORT SCAN a partir del tráfico real (recon ofensivo ↔ defensivo)", () => {
    // Sin tráfico no inventa nada.
    expect(kernel.shark.detectScans()).toHaveLength(0);
    // Un barrido de puertos deja su patrón en el cable.
    term.execute("nc -z server.nande 20-40");
    const scans = kernel.shark.detectScans();
    const ps = scans.find((f) => f.kind === "port-scan");
    expect(ps, "debería detectarse un port-scan").toBeDefined();
    expect(ps!.target).toBe("server.nande");
    expect(ps!.ports.length).toBeGreaterThanOrEqual(20);
    // El comando ids del Blue Team lo muestra.
    const out = term.execute("ids");
    expect(out).toMatch(/PORT SCAN/);
    expect(out).toContain("server.nande");
    // El SOC lo referencia en su resumen (sin romper el resto del panel).
    expect(term.execute("soc")).toMatch(/IDS.*escaneo/i);
  });

  it("el IDS detecta un PING SWEEP (muchos hosts por ICMP) y es honesto sin escaneos", () => {
    expect(term.execute("ids")).toMatch(/[Ss]in escaneos/);
    for (const h of ["server.nande", "panel.nande", "midc.nande", "banco.nande", "blog.yvoty.nande"]) {
      term.execute("ping " + h);
    }
    const sweep = kernel.shark.detectScans().find((f) => f.kind === "ping-sweep");
    expect(sweep, "debería detectarse un ping-sweep").toBeDefined();
    expect(sweep!.hosts.length).toBeGreaterThanOrEqual(4);
    expect(term.execute("ids")).toMatch(/PING SWEEP/);
  });

  /* -------------------------------------------- ARP spoofing / MITM (L2) */

  it("las workstations víctima son vecinos reales del segmento local", () => {
    const names = kernel.hosts.arpNeighbors("10.10.0").map((r) => r.hostname);
    expect(names).toContain("pc-conta.nande");
    // Es un cliente: sin servicios (nmap la ve cerrada) pero viva (ping responde).
    expect(kernel.hosts.icmpEcho(null, "pc-conta.nande").status).toBe("reply");
    expect(kernel.hosts.openServices("pc-conta.nande")).toHaveLength(0);
    expect(term.execute("arp")).toContain("pc-conta.nande");
  });

  it("arpspoof a una víctima local intercepta su login en claro (MITM real)", () => {
    const out = term.execute("arpspoof pc-conta.nande");
    expect(out).toMatch(/ACTIVO/);
    expect(kernel.mitm.isPoisoned("10.10.0.7")).toBe(true);
    // La credencial de la víctima queda capturada por NandeShark.
    const creds = kernel.shark.credentials();
    expect(creds.some((c) => c.value === "Contadora#2024")).toBe(true);
    expect(term.execute("sniff creds")).toContain("Contadora#2024");
    // Enciende la detección MITRE T1557 (ARP cache poisoning).
    expect(kernel.mitre.recent(20).some((d) => d.mitreId.startsWith("T1557"))).toBe(true);
  });

  it("arpspoof NO cruza routers: rechaza objetivos de otro segmento (ARP es L2)", () => {
    const out = term.execute("arpspoof banco.nande"); // 10.10.7.x
    expect(out).toMatch(/no está en tu segmento local|no cruza routers/i);
    expect(kernel.mitm.isPoisoned("10.10.7.10")).toBe(false);
  });

  it("arpspoof a un servidor: MITM activo pero sin botín (no manda logins en claro)", () => {
    const out = term.execute("arpspoof server.nande");
    expect(out).toMatch(/ACTIVO/);
    expect(kernel.shark.credentials()).toHaveLength(0);
    // Y se puede cortar, restaurando el ARP.
    expect(term.execute("arpspoof stop")).toMatch(/detenido|restaurada/i);
    expect(kernel.mitm.active()).toHaveLength(0);
  });

  /* ------------------------------------------ DNS spoofing / cache poisoning */

  it("dnsspoof envenena la resolución: TODO lo que resuelve el nombre cae en el atacante", () => {
    // Antes: el nombre resuelve a su IP real (fuente única = kernel.dns).
    expect(kernel.dns.resolve("server.nande")).toBe("10.10.0.42");
    const out = term.execute("dnsspoof server.nande");
    expect(out).toMatch(/DNS spoofing/);
    // Después: el motor DNS entero devuelve la IP del atacante (no un truco por
    // comando): resolve, nslookup, y cualquier consumidor caen en 10.10.0.10.
    expect(kernel.dns.resolve("server.nande")).toBe("10.10.0.10");
    expect(term.execute("nslookup server.nande")).toContain("Address: 10.10.0.10");
    expect(kernel.dns.poisonedAddress("server.nande")).toBe("10.10.0.10");
    // Enciende la detección MITRE T1557 (Adversary-in-the-Middle: DNS Spoofing).
    expect(kernel.mitre.recent(20).some((d) => d.mitreId === "T1557")).toBe(true);
    // Y se corta, restaurando la resolución real.
    expect(term.execute("dnsspoof stop server.nande")).toMatch(/limpié|vuelve a resolver/i);
    expect(kernel.dns.resolve("server.nande")).toBe("10.10.0.42");
    expect(kernel.dns.poisonedAddress("server.nande")).toBeUndefined();
  });

  it("dnsspoof es GLOBAL: intercepta un login cross-segment que ARP no alcanza", () => {
    // pc-conta (10.10.0.7, segmento del jugador) se loguea a banco.nande
    // (10.10.7.10, OTRO segmento). ARP no cruza routers: arpspoof lo rechaza.
    expect(term.execute("arpspoof banco.nande")).toMatch(/no está en tu segmento local|no cruza routers/i);
    expect(kernel.shark.credentials()).toHaveLength(0);
    // Pero el DNS es global: envenenar el NOMBRE redirige a la víctima aunque
    // el servicio viva en otro segmento. Su login en claro cae en el atacante.
    const out = term.execute("dnsspoof banco.nande");
    expect(out).toMatch(/víctima|cayó en vos/i);
    expect(kernel.dns.resolve("banco.nande")).toBe("10.10.0.10");
    const creds = kernel.shark.credentials();
    expect(creds.some((c) => c.value === "Contadora#2024")).toBe(true);
    expect(term.execute("sniff creds")).toContain("Contadora#2024");
  });

  it("dnsspoof rechaza una IP de atacante fuera del sandbox (no se sale del mundo)", () => {
    const out = term.execute("dnsspoof server.nande 8.8.8.8");
    expect(out).toMatch(/sandbox|10\.10/i);
    // No quedó envenenado: la resolución sigue siendo la real.
    expect(kernel.dns.resolve("server.nande")).toBe("10.10.0.42");
    expect(kernel.dns.poisonedAddress("server.nande")).toBeUndefined();
  });

  /* ------------------------------------------- IDS: detección de MITM (Blue) */

  it("el IDS detecta el ARP spoofing (MAC duplicada / arpwatch) desde el estado real", () => {
    expect(term.execute("ids")).not.toMatch(/ARP SPOOFING/);
    term.execute("arpspoof pc-conta.nande");
    const ids = term.execute("ids");
    expect(ids).toMatch(/ARP SPOOFING/);
    expect(ids).toContain("10.10.0.7"); // la víctima envenenada
    // Deriva del estado REAL: cortar el MITM lo hace desaparecer.
    term.execute("arpspoof stop");
    expect(term.execute("ids")).not.toMatch(/ARP SPOOFING/);
  });

  it("el IDS detecta el DNS spoofing (respuesta envenenada) desde el estado real", () => {
    expect(term.execute("ids")).not.toMatch(/DNS SPOOFING/);
    term.execute("dnsspoof banco.nande");
    const ids = term.execute("ids");
    expect(ids).toMatch(/DNS SPOOFING/);
    expect(ids).toContain("banco.nande");
    expect(ids).toContain("(esperado 10.10.7.10)"); // muestra la IP real esperada
    // Al restaurar el DNS, la anomalía se va.
    term.execute("dnsspoof stop");
    expect(term.execute("ids")).not.toMatch(/DNS SPOOFING/);
  });
});
