import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Mapa de red del sandbox — derivado del ESTADO real de hosts (única fuente de
 * verdad, regla 2/12). Anti-mock: netmap sólo muestra lo alcanzable; los
 * segmentos internos quedan ocultos hasta pivotar (coherencia con la
 * reachability real). Si alguien filtra un host interno al mapa público, o el
 * agrupamiento por subred se rompe, este test lo caza.
 */
describe("Mapa de red (subnets + netmap)", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("subnets() agrupa por /24 y marca las internas", () => {
    const subs = kernel.hosts.subnets();
    const by = new Map(subs.map((s) => [s.base, s]));
    // La subred de sitios públicos existe y NO es interna.
    expect(by.get("10.10.7")?.internal).toBe(false);
    expect(by.get("10.10.7")?.hosts.some((h) => h.hostname === "banco.nande")).toBe(true);
    // La caja interna vive en un segmento marcado interno.
    expect(by.get("10.10.66")?.internal).toBe(true);
    expect(by.get("10.10.66")?.hosts.some((h) => h.hostname === "caja.interna.nande")).toBe(true);
  });

  it("cada host cae en la /24 correcta derivada de su IP", () => {
    for (const sn of kernel.hosts.subnets()) {
      for (const h of sn.hosts) {
        expect(h.ip.split(".").slice(0, 3).join(".")).toBe(sn.base);
      }
    }
  });

  it("netmap muestra hosts públicos pero NO los internos (sin fakery)", () => {
    const out = term.execute("netmap");
    expect(out).toContain("banco.nande");
    expect(out).toContain("10.10.7.10");
    expect(out).toContain("web01.nande"); // la máquina de privesc está en el mapa
    // El host interno no se ve desde la red del jugador.
    expect(out).not.toContain("caja.interna.nande");
    expect(out).toContain("pivoting");
  });

  it("canReach: regla única de alcance (jugador vs. pivot)", () => {
    const h = kernel.hosts;
    expect(h.canReach(null, "banco.nande")).toBe(true);
    expect(h.canReach(null, "caja.interna.nande")).toBe(false);
    expect(h.canReach("server.nande", "caja.interna.nande")).toBe(true);
    // Por IP también (el origen se resuelve contra el mismo estado).
    expect(h.canReach("10.10.0.42", "10.10.66.10")).toBe(true);
    expect(h.canReach("web01.nande", "caja.interna.nande")).toBe(false);
    expect(h.canReach(null, "no.existe.nande")).toBe(false);
  });

  it("netmap dentro de una sesión remota muestra la red interna del host pivoteado", () => {
    expect(term.execute("connect server.nande soporte Verano2024")).toContain("conectado");
    const out = term.execute("netmap");
    expect(out).toContain("Mapa de red desde server.nande (10.10.0.42)");
    expect(out).toContain("sesión de soporte");
    // La ruta real de saltos.
    expect(out).toContain("tu equipo (10.10.0.10) -> server.nande (10.10.0.42) [soporte]");
    // El segmento interno y su host, con los servicios que responden AHORA.
    expect(out).toContain("10.10.66.0/24  [interno]");
    expect(out).toMatch(/10\.10\.66\.10\s+caja\.interna\.nande\s+2 svc/);
    // Coherente con internalSubnetsFrom (misma relación que connect).
    const internas = kernel.hosts.internalSubnetsFrom("server.nande");
    for (const sn of internas) {
      for (const hh of sn.hosts) {
        expect(out).toContain(hh.hostname);
        expect(kernel.hosts.canReach("server.nande", hh.hostname)).toBe(true);
      }
    }
  });

  it("el mapa remoto refleja el estado real: servicio caído y host apagado", () => {
    term.execute("connect server.nande soporte Verano2024");
    kernel.hosts.stopService("caja.interna.nande", "postgres");
    expect(term.execute("netmap")).toMatch(/caja\.interna\.nande\s+1 svc/);
    // nmap interno dice lo mismo que netmap (una sola verdad).
    expect(term.execute("nmap")).toContain("caja.interna.nande  (1 servicios)");
    kernel.hosts.setHostUp("caja.interna.nande", false);
    expect(term.execute("netmap")).toMatch(/caja\.interna\.nande\s+apagado/);
    // Un host apagado no responde al escaneo.
    expect(term.execute("nmap")).not.toContain("caja.interna.nande");
  });

  it("desde un host sin red interna lo dice, y al salir vuelve el mapa local", () => {
    term.execute("connect web01.nande devops Delfin2024");
    const out = term.execute("netmap");
    expect(out).toContain("Mapa de red desde web01.nande");
    expect(out).toContain("no se ve ninguna red interna nueva");
    expect(out).not.toContain("caja.interna.nande");
    term.execute("exit");
    const local = term.execute("netmap");
    expect(local).toContain("=== Mapa de red - NANDE");
    expect(local).not.toContain("caja.interna.nande");
  });

  it("connect sigue la misma regla: el interno no se alcanza desde tu equipo", () => {
    expect(term.execute("connect caja.interna.nande admin GiraSol#2024")).toContain("no es alcanzable");
  });

  it("man netmap documenta el modo sesión remota", () => {
    const man = term.execute("man netmap");
    expect(man).toContain("sesión remota");
    expect(man).toContain("ruta de pivoting");
  });
});
