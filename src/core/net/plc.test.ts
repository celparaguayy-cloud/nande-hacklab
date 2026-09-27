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
});
