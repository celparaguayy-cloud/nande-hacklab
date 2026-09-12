import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * NandeShark — pruebas de REALIDAD. El sniffer sólo captura tráfico que de
 * verdad viajó por la red virtual. Anti-mock: provocamos tráfico real y
 * comprobamos que aparece exactamente ese tráfico, no un texto inventado.
 */
describe("PacketCapture / NandeShark — captura tráfico real", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("una petición HTTP real deja un paquete HTTP capturado", () => {
    const before = kernel.shark.count();
    kernel.browser.request("GET", "banco.nande", "/");
    expect(kernel.shark.count()).toBeGreaterThan(before);

    const http = kernel.shark.filter("http");
    const last = http[http.length - 1];
    expect(last.proto).toBe("HTTP");
    expect(last.dst).toBe(kernel.dns.resolve("banco.nande")); // dst es la IP real
    expect(last.summary).toContain("banco.nande");
  });

  it("una credencial enviada en claro (HTTP) se ve en el cable como fuga", () => {
    // Enviar un formulario de login por HTTP: el cuerpo viaja en claro.
    kernel.browser.request("POST", "banco.nande", "/login", {
      username: "ana",
      password: "SecretoDeAna",
    });

    const creds = kernel.shark.credentials();
    expect(creds.length).toBeGreaterThan(0);
    const found = creds.find((c) => c.value === "SecretoDeAna");
    expect(found).toBeDefined();
    expect(found!.field.toLowerCase()).toBe("password");
  });

  it("un login por SSH deja un paquete AUTH (éxito o fallo real)", () => {
    // server.nande tiene credenciales soporte/Verano2024.
    kernel.hosts.authenticate("server.nande", "soporte", "malapass");
    kernel.hosts.authenticate("server.nande", "soporte", "Verano2024");

    const auth = kernel.shark.filter("auth");
    expect(auth.length).toBeGreaterThanOrEqual(2);
    expect(auth.some((p) => p.summary.includes("FAIL"))).toBe(true);
    expect(auth.some((p) => p.summary.includes("OK"))).toBe(true);
  });

  it("el comando 'sniff creds' muestra la credencial capturada", () => {
    kernel.browser.request("POST", "banco.nande", "/login", {
      user: "x",
      clave: "Abrete2024",
    });
    const out = term.execute("sniff creds");
    expect(out).toContain("Abrete2024");
  });

  it("filtro por host devuelve sólo el tráfico de ese host", () => {
    kernel.browser.request("GET", "banco.nande", "/");
    kernel.browser.request("GET", "server.nande", "/");
    const solo = kernel.shark.filter("host==banco.nande");
    expect(solo.length).toBeGreaterThan(0);
    expect(solo.every((p) => p.dst.includes(kernel.dns.resolve("banco.nande")!))).toBe(true);
  });
});
