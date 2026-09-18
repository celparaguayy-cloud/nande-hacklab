import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { DETECTION_RULES } from "./BlueTeam";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * SOC como SIEM real: reglas de detección con nombre y MITRE, evidencia para
 * drilldown, triage y lenguaje de consulta. Anti-mock: todo sale de eventos
 * que de verdad ocurrieron en el mundo.
 */
describe("SOC — SIEM de verdad (reglas, evidencia, triage, consulta)", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("el catálogo de reglas está bien formado y es consultable", () => {
    const rules = kernel.soc.rules();
    expect(rules.length).toBe(DETECTION_RULES.length);
    expect(rules.length).toBeGreaterThanOrEqual(8);
    for (const r of rules) {
      expect(r.id).toMatch(/^ND-\d{3}$/);
      expect(r.name.length).toBeGreaterThan(3);
      expect(r.description.length).toBeGreaterThan(10);
    }
    // Varias reglas mapean a una técnica MITRE real.
    expect(rules.filter((r) => r.mitre).length).toBeGreaterThanOrEqual(5);
  });

  it("una alerta real lleva su regla, su MITRE y la evidencia cruda", () => {
    term.execute("service-stop nginx server.nande");
    const a = kernel.soc.list().find((x) => x.host === "server.nande");
    expect(a).toBeDefined();
    expect(a!.ruleId).toBe("ND-001");
    expect(a!.mitre).toContain("T1489");
    expect(a!.status).toBe("open");
    // La evidencia es el evento crudo que la disparó.
    expect(a!.evidence.kind).toBe("service.stopped");
    expect(a!.evidence.host).toBe("server.nande");
    expect(a!.evidence.detail.length).toBeGreaterThan(0);
  });

  it("la correlación de fuerza bruta dispara la regla ND-005", () => {
    term.execute("connect server.nande soporte mala1");
    term.execute("connect server.nande soporte mala2");
    term.execute("connect server.nande soporte mala3");
    const brute = kernel.soc.list().find((a) => a.ruleId === "ND-005");
    expect(brute).toBeDefined();
    expect(brute!.severity).toBe("critical");
    expect(brute!.mitre).toContain("T1110");
  });

  it("la consulta del SIEM filtra por severidad ordenada y por host", () => {
    term.execute("service-stop nginx server.nande");
    term.execute("connect server.nande soporte mala1");

    const graves = kernel.soc.query("severity >= high");
    expect(graves.length).toBeGreaterThan(0);
    expect(graves.every((a) => ["high", "critical"].includes(a.severity))).toBe(true);

    // medium NO entra en >= high (el orden del enum se respeta).
    expect(graves.some((a) => a.severity === "medium")).toBe(false);

    const porHost = kernel.soc.query('host contains "server"');
    expect(porHost.length).toBeGreaterThan(0);
    expect(porHost.every((a) => a.host.includes("server"))).toBe(true);
  });

  it("consulta combinada con and/not y regla", () => {
    term.execute("service-stop nginx server.nande");
    const r = kernel.soc.query('severity >= high and not rule == "ND-005"');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((a) => a.ruleId !== "ND-005")).toBe(true);
  });

  it("consulta inválida se reporta y no tira", () => {
    const v = kernel.soc.validateQuery("severity >=");
    expect(v.ok).toBe(false);
    expect(kernel.soc.query("severity >=").length).toBe(0);
    expect(kernel.soc.validateQuery("noexiste == 1").ok).toBe(false);
  });

  it("triage: reconocer / falso positivo / escalar cambian el estado", () => {
    term.execute("service-stop nginx server.nande");
    const a = kernel.soc.list()[0];

    expect(kernel.soc.acknowledge(a.id)).toBe(true);
    expect(kernel.soc.list().find((x) => x.id === a.id)!.status).toBe("ack");

    kernel.soc.escalate(a.id);
    expect(kernel.soc.list().find((x) => x.id === a.id)!.status).toBe("escalated");

    kernel.soc.falsePositive(a.id);
    expect(kernel.soc.countByStatus().false_positive).toBe(1);

    // Consultable por estado.
    expect(kernel.soc.query("status == false_positive").length).toBe(1);
    expect(kernel.soc.acknowledge("no-existe")).toBe(false);
  });

  it("byRule cuenta qué reglas dispararon de verdad", () => {
    term.execute("service-stop nginx server.nande");
    const stats = kernel.soc.byRule();
    expect(stats.length).toBe(DETECTION_RULES.length);
    const nd001 = stats.find((s) => s.rule.id === "ND-001")!;
    expect(nd001.count).toBeGreaterThan(0);
  });
});
