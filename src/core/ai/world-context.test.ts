import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import {
  buildWorldContext,
  knowsHost,
  findHost,
  describeHosts,
} from "./WorldContext";
import { Assistant } from "./Assistant";
import { resetStorage, seedRandom } from "../../test/setup";

describe("WorldContext — Ñandú lee la verdad del runtime", () => {
  let kernel: VirtualKernel;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("incluye hosts públicos reales y NO los internos/ocultos", () => {
    const ctx = buildWorldContext(kernel);
    expect(ctx.hosts.length).toBeGreaterThan(0);
    expect(knowsHost(ctx, "banco.nande")).toBe(true);
    // caja.interna.nande sólo se alcanza pivotando: NO debe filtrarse.
    expect(knowsHost(ctx, "caja.interna.nande")).toBe(false);
  });

  it("trae al jugador, la misión y la lista de comandos reales", () => {
    const ctx = buildWorldContext(kernel);
    expect(ctx.player.heatMax).toBeGreaterThan(0);
    expect(ctx.tools).toContain("nmap");
    expect(ctx.mission).not.toBeNull();
  });

  it("findHost/describeHosts trabajan sobre datos reales", () => {
    const ctx = buildWorldContext(kernel);
    const h = findHost(ctx, "banco.nande");
    expect(h?.hostname).toBe("banco.nande");
    expect(describeHosts(ctx)).toContain(".nande");
  });
});

describe("Assistant anti-alucinación (Spec §154)", () => {
  let kernel: VirtualKernel;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  it("lista hosts REALES cuando se los piden", () => {
    const ctx = buildWorldContext(kernel);
    const a = new Assistant(kernel);
    const r = a.respond("¿qué máquinas puedo alcanzar?", ctx);
    expect(r.text).toContain(".nande");
  });

  it("NO inventa un host inexistente", () => {
    const ctx = buildWorldContext(kernel);
    const a = new Assistant(kernel);
    const r = a.respond("¿qué servicios tiene inventado-xyz.nande?", ctx);
    expect(r.text.toLowerCase()).toMatch(/no tengo|no me lo invento|no está/);
  });

  it("confirma un host real con una acción de escaneo", () => {
    const ctx = buildWorldContext(kernel);
    const a = new Assistant(kernel);
    const r = a.respond("¿qué servicios tiene banco.nande?", ctx);
    expect(r.action?.command).toContain("nmap banco.nande");
  });

  it("sin contexto sigue funcionando (compatibilidad hacia atrás)", () => {
    const a = new Assistant(kernel);
    const r = a.respond("dame un reto");
    expect(r.kind).toBe("action");
  });
});
