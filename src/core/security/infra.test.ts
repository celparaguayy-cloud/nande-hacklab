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

  it("ataque PMKID clientless: sin cliente, hcxdumptool + hashcat -m 22000 crackean", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    t.execute("airmon-ng start wlan0");
    // Oficina-5G no tiene clientes: el deauth NO sirve.
    expect(t.execute("aireplay-ng --deauth 5 -a D8:47:32:AB:CD:06 wlan0mon")).toContain("no tiene clientes");
    // Pero filtra PMKID: se roba clientless y se crackea con hashcat -m 22000.
    const dump = t.execute("hcxdumptool Oficina-5G");
    expect(dump).toContain("PMKID capturado");
    expect(dump).toContain("WPA*01*"); // hash 22000 real
    expect(t.execute("hashcat -m 22000 pmkid.pcapng -w rockyou.txt Oficina-5G")).toContain("ND{wifi_pmkid_crackeado}");
  });

  it("WPA3 no expone PMKID (el ataque clientless no aplica)", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    t.execute("airmon-ng start wlan0");
    const out = t.execute("hcxdumptool Corp-Secure");
    expect(out).toMatch(/WPA3|SAE/);
    expect(out).not.toContain("WPA*01*");
  });

  it("proxychains llega a la red interna por pivoting", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    expect(t.execute("proxychains 10.10.9.10")).toContain("ND{pivot_interno}");
    expect(t.execute("proxychains 10.10.5.20")).not.toContain("ND{pivot_interno}");
  });
});
