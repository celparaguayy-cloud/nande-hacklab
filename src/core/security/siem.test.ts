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

  it("coherencia (regla 5): el SIEM VE los ataques al AD, no sólo la matriz ATT&CK", () => {
    // Kerberoasting: la matriz ATT&CK y el SOC deben coincidir en que pasó.
    term.execute("kerberoast SVC-SQL@NANDE.LOCAL");
    const kerb = kernel.soc.list().find((a) => a.ruleId === "ND-010");
    expect(kerb).toBeDefined();
    expect(kerb!.mitre).toContain("T1558.003");
    expect(kernel.mitre.recent(20).map((d) => d.mitreId)).toContain("T1558.003");

    // ESC1 (ADCS): la emisión del certificado enciende una alerta crítica.
    term.execute("certipy req -template NandeUser -upn ADMIN-SQL@NANDE.LOCAL");
    const esc1 = kernel.soc.list().find((a) => a.ruleId === "ND-014");
    expect(esc1).toBeDefined();
    expect(esc1!.severity).toBe("critical");

    // El PKINIT + caída del dominio también quedan en el SIEM.
    term.execute("certipy auth -pfx ADMIN-SQL@NANDE.LOCAL");
    const ids = kernel.soc.list().map((a) => a.ruleId);
    expect(ids).toContain("ND-015"); // T1550 · autenticación con material alternativo
    expect(ids).toContain("ND-016"); // T1078.002 · compromiso de Domain Admins
  });

  it("coherencia total: el SIEM también ve técnicas no-AD (OT/impacto) como alerta genérica", () => {
    // Una técnica de impacto en OT (sin regla propia) igual enciende el SIEM,
    // con severidad derivada de la táctica (Impact → critical). El SOC ve TODO
    // lo que ve la matriz ATT&CK, no sólo AD.
    kernel.noteAttackTechnique({
      technique: "Manipulation of Control", tactic: "Impact", mitreId: "T0831",
      detail: "Escritura Modbus no autorizada en el PLC.", host: "plc.ot",
    });
    const a = kernel.soc.list().find((x) => x.mitre?.includes("T0831"));
    expect(a).toBeDefined();
    expect(a!.ruleId).toBe("ND-020");
    expect(a!.severity).toBe("critical");
    expect(a!.title).toContain("Manipulation of Control");
  });

  it("no duplica: el pivote (T1021) ya entra por login.success, no por attack.technique", () => {
    kernel.noteAttackTechnique({
      technique: "Remote Services", tactic: "Lateral Movement", mitreId: "T1021",
      detail: "pivote a host interno", host: "interno.lab",
    });
    expect(
      kernel.soc.list().some((x) => x.evidence.kind === "attack.technique" && x.mitre?.includes("T1021")),
    ).toBe(false);
  });
});
