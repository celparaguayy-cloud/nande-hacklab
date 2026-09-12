import { describe, expect, it } from "vitest";
import { buildReport } from "./Report";

describe("informe de competencia (tanda 20)", () => {
  it("sin banderas: informe vacío coherente", () => {
    const r = buildReport([]);
    expect(r.total).toBe(0);
    expect(r.findings).toEqual([]);
    expect(r.competencia).toMatch(/[Ss]in hallazgos/);
  });

  it("ordena hallazgos por severidad y cuenta bien", () => {
    const r = buildReport([
      "ND{open_redirect}",         // media
      "ND{sqli_login_bypass}",     // crítica
      "ND{idor_album_ajeno}",      // alta
    ]);
    expect(r.total).toBe(3);
    expect(r.findings[0].severidad).toBe("crítica"); // primero el crítico
    expect(r.porSeveridad["crítica"]).toBe(1);
    expect(r.porSeveridad["alta"]).toBe(1);
    expect(r.porSeveridad["media"]).toBe(1);
    // cada hallazgo trae remediación
    expect(r.findings.every((f) => f.remediacion.length > 3)).toBe(true);
  });

  it("una toma de cuenta cuenta como hallazgo crítico", () => {
    const r = buildReport(["ND{acceso:banco-justicia}"]);
    expect(r.total).toBe(1);
    expect(r.findings[0].severidad).toBe("crítica");
  });
});
