import type { EventBus } from "../events/EventBus";
import type { AttackSignal } from "../ad/Directory";
import type { Notoriety } from "./Notoriety";
import type { Anonymity } from "../security/Anonymity";
import type { TrafficRecord } from "../browser/VirtualBrowser";
import { detectWebExploit, trafficExploitPayload } from "../soc/webSignatures";

/**
 * OpsecTracer — el contraataque del mundo. Cuando VOS ejecutás una técnica
 * ofensiva ruidosa (emite attack.technique), el defensor intenta rastrear el
 * origen. Si NO enrutaste por la red de anonimato, tu IP real queda expuesta y
 * el calor sube; si acumulás ruido, cae una redada (bust). Si usás Tor, el
 * mundo sólo ve el nodo de salida y el rastro se pierde.
 *
 * Es la lección de OPSEC hecha consecuencia real: el anonimato no es cosmético.
 * No hay red real: la "IP visible" y el rastreo son deterministas y educativos.
 */

export interface Trace {
  tick: number;
  technique: string;
  mitreId: string;
  exposed: boolean;
  /** Lo que el defensor "vio" como origen (tu IP real o el nodo de salida). */
  seenSource: string;
}

const PLAYER_IP = "10.10.0.5";
const HEAT_PER_EXPOSED = 12;
const HEAT_PER_MASKED = 1;

export class OpsecTracer {
  private traces: Trace[] = [];
  private notoriety: Notoriety;
  private anonymity: Anonymity;
  private clock: () => number;
  private unsubs: (() => void)[] = [];
  private exposedCount = 0;
  private maskedCount = 0;
  private busts = 0;

  constructor(
    events: EventBus,
    notoriety: Notoriety,
    anonymity: Anonymity,
    clock: () => number,
  ) {
    this.notoriety = notoriety;
    this.anonymity = anonymity;
    this.clock = clock;
    // Rastro por señal ofensiva explícita (AD, privesc, etc.)…
    this.unsubs.push(
      events.subscribe<AttackSignal>("attack.technique", (e) =>
        this.recordTrace(e.data.technique, e.data.mitreId),
      ),
    );
    // …y por explotación web observada en el tráfico real: atacar una app desde
    // tu IP real también te expone (coherencia regla maestra 5). Misma firma
    // que usa el SOC (regla 8), para que ambas capas vean lo mismo.
    this.unsubs.push(
      events.subscribe<TrafficRecord>("network.request", (e) => this.onHttp(e.data)),
    );
  }

  dispose(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  private onHttp(t: TrafficRecord): void {
    const web = detectWebExploit(trafficExploitPayload(t.path, t.reqBody));
    if (web) this.recordTrace(web.technique, web.mitreId);
  }

  private recordTrace(technique: string, mitreId: string): void {
    const tor = this.anonymity.isTorEnabled();
    const exposed = !tor;
    const seenSource = this.anonymity.visibleIp(PLAYER_IP);
    this.traces.push({
      tick: this.clock(),
      technique,
      mitreId,
      exposed,
      seenSource,
    });
    if (this.traces.length > 100) this.traces.splice(0, this.traces.length - 100);

    if (exposed) {
      this.exposedCount += 1;
      // Rastro expuesto: sube el calor. Si cruza el umbral, cae la redada.
      const { busted } = this.notoriety.addHeat(HEAT_PER_EXPOSED);
      if (busted) this.busts += 1;
    } else {
      this.maskedCount += 1;
      // Enrutado por Tor: apenas un poco de ruido, el origen no te delata.
      this.notoriety.addHeat(HEAT_PER_MASKED);
    }
  }

  /** ¿Alguna de las técnicas recientes te dejó expuesto? */
  atRisk(): boolean {
    return this.anonymity.isTorEnabled() === false && this.exposedCount > 0;
  }

  timeline(limit = 20): Trace[] {
    return this.traces.slice(-limit);
  }

  state(): {
    tor: boolean;
    exitIp: string | null;
    exposedCount: number;
    maskedCount: number;
    busts: number;
    heat: number;
  } {
    return {
      tor: this.anonymity.isTorEnabled(),
      exitIp: this.anonymity.isTorEnabled() ? this.anonymity.exitNode().ip : null,
      exposedCount: this.exposedCount,
      maskedCount: this.maskedCount,
      busts: this.busts,
      heat: Math.round(this.notoriety.getState().heat),
    };
  }
}
