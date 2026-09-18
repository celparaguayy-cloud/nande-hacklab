import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { HostRuntime } from "./HostRuntime";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Anti-mock tests de la transformación: no comprueban que "salga el texto
 * esperado", comprueban que UN cambio de estado se propaga a MÚLTIPLES
 * sistemas (curl, navegador, nmap, log de eventos) desde una sola fuente de
 * verdad. Si esto pasa, la red dejó de ser dos realidades desconectadas.
 */

describe("HostRuntime (unidad)", () => {
  it("un servicio detenido cierra el puerto y bloquea HTTP", () => {
    const rt = new HostRuntime();
    rt.registerWebHost("demo.nande", "10.10.9.1");

    expect(rt.isPortOpen("demo.nande", 80)).toBe(true);
    expect(rt.httpReachable("demo.nande")).toBe(true);
    expect(rt.openServices("demo.nande").map((s) => s.port)).toContain(80);

    rt.stopService("demo.nande", "nginx");

    expect(rt.isPortOpen("demo.nande", 80)).toBe(false);
    expect(rt.httpReachable("demo.nande")).toBe(false);
    expect(rt.openServices("demo.nande")).toHaveLength(0);

    rt.startService("demo.nande", "nginx");
    expect(rt.httpReachable("demo.nande")).toBe(true);
  });

  it("el firewall filtra el puerto sin detener el servicio, y deja evento", () => {
    const rt = new HostRuntime();
    rt.registerWebHost("demo.nande", "10.10.9.2");

    rt.blockPort("demo.nande", 80);
    expect(rt.isPortOpen("demo.nande", 80)).toBe(false);
    expect(rt.httpReachable("demo.nande")).toBe(false);

    rt.allowPort("demo.nande", 80);
    expect(rt.httpReachable("demo.nande")).toBe(true);

    const kinds = rt.timeline().map((e) => e.kind);
    expect(kinds).toContain("port.blocked");
    expect(kinds).toContain("port.unblocked");
  });

  it("host no gestionado no se bloquea (httpReachable = true)", () => {
    const rt = new HostRuntime();
    expect(rt.httpReachable("news.nande")).toBe(true);
  });
});

describe("Experimento A/B — service-stop propaga a curl, navegador y nmap", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("server.nande responde por curl y nmap muestra 80 abierto", () => {
    const curl = term.execute("curl http://server.nande");
    expect(curl).toContain("HTTP 200");

    const nmap = term.execute("nmap -p 80 server.nande");
    expect(nmap).toContain("80/tcp");
    expect(nmap).toContain("open");
  });

  it("service-stop nginx: curl falla, navegador falla y nmap muestra 80 cerrado", () => {
    term.execute("service-stop nginx server.nande");

    // curl (mismo runtime que el navegador) ahora falla.
    const curl = term.execute("curl http://server.nande");
    expect(curl.toLowerCase()).toContain("rechazada");
    expect(curl).not.toContain("HTTP 200");

    // El navegador, que mira el MISMO estado, también rechaza.
    expect(() => kernel.browser.request("GET", "server.nande", "/")).toThrow();

    // nmap refleja el estado real: 80 cerrado.
    const nmap = term.execute("nmap -p 80 server.nande");
    expect(nmap).toContain("80/tcp");
    expect(nmap).toContain("closed");

    // El runtime dejó evidencia (lo que consumirá el SOC), sin ninguna UI.
    const kinds = kernel.hosts.timeline().map((e) => e.kind);
    expect(kinds).toContain("service.stopped");
    expect(kinds).toContain("connection.refused");
  });

  it("service-start restaura el servicio y todo vuelve a funcionar", () => {
    term.execute("service-stop nginx server.nande");
    term.execute("service-start nginx server.nande");

    expect(term.execute("curl http://server.nande")).toContain("HTTP 200");
    expect(term.execute("nmap server.nande")).toContain("open");
  });

  it("firewall block 80 filtra el puerto: curl falla y nmap muestra filtered", () => {
    term.execute("firewall block server.nande 80");

    expect(term.execute("curl http://server.nande").toLowerCase()).toContain("rechazada");
    expect(term.execute("nmap server.nande")).toContain("filtered");

    term.execute("firewall allow server.nande 80");
    expect(term.execute("curl http://server.nande")).toContain("HTTP 200");
  });

  it("pivoting: la red interna sólo se alcanza tras comprometer server.nande", () => {
    // Desde la red del jugador, la caja interna no es alcanzable.
    const directo = term.execute("connect caja.interna.nande admin GiraSol#2024");
    expect(directo.toLowerCase()).toContain("no es alcanzable");

    // Entrar a server.nande con las credenciales sniffadas.
    const login = term.execute("connect server.nande soporte Verano2024");
    expect(login).toContain("conectado a server.nande");

    // Desde adentro, nmap revela la red interna.
    const scan = term.execute("nmap");
    expect(scan).toContain("caja.interna.nande");

    // Pivotar a la caja interna (ahora sí alcanzable) con sus credenciales.
    const pivot = term.execute("connect caja.interna.nande admin GiraSol#2024");
    expect(pivot).toContain("conectado a caja.interna.nande");

    // Leer la bandera dispara consecuencias en el mundo.
    const flag = term.execute("cat /root/flag.txt");
    expect(flag).toContain("ND{pivoting_red_interna}");

    // Volver salto a salto.
    expect(term.execute("exit")).toContain("server.nande");
    expect(term.execute("exit").toLowerCase()).toContain("cerraste");
  });

  it("credenciales inválidas no dan acceso y quedan como evento", () => {
    const bad = term.execute("connect server.nande soporte clave-mala");
    expect(bad.toLowerCase()).toContain("inválid");
    const kinds = kernel.hosts.timeline().map((e) => e.kind);
    expect(kinds).toContain("login.failure");
  });

  it("matar el proceso de un servicio lo detiene (efecto cruzado)", () => {
    const procs = kernel.hosts.processesOf("server.nande");
    const nginx = procs.find((p) => p.service === "nginx");
    expect(nginx).toBeDefined();

    const r = kernel.hosts.killProcess("server.nande", nginx!.pid);
    expect(r.ok).toBe(true);
    // El servicio quedó detenido → HTTP ya no responde.
    expect(kernel.hosts.httpReachable("server.nande")).toBe(false);
    expect(term.execute("curl http://server.nande").toLowerCase()).toContain("rechazada");
  });

  it("determinismo: dos kernels con la misma seed exponen el mismo mapa de puertos", () => {
    const portsOf = (k: VirtualKernel) =>
      k.hosts
        .all()
        .map((h) => `${h.hostname}:${h.services.map((s) => s.port).sort().join(",")}`)
        .sort()
        .join("|");

    resetStorage();
    seedRandom();
    const a = new VirtualKernel();
    resetStorage();
    seedRandom();
    const b = new VirtualKernel();

    expect(portsOf(a)).toBe(portsOf(b));
  });
});
