import type { VirtualPerson, VirtualProfession } from "./WorldEngine";

/**
 * Medios de vida de los habitantes de ÑANDE.
 *
 * Antes la gente existía pero no progresaba: no tenía plata, ni habilidad
 * que creciera, ni empleo, ni futuro. Este sistema le da una vida
 * económica que avanza sola: cada persona cobra según su oficio, gasta,
 * mejora su habilidad con la práctica, asciende cuando le va bien y a
 * veces cambia de oficio o funda algo. De ahí sale, además, la
 * productividad por sector que mueve la bolsa con fundamentos y no solo
 * con ruido.
 *
 * Para que 2000 personas no cuesten caras por tick, cada tick sólo avanza
 * una porción rotativa de la población; en unos pocos ticks pasan todas.
 */

/** A qué sector económico (y ticker de la bolsa) aporta cada profesión. */
const PROFESSION_SECTOR: Record<VirtualProfession, string> = {
  developer: "ARA", // Arandu Software
  "security-analyst": "PYT", // Pytã Security
  technician: "TAP", // Tapé Networks
  designer: "YVO", // Yvoty Media
  journalist: "YVO",
  gamer: "YVO",
  merchant: "GUA", // Guaraní Tech (comercio/tecnología)
  entrepreneur: "MBA", // Mbarete Bank
  researcher: "KUA", // Kuarahy Energy
  teacher: "ÑND", // Ñande Corp
  student: "ÑND",
  user: "ÑND",
};

/** Ingreso base por día del mundo, por profesión. */
const BASE_INCOME: Record<VirtualProfession, number> = {
  developer: 320,
  "security-analyst": 380,
  technician: 240,
  designer: 260,
  journalist: 220,
  gamer: 160,
  merchant: 300,
  entrepreneur: 420,
  researcher: 340,
  teacher: 250,
  student: 90,
  user: 120,
};

/** Escalera de ascenso: al progresar, se sube por acá. */
const CAREER_LADDER: Partial<Record<VirtualProfession, VirtualProfession>> = {
  student: "developer",
  user: "technician",
  gamer: "designer",
  technician: "security-analyst",
  designer: "developer",
  developer: "entrepreneur",
  "security-analyst": "entrepreneur",
  teacher: "researcher",
};

export interface Livelihood {
  personId: string;
  profession: VirtualProfession;
  /** Dinero acumulado (N$). */
  wealth: number;
  /** Habilidad 0–100; crece con la práctica. */
  skill: number;
  /** Título del puesto, derivado de la habilidad. */
  jobTitle: string;
  /** Cuántas veces ascendió. */
  promotions: number;
  /** Empresa fundada, si emprendió (nombre). */
  venture?: string;
}

export interface LivelihoodStats {
  totalWealth: number;
  averageSkill: number;
  promotions: number;
  ventures: number;
  /** Los habitantes con más plata, para el ranking. */
  richest: { name: string; wealth: number; jobTitle: string }[];
  /** Plata en las cajas de las empresas (dinero circulando en negocios). */
  businessTreasury: number;
  /** Cuántas empresas con caja hay en el mundo. */
  businessCount: number;
  /** Las empresas con más caja (blancos jugosos para hackear). */
  topBusinesses: { name: string; treasury: number }[];
}

/** Una empresa del mundo: su caja crece con las compras y paga a su dueño. */
interface Business {
  name: string;
  /** Dinero en caja (guaraníes). */
  treasury: number;
}

const TITLES = ["Junior", "Semi Senior", "Senior", "Líder", "Referente"];

function titleFor(skill: number): string {
  return TITLES[Math.min(TITLES.length - 1, Math.floor(skill / 20))];
}

/** Cuántas personas avanza cada tick (el resto espera su turno). */
const BATCH = 120;

export class Livelihoods {
  private state = new Map<string, Livelihood>();
  private order: string[] = [];
  private cursor = 0;
  /** Empresas del mundo, por id del dueño. Su caja circula plata de verdad. */
  private businesses = new Map<string, Business>();
  /** Índice de dueños con empresa, para elegir a quién le compra cada quien. */
  private businessKeys: string[] = [];

  constructor(people: Iterable<VirtualPerson>) {
    for (const person of people) {
      // La riqueza y la habilidad iniciales dependen de la edad y el nivel
      // técnico: alguien de 40 con nivel alto arranca mejor que un joven.
      const skill = Math.min(
        100,
        person.technicalLevel * 8 + Math.round((person.age - 18) * 0.8),
      );

      this.state.set(person.id, {
        personId: person.id,
        profession: person.profession,
        wealth: 500 + skill * 30,
        skill: Math.max(2, skill),
        jobTitle: titleFor(skill),
        promotions: 0,
      });

      this.order.push(person.id);
    }
  }

  get(id: string): Livelihood | undefined {
    return this.state.get(id);
  }

  /**
   * Registra (o capitaliza) una empresa de un dueño. La caja arranca con el
   * capital dado y desde ahí crece con las compras de la gente. Volver a
   * llamar con el mismo dueño suma capital, no duplica la empresa.
   */
  registerBusiness(ownerId: string, name: string, capital = 0): void {
    const existing = this.businesses.get(ownerId);
    if (existing) {
      existing.treasury += Math.max(0, capital);
      return;
    }
    this.businesses.set(ownerId, { name, treasury: Math.max(0, capital) });
    this.businessKeys.push(ownerId);
  }

  /** Caja de la empresa de un dueño (0 si no tiene). */
  businessTreasuryOf(ownerId: string): number {
    return Math.round(this.businesses.get(ownerId)?.treasury ?? 0);
  }

  /**
   * Plata disponible de una persona para robar o mostrar: su bolsillo MÁS la
   * caja de su empresa si la tiene. Por eso hackear a un dueño de empresa
   * (un banco, una corporación) paga mucho más que a un vecino cualquiera.
   */
  wealthOf(id: string): number {
    const personal = this.state.get(id)?.wealth ?? 0;
    const business = this.businesses.get(id)?.treasury ?? 0;
    return Math.round(personal + business);
  }

  /**
   * Retira dinero de una persona (un robo): primero de su bolsillo, después
   * de la caja de su empresa. Devuelve cuánto se pudo sacar de verdad. Es
   * plata que sale de la economía del NPC y entra a la del jugador: circula.
   */
  withdraw(id: string, amount?: number): number {
    const life = this.state.get(id);
    const biz = this.businesses.get(id);

    const available = (life?.wealth ?? 0) + (biz?.treasury ?? 0);
    if (available <= 0) return 0;

    const take = amount == null ? available : Math.min(Math.max(0, amount), available);
    let remaining = take;

    if (life) {
      const fromWallet = Math.min(remaining, life.wealth);
      life.wealth -= fromWallet;
      remaining -= fromWallet;
    }
    if (biz && remaining > 0) {
      const fromTreasury = Math.min(remaining, biz.treasury);
      biz.treasury -= fromTreasury;
      remaining -= fromTreasury;
    }

    return Math.round(take - remaining);
  }

  /**
   * Avanza un lote de habitantes un paso de vida económica.
   *
   * @param dayChanged  Si cambió el día del mundo: ese día se cobra el
   *                    sueldo y se paga el costo de vida.
   */
  tick(dayChanged: boolean, nameOf: (id: string) => string): void {
    if (this.order.length === 0) return;

    for (let n = 0; n < BATCH; n += 1) {
      const id = this.order[this.cursor % this.order.length];
      this.cursor += 1;

      const life = this.state.get(id);
      if (!life) continue;

      // La práctica mejora la habilidad, con rendimientos decrecientes.
      if (Math.random() < 0.35) {
        life.skill = Math.min(100, life.skill + (100 - life.skill) * 0.01);
        life.jobTitle = titleFor(life.skill);
      }

      if (dayChanged) {
        // Cobra según oficio y habilidad; gasta un costo de vida.
        const income =
          BASE_INCOME[life.profession] * (0.6 + life.skill / 100);
        const costOfLiving = 120 + life.wealth * 0.002;
        life.wealth = Math.max(0, life.wealth + income - costOfLiving);

        // Circulación real: la plata se mueve entre la gente y las empresas.
        if (this.businessKeys.length > 0) {
          // 1) El habitante le compra a alguna empresa: su plata pasa a la
          //    caja de ese negocio (transferencia, no se crea ni destruye).
          const purchase = Math.min(life.wealth * 0.03, 250);
          if (purchase > 1) {
            const pick =
              this.businessKeys[(this.cursor + n) % this.businessKeys.length];
            const target = this.businesses.get(pick);
            // Nadie le compra a su propia empresa en este paso.
            if (target && pick !== id) {
              life.wealth -= purchase;
              target.treasury += purchase;
            }
          }

          // 2) Si este habitante es dueño de una empresa, la empresa le paga
          //    un dividendo desde su caja: la plata vuelve a la gente.
          const own = this.businesses.get(id);
          if (own && own.treasury > 500) {
            const dividend = own.treasury * 0.25;
            own.treasury -= dividend;
            life.wealth += dividend;
          }
        }
      }

      // Ascenso: habilidad alta y algo de plata ahorrada.
      const next = CAREER_LADDER[life.profession];
      if (next && life.skill > 55 && life.wealth > 6000 && Math.random() < 0.02) {
        life.profession = next;
        life.promotions += 1;
        life.skill = Math.max(30, life.skill - 15); // arranca abajo en el nuevo puesto
        life.jobTitle = titleFor(life.skill);
      }

      // Emprender: mucha habilidad y capital → funda una empresa.
      if (
        !life.venture &&
        life.skill > 75 &&
        life.wealth > 15000 &&
        Math.random() < 0.01
      ) {
        life.venture = `${nameOf(id).split(" ")[0]} & Co`;
        // El capital inicial no se evapora: pasa a la caja de la nueva
        // empresa, que desde ya empieza a circular plata en el mundo.
        life.wealth -= 8000;
        this.registerBusiness(id, life.venture, 8000);
      }
    }
  }

  /**
   * Fuerza de cada sector: promedio de habilidad ponderado por riqueza de
   * quienes trabajan en él. La bolsa lo usa como fundamento.
   */
  sectorStrength(): Record<string, number> {
    const totals: Record<string, { skill: number; count: number }> = {};

    for (const life of this.state.values()) {
      const ticker = PROFESSION_SECTOR[life.profession] ?? "ÑND";
      const bucket = (totals[ticker] ??= { skill: 0, count: 0 });
      bucket.skill += life.skill;
      bucket.count += 1;
    }

    const out: Record<string, number> = {};

    for (const [ticker, { skill, count }] of Object.entries(totals)) {
      // Normalizado a 0–1 alrededor de una habilidad media de 50.
      out[ticker] = count > 0 ? skill / count / 100 : 0.5;
    }

    return out;
  }

  stats(nameOf: (id: string) => string): LivelihoodStats {
    let totalWealth = 0;
    let totalSkill = 0;
    let promotions = 0;
    let ventures = 0;

    for (const life of this.state.values()) {
      totalWealth += life.wealth;
      totalSkill += life.skill;
      promotions += life.promotions;
      if (life.venture) ventures += 1;
    }

    const count = this.state.size || 1;

    const richest = [...this.state.values()]
      .sort((a, b) => b.wealth - a.wealth)
      .slice(0, 8)
      .map((life) => ({
        name: nameOf(life.personId),
        wealth: Math.round(life.wealth),
        jobTitle: life.venture
          ? `Fundó ${life.venture}`
          : `${life.jobTitle} · ${life.profession}`,
      }));

    let businessTreasury = 0;
    for (const biz of this.businesses.values()) businessTreasury += biz.treasury;

    const topBusinesses = [...this.businesses.values()]
      .sort((a, b) => b.treasury - a.treasury)
      .slice(0, 6)
      .map((biz) => ({ name: biz.name, treasury: Math.round(biz.treasury) }));

    return {
      totalWealth: Math.round(totalWealth),
      averageSkill: Math.round((totalSkill / count) * 10) / 10,
      promotions,
      ventures,
      richest,
      businessTreasury: Math.round(businessTreasury),
      businessCount: this.businesses.size,
      topBusinesses,
    };
  }
}
