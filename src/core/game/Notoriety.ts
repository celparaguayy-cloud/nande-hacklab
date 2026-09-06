import type { EventBus } from "../events/EventBus";

/**
 * Notoriedad, calor y reputación del jugador — la capa de "consecuencias"
 * que convierte a ÑANDE en un juego con tensión.
 *
 * - Notoriedad: cuán conocido sos en el mundo. Sube con cada hazaña.
 * - Calor (heat): cuánto te persiguen. Sube al hacer ruido (ataques
 *   detectables); baja con el tiempo y borrando huellas. Si se pasa, el
 *   Blue Team te cae encima.
 * - Reputación por facción: hacktivistas, corporaciones y agencias. Tus
 *   actos te acercan a unas y te alejan de otras.
 */

export type Faction = "colectivo" | "corporacion" | "agencia";
export type Alignment = "white" | "grey" | "black";

export interface NotorietyState {
  notoriety: number;
  heat: number;
  alignment: Alignment;
  reputation: Record<Faction, number>;
  /** Veces que el Blue Team te detectó. */
  busts: number;
}

const STORAGE_KEY = "nande-notoriety";

/** Umbral de calor que dispara una redada del Blue Team. */
export const HEAT_BUST = 100;

export class Notoriety {
  private state: NotorietyState;
  private events?: EventBus;

  constructor(events?: EventBus) {
    this.events = events;
    this.state = this.load() ?? {
      notoriety: 0,
      heat: 0,
      alignment: "grey",
      reputation: { colectivo: 0, corporacion: 0, agencia: 0 },
      busts: 0,
    };
  }

  private load(): NotorietyState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as NotorietyState;
      if (typeof s.notoriety !== "number") return null;
      return s;
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // El juego funciona igual sin persistir.
    }
  }

  getState(): NotorietyState {
    return structuredClone(this.state);
  }

  addNotoriety(amount: number): void {
    this.state.notoriety = Math.max(0, this.state.notoriety + amount);
    this.save();
    this.events?.emit("player.xp", { notoriety: this.state.notoriety });
  }

  /**
   * Suma calor. Si cruza el umbral, dispara una redada: se registra un
   * "bust", el calor baja de golpe (te tuviste que esconder) y el mundo
   * lo anuncia.
   */
  addHeat(amount: number): { busted: boolean } {
    this.state.heat = Math.max(0, this.state.heat + amount);

    if (this.state.heat >= HEAT_BUST) {
      this.state.busts += 1;
      this.state.heat = 30; // te replegaste, pero seguís marcado
      this.save();
      this.events?.emit("security.alert", {
        kind: "bust",
        busts: this.state.busts,
      });
      return { busted: true };
    }

    this.save();
    return { busted: false };
  }

  /** Enfría el calor (borrar logs, esperar, usar proxies). */
  cool(amount: number): void {
    this.state.heat = Math.max(0, this.state.heat - amount);
    this.save();
  }

  /** El paso del tiempo enfría lentamente. */
  tickCool(): void {
    if (this.state.heat > 0) {
      this.state.heat = Math.max(0, this.state.heat - 0.05);
    }
  }

  adjustReputation(faction: Faction, amount: number): void {
    this.state.reputation[faction] += amount;
    this.recomputeAlignment();
    this.save();
  }

  /** La alineación se deriva de con quién estás bien y con quién mal. */
  private recomputeAlignment(): void {
    const { colectivo, corporacion, agencia } = this.state.reputation;
    const good = agencia + colectivo * 0.5;
    const bad = -corporacion + this.state.busts * 10;

    if (good > 40 && bad < 20) this.state.alignment = "white";
    else if (bad > 40) this.state.alignment = "black";
    else this.state.alignment = "grey";
  }
}
