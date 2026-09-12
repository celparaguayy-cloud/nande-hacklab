import type { VirtualKernel } from "../VirtualKernel";
import type { EventType } from "../events/EventBus";
import type { HttpMethod } from "../http/types";
import { VirtualClock } from "./VirtualClock";
import { EventStore } from "./EventStore";

/**
 * CyberRuntime — el corazón de ÑANDE 5.0. Una sola API común sobre la que TODA
 * herramienta lee y escribe el mundo. No reimplementa realidades: delega en los
 * runtimes que ya son la fuente de verdad (HostRuntime, red, DNS, navegador,
 * bases, filesystem, procesos, identidad, eventos, reloj). Así Nmap, curl, el
 * navegador, el SOC, el CTF y las tools del jugador comparten el MISMO estado.
 *
 *   UI → Tool → CyberRuntime → WorldState → resultado derivado → eventos
 *
 * Mantra: no fake output, no fake state. Un mundo, un estado, un reloj, un
 * sistema de eventos.
 */
export class CyberRuntime {
  private k: VirtualKernel;
  readonly clock: VirtualClock;
  readonly events: EventStore;

  constructor(kernel: VirtualKernel) {
    this.k = kernel;
    this.clock = new VirtualClock(() => kernel.world.getState().clock);
    this.events = new EventStore(kernel.events, () => kernel.world.getState().clock.tick);
  }

  dispose(): void {
    this.events.dispose();
  }

  emit<T>(type: EventType, data: T): void {
    this.k.events.emit(type, data);
  }

  /* -------------------------------------------------------------- host API */

  get host() {
    const hosts = this.k.hosts;
    return {
      all: () => hosts.all(),
      get: (ref: string) => hosts.resolve(ref),
      has: (ref: string) => hosts.has(ref),
      /** Puertos "abiertos" ahora (lo que ve un escáner) — deriva del estado. */
      scan: (ref: string) =>
        hosts.openServices(ref).map((s) => ({ port: s.port, service: s.name, version: s.version })),
      reachableFrom: (ref: string) => hosts.reachableFrom(ref),
    };
  }

  /* ---------------------------------------------------------- service API */

  get service() {
    const hosts = this.k.hosts;
    return {
      list: (ref: string) => hosts.resolve(ref)?.services ?? [],
      start: (ref: string, name: string) => hosts.startService(ref, name),
      stop: (ref: string, name: string) => hosts.stopService(ref, name),
      restart: (ref: string, name: string) => hosts.restartService(ref, name),
      httpUp: (host: string) => hosts.httpReachable(host),
    };
  }

  /* ---------------------------------------------------------- process API */

  get process() {
    const hosts = this.k.hosts;
    return {
      list: (ref: string) => hosts.processesOf(ref),
      kill: (ref: string, pid: number) => hosts.killProcess(ref, pid),
    };
  }

  /* --------------------------------------------------------- network API */

  get net() {
    return {
      resolve: (name: string) => this.k.dns.resolve(name),
      reachable: (ip: string) => this.k.network.isReachable(ip),
      firewallBlock: (ref: string, port: number) => this.k.hosts.blockPort(ref, port),
      firewallAllow: (ref: string, port: number) => this.k.hosts.allowPort(ref, port),
    };
  }

  /* -------------------------------------------------------- identity API */

  get identity() {
    return {
      authenticate: (ref: string, user: string, password: string) =>
        this.k.hosts.authenticate(ref, user, password),
    };
  }

  /* ------------------------------------------------------------ http API */

  get http() {
    return {
      request: (method: HttpMethod, host: string, path: string, body?: Record<string, string>) =>
        this.k.browser.request(method, host, path, body ?? {}),
      isWebApp: (host: string) => this.k.browser.isWebApp(host),
    };
  }

  /* -------------------------------------------------------- database API */

  get db() {
    return {
      list: () => this.k.databases.list(),
      get: (name: string) => this.k.databases.get(name),
      query: (name: string, sql: string) => this.k.databases.get(name)?.query(sql),
    };
  }

  /* ------------------------------------------------------ filesystem API */

  get fs() {
    const fs = this.k.filesystem;
    return {
      exists: (path: string) => fs.exists(path),
      read: (path: string) => fs.readFile(path),
      write: (path: string, content: string) =>
        fs.exists(path) ? fs.writeFile(path, content) : fs.createFile(path, content),
      ls: (path: string) => fs.listDirectory(path).map((f) => f.path),
    };
  }

  /* ------------------------------------------------------- directory API */

  /** AD virtual + NandeBlood: el grafo del dominio como estado real. */
  get ad() {
    const dir = this.k.directory;
    return {
      principals: () => dir.all(),
      edges: () => dir.allEdges(),
      owned: () => dir.owned(),
      kerberoastable: () => dir.kerberoastable(),
      kerberoast: (spn: string) => dir.kerberoast(spn),
      crack: (spn: string, guess: string) => dir.crack(spn, guess),
      abuse: (from: string, to: string) => dir.abuse(from, to),
      path: () => dir.pathToDomainAdmins(),
      domainOwned: () => dir.domainOwned(),
    };
  }

  /* ---------------------------------------------------------- sniffer API */

  /** NandeShark: el tráfico REAL capturado del cable (paquetes, no textos). */
  get sniff() {
    const shark = this.k.shark;
    return {
      recent: (n = 100) => shark.recent(n),
      filter: (expr: string) => shark.filter(expr),
      follow: (host: string) => shark.followHost(host),
      credentials: () => shark.credentials(),
      count: () => shark.count(),
    };
  }

  /* ------------------------------------------------------------ ctf API */

  /** Retos procedurales: bandera real detrás de una app web real. */
  get ctf() {
    const forge = this.k.ctfForge;
    return {
      current: () => forge.current(),
      generate: (seed: number) => forge.generate(seed),
    };
  }

  /* --------------------------------------------------------- redteam API */

  /** Red team autónomo: el adversario NPC que corre una kill-chain real. */
  get redteam() {
    const rt = this.k.redteam;
    return {
      timeline: (n = 20) => rt.timeline(n),
      phase: () => rt.currentPhase(),
      rival: () => rt.rival(),
      compromised: () => rt.compromised(),
      evict: () => rt.evict(this.k.world.getState().clock.tick),
    };
  }

  /* ---------------------------------------------------------- purple API */

  /** Correlador MITRE ATT&CK: detecciones derivadas de acciones reales. */
  get mitre() {
    const m = this.k.mitre;
    return {
      recent: (n = 50) => m.recent(n),
      techniques: () => m.techniques(),
      byTactic: () => m.byTactic(),
      count: () => m.count(),
    };
  }

  /* -------------------------------------------------------------- log API */

  /** Timeline de eventos de hosts/servicios (evidencia para el SOC). */
  get log() {
    return {
      hosts: (limit = 100) => this.k.hosts.timeline(limit),
      events: (limit = 100) => this.events.recent(limit),
    };
  }
}
