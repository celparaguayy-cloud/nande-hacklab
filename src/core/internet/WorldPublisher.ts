import type { WorldEntity } from "../world/WorldRegistry";
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

  constructor(
    dns: VirtualDNS,
    internet: VirtualInternet,
    search: VirtualSearch,
  ) {
    this.dns = dns;
    this.internet = internet;
    this.search = search;
    this.published = [];
    this.nextHost = 0;
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

  private buildPage(entity: WorldEntity, hostname: string): string {
    const owner = entity.metadata.ownerName ?? entity.ownerId;

    const tags = entity.tags.length
      ? `<ul>${entity.tags
          .map((tag) => `<li>${escapeHtml(tag)}</li>`)
          .join("")}</ul>`
      : "";

    return `
      <h1>${escapeHtml(entity.name)}</h1>
      <p>${escapeHtml(entity.description)}</p>

      <article>
        <h2>Ficha</h2>
        <p>Tipo: ${escapeHtml(entity.type)}</p>
        <p>Creado por: ${escapeHtml(owner)}</p>
        <p>Publicado en el tick ${entity.createdTick}</p>
        <p>Dominio: ${escapeHtml(hostname)}</p>
      </article>

      ${tags}

      <p><a href="https://www.nande">← Volver al portal de ÑANDE</a></p>
    `;
  }

  /** Retira el sitio mas antiguo cuando se pasa del tope. */
  private prune(): void {
    while (this.published.length > MAX_PUBLISHED_SITES) {
      const oldest = this.published.shift();

      if (oldest) {
        this.dns.remove(oldest);
        this.internet.removeSite(oldest);
        this.search.removeByHostname(oldest);
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

    this.internet.registerSite({
      hostname,
      title: entity.name,
      description: entity.description,
      resources: [
        {
          path: "/",
          mimeType: "text/html",
          content: this.buildPage(entity, hostname),
        },
      ],
    });

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
