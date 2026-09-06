import type { WorldEntity } from "../world/WorldRegistry";
import { renderLivingSite, type OwnerProfile } from "./LivingSite";
import { GeneratedSite } from "../http/apps/generated";
import type { WebServer } from "../http/WebServer";
import type { VirtualDNS } from "../dns/VirtualDNS";
import type { VirtualInternet } from "./VirtualInternet";
import type { VirtualSearch } from "../search/VirtualSearch";

/** Tope de sitios publicados por habitantes que se mantienen vivos. */
const MAX_PUBLISHED_SITES = 500;

/** Primer octeto libre para los servidores de habitantes (10.10.1.x en adelante). */
const FIRST_HOST_OCTET = 1;

/**
 * Convierte un nombre del mundo en una etiqueta de dominio valida.
 * "App Yvoty" -> "app-yvoty", "Ñande Porã" -> "nande-pora".
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ñ/gi, "n")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


/**
 * Publica en la Internet virtual lo que crean los habitantes.
 *
 * Cierra el circuito del mundo: una entidad creada por un agente pasa a
 * tener dominio propio en el DNS virtual, un sitio navegable y una
 * entrada en el buscador. Nada de esto sale del sandbox: los dominios
 * viven solo en VirtualDNS y las direcciones en la subred simulada.
 */
export class WorldPublisher {
  private dns: VirtualDNS;
  private internet: VirtualInternet;
  private search: VirtualSearch;
  private published: string[];
  private nextHost: number;
  /** Día actual del mundo (para que los sitios crezcan con el tiempo). */
  private currentDay: () => number;
  /** Perfil del dueño, para dar contexto al sitio. */
  private ownerProfile: (ownerId: string, metadata: Record<string, string>) => OwnerProfile;
  /** Servidor web: donde se registran los sitios como apps hackeables. */
  private webServer?: WebServer;

  constructor(
    dns: VirtualDNS,
    internet: VirtualInternet,
    search: VirtualSearch,
    options: {
      currentDay?: () => number;
      ownerProfile?: (ownerId: string, metadata: Record<string, string>) => OwnerProfile;
      webServer?: WebServer;
    } = {},
  ) {
    this.dns = dns;
    this.internet = internet;
    this.search = search;
    this.published = [];
    this.nextHost = 0;
    this.currentDay = options.currentDay ?? (() => 1);
    this.ownerProfile =
      options.ownerProfile ??
      ((ownerId, metadata) => ({
        name: metadata.ownerName ?? ownerId,
        profession: metadata.ownerProfession ?? "vecino",
        interests: [],
      }));
    this.webServer = options.webServer;
  }

  /** Dominio libre derivado del nombre de la entidad. */
  private buildHostname(entity: WorldEntity): string {
    const base = slugify(entity.name) || "sitio";
    const candidate = `${base}.nande`;

    if (!this.dns.has(candidate)) {
      return candidate;
    }

    // Colision: se desempata con el identificador de la entidad.
    const suffix = entity.id.replace(/[^a-z0-9]/gi, "");

    return `${base}-${suffix}.nande`;
  }

  /** Direccion virtual siguiente dentro de 10.10.x.y. */
  private nextAddress(): string {
    const block = FIRST_HOST_OCTET + Math.floor(this.nextHost / 254);
    const host = (this.nextHost % 254) + 1;

    this.nextHost += 1;

    return `10.10.${block}.${host}`;
  }

  /** Retira el sitio mas antiguo cuando se pasa del tope. */
  private prune(): void {
    while (this.published.length > MAX_PUBLISHED_SITES) {
      const oldest = this.published.shift();

      if (oldest) {
        this.dns.remove(oldest);
        this.internet.removeSite(oldest);
        this.search.removeByHostname(oldest);
        this.webServer?.unregister(oldest);
      }
    }
  }

  /**
   * Da de alta la entidad en DNS, Internet y buscador.
   * Devuelve el dominio asignado.
   */
  publish(entity: WorldEntity): string {
    const hostname = this.buildHostname(entity);
    const address = this.nextAddress();

    this.dns.register(hostname, address);

    // Sitio dinámico y multipágina: su contenido se genera al pedirlo,
    // según el día actual del mundo, así que CRECE con el tiempo (más
    // entradas de blog, más commits, versiones nuevas) sin guardar nada.
    this.internet.registerDynamicSite({
      hostname,
      title: entity.name,
      description: entity.description,
      resolve: (path) => {
        const owner = this.ownerProfile(entity.ownerId, entity.metadata);
        const page = renderLivingSite(entity, owner, this.currentDay(), path);
        if (!page) return undefined;
        return { path, mimeType: "text/html", content: page.html };
      },
    });

    // Además de navegable, el sitio es HACKEABLE: se registra como app web
    // con una vulnerabilidad real (buscador inyectable) sobre la cuenta del
    // dueño. El navegador prefiere el WebServer, así que la misma URL sirve
    // el contenido vivo y acepta el ataque.
    if (this.webServer) {
      const owner = this.ownerProfile(entity.ownerId, entity.metadata);
      this.webServer.register(
        new GeneratedSite(hostname, entity, owner, this.currentDay),
      );
    }

    this.search.index({
      hostname,
      title: entity.name,
      description: entity.description,
      keywords: [entity.type, ...entity.tags],
      entityId: entity.id,
      entityType: entity.type,
    });

    this.published.push(hostname);
    this.prune();

    return hostname;
  }

  /** Dominios publicados por habitantes, del mas viejo al mas nuevo. */
  listPublished(): string[] {
    return [...this.published];
  }
}
