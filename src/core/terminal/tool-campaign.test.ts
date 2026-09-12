import { describe, expect, it, beforeEach } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "./VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Regresión de progresión: los capítulos que se resuelven con HERRAMIENTAS de
 * la terminal (el pivoting con proxychains, el sniffing con tcpdump) tienen que
 * avanzar la campaña. Antes, la terminal mostraba la bandera pero no la pasaba
 * por scanForSignals como sí hace el navegador y curl, así que la campaña se
 * TRABABA en el capítulo del pivoting aunque el jugador hiciera todo bien.
 */
describe("las herramientas de la terminal avanzan la campaña", () => {
  let k: VirtualKernel;
  let t: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    k = new VirtualKernel();
    t = new VirtualTerminal(k);
    // Adelantar la campaña hasta el capítulo del pivoting (c5).
    for (const f of [
      "ND{sqli_login_bypass}",
      "M8arete-2024!",
      "CRACK:girasol",
      "ND{jwt_forged_admin}",
    ]) {
      k.captureSignal(f);
    }
  });

  it("proxychains resuelve el capítulo del pivoting y avanza", () => {
    const antes = k.campaign.getState().current;
    const out = t.execute("proxychains 10.10.9.10");
    expect(out).toContain("ND{pivot_interno}");
    expect(k.campaign.getState().current).toBeGreaterThan(antes);
  });

  it("tcpdump resuelve el capítulo del sniffing y avanza", () => {
    t.execute("proxychains 10.10.9.10"); // c5
    const antes = k.campaign.getState().current;
    const out = t.execute("tcpdump 10.10.5.20"); // c6
    expect(out).toContain("ND{sniff_credenciales}");
    expect(k.campaign.getState().current).toBeGreaterThan(antes);
  });

  it("crack real (hash del hint) avanza el capítulo del hash desde cero", () => {
    resetStorage();
    seedRandom();
    const k2 = new VirtualKernel();
    const t2 = new VirtualTerminal(k2);
    // c1, c2 por señal directa; c3 debe salir del crack real.
    k2.captureSignal("ND{sqli_login_bypass}");
    k2.captureSignal("M8arete-2024!");
    const antes = k2.campaign.getState().current;
    // md5("girasol") — el hash que el hint entrega para este capítulo.
    t2.execute("crack b9da943bf1dcb00b784cf3612d450f91");
    expect(k2.campaign.getState().current).toBeGreaterThan(antes);
  });
});
