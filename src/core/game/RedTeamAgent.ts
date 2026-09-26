import type { HostRuntime } from "../net/HostRuntime";
import { actorAliases, findActor } from "../threat/ThreatActors";

/**
 * RedTeamAgent — un adversario AUTÓNOMO que actúa sobre el mundo de verdad. No
 * "simula" un ataque con texto: ejecuta operaciones reales del runtime (escaneo,
 * intentos de login, caída de un servicio) contra un host sandboxeado. Como usa
 * las MISMAS operaciones que el jugador, el SOC y el correlador MITRE lo detectan
 * solos: nadie fabrica las alertas, nacen del ataque real.
 *
 * Es "el mundo que ataca": rivales con nombre corren su kill-chain paso a paso,
 * y vos (Blue Team) los ves aparecer en las detecciones y podés expulsarlos.
 *
 * Objetivo SIEMPRE ficticio y aislado (corp.nande). Cero targeting real.
 */

export type Phase = "recon" | "brute" | "access" | "impact" | "done";

export interface RedStep {
  tick: number;
  phase: Phase;
  action: string;
  detail: string;
}

export const REDTEAM_TARGET = "objetivo.corp.nande";
// Los atacantes salen del registro ÚNICO de actores de amenaza (regla 2/8):
// el mismo que te ataca es el que documenta/atribuís en la plataforma de TI.
const RIVALS = actorAliases();
const KNOWN_USER = "svc-backup";
const KNOWN_PASS = "Backup#2024";

export class RedTeamAgent {
  private hosts: HostRuntime;
  private phase: Phase = "recon";
  private bruteCount = 0;
  private log: RedStep[] = [];
  private rivalIdx = 0;
  /** ¿El adversario está operando ahora mismo? */
  active = true;
  /** IOC que dejó este actor en su intrusión (evidencia para atribuirlo en TI). */
  private ioc?: string;
  /** Tick del primer paso de esta campaña (>=0 = hay incidente en curso; -1 = ninguno).
   *  Centinela -1 porque el tick 0 es válido (primer tick del mundo). */
  private firstTick = -1;

  constructor(hosts: HostRuntime) {
    this.hosts = hosts;
  }

  rival(): string {
    return RIVALS[this.rivalIdx % RIVALS.length];
  }

  /**
   * Avanza la kill-chain UN paso, ejecutando la operación real. Devuelve el
   * paso ejecutado (o null si el agente está inactivo/terminado). El efecto en
   * el mundo (eventos login.*, service.stopped) lo detectan SOC y MITRE.
   */
  act(tick: number): RedStep | null {
    if (!this.active || this.phase === "done") return null;
    // Al arrancar la campaña, el actor "deja" uno de sus IOCs conocidos: es la
    // evidencia con la que el defensor lo atribuye en TI (igual que el atacante
    // del data center). Un solo mundo, un solo trato para los adversarios.
    if (this.firstTick < 0) {
      this.firstTick = tick;
      this.ioc = findActor(this.rival())?.infra[0];
    }

    let step: RedStep;
    switch (this.phase) {
      case "recon": {
        const open = this.hosts.openServices(REDTEAM_TARGET);
        step = {
          tick,
          phase: "recon",
          action: "Escaneo de puertos",
          detail: `${this.rival()} enumeró ${open.length} servicio(s) de ${REDTEAM_TARGET}.`,
        };
        this.phase = "brute";
        break;
      }
      case "brute": {
        // Intento con credencial incorrecta → evento login.failure real.
        this.hosts.authenticate(REDTEAM_TARGET, KNOWN_USER, `intento${this.bruteCount}`);
        this.bruteCount += 1;
        step = {
          tick,
          phase: "brute",
          action: "Fuerza bruta",
          detail: `${this.rival()} probó credenciales contra ${REDTEAM_TARGET} (intento ${this.bruteCount}).`,
        };
        // Tras varios fallos, pasa a usar la credencial "filtrada".
        if (this.bruteCount >= 4) this.phase = "access";
        break;
      }
      case "access": {
        // Login exitoso real → evento login.success (tras los fallos: MITRE
        // lo marca como cuentas válidas / posible credencial adivinada).
        const r = this.hosts.authenticate(REDTEAM_TARGET, KNOWN_USER, KNOWN_PASS);
        step = {
          tick,
          phase: "access",
          action: "Acceso obtenido",
          detail: `${this.rival()} entró a ${REDTEAM_TARGET} como ${KNOWN_USER} (${r.ok ? "OK" : "falló"}).`,
        };
        this.phase = "impact";
        break;
      }
      case "impact":
      default: {
        // Impacto real: tira un servicio → evento service.stopped.
        this.hosts.stopService(REDTEAM_TARGET, "nginx");
        step = {
          tick,
          phase: "impact",
          action: "Impacto",
          detail: `${this.rival()} detuvo el servicio nginx de ${REDTEAM_TARGET}.`,
        };
        this.phase = "done";
        break;
      }
    }

    this.log.push(step);
    if (this.log.length > 100) this.log.splice(0, this.log.length - 100);
    return step;
  }

  /**
   * El jugador expulsa al adversario (respuesta a incidente): restaura el
   * servicio caído, reinicia la kill-chain y rota al siguiente rival. Devuelve
   * si había algo que expulsar.
   */
  evict(tick = 0): boolean {
    const wasActive = this.phase !== "recon" || this.log.length > 0;
    // Restaurar lo que el adversario haya tirado (efecto real).
    this.hosts.startService(REDTEAM_TARGET, "nginx");
    this.phase = "recon";
    this.bruteCount = 0;
    this.rivalIdx += 1;
    this.active = true;
    this.ioc = undefined;
    this.firstTick = -1; // la campaña se cerró: ya no hay incidente en curso
    this.log.push({
      tick,
      phase: "recon",
      action: "Expulsado",
      detail: `Expulsaste al adversario. Servicio restaurado; el siguiente rival es ${this.rival()}.`,
    });
    return wasActive;
  }

  /**
   * Incidente en curso del adversario autónomo, con el IOC de su actor —de la
   * misma forma que los incidentes del data center—, para que el DFIR lo vea y
   * el defensor lo atribuya en TI. null si no hay campaña activa (o fue
   * expulsada).
   */
  incident(): { host: string; rival: string; tick: number; ioc?: string; resolved: boolean } | null {
    if (this.firstTick < 0) return null;
    return {
      host: REDTEAM_TARGET,
      rival: this.rival(),
      tick: this.firstTick,
      ioc: this.ioc,
      resolved: false,
    };
  }

  currentPhase(): Phase {
    return this.phase;
  }

  timeline(limit = 20): RedStep[] {
    return this.log.slice(-limit);
  }

  /** ¿El objetivo está comprometido ahora (kill-chain completada)? */
  compromised(): boolean {
    return this.phase === "done";
  }
}
