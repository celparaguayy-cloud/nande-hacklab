import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

describe("labs de red e infraestructura (tanda 5)", () => {
  it("tcpdump sobre un servicio sin cifrar captura credenciales", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    const labs = k.tools.labs();
    // Busca una máquina con servicio en claro (ftp/telnet/http).
    const conClaro = labs.find((m) => m.services.some((s) => ["ftp","telnet","http"].includes(s.name)));
    const out = t.execute(`tcpdump ${conClaro?.ip ?? labs[0].ip}`);
    if (conClaro) expect(out).toContain("ND{sniff_credenciales}");
  });

  it("arpspoof contra una víctima de laboratorio intercepta la sesión", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    const ip = k.tools.labs()[0].ip;
    expect(t.execute(`arpspoof ${ip}`)).toContain("ND{arp_mitm}");
  });

  it("aircrack-ng crackea una clave débil pero no una fuerte", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    expect(t.execute("aircrack-ng Vecino-2G")).toContain("ND{wifi_wpa_crackeada}");
    expect(t.execute("aircrack-ng Corp-Secure")).not.toContain("ND{wifi_wpa_crackeada}");
  });

  it("proxychains llega a la red interna por pivoting", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    expect(t.execute("proxychains 10.10.9.10")).toContain("ND{pivot_interno}");
    expect(t.execute("proxychains 10.10.5.20")).not.toContain("ND{pivot_interno}");
  });
});
