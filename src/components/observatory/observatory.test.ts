import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../../core/VirtualKernel";
import { APPS } from "../desktop/apps";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * El Observatory NO inventa: pinta kernel.worldState(). Este test fija el
 * contrato de datos que la UI necesita, así un cambio en el runtime que rompa
 * el panel se detecta acá y no en pantalla.
 */
describe("Observatory — contrato de datos y registro", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("la app 'observatory' está registrada en el dock 5.0", () => {
    const app = APPS.find((a) => a.id === "observatory");
    expect(app).toBeTruthy();
    expect(app!.category).toBe("ÑANDE 5.0");
    expect(app!.dock).toBe(true);
  });

  it("worldState() trae todo lo que el panel muestra", () => {
    const k = new VirtualKernel();
    const ws = k.worldState();
    expect(Array.isArray(ws.hosts)).toBe(true);
    expect(ws.hosts.length).toBeGreaterThan(0);
    expect(ws.hosts[0]).toHaveProperty("up");
    expect(ws.hosts[0]).toHaveProperty("services");
    expect(ws.alerts).toHaveProperty("critical");
    expect(ws.alerts).toHaveProperty("info");
    expect(typeof ws.people).toBe("number");
    expect(typeof ws.online).toBe("number");
    expect(Array.isArray(ws.runtimeEvents)).toBe(true);
    expect(["offline", "connected"]).toContain(ws.ai);
    k.dispose();
  });
});
