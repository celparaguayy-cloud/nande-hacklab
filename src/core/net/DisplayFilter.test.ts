import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { compileFilter } from "./DisplayFilter";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Filtro de visualización estilo Wireshark — pruebas del lenguaje REAL.
 * No es un includes: se parsea la expresión y se evalúa sobre paquetes de
 * verdad capturados del mundo.
 */
describe("DisplayFilter — lenguaje de filtros de Wireshark", () => {
  let kernel: VirtualKernel;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    kernel.browser.request("GET", "banco.nande", "/");
    kernel.browser.request("POST", "banco.nande", "/login", { user: "ana", password: "Clave123" });
    kernel.browser.request("GET", "server.nande", "/");
  });

  it("filtra por protocolo suelto (http)", () => {
    const r = kernel.shark.filter("http");
    expect(r.length).toBeGreaterThanOrEqual(3);
    expect(r.every((p) => p.proto === "HTTP")).toBe(true);
  });

  it("compara método con http.request.method == \"POST\"", () => {
    const r = kernel.shark.filter('http.request.method == "POST"');
    expect(r.length).toBe(1);
    expect(r[0].method).toBe("POST");
  });

  it("soporta and / not: http and not http.request.method == \"POST\"", () => {
    const r = kernel.shark.filter('http and not http.request.method == "POST"');
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r.every((p) => p.method !== "POST")).toBe(true);
  });

  it("compara números: frame.len > 0 y http.response.code", () => {
    expect(kernel.shark.filter("frame.len > 0").length).toBeGreaterThan(0);
    const ok = kernel.shark.filter("http.response.code >= 200");
    expect(ok.length).toBeGreaterThan(0);
  });

  it("contains busca en el texto del paquete", () => {
    const r = kernel.shark.filter('frame contains "login"');
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r.some((p) => p.path === "/login")).toBe(true);
  });

  it("http.host contains y or con paréntesis", () => {
    const r = kernel.shark.filter('http.host contains "banco" or http.host contains "server"');
    expect(r.length).toBeGreaterThanOrEqual(3);
  });

  it("nande.leak filtra las credenciales en claro", () => {
    const r = kernel.shark.filter("nande.leak");
    expect(r.length).toBe(1);
    expect(r[0].leak?.value).toBe("Clave123");
  });

  it("sintaxis inválida se reporta (no tira) y filtra a vacío", () => {
    const bad = kernel.shark.validateFilter("http.request.method ==");
    expect(bad.ok).toBe(false);
    expect(kernel.shark.filter("http.request.method ==").length).toBe(0);

    const unknown = compileFilter("no.existe == 1");
    expect(unknown.ok).toBe(false);
  });

  it("hexdump y jerarquía de protocolos salen de tráfico real", () => {
    const pkt = kernel.shark.filter("http")[0];
    const dump = kernel.shark.hexdump(pkt);
    expect(dump).toMatch(/^0000 /);
    expect(dump.toUpperCase()).toContain("GET");

    const hier = kernel.shark.protocolHierarchy();
    expect(hier.length).toBeGreaterThan(0);
    expect(hier[0].count).toBeGreaterThan(0);
  });

  it("follow stream reensambla la conversación con un host", () => {
    const pkt = kernel.shark.filter('http.host contains "banco"')[0];
    const stream = kernel.shark.followStream(pkt);
    expect(stream.packets.length).toBeGreaterThanOrEqual(2);
    expect(stream.text).toContain("→");
  });
});
