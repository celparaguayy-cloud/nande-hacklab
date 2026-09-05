import type { WorldRegistry, WorldEntity } from "../world/WorldRegistry";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Tipos de entidad que se ofrecen en la store. */
const STORE_TYPES = new Set(["tool", "app", "game", "project"]);

/** Precio virtual sugerido según el tipo. */
const BASE_PRICE: Record<string, number> = {
  tool: 120,
  app: 90,
  game: 60,
  project: 40,
};

/**
 * store.nande — la tienda del mundo.
 *
 * Los habitantes (bots) crean herramientas, apps, juegos y proyectos, y
 * acá aparecen a la venta en moneda virtual. No es un catálogo escrito a
 * mano: se arma leyendo lo que el mundo produjo. Precio ficticio.
 */
export class Store {
  private registry: WorldRegistry;

  constructor(registry: WorldRegistry) {
    this.registry = registry;
  }

  /** Productos disponibles: lo que los habitantes crearon y es vendible. */
  listings(): Array<WorldEntity & { price: number }> {
    return this.registry
      .all()
      .filter((entity) => STORE_TYPES.has(entity.type))
      .map((entity) => ({
        ...entity,
        price: this.priceOf(entity),
      }));
  }

  /** Precio determinista de una entidad, para que no cambie entre vistas. */
  priceOf(entity: WorldEntity): number {
    const base = BASE_PRICE[entity.type] ?? 50;

    // El nombre modula el precio de forma estable.
    let hash = 0;
    for (let i = 0; i < entity.id.length; i++) {
      hash = (hash * 31 + entity.id.charCodeAt(i)) >>> 0;
    }

    return base + (hash % 80);
  }

  get(id: string): (WorldEntity & { price: number }) | undefined {
    const entity = this.registry.get(id);

    if (!entity || !STORE_TYPES.has(entity.type)) {
      return undefined;
    }

    return { ...entity, price: this.priceOf(entity) };
  }

  count(): number {
    return this.listings().length;
  }

  /** Portada de la tienda. */
  renderFront(): string {
    const items = this.listings().slice(-24).reverse();

    if (items.length === 0) {
      return `
        <h1>🛒 ÑANDE Store</h1>
        <p>Todavía no hay productos. Los habitantes están creando...</p>
      `;
    }

    const cards = items
      .map(
        (item) => `
          <article>
            <h2>${escapeHtml(item.name)}</h2>
            <p>${escapeHtml(item.description)}</p>
            <p>
              ${escapeHtml(item.type)} · N$ ${item.price}
              · por ${escapeHtml(item.metadata.ownerName ?? item.ownerId)}
              · <a href="/item/${item.id}">ver</a>
            </p>
          </article>
        `,
      )
      .join("");

    return `
      <h1>🛒 ÑANDE Store</h1>
      <p>Herramientas, apps y juegos hechos por los habitantes del mundo.
      ${this.count()} productos, en moneda virtual N$.</p>
      ${cards}
    `;
  }

  /** Página de un producto. */
  renderItem(id: string): string | undefined {
    const item = this.get(id);

    if (!item) {
      return undefined;
    }

    return `
      <h1>${escapeHtml(item.name)}</h1>
      <p><strong>N$ ${item.price}</strong> · ${escapeHtml(item.type)}</p>

      <article>
        <p>${escapeHtml(item.description)}</p>
        <p>Autor: ${escapeHtml(item.metadata.ownerName ?? item.ownerId)}</p>
        ${
          item.tags.length
            ? `<p>Etiquetas: ${item.tags.map(escapeHtml).join(", ")}</p>`
            : ""
        }
      </article>

      <p>Para comprarlo desde la Terminal: <code>buy ${item.id}</code></p>
      <p><a href="/">← Volver a la tienda</a></p>
    `;
  }
}
