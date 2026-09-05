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
import { NewsEngine } from "./news/NewsEngine";
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
  public news: NewsEngine;

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

    this.news = new NewsEngine();

    // news.nande se arma en el momento: su portada refleja lo ultimo
    // que paso en el mundo, no una pagina escrita de antemano.
    this.internet.registerDynamicSite({
      hostname: "news.nande",
      title: "ÑANDE News",
      description: "Noticias del mundo virtual de ÑANDE.",
      resolve: (path) => {
        if (path === "/") {
          return {
            path,
            mimeType: "text/html",
            content: this.news.renderFront(),
          };
        }

        const match = path.match(/^\/article\/([\w-]+)$/);

        if (match) {
          const content = this.news.renderArticle(match[1]);

          return content
            ? { path, mimeType: "text/html", content }
            : undefined;
        }

        return undefined;
      },
    });

    // Lo que crean los habitantes entra en la Internet virtual y, si es
    // noticiable, pasa por la redaccion del diario.
    this.unsubscribePublisher = this.events.subscribe<WorldEntity>(
      "world.entity.created",
      (event) => {
        const entity = event.data;
        const hostname = this.publisher.publish(entity);

        const author =
          entity.metadata.ownerName ??
          this.worldEngine.getPerson(entity.ownerId)?.name ??
          entity.ownerId;

        const article = this.news.coverEntity(entity, author, hostname);

        if (article) {
          this.events.emit("world.news.created", article);

          // La nota tambien se puede encontrar desde el buscador.
          this.search.index({
            hostname: `news.nande/article/${article.id}`,
            title: article.headline,
            description: article.body,
            keywords: [article.category, "noticias"],
            entityId: entity.id,
            entityType: entity.type,
          });
        }
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
    this.news.flush();
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
      recentNews: this.news.latest(6),
      newsCount: this.news.count(),
      relationshipCount: this.worldEngine
        .getAgents()
        .getRelationships()
        .count(),
      recentEvents: this.worldEngine.getRecentEvents(8),
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
