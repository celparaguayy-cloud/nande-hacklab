import { describe, expect, it } from "vitest";
import { avatarDataUri } from "./Avatar";

/** Los avatares son imágenes REALES generadas por código, deterministas. */
describe("avatarDataUri", () => {
  it("es un data URI de SVG válido", () => {
    const uri = avatarDataUri("ana-123");
    expect(uri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    expect(decodeURIComponent(uri)).toContain("<svg");
    expect(decodeURIComponent(uri)).toContain("<rect");
  });

  it("es determinista: mismo id → misma imagen", () => {
    expect(avatarDataUri("bruno")).toBe(avatarDataUri("bruno"));
  });

  it("ids distintos dan imágenes distintas", () => {
    expect(avatarDataUri("ana")).not.toBe(avatarDataUri("bruno"));
  });
});
