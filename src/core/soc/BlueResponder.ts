import type { EventBus } from "../events/EventBus";
import type { AttackSignal } from "../ad/Directory";
import type { ContainmentEngine, ContainmentResult } from "./Containment";

/**
 * BlueTeamResponder — el equipo azul AUTÓNOMO. El mundo ya tenía un adversario
 * rojo que ataca solo (RedTeamAgent); faltaba su simétrico: un defensor que
 * DETECTA y RESPONDE solo. Cierra el purple team como un sistema vivo —ser
 * ruidoso tiene consecuencias— y enseña OPSEC de verdad: si hacés algo grave y
 * detectable, el SOC te contiene.
 *
 * No inventa nada ni duplica lógica: escucha las MISMAS señales ofensivas que la
 * matriz ATT&CK y el SOC (attack.technique), y cuando una es GRAVE ejecuta una
 * respuesta PROPORCIONAL a través del ContainmentEngine —una acción por
 * detección, la más urgente que el estado real recomiende (aislar el pivote o
 * deshabilitar al Domain Admin)—. El atacante siente que las paredes se cierran.
 *
 * Tres posturas: "off" (inerte, por defecto — no cambia el juego a menos que lo
 * actives), "monitor" (detecta y avisa, no contiene) y "active" (contiene).
 */

export type BluePosture = "off" | "monitor" | "active";

export interface BlueResponse {
  seq: number;
  tick: number;
  /** Técnica que gatilló la respuesta (mitreId · nombre). */
  trigger: string;
  posture: BluePosture;
  /** Qué hizo el defensor (o por qué no hizo nada). */
  action: string;
  /** true si se aplicó una contención real. */
  contained: boolean;
}

/**
 * Técnicas que gatillan al defensor autónomo: las GRAVES. El recon o una
 * credencial en claro no lo despiertan (sería ruido); sí el sabotaje OT, el
 * control del dominio, el volcado de credenciales y el roasting.
 */
const TRIGGER = new Set([
  // OT/ICS: sabotaje físico y deshabilitar la seguridad.
  "T0831", "T0879", "T0880", "T0828", "T0858",
  // Dominio: dominancia, DCSync, Golden Ticket, ADCS y material de auth alterno.
  "T1078.002", "T1003.006", "T1558.001", "T1649", "T1550", "T1550.002",
  // Roasting: mucho ruido en el KDC.
  "T1558.003", "T1558.004",
]);

export class BlueTeamResponder {
  private containment: ContainmentEngine;
  private clock: () => number;
  private onNews?: (title: string, body: string, tick: number) => void;
  /** ¿La actividad es ATRIBUIBLE? (origen no anonimizado). Si el atacante enruta
   *  por Tor, el SOC detecta la técnica pero no puede rastrear el origen: sin
   *  atribución no contiene. Es lo que hace del anonimato una defensa REAL. */
  private attributable: () => boolean;
  private stance: BluePosture = "off";
  private log: BlueResponse[] = [];
  private seq = 0;
  private observations = 0;
  private unsub: () => void;

  constructor(
    events: EventBus,
    containment: ContainmentEngine,
    clock: () => number = () => 0,
    onNews?: (title: string, body: string, tick: number) => void,
    attributable: () => boolean = () => true,
  ) {
    this.containment = containment;
    this.clock = clock;
    this.onNews = onNews;
    this.attributable = attributable;
    this.unsub = events.subscribe<AttackSignal>("attack.technique", (e) => this.onSignal(e.data));
  }

  dispose(): void {
    this.unsub();
  }

  setPosture(p: BluePosture): void {
    this.stance = p;
  }
  posture(): BluePosture {
    return this.stance;
  }
  responses(): BlueResponse[] {
    return [...this.log];
  }
  /** Cuántas señales ofensivas observó estando encendido (monitor/active). */
  observationCount(): number {
    return this.observations;
  }
  count(): number {
    return this.log.length;
  }
  reset(): void {
    this.log = [];
    this.seq = 0;
    this.observations = 0;
  }

  private note(trigger: string, action: string, contained: boolean): void {
    this.log.push({ seq: ++this.seq, tick: this.clock(), trigger, posture: this.stance, action, contained });
  }

  private onSignal(s: AttackSignal): void {
    if (this.stance === "off") return; // inerte: no cambia el juego a menos que se active
    this.observations += 1;
    if (!TRIGGER.has(s.mitreId)) return; // sólo reacciona a lo GRAVE
    const trigger = `${s.mitreId} · ${s.technique}`;

    if (this.stance === "monitor") {
      this.note(trigger, "detección de alta gravedad — el SOC observa (modo monitor, sin contener)", false);
      this.onNews?.(
        "El SOC detectó actividad de alta gravedad",
        `Se observó ${s.technique}. El equipo azul está en modo monitoreo (todavía no contiene).`,
        this.clock(),
      );
      return;
    }

    // active: para CONTENER, el SOC necesita ATRIBUIR el origen. Si enrutaste por
    // Tor, ve la técnica pero no de dónde vino → detecta y NO contiene. El
    // anonimato es una defensa real (lección de OPSEC, regla 12).
    if (!this.attributable()) {
      this.note(trigger, "detección de alta gravedad — origen ANÓNIMO (Tor): sin atribución, no se puede contener", false);
      this.onNews?.(
        "El SOC detectó una intrusión pero no pudo rastrear el origen",
        `Se observó ${s.technique}, pero el tráfico venía anonimizado: sin atribución no hay contención.`,
        this.clock(),
      );
      return;
    }

    // active: respuesta PROPORCIONAL — una acción, la más urgente que el estado
    // real recomiende. Reutiliza el plan del ContainmentEngine (sin duplicar).
    const recs = this.containment.recommend();
    if (recs.length === 0) {
      this.note(trigger, "detección de alta gravedad — nada que contener todavía", false);
      return;
    }
    const top = recs[0];
    const res: ContainmentResult =
      top.action === "isolate-host"
        ? this.containment.isolateHost(top.target)
        : this.containment.disableAccount(top.target);
    this.note(trigger, res.message, res.ok);
    if (res.ok) {
      this.onNews?.(
        "El equipo azul respondió a la intrusión",
        `Tras detectar ${s.technique}, el SOC aplicó contención automática: ${res.message}`,
        this.clock(),
      );
    }
  }
}
