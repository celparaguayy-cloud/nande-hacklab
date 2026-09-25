import { RIVALS, type Rival } from "./RivalHackers";

/**
 * Duel — PvP EN VIVO contra un bot, dentro del sandbox. No hay red ni oponente
 * humano remoto (rompería el aislamiento): competís contra un rival con nombre
 * —el MISMO del ranking (RivalHackers), una sola fuente de verdad— que corre su
 * propia intrusión sobre el MISMO objetivo del mundo. Gana el primero que
 * captura la bandera.
 *
 * "Real" acá = carrera con estado y ritmo DETERMINISTA (regla 13): el avance del
 * bot es una función pura del reloj del mundo y de su skill (reproducible, no
 * texto al azar). Vos ganás capturando la bandera de verdad con las
 * herramientas (el motor la registra en player.capturedFlags). Podés TRABARLO
 * con una acción real que lo hace retroceder. El resultado sale del estado, no
 * de un guion.
 */

export interface DuelStep {
  tick: number;
  who: string;
  action: string;
  detail: string;
}

export interface DuelSnapshot {
  active: boolean;
  finished: boolean;
  rival: string;
  skill: number;
  target: string;
  flag: string;
  startTick: number;
  /** Progreso del bot 0–100 en el tick consultado. */
  botProgress: number;
  /** ETA del bot en ticks desde el arranque (a ritmo pleno). */
  botEta: number;
  /** "vos" | alias del rival | null si sigue abierto. */
  winner: string | null;
}

const DEFAULT_TARGET = "duelo.corp.nande";
const DEFAULT_FLAG = "ND{duelo_ganado}";

export class Duel {
  private rivalIdx = 0;
  private rival: Rival = RIVALS[0];
  private target = DEFAULT_TARGET;
  private flag = DEFAULT_FLAG;
  private startTick = 0;
  /** Retroceso acumulado (puntos de progreso) por interferencia del jugador. */
  private setback = 0;
  private winner: string | null = null;
  active = false;
  private log: DuelStep[] = [];

  /** ETA del bot: más skill, menos ticks. Determinista y reproducible. */
  private etaTicks(skill: number): number {
    // skill 40 → ~34 ticks; skill 92 → ~22 ticks. Deja ventana para jugar.
    return Math.max(18, 40 - Math.floor(skill / 5));
  }

  /**
   * Arranca un duelo: rota al siguiente rival del ranking y fija objetivo,
   * bandera y tick de inicio. Reproducible: mismo rival para el mismo índice.
   */
  start(nowTick: number, opts?: { target?: string; flag?: string }): DuelSnapshot {
    this.rival = RIVALS[this.rivalIdx % RIVALS.length];
    this.rivalIdx += 1;
    this.target = opts?.target ?? DEFAULT_TARGET;
    this.flag = opts?.flag ?? DEFAULT_FLAG;
    this.startTick = nowTick;
    this.setback = 0;
    this.winner = null;
    this.active = true;
    this.log = [
      {
        tick: nowTick,
        who: "sistema",
        action: "Duelo iniciado",
        detail: `Carrera por ${this.flag} en ${this.target}. Rival: ${this.rival.alias} (skill ${this.rival.skill}). ¡El primero que captura, gana!`,
      },
    ];
    return this.snapshot(nowTick, []);
  }

  /** Progreso del bot en un tick (0–100), descontando la interferencia. */
  botProgressAt(tick: number): number {
    if (!this.active && this.winner === null) return 0;
    const elapsed = Math.max(0, tick - this.startTick);
    const eta = this.etaTicks(this.rival.skill);
    const raw = (elapsed / eta) * 100 - this.setback;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  /**
   * Sincroniza el resultado con el estado REAL: si el jugador ya capturó la
   * bandera, gana; si no y el bot llegó a 100, gana el bot. Idempotente: el
   * primero que llega fija el resultado. Es el corazón del duelo (regla 5/20:
   * el ganador sale del estado observable, no de un texto).
   */
  sync(tick: number, playerFlags: readonly string[]): DuelSnapshot {
    if (this.active && this.winner === null) {
      if (playerFlags.includes(this.flag)) {
        this.winner = "vos";
        this.active = false;
        this.log.push({ tick, who: "vos", action: "¡Ganaste!", detail: `Capturaste ${this.flag} antes que ${this.rival.alias}.` });
      } else if (this.botProgressAt(tick) >= 100) {
        this.winner = this.rival.alias;
        this.active = false;
        this.log.push({ tick, who: this.rival.alias, action: "Te ganó", detail: `${this.rival.alias} completó la intrusión y capturó ${this.flag} primero.` });
      }
    }
    return this.snapshot(tick, playerFlags);
  }

  /**
   * Trabás al bot: acción real de defensa/sabotaje que lo hace retroceder
   * (rotar credencial, cortar su sesión…). Devuelve cuánto retrocedió. Sólo
   * mientras el duelo esté abierto.
   */
  disrupt(tick: number, amount = 30): { ok: boolean; setback: number } {
    if (!this.active || this.winner !== null) return { ok: false, setback: 0 };
    this.setback += amount;
    this.log.push({
      tick,
      who: "vos",
      action: "Trabaste al rival",
      detail: `Interferencia real: ${this.rival.alias} retrocedió ${amount}%. Aprovechá la ventana.`,
    });
    return { ok: true, setback: amount };
  }

  snapshot(tick: number, playerFlags: readonly string[]): DuelSnapshot {
    const won = this.winner === null && playerFlags.includes(this.flag);
    return {
      active: this.active,
      finished: this.winner !== null,
      rival: this.rival.alias,
      skill: this.rival.skill,
      target: this.target,
      flag: this.flag,
      startTick: this.startTick,
      botProgress: this.botProgressAt(tick),
      botEta: this.etaTicks(this.rival.skill),
      winner: this.winner ?? (won ? "vos" : null),
    };
  }

  currentRival(): Rival {
    return this.rival;
  }

  timeline(limit = 20): DuelStep[] {
    return this.log.slice(-limit);
  }
}
