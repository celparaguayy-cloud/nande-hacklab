/**
 * Tu empresa (20-cambios #10).
 *
 * El jugador deja de ser solo atacante: funda su propia empresa, la ve
 * crecer y —lo importante— la DEFIENDE. Cada tanto un atacante prueba una
 * técnica; si activaste el control correcto, lo repelés; si no, te sacan
 * plata de la caja. Es Blue Team desde la silla del dueño: entendés por qué
 * cada control importa cuando el atacado sos vos.
 *
 * Estado persistido y lógica pura (la parte de azar la decide quien llama,
 * pasando el número de ataque), así que es testeable.
 */

const STORAGE_KEY = "nande-company";

/** Costo para fundar la empresa (se cobra de la billetera del jugador). */
export const FOUNDING_COST = 500;

/** Controles de seguridad que se pueden activar, con su costo. */
export interface Control {
  id: string;
  nombre: string;
  costo: number;
  /** Qué ataque repele. */
  repele: string;
}

export const CONTROLS: Control[] = [
  { id: "waf", nombre: "WAF (firewall de aplicaciones)", costo: 200, repele: "sqli" },
  { id: "mfa", nombre: "MFA (segundo factor)", costo: 150, repele: "credenciales" },
  { id: "backups", nombre: "Backups offline", costo: 120, repele: "ransomware" },
  { id: "parches", nombre: "Gestión de parches", costo: 180, repele: "cve" },
  { id: "monitoreo", nombre: "Monitoreo / SIEM", costo: 220, repele: "sigilo" },
];

/** Los ataques posibles y qué buscan. */
export const ATTACKS: { id: string; texto: string }[] = [
  { id: "sqli", texto: "inyección SQL contra tu web" },
  { id: "credenciales", texto: "robo de credenciales de un empleado" },
  { id: "ransomware", texto: "ransomware que cifra tus archivos" },
  { id: "cve", texto: "explotación de una vulnerabilidad conocida sin parchear" },
  { id: "sigilo", texto: "un intruso que se mueve sin ser visto" },
];

export interface CompanyState {
  name: string;
  foundedDay: number;
  treasury: number;
  /** Controles activados (ids). */
  defenses: string[];
  /** Ataques repelidos y sufridos, para el historial. */
  repelidos: number;
  sufridos: number;
  /** Último parte de seguridad, para mostrar en la UI. */
  ultimoParte?: string;
}

export interface AttackResult {
  attackId: string;
  repelido: boolean;
  perdida: number;
  mensaje: string;
}

export class PlayerCompany {
  private state: CompanyState | null;

  constructor() {
    this.state = this.load();
  }

  private load(): CompanyState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as CompanyState;
      if (typeof s.name !== "string" || !Array.isArray(s.defenses)) return null;
      return s;
    } catch {
      return null;
    }
  }

  private save(): void {
    if (!this.state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* se puede jugar sin persistir */
    }
  }

  exists(): boolean {
    return this.state !== null;
  }

  get(): CompanyState | null {
    return this.state ? { ...this.state, defenses: [...this.state.defenses] } : null;
  }

  /** Funda la empresa. Devuelve si se pudo (nombre válido y no existía). */
  found(name: string, day: number): boolean {
    const limpio = name.trim();
    if (this.state || limpio.length < 2) return false;
    this.state = {
      name: limpio,
      foundedDay: day,
      treasury: 1000,
      defenses: [],
      repelidos: 0,
      sufridos: 0,
    };
    this.save();
    return true;
  }

  /** Activa un control. Devuelve si se pudo (existe, hay caja, no estaba). */
  addControl(id: string): boolean {
    const c = CONTROLS.find((x) => x.id === id);
    if (!this.state || !c) return false;
    if (this.state.defenses.includes(id)) return false;
    if (this.state.treasury < c.costo) return false;
    this.state.treasury -= c.costo;
    this.state.defenses.push(id);
    this.save();
    return true;
  }

  /** Ingreso pasivo de un día (la empresa factura). */
  earnDay(): void {
    if (!this.state) return;
    this.state.treasury += 80;
    this.save();
  }

  /**
   * Un atacante prueba una técnica. Si el control que la repele está activo,
   * se frena; si no, te saca plata. `attackIndex` decide cuál (determinista).
   */
  receiveAttack(attackIndex: number): AttackResult | null {
    if (!this.state) return null;
    const atk = ATTACKS[((attackIndex % ATTACKS.length) + ATTACKS.length) % ATTACKS.length];
    const repelido = this.state.defenses.some(
      (d) => CONTROLS.find((c) => c.id === d)?.repele === atk.id,
    );

    let perdida = 0;
    let mensaje: string;
    if (repelido) {
      this.state.repelidos += 1;
      mensaje = `Repeliste un intento de ${atk.texto}: el control correcto estaba activo. 🛡️`;
    } else {
      perdida = Math.min(this.state.treasury, 300);
      this.state.treasury -= perdida;
      this.state.sufridos += 1;
      mensaje = `Sufriste ${atk.texto}: perdiste N$ ${perdida}. Faltaba el control que lo frena.`;
    }
    this.state.ultimoParte = mensaje;
    this.save();
    return { attackId: atk.id, repelido, perdida, mensaje };
  }
}
