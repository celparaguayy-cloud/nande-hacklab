import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * dig / DNS recon — pruebas de REALIDAD. `dig` lee el motor DNS real: registros
 * por tipo, DNS inverso y transferencia de zona (AXFR). El AXFR es una
 * vulnerabilidad de recon de verdad: una zona mal configurada filtra sus
 * nombres internos, y eso cambia el estado (bandera capturada, señal MITRE).
 */
describe("dig — DNS con tipos, reverso y transferencia de zona (AXFR)", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("dig <nombre> devuelve el registro A real (y arregla la lección de dig)", () => {
    const out = term.execute("dig banco.nande");
    expect(out).toContain("ANSWER SECTION");
    expect(out).toContain("A");
    expect(out).toContain("10.10.7.10");
  });

  it("dig <dominio> TXT devuelve los registros TXT (SPF / verificación)", () => {
    const out = term.execute("dig nande TXT");
    expect(out).toContain("TXT");
    expect(out).toMatch(/spf1|verification/i);
  });

  it("dig -x hace DNS inverso (IP → nombre)", () => {
    const out = term.execute("dig -x 10.10.7.10");
    expect(out).toContain("PTR");
    expect(out).toContain("banco.nande");
  });

  it("dig respeta el envenenamiento de DNS (misma fuente que dnsspoof)", () => {
    term.execute("dnsspoof banco.nande 10.10.0.10");
    const out = term.execute("dig banco.nande");
    expect(out).toContain("10.10.0.10"); // resuelve a la IP falsa
    expect(out).not.toContain("10.10.7.10");
  });

  it("AXFR: una zona mal configurada filtra TODOS sus nombres internos", () => {
    const out = term.execute("dig axfr interna.nande");
    expect(out).toMatch(/EXITOSA/);
    // Revela hosts internos que no se ven desde la red del jugador.
    expect(out).toContain("nas.interna.nande");
    expect(out).toContain("db-core.interna.nande");
    // Es recon real: captura la bandera y enciende la señal MITRE (Reconnaissance).
    expect(out).toContain("ND{dns_zone_transfer}");
    expect(kernel.player.capturedFlags()).toContain("ND{dns_zone_transfer}");
    expect(kernel.mitre.recent(10).map((d) => d.mitreId)).toContain("T1590.002");
  });

  it("AXFR: una zona bien configurada RECHAZA la transferencia", () => {
    const out = term.execute("dig axfr nande");
    expect(out).toMatch(/RECHAZA|failed/i);
    expect(out).not.toContain("ND{dns_zone_transfer}");
  });

  it("el motor DNS: query por tipo y reverso son coherentes", () => {
    expect(kernel.dns.query("banco.nande", "A")[0].value).toBe("10.10.7.10");
    expect(kernel.dns.reverse("10.10.7.10")).toBe("banco.nande");
    expect(kernel.dns.zoneTransfer("interna.nande").allowed).toBe(true);
    expect(kernel.dns.zoneTransfer("nande").allowed).toBe(false);
  });
});
