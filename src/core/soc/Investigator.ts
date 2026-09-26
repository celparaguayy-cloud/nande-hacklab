import type { EventStore } from "../runtime/EventStore";
import type { MitreCorrelator, Detection } from "./Mitre";
import type { HostRuntime, RuntimeEvent } from "../net/HostRuntime";
import type { PacketCapture } from "../net/PacketCapture";

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

/** Un indicador de compromiso extraído de la evidencia real. */
export interface Ioc {
  kind: "ip" | "host" | "usuario" | "puerto" | "credencial" | "amenaza";
  value: string;
  /** Cuántas veces aparece en la evidencia. */
  hits: number;
  firstTick: number;
  lastTick: number;
  /** Por qué se considera indicador. */
  why: string;
}

/**
 * Incidente atribuible que le llega al DFIR desde el motor de amenazas
 * (data center + adversario autónomo): trae el IOC del actor y, si fue
 * contenido, cuándo. Una sola forma, consumida por `iocs()` y `pivot()`.
 */
export interface AttributableIncident {
  host: string;
  rival: string;
  tick: number;
  ioc?: string;
  resolved?: boolean;
  resolvedTick?: number;
}

/** Recolección en vivo de un host: lo que un respondedor saca primero. */
export interface HostArtifacts {
  host: string;
  ip: string;
  os: string;
  up: boolean;
  collectedAtTick: number;
  processes: { pid: number; name: string; owner: string; service?: string }[];
  services: { name: string; port: number; state: string; version: string }[];
  blockedPorts: number[];
  files: string[];
  accounts: string[];
  /**
   * Huella de integridad de la recolección (cadena de custodia). Si alguien
   * toca la evidencia después, deja de coincidir — y `verify` lo dice.
   */
  digest: string;
}

export class Investigator {
  private store: EventStore;
  private mitre: MitreCorrelator;
  private hosts?: HostRuntime;
  private shark?: PacketCapture;
  private clock?: () => number;
  /** Incidentes del data center (ThreatEngine): traen el IOC del actor y el
   *  rastro de la respuesta (si fue contenido y cuándo). */
  private incidents?: () => AttributableIncident[];

  constructor(
    store: EventStore,
    mitre: MitreCorrelator,
    deps: {
      hosts?: HostRuntime;
      shark?: PacketCapture;
      clock?: () => number;
      incidents?: () => AttributableIncident[];
    } = {},
  ) {
    this.store = store;
    this.mitre = mitre;
    this.hosts = deps.hosts;
    this.shark = deps.shark;
    this.clock = deps.clock;
    this.incidents = deps.incidents;
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

  /* ------------------------------------------------ recolección en vivo */

  /** Hosts que se pueden recolectar (los que el mundo tiene registrados). */
  collectable(): string[] {
    return (this.hosts?.all() ?? []).map((h) => h.hostname).sort();
  }

  /**
   * Recolección de triaje de un host: procesos, servicios, firewall, archivos
   * y cuentas, tal como están AHORA. No es una foto inventada: sale del estado
   * vivo del host. Se le calcula una huella para la cadena de custodia.
   */
  collect(ref: string): HostArtifacts | null {
    const h = this.hosts?.resolve(ref);
    if (!h) return null;
    const art: Omit<HostArtifacts, "digest"> = {
      host: h.hostname,
      ip: h.ip,
      os: h.os,
      up: h.up,
      collectedAtTick: this.clock?.() ?? 0,
      processes: h.processes.map((p) => ({ pid: p.pid, name: p.name, owner: p.owner, service: p.service })),
      services: h.services.map((sv) => ({ name: sv.name, port: sv.port, state: sv.state, version: sv.version })),
      blockedPorts: [...h.firewall],
      files: Object.keys(h.files).sort(),
      accounts: h.creds.map((c) => c.user).sort(),
    };
    return { ...art, digest: digestOf(art) };
  }

  /**
   * Verifica la cadena de custodia: recalcula la huella sobre el contenido y
   * la compara con la que traía. Si alguien alteró la evidencia, no coincide.
   */
  verify(art: HostArtifacts): boolean {
    const { digest, ...rest } = art;
    return digestOf(rest) === digest;
  }

  /* ---------------------------------------------------- indicadores (IOC) */

  /**
   * Extrae indicadores de compromiso de la evidencia real: los hosts y las IP
   * que aparecen en el incidente, los usuarios de los intentos de login y las
   * credenciales que viajaron en claro por la red.
   */
  iocs(): Ioc[] {
    const inc = this.reconstruct();
    const map = new Map<string, Ioc>();
    const bump = (kind: Ioc["kind"], value: string, tick: number, why: string) => {
      if (!value) return;
      const k = `${kind}:${value}`;
      const prev = map.get(k);
      if (prev) {
        prev.hits += 1;
        prev.firstTick = Math.min(prev.firstTick, tick);
        prev.lastTick = Math.max(prev.lastTick, tick);
        return;
      }
      map.set(k, { kind, value, hits: 1, firstTick: tick, lastTick: tick, why });
    };

    for (const e of inc?.timeline ?? []) {
      bump("host", e.host, e.tick, "aparece en la línea de tiempo del incidente");
      // Los eventos del mundo dicen "intento fallido de soporte@server.nande",
      // "usuario ana" o "user=ana": las tres formas nombran a la misma persona.
      const user = e.detail.match(/\bde ([\w.-]+)@/i)
        ?? e.detail.match(/usuario ['"]?([\w.-]+)['"]?/i)
        ?? e.detail.match(/\buser[=:] ?([\w.-]+)/i);
      if (user) {
        bump("usuario", user[1].toLowerCase(), e.tick,
          e.kind === "login.failure" ? "usuario de intentos de acceso fallidos" : "usuario visto en el incidente");
      }
      // "nginx se detuvo (80/tcp)", "puerto 22", "server.nande:3306".
      const port = e.detail.match(/\b(\d{1,5})\/(?:tcp|udp)\b/i)
        ?? e.detail.match(/puerto (\d{1,5})\b/i)
        ?? e.detail.match(/:(\d{2,5})\b/);
      if (port) bump("puerto", port[1], e.tick, "puerto tocado durante el incidente");
    }

    for (const p of this.shark?.all() ?? []) {
      if (p.leak) {
        bump("credencial", `${p.leak.field}=${p.leak.value}`, p.tick, "viajó en claro por la red (HTTP)");
        // El sniffer guarda la IP resuelta como destino, no el nombre.
        bump("ip", p.dst, p.tick, "destino de tráfico con credenciales en claro");
        if (p.host) bump("host", p.host, p.tick, "sitio al que se le mandó una credencial en claro");
      }
    }

    for (const h of this.hosts?.all() ?? []) {
      const seen = map.get(`host:${h.hostname}`);
      if (seen) bump("ip", h.ip, seen.firstTick, `IP de ${h.hostname}`);
    }

    // Incidentes del data center (ThreatEngine): si el ataque cayó sobre un host
    // que aparece en la reconstrucción, sumamos el IOC del ACTOR que dejó. Así
    // el DFIR recupera el indicador atribuible, no sólo "un servicio se cayó":
    // se pivotea y se atribuye en TI (cierra el lazo SOC → DFIR → TI).
    const afectados = new Set((inc?.hostsAffected ?? []).map((h) => h.toLowerCase()));
    for (const it of this.incidents?.() ?? []) {
      if (!it.ioc) continue;
      if (afectados.size > 0 && !afectados.has(it.host.toLowerCase())) continue;
      bump("host", it.host, it.tick, "objetivo de un incidente del data center");
      bump("amenaza", it.ioc, it.tick, `IOC dejado por ${it.rival} — atribuilo en ti.nande`);
    }

    return [...map.values()].sort((a, b) => b.hits - a.hits || a.value.localeCompare(b.value));
  }

  /**
   * Pivotea sobre un indicador: toda la evidencia que lo menciona. Es el gesto
   * central de una investigación — encontrás algo y preguntás dónde más está.
   */
  pivot(value: string): TimelineEntry[] {
    const needle = value.toLowerCase();
    const inc = this.reconstruct();
    const timeline = inc?.timeline ?? [];
    const out: TimelineEntry[] = timeline.filter(
      (e) => e.host.toLowerCase().includes(needle) || e.detail.toLowerCase().includes(needle),
    );

    // Pivot sobre el IOC o el actor de un incidente del data center: conectá el
    // indicador con el ataque REAL que lo dejó (antes el IOC del actor no vivía
    // en la línea de tiempo, así que pivotar sobre él no traía nada). Aditivo:
    // no toca el resultado base (misma evidencia de siempre).
    const already = new Set(out);
    const matchedHosts = new Set<string>();
    for (const it of this.incidents?.() ?? []) {
      const hit =
        (it.ioc && it.ioc.toLowerCase().includes(needle)) || it.rival.toLowerCase().includes(needle);
      if (!hit) continue;
      out.push({
        tick: it.tick,
        kind: "amenaza",
        host: it.host,
        detail: `${it.rival} atacó ${it.host}${it.ioc ? ` — IOC ${it.ioc}` : ""} (atribuible en ti.nande)`,
      });
      // La RESPUESTA también es evidencia: si el defensor lo contuvo, dejá el
      // rastro (ataque → contención) en la investigación (regla 18).
      if (it.resolved && it.resolvedTick != null) {
        out.push({
          tick: it.resolvedTick,
          kind: "contención",
          host: it.host,
          detail: `Contención: ${it.host} restaurado (respuesta al ataque de ${it.rival}, ${Math.max(0, it.resolvedTick - it.tick)} tick(s) después)`,
        });
      }
      matchedHosts.add(it.host.toLowerCase());
    }
    // Contexto: los eventos reales en el host golpeado por ese actor.
    if (matchedHosts.size > 0) {
      for (const e of timeline) {
        if (matchedHosts.has(e.host.toLowerCase()) && !already.has(e)) out.push(e);
      }
    }
    return out;
  }

  /** Filtra la línea de tiempo por host, tipo de evento o texto libre. */
  timeline(filter: { host?: string; kind?: string; text?: string } = {}): TimelineEntry[] {
    const inc = this.reconstruct();
    const t = (filter.text ?? "").toLowerCase();
    return (inc?.timeline ?? []).filter((e) =>
      (!filter.host || e.host === filter.host) &&
      (!filter.kind || e.kind === filter.kind) &&
      (!t || e.detail.toLowerCase().includes(t) || e.kind.toLowerCase().includes(t)),
    );
  }

  /**
   * Paciente cero: la primera evidencia del incidente. Responde la pregunta
   * con la que arranca toda investigación — ¿por dónde entró y cuándo?
   */
  patientZero(): TimelineEntry | null {
    const inc = this.reconstruct();
    return inc?.timeline[0] ?? null;
  }

  /** Informe del caso, listo para leer o pegar en un reporte. */
  report(): string {
    const inc = this.reconstruct();
    if (!inc) return "Sin caso: el mundo no registró actividad para investigar.";
    const z = inc.timeline[0];
    const iocs = this.iocs();
    return [
      `INFORME DE INCIDENTE — severidad ${inc.severity.toUpperCase()}`,
      `Veredicto: ${inc.verdict}`,
      `Ventana: t=${inc.firstTick} → t=${inc.lastTick}`,
      `Hosts afectados: ${inc.hostsAffected.join(", ") || "—"}`,
      `Técnicas ATT&CK: ${inc.techniques.join(", ") || "—"}`,
      `Paciente cero: t=${z.tick} ${z.host} — ${z.kind}: ${z.detail}`,
      "",
      `INDICADORES (${iocs.length})`,
      ...iocs.slice(0, 12).map((i) => `  [${i.kind}] ${i.value}  ×${i.hits}  (t=${i.firstTick}→${i.lastTick})`),
      "",
      `LÍNEA DE TIEMPO (${inc.timeline.length} entradas)`,
      ...inc.timeline.map((e) => `  t=${e.tick}  ${e.host}  ${e.kind}${e.mitreId ? ` [${e.mitreId}]` : ""} — ${e.detail}`),
    ].join("\n");
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

/**
 * Huella determinista del contenido (FNV-1a de 64 bits, en dos mitades). No es
 * criptográfica y no pretende serlo: alcanza para detectar que la evidencia
 * cambió, que es lo que la cadena de custodia necesita demostrar.
 */
function digestOf(value: unknown): string {
  const text = JSON.stringify(value);
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b + c + i, 0x85ebca6b) >>> 0;
  }
  return `${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}
