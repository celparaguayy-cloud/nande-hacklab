import { describe, expect, it } from "vitest";
import { certificationsFor, CERTIFICATIONS } from "./Certifications";

describe("certificaciones por competencia", () => {
  it("sin banderas, ninguna certificación está ganada", () => {
    const cs = certificationsFor([]);
    expect(cs.every((c) => !c.earned)).toBe(true);
    expect(cs.length).toBe(CERTIFICATIONS.length + 1); // + master
  });

  it("juntar las banderas suficientes gana la certificación del área", () => {
    const net = CERTIFICATIONS.find((c) => c.id === "network")!;
    const cs = certificationsFor(net.pool.slice(0, net.need));
    const cert = cs.find((c) => c.cert.id === "network")!;
    expect(cert.earned).toBe(true);
    expect(cert.have).toBeGreaterThanOrEqual(cert.need);
  });

  it("la Master exige todas las demás", () => {
    const todas = CERTIFICATIONS.flatMap((c) => c.pool);
    const cs = certificationsFor(todas);
    expect(cs.find((c) => c.cert.id === "master")!.earned).toBe(true);
    // Con solo una área, la Master NO se gana.
    const parcial = certificationsFor(CERTIFICATIONS[0].pool);
    expect(parcial.find((c) => c.cert.id === "master")!.earned).toBe(false);
  });
});
