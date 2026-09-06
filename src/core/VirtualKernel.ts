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
import { WebServer } from "./http/WebServer";
import { BankApp } from "./http/apps/bank";
import { BlogApp, PhotosApp, FilesApp, ToolsApp } from "./http/apps/labs";
import { VirtualSearch } from "./search/VirtualSearch";
import { VirtualInternet } from "./internet/VirtualInternet";
import { WorldPublisher } from "./internet/WorldPublisher";
import { NewsEngine } from "./news/NewsEngine";
import { SecurityTools } from "./security/SecurityTools";
import { Academy } from "./academy/Academy";
import { LessonEngine } from "./academy/Lessons";
import { Progression } from "./game/Progression";
import { Notoriety } from "./game/Notoriety";
import { Campaign } from "./campaign/Campaign";
import { Consequences } from "./world/Consequences";
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
  public web: WebServer;
  public search: VirtualSearch;
  public internet: VirtualInternet;
  public publisher: WorldPublisher;
  public news: NewsEngine;
  public tools: SecurityTools;
  public academy: Academy;
  public lessons: LessonEngine;
  public player: Progression;
  public notoriety: Notoriety;
  public campaign: Campaign;
  public consequences: Consequences;
  public missions: MissionEngine;
  public store: Store;
  public economy: Economy;
  public mail: VirtualMail;
  public chat: Chat;
  public appearance: Appearance;
  public notes: Notes;
  public shop: Marketplace;
  public groups: HackerGroups;
  /** Comando que otra app (ej. ÑANDE Learn) quiere que corra la terminal. */
  public pendingCommand: string | null = null;
  public map: WorldMap;
  public hardware: VirtualHardware;
  public wifi: VirtualWiFi;

  private unsubscribePublisher: () => void;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  /** Registra las aplicaciones web vulnerables del mundo. */
  private registerWebApps(): void {
    this.web.register(new BankApp());
    this.web.register(new BlogApp());
    this.web.register(new PhotosApp());
    this.web.register(new FilesApp());
    this.web.register(new ToolsApp());
  }

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
    this.web = new WebServer();
    this.browser = new VirtualBrowser(
      this.dns,
      this.internet,
      this.network,
      this.web,
    );
    this.registerWebApps();

    this.publisher = new WorldPublisher(
      this.dns,
      this.internet,
      this.search,
      {
        // El día actual del mundo: hace que los sitios de los habitantes
        // crezcan con el tiempo (más posts, commits, versiones).
        currentDay: () =>
          Math.floor(this.world.getState().clock.tick / 1440) + 1,
        // Perfil real del dueño, para dar contexto al sitio.
        ownerProfile: (ownerId, metadata) => {
          const person = this.worldEngine.getPerson(ownerId);
          return {
            name: person?.name ?? metadata.ownerName ?? ownerId,
            profession: person?.profession ?? "vecino",
            interests: person?.interests ?? [],
          };
        },
      },
    );

    this.news = new NewsEngine();
    this.tools = new SecurityTools(this.network, this.dns);
    this.academy = new Academy();
    this.lessons = new LessonEngine();
    this.player = new Progression(this.events);
    this.missions = new MissionEngine(this.player, this.events);
    this.store = new Store(this.registry);
    this.economy = new Economy(this.events);
    this.notoriety = new Notoriety(this.events);
    this.campaign = new Campaign(this.events);
    this.consequences = new Consequences({
      economy: this.economy,
      news: this.news,
      notoriety: this.notoriety,
      campaign: this.campaign,
      events: this.events,
    });
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

    // Los laboratorios web: cada uno con una vulnerabilidad real.
    this.dns.register("banco.nande", "10.10.7.10");
    this.dns.register("blog.yvoty.nande", "10.10.7.11");
    this.dns.register("fotos.arandu.nande", "10.10.7.12");
    this.dns.register("docs.tape.nande", "10.10.7.13");
    this.dns.register("tools.pyta.nande", "10.10.7.14");

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

    this.seedInitialSites();
  }

  /**
   * Siembra un puñado de sitios de habitantes YA establecidos, para que la
   * Internet virtual esté viva desde el primer segundo. Sin esto habría que
   * esperar a que los agentes crearan sus sitios (cientos de ticks). Se
   * "retrofechan" para que tengan antigüedad y, por tanto, contenido rico
   * (varias entradas de blog, muchos commits, versiones).
   */
  private seedInitialSites(): void {
    const people = this.worldEngine.getPeople();
    if (people.length === 0) return;

    const plan: {
      type: WorldEntity["type"];
      name: string;
      desc: string;
      ageDays: number;
      tags: string[];
    }[] = [
      { type: "repository", name: "Yvyra Scanner", desc: "Escáner de puertos ligero, escrito en la comunidad.", ageDays: 40, tags: ["redes", "seguridad"] },
      { type: "company", name: "Arandu Software", desc: "Estudio de software a medida para el mundo de ÑANDE.", ageDays: 60, tags: ["negocios", "tecnología"] },
      { type: "website", name: "Bitácora de Kamba", desc: "Un blog sobre aprender a programar desde cero.", ageDays: 35, tags: ["educación"] },
      { type: "app", name: "Ñe'ẽ Chat", desc: "App de mensajería con cifrado punta a punta.", ageDays: 25, tags: ["tecnología"] },
      { type: "community", name: "Foro Tapé", desc: "La comunidad de redes y sysadmin del mundo.", ageDays: 50, tags: ["redes"] },
      { type: "game", name: "Mymba Runner", desc: "Un juego de plataformas hecho por un vecino.", ageDays: 18, tags: ["videojuegos"] },
      { type: "company", name: "Pytã Security", desc: "Consultora de ciberseguridad y pentesting.", ageDays: 70, tags: ["seguridad"] },
      { type: "repository", name: "guata-cli", desc: "Herramienta de línea de comandos para automatizar tareas.", ageDays: 30, tags: ["Git", "tecnología"] },
      { type: "website", name: "Cocina Ñande", desc: "Recetas paraguayas explicadas paso a paso.", ageDays: 45, tags: ["cultura"] },
      { type: "channel", name: "Canal Guaraní Tech", desc: "Tutoriales de tecnología en guaraní y español.", ageDays: 22, tags: ["educación", "video"] },
      { type: "organization", name: "Yvoty Media", desc: "Medio digital independiente del mundo.", ageDays: 55, tags: ["medios"] },
      { type: "repository", name: "sql-lab", desc: "Colección de retos de inyección SQL para practicar.", ageDays: 15, tags: ["seguridad", "SQL"] },
    ];

    plan.forEach((item, i) => {
      const owner = people[(i * 37) % people.length];
      // Tick de creación retrofechado, para que el sitio tenga antigüedad.
      const createdTick = -item.ageDays * 1440;

      // Se publica una entidad literal, SIN meterla en el WorldRegistry ni
      // emitir eventos: así la web queda viva desde el arranque, pero el
      // mundo sigue arrancando "vacío" (sin noticias ni entidades de
      // agente) hasta que los habitantes empiezan a crear cosas.
      const entity: WorldEntity = {
        id: `seed-${i}`,
        type: item.type,
        name: item.name,
        description: item.desc,
        ownerId: owner.id,
        createdTick,
        updatedTick: createdTick,
        tags: item.tags,
        metadata: { ownerName: owner.name, profession: owner.profession },
      };

      this.publisher.publish(entity);
    });
  }

  /** Pide a la terminal que ejecute un comando (la abre quien llame). */
  queueCommand(command: string): void {
    this.pendingCommand = command;
    this.events.emit("terminal.run", { command });
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
    this.economy.tick(
      worldState.clock.tick,
      this.worldEngine.sectorStrength(),
    );
    this.groups.tick(worldState.clock.tick);
    // El calor baja solo con el tiempo: si dejás de hacer ruido, el rastro
    // se enfría y el Blue Team pierde el hilo.
    this.notoriety.tickCool();
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
   * Captura una señal del juego (una bandera ND{...}, una contraseña
   * crackeada, un token forjado) y propaga sus consecuencias por el mundo:
   * economía, diario, notoriedad, calor y avance de la campaña. Es el
   * único punto por donde entra "algo que el jugador logró".
   */
  captureSignal(signal: string) {
    const tick = this.world.getState().clock.tick;
    return this.consequences.capture(signal, tick);
  }

  /**
   * Escanea un texto (la respuesta de una web, la salida de un comando) en
   * busca de banderas ND{...} y de señales de campaña conocidas, y las
   * captura. Devuelve las líneas de aviso que la UI debe mostrar.
   */
  scanForSignals(text: string): string[] {
    const notes: string[] = [];
    const signals = new Set<string>();

    for (const m of text.matchAll(/ND\{[^}]+\}/g)) signals.add(m[0]);

    // Señales de campaña que no son banderas ND{...} (ej. una contraseña
    // extraída que la historia espera).
    for (const chapter of this.campaign.chapters()) {
      for (const obj of chapter.objectives) {
        if (!obj.flag.startsWith("ND{") && text.includes(obj.flag)) {
          signals.add(obj.flag);
        }
      }
    }

    for (const signal of signals) {
      const r = this.captureSignal(signal);

      if (r.reacted && r.headline) {
        notes.push(`📰 El mundo reacciona: "${r.headline}"`);
      }
      if (r.chapterCompleted) {
        notes.push(`🎯 Capítulo completado: ${r.chapterCompleted}`);
      }
      if (r.campaignCompleted) {
        notes.push(`🏆 ¡Completaste Operación Génesis! Sos un operador.`);
      }
      if (r.busted) {
        notes.push(
          `🚨 ¡El Blue Team te detectó! Tuviste que replegarte. Bajá el calor.`,
        );
      }
    }

    return notes;
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
      livelihoods: this.worldEngine.livelihoodStats(),
      notoriety: this.notoriety.getState(),
      campaign: this.campaign.getState(),
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
