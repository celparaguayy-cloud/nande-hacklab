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

  it("la suite WiFi crackea un WPA2 débil pero no un WPA3", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    t.execute("airmon-ng start wlan0");
    // Débil: se captura el handshake y cae al diccionario.
    t.execute("aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon");
    expect(t.execute("aircrack-ng -w rockyou.txt Vecino-2G")).toContain("ND{wifi_wpa_crackeada}");
    // WPA3 (SAE): aunque captures, el diccionario offline no aplica.
    t.execute("aireplay-ng --deauth 5 -a B0:BE:76:99:AA:05 wlan0mon");
    expect(t.execute("aircrack-ng -w rockyou.txt Corp-Secure")).not.toContain("ND{wifi_wpa_crackeada}");
  });

  it("proxychains llega a la red interna por pivoting", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    expect(t.execute("proxychains 10.10.9.10")).toContain("ND{pivot_interno}");
    expect(t.execute("proxychains 10.10.5.20")).not.toContain("ND{pivot_interno}");
  });
});
