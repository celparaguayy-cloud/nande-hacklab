import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * OperationEngine — la operación como sistema COHERENTE (regla 25). Pruebas de
 * REALIDAD anti-guion: cada fase de la kill chain se marca lograda porque el
 * ESTADO del mundo lo demuestra (recon real, host comprometido, cuenta de
 * dominio, pivoteo, Domain Admins…), no porque se tipeó un comando concreto.
 * Une TODOS los motores en una sola vista.
 */
describe("OperationEngine — la kill chain entera, derivada del estado real", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("arranca sin fases hechas y el foco es reconocimiento", () => {
    const s = kernel.operation.status();
    expect(s.completedCount).toBe(0);
    expect(s.current?.id).toBe("recon");
    expect(s.objectiveMet).toBe(false);
    expect(term.execute("op")).toContain("Reconocimiento");
  });

  it("recon real (AXFR) marca la fase de reconocimiento", () => {
    term.execute("dig axfr interna.nande"); // recon por DNS: T1590.002
    const s = kernel.operation.status();
    expect(s.phases.find((p) => p.id === "recon")!.done).toBe(true);
  });

  it("comprometer un host marca acceso inicial (derivado de CompromiseLog)", () => {
    kernel.compromises.record({
      hostname: "server.nande", ip: "10.10.0.42", os: "linux", user: "root", level: "root", via: null,
    });
    const s = kernel.operation.status();
    expect(s.phases.find((p) => p.id === "initial-access")!.done).toBe(true);
  });

  it("pivotar marca movimiento lateral (compromiso con via != null)", () => {
    kernel.compromises.record({
      hostname: "nas.interna.nande", ip: "10.10.66.20", os: "nas", user: "respaldo", level: "user", via: "server.nande",
    });
    expect(kernel.operation.status().phases.find((p) => p.id === "lateral-movement")!.done).toBe(true);
  });

  it("la escalada completa a Domain Admins cumple el OBJETIVO (dominancia)", () => {
    // Cadena real de AD hasta comprometer el dominio.
    term.execute("abuse MESA-AYUDA@NANDE.LOCAL LORE.MARTINEZ@NANDE.LOCAL");
    term.execute("abuse LORE.MARTINEZ@NANDE.LOCAL SVC-SQL@NANDE.LOCAL");
    term.execute("abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL");
    term.execute("abuse DB01@NANDE.LOCAL ADMIN-SQL@NANDE.LOCAL");
    expect(kernel.directory.domainOwned()).toBe(true);
    const s = kernel.operation.status();
    expect(s.phases.find((p) => p.id === "domain-dominance")!.done).toBe(true);
    expect(s.objectiveMet).toBe(true);
    // Credenciales y acceso quedan implícitamente logrados por el camino.
    expect(s.phases.find((p) => p.id === "credential-access")!.done).toBe(true);
    expect(term.execute("op report")).toMatch(/OBJETIVO CUMPLIDO/);
  });

  it("integra el impacto OT y refleja la presión del equipo azul en el informe", () => {
    // Impacto: una bandera OT captura la fase de impacto.
    kernel.scanForSignals("ND{ot_plc_control}");
    expect(kernel.operation.status().phases.find((p) => p.id === "impact")!.done).toBe(true);
    // La contención del azul se ve en el estado de la operación.
    kernel.containment.isolateHost("nas.interna.nande");
    const rep = term.execute("op report");
    expect(rep).toContain("nas.interna.nande");
    expect(rep).toMatch(/Equipo azul/);
  });

  it("op report lista las técnicas ATT&CK realmente ejecutadas", () => {
    term.execute("kerberoast SVC-SQL@NANDE.LOCAL"); // T1558.003 real
    const rep = term.execute("op report");
    expect(rep).toContain("T1558.003");
  });

  it("califica: sin actividad la nota es baja; cumplir el objetivo la sube", () => {
    expect(kernel.operation.grade().objectiveMet).toBe(false);
    const before = kernel.operation.grade().score;
    // Escalada real a Domain Admins.
    term.execute("abuse MESA-AYUDA@NANDE.LOCAL LORE.MARTINEZ@NANDE.LOCAL");
    term.execute("abuse LORE.MARTINEZ@NANDE.LOCAL SVC-SQL@NANDE.LOCAL");
    term.execute("abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL");
    term.execute("abuse DB01@NANDE.LOCAL ADMIN-SQL@NANDE.LOCAL");
    const g = kernel.operation.grade();
    expect(g.objectiveMet).toBe(true);
    expect(g.score).toBeGreaterThan(before);
    expect(term.execute("op score")).toMatch(/Calificación|[SABCD]\b/);
  });

  it("el asesor da la próxima jugada CONCRETA desde el estado (grafo/SPN/ESC1)", () => {
    // Desde el foothold inicial, la próxima jugada del grafo es abusar Mesa de Ayuda.
    const acts = kernel.operation.nextActions();
    expect(acts.length).toBeGreaterThan(0);
    const cmds = acts.map((a) => a.command);
    // Ofrece un abuse del grafo, un kerberoast (SPN) y/o ESC1 (certipy) — comandos reales.
    expect(cmds.some((c) => /^abuse |^kerberoast |^certipy /.test(c))).toBe(true);
    const out = term.execute("op next");
    expect(out).toMatch(/abuse|kerberoast|certipy/);
  });

  it("cumplido el dominio, el asesor pasa a persistencia/impacto", () => {
    term.execute("abuse MESA-AYUDA@NANDE.LOCAL LORE.MARTINEZ@NANDE.LOCAL");
    term.execute("abuse LORE.MARTINEZ@NANDE.LOCAL SVC-SQL@NANDE.LOCAL");
    term.execute("abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL");
    term.execute("abuse DB01@NANDE.LOCAL ADMIN-SQL@NANDE.LOCAL");
    expect(kernel.directory.domainOwned()).toBe(true);
    const cmds = kernel.operation.nextActions().map((a) => a.command).join(" ");
    expect(cmds).toMatch(/dcsync|netmap/);
  });

  it("el sigilo importa en la nota: la contención del equipo azul resta puntos", () => {
    // Dos mundos: mismo objetivo, distinta discreción.
    const loud = new VirtualKernel();
    const lterm = new VirtualTerminal(loud);
    loud.blueResponder.setPosture("active"); // defensor activo → te contiene
    loud.directory.own("SVC-SQL@NANDE.LOCAL");
    lterm.execute("kerberoast SVC-SQL@NANDE.LOCAL"); // grave y atribuible → contención
    const loudScore = loud.operation.grade();

    const quiet = new VirtualKernel();
    const qterm = new VirtualTerminal(quiet);
    // Sin defensor activo: misma técnica, sin contención.
    quiet.directory.own("SVC-SQL@NANDE.LOCAL");
    qterm.execute("kerberoast SVC-SQL@NANDE.LOCAL");
    const quietScore = quiet.operation.grade();

    expect(loudScore.score).toBeLessThan(quietScore.score);
  });
});
