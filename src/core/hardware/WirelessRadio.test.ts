import { beforeEach, describe, expect, it } from "vitest";
import { WirelessRadio } from "./WirelessRadio";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Suite WiFi — pruebas de REALIDAD. Cada paso exige el anterior: no hay atajo
 * "adivina la clave". Anti-mock: sin modo monitor no hay captura, sin cliente
 * no hay handshake, sin handshake no hay crackeo, y una clave fuera del
 * diccionario NO cae aunque el handshake esté capturado.
 */
describe("WirelessRadio — la cadena real de aircrack-ng", () => {
  let radio: WirelessRadio;
  beforeEach(() => { radio = new WirelessRadio(); });

  it("airodump/aireplay exigen modo monitor", () => {
    expect(radio.isMonitor()).toBe(false);
    expect(radio.deauth("Vecino-2G").ok).toBe(false);
    radio.startMonitor();
    expect(radio.isMonitor()).toBe(true);
    expect(radio.iface()).toBe("wlan0mon");
  });

  it("el deauth necesita un cliente asociado y captura el handshake", () => {
    radio.startMonitor();
    const r = radio.deauth("Vecino-2G");
    expect(r.ok).toBe(true);
    expect(r.captured).toBe(true);
    expect(radio.hasHandshake("Vecino-2G")).toBe(true);
  });

  it("una red abierta no tiene handshake que capturar (se espía en claro)", () => {
    radio.startMonitor();
    const r = radio.deauth("CaféÑandé-Free");
    expect(r.ok).toBe(true);
    expect(r.captured).toBe(false);
    expect(radio.hasHandshake("CaféÑandé-Free")).toBe(false);
  });

  it("aircrack NO cracker sin handshake, aunque la clave sea débil", () => {
    const r = radio.crack("Vecino-2G", "rockyou.txt");
    expect(r.ok).toBe(false);
    expect(r.found).toBe(false);
    expect(r.message).toContain("handshake");
  });

  it("con handshake y clave en el diccionario, la encuentra (clave débil)", () => {
    radio.startMonitor();
    radio.deauth("Vecino-2G");
    const r = radio.crack("Vecino-2G", "rockyou.txt");
    expect(r.found).toBe(true);
    expect(r.key).toBe("invitado");
    expect(r.flag).toBe("ND{wifi_wpa_crackeada}");
    expect(radio.crackedKey("Vecino-2G")).toBe("invitado");
  });

  it("una clave fuera del diccionario aguanta aunque haya handshake", () => {
    radio.startMonitor();
    radio.deauth("ÑANDE-Home"); // clave "nande1234", no está en rockyou chico
    const r = radio.crack("ÑANDE-Home", "rockyou.txt");
    expect(r.found).toBe(false);
    expect(r.message).toContain("KEY NOT FOUND");
  });

  it("WPA3 (SAE) no cae al diccionario offline del WPA2", () => {
    radio.startMonitor();
    radio.deauth("Corp-Secure");
    const r = radio.crack("Corp-Secure", "rockyou.txt");
    expect(r.found).toBe(false);
    expect(r.message).toContain("WPA3");
  });

  it("el tamaño del diccionario importa: una lista chica puede no tener la clave", () => {
    radio.startMonitor();
    radio.deauth("Vecino-2G");
    // "invitado" está en rockyou pero no en top10.txt.
    const chico = radio.crack("Vecino-2G", "corta.txt");
    expect(chico.found).toBe(false);
  });
});

describe("Suite WiFi desde la terminal — flujo completo", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => { resetStorage(); seedRandom(); kernel = new VirtualKernel(); term = new VirtualTerminal(kernel); });

  it("airmon → airodump → aireplay → aircrack captura la bandera y la registra", () => {
    expect(term.execute("airodump-ng wlan0mon")).toContain("modo monitor");
    term.execute("airmon-ng start wlan0");
    expect(term.execute("airodump-ng")).toContain("Vecino-2G");
    expect(term.execute("airodump-ng Vecino-2G")).toContain("aireplay-ng");
    term.execute("aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon");
    const out = term.execute("aircrack-ng -w rockyou.txt Vecino-2G");
    expect(out).toContain("KEY FOUND");
    expect(out).toContain("invitado");
    expect(kernel.player.capturedFlags()).toContain("ND{wifi_wpa_crackeada}");
  });
});
