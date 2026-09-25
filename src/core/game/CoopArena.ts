import type { HostRuntime } from "../net/HostRuntime";

/**
 * CoopArena — co-op EN EL MISMO DISPOSITIVO (hot-seat): dos personas, un solo
 * mundo, por turnos. No hay red ni segundo dispositivo (rompería el
 * aislamiento): los dos jugadores comparten el MISMO estado del sandbox y se
 * turnan en la misma pantalla. Rojo (ataque) tira servicios de un host; Azul
 * (defensa) los restaura. Gana quien más puntos hace.
 *
 * "Real" acá = las jugadas son operaciones REALES del runtime (start/stop de
 * servicios sobre midc.nande), con sus eventos, que el SOC ve igual (regla
 * 3/5). El resultado sale del estado y de las decisiones de cada humano, no de
 * un guion: el motor sólo valida el turno y ejecuta. Determinista respecto de
 * las jugadas que hacen los jugadores.
 */

export type CoopRole = "rojo" | "azul";

export interface CoopSeat {
  name: string;
  role: CoopRole;
  score: number;
}

export interface CoopSnapshot {
  active: boolean;
  finished: boolean;
  target: string;
  /** De quién es el turno ahora. */
  turn: CoopRole;
  turnsLeft: number;
  rojo: CoopSeat;
  azul: CoopSeat;
  /** Nombre del ganador, "empate", o null si sigue en juego. */
  winner: string | null;
  servicesUp: number;
  servicesDown: number;
}

export interface CoopStep {
  turn: number;
  who: string;
  action: string;
  detail: string;
}

const DEFAULT_TARGET = "midc.nande";
const POINTS = 10;

export class CoopArena {
  private hosts: HostRuntime;
  private target = DEFAULT_TARGET;
  private rojo: CoopSeat = { name: "Rojo", role: "rojo", score: 0 };
  private azul: CoopSeat = { name: "Azul", role: "azul", score: 0 };
  private turn: CoopRole = "rojo";
  private turnsLeft = 0;
  private winner: string | null = null;
  active = false;
  private log: CoopStep[] = [];

  constructor(hosts: HostRuntime) {
    this.hosts = hosts;
  }

  /**
   * Arranca una ronda hot-seat. Rojo ataca primero. Deja todos los servicios
   * del objetivo ARRIBA para empezar parejo. `turns` es el total de jugadas
   * (repartidas por turnos alternos).
   */
  start(rojoName: string, azulName: string, turns = 6): CoopSnapshot {
    this.target = DEFAULT_TARGET;
    this.rojo = { name: rojoName.trim().slice(0, 20) || "Rojo", role: "rojo", score: 0 };
    this.azul = { name: azulName.trim().slice(0, 20) || "Azul", role: "azul", score: 0 };
    this.turn = "rojo";
    this.turnsLeft = Math.max(2, turns);
    this.winner = null;
    this.active = true;
    this.log = [
      {
        turn: 0,
        who: "sistema",
        action: "Co-op iniciado",
        detail: `${this.rojo.name} (rojo/ataque) vs ${this.azul.name} (azul/defensa) sobre ${this.target}. Empieza Rojo.`,
      },
    ];
    // Todos los servicios del objetivo arrancan arriba (parejo).
    const host = this.hosts.resolve(this.target);
    if (host) for (const s of host.services) this.hosts.startService(this.target, s.name);
    return this.snapshot();
  }

  private seat(role: CoopRole): CoopSeat {
    return role === "rojo" ? this.rojo : this.azul;
  }

  /** Servicios del objetivo (para elegir sobre cuál jugar). */
  services(): { name: string; running: boolean }[] {
    const host = this.hosts.resolve(this.target);
    if (!host) return [];
    return host.services.map((s) => ({ name: s.name, running: s.state === "running" }));
  }

  /**
   * Una jugada de `role` sobre un servicio. Rojo lo TIRA (debe estar
   * corriendo); Azul lo RESTAURA (debe estar caído). Acción real del runtime.
   * Sólo procede si es el turno de ese rol y la jugada es válida (si no, no
   * consume el turno: no se castiga un tipeo). Devuelve el resultado.
   */
  move(role: CoopRole, service: string): { ok: boolean; message: string } {
    if (!this.active || this.winner !== null) {
      return { ok: false, message: "no hay una ronda de co-op en curso (empezá con: coop empezar)" };
    }
    if (role !== this.turn) {
      return { ok: false, message: `no es tu turno: le toca a ${this.seat(this.turn).name} (${this.turn})` };
    }
    const host = this.hosts.resolve(this.target);
    const svc = host?.services.find((s) => s.name.toLowerCase() === service.toLowerCase());
    if (!svc) {
      return { ok: false, message: `servicio desconocido en ${this.target}: ${service}` };
    }

    let msg: string;
    if (role === "rojo") {
      if (svc.state !== "running") {
        return { ok: false, message: `${svc.name} ya estaba caído — elegí uno que esté arriba` };
      }
      this.hosts.stopService(this.target, svc.name);
      this.rojo.score += POINTS;
      msg = `${this.rojo.name} tiró ${svc.name} en ${this.target} (+${POINTS}).`;
    } else {
      if (svc.state === "running") {
        return { ok: false, message: `${svc.name} ya estaba arriba — restaurá uno que esté caído` };
      }
      this.hosts.startService(this.target, svc.name);
      this.azul.score += POINTS;
      msg = `${this.azul.name} restauró ${svc.name} en ${this.target} (+${POINTS}).`;
    }

    this.log.push({ turn: this.turnsLeft, who: this.seat(role).name, action: role === "rojo" ? "Ataque" : "Defensa", detail: msg });
    this.turnsLeft -= 1;
    this.turn = this.turn === "rojo" ? "azul" : "rojo";
    if (this.turnsLeft <= 0) this.finish();
    return { ok: true, message: msg };
  }

  private finish(): void {
    this.active = false;
    if (this.rojo.score > this.azul.score) this.winner = this.rojo.name;
    else if (this.azul.score > this.rojo.score) this.winner = this.azul.name;
    else this.winner = "empate";
    this.log.push({
      turn: 0,
      who: "sistema",
      action: "Fin",
      detail:
        this.winner === "empate"
          ? `Empate ${this.rojo.score}–${this.azul.score}.`
          : `Ganó ${this.winner} (${this.rojo.name} ${this.rojo.score} – ${this.azul.name} ${this.azul.score}).`,
    });
  }

  snapshot(): CoopSnapshot {
    const svcs = this.services();
    return {
      active: this.active,
      finished: this.winner !== null,
      target: this.target,
      turn: this.turn,
      turnsLeft: this.turnsLeft,
      rojo: { ...this.rojo },
      azul: { ...this.azul },
      winner: this.winner,
      servicesUp: svcs.filter((s) => s.running).length,
      servicesDown: svcs.filter((s) => !s.running).length,
    };
  }

  timeline(limit = 20): CoopStep[] {
    return this.log.slice(-limit);
  }
}
