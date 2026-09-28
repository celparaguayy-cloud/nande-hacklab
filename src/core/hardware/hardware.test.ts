import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualHardware } from "./VirtualHardware";
import { VirtualWiFi } from "./VirtualWiFi";
import { WirelessRadio } from "./WirelessRadio";
import { VirtualNetwork } from "../network/VirtualNetwork";
import { resetStorage, seedRandom } from "../../test/setup";

describe("VirtualHardware", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("expone specs coherentes", () => {
    const hw = new VirtualHardware();
    const s = hw.getSpec();

    expect(s.cpu.cores).toBeGreaterThan(0);
    expect(s.ram.used).toBeLessThanOrEqual(s.ram.total);
    expect(hw.ramUsagePercent()).toBeGreaterThanOrEqual(0);
    expect(hw.ramUsagePercent()).toBeLessThanOrEqual(100);
  });

  it("el hostname se puede cambiar y persiste", () => {
    const hw = new VirtualHardware();
    hw.setHostname("mi-pc");

    expect(hw.getSpec().hostname).toBe("mi-pc");
    expect(new VirtualHardware().getSpec().hostname).toBe("mi-pc");
  });

  it("neofetch muestra las specs", () => {
    const out = new VirtualHardware().render();
    expect(out).toContain("CPU");
    expect(out).toContain("RAM");
    expect(out).toContain("student-pc");
  });
});

describe("VirtualWiFi", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  function build() {
    const network = new VirtualNetwork();
    return { network, wifi: new VirtualWiFi(network, new WirelessRadio()) };
  }

  it("escanea redes ordenadas por señal, sin exponer contraseñas", () => {
    const { wifi } = build();
    const nets = wifi.scan();

    expect(nets.length).toBeGreaterThan(0);
    expect(nets[0].signal).toBeGreaterThanOrEqual(nets[1].signal);
    for (const n of nets) {
      expect(n.password).toBeUndefined();
    }
  });

  it("una red protegida exige la contraseña correcta", () => {
    const { wifi } = build();

    expect(wifi.connect("ÑANDE-Home").ok).toBe(false);
    expect(wifi.connect("ÑANDE-Home", "malaclave").ok).toBe(false);
    expect(wifi.connect("ÑANDE-Home", "nande1234").ok).toBe(true);
    expect(wifi.current()).toBe("ÑANDE-Home");
  });

  it("una red abierta no pide contraseña", () => {
    const { wifi } = build();
    expect(wifi.connect("CaféÑandé-Free").ok).toBe(true);
  });

  it("fuente única: 'wifi scan' ve el MISMO aire que airodump (WirelessRadio), sin listas paralelas", () => {
    const network = new VirtualNetwork();
    const radio = new WirelessRadio();
    const wifi = new VirtualWiFi(network, radio);
    // Mismas redes que la radio (antes eran dos listas hardcodeadas distintas).
    const scanned = wifi.scan().map((n) => n.ssid).sort();
    const air = radio.accessPoints().map((a) => a.essid).sort();
    expect(scanned).toEqual(air);
    // Y la clave real es la del aire: la MISMA que recupera aircrack te conecta.
    const ap = radio.resolve("Vecino-2G")!;
    expect(wifi.connect("Vecino-2G", ap.password).ok).toBe(true);
    // La seguridad también sale de la radio (WPA3 se refleja como WPA3).
    const lab = wifi.scan().find((n) => n.ssid === "ÑANDE-Lab")!;
    expect(lab.security).toBe("WPA3");
  });

  it("conectar levanta wlan0 y desconectar la baja", () => {
    const { network, wifi } = build();

    wifi.connect("CaféÑandé-Free");
    expect(network.getInterface("wlan0")?.up).toBe(true);

    wifi.disconnect();
    expect(network.getInterface("wlan0")?.up).toBe(false);
  });

  it("la conexión wifi persiste entre sesiones", () => {
    const network = new VirtualNetwork();
    new VirtualWiFi(network, new WirelessRadio()).connect("CaféÑandé-Free");

    // Nueva red + wifi simulan recargar la página.
    const network2 = new VirtualNetwork();
    const wifi2 = new VirtualWiFi(network2, new WirelessRadio());

    expect(wifi2.current()).toBe("CaféÑandé-Free");
    expect(network2.getInterface("wlan0")?.up).toBe(true);
  });
});

describe("red por cable o wifi en el kernel", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("sin cable ni wifi no se navega; con wifi sí", () => {
    const kernel = new VirtualKernel();

    expect(kernel.browser.canOpen("www.nande")).toBe(true);

    // Se baja el cable: se queda sin red.
    kernel.network.setInterfaceState("eth0", false);
    expect(kernel.browser.canOpen("www.nande")).toBe(false);

    // Se conecta por wifi: vuelve el acceso.
    expect(kernel.wifi.connect("ÑANDE-Home", "nande1234").ok).toBe(true);
    expect(kernel.browser.canOpen("www.nande")).toBe(true);

    kernel.dispose();
  });

  it("el wifi no da acceso a Internet real", () => {
    const kernel = new VirtualKernel();
    kernel.wifi.connect("ÑANDE-Home", "nande1234");

    // Conectado o no, nada fuera de la red virtual es alcanzable.
    expect(kernel.network.isReachable("8.8.8.8")).toBe(false);
    expect(kernel.browser.canOpen("google.com")).toBe(false);

    kernel.dispose();
  });
});
