import { RIVALS, type Rival } from "./RivalHackers";
import type { HostRuntime } from "../net/HostRuntime";

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
 * herramientas. Y el rival CONTRAATACA de verdad: a medida que avanza, ejecuta
 * operaciones REALES sobre el objetivo para trabarte —rota la credencial
 * conocida y filtra tu SSH— y recién `duel trabar` deshace ese sabotaje y lo
 * hace retroceder. El resultado sale del estado, no de un guion.
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
  /** Sabotajes activos del rival sobre el objetivo (te traban de verdad). */
  sabotage: string[];
  /** "vos" | alias del rival | null si sigue abierto. */
  winner: string | null;
}

const DEFAULT_TARGET = "duelo.corp.nande";
const DEFAULT_FLAG = "ND{duelo_ganado}";
/** Umbrales de progreso a los que el rival ejecuta cada contraataque. */
const STAGE_CRED = 45;
const STAGE_PORT = 75;

export class Duel {
  private hosts?: HostRuntime;
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

  // --- Contraataque real del rival sobre el objetivo ---
  /** Etapa de sabotaje ya ejecutada: 0 nada, 1 credencial, 2 credencial+SSH. */
  private counterStage = 0;
  /** Credencial original del objetivo, para poder restaurarla al trabar. */
  private origCred?: { user: string; password: string };
  /** Puerto SSH del objetivo (para filtrarlo/liberarlo). */
  private sshPort = 22;
  /** ¿La credencial está rotada ahora mismo? ¿el SSH filtrado? */
  private credRotated = false;
  private portBlocked = false;

  constructor(hosts?: HostRuntime) {
    this.hosts = hosts;
  }

  /** ETA del bot: más skill, menos ticks. Determinista y reproducible. */
  private etaTicks(skill: number): number {
    // skill 40 → ~34 ticks; skill 92 → ~22 ticks. Deja ventana para jugar.
    return Math.max(18, 40 - Math.floor(skill / 5));
  }

  /**
   * Arranca un duelo: rota al siguiente rival del ranking y fija objetivo,
   * bandera y tick de inicio. Deja el objetivo LIMPIO (deshace cualquier
   * sabotaje previo) para empezar parejo. Reproducible.
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
    this.counterStage = 0;
    // Capturar el estado limpio del objetivo. OJO al orden: primero deshacemos
    // cualquier sabotaje que haya quedado de un duelo anterior y RECIÉN DESPUÉS
    // leemos la credencial. Si capturáramos antes de restaurar, tomaríamos la
    // credencial ROTADA como "original" y el host quedaría bricked para siempre.
    const host = this.hosts?.resolve(this.target);
    if (host) {
      const ssh = host.services.find((s) => s.kind === "ssh");
      this.sshPort = ssh?.port ?? 22;
      this.restoreTarget();
      const cred = host.creds[0];
      if (cred) this.origCred = { user: cred.user, password: cred.password };
    }
    this.log = [
      {
        tick: nowTick,
        who: "sistema",
        action: "Duelo iniciado",
        detail: `Carrera por ${this.flag} en ${this.target}. Rival: ${this.rival.alias} (skill ${this.rival.skill}). ¡El primero que captura, gana! El rival contraataca: apurate.`,
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
   * Latido del duelo: ejecuta los CONTRAATAQUES del rival según su progreso
   * (operaciones reales sobre el objetivo) y resuelve el resultado contra el
   * estado real. Es lo que el kernel llama en cada tick y el comando `duel` al
   * consultarse. Idempotente: cada etapa de sabotaje se ejecuta una sola vez.
   */
  advance(tick: number, playerFlags: readonly string[]): DuelSnapshot {
    if (this.active && this.winner === null) {
      const p = this.botProgressAt(tick);
      // El rival ejecuta su contraataque real a medida que avanza.
      if (this.counterStage < 1 && p >= STAGE_CRED) {
        this.rotateCred(tick);
        this.counterStage = 1;
      }
      if (this.counterStage < 2 && p >= STAGE_PORT) {
        this.blockSsh(tick);
        this.counterStage = 2;
      }
    }
    return this.sync(tick, playerFlags);
  }

  /**
   * Resuelve el resultado con el estado REAL: si el jugador ya capturó la
   * bandera, gana; si no y el bot llegó a 100, gana el bot. Idempotente: el
   * primero que llega fija el resultado. Al terminar, deja el objetivo limpio.
   */
  sync(tick: number, playerFlags: readonly string[]): DuelSnapshot {
    if (this.active && this.winner === null) {
      if (playerFlags.includes(this.flag)) {
        this.winner = "vos";
        this.active = false;
        this.restoreTarget(); // el rival se repliega
        this.log.push({ tick, who: "vos", action: "¡Ganaste!", detail: `Capturaste ${this.flag} antes que ${this.rival.alias}.` });
      } else if (this.botProgressAt(tick) >= 100) {
        this.winner = this.rival.alias;
        this.active = false;
        // El duelo terminó: el rival deja de sabotear el objetivo. Sin esto el
        // host quedaba con la credencial rotada y el SSH filtrado tras la derrota.
        this.restoreTarget();
        this.log.push({ tick, who: this.rival.alias, action: "Te ganó", detail: `${this.rival.alias} completó la intrusión y capturó ${this.flag} primero.` });
      }
    }
    return this.snapshot(tick, playerFlags);
  }

  /**
   * Trabás al rival: acción real de respuesta. DESHACE su sabotaje (restaura la
   * credencial y libera el SSH que te bloqueó) y lo hace retroceder. Sólo
   * mientras el duelo esté abierto. Devuelve qué recuperaste.
   */
  disrupt(tick: number, amount = 40): { ok: boolean; setback: number; undone: string[] } {
    if (!this.active || this.winner !== null) return { ok: false, setback: 0, undone: [] };
    const undone = this.restoreTarget();
    // El sabotaje ya ejecutado quedó deshecho; el rival no lo repite (sus
    // etapas ya se gastaron), pero sigue avanzando: por eso además lo frenás.
    this.setback += amount;
    this.log.push({
      tick,
      who: "vos",
      action: "Trabaste al rival",
      detail:
        `Le cortaste la maniobra a ${this.rival.alias}: retrocedió ${amount}%` +
        (undone.length ? ` y recuperaste ${undone.join(" + ")}.` : ".") +
        ` ¡Aprovechá la ventana!`,
    });
    return { ok: true, setback: amount, undone };
  }

  /** El rival rota la credencial conocida del objetivo: te deja afuera. */
  private rotateCred(tick: number): void {
    const host = this.hosts?.resolve(this.target);
    const cred = host?.creds.find((c) => c.user === this.origCred?.user);
    if (cred) {
      cred.password = `r0t_${this.rival.alias}_${tick}`;
      this.credRotated = true;
    }
    this.log.push({
      tick,
      who: this.rival.alias,
      action: "Contraataque",
      detail: `${this.rival.alias} rotó la credencial de ${this.origCred?.user ?? "acceso"} en ${this.target}: tu clave conocida ya no entra. Trabalo (duel trabar) para recuperarla.`,
    });
  }

  /** El rival filtra el SSH del objetivo: te corta la ruta de entrada. */
  private blockSsh(tick: number): void {
    if (this.hosts) {
      this.hosts.blockPort(this.target, this.sshPort);
      this.portBlocked = true;
    }
    this.log.push({
      tick,
      who: this.rival.alias,
      action: "Contraataque",
      detail: `${this.rival.alias} filtró el puerto ${this.sshPort}/tcp de ${this.target}: te cortó el SSH. Trabalo para reabrirlo.`,
    });
  }

  /** Deshace el sabotaje activo (credencial + SSH). Devuelve qué recuperó. */
  private restoreTarget(): string[] {
    const undone: string[] = [];
    const host = this.hosts?.resolve(this.target);
    if (this.credRotated && this.origCred) {
      const cred = host?.creds.find((c) => c.user === this.origCred!.user);
      if (cred) cred.password = this.origCred.password;
      this.credRotated = false;
      undone.push("la credencial");
    }
    if (this.portBlocked && this.hosts) {
      this.hosts.allowPort(this.target, this.sshPort);
      // Asegurar que el sshd siga corriendo (por si acaso).
      this.hosts.startService(this.target, "sshd");
      this.portBlocked = false;
      undone.push(`el SSH (${this.sshPort}/tcp)`);
    }
    return undone;
  }

  snapshot(tick: number, _playerFlags: readonly string[]): DuelSnapshot {
    const sabotage: string[] = [];
    if (this.credRotated) sabotage.push(`credencial de ${this.origCred?.user ?? "acceso"} rotada`);
    if (this.portBlocked) sabotage.push(`SSH ${this.sshPort}/tcp filtrado`);
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
      sabotage,
      // El resultado sale SIEMPRE del estado ya resuelto por sync/advance (que
      // duelCmd corre antes de leer el snapshot); nada de "ganador tentativo"
      // que dejaría winner!=null con finished=false (estado incoherente).
      winner: this.winner,
    };
  }

  currentRival(): Rival {
    return this.rival;
  }

  timeline(limit = 20): DuelStep[] {
    return this.log.slice(-limit);
  }
}
