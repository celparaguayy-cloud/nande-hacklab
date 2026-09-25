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
});
