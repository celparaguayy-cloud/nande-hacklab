import { describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { md5 } from "../crypto/hash";
import { resetStorage, seedRandom } from "../../test/setup";

describe("Operación Génesis: campaña con consecuencias", () => {
  it("hackear el banco avanza la campaña y sacude la bolsa", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);

    const mbaAntes = k.economy.getStock("MBA")!.price;
    expect(k.campaign.getState().current).toBe(0);

    // Capítulo 1: evadir el login.
    const out1 = t.execute(
      `curl -X POST http://banco.nande/login -d "usuario=admin'--&password=x"`,
    );
    expect(out1).toMatch(/Cap[ií]tulo completado/i);

    // La bolsa reaccionó: MBA cayó.
    expect(k.economy.getStock("MBA")!.price).toBeLessThan(mbaAntes);
    // Notoriedad subió.
    expect(k.notoriety.getState().notoriety).toBeGreaterThan(0);
    // Avanzó al capítulo 2.
    expect(k.campaign.getState().current).toBe(1);
  });

  it("crack real completa el capítulo del hash", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    // Saltar a capítulo 3 completando 1 y 2.
    t.execute(`curl -X POST http://banco.nande/login -d "usuario=admin'--&password=x"`);
    t.execute(`curl -X POST http://banco.nande/login -d "usuario=rocio&password=girasol77"`);
    t.execute(`curl "http://banco.nande/movimientos?q=%25' UNION SELECT id, usuario, password, rol FROM usuarios -- "`);
    expect(k.campaign.getState().current).toBe(2);

    const out = t.execute(`crack ${md5("girasol")}`);
    expect(out).toContain("girasol");
    expect(k.campaign.getState().current).toBe(3);
  });

  it("forjar un JWT de admin completa la campaña", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    const t = new VirtualTerminal(k);
    // Forzar el estado a capítulo 4 reportando las señales previas.
    k.captureSignal("ND{sqli_login_bypass}");
    k.captureSignal("M8arete-2024!");
    k.captureSignal("CRACK:girasol");
    expect(k.campaign.getState().current).toBe(3);

    const out = t.execute("jwt forge nande rol=admin usuario=admin");
    expect(out).toMatch(/Operaci[oó]n G[eé]nesis/i);
    expect(k.campaign.getState().finished).toBe(true);
  });
});
