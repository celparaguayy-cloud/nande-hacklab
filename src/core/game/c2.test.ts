import { describe, expect, it } from "vitest";
import { buildBotnet, runTask, checkDetection, detectionRisk } from "./C2";

describe("C2 / botnet simulado (tanda 23)", () => {
  it("la botnet se arma con labs resueltos y tomas de cuenta", () => {
    const bots = buildBotnet(["lab-web-01", "sql-lab"], ["ND{acceso:banco-justicia}", "ND{sqli_login_bypass}"]);
    // 2 labs + 1 acceso = 3 bots (la bandera que no es acceso no cuenta)
    expect(bots.length).toBe(3);
    expect(bots.some((b) => b.host === "banco-justicia.nande")).toBe(true);
  });

  it("una tarea devuelve salida conceptual del bot", () => {
    const bots = buildBotnet(["lab-web-01"], []);
    const out = runTask(bots[0], "recon");
    expect(out).toContain(bots[0].host);
    expect(out.toLowerCase()).toContain("recon");
  });

  it("la detección correcta es el beaconing; el riesgo sube con más bots", () => {
    expect(checkDetection("beacon")).toBe(true);
    expect(checkDetection("cpu")).toBe(false);
    const muchos = buildBotnet(["a", "b", "c", "d", "e", "f"], []);
    expect(["medio", "alto"]).toContain(detectionRisk(muchos).nivel);
  });
});
