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
import { ServerApp } from "./http/apps/server";
import { ControlPanelApp } from "./http/apps/panel";
import { HostRuntime, type VirtualService } from "./net/HostRuntime";
import { CodeExecutionSandbox, type SandboxHost } from "./code/Sandbox";
import { ToolRuntime } from "./code/ToolRuntime";
import { NpcToolForge } from "./code/NpcToolForge";
import { BlueTeamSOC } from "./security/BlueTeam";
import { AIService } from "./ai/AIService";
import { SnapshotManager } from "./os/Snapshots";
import { DatabaseRuntime } from "./db/DatabaseRuntime";
import { Anonymity } from "./security/Anonymity";
import { CtfArena } from "./game/CtfArena";
import { ThreatEngine, DEFENSE_HOST } from "./game/ThreatEngine";
import { CyberRuntime } from "./runtime/CyberRuntime";
import { PacketCapture } from "./net/PacketCapture";
import { Directory } from "./ad/Directory";
import { MitreCorrelator } from "./soc/Mitre";
import { RedTeamAgent, REDTEAM_TARGET } from "./game/RedTeamAgent";
import { BlogApp, PhotosApp, FilesApp, ToolsApp } from "./http/apps/labs";
import { SsrfApp, JwtNoneApp, RedirectApp } from "./http/apps/labs2";
import { CsrfApp, LfiApp, UploadApp, DeserializeApp } from "./http/apps/labs3";
import { SstiApp, XxeApp, NoSqlApp, RaceApp } from "./http/apps/labs4";
import { ForensicsApp } from "./http/apps/blueteam";
import { NandeBlackbox } from "./http/apps/blackbox";
import { ThreatIntel } from "./http/apps/threatintel";
import { NimbusCloud } from "./http/apps/cloud";
import { CicdLab } from "./http/apps/cicd";
import { AiSecLab } from "./http/apps/aisec";
import { PurpleTeam } from "./http/apps/purple";
import { VirtualSearch } from "./search/VirtualSearch";
import { VirtualInternet } from "./internet/VirtualInternet";
import { WorldPublisher } from "./internet/WorldPublisher";
import { NewsEngine } from "./news/NewsEngine";
import { SecurityTools } from "./security/SecurityTools";
import { Academy } from "./academy/Academy";
import { LessonEngine } from "./academy/Lessons";
import { Progression } from "./game/Progression";
import { PlayerCompany } from "./game/PlayerCompany";
import { Notoriety } from "./game/Notoriety";
import { Campaign } from "./campaign/Campaign";
import { Mentor } from "./mentor/Mentor";
import { Pulso } from "./social/Pulso";
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
import { renderForum } from "./internet/forumSite";
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
  /** Fuente única de verdad de hosts/servicios/puertos del mundo virtual. */
  public hosts: HostRuntime;
  public browser: VirtualBrowser;
  /** NandeShark: captura y análisis del tráfico REAL del mundo virtual. */
  public shark: PacketCapture;
  public web: WebServer;
  public search: VirtualSearch;
  public internet: VirtualInternet;
  public publisher: WorldPublisher;
  public news: NewsEngine;
  public tools: SecurityTools;
  public academy: Academy;
  public lessons: LessonEngine;
  public player: Progression;
  public company: PlayerCompany;
  private lastCompanyDay = 0;
  public notoriety: Notoriety;
  public campaign: Campaign;
  public mentor: Mentor;
  public pulso: Pulso;
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
  /** URL que otra app (ej. el Mundo 2D) quiere que abra el navegador. */
  public pendingUrl: string | null = null;
  public map: WorldMap;
  public hardware: VirtualHardware;
  public wifi: VirtualWiFi;
  /** Sandbox de ejecución de código y registro de herramientas funcionales. */
  public sandbox: CodeExecutionSandbox;
  public toolRuntime: ToolRuntime;
  public npcForge: NpcToolForge;
  /** Centro de operaciones (Blue Team): consume eventos reales del runtime. */
  public soc: BlueTeamSOC;
  /** IA opcional: offline por defecto; conectada con la clave del jugador. */
  public ai: AIService;
  /** Fotos del mundo: guardar/restaurar para experimentar sin miedo. */
  public snapshots: SnapshotManager;
  /** Catálogo de bases de datos consultables (motor SQL real). */
  public databases: DatabaseRuntime;
  /** Estado de anonimato del jugador (Tor virtual, MAC spoofing). */
  public anonymity: Anonymity;
  /** Modo CTF contrarreloj con tabla de puntajes. */
  public ctf: CtfArena;
  /** Amenazas vivas: rivales atacan tu data center; vos defendés (Blue Team). */
  public threats: ThreatEngine;
  /** Directorio Activo virtual (dominio, grupos, Kerberos/ACL) + NandeBlood. */
  public directory: Directory;
  /** Correlador MITRE ATT&CK: mapea las acciones ofensivas reales a técnicas. */
  public mitre: MitreCorrelator;
  /** Red team autónomo: un adversario NPC que corre una kill-chain real. */
  public redteam: RedTeamAgent;
  /**
   * CyberRuntime — la API común del universo 5.0. Un solo punto por el que
   * TODA herramienta lee y escribe el mundo (host, servicio, proceso, red,
   * identidad, http, base de datos, filesystem, reloj y eventos). No
   * reimplementa: delega en los runtimes que ya son la fuente de verdad.
   */
  public runtime: CyberRuntime;
  private sandboxRng = 0x9e3779b9;

  private unsubscribePublisher: () => void;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  /** Registra las aplicaciones web vulnerables del mundo. */
  private registerWebApps(): void {
    this.web.register(new ServerApp());
    this.web.register(new ControlPanelApp());
    this.web.register(new BankApp());
    this.web.register(new BlogApp());
    this.web.register(new PhotosApp());
    this.web.register(new FilesApp());
    this.web.register(new ToolsApp());
    this.web.register(new SsrfApp());
    this.web.register(new JwtNoneApp());
    this.web.register(new RedirectApp());
    this.web.register(new CsrfApp());
    this.web.register(new LfiApp());
    this.web.register(new UploadApp());
    this.web.register(new DeserializeApp());
    this.web.register(new SstiApp());
    this.web.register(new XxeApp());
    this.web.register(new NoSqlApp());
    this.web.register(new RaceApp());
    this.web.register(new ForensicsApp());
    this.web.register(new NandeBlackbox());
    this.web.register(new ThreatIntel());
    this.web.register(new NimbusCloud());
    this.web.register(new CicdLab());
    this.web.register(new AiSecLab());
    this.web.register(new PurpleTeam());
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
    this.hosts = new HostRuntime({
      now: () => this.world.getState().clock.tick,
      onEvent: (event) => this.events.emit("runtime.host", event),
    });
    this.browser = new VirtualBrowser(
      this.dns,
      this.internet,
      this.network,
      this.web,
      this.hosts,
      {
        // Cada petición real deja su rastro en el cable: NandeShark lo captura.
        onTraffic: (t) => this.events.emit("network.request", t),
        now: () => this.world.getState().clock.tick,
      },
    );
    this.shark = new PacketCapture(this.events);
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
        webServer: this.web,
        // Puente con la economía real: el panel de un sitio hackeado muestra
        // el saldo verdadero del dueño y puede transferirlo al jugador. Los
        // métodos son closures: se ejecutan al robar, cuando player/notoriety
        // ya existen (aunque el publisher se arme antes que ellos).
        bank: {
          balanceOf: (ownerId) => this.worldEngine.wealthOf(ownerId),
          rob: (ownerId, siteName) => {
            const tick = this.world.getState().clock.tick;
            const taken = this.worldEngine.robWealth(ownerId);
            // La plata sale del NPC y entra a la billetera del jugador: circula.
            this.player.award(50, { coins: taken, tick });
            // Robar deja rastro: notoriedad, calor y una noticia.
            this.notoriety.addNotoriety(20);
            const { busted } = this.notoriety.addHeat(30);
            this.news.headline(
              `Vaciaron una cuenta en ${siteName}`,
              `Una transferencia no autorizada dejó la cuenta en cero. ` +
                `El caso escaló y el Blue Team ya investiga.`,
              "Seguridad",
              tick,
            );
            this.events.emit("world.news.created", { signal: `robo:${siteName}` });
            return { taken, busted };
          },
        },
      },
    );

    this.news = new NewsEngine();
    this.tools = new SecurityTools(this.network, this.dns, this.hosts);
    this.academy = new Academy();
    this.lessons = new LessonEngine();
    this.player = new Progression(this.events);
    this.company = new PlayerCompany();
    this.missions = new MissionEngine(this.player, this.events);
    this.store = new Store(this.registry);
    this.economy = new Economy(this.events);
    this.notoriety = new Notoriety(this.events);
    this.campaign = new Campaign(this.events);
    this.mentor = new Mentor(this.events, this.campaign);
    this.pulso = new Pulso(
      () => this.worldEngine.getPeople(),
      () => Math.floor(this.world.getState().clock.tick / 1440) + 1,
    );
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
    this.sandbox = new CodeExecutionSandbox();
    this.toolRuntime = new ToolRuntime(this.sandbox, this.makeSandboxHost(), {
      now: () => this.world.getState().clock.tick,
    });
    this.npcForge = new NpcToolForge(this.toolRuntime);
    this.soc = new BlueTeamSOC(this.events);
    this.ai = new AIService();
    this.snapshots = new SnapshotManager(() => this.world.getState().clock.tick);
    this.databases = new DatabaseRuntime();
    this.anonymity = new Anonymity();
    this.ctf = new CtfArena();
    this.threats = new ThreatEngine(this.hosts);
    // El correlador escucha antes de que el directorio emita nada.
    this.mitre = new MitreCorrelator(this.events, () => this.world.getState().clock.tick);
    this.directory = new Directory((s) => this.events.emit("attack.technique", s));
    this.redteam = new RedTeamAgent(this.hosts);
    // El corazón 5.0: se arma cuando todos los runtimes-fuente ya existen
    // (hosts, dns, red, navegador, bases, filesystem, eventos, reloj).
    this.runtime = new CyberRuntime(this);

    // academy.nande y tools.nande: la biblioteca y la ruta de aprendizaje,
    // navegables como cualquier otro sitio del mundo virtual.
    this.dns.register("academy.nande", "10.10.0.32");
    this.dns.register("tools.nande", "10.10.0.38");
    this.dns.register("store.nande", "10.10.0.39");
    this.dns.register("community.nande", "10.10.0.40");

    // server.nande: servidor web de referencia (sin vuln) para demostrar el
    // ciclo de vida de servicios (service-stop nginx → curl/nmap cambian).
    this.dns.register("server.nande", "10.10.0.42");
    // panel.nande: servicio web legítimo con login y sesión (no es un lab).
    this.dns.register("panel.nande", "10.10.0.43");

    // Los laboratorios web: cada uno con una vulnerabilidad real.
    this.dns.register("banco.nande", "10.10.7.10");
    this.dns.register("blog.yvoty.nande", "10.10.7.11");
    this.dns.register("fotos.arandu.nande", "10.10.7.12");
    this.dns.register("docs.tape.nande", "10.10.7.13");
    this.dns.register("tools.pyta.nande", "10.10.7.14");
    this.dns.register("preview.vortex.nande", "10.10.7.15");
    this.dns.register("api.vortex.nande", "10.10.7.16");
    this.dns.register("link.gulu.nande", "10.10.7.17");
    this.dns.register("m.banco-justicia.nande", "10.10.7.18");
    this.dns.register("portal.nova.nande", "10.10.7.19");
    this.dns.register("files.bytebox.nande", "10.10.7.20");
    this.dns.register("cuenta.redix.nande", "10.10.7.21");
    this.dns.register("saludos.codea.nande", "10.10.7.22");
    this.dns.register("import.nova.nande", "10.10.7.23");
    this.dns.register("login.redix.nande", "10.10.7.24");
    this.dns.register("cupones.gulu.nande", "10.10.7.25");
    this.dns.register("soc.nande", "10.10.7.26");
    this.dns.register("blackbox.nande", "10.10.7.27");
    this.dns.register("ti.nande", "10.10.7.28");
    this.dns.register("cloud.nande", "10.10.7.29");
    this.dns.register("ci.nande", "10.10.7.30");
    this.dns.register("agente.nande", "10.10.7.31");
    this.dns.register("purple.nande", "10.10.7.32");

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

    // foro.nande: foro navegable con hilos generados del mundo vivo.
    this.dns.register("foro.nande", "10.10.0.44");
    this.internet.registerDynamicSite({
      hostname: "foro.nande",
      title: "Foro Tapé",
      description: "El foro de la comunidad: hilos y respuestas del mundo.",
      resolve: (path) => {
        const content = renderForum(this.worldEngine.getPeople(), path);
        return content ? { path, mimeType: "text/html", content } : undefined;
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

    this.seedHosts();
    this.seedNpcTools();
    this.seedInitialSites();
  }

  /**
   * Unos pocos NPC "desarrolladores" publican herramientas FUNCIONALES desde
   * el arranque: código real que compila, pasa sus tests y queda ejecutable
   * con `run`. Si un intento no compilara o fallara sus pruebas, no se
   * publica (el forge lo descarta). Determinista.
   */
  private seedNpcTools(): void {
    const people = this.worldEngine.getPeople();
    if (people.length === 0) return;
    for (let i = 0; i < 5; i += 1) {
      const npc = people[(i * 53) % people.length];
      this.npcForge.forge(npc, i);
    }
  }

  /**
   * Construye el "host" del sandbox: la ÚNICA superficie por la que el código
   * del jugador o de un NPC toca el mundo. Todo pasa por los mismos runtimes
   * (HostRuntime, DNS, navegador); jamás por APIs reales del dispositivo.
   */
  private makeSandboxHost(): SandboxHost {
    return {
      now: () => this.world.getState().clock.tick,
      rng: () => {
        // PRNG determinista (mulberry32): sin Math.random, reproducible.
        this.sandboxRng = (this.sandboxRng + 0x6d2b79f5) | 0;
        let t = this.sandboxRng;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      resolve: (host) => this.dns.resolve(host),
      scan: (host) => {
        const h = this.hosts.resolve(host);
        if (!h || !h.up) return [];
        return h.services.map((s) => ({
          port: s.port,
          service: s.name,
          state: h.firewall.includes(s.port)
            ? "filtered"
            : s.state === "running"
              ? "open"
              : "closed",
        }));
      },
      http: (url) => {
        const clean = url.replace(/^https?:\/\//i, "");
        const slash = clean.indexOf("/");
        const hostname = (slash === -1 ? clean : clean.slice(0, slash)).toLowerCase();
        const path = slash === -1 ? "/" : clean.slice(slash);
        if (!this.browser.isWebApp(hostname)) {
          return { status: 0, text: `host no es una webapp del mundo: ${hostname}` };
        }
        try {
          const { response } = this.browser.request("GET", hostname, path);
          const text = response.body
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          return { status: response.status, text };
        } catch (e) {
          return { status: 0, text: e instanceof Error ? e.message : "error" };
        }
      },
    };
  }

  /**
   * Puebla el HostRuntime (la fuente de verdad de hosts/servicios) desde lo
   * que ya existe: cada webapp del WebServer se vuelve un host con nginx en
   * 80/tcp; server.nande suma ssh; y cada máquina del laboratorio aporta sus
   * servicios reales. A partir de acá, nmap y el navegador leen de acá — el
   * mismo estado produce ambas respuestas.
   */
  private seedHosts(): void {
    // Tu data center (midc.nande): el host que defendés. Los rivales lo
    // atacan con el tiempo y vos contenés los incidentes (Blue Team jugable).
    this.dns.register(DEFENSE_HOST, "10.10.0.90");
    this.hosts.registerWebHost(DEFENSE_HOST, "10.10.0.90", [
      { name: "sshd", port: 22, protocol: "tcp", version: "OpenÑSSH 9.6", kind: "ssh" },
      { name: "postgres", port: 5432, protocol: "tcp", version: "ÑandePG 14", kind: "db" },
    ]);

    // objetivo.corp.nande: el host sandboxeado que ataca el red team autónomo.
    // Tiene web (nginx) + SSH con una credencial "filtrada" que el adversario
    // termina usando. Sus operaciones son reales, así SOC y MITRE las detectan.
    this.dns.register(REDTEAM_TARGET, "10.10.9.80");
    this.hosts.registerWebHost(REDTEAM_TARGET, "10.10.9.80", [
      { name: "sshd", port: 22, protocol: "tcp", version: "OpenÑSSH 9.6", kind: "ssh" },
    ]).creds.push({ user: "svc-backup", password: "Backup#2024" });

    // Webapps del mundo (banco.nande, blog.yvoty.nande, …): host con nginx.
    for (const app of this.web.list()) {
      const ip = this.dns.resolve(app.hostname);
      if (!ip || this.hosts.has(app.hostname)) continue;
      const extra: Partial<VirtualService>[] =
        app.hostname === "server.nande"
          ? [{ name: "sshd", port: 22, protocol: "tcp", version: "OpenÑSSH 9.6", kind: "ssh" }]
          : [];
      const host = this.hosts.registerWebHost(app.hostname, ip, extra);

      // server.nande es la puerta al pivoting: tiene SSH con credenciales
      // (las mismas que se sniffan con tcpdump en el lab), archivos, y desde
      // él se alcanza una red interna que NO se ve desde afuera.
      if (app.hostname === "server.nande") {
        host.creds.push({ user: "soporte", password: "Verano2024" });
        host.files["/home/soporte/notas.txt"] =
          "Recordatorio: la caja interna (caja.interna.nande, 10.10.66.10) sólo " +
          "se ve desde este server. Usuario admin / clave GiraSol#2024.";
        host.files["/etc/motd"] = "server.nande — acceso autorizado sólo a personal.";
      }
    }

    // Red interna: un host que SÓLO se alcanza pivotando por server.nande.
    // Es la "caja fuerte" del laboratorio de pivoting: guarda una bandera.
    this.hosts.register({
      hostname: "caja.interna.nande",
      ip: "10.10.66.10",
      os: "ÑandeServer 3.0 (interno)",
      up: true,
      services: [
        { name: "sshd", port: 22, protocol: "tcp", version: "OpenÑSSH 9.6", kind: "ssh", state: "running", enabled: true },
        { name: "postgres", port: 5432, protocol: "tcp", version: "ÑandePG 14", kind: "db", state: "running", enabled: true },
      ],
      firewall: [],
      processes: [],
      files: {
        "/root/flag.txt": "Bandera: ND{pivoting_red_interna}",
        "/var/lib/pg/clientes.sql": "-- 12.400 registros de clientes (ficticios).",
      },
      creds: [{ user: "admin", password: "GiraSol#2024" }],
      reachableFrom: ["server.nande"],
      flag: "ND{pivoting_red_interna}",
    });

    // Máquinas del laboratorio: importar sus servicios reales.
    for (const machine of this.tools.labMachines()) {
      if (this.hosts.has(machine.hostname) || this.hosts.has(machine.ip)) continue;
      const services: VirtualService[] = machine.services.map((s) => ({
        name: s.name,
        port: s.port,
        protocol: s.protocol,
        version: s.version,
        kind: kindOfService(s.name, s.port),
        state: "running" as const,
        enabled: true,
      }));
      this.hosts.register({
        hostname: machine.hostname,
        ip: machine.ip,
        os: machine.os,
        up: machine.up,
        services,
        firewall: [],
        processes: [],
        files: Object.fromEntries(machine.files.map((f) => [f.path, f.content])),
        creds: [],
        flag: machine.flag,
      });
      // Que el nombre resuelva por DNS también (nmap acepta host o IP).
      if (!this.dns.has(machine.hostname)) {
        this.dns.register(machine.hostname, machine.ip);
      }
    }
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
      { type: "app", name: "Gulu", desc: "El buscador más usado del mundo virtual. Todo empieza acá.", ageDays: 90, tags: ["tecnología", "buscador"] },
      { type: "company", name: "Banco Justicia", desc: "Banca digital para todos. Tu plata, siempre a mano.", ageDays: 80, tags: ["finanzas", "negocios"] },
      { type: "website", name: "Bitácora de Kamba", desc: "Un blog sobre aprender a programar desde cero.", ageDays: 35, tags: ["educación"] },
      { type: "app", name: "Vortex Chat", desc: "App de mensajería con cifrado punta a punta.", ageDays: 25, tags: ["tecnología"] },
      { type: "community", name: "Foro Tapé", desc: "La comunidad de redes y sysadmin del mundo.", ageDays: 50, tags: ["redes"] },
      { type: "game", name: "Vortex Games", desc: "Estudio indie de juegos de plataformas y arcade.", ageDays: 18, tags: ["videojuegos"] },
      { type: "company", name: "Pytã Security", desc: "Consultora de ciberseguridad y pentesting.", ageDays: 70, tags: ["seguridad"] },
      { type: "company", name: "Nova Corp", desc: "Holding de tecnología: nube, datos y logística.", ageDays: 65, tags: ["negocios", "tecnología"] },
      { type: "repository", name: "guata-cli", desc: "Herramienta de línea de comandos para automatizar tareas.", ageDays: 30, tags: ["Git", "tecnología"] },
      { type: "website", name: "Cocina Ñande", desc: "Recetas paraguayas explicadas paso a paso.", ageDays: 45, tags: ["cultura"] },
      { type: "channel", name: "Pixelar", desc: "Estudio de diseño y tutoriales visuales.", ageDays: 22, tags: ["diseño", "video"] },
      { type: "organization", name: "Portal Justicia", desc: "Medio digital independiente que investiga al poder.", ageDays: 55, tags: ["medios", "noticias"] },
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

      // Las empresas y organizaciones arrancan con una caja: son negocios
      // que ya facturan. Por eso hackear "Banco Justicia" o "Nova Corp" paga
      // muchísimo más que a un vecino — te llevás la caja, no un bolsillo.
      if (item.type === "company" || item.type === "organization") {
        let cap = 300_000;
        for (let c = 0; c < item.name.length; c += 1) {
          cap = (cap + item.name.charCodeAt(c) * 9973) % 2_500_000;
        }
        cap += 400_000;
        if (/banco/i.test(item.name)) cap += 3_000_000; // los bancos, más caja
        this.worldEngine.registerBusiness(owner.id, item.name, cap);
      }
    });
  }

  /** Pide a la terminal que ejecute un comando (la abre quien llame). */
  queueCommand(command: string): void {
    this.pendingCommand = command;
    this.events.emit("terminal.run", { command });
  }

  /** Pide al navegador que abra una URL (lo usa el Mundo 2D al entrar a un edificio). */
  navigateBrowser(url: string): void {
    this.pendingUrl = url;
    this.events.emit("browser.navigate", { url });
  }

  /** Libera el loop y las suscripciones del kernel. */
  dispose(): void {
    this.stop();
    this.unsubscribePublisher();
    this.soc.dispose();
    this.runtime.dispose();
    this.shark.dispose();
    this.mitre.dispose();
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

    // Amenazas vivas: cada tanto, un rival ataca tu data center. El ataque
    // tira un servicio (evento real que el SOC ve como alerta). Tenés que
    // contenerlo desde el SOC o con 'contener'. Blue Team jugable.
    if (worldState.clock.tick % 150 === 0) {
      const inc = this.threats.maybeAttack(worldState.clock.tick);
      if (inc) {
        this.news.headline(
          `Incidente en tu data center: ${inc.service} caído`,
          `El rival ${inc.rival} atacó ${inc.host} y tiró el servicio ${inc.service}. ` +
            `Contené el incidente desde el SOC antes de que escale.`,
          "Seguridad",
          worldState.clock.tick,
        );
      }
    }

    // Red team autónomo: cada tanto, el adversario NPC avanza su kill-chain
    // contra objetivo.corp.nande con operaciones REALES (escaneo, fuerza
    // bruta, acceso, impacto). El SOC y MITRE lo detectan solos. Cuando
    // completa la cadena, el mundo se entera y vos podés expulsarlo.
    if (worldState.clock.tick % 45 === 0) {
      const step = this.redteam.act(worldState.clock.tick);
      if (step && step.phase === "impact") {
        this.news.headline(
          `Ataque en curso: ${this.redteam.rival()} golpea corp.nande`,
          `Un adversario completó su cadena contra ${REDTEAM_TARGET}. ` +
            `Revisá el SOC y expulsalo (comando 'redteam expulsar').`,
          "Seguridad",
          worldState.clock.tick,
        );
        this.events.emit("world.news.created", { signal: `redteam:${this.redteam.rival()}` });
      }
    }

    // El mundo sigue vivo: cada tanto, un habitante en línea programa y
    // publica una herramienta funcional nueva (compilada y testeada de
    // verdad). Con tope, para no crecer sin límite ni pesar.
    if (
      worldState.clock.tick % 200 === 0 &&
      this.toolRuntime.list().filter((t) => t.origin === "npc").length < 24
    ) {
      const online = this.worldEngine.getOnlinePeople();
      if (online.length > 0) {
        const who = online[worldState.clock.tick % online.length];
        const r = this.npcForge.forge(who, worldState.clock.tick);
        if (r.ok) {
          this.news.headline(
            `${who.name} publicó una herramienta: ${r.name}`,
            `Un vecino compartió una herramienta funcional en la comunidad. ` +
              `Podés verla e instalarla desde tu terminal (tool-list).`,
            "Tecnología",
            worldState.clock.tick,
          );
          this.events.emit("world.news.created", { signal: `tool:${r.name}` });
        }
      }
    }

    // Tu empresa: factura cada día y, cada tanto, alguien la ataca. Si
    // activaste el control correcto, la repelés; si no, perdés plata.
    const compDay = Math.floor(worldState.clock.tick / 1440) + 1;
    if (compDay !== this.lastCompanyDay) {
      this.lastCompanyDay = compDay;
      if (this.company.exists()) {
        this.company.earnDay();
        if (compDay % 3 === 0) {
          const r = this.company.receiveAttack(compDay);
          if (r) this.events.emit("company.attack", r);
        }
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
    // Registro de competencia: toda bandera ND{...} capturada queda en el
    // historial del jugador (trofeos y certificaciones).
    if (signal.startsWith("ND{")) this.player.recordFlag(signal);
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

      // La Mani aprende: si el jugador capturó algo, cuenta para su
      // maestría del tema (y quizá la Mani se gradúe de él).
      const topic = mentorTopicForSignal(signal);
      if (topic) {
        const g = this.mentor.noteSolved(topic);
        if (g.graduated) {
          notes.push(`🥜 La Mani: "${topic.toUpperCase()} ya lo dominás. Te suelto en esto — seguís solo."`);
        }
      }

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
      mentor: this.mentor.getState(),
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

  /**
   * Vista coherente del WorldState: el estado vivo de TODOS los runtimes en un
   * solo lugar (Phase 1). No duplica datos — los lee de cada runtime, que
   * sigue siendo la única fuente de verdad de lo suyo. Sirve para paneles,
   * debugging y para el test "sin UI": si esto sabe lo que pasa, el mundo vive
   * en el runtime y no en la pantalla.
   */
  worldState() {
    const clock = this.world.getState().clock;
    return {
      clock,
      hosts: this.hosts.all().map((h) => ({
        hostname: h.hostname,
        ip: h.ip,
        up: h.up,
        internal: !this.hosts.isPublic(h.hostname),
        services: h.services.map((s) => ({ name: s.name, port: s.port, state: s.state })),
        firewall: [...h.firewall],
        processes: h.processes.length,
      })),
      tools: this.toolRuntime.list().map((t) => ({
        name: t.manifest.name,
        origin: t.origin,
        capabilities: t.manifest.capabilities,
      })),
      alerts: this.soc.countBySeverity(),
      alertTop: this.soc.topSeverity(),
      databases: this.databases.list().map((d) => d.name),
      ai: this.ai.mode(),
      people: this.worldEngine.getPeopleCount(),
      online: this.worldEngine.getOnlineCount(),
      snapshots: this.snapshots.list().map((s) => s.name),
      runtimeEvents: this.hosts.timeline(20),
    };
  }
}

/** Deduce la capacidad de un servicio a partir de su nombre/puerto. */
function kindOfService(
  name: string,
  port: number,
): import("./net/HostRuntime").ServiceKind {
  const n = name.toLowerCase();
  if (n.includes("http") || port === 80 || port === 8080) return "http";
  if (n.includes("https") || port === 443) return "https";
  if (n.includes("ssh") || port === 22) return "ssh";
  if (n.includes("sql") || n.includes("mysql") || n.includes("postgres") || port === 3306 || port === 5432) return "db";
  if (n.includes("dns") || port === 53) return "dns";
  return "other";
}

/** Mapea una señal capturada al tema de aprendizaje de la Mani. */
function mentorTopicForSignal(signal: string): import("./mentor/Mentor").Topic | null {
  const f = signal.toLowerCase();
  if (f.includes("acceso:") || f.includes("login_bypass")) return "sqli";
  if (f.startsWith("m8arete") || f.includes("union")) return "union";
  if (f.startsWith("crack:")) return "crack";
  if (f.includes("jwt")) return "jwt";
  if (f.includes("idor")) return "idor";
  if (f.includes("cmd_injection")) return "cmdi";
  if (f.includes("path_traversal")) return "traversal";
  if (f.includes("xss")) return "xss";
  return null;
}
