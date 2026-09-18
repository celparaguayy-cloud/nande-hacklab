import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * nmap — pruebas de REALIDAD. El estado de cada puerto sale del mundo vivo:
 * un servicio detenido pasa a "closed", un puerto en el firewall a "filtered",
 * y las banderas (-p, -p-, -sV, -O/-A, --top-ports) cambian de verdad la salida.
 */
describe("nmap — escaneo real sobre el estado vivo del host", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => { resetStorage(); seedRandom(); kernel = new VirtualKernel(); term = new VirtualTerminal(kernel); });

  it("escaneo por defecto lista los puertos abiertos y colapsa los cerrados", () => {
    const out = term.execute("nmap server.nande");
    expect(out).toContain("22/tcp");
    expect(out).toContain("open");
    expect(out).toMatch(/Not shown: \d+ closed tcp ports/);
  });

  it("-sV agrega la columna de versión de los servicios reales", () => {
    const out = term.execute("nmap -sV server.nande");
    expect(out).toContain("VERSION");
    expect(out).toContain("nginx/1.24");
  });

  it("-p con lista muestra CADA puerto pedido con su estado real", () => {
    const out = term.execute("nmap -p 22,80,443 server.nande");
    expect(out).toContain("22/tcp");
    expect(out).toContain("443/tcp");
    expect(out).toContain("closed"); // 443 no tiene servicio
  });

  it("-p- reporta los 65535 puertos (colapsando los cerrados)", () => {
    const out = term.execute("nmap -p- server.nande");
    expect(out).toMatch(/Not shown: 655\d\d closed tcp ports/);
    expect(out).toContain("22/tcp");
  });

  it("-A hace detección de versión y de sistema operativo", () => {
    const out = term.execute("nmap -A server.nande");
    expect(out).toContain("VERSION");
    expect(out).toContain("OS details");
  });

  it("detener un servicio real cierra su puerto en el próximo escaneo", () => {
    expect(term.execute("nmap -p 80 server.nande")).toContain("open");
    kernel.hosts.stopService("server.nande", "nginx");
    const out = term.execute("nmap -p 80 server.nande");
    expect(out).toContain("closed");
    expect(out).not.toMatch(/80\/tcp\s+open/);
  });

  it("un puerto en el firewall aparece como filtered, no closed", () => {
    kernel.hosts.blockPort("server.nande", 22);
    const out = term.execute("nmap -p 22 server.nande");
    expect(out).toContain("filtered");
  });

  it("--top-ports limita el escaneo a los N más comunes", () => {
    const out = term.execute("nmap --top-ports 5 server.nande");
    expect(out).toMatch(/Not shown: \d+ closed tcp ports/);
    expect(out).toContain("22/tcp");
  });

  it("rechaza objetivos fuera del sandbox", () => {
    expect(term.execute("nmap google.com")).toContain("fuera del sandbox");
  });
});
