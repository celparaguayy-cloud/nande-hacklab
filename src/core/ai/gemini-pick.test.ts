import { describe, expect, it } from "vitest";
import { pickGeminiModel } from "./net/ConnectedProviders";

/**
 * Elegir un modelo de Gemini que ande (evita 404 por adivinar nombres):
 * prioriza flash estable, evita previews/experimentales.
 */
describe("pickGeminiModel", () => {
  it("prefiere un flash estable sobre previews/experimentales", () => {
    const models = [
      "gemini-1.0-pro-vision",
      "gemini-2.0-flash-exp",
      "gemini-2.0-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-2.5-flash-thinking-exp",
    ];
    const pick = pickGeminiModel(models);
    expect(pick).toMatch(/flash/);
    expect(pick).not.toMatch(/exp|thinking|vision/);
  });

  it("devuelve null si no hay modelos", () => {
    expect(pickGeminiModel([])).toBeNull();
  });

  it("igual elige algo aunque no haya flash", () => {
    expect(pickGeminiModel(["gemini-1.5-pro", "gemini-1.0-pro"])).toBeTruthy();
  });
});
