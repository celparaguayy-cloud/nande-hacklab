import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * BlueTeamResponder — el defensor AUTÓNOMO. Pruebas de REALIDAD: no es un aviso
 * decorativo, ejecuta contención REAL a través del ContainmentEngine cuando
 * detecta una técnica grave, y su efecto se ve en el estado (cuenta
 * deshabilitada / host aislado). Apagado por defecto: no altera el juego salvo
 * que lo actives (simétrico del red team NPC).
 */
describe("BlueTeamResponder — defensor autónomo con respuesta real", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("por defecto está APAGADO: no observa ni responde (no cambia el juego)", () => {
    expect(kernel.blueResponder.posture()).toBe("off");
    kernel.directory.own("SVC-SQL@NANDE.LOCAL");
    // Aún con una técnica grave, apagado no hace nada.
    kernel.noteAttackTechnique({
      technique: "OS Credential Dumping: DCSync", tactic: "Credential Access", mitreId: "T1003.006",
      detail: "DCSync simulado.", host: "NANDE.LOCAL",
    });
    expect(kernel.blueResponder.count()).toBe(0);
    expect(kernel.blueResponder.observationCount()).toBe(0);
    expect(kernel.directory.isDisabled("SVC-SQL@NANDE.LOCAL")).toBe(false);
  });

  it("en ACTIVO, una técnica grave dispara contención REAL (deshabilita la cuenta poseída)", () => {
    kernel.directory.own("SVC-SQL@NANDE.LOCAL"); // el atacante posee la cuenta
    kernel.blueResponder.setPosture("active");
    // Técnica grave detectable (roasting): el defensor responde.
    kernel.noteAttackTechnique({
      technique: "Kerberoasting", tactic: "Credential Access", mitreId: "T1558.003",
      detail: "Solicitud de TGS de SVC-SQL.", host: "NANDE.LOCAL",
    });
    expect(kernel.blueResponder.count()).toBeGreaterThan(0);
    const last = kernel.blueResponder.responses().at(-1)!;
    expect(last.contained).toBe(true);
    // Efecto real: la cuenta comprometida quedó deshabilitada.
    expect(kernel.directory.isDisabled("SVC-SQL@NANDE.LOCAL")).toBe(true);
  });

  it("en ACTIVO prioriza el pivote: aísla el host comprometido antes que una cuenta", () => {
    kernel.compromises.record({
      hostname: "nas.interna.nande", ip: "10.10.66.20", os: "ÑandeNAS", user: "respaldo", level: "user", via: "server.nande",
    });
    kernel.directory.own("SVC-SQL@NANDE.LOCAL");
    kernel.blueResponder.setPosture("active");
    kernel.noteAttackTechnique({
      technique: "Manipulation of Control", tactic: "Impact", mitreId: "T0831",
      detail: "Sabotaje del proceso.", host: "plc.ot",
    });
    // El pivote es prioridad 1 → se aísla primero.
    expect(kernel.hosts.isIsolated("nas.interna.nande")).toBe(true);
    expect(kernel.hosts.canReach("nas.interna.nande", "db-core.interna.nande")).toBe(false);
  });

  it("en MONITOR detecta y avisa pero NO contiene", () => {
    kernel.directory.own("SVC-SQL@NANDE.LOCAL");
    kernel.blueResponder.setPosture("monitor");
    kernel.noteAttackTechnique({
      technique: "Kerberoasting", tactic: "Credential Access", mitreId: "T1558.003",
      detail: "TGS.", host: "NANDE.LOCAL",
    });
    expect(kernel.blueResponder.count()).toBeGreaterThan(0);
    expect(kernel.blueResponder.responses().at(-1)!.contained).toBe(false);
    expect(kernel.directory.isDisabled("SVC-SQL@NANDE.LOCAL")).toBe(false);
  });

  it("no reacciona a técnicas de bajo ruido (recon): sólo a lo grave", () => {
    kernel.blueResponder.setPosture("active");
    kernel.noteAttackTechnique({
      technique: "Network Service Scanning", tactic: "Discovery", mitreId: "T1046",
      detail: "escaneo.", host: "10.10.5.10",
    });
    // Observó la señal pero no la considera gatillo → sin respuesta.
    expect(kernel.blueResponder.observationCount()).toBe(1);
    expect(kernel.blueResponder.count()).toBe(0);
  });

  it("por terminal: blueteam active cambia la postura y se refleja en el estado", () => {
    const out = term.execute("blueteam active");
    expect(out).toMatch(/ACTIVO/);
    expect(kernel.blueResponder.posture()).toBe("active");
    expect(term.execute("blueteam")).toContain("ACTIVO");
    term.execute("blueteam off");
    expect(kernel.blueResponder.posture()).toBe("off");
  });
});
