/**
 * HostRuntime — la ÚNICA fuente de verdad sobre "hosts, servicios y puertos"
 * del mundo virtual de ÑANDE.
 *
 * Antes había dos realidades de red desconectadas: VirtualNetwork (¿hay red?)
 * y LabNetwork (máquinas con servicios estáticos que nadie podía apagar). Este
 * runtime modela un host como una entidad viva: tiene servicios que se pueden
 * arrancar y parar, un firewall que bloquea puertos, y un estado up/down.
 *
 * La regla de oro: nmap NO sabe la respuesta; el mundo sabe la respuesta.
 * - El navegador y `curl` preguntan `httpReachable(host)` antes de conectar.
 * - `nmap` pregunta `openServices(host)` en vez de leer una tabla fija.
 * Si apagás un servicio, ambos cambian, porque miran el MISMO estado.
 *
 * Todo es en memoria y determinista: no hay red real (lo exige el test de
 * aislamiento). Cada cambio deja un evento de runtime en el log, para que el
 * SOC pueda investigarlo aunque no haya ninguna interfaz abierta: la realidad
 * vive en el runtime, no en la UI.
 */

export type ServiceState = "running" | "stopped" | "failed";

/** Qué capacidad ofrece un servicio (lo usa el navegador para saber si un
 *  host acepta HTTP). */
export type ServiceKind = "http" | "https" | "ssh" | "db" | "dns" | "other";

export interface VirtualService {
  name: string;
  port: number;
  protocol: "tcp" | "udp";
  version: string;
  kind: ServiceKind;
  state: ServiceState;
  /** Si arranca solo al bootear el host. */
  enabled: boolean;
}

export interface VirtualHost {
  hostname: string;
  ip: string;
  os: string;
  up: boolean;
  services: VirtualService[];
  /** Puertos bloqueados por el firewall del host. */
  firewall: number[];
}

/** Un hecho ocurrido en el runtime. Es la evidencia que consume el SOC. */
export interface RuntimeEvent {
  kind:
    | "service.started"
    | "service.stopped"
    | "service.restarted"
    | "connection.refused"
    | "port.blocked"
    | "port.unblocked"
    | "host.up"
    | "host.down";
  host: string;
  ip: string;
  service?: string;
  port?: number;
  detail: string;
  tick: number;
}

export interface HostRuntimeOptions {
  /** Reloj del mundo (tick), para fechar los eventos de forma determinista. */
  now?: () => number;
  /** Puente opcional al EventBus del kernel (además del log interno). */
  onEvent?: (event: RuntimeEvent) => void;
  /** Cuántos eventos conservar en el log (anillo). */
  logLimit?: number;
}

export class HostRuntime {
  private hosts = new Map<string, VirtualHost>();
  private byIpIndex = new Map<string, string>();
  private events: RuntimeEvent[] = [];
  private now: () => number;
  private onEvent?: (event: RuntimeEvent) => void;
  private logLimit: number;

  constructor(options: HostRuntimeOptions = {}) {
    this.now = options.now ?? (() => 0);
    this.onEvent = options.onEvent;
    this.logLimit = options.logLimit ?? 500;
  }

  /* ---------------------------------------------------------------- alta */

  register(host: VirtualHost): VirtualHost {
    const key = host.hostname.toLowerCase();
    this.hosts.set(key, host);
    this.byIpIndex.set(host.ip, key);
    return host;
  }

  /** Da de alta un host con un servicio HTTP (nginx) ya corriendo. Atajo
   *  para publicar una web del mundo en el runtime de hosts. */
  registerWebHost(
    hostname: string,
    ip: string,
    extra: Partial<VirtualService>[] = [],
  ): VirtualHost {
    const services: VirtualService[] = [
      {
        name: "nginx",
        port: 80,
        protocol: "tcp",
        version: "nginx/1.24 (ÑANDE)",
        kind: "http",
        state: "running",
        enabled: true,
      },
      ...extra.map((s) => this.normalizeService(s)),
    ];
    return this.register({
      hostname,
      ip,
      os: "ÑandeLinux (virtual)",
      up: true,
      services,
      firewall: [],
    });
  }

  private normalizeService(s: Partial<VirtualService>): VirtualService {
    return {
      name: s.name ?? "svc",
      port: s.port ?? 0,
      protocol: s.protocol ?? "tcp",
      version: s.version ?? "1.0 (sim)",
      kind: s.kind ?? "other",
      state: s.state ?? "running",
      enabled: s.enabled ?? true,
    };
  }

  /* ------------------------------------------------------------ consulta */

  byHost(hostname: string): VirtualHost | undefined {
    return this.hosts.get(hostname.toLowerCase());
  }

  byIp(ip: string): VirtualHost | undefined {
    const key = this.byIpIndex.get(ip);
    return key ? this.hosts.get(key) : undefined;
  }

  /** Resuelve un objetivo que puede ser hostname o IP. */
  resolve(ref: string): VirtualHost | undefined {
    return this.byHost(ref) ?? this.byIp(ref);
  }

  has(ref: string): boolean {
    return this.resolve(ref) !== undefined;
  }

  all(): VirtualHost[] {
    return [...this.hosts.values()];
  }

  private findService(
    host: VirtualHost,
    nameOrPort: string,
  ): VirtualService | undefined {
    const asPort = Number(nameOrPort);
    return host.services.find(
      (s) =>
        s.name.toLowerCase() === nameOrPort.toLowerCase() ||
        (Number.isFinite(asPort) && s.port === asPort),
    );
  }

  /** ¿Está ese puerto realmente abierto ahora mismo? host up + servicio
   *  corriendo + no bloqueado por el firewall. */
  isPortOpen(ref: string, port: number): boolean {
    const host = this.resolve(ref);
    if (!host || !host.up) return false;
    if (host.firewall.includes(port)) return false;
    return host.services.some(
      (s) => s.port === port && s.state === "running",
    );
  }

  /** Servicios visibles para un escáner: corriendo y no filtrados. */
  openServices(ref: string): VirtualService[] {
    const host = this.resolve(ref);
    if (!host || !host.up) return [];
    return host.services.filter(
      (s) => s.state === "running" && !host.firewall.includes(s.port),
    );
  }

  /**
   * ¿El host acepta HTTP ahora? Lo consultan el navegador y `curl`.
   * Si el host NO está registrado en el runtime, devuelve `true`: no
   * gestionamos ese host (ej. un sitio dinámico), así que no lo bloqueamos.
   */
  httpReachable(hostname: string): boolean {
    const host = this.byHost(hostname);
    if (!host) return true; // host no gestionado → no interferir
    if (!host.up) return false;
    return host.services.some(
      (s) =>
        (s.kind === "http" || s.kind === "https") &&
        s.state === "running" &&
        !host.firewall.includes(s.port),
    );
  }

  /* -------------------------------------------------------- mutación */

  startService(ref: string, nameOrPort: string): { ok: boolean; message: string } {
    const host = this.resolve(ref);
    if (!host) return { ok: false, message: `host desconocido: ${ref}` };
    const svc = this.findService(host, nameOrPort);
    if (!svc) return { ok: false, message: `servicio desconocido: ${nameOrPort}` };
    if (svc.state === "running") {
      return { ok: true, message: `${svc.name} ya estaba corriendo` };
    }
    svc.state = "running";
    this.log("service.started", host, svc, `${svc.name} arrancó en ${svc.port}/${svc.protocol}`);
    return { ok: true, message: `${svc.name} arrancó (${svc.port}/${svc.protocol})` };
  }

  stopService(ref: string, nameOrPort: string): { ok: boolean; message: string } {
    const host = this.resolve(ref);
    if (!host) return { ok: false, message: `host desconocido: ${ref}` };
    const svc = this.findService(host, nameOrPort);
    if (!svc) return { ok: false, message: `servicio desconocido: ${nameOrPort}` };
    if (svc.state === "stopped") {
      return { ok: true, message: `${svc.name} ya estaba detenido` };
    }
    svc.state = "stopped";
    this.log("service.stopped", host, svc, `${svc.name} se detuvo (${svc.port}/${svc.protocol})`);
    return { ok: true, message: `${svc.name} detenido (${svc.port}/${svc.protocol})` };
  }

  restartService(ref: string, nameOrPort: string): { ok: boolean; message: string } {
    const stop = this.stopService(ref, nameOrPort);
    if (!stop.ok) return stop;
    const start = this.startService(ref, nameOrPort);
    if (start.ok) {
      const host = this.resolve(ref)!;
      const svc = this.findService(host, nameOrPort)!;
      this.log("service.restarted", host, svc, `${svc.name} reiniciado`);
    }
    return start;
  }

  blockPort(ref: string, port: number): { ok: boolean; message: string } {
    const host = this.resolve(ref);
    if (!host) return { ok: false, message: `host desconocido: ${ref}` };
    if (!host.firewall.includes(port)) host.firewall.push(port);
    this.log("port.blocked", host, undefined, `firewall bloqueó el puerto ${port}`, port);
    return { ok: true, message: `firewall: puerto ${port} bloqueado en ${host.hostname}` };
  }

  allowPort(ref: string, port: number): { ok: boolean; message: string } {
    const host = this.resolve(ref);
    if (!host) return { ok: false, message: `host desconocido: ${ref}` };
    host.firewall = host.firewall.filter((p) => p !== port);
    this.log("port.unblocked", host, undefined, `firewall permitió el puerto ${port}`, port);
    return { ok: true, message: `firewall: puerto ${port} permitido en ${host.hostname}` };
  }

  setHostUp(ref: string, up: boolean): { ok: boolean; message: string } {
    const host = this.resolve(ref);
    if (!host) return { ok: false, message: `host desconocido: ${ref}` };
    host.up = up;
    this.log(up ? "host.up" : "host.down", host, undefined, `host ${up ? "encendido" : "apagado"}`);
    return { ok: true, message: `${host.hostname} ${up ? "encendido" : "apagado"}` };
  }

  /** Registra que una conexión fue rechazada (la llama el navegador/curl). */
  refuseConnection(hostname: string, port: number, why: string): void {
    const host = this.byHost(hostname);
    if (!host) return;
    this.log("connection.refused", host, undefined, why, port);
  }

  /* ----------------------------------------------------------- eventos */

  private log(
    kind: RuntimeEvent["kind"],
    host: VirtualHost,
    svc: VirtualService | undefined,
    detail: string,
    port?: number,
  ): void {
    const event: RuntimeEvent = {
      kind,
      host: host.hostname,
      ip: host.ip,
      service: svc?.name,
      port: port ?? svc?.port,
      detail,
      tick: this.now(),
    };
    this.events.push(event);
    if (this.events.length > this.logLimit) {
      this.events.splice(0, this.events.length - this.logLimit);
    }
    this.onEvent?.(event);
  }

  /** Historial de eventos del runtime (lo consume el SOC). */
  timeline(limit = 100): RuntimeEvent[] {
    return this.events.slice(-limit);
  }
}
