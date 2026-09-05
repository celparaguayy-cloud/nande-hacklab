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
import { SecurityTools } from "./security/SecurityTools";
import { Academy } from "./academy/Academy";
import { LessonEngine } from "./academy/Lessons";
import { Progression } from "./game/Progression";
import { MissionEngine } from "./game/Missions";
import { Store } from "./game/Store";
import { Economy } from "./economy/Economy";
import { VirtualMail } from "./mail/VirtualMail";
import { Chat } from "./chat/Chat";
import { Appearance } from "./desktop/Appearance";
import { Notes } from "./notes/Notes";
import { Marketplace } from "./web/Marketplace";
import { renderGitSite } from "./web/gitSite";
import { HackerGroups } from "./groups/HackerGroups";
import { renderGroupsFront, renderGroup } from "./groups/groupsSite";
import { WorldMap } from "./world/WorldMap";
import { VirtualHardware } from "./hardware/VirtualHardware";
import { VirtualWiFi } from "./hardware/VirtualWiFi";
import {
  renderCommunitiesFront,
  renderCommunity,
} from "./social/communitySite";
import { renderAcademySite, renderToolsSite } from "./academy/academySites";
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
  public tools: SecurityTools;
  public academy: Academy;
  public lessons: LessonEngine;
  public player: Progression;
  public missions: MissionEngine;
  public store: Store;
  public economy: Economy;
  public mail: VirtualMail;
  public chat: Chat;
  public appearance: Appearance;
  public notes: Notes;
  public shop: Marketplace;
  public groups: HackerGroups;
  public map: WorldMap;
  public hardware: VirtualHardware;
  public wifi: VirtualWiFi;

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
    this.tools = new SecurityTools(this.network, this.dns);
    this.academy = new Academy();
    this.lessons = new LessonEngine();
    this.player = new Progression(this.events);
    this.missions = new MissionEngine(this.player, this.events);
    this.store = new Store(this.registry);
    this.economy = new Economy(this.events);
    this.mail = new VirtualMail(this.events);
    this.chat = new Chat(this.events);
    this.appearance = new Appearance(this.events);
    this.notes = new Notes();
    this.shop = new Marketplace(this.registry);
    this.groups = new HackerGroups(this.events);
    this.map = new WorldMap(
      this.registry,
      this.worldEngine.professions() as never,
    );
    this.hardware = new VirtualHardware();
    this.wifi = new VirtualWiFi(this.network);

    // academy.nande y tools.nande: la biblioteca y la ruta de aprendizaje,
    // navegables como cualquier otro sitio del mundo virtual.
    this.dns.register("academy.nande", "10.10.0.32");
    this.dns.register("tools.nande", "10.10.0.38");
    this.dns.register("store.nande", "10.10.0.39");
    this.dns.register("community.nande", "10.10.0.40");

    // community.nande: las comunidades vivas, navegables.
    this.internet.registerDynamicSite({
      hostname: "community.nande",
      title: "ÑANDE Comunidades",
      description: "Comunidades de habitantes del mundo.",
      resolve: (path) => {
        const communities = this.worldEngine.getCommunities();

        if (path === "/") {
          return {
            path,
            mimeType: "text/html",
            content: renderCommunitiesFront(communities.ranking(20)),
          };
        }

        const match = path.match(/^\/c\/([\w-]+)$/);

        if (match) {
          const community = communities.get(match[1]);
          const content = community
            ? renderCommunity(community)
            : undefined;

          return content
            ? { path, mimeType: "text/html", content }
            : undefined;
        }

        return undefined;
      },
    });

    // shop.nande: tienda navegable con categorías y compra real en N$.
    this.dns.register("shop.nande", "10.10.0.36");

    this.internet.registerDynamicSite({
      hostname: "shop.nande",
      title: "ÑANDE Store",
      description: "Tienda del mundo: buscá y comprá con N$.",
      resolve: (path) => {
        const html = (content: string) => ({
          path,
          mimeType: "text/html",
          content,
        });

        if (path === "/") {
          return html(this.shop.renderFront());
        }

        const cat = path.match(/^\/category\/([\w-]+)$/);
        if (cat) {
          const c = this.shop.renderCategory(cat[1]);
          return c ? html(c) : undefined;
        }

        const item = path.match(/^\/item\/([\w-]+)$/);
        if (item) {
          const c = this.shop.renderItem(item[1]);
          return c ? html(c) : undefined;
        }

        // Comprar: el enlace /buy/<id> ejecuta la compra y muestra el
        // resultado. El cobro sale del saldo real del jugador.
        const buy = path.match(/^\/buy\/([\w-]+)$/);
        if (buy) {
          const result = this.shop.buy(buy[1], (amount) =>
            this.player.spend(amount),
          );
          return html(this.shop.renderBuyResult(buy[1], result.ok, result.message));
        }

        return undefined;
      },
    });

    // git.nande: ecosistema Git virtual con repos y herramientas de los
    // habitantes, navegable.
    this.dns.register("git.nande", "10.10.0.34");

    this.internet.registerDynamicSite({
      hostname: "git.nande",
      title: "ÑANDE Git",
      description: "Repositorios y herramientas del mundo virtual.",
      resolve: (path) => renderGitSite(this.registry, path),
    });

    // groups.nande: colectivos hacker éticos, navegables, con unirse.
    this.dns.register("groups.nande", "10.10.0.41");

    this.internet.registerDynamicSite({
      hostname: "groups.nande",
      title: "Grupos hacker de ÑANDE",
      description: "Colectivos de hackers éticos.",
      resolve: (path) => {
        const html = (content: string) => ({
          path,
          mimeType: "text/html",
          content,
        });

        if (path === "/") {
          return html(renderGroupsFront(this.groups));
        }

        const view = path.match(/^\/g\/([\w-]+)$/);
        if (view) {
          const c = renderGroup(this.groups, view[1]);
          return c ? html(c) : undefined;
        }

        const join = path.match(/^\/join\/([\w-]+)$/);
        if (join) {
          const r = this.groups.join(join[1]);
          return html(
            `<h1>${r.ok ? "✅" : "⚠"} ${r.message}</h1>` +
              `<p><a href="/g/${join[1]}">← Volver al grupo</a> · <a href="/">Grupos</a></p>`,
          );
        }

        const leave = path.match(/^\/leave\/([\w-]+)$/);
        if (leave) {
          const r = this.groups.leave();
          return html(
            `<h1>${r.message}</h1><p><a href="/">← Volver a los grupos</a></p>`,
          );
        }

        return undefined;
      },
    });

    this.internet.registerDynamicSite({
      hostname: "academy.nande",
      title: "ÑANDE Academy",
      description: "Aprendé ciberseguridad de cero a experto.",
      resolve: (path) => ({
        path,
        mimeType: "text/html",
        content: renderAcademySite(this.academy, this.tools, path),
      }),
    });

    this.internet.registerDynamicSite({
      hostname: "tools.nande",
      title: "ÑANDE Toolbox",
      description: "Biblioteca de herramientas de seguridad.",
      resolve: (path) => {
        const content = renderToolsSite(this.tools, path);

        return content
          ? { path, mimeType: "text/html", content }
          : undefined;
      },
    });

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
    this.player.flush();
    this.groups.flush();
    this.economy.flush();
    this.mail.flush();
    this.chat.flush();
  }

  isRunning(): boolean {
    return this.tickTimer !== null;
  }

  tick(): void {
    this.os.tick();

    const worldState = this.world.getState();

    this.worldEngine.tick(worldState.clock.tick, worldState.clock.hour);
    this.economy.tick(worldState.clock.tick);
    this.groups.tick(worldState.clock.tick);
    this.mail.tick(worldState.clock.tick, this.worldEngine);

    // De vez en cuando un habitante en línea escribe primero por chat.
    if (
      worldState.clock.tick % 130 === 0 &&
      Math.random() < 0.5
    ) {
      const online = this.worldEngine.getOnlinePeople();
      if (online.length > 0) {
        const who = online[Math.floor(Math.random() * online.length)];
        this.chat.incoming(who, worldState.clock.tick);
      }
    }

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
      storeCount: this.store.count(),
      player: this.player.getState(),
      xpToNext: this.player.xpToNext(),
      missions: this.missions.progress(),
      economy: this.economy.snapshot(),
      groups: this.groups.all(),
      groupMemberOf: this.groups.memberOf(),
      unreadMail: this.mail.unreadCount(),
      unreadChat: this.chat.unreadTotal(),
      map: this.map.snapshot(
        this.worldEngine.presenceByZone(this.world.getState().clock.hour),
      ),
      communities: this.worldEngine.getCommunities().ranking(8),
      communityMembers: this.worldEngine.getCommunities().totalMembers(),
      life: this.worldEngine.lifeBreakdown(
        this.world.getState().clock.hour,
      ),
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
