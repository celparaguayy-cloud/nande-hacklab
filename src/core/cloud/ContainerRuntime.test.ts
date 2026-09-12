import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { ContainerRuntime, NODE_FLAG, K8S_SECRET_FLAG } from "./ContainerRuntime";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Contenedores/K8s virtual — pruebas de REALIDAD. Las fallas son de estado:
 * `exec env` muestra el env real (y el secreto filtrado); `escape` sólo
 * funciona si el contenedor es privilegiado y monta el host. Anti-mock: la
 * bandera se obtiene por la falla real, no por un texto.
 */
describe("ContainerRuntime — fallas cloud-native reales", () => {
  let cr: ContainerRuntime;

  beforeEach(() => {
    cr = new ContainerRuntime();
  });

  it("el frontend sano no filtra secretos ni puede escapar", () => {
    expect(cr.leakedSecrets("web-frontend")).toEqual([]);
    expect(cr.canEscape("web-frontend")).toBe(false);
  });

  it("el pod de API filtra un secreto (y la bandera) en su env", () => {
    const leaks = cr.leakedSecrets("api-backend");
    expect(leaks.length).toBeGreaterThan(0);
    const env = cr.env("api-backend")!;
    expect(Object.values(env)).toContain(K8S_SECRET_FLAG);
  });

  it("sólo el contenedor privilegiado con host montado puede escapar", () => {
    expect(cr.canEscape("debug-tools")).toBe(true);
    expect(cr.canEscape("api-backend")).toBe(false);

    const bad = cr.escape("api-backend");
    expect(bad.ok).toBe(false);

    const good = cr.escape("debug-tools");
    expect(good.ok).toBe(true);
    expect(good.content).toBe(NODE_FLAG);
  });

  it("desde la terminal: exec env expone y captura la bandera del secreto", () => {
    resetStorage();
    seedRandom();
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    const out = term.execute("nandec exec api-backend env");
    expect(out).toContain(K8S_SECRET_FLAG);
    expect(kernel.player.capturedFlags()).toContain(K8S_SECRET_FLAG);
  });

  it("desde la terminal: escape del pod privilegiado captura la bandera del nodo", () => {
    resetStorage();
    seedRandom();
    const kernel = new VirtualKernel();
    const term = new VirtualTerminal(kernel);

    const denied = term.execute("nandec escape web-frontend");
    expect(denied).toContain("no hay escape");

    const out = term.execute("nandec escape debug-tools");
    expect(out).toContain(NODE_FLAG);
    expect(kernel.player.capturedFlags()).toContain(NODE_FLAG);
  });
});
