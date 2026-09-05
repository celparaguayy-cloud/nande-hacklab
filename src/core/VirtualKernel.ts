import { VirtualWorld } from "./world/VirtualWorld";
import { WorldEngine } from "./world/WorldEngine";
import { WorldRegistry } from "./world/WorldRegistry";
import { VirtualOS } from "./os/VirtualOS";
import { VirtualFilesystem } from "./filesystem/VirtualFilesystem";
import { VirtualUsers } from "./users/VirtualUsers";
import { VirtualProcesses } from "./processes/VirtualProcesses";
import { EventBus } from "./events/EventBus";
import { VirtualPrograms } from "./programs/VirtualPrograms";
import { VirtualNetwork } from "./network/VirtualNetwork";
import { VirtualDNS } from "./dns/VirtualDNS";
import { VirtualBrowser } from "./browser/VirtualBrowser";
import { VirtualSearch } from "./search/VirtualSearch";
import { VirtualInternet } from "./internet/VirtualInternet";
import { WorldPublisher } from "./internet/WorldPublisher";
import type { WorldEntity } from "./world/WorldRegistry";

/** Milisegundos entre dos avances del mundo. */
const TICK_INTERVAL_MS = 1000;

export class VirtualKernel {
  public world: VirtualWorld;
  public worldEngine: WorldEngine;
  public registry: WorldRegistry;
  public os: VirtualOS;
  public filesystem: VirtualFilesystem;
  public users: VirtualUsers;
  public processes: VirtualProcesses;
  public programs: VirtualPrograms;
  public events: EventBus;
  public network: VirtualNetwork;
  public dns: VirtualDNS;
  public browser: VirtualBrowser;
  public search: VirtualSearch;
  public internet: VirtualInternet;
  public publisher: WorldPublisher;

  private unsubscribePublisher: () => void;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.world = new VirtualWorld();
    this.registry = new WorldRegistry();
    this.events = new EventBus();
    this.worldEngine = new WorldEngine(this.registry, this.events);
    this.os = new VirtualOS(this.world);
    this.filesystem = new VirtualFilesystem();
    this.users = new VirtualUsers();
    this.processes = new VirtualProcesses();
    this.programs = new VirtualPrograms();
    this.network = new VirtualNetwork();
    this.dns = new VirtualDNS();
    this.search = new VirtualSearch();
    this.internet = new VirtualInternet();
    this.browser = new VirtualBrowser(this.dns, this.internet, this.network);

    this.publisher = new WorldPublisher(
      this.dns,
      this.internet,
      this.search,
    );

    // Lo que crean los habitantes entra en la Internet virtual:
    // dominio en el DNS, sitio navegable y entrada en el buscador.
    this.unsubscribePublisher = this.events.subscribe<WorldEntity>(
      "world.entity.created",
      (event) => {
        this.publisher.publish(event.data);
      },
    );
  }

  /** Libera el loop y las suscripciones del kernel. */
  dispose(): void {
    this.stop();
    this.unsubscribePublisher();
  }

  /**
   * Arranca el unico loop de simulacion. Es idempotente: llamarlo dos
   * veces (StrictMode monta dos veces en desarrollo) no crea un segundo
   * loop.
   */
  start(intervalMs: number = TICK_INTERVAL_MS): void {
    if (this.tickTimer !== null) {
      return;
    }

    this.tickTimer = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  /** Detiene el loop y baja a disco lo que quede pendiente. */
  stop(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }

    this.world.flush();
    this.registry.flush();
  }

  isRunning(): boolean {
    return this.tickTimer !== null;
  }

  tick(): void {
    this.os.tick();

    const worldState = this.world.getState();

    this.worldEngine.tick(worldState.clock.tick);

    this.events.emit(
      "world.tick",
      worldState,
    );
  }

  /**
   * Resumen barato para la UI: contadores y las ultimas entidades, sin
   * clonar el registro entero en cada refresco.
   */
  summary(recentEntities: number = 20) {
    return {
      world: this.world.getState(),
      clock: this.world.getState().clock,
      peopleCount: this.worldEngine.getPeopleCount(),
      onlineCount: this.worldEngine.getOnlineCount(),
      entityCount: this.registry.count(),
      entityCountsByType: this.registry.countByType(),
      recentEntities: this.registry.recent(recentEntities),
    };
  }

  snapshot() {
    return {
      world: this.world.getState(),
      os: this.os.getState(),
      users: this.users,
      processes: this.processes,
      programs: this.programs.all(),
      worldEntities: this.registry.all(),
      worldEntityCount: this.registry.count(),
    };
  }
}
