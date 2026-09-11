import { describe, expect, it } from "vitest";
import { factionStandingFor, FACTIONS } from "./Factions";

const get = (flags: string[], id: string) =>
  factionStandingFor(flags).find((s) => s.faction.id === id)!;

describe("facciones", () => {
  it("sin actividad, todos neutrales", () => {
    const st = factionStandingFor([]);
    expect(st.length).toBe(FACTIONS.length);
    expect(st.every((s) => s.tier === "neutral")).toBe(true);
  });

  it("atacar sube con los ofensivos y baja con SENTINEL", () => {
    const flags = Array.from({ length: 6 }, (_, i) => `ND{ataque_${i}}`);
    expect(get(flags, "nightbyte").score).toBeGreaterThan(0);
    expect(get(flags, "phantom").score).toBeGreaterThan(0);
    expect(get(flags, "sentinel").score).toBeLessThan(0);
  });

  it("defender sube con SENTINEL", () => {
    const flags = ["ND{forense_intrusion}", "ND{soc_triage}", "ND{siem_correlacion}", "ND{dfir_timeline}"];
    expect(get(flags, "sentinel").score).toBeGreaterThan(20);
  });

  it("robar sube con BLACK CIRCUIT y hunde a SENTINEL", () => {
    const flags = ["ND{acceso:banco-justicia}", "ND{acceso:gulu}", "ND{acceso:nova}"];
    expect(get(flags, "blackcircuit").tier).not.toBe("neutral");
    expect(get(flags, "sentinel").score).toBeLessThan(0);
  });
});
