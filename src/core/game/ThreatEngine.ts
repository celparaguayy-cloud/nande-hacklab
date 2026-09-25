import type { HostRuntime } from "../net/HostRuntime";
import { actorAliases } from "../threat/ThreatActors";

/**
 * ThreatEngine — el mundo ataca de vuelta. Cada tanto, un hacker rival golpea
 * TU data center (midc.nande): tira un servicio o intenta forzar el acceso.
 * Eso genera eventos reales que el SOC detecta como alertas. Vos tenés que
 * CONTENER el incidente (restaurar el servicio, endurecer). Es el Blue Team
 * jugable: aprendés a defender respondiendo a ataques de verdad.
 *
 * Sólo toca midc.nande (host dedicado a defensa), nunca los laboratorios, así
 * no interfiere con las misiones ni con el CTF.
 */

export interface Incident {
  id: string;
  host: string;
  service: string;
  rival: string;
  tick: number;
  resolved: boolean;
}

// Los atacantes del data center salen del registro ÚNICO de actores de amenaza
// (regla 2/8): el que te golpea es el que documentás/atribuís en TI.
const RIVALS = actorAliases();
const DEFENSE_HOST = "midc.nande";

interface ThreatState {
  score: number;
  contained: number;
  breached: number;
}

const STORAGE_KEY = "nande-threats";

export class ThreatEngine {
  private hosts: HostRuntime;
  private incidents: Incident[] = [];
  private seq = 0;
  private rngState = 0xc0ffee;
  private state: ThreatState;

  constructor(hosts: HostRuntime) {
    this.hosts = hosts;
    this.state = this.load();
  }

  private load(): ThreatState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as ThreatState;
        return {
          score: s.score ?? 0,
          contained: s.contained ?? 0,
          breached: s.breached ?? 0,
        };
      }
    } catch {
      /* sin persistencia */
    }
    return { score: 0, contained: 0, breached: 0 };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* sin persistencia */
    }
  }

  private rng(): number {
    this.rngState = (Math.imul(this.rngState, 1664525) + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  }

  /**
   * Lanza un ataque contra tu data center si toca (lo llama el kernel en el
   * tick). Devuelve el incidente creado, o null si no atacó.
   */
  maybeAttack(tick: number): Incident | null {
    const host = this.hosts.byHost(DEFENSE_HOST);
    if (!host) return null;

    // Sólo ataca si hay algún servicio corriendo para tirar.
    const corriendo = host.services.filter((s) => s.state === "running");
    if (corriendo.length === 0) return null;

    // Un ataque a la vez: si ya hay un incidente abierto, no encima otro.
    if (this.incidents.some((i) => !i.resolved)) return null;

    const svc = corriendo[Math.floor(this.rng() * corriendo.length)];
    const rival = RIVALS[Math.floor(this.rng() * RIVALS.length)];

    // El ataque tira el servicio: el SOC lo verá como caída (evento real).
    this.hosts.stopService(DEFENSE_HOST, svc.name);

    const incident: Incident = {
      id: `inc${++this.seq}`,
      host: DEFENSE_HOST,
      service: svc.name,
      rival,
      tick,
      resolved: false,
    };
    this.incidents.unshift(incident);
    return incident;
  }

  /** Incidentes (más nuevos primero). */
  list(limit = 20): Incident[] {
    return this.incidents.slice(0, limit);
  }

  openIncidents(): Incident[] {
    return this.incidents.filter((i) => !i.resolved);
  }

  /**
   * Contener un incidente: restaura el servicio caído. Suma puntos (más si
   * respondés rápido). Lo llama la UI/terminal.
   */
  contain(id: string, tick: number): { ok: boolean; message: string; points?: number } {
    const inc = this.incidents.find((i) => i.id === id);
    if (!inc) return { ok: false, message: `no existe el incidente ${id}` };
    if (inc.resolved) return { ok: true, message: "ese incidente ya estaba contenido" };

    this.hosts.startService(inc.host, inc.service);
    inc.resolved = true;

    const demora = Math.max(0, tick - inc.tick);
    const points = Math.max(20, 200 - demora); // rápido = más puntos
    this.state.score += points;
    this.state.contained += 1;
    this.save();
    return {
      ok: true,
      message: `Incidente contenido: ${inc.service} de ${inc.host} restaurado (+${points} pts)`,
      points,
    };
  }

  /** Contener todos los abiertos de una (para la UI). */
  containAll(tick: number): number {
    let n = 0;
    for (const inc of this.openIncidents()) {
      if (this.contain(inc.id, tick).ok) n += 1;
    }
    return n;
  }

  scoreState(): ThreatState {
    return { ...this.state };
  }

  rank(): string {
    const s = this.state.score;
    return s >= 2000 ? "CISO" : s >= 1000 ? "Analista senior" : s >= 300 ? "Analista SOC" : "Aprendiz";
  }
}

export { DEFENSE_HOST };
