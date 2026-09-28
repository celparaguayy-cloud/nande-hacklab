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
  /** PID del proceso que respalda al servicio (si está corriendo). */
  pid?: number;
}

/** Un proceso vivo dentro de un host. Un servicio corriendo tiene el suyo. */
export interface VirtualProc {
  pid: number;
  name: string;
  owner: string;
  cpu: number;
  memory: number;
  /** Nombre del servicio que respalda, si es un proceso de servicio. */
  service?: string;
}

/** Credencial de acceso a un host (para conexión remota / pivoting). */
export interface HostCredential {
  user: string;
  password: string;
}

export interface VirtualHost {
  hostname: string;
  ip: string;
  os: string;
  up: boolean;
  services: VirtualService[];
  /** Puertos bloqueados por el firewall del host. */
  firewall: number[];
  /** Procesos vivos del host (incluye los que respaldan servicios). */
  processes: VirtualProc[];
  /** Archivos del host, para operar tras conectarse (path → contenido). */
  files: Record<string, string>;
  /** Credenciales válidas para conectarse por SSH virtual. */
  creds: HostCredential[];
  /**
   * Red interna: nombres de hosts desde los cuales ESTE host es alcanzable.
   * Si está definido y no vacío, el host es "interno": no se ve desde la red
   * del jugador, sólo tras pivotar por uno de esos hosts. Vacío/ausente = host
   * normal, alcanzable desde la red del jugador.
   */
  reachableFrom?: string[];
  /**
   * Host detrás de una red WiFi: sólo es alcanzable mientras estás ASOCIADO a
   * esa red (ESSID). Es lo que hace real la auditoría WiFi — crackear la clave
   * y unirte te mete en SU LAN, donde antes no llegabas. Ausente = no depende
   * del WiFi (comportamiento normal por segmento/pivoting).
   */
  reachableViaWifi?: string;
  /** Bandera educativa que premia llegar a este host (opcional). */
  flag?: string;
  /**
   * Contención (respuesta a incidentes): si es true, el host quedó AISLADO de la
   * red por el equipo azul. Deja de ser alcanzable (no responde a ping/nmap/
   * connect) y no se puede pivotar A TRAVÉS de él. Es la acción de IR que corta
   * el movimiento lateral. Reversible (release). Lo gobierna ContainmentEngine.
   */
  isolated?: boolean;
  /**
   * Reglas sudo (NOPASSWD) por usuario: binarios que ese usuario puede correr
   * como root. Es el vector real de escalada de privilegios: `sudo -l` los
   * lista y, si el binario permite escapar a una shell (GTFOBins), te volvés
   * root. Si está definido, los archivos bajo /root quedan protegidos: sólo
   * root los lee (de ahí que la escalada IMPORTE). Ausente = host sin este
   * mecanismo (comportamiento clásico).
   */
  sudoers?: Record<string, string[]>;
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
    | "host.down"
    | "host.isolated"
    | "host.released"
    | "process.killed"
    | "login.success"
    | "login.failure";
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

/** Un host tal como lo ve el mapa de red (derivado del estado real). */
export interface SubnetHost {
  hostname: string;
  ip: string;
  /** Cantidad de servicios declarados en el host (corran o no). */
  services: number;
  /** Servicios que un escáner ve AHORA (corriendo y sin filtrar): los mismos
   *  que devuelve openServices(), así netmap y nmap nunca se contradicen. */
  open: number;
  /** Estado real del host: apagado = no responde. */
  up: boolean;
  /** true si el host sólo se alcanza pivotando (no desde la red del jugador). */
  internal: boolean;
}

/** Una subred /24 del mundo virtual, con sus hosts. */
export interface Subnet {
  /** Prefijo /24, ej. "10.10.7". */
  base: string;
  /** Notación CIDR, ej. "10.10.7.0/24". */
  cidr: string;
  /** true si TODOS sus hosts son internos (segmento aislado). */
  internal: boolean;
  hosts: SubnetHost[];
}

export class HostRuntime {
  private hosts = new Map<string, VirtualHost>();
  private byIpIndex = new Map<string, string>();
  private events: RuntimeEvent[] = [];
  private now: () => number;
  private onEvent?: (event: RuntimeEvent) => void;
  private logLimit: number;
  private nextPid = 1000;

  constructor(options: HostRuntimeOptions = {}) {
    this.now = options.now ?? (() => 0);
    this.onEvent = options.onEvent;
    this.logLimit = options.logLimit ?? 500;
  }

  /* ---------------------------------------------------------------- alta */

  register(host: VirtualHost): VirtualHost {
    const key = host.hostname.toLowerCase();
    // Asegurar campos nuevos con valores por defecto coherentes.
    host.processes = host.processes ?? [];
    host.files = host.files ?? {};
    host.creds = host.creds ?? [];
    // Un proceso init de base + un proceso por cada servicio corriendo.
    if (host.processes.length === 0) {
      host.processes.push({ pid: 1, name: "init", owner: "root", cpu: 0.1, memory: 8 });
      for (const svc of host.services) {
        if (svc.state === "running") {
          const pid = this.nextPid++;
          svc.pid = pid;
          host.processes.push({
            pid,
            name: svc.name,
            owner: svc.kind === "http" || svc.kind === "https" ? "www-data" : "root",
            cpu: 0.3,
            memory: 40,
            service: svc.name,
          });
        }
      }
    }
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
      processes: [],
      files: {},
      creds: [],
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

  /**
   * Mapa de red DERIVADO del estado real (regla maestra 2/12): agrupa los hosts
   * por subred /24 y marca cuáles son internas. Una subred es interna si NINGUNO
   * de sus hosts es alcanzable directo desde la red del jugador (sólo se llega
   * pivotando). Única fuente de verdad de la topología: nmap, netmap y el grafo
   * leen de acá, no de listas paralelas. 100% dentro del sandbox (10.10.0.0/16).
   */
  subnets(): Subnet[] {
    return this.groupBySubnet(this.all());
  }

  /**
   * La red INTERNA que se ve desde un host (vista de pivoting): los hosts que
   * sólo se alcanzan desde `fromHost`, agrupados por /24. Deriva de
   * reachableFrom — la misma relación que usan connect y nmap —, así que el
   * mapa desde adentro nunca muestra algo que no se pueda alcanzar de verdad.
   */
  internalSubnetsFrom(fromHost: string): Subnet[] {
    return this.groupBySubnet(this.reachableFrom(fromHost));
  }

  private groupBySubnet(hosts: VirtualHost[]): Subnet[] {
    const map = new Map<string, SubnetHost[]>();
    for (const h of hosts) {
      const base = h.ip.split(".").slice(0, 3).join(".");
      const internal = !this.isPublic(h.hostname);
      const list = map.get(base) ?? [];
      list.push({
        hostname: h.hostname,
        ip: h.ip,
        services: h.services.length,
        open: this.openServices(h.hostname).length,
        up: h.up,
        internal,
      });
      map.set(base, list);
    }
    const numeric = (a: string, b: string) =>
      a.localeCompare(b, undefined, { numeric: true });
    const out: Subnet[] = [];
    for (const [base, list] of map) {
      list.sort((a, b) => numeric(a.ip, b.ip));
      out.push({ base, cidr: `${base}.0/24`, internal: list.every((h) => h.internal), hosts: list });
    }
    out.sort((a, b) => numeric(a.base, b.base));
    return out;
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
    // Un servicio que arranca es un proceso vivo en el host.
    const pid = this.nextPid++;
    svc.pid = pid;
    host.processes.push({
      pid,
      name: svc.name,
      owner: svc.kind === "http" || svc.kind === "https" ? "www-data" : "root",
      cpu: 0.3,
      memory: 40,
      service: svc.name,
    });
    this.log("service.started", host, svc, `${svc.name} arrancó en ${svc.port}/${svc.protocol} (pid ${pid})`);
    return { ok: true, message: `${svc.name} arrancó (${svc.port}/${svc.protocol}, pid ${pid})` };
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
    // Detener el servicio mata su proceso.
    if (svc.pid !== undefined) {
      host.processes = host.processes.filter((p) => p.pid !== svc.pid);
      svc.pid = undefined;
    }
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

  /* --------------------------------------------------- procesos por host */

  /** Procesos vivos de un host. */
  processesOf(ref: string): VirtualProc[] {
    const host = this.resolve(ref);
    return host ? [...host.processes] : [];
  }

  /**
   * Mata un proceso de un host. Si ese proceso respaldaba un servicio, el
   * servicio se detiene también (efecto cruzado real): matar el pid de nginx
   * apaga el HTTP, y el navegador/nmap lo ven.
   */
  killProcess(ref: string, pid: number): { ok: boolean; message: string } {
    const host = this.resolve(ref);
    if (!host) return { ok: false, message: `host desconocido: ${ref}` };
    const proc = host.processes.find((p) => p.pid === pid);
    if (!proc) return { ok: false, message: `no existe el pid ${pid}` };
    if (pid === 1) return { ok: false, message: `no se puede matar init (pid 1)` };

    if (proc.service) {
      // Es un proceso de servicio: detener el servicio (esto ya lo remueve).
      const r = this.stopService(host.hostname, proc.service);
      this.log("process.killed", host, undefined, `pid ${pid} (${proc.name}) terminado`, proc.pid);
      return { ok: r.ok, message: `pid ${pid} terminado; servicio ${proc.service} detenido` };
    }

    host.processes = host.processes.filter((p) => p.pid !== pid);
    this.log("process.killed", host, undefined, `pid ${pid} (${proc.name}) terminado`, pid);
    return { ok: true, message: `pid ${pid} (${proc.name}) terminado` };
  }

  /* ------------------------------------------------ acceso remoto / pivot */

  /** ¿Estas credenciales sirven para el host? Deja evento login.success/failure. */
  authenticate(
    ref: string,
    user: string,
    password: string,
  ): { ok: boolean; message: string } {
    const host = this.resolve(ref);
    if (!host) return { ok: false, message: `host desconocido: ${ref}` };
    if (!host.up) return { ok: false, message: `${host.hostname} está apagado` };
    const ok = host.creds.some((c) => c.user === user && c.password === password);
    this.log(
      ok ? "login.success" : "login.failure",
      host,
      undefined,
      `${ok ? "acceso" : "intento fallido"} de ${user}@${host.hostname}`,
    );
    return ok
      ? { ok: true, message: `bienvenido, ${user}@${host.hostname}` }
      : { ok: false, message: `credenciales inválidas para ${host.hostname}` };
  }

  /** ¿El host es alcanzable desde la red del jugador? (no es interno) Un host
   *  detrás de una WiFi NO es público: depende de estar asociado a esa red. */
  isPublic(ref: string): boolean {
    const host = this.resolve(ref);
    if (!host) return false;
    if (host.reachableViaWifi) return false;
    return !host.reachableFrom || host.reachableFrom.length === 0;
  }

  /**
   * Hosts alcanzables DESDE un host dado (pivoting): los internos cuya lista
   * reachableFrom incluye a `fromHost` (hostname o IP). Es lo que un `nmap`
   * ve tras pivotar.
   */
  reachableFrom(fromHost: string): VirtualHost[] {
    const key = (this.resolve(fromHost)?.hostname ?? fromHost).toLowerCase();
    return this.all().filter((h) => (h.reachableFrom ?? []).includes(key));
  }

  /**
   * Regla ÚNICA de alcance (la usan connect y netmap; no duplicarla): ¿se
   * llega a `target` desde `from`? `from = null` es la red del jugador. Un
   * host público se alcanza desde cualquier lado; uno interno, sólo desde un
   * host que figura en su reachableFrom (pivoting). No mira si está
   * encendido: "alcanzable" (ruta) y "responde" (up) son preguntas distintas.
   */
  canReach(from: string | null, target: string): boolean {
    const host = this.resolve(target);
    if (!host) return false;
    // Contención (IR): un host aislado no responde desde ningún lado, y no se
    // puede pivotar A TRAVÉS de un host aislado. Es la MISMA regla única, así
    // ping/nmap/connect/traceroute respetan el aislamiento sin duplicar lógica.
    if (host.isolated) return false;
    if (from !== null && this.resolve(from)?.isolated) return false;
    if (this.isPublic(host.hostname)) return true;
    // Host detrás de una WiFi: alcanzable (desde donde estés) sólo si estás
    // ASOCIADO a esa red ahora mismo. Es el punto de la auditoría inalámbrica.
    if (
      host.reachableViaWifi &&
      this.currentWifi &&
      host.reachableViaWifi.toLowerCase() === this.currentWifi.toLowerCase()
    ) {
      return true;
    }
    if (from === null) return false;
    const key = (this.resolve(from)?.hostname ?? from).toLowerCase();
    return (host.reachableFrom ?? []).includes(key);
  }

  /** ¿El host está aislado por contención (IR)? */
  isIsolated(ref: string): boolean {
    return this.resolve(ref)?.isolated ?? false;
  }

  /**
   * Aísla o reintegra un host (contención de IR). Cambia estado REAL: un host
   * aislado deja de ser alcanzable (canReach lo corta) y no sirve de pivote.
   * Emite un evento de runtime para que el SOC/DFIR lo vean. Devuelve si cambió.
   */
  setIsolated(ref: string, value: boolean): boolean {
    const host = this.resolve(ref);
    if (!host || (host.isolated ?? false) === value) return false;
    host.isolated = value;
    this.log(
      value ? "host.isolated" : "host.released",
      host,
      undefined,
      value
        ? `${host.hostname} AISLADO de la red por contención (IR): sin alcance ni pivoteo.`
        : `${host.hostname} reintegrado a la red (fin de la contención).`,
    );
    return true;
  }

  /** ESSID de la red WiFi a la que el jugador está asociado (o null). La setea
   *  VirtualWiFi al conectar/desconectar. Habilita el alcance de los hosts que
   *  viven detrás de esa red (reachableViaWifi). Fuente única del "en qué LAN
   *  inalámbrica estoy". */
  private currentWifi: string | null = null;

  setCurrentWifi(essid: string | null): void {
    this.currentWifi = essid;
  }

  /** ESSID asociado ahora mismo (para depurar/observabilidad). */
  associatedWifi(): string | null {
    return this.currentWifi;
  }

  /** Registra que una conexión fue rechazada (la llama el navegador/curl). */
  refuseConnection(hostname: string, port: number, why: string): void {
    const host = this.byHost(hostname);
    if (!host) return;
    this.log("connection.refused", host, undefined, why, port);
  }

  /* ============================================================ *
   *  MOTOR DE CONECTIVIDAD L2/L3/L4 — la verdad del mundo sobre   *
   *  "¿llega el paquete?". ping, traceroute, arp y nc leen de     *
   *  ACÁ (misma fuente única que nmap/connect, regla 2/5/8), no   *
   *  de un prefijo de IP ni de una tabla fija. Todo determinista  *
   *  y 100% dentro del sandbox (10.10.0.0/16).                    *
   * ============================================================ */

  /** IP y gateway del equipo del jugador (coherente con eth0/ifconfig). */
  private static readonly PLAYER_IP = "10.10.0.10";

  /** Prefijo /24 de una IP ("10.10.7.10" -> "10.10.7"). */
  private seg(ip: string): string {
    return ip.split(".").slice(0, 3).join(".");
  }

  /** IP del punto de vista: red del jugador (null) o un host pivoteado. */
  private vantageIp(from: string | null): string {
    if (from === null) return HostRuntime.PLAYER_IP;
    return this.resolve(from)?.ip ?? HostRuntime.PLAYER_IP;
  }

  /**
   * MAC determinista de una IP del sandbox: 02:00: + los cuatro octetos
   * finales en hex. El .1 de cada /24 (gateway) lleva una MAC fija de router.
   * Determinista = reproducible; el arp de dos corridas coincide (regla 10/13).
   */
  macOf(ip: string): string {
    const o = ip.split(".").map((n) => parseInt(n, 10) || 0);
    if (o[3] === 1) return "02:00:0a:0a:00:01"; // gateway/router del segmento
    const hex = (n: number) => n.toString(16).padStart(2, "0");
    return `02:00:${hex(o[0])}:${hex(o[1])}:${hex(o[2])}:${hex(o[3])}`;
  }

  /**
   * ICMP echo (ping) desde `from` (null = jugador). Deriva del estado real:
   *   - "no-host": en esa IP/nombre NO vive ningún host → no responde (mata el
   *     "ping fantasma": antes cualquier 10.10.x.y contestaba).
   *   - "no-route": el host existe pero es interno y no se alcanza desde acá.
   *   - "down": alcanzable pero apagado.
   *   - "reply": vivo y con ruta → responde.
   */
  icmpEcho(from: string | null, ref: string): {
    status: "reply" | "no-host" | "no-route" | "down";
    ref: string;
    ip: string;
    hostname?: string;
  } {
    const host = this.resolve(ref);
    if (!host) return { status: "no-host", ref, ip: ref };
    if (!this.canReach(from, host.hostname))
      return { status: "no-route", ref, ip: host.ip, hostname: host.hostname };
    if (!host.up) return { status: "down", ref, ip: host.ip, hostname: host.hostname };
    return { status: "reply", ref, ip: host.ip, hostname: host.hostname };
  }

  /**
   * Ruta L3 real hasta `ref` (traceroute) desde `from`. Refleja la topología:
   * mismo /24 → un salto directo (sin router); distinto /24 → gateway del
   * segmento origen y router del segmento destino antes del host. Un host
   * interno sin ruta se pierde tras el gateway (como en la realidad).
   */
  tracePath(from: string | null, ref: string): {
    status: "reply" | "no-host" | "no-route" | "down";
    hops: { ip: string; hostname?: string; label: string }[];
  } {
    const host = this.resolve(ref);
    if (!host) return { status: "no-host", hops: [] };
    const vip = this.vantageIp(from);
    const vseg = this.seg(vip);
    if (!this.canReach(from, host.hostname)) {
      return {
        status: "no-route",
        hops: [{ ip: `${vseg}.1`, hostname: "gateway", label: "gateway" }],
      };
    }
    if (!host.up)
      return { status: "down", hops: [{ ip: `${vseg}.1`, hostname: "gateway", label: "gateway" }] };
    const tseg = this.seg(host.ip);
    const hops: { ip: string; hostname?: string; label: string }[] = [];
    if (tseg === vseg) {
      // Vecino de la misma subred: se llega directo (ARP + un salto).
      hops.push({ ip: host.ip, hostname: host.hostname, label: host.hostname });
    } else {
      hops.push({ ip: `${vseg}.1`, hostname: "gateway", label: "gateway" });
      hops.push({ ip: `${tseg}.1`, hostname: `router-${tseg}`, label: `router ${tseg}.0/24` });
      hops.push({ ip: host.ip, hostname: host.hostname, label: host.hostname });
    }
    return { status: "reply", hops };
  }

  /**
   * Vecinos ARP (L2) del segmento `base` (/24) vistos desde ese mismo
   * segmento: los hosts encendidos cuya IP cae en `base.x`, más el gateway.
   * ARP es local: sólo ve su propia subred, nunca otra (por eso no revela
   * segmentos internos). Deriva del estado vivo, no de una tabla inventada.
   */
  arpNeighbors(base: string): { ip: string; mac: string; hostname?: string }[] {
    const rows: { ip: string; mac: string; hostname?: string }[] = [];
    rows.push({ ip: `${base}.1`, mac: this.macOf(`${base}.1`), hostname: "gateway" });
    for (const h of this.all()) {
      if (this.seg(h.ip) !== base || !h.up) continue;
      rows.push({ ip: h.ip, mac: this.macOf(h.ip), hostname: h.hostname });
    }
    const asNum = (ip: string) => parseInt(ip.split(".")[3] ?? "0", 10);
    return rows.sort((a, b) => asNum(a.ip) - asNum(b.ip));
  }

  /**
   * Banner de un servicio tal como aparece "en el cable" al conectarse (lo usa
   * nc para banner-grabbing). Servicios que saludan solos (SSH, FTP, rsync)
   * devuelven su línea; HTTP/DB no saludan hasta que el cliente habla, así que
   * devuelven undefined (el que aprende debe MANDAR algo — realismo, no magia).
   */
  serviceBanner(svc: VirtualService): string | undefined {
    const ver = svc.version.replace(/\s*\(.*\)\s*/, "").trim();
    const name = svc.name.toLowerCase();
    if (svc.kind === "ssh" || name.includes("ssh") || name.includes("dropbear")) {
      return `SSH-2.0-${ver.replace(/\s+/g, "_")}`;
    }
    if (name.includes("ftp")) return `220 ${ver} listo.`;
    if (name.includes("telnet")) return `${ver}\r\nlogin:`;
    if (name.includes("smtp")) return `220 ${ver} ESMTP`;
    if (name.includes("rsync")) return `@RSYNCD: ${ver.replace(/[^\d.]/g, "") || "3.2"}`;
    return undefined; // http/https/db/modbus: no saludan al abrir el socket
  }

  /**
   * Sondeo L4 de un puerto (lo usa nc): "open"/"closed"/"filtered" con la
   * MISMA verdad que nmap (host up + servicio corriendo + no filtrado), más
   * "no-route"/"down"/"no-host" para reflejar la ruta real. Cuando abre y el
   * servicio saluda, trae el banner.
   */
  probePort(from: string | null, ref: string, port: number): {
    status: "open" | "closed" | "filtered" | "no-route" | "down" | "no-host";
    ip: string;
    hostname?: string;
    service?: string;
    version?: string;
    banner?: string;
  } {
    const host = this.resolve(ref);
    if (!host) return { status: "no-host", ip: ref };
    if (!this.canReach(from, host.hostname))
      return { status: "no-route", ip: host.ip, hostname: host.hostname };
    if (!host.up) return { status: "down", ip: host.ip, hostname: host.hostname };
    if (host.firewall.includes(port))
      return { status: "filtered", ip: host.ip, hostname: host.hostname };
    const svc = host.services.find((s) => s.port === port && s.state === "running");
    if (!svc) return { status: "closed", ip: host.ip, hostname: host.hostname };
    return {
      status: "open",
      ip: host.ip,
      hostname: host.hostname,
      service: svc.name,
      version: svc.version,
      banner: this.serviceBanner(svc),
    };
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
