import type { EventStore } from "../runtime/EventStore";
import type { MitreCorrelator, Detection } from "./Mitre";
import type { RuntimeEvent } from "../net/HostRuntime";

/**
 * Investigator (DFIR) — la respuesta a incidentes del universo. No inventa una
 * historia: RECONSTRUYE lo que pasó a partir de los eventos REALES que el
 * mundo ya recordó (EventStore) y las detecciones del correlador MITRE. "The
 * world remembers": si hubo un ataque, quedó su rastro, y acá se ordena en una
 * línea de tiempo investigable.
 *
 * Cierra el bucle Blue Team: detectar (SOC/MITRE) → investigar (DFIR) →
 * responder. Todo derivado del estado; si no pasó nada, no hay caso.
 */

export interface TimelineEntry {
  tick: number;
  kind: string;
  host: string;
  detail: string;
  /** Técnica MITRE asociada, si el correlador la mapeó. */
  mitreId?: string;
}

export interface Incident {
  hostsAffected: string[];
  firstTick: number;
  lastTick: number;
  techniques: string[];
  timeline: TimelineEntry[];
  /** Lectura del analista: qué tipo de incidente parece. */
  verdict: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
}

export class Investigator {
  private store: EventStore;
  private mitre: MitreCorrelator;

  constructor(store: EventStore, mitre: MitreCorrelator) {
    this.store = store;
    this.mitre = mitre;
  }

  /**
   * Reconstruye el incidente desde los eventos reales. Une los eventos de
   * runtime (login, servicios) con las detecciones MITRE por proximidad de
   * host, y ordena todo en el tiempo. Devuelve null si no hay nada que
   * investigar.
   */
  reconstruct(): Incident | null {
    const runtimeEvents = this.store
      .byType("runtime.host")
      .map((e) => e.data as RuntimeEvent);
    const detections = this.mitre.all();

    if (runtimeEvents.length === 0 && detections.length === 0) return null;

    const timeline: TimelineEntry[] = [];
    const hosts = new Set<string>();

    for (const e of runtimeEvents) {
      // Sólo lo relevante para IR (no el ruido de arranque de servicios).
      if (e.kind === "service.started") continue;
      hosts.add(e.host);
      timeline.push({
        tick: e.tick,
        kind: e.kind,
        host: e.host,
        detail: e.detail,
        mitreId: this.matchDetection(detections, e.host, e.tick)?.mitreId,
      });
    }

    for (const d of detections) {
      hosts.add(d.host);
      timeline.push({
        tick: d.tick,
        kind: "detection",
        host: d.host,
        detail: `${d.technique} (${d.tactic})`,
        mitreId: d.mitreId,
      });
    }

    if (timeline.length === 0) return null;
    timeline.sort((a, b) => a.tick - b.tick);

    const techniques = [...new Set(detections.map((d) => d.mitreId))];
    const firstTick = timeline[0].tick;
    const lastTick = timeline[timeline.length - 1].tick;

    return {
      hostsAffected: [...hosts],
      firstTick,
      lastTick,
      techniques,
      timeline,
      verdict: this.verdict(techniques, timeline),
      severity: this.severity(techniques, timeline),
    };
  }

  /** Detección MITRE del mismo host cercana en el tiempo (ventana ±5 ticks). */
  private matchDetection(dets: Detection[], host: string, tick: number): Detection | undefined {
    return dets.find((d) => d.host === host && Math.abs(d.tick - tick) <= 5);
  }

  private verdict(techniques: string[], timeline: TimelineEntry[]): string {
    const hasBrute = techniques.includes("T1110");
    const hasImpact = timeline.some((t) => t.kind === "service.stopped");
    const hasDomain = techniques.some((t) => t.startsWith("T1078") || t === "T1558.003");
    if (hasBrute && hasImpact) {
      return "Intrusión con fuerza bruta seguida de impacto (servicio caído): patrón de ransomware/sabotaje.";
    }
    if (hasDomain) {
      return "Actividad de escalada en el dominio (Kerberoasting/abuso de credenciales): posible movimiento lateral.";
    }
    if (hasBrute) {
      return "Intentos de acceso por fuerza bruta: reconocimiento activo o intento de intrusión.";
    }
    return "Actividad anómala registrada. Revisá la línea de tiempo para el alcance.";
  }

  private severity(techniques: string[], timeline: TimelineEntry[]): Incident["severity"] {
    if (timeline.some((t) => t.kind === "service.stopped")) return "high";
    if (techniques.length >= 2) return "high";
    if (techniques.length === 1) return "medium";
    return "low";
  }
}
