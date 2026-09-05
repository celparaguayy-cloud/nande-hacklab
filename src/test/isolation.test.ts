import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VirtualKernel } from "../core/VirtualKernel";
import { resetStorage, seedRandom } from "./setup";

/**
 * Aislamiento del sandbox.
 *
 * ÑANDE simula una Internet completa, y estas pruebas son la garantia
 * estructural de que esa simulacion no toca la red real: se interceptan
 * todas las salidas posibles del entorno y se comprueba que el mundo
 * puede arrancar, avanzar, publicar sitios y navegarlos sin usar ninguna.
 */

function installNetworkTraps() {
  const calls: string[] = [];

  const trap = (name: string) =>
    vi.fn((...args: unknown[]) => {
      calls.push(`${name}(${String(args[0])})`);
      throw new Error(`Salida de red bloqueada: ${name}`);
    });

  const originals = {
    fetch: globalThis.fetch,
    XMLHttpRequest: (globalThis as Record<string, unknown>).XMLHttpRequest,
    WebSocket: (globalThis as Record<string, unknown>).WebSocket,
    EventSource: (globalThis as Record<string, unknown>).EventSource,
    sendBeacon: globalThis.navigator?.sendBeacon,
  };

  globalThis.fetch = trap("fetch") as unknown as typeof fetch;
  (globalThis as Record<string, unknown>).XMLHttpRequest = trap("XMLHttpRequest");
  (globalThis as Record<string, unknown>).WebSocket = trap("WebSocket");
  (globalThis as Record<string, unknown>).EventSource = trap("EventSource");

  return {
    calls,
    restore() {
      globalThis.fetch = originals.fetch as typeof fetch;
      (globalThis as Record<string, unknown>).XMLHttpRequest = originals.XMLHttpRequest;
      (globalThis as Record<string, unknown>).WebSocket = originals.WebSocket;
      (globalThis as Record<string, unknown>).EventSource = originals.EventSource;
      void originals.sendBeacon;
    },
  };
}

describe("aislamiento del sandbox", () => {
  let traps: ReturnType<typeof installNetworkTraps>;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    traps = installNetworkTraps();
  });

  afterEach(() => {
    traps.restore();
  });

  it("el mundo arranca y avanza sin tocar la red real", () => {
    const kernel = new VirtualKernel();

    for (let tick = 1; tick <= 300; tick++) {
      kernel.tick();
    }

    expect(traps.calls).toEqual([]);
  });

  it("navegar la Internet virtual no genera trafico real", () => {
    const kernel = new VirtualKernel();

    for (const host of [
      "www.nande",
      "video.nande",
      "academy.nande",
      "news.nande",
      "git.nande",
      "ctf.nande",
      "shop.nande",
    ]) {
      expect(kernel.browser.canOpen(host), host).toBe(true);
    }

    expect(traps.calls).toEqual([]);
  });

  it("los agentes publican sitios sin salir del sandbox", () => {
    const kernel = new VirtualKernel();

    for (let tick = 1; tick <= 1200; tick++) {
      kernel.tick();
    }

    const published = kernel.publisher.listPublished();

    expect(published.length).toBeGreaterThan(0);
    expect(traps.calls).toEqual([]);

    // Todo dominio publicado vive en la zona virtual .nande
    for (const hostname of published) {
      expect(hostname.endsWith(".nande")).toBe(true);
      expect(kernel.dns.resolve(hostname)).toMatch(/^10\.10\./);
    }
  });

  it("ninguna direccion del mundo cae fuera de la red virtual", () => {
    const kernel = new VirtualKernel();

    for (let tick = 1; tick <= 800; tick++) {
      kernel.tick();
    }

    for (const record of kernel.dns.listRecords()) {
      expect(record.address, record.hostname).toMatch(/^10\.10\.\d+\.\d+$/);
    }

    for (const iface of kernel.network.listInterfaces()) {
      expect(iface.ip, iface.name).toMatch(/^(10\.10\.|127\.0\.0\.1)/);
    }
  });

  it("los dominios reales no se resuelven ni se navegan", () => {
    const kernel = new VirtualKernel();

    for (const host of [
      "google.com",
      "github.com",
      "anthropic.com",
      "localhost",
      "127.0.0.1",
      "8.8.8.8",
    ]) {
      expect(kernel.dns.resolve(host), host).toBeUndefined();
      expect(kernel.browser.canOpen(host), host).toBe(false);
    }

    expect(traps.calls).toEqual([]);
  });

  it("las direcciones fuera de la red virtual son inalcanzables", () => {
    const kernel = new VirtualKernel();

    for (const address of ["8.8.8.8", "1.1.1.1", "192.168.0.1", "172.16.0.1"]) {
      expect(kernel.network.isReachable(address), address).toBe(false);
    }
  });

  it("el codigo del mundo virtual no invoca APIs de red", async () => {
    // Barrido estatico: ningun modulo del nucleo debe usar salidas reales.
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");

    const prohibidos = [
      "fetch(",
      "XMLHttpRequest",
      "WebSocket",
      "EventSource",
      "navigator.sendBeacon",
      "node:http",
      "node:dns",
      "node:net",
    ];

    const ofensas: string[] = [];

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);

        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }

        if (!full.endsWith(".ts") || full.endsWith(".test.ts")) {
          continue;
        }

        const content = readFileSync(full, "utf-8");

        for (const termino of prohibidos) {
          if (content.includes(termino)) {
            ofensas.push(`${full}: ${termino}`);
          }
        }
      }
    };

    walk("src/core");

    expect(ofensas).toEqual([]);
  });

  it("las herramientas de seguridad no alcanzan objetivos reales", () => {
    const kernel = new VirtualKernel();

    // Objetivos reales tipicos: ninguna herramienta ejecutable debe tocarlos.
    for (const objetivo of ["8.8.8.8", "1.1.1.1", "google.com", "github.com"]) {
      for (const tool of ["nmap", "ping", "curl", "gobuster"]) {
        const arg =
          tool === "curl" ? `http://${objetivo}/` : objetivo;

        const res = kernel.tools.run(tool, [arg]);

        expect(
          res.output.includes("fuera del sandbox") ||
            res.output.includes("solo") ||
            res.isError,
          `${tool} ${objetivo}`,
        ).toBe(true);
      }
    }

    expect(traps.calls).toEqual([]);

    kernel.dispose();
  });
});
