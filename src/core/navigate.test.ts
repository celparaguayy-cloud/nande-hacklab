import { describe, expect, it } from "vitest";
import { VirtualKernel } from "./VirtualKernel";
import { resetStorage, seedRandom } from "../test/setup";

describe("navegación desde el Mundo 2D (tanda 22)", () => {
  it("navigateBrowser deja la URL pendiente y emite el evento", () => {
    resetStorage(); seedRandom();
    const k = new VirtualKernel();
    let recibido = "";
    k.events.subscribe("browser.navigate", (e) => { recibido = (e.data as { url?: string }).url ?? ""; });
    k.navigateBrowser("banco-justicia.nande");
    expect(k.pendingUrl).toBe("banco-justicia.nande");
    expect(recibido).toBe("banco-justicia.nande");
    // El destino existe como app web (se puede entrar a hackearlo).
    expect(k.browser.isWebApp("banco-justicia.nande")).toBe(true);
  });
});
