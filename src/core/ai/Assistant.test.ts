import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { Assistant } from "./Assistant";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Assistant (Ñandú agente) — pruebas de REALIDAD. El asistente no "muestra"
 * texto de relleno: interpreta el pedido y EJECUTA el comando real del juego,
 * devolviendo la salida verdadera. Anti-mock: la acción cambia/lee el estado
 * real (nmap, dfir, reto) y el output es el del comando, no un template.
 */
describe("Assistant — un agente que HACE, no una vitrina", () => {
  let kernel: VirtualKernel;
  let agent: Assistant;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    agent = new Assistant(kernel);
  });

  it("un pedido de escaneo produce una acción ejecutable de nmap", () => {
    const r = agent.respond("escaneá objetivo.corp.nande");
    expect(r.kind).toBe("action");
    expect(r.action?.command).toBe("nmap objetivo.corp.nande");
    // Y ejecutarla da la salida REAL del nmap (no un texto inventado).
    const out = agent.run(r.action!.command);
    expect(out.toLowerCase()).toContain("objetivo.corp.nande");
  });

  it("pedir un reto ejecuta un comando real que asigna un objetivo", () => {
    const r = agent.respond("dame un reto");
    expect(r.action?.command).toBe("reto");
    const out = agent.run(r.action!.command);
    // El comando real asigna un objetivo para vulnerar (salida verdadera).
    expect(out).toContain("OBJETIVO");
  });

  it("nunca devuelve relleno: sin match, ofrece una acción útil", () => {
    const r = agent.respond("asdkjfhaskdjfh");
    expect(r.text).not.toContain("Probá y volvé");
    expect(r.action).toBeDefined(); // siempre algo ejecutable
  });

  it("pedir código Python devuelve código real, no una frase", () => {
    const r = agent.respond("escribime un port scanner en python");
    expect(r.kind).toBe("code");
    expect(r.text).toContain("import socket");
    expect(r.text).toContain("connect_ex");
  });

  it("una pregunta conceptual da una respuesta con contenido de verdad", () => {
    const r = agent.respond("qué es kerberoasting");
    expect(r.kind).toBe("knowledge");
    expect(r.text.toLowerCase()).toContain("tgs");
  });

  it("pedir la investigación corre el DFIR real tras un ataque", () => {
    for (let i = 0; i < 8 && !kernel.redteam.compromised(); i += 1) kernel.redteam.act(100 + i);
    const r = agent.respond("investigá el incidente");
    expect(r.action?.command).toBe("dfir");
    const out = agent.run(r.action!.command);
    expect(out).toContain("reconstrucción del incidente");
  });
});
