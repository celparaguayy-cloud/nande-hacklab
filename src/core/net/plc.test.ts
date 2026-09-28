import { beforeEach, describe, expect, it } from "vitest";
import { PlcRuntime, PLC_MAP } from "./Plc";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Motor Modbus/ICS de la planta OT — de-fakery de la capa industrial. Antes el
 * PLC declaraba un puerto 502 que nadie hablaba y su "proceso físico" era un
 * texto estático. Ahora es un sistema stateful REAL: coils/registers gobiernan
 * un proceso determinista, escribirlos cambia el proceso y puede sabotearlo, y
 * la consecuencia se propaga (MITRE ATT&CK for ICS + bandera + HMI en vivo).
 * Estos tests fijan esa realidad para que no vuelva a ser decorativa (§4/§11/§19).
 */
describe("PlcRuntime — proceso físico stateful (Modbus/ICS)", () => {
  let plc: PlcRuntime;
  beforeEach(() => {
    plc = new PlcRuntime();
  });

  it("estado inicial coherente: bomba ON, AUTO, válvula 40% → nivel 60%, 4.2 bar, sin peligro", () => {
    const p = plc.process("plc.planta.nande")!;
    expect(p.pump).toBe(true);
    expect(p.auto).toBe(true);
    expect(p.valve).toBe(40);
    expect(p.level).toBe(60); // 100 - válvula
    expect(p.pressure).toBe(42); // AUTO sostiene el setpoint
    expect(p.hazard).toBe("none");
  });

  it("es determinista: dos motores nuevos calculan el mismo proceso", () => {
    expect(plc.process("plc.planta.nande")).toEqual(new PlcRuntime().process("plc.planta.nande"));
  });

  it("bomba OFF vacía el tanque sin peligro (nivel 0, presión de reposo)", () => {
    plc.writeCoil("plc.planta.nande", PLC_MAP.COIL_PUMP, false);
    const p = plc.process("plc.planta.nande")!;
    expect(p.level).toBe(0);
    expect(p.pressure).toBe(10); // 1.0 bar en reposo
    expect(p.hazard).toBe("none");
  });

  it("subir el setpoint por encima del máximo seguro provoca SOBREPRESIÓN (en AUTO)", () => {
    const r = plc.writeHolding("plc.planta.nande", PLC_MAP.HOLD_SETPOINT, 90); // 9.0 bar
    expect(r.ok).toBe(true);
    expect(r.hazardBefore).toBe("none");
    expect(r.hazardAfter).toBe("overpressure");
    expect(plc.process("plc.planta.nande")!.hazard).toBe("overpressure");
  });

  it("cerrar la válvula con la bomba encendida DESBORDA el tanque", () => {
    const r = plc.writeHolding("plc.planta.nande", PLC_MAP.HOLD_VALVE, 0);
    expect(r.hazardBefore).toBe("none");
    expect(r.hazardAfter).toBe("overflow");
    const p = plc.process("plc.planta.nande")!;
    expect(p.level).toBe(100);
    expect(p.hazard).toBe("overflow");
  });

  it("MANUAL + válvula cerrada + bomba on hace correr la presión (sobrepresión sin tocar el setpoint)", () => {
    plc.writeCoil("plc.planta.nande", PLC_MAP.COIL_AUTO, false); // MANUAL
    plc.writeHolding("plc.planta.nande", PLC_MAP.HOLD_VALVE, 0);
    const p = plc.process("plc.planta.nande")!;
    expect(p.pressure).toBeGreaterThanOrEqual(80);
    expect(p.hazard).toBe("overpressure");
  });

  it("válvula 100% con la bomba encendida deja el tanque en MARCHA EN SECO", () => {
    plc.writeHolding("plc.planta.nande", PLC_MAP.HOLD_VALVE, 100);
    const p = plc.process("plc.planta.nande")!;
    expect(p.level).toBe(0);
    expect(p.hazard).toBe("dry");
  });

  it("los holding registers se recortan a su rango (no aceptan basura)", () => {
    plc.writeHolding("plc.planta.nande", PLC_MAP.HOLD_VALVE, 250);
    expect(plc.readHolding("plc.planta.nande")[PLC_MAP.HOLD_VALVE].value).toBe(100);
    plc.writeHolding("plc.planta.nande", PLC_MAP.HOLD_VALVE, -5);
    expect(plc.readHolding("plc.planta.nande")[PLC_MAP.HOLD_VALVE].value).toBe(0);
  });

  it("input registers = variables de proceso (solo lectura): nivel y presión", () => {
    const inputs = plc.readInputs("plc.planta.nande");
    expect(inputs.map((i) => i.label)).toEqual(["Tanque-1 nivel", "Presión (real)"]);
  });

  it("identify() devuelve la huella Modbus (fn 43): marca, modelo, revisión, unit IDs", () => {
    const id = plc.identify("plc.planta.nande")!;
    expect(id.vendorName).toBe("ÑANDE Industrial");
    expect(id.productCode).toBe("NPLC-3000");
    expect(id.majorMinorRevision).toBe("3.11");
    expect(id.unitIds).toContain(1);
  });

  /* ------------------------------------------- SIS (capa de seguridad) */

  it("el SIS dispara a PARO SEGURO ante sobrepresión (10 bar): planta detenida pero intacta", () => {
    const r = plc.writeHolding("plc.planta.nande", PLC_MAP.HOLD_SETPOINT, 100); // 10.0 bar
    expect(r.safetyBefore).toBe("ok");
    expect(r.safetyAfter).toBe("sis_trip");
    const p = plc.process("plc.planta.nande")!;
    expect(p.safety).toBe("sis_trip");
    expect(p.pump).toBe(false); // el SIS forzó el paro seguro
    expect(plc.sisState("plc.planta.nande")!.tripped).toBe(true);
    expect(plc.sisState("plc.planta.nande")!.ruptured).toBe(false);
  });

  it("con el SIS puesto, ni una sobrepresión enorme rompe la planta (sólo dispara)", () => {
    plc.writeHolding("plc.planta.nande", PLC_MAP.HOLD_SETPOINT, 200); // 20 bar
    expect(plc.process("plc.planta.nande")!.safety).toBe("sis_trip");
    expect(plc.sisState("plc.planta.nande")!.ruptured).toBe(false);
  });

  it("deshabilitar el SIS y forzar sobrepresión DESTRUYE la vasija (irreversible)", () => {
    plc.setSis("plc.planta.nande", false);
    const r = plc.writeHolding("plc.planta.nande", PLC_MAP.HOLD_SETPOINT, 130); // 13 bar
    expect(r.safetyAfter).toBe("ruptured");
    const p = plc.process("plc.planta.nande")!;
    expect(p.safety).toBe("ruptured");
    // La destrucción es irreversible: reset() se niega.
    expect(plc.reset("plc.planta.nande")).toBe(false);
    expect(plc.process("plc.planta.nande")!.safety).toBe("ruptured");
  });

  it("deshabilitar el SIS por sí solo NO cambia el proceso: quita la red, no dispara", () => {
    const before = plc.process("plc.planta.nande")!;
    plc.setSis("plc.planta.nande", false);
    const after = plc.process("plc.planta.nande")!;
    expect(after.sisEnabled).toBe(false);
    expect(after.safety).toBe("ok");
    expect(after.level).toBe(before.level);
    expect(after.pressure).toBe(before.pressure);
  });
});

describe("Terminal `modbus` — cliente Modbus/TCP contra el PLC (con ruteo real)", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  /** Pivotea hasta el historian (db-core), desde donde se alcanza la red OT. */
  const pivotToHistorian = () => {
    for (const step of [
      "connect server.nande soporte Verano2024",
      "connect nas.interna.nande respaldo NasÑande#2024",
      "connect db-core.interna.nande dbadmin Core-DB!2024",
    ]) {
      term.execute(step);
    }
  };

  it("el PLC industrial NO se toca sin pivotear: no hay ruta desde el equipo del jugador", () => {
    const out = term.execute("modbus plc.planta.nande");
    expect(out).toMatch(/no hay ruta|pivote/i);
    // Y el proceso quedó intacto (nadie lo tocó).
    expect(kernel.plc.process("plc.planta.nande")!.hazard).toBe("none");
  });

  it("desde el historian se lee el proceso en vivo y sus coils", () => {
    pivotToHistorian();
    const status = term.execute("modbus plc.planta.nande");
    expect(status).toContain("Tanque-1 nivel");
    expect(status).toContain("AUTO");
    const coils = term.execute("modbus read plc.planta.nande coils");
    expect(coils).toContain("Bomba-A");
  });

  it("modbus id fingerprintea el PLC (marca/modelo/revisión) — recon OT real", () => {
    pivotToHistorian();
    const out = term.execute("modbus id plc.planta.nande");
    expect(out).toContain("ÑANDE Industrial");
    expect(out).toContain("NPLC-3000");
    expect(out).toContain("3.11");
  });

  it("nmap ve el PLC como dispositivo ICS y modbus-discover apunta al fingerprint", () => {
    // Puerto 502 en el escaneo por defecto (industrial, ya no se esconde).
    const scan = kernel.tools.run("nmap", ["plc.planta.nande"]).output;
    expect(scan).toContain("502/tcp");
    expect(scan).toContain("modbus");
    // -O clasifica el equipo como especializado (SCADA/ICS), no general purpose.
    const os = kernel.tools.run("nmap", ["-O", "plc.planta.nande"]).output;
    expect(os).toContain("specialized (SCADA/ICS)");
    // -sC corre modbus-discover, que apunta a la herramienta que lo enumera.
    const sc = kernel.tools.run("nmap", ["-sC", "plc.planta.nande"]).output;
    expect(sc).toContain("modbus-discover");
    expect(sc).toContain("modbus id");
  });

  it("escribir el setpoint sabotea el proceso: MITRE ICS (T0836+T0831), bandera y HMI en vivo", () => {
    pivotToHistorian();
    const out = term.execute("modbus write plc.planta.nande reg 1 90"); // setpoint 9.0 bar
    expect(out).toContain("Modbus write OK");
    expect(out).toContain("T0836"); // Modify Parameter
    expect(out).toContain("IMPACTO FÍSICO");
    expect(out).toContain("ND{ot_sabotaje_fisico}");

    // La capa defensiva se encendió con los MISMOS datos (coherencia §3/§5):
    const ids = kernel.mitre.recent(30).map((d) => d.mitreId);
    expect(ids).toContain("T0836"); // escritura de parámetro
    expect(ids).toContain("T0831"); // Manipulation of Control (Impacto)

    // Coherencia: la HMI (consola de operador) muestra el proceso EN VIVO, así
    // que refleja el sabotaje — no es un texto fijo (de-fakery real).
    term.execute("connect hmi.planta.nande operador Planta#2024");
    const hmi = term.execute("cat /var/scada/proceso.status");
    expect(hmi).toContain("SOBREPRESIÓN");
  });

  it("escribir un coil es Unauthorized Command Message (T0855) — el SOC lo ve", () => {
    pivotToHistorian();
    term.execute("modbus write plc.planta.nande coil 0 0"); // apaga la bomba
    expect(kernel.mitre.recent(30).map((d) => d.mitreId)).toContain("T0855");
    // Consecuencia real: apagar la bomba vacía el tanque (proceso stateful).
    expect(kernel.plc.process("plc.planta.nande")!.level).toBe(0);
  });

  it("con el SIS puesto, la sobrepresión extrema sólo logra un PARO SEGURO (T0828), no destrucción", () => {
    pivotToHistorian();
    const out = term.execute("modbus write plc.planta.nande reg 1 130");
    expect(out).toMatch(/PARO SEGURO|SIS/);
    expect(kernel.mitre.recent(40).map((d) => d.mitreId)).toContain("T0828");
    // La planta sobrevivió: disparada, no destruida.
    expect(kernel.plc.process("plc.planta.nande")!.safety).toBe("sis_trip");
  });

  it("kill-chain TRISIS: deshabilitar el SIS (T0858) y luego sobrepresión DESTRUYE la planta (T0879/T0880)", () => {
    pivotToHistorian();
    const off = term.execute("modbus sis plc.planta.nande off");
    expect(off).toMatch(/DESHABILITADO/);
    expect(kernel.mitre.recent(40).map((d) => d.mitreId)).toContain("T0858");

    const boom = term.execute("modbus write plc.planta.nande reg 1 130");
    expect(boom).toMatch(/ROTURA|DESTRU/);
    expect(boom).toContain("ND{ot_planta_destruida}");
    const ids = kernel.mitre.recent(40).map((d) => d.mitreId);
    expect(ids).toContain("T0879"); // Damage to Property
    expect(ids).toContain("T0880"); // Loss of Safety
    expect(kernel.plc.process("plc.planta.nande")!.safety).toBe("ruptured");

    // Coherencia global (regla 5): el mundo REACCIONA a la catástrofe —
    // titular en el diario y suba de notoriedad (no sólo una detección aislada).
    const news = kernel.news.latest(20);
    expect(news.some((a) => a.category === "Infraestructura crítica" && /destru/i.test(a.headline))).toBe(true);
    expect(kernel.reputation().offensive).toBeGreaterThan(0);
  });
});
