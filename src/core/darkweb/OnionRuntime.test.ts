import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Dark web sim — pruebas de REALIDAD. La reachability de un .onion depende del
 * ESTADO real de anonimato, no de un flag decorativo. Anti-mock: el mismo
 * servicio es inalcanzable sin circuito y alcanzable con él.
 */
describe("OnionRuntime — servicios ocultos gated por el circuito", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("sin circuito, un .onion es inalcanzable", () => {
    expect(kernel.anonymity.isTorEnabled()).toBe(false);
    const r = kernel.onion.browse("biblioteca7k2fx.onion");
    expect(r.ok).toBe(false);
    expect(r.message).toContain("anonimato");
  });

  it("con el circuito activo, el mismo .onion responde", () => {
    kernel.anonymity.enableTor();
    const r = kernel.onion.browse("biblioteca7k2fx.onion");
    expect(r.ok).toBe(true);
    expect(r.site!.title).toContain("Biblioteca");
  });

  it("desde la terminal: sin anon falla, con anon captura la bandera", () => {
    const denied = term.execute("onion biblioteca7k2fx.onion");
    expect(denied).toContain("anon on");

    term.execute("anon on");
    const out = term.execute("onion biblioteca7k2fx.onion");
    expect(out).toContain("ND{onion_alcanzada_con_circuito}");
    expect(kernel.player.capturedFlags()).toContain("ND{onion_alcanzada_con_circuito}");
  });

  it("el directorio lista los servicios ocultos conocidos", () => {
    const dir = kernel.onion.directory();
    expect(dir.length).toBeGreaterThanOrEqual(3);
    expect(dir.every((s) => s.address.endsWith(".onion"))).toBe(true);
  });
});
