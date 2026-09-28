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

/**
 * Estado del sistema instrumentado de seguridad (SIS): la capa independiente
 * que evita la catástrofe física. "ok" = vigilando; "sis_trip" = disparó y
 * llevó la planta a PARO SEGURO (producción detenida, pero intacta);
 * "ruptured" = la vasija se destruyó (pasa sólo si el SIS estaba DESHABILITADO
 * cuando llegó la sobrepresión — el ataque estilo TRISIS/Triton).
 */
export type PlcSafety = "ok" | "sis_trip" | "ruptured";

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
  /** Peligro físico actual del proceso (si lo hay). */
  hazard: PlcHazard;
  /** ¿El SIS está habilitado (vigilando)? */
  sisEnabled: boolean;
  /** Estado de la capa de seguridad (paro seguro / rotura). */
  safety: PlcSafety;
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
  /** Estado de seguridad antes y después: detecta el disparo del SIS o la rotura. */
  safetyBefore?: PlcSafety;
  safetyAfter?: PlcSafety;
}

interface PlcDeviceState {
  host: string;
  ip: string;
  model: string;
  identity: PlcIdentity;
  coils: PlcCoil[];
  holding: PlcHolding[];
  /** SIS habilitado (default true): la seguridad viene puesta de fábrica. */
  sisEnabled: boolean;
  /** SIS disparado (latcheado): la planta quedó en paro seguro. */
  sisTripped: boolean;
  /** Vasija destruida (latcheado): daño físico irreversible. */
  ruptured: boolean;
  /**
   * Protección de escritura (llave física en modo RUN): cuando está activa, el
   * PLC RECHAZA toda escritura remota (coils, registros y cambios del SIS). Es
   * la defensa #1 contra Modbus no autenticado. Default FALSE: los PLC legados
   * vienen en modo remoto/programable — por eso son vulnerables (realismo).
   */
  writeProtected: boolean;
}

/* --------------------------------------------------------------- constantes */

const BASE_PRESSURE = 10; // 1.0 bar: presión de reposo con la bomba apagada.
const SAFE_MAX_PRESSURE = 80; // 8.0 bar: por encima es SOBREPRESIÓN (peligro).
const OVERFLOW_LEVEL = 95; // % de tanque: por encima DESBORDA.
const DRY_LEVEL = 2; // % de tanque: por debajo, con bomba on, marcha EN SECO.
// Umbral de la capa de seguridad: a esta presión el SIS DISPARA (paro seguro).
// Si el SIS está deshabilitado, esta misma presión ROMPE la vasija. Está por
// encima de la alarma de sobrepresión: hay una banda de aviso antes del disparo.
const SIS_TRIP_PRESSURE = 100; // 10.0 bar

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
      sisEnabled: true,
      sisTripped: false,
      ruptured: false,
      writeProtected: false,
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
   * Física pura del proceso a partir del estado de control (sin la capa de
   * seguridad): tanque con bomba que llena y válvula que drena; la presión la
   * sostiene el lazo en AUTO o corre libre en MANUAL. Determinista.
   */
  private rawProcess(d: PlcDeviceState): {
    level: number; pressure: number; setpoint: number; valve: number;
    pump: boolean; auto: boolean; hazard: PlcHazard; alarms: string[];
  } {
    const pump = this.coil(d, PLC_MAP.COIL_PUMP);
    const auto = this.coil(d, PLC_MAP.COIL_AUTO);
    const valve = clamp(this.holdingVal(d, PLC_MAP.HOLD_VALVE), 0, 100);
    const setpoint = Math.max(0, this.holdingVal(d, PLC_MAP.HOLD_SETPOINT));

    const level = pump ? clamp(100 - valve, 0, 100) : 0;

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
   * Proceso físico OBSERVABLE: la física pura con la capa de seguridad (SIS)
   * encima. Si el SIS disparó, la planta está en PARO SEGURO (bomba forzada
   * apagada, alivio abierto, presión de reposo). Si la vasija se rompió, el
   * proceso quedó destruido. Ambos estados son latcheados (persisten).
   */
  process(ref: string): PlcProcess | undefined {
    const d = this.find(ref);
    if (!d) return undefined;
    const raw = this.rawProcess(d);

    if (d.ruptured) {
      return {
        level: 0, pressure: 0, setpoint: raw.setpoint, valve: raw.valve,
        pump: false, auto: raw.auto, hazard: "none",
        sisEnabled: d.sisEnabled, safety: "ruptured",
        alarms: ["🔥 VASIJA DESTRUIDA: sobrepresión con el SIS deshabilitado. Daño físico IRREVERSIBLE."],
      };
    }
    if (d.sisTripped) {
      return {
        level: 0, pressure: BASE_PRESSURE, setpoint: raw.setpoint, valve: 100,
        pump: false, auto: raw.auto, hazard: "none",
        sisEnabled: d.sisEnabled, safety: "sis_trip",
        alarms: ["🛑 SIS DISPARADO: paro seguro de emergencia. La planta está detenida (producción perdida) pero intacta."],
      };
    }
    return { ...raw, sisEnabled: d.sisEnabled, safety: "ok" };
  }

  /** Latchea la consecuencia de seguridad tras una escritura: si la presión del
   *  control cruza el umbral de disparo, el SIS dispara (paro seguro); si el SIS
   *  está deshabilitado, la misma presión rompe la vasija (daño irreversible). */
  private applySafety(d: PlcDeviceState): void {
    if (d.ruptured || d.sisTripped) return; // ya latcheado
    const p = this.rawProcess(d).pressure;
    if (p >= SIS_TRIP_PRESSURE) {
      if (d.sisEnabled) d.sisTripped = true;
      else d.ruptured = true;
    }
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
    if (d.writeProtected) return { ok: false, message: `PLC en modo protegido (llave RUN): escritura remota rechazada. Deshabilitá la protección primero.` };
    const before = this.process(ref)!;
    coil.value = value;
    this.applySafety(d);
    const after = this.process(ref)!;
    return {
      ok: true,
      message: `coil ${addr} (${coil.label}) = ${value ? "ON" : "OFF"}`,
      label: coil.label,
      kind: "coil",
      hazardBefore: before.hazard,
      hazardAfter: after.hazard,
      safetyBefore: before.safety,
      safetyAfter: after.safety,
    };
  }

  /** Escribe un holding register (Modbus función 06). */
  writeHolding(ref: string, addr: number, raw: number): PlcWriteResult {
    const d = this.find(ref);
    if (!d) return { ok: false, message: "sin dispositivo" };
    const reg = d.holding.find((h) => h.addr === addr);
    if (!reg) return { ok: false, message: `registro ${addr} inexistente (holding válidos: 0–${d.holding.length - 1})` };
    if (d.writeProtected) return { ok: false, message: `PLC en modo protegido (llave RUN): escritura remota rechazada. Deshabilitá la protección primero.` };
    const value = clamp(Math.round(raw), reg.min, reg.max);
    const before = this.process(ref)!;
    reg.value = value;
    this.applySafety(d);
    const after = this.process(ref)!;
    return {
      ok: true,
      message: `holding ${addr} (${reg.label}) = ${value}${reg.unit === "%" ? "%" : ""}`,
      label: reg.label,
      kind: "holding",
      hazardBefore: before.hazard,
      hazardAfter: after.hazard,
      safetyBefore: before.safety,
      safetyAfter: after.safety,
    };
  }

  /** Estado de la capa de seguridad (SIS): habilitado / disparado / rotura. */
  sisState(ref: string): { enabled: boolean; tripped: boolean; ruptured: boolean } | undefined {
    const d = this.find(ref);
    return d ? { enabled: d.sisEnabled, tripped: d.sisTripped, ruptured: d.ruptured } : undefined;
  }

  /**
   * Habilita/deshabilita el SIS. Deshabilitarlo NO cambia el proceso al
   * instante: quita la red de contención, así la próxima sobrepresión destruye
   * la planta en vez de dispararla a paro seguro (el paso clave del ataque
   * estilo TRISIS). Devuelve el estado previo y el nuevo.
   */
  setSis(ref: string, on: boolean): { ok: boolean; was: boolean; now: boolean; blocked?: boolean } {
    const d = this.find(ref);
    if (!d) return { ok: false, was: false, now: false };
    // La protección de escritura también blinda la lógica de seguridad: no se
    // puede tocar el SIS de forma remota con la llave en RUN.
    if (d.writeProtected) return { ok: false, was: d.sisEnabled, now: d.sisEnabled, blocked: true };
    const was = d.sisEnabled;
    d.sisEnabled = on;
    return { ok: true, was, now: on };
  }

  /** ¿El PLC está en modo protegido (llave RUN, escritura remota bloqueada)? */
  isWriteProtected(ref: string): boolean {
    return this.find(ref)?.writeProtected ?? false;
  }

  /**
   * Activa/desactiva la protección de escritura (llave RUN). Activarla es
   * hardening defensivo (bloquea todo Modbus de escritura). Desactivarla de
   * forma remota es lo que hace un atacante para poder escribir: cambia el modo
   * de operación del controlador (ATT&CK ICS T0858). Devuelve estado previo/nuevo.
   */
  setProtect(ref: string, on: boolean): { ok: boolean; was: boolean; now: boolean } {
    const d = this.find(ref);
    if (!d) return { ok: false, was: false, now: false };
    const was = d.writeProtected;
    d.writeProtected = on;
    return { ok: true, was, now: on };
  }

  /** Restaura un PLC a su estado seguro inicial (para labs / reinicio). */
  reset(ref: string): boolean {
    const d = this.find(ref);
    if (!d) return false;
    // Una rotura es IRREVERSIBLE: no se "resetea" la destrucción física.
    if (d.ruptured) return false;
    d.sisEnabled = true;
    d.sisTripped = false;
    d.writeProtected = false;
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
