/**
 * PlcRuntime — el motor Modbus/ICS de la planta industrial (OT) de ÑANDE.
 *
 * Antes la capa OT era decorativa: plc.planta.nande declaraba un servicio
 * `modbus` en el puerto 502 que NADIE hablaba, y el "proceso físico"
 * (Tanque/Bomba/Válvula) era un string estático en un archivo que nunca
 * cambiaba. Comprometer el PLC era leer un flag. Eso violaba la regla 4 (cada
 * vuln con consecuencia real) y la 11 (máquinas como sistemas, no guiones).
 *
 * Ahora el PLC es un sistema stateful de verdad, 100% dentro del sandbox:
 *
 *  - COILS (salidas discretas, R/W, función Modbus 01/05): Bomba-A, Modo AUTO.
 *  - HOLDING REGISTERS (R/W, función 03/06): apertura de Válvula-3, setpoint
 *    de presión — los parámetros que el operador (o un atacante) fija.
 *  - INPUT REGISTERS (solo lectura, función 04): las variables de proceso
 *    (nivel del tanque, presión real) que el PLC CALCULA a partir del estado
 *    de control. No se escriben: son la física.
 *
 * La física es un modelo determinista y puro del estado de control (sin tiempo
 * oculto → tests reproducibles): el nivel y la presión son función de bomba,
 * válvula, modo y setpoint. Escribir un coil o un registro cambia DE VERDAD el
 * proceso, y puede llevarlo a un estado peligroso (sobrepresión, desborde,
 * marcha en seco). Ese es el daño físico real que enseña por qué la OT se aísla.
 *
 * El motor es la fuente única del proceso (regla 2): la HMI que lo muestra y el
 * comando `modbus` que lo lee/escribe consultan ESTE estado, no un texto fijo.
 * No conoce al kernel ni emite eventos (igual que MitmEngine): devuelve QUÉ
 * cambió y qué peligro se cruzó, y el terminal lo traduce a MITRE ATT&CK for
 * ICS + bandera. Separación limpia, sin red real.
 */

/**
 * Identificación del dispositivo Modbus (función 43 / MEI type 14, "Read Device
 * Identification"). Es la huella REAL que un pentester OT lee antes de atacar:
 * saber marca/modelo/revisión dice qué registros y comandos soporta el equipo.
 * Modbus NO autentica: cualquiera que alcance el :502 la obtiene.
 */
export interface PlcIdentity {
  vendorName: string;
  productCode: string;
  productName: string;
  majorMinorRevision: string;
  /** IDs de unidad/esclavo que responden (lo que enumera modbus-discover). */
  unitIds: number[];
}

/** Un coil (salida discreta booleana) del PLC. */
export interface PlcCoil {
  addr: number;
  label: string;
  value: boolean;
}

/** Un holding register (parámetro analógico R/W) del PLC. */
export interface PlcHolding {
  addr: number;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
}

/** Tipo de peligro físico en el que puede caer el proceso. */
export type PlcHazard = "none" | "overpressure" | "overflow" | "dry";

/** Foto del proceso físico que gobierna un PLC (variables calculadas). */
export interface PlcProcess {
  /** Nivel del tanque, 0–100 %. */
  level: number;
  /** Presión real, en décimas de bar (42 = 4.2 bar). */
  pressure: number;
  /** Setpoint de presión, en décimas de bar. */
  setpoint: number;
  /** Apertura de la válvula, 0–100 %. */
  valve: number;
  /** ¿Bomba encendida? */
  pump: boolean;
  /** ¿Lazo en AUTO (true) o MANUAL (false)? */
  auto: boolean;
  /** Peligro físico actual (si lo hay). */
  hazard: PlcHazard;
  /** Alarmas legibles activas. */
  alarms: string[];
}

/** Resultado de una escritura Modbus (para que el terminal derive consecuencias). */
export interface PlcWriteResult {
  ok: boolean;
  message: string;
  /** Etiqueta del punto escrito (para el detalle de la detección). */
  label?: string;
  /** ¿Fue una escritura de parámetro (holding) o de comando (coil)? */
  kind?: "coil" | "holding";
  /** Peligro antes y después: si cambió a peligroso, hubo sabotaje físico. */
  hazardBefore?: PlcHazard;
  hazardAfter?: PlcHazard;
}

interface PlcDeviceState {
  host: string;
  ip: string;
  model: string;
  identity: PlcIdentity;
  coils: PlcCoil[];
  holding: PlcHolding[];
}

/* --------------------------------------------------------------- constantes */

const BASE_PRESSURE = 10; // 1.0 bar: presión de reposo con la bomba apagada.
const SAFE_MAX_PRESSURE = 80; // 8.0 bar: por encima es SOBREPRESIÓN (peligro).
const OVERFLOW_LEVEL = 95; // % de tanque: por encima DESBORDA.
const DRY_LEVEL = 2; // % de tanque: por debajo, con bomba on, marcha EN SECO.

/** Índices fijos de los puntos (documentados para el jugador y los tests). */
export const PLC_MAP = {
  COIL_PUMP: 0,
  COIL_AUTO: 1,
  HOLD_VALVE: 0,
  HOLD_SETPOINT: 1,
} as const;

export class PlcRuntime {
  private devices = new Map<string, PlcDeviceState>();

  constructor() {
    // PLC de la planta: bomba ON, modo AUTO, válvula 40%, setpoint 4.2 bar.
    // Estado inicial coherente con el proceso que la HMI mostraba antes.
    this.devices.set("plc.planta.nande", {
      host: "plc.planta.nande",
      ip: "10.10.77.20",
      model: "ÑandePLC firmware 3.11 (RTOS industrial)",
      identity: {
        vendorName: "ÑANDE Industrial",
        productCode: "NPLC-3000",
        productName: "ÑandePLC",
        majorMinorRevision: "3.11",
        unitIds: [1],
      },
      coils: [
        { addr: PLC_MAP.COIL_PUMP, label: "Bomba-A", value: true },
        { addr: PLC_MAP.COIL_AUTO, label: "Modo AUTO", value: true },
      ],
      holding: [
        { addr: PLC_MAP.HOLD_VALVE, label: "Válvula-3 (apertura)", value: 40, unit: "%", min: 0, max: 100 },
        { addr: PLC_MAP.HOLD_SETPOINT, label: "Setpoint presión", value: 42, unit: "bar/10", min: 0, max: 200 },
      ],
    });
  }

  private key(ref: string): string {
    return ref.toLowerCase();
  }

  private find(ref: string): PlcDeviceState | undefined {
    const r = this.key(ref);
    for (const d of this.devices.values()) {
      if (d.host.toLowerCase() === r || d.ip === ref) return d;
    }
    return undefined;
  }

  /** ¿`ref` (hostname o IP) es un PLC con motor Modbus? */
  has(ref: string): boolean {
    return this.find(ref) !== undefined;
  }

  /** Metadatos del dispositivo (modelo, host, ip). */
  device(ref: string): { host: string; ip: string; model: string } | undefined {
    const d = this.find(ref);
    return d ? { host: d.host, ip: d.ip, model: d.model } : undefined;
  }

  /**
   * Identificación del dispositivo (Modbus fn 43 / MEI 14). La huella real que
   * lee el reconocimiento OT: marca, modelo, revisión, e IDs de unidad activos.
   * Copia defensiva. undefined si `ref` no es un PLC.
   */
  identify(ref: string): PlcIdentity | undefined {
    const d = this.find(ref);
    return d ? { ...d.identity, unitIds: [...d.identity.unitIds] } : undefined;
  }

  /** Coils (salidas discretas) — Modbus función 01. Copia defensiva. */
  readCoils(ref: string): PlcCoil[] {
    return (this.find(ref)?.coils ?? []).map((c) => ({ ...c }));
  }

  /** Holding registers (parámetros R/W) — Modbus función 03. Copia defensiva. */
  readHolding(ref: string): PlcHolding[] {
    return (this.find(ref)?.holding ?? []).map((h) => ({ ...h }));
  }

  /**
   * Input registers (solo lectura) — Modbus función 04: las variables de
   * proceso que el PLC calcula. Nivel del tanque y presión real. No se
   * escriben: son el resultado físico del estado de control.
   */
  readInputs(ref: string): { addr: number; label: string; value: number; unit: string }[] {
    const p = this.process(ref);
    if (!p) return [];
    return [
      { addr: 0, label: "Tanque-1 nivel", value: p.level, unit: "%" },
      { addr: 1, label: "Presión (real)", value: p.pressure, unit: "bar/10" },
    ];
  }

  private coil(d: PlcDeviceState, addr: number): boolean {
    return d.coils.find((c) => c.addr === addr)?.value ?? false;
  }

  private holdingVal(d: PlcDeviceState, addr: number): number {
    return d.holding.find((h) => h.addr === addr)?.value ?? 0;
  }

  /**
   * El corazón: calcula el proceso físico a partir del estado de control. Puro
   * y determinista (sin tiempo oculto). Modelo de tanque con una bomba que
   * llena y una válvula que drena; la presión la sostiene el lazo en AUTO o
   * corre libre en MANUAL.
   */
  process(ref: string): PlcProcess | undefined {
    const d = this.find(ref);
    if (!d) return undefined;
    const pump = this.coil(d, PLC_MAP.COIL_PUMP);
    const auto = this.coil(d, PLC_MAP.COIL_AUTO);
    const valve = clamp(this.holdingVal(d, PLC_MAP.HOLD_VALVE), 0, 100);
    const setpoint = Math.max(0, this.holdingVal(d, PLC_MAP.HOLD_SETPOINT));

    // Nivel: con la bomba apagada el tanque se vacía; con la bomba encendida el
    // nivel se estabiliza donde el llenado iguala al drenaje de la válvula
    // (válvula muy cerrada → sube y desborda; muy abierta → baja y marcha seco).
    const level = pump ? clamp(100 - valve, 0, 100) : 0;

    // Presión: en AUTO el lazo la sostiene EN el setpoint. En MANUAL con la
    // bomba encendida corre libre y trepa al cerrar la válvula (sobrepresión).
    let pressure: number;
    if (!pump) pressure = BASE_PRESSURE;
    else if (auto) pressure = setpoint;
    else pressure = BASE_PRESSURE + Math.round((100 - valve) * 0.8);

    const alarms: string[] = [];
    let hazard: PlcHazard = "none";
    if (pressure >= SAFE_MAX_PRESSURE) {
      hazard = "overpressure";
      alarms.push(`SOBREPRESIÓN: ${(pressure / 10).toFixed(1)} bar ≥ ${(SAFE_MAX_PRESSURE / 10).toFixed(1)} bar`);
    } else if (level >= OVERFLOW_LEVEL) {
      hazard = "overflow";
      alarms.push(`DESBORDE: tanque al ${level}% (válvula demasiado cerrada con la bomba encendida)`);
    } else if (pump && level <= DRY_LEVEL) {
      hazard = "dry";
      alarms.push(`MARCHA EN SECO: bomba encendida con el tanque al ${level}% (cavitación)`);
    }

    return { level, pressure, setpoint, valve, pump, auto, hazard, alarms };
  }

  /**
   * Escribe un coil (Modbus función 05). Devuelve el peligro antes/después para
   * que el terminal sepa si esta escritura provocó daño físico (sabotaje).
   */
  writeCoil(ref: string, addr: number, value: boolean): PlcWriteResult {
    const d = this.find(ref);
    if (!d) return { ok: false, message: "sin dispositivo" };
    const coil = d.coils.find((c) => c.addr === addr);
    if (!coil) return { ok: false, message: `coil ${addr} inexistente (coils válidos: 0–${d.coils.length - 1})` };
    const hazardBefore = this.process(ref)!.hazard;
    coil.value = value;
    const hazardAfter = this.process(ref)!.hazard;
    return {
      ok: true,
      message: `coil ${addr} (${coil.label}) = ${value ? "ON" : "OFF"}`,
      label: coil.label,
      kind: "coil",
      hazardBefore,
      hazardAfter,
    };
  }

  /** Escribe un holding register (Modbus función 06). */
  writeHolding(ref: string, addr: number, raw: number): PlcWriteResult {
    const d = this.find(ref);
    if (!d) return { ok: false, message: "sin dispositivo" };
    const reg = d.holding.find((h) => h.addr === addr);
    if (!reg) return { ok: false, message: `registro ${addr} inexistente (holding válidos: 0–${d.holding.length - 1})` };
    const value = clamp(Math.round(raw), reg.min, reg.max);
    const hazardBefore = this.process(ref)!.hazard;
    reg.value = value;
    const hazardAfter = this.process(ref)!.hazard;
    return {
      ok: true,
      message: `holding ${addr} (${reg.label}) = ${value}${reg.unit === "%" ? "%" : ""}`,
      label: reg.label,
      kind: "holding",
      hazardBefore,
      hazardAfter,
    };
  }

  /** Restaura un PLC a su estado seguro inicial (para labs / reinicio). */
  reset(ref: string): boolean {
    const d = this.find(ref);
    if (!d) return false;
    if (d.host === "plc.planta.nande") {
      this.setCoil(d, PLC_MAP.COIL_PUMP, true);
      this.setCoil(d, PLC_MAP.COIL_AUTO, true);
      this.setHolding(d, PLC_MAP.HOLD_VALVE, 40);
      this.setHolding(d, PLC_MAP.HOLD_SETPOINT, 42);
    }
    return true;
  }

  private setCoil(d: PlcDeviceState, addr: number, value: boolean): void {
    const c = d.coils.find((x) => x.addr === addr);
    if (c) c.value = value;
  }

  private setHolding(d: PlcDeviceState, addr: number, value: number): void {
    const h = d.holding.find((x) => x.addr === addr);
    if (h) h.value = value;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
