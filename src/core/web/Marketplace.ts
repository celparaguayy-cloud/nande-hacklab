import type { WorldRegistry } from "../world/WorldRegistry";

/**
 * Mercado de ÑANDE (shop.nande).
 *
 * Una tienda de verdad: productos por categoría que se pueden buscar,
 * mirar y comprar con moneda virtual. Incluye un catálogo base y lo que
 * crean los habitantes (sus tools, apps, juegos). Todo en N$, sin pagos
 * reales.
 */

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  seller: string;
}

/** Categorías de la tienda (para buscar "ferretería", "electrónica", etc.). */
export const CATEGORIES: Array<{ id: string; name: string; icon: string }> = [
  { id: "electronica", name: "Electrónica", icon: "💻" },
  { id: "ferreteria", name: "Ferretería", icon: "🔧" },
  { id: "software", name: "Software", icon: "💾" },
  { id: "cursos", name: "Cursos", icon: "🎓" },
  { id: "hogar", name: "Hogar", icon: "🏠" },
  { id: "gaming", name: "Gaming", icon: "🎮" },
];

/** Catálogo base de productos ficticios. */
const SEED_PRODUCTS: Product[] = [
  { id: "p-laptop", name: "Laptop ÑANDE Pro", category: "electronica", price: 3200, description: "Portátil virtual de 8 núcleos para desarrollo y labs.", seller: "ÑANDE Store" },
  { id: "p-router", name: "Router Guaraní X2", category: "electronica", price: 850, description: "Router virtual para practicar redes.", seller: "Tapé Networks" },
  { id: "p-monitor", name: "Monitor 27\" Yvoty", category: "electronica", price: 1400, description: "Pantalla virtual para tu escritorio.", seller: "ÑANDE Store" },
  { id: "p-taladro", name: "Taladro Mbarete", category: "ferreteria", price: 320, description: "Taladro virtual, ideal para el taller.", seller: "Ferretería Kuarahy" },
  { id: "p-martillo", name: "Martillo Arandu", category: "ferreteria", price: 60, description: "Martillo resistente de laboratorio.", seller: "Ferretería Kuarahy" },
  { id: "p-caja", name: "Caja de herramientas", category: "ferreteria", price: 180, description: "Set completo de herramientas virtuales.", seller: "Ferretería Kuarahy" },
  { id: "p-antivirus", name: "ÑANDE Antivirus", category: "software", price: 220, description: "Suite de seguridad educativa.", seller: "Pytã Security" },
  { id: "p-ide", name: "ÑandeCode IDE", category: "software", price: 0, description: "Editor de código gratuito.", seller: "Arandu Software" },
  { id: "p-curso-linux", name: "Curso de Linux", category: "cursos", price: 150, description: "De cero a la terminal, con laboratorios.", seller: "ÑANDE Academy" },
  { id: "p-curso-pentest", name: "Curso de Pentesting", category: "cursos", price: 400, description: "Reconocimiento, explotación y reporte, en labs.", seller: "ÑANDE Academy" },
  { id: "p-silla", name: "Silla gamer", category: "gaming", price: 900, description: "Silla virtual para largas sesiones.", seller: "Gamers ÑANDE" },
  { id: "p-teclado", name: "Teclado mecánico", category: "gaming", price: 340, description: "Teclado virtual con luces.", seller: "Gamers ÑANDE" },
  { id: "p-lampara", name: "Lámpara LED", category: "hogar", price: 90, description: "Ilumina tu escritorio virtual.", seller: "ÑANDE Store" },
  { id: "p-cafetera", name: "Cafetera Pyahu", category: "hogar", price: 260, description: "Para las noches de código.", seller: "ÑANDE Store" },
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Mapea el tipo de creación de un habitante a una categoría de tienda. */
const TYPE_CATEGORY: Record<string, string> = {
  tool: "software",
  app: "software",
  game: "gaming",
};

export class Marketplace {
  private registry: WorldRegistry;
  /** Compras hechas por el jugador (ids). */
  private purchases: Set<string>;

  constructor(registry: WorldRegistry) {
    this.registry = registry;
    this.purchases = this.loadPurchases();
  }

  private loadPurchases(): Set<string> {
    try {
      const raw = localStorage.getItem("nande-purchases");
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  }

  private savePurchases(): void {
    try {
      localStorage.setItem(
        "nande-purchases",
        JSON.stringify(Array.from(this.purchases)),
      );
    } catch {
      // Las compras viven en memoria si no se puede guardar.
    }
  }

  /** Productos base más las creaciones vendibles de los habitantes. */
  products(): Product[] {
    const fromWorld: Product[] = this.registry
      .all()
      .filter((e) => TYPE_CATEGORY[e.type])
      .map((e) => ({
        id: e.id,
        name: e.name,
        category: TYPE_CATEGORY[e.type],
        price: 40 + (e.id.length * 7) % 200,
        description: e.description,
        seller: e.metadata.ownerName ?? e.ownerId,
      }));

    return [...SEED_PRODUCTS, ...fromWorld];
  }

  get(id: string): Product | undefined {
    return this.products().find((p) => p.id === id);
  }

  byCategory(categoryId: string): Product[] {
    return this.products().filter((p) => p.category === categoryId);
  }

  /** Búsqueda por texto en nombre, descripción, categoría y vendedor. */
  search(query: string): Product[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    // Si el término es una categoría, se devuelve toda la categoría.
    const cat = CATEGORIES.find(
      (c) => c.name.toLowerCase() === q || c.id === q,
    );
    if (cat) return this.byCategory(cat.id);

    return this.products().filter((p) =>
      [p.name, p.description, p.category, p.seller]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  hasBought(id: string): boolean {
    return this.purchases.has(id);
  }

  /** Compra un producto; cobra al jugador con `spend`. */
  buy(id: string, spend: (amount: number) => boolean): { ok: boolean; message: string } {
    const product = this.get(id);
    if (!product) return { ok: false, message: "Producto no encontrado." };

    if (this.purchases.has(id)) {
      return { ok: false, message: "Ya lo compraste." };
    }

    if (product.price > 0 && !spend(product.price)) {
      return { ok: false, message: `No te alcanza: cuesta N$${product.price}.` };
    }

    this.purchases.add(id);
    this.savePurchases();

    return {
      ok: true,
      message: `¡Comprado! "${product.name}" por N$${product.price}.`,
    };
  }

  count(): number {
    return this.products().length;
  }

  // ---------- Renderizado del sitio shop.nande ----------

  renderFront(): string {
    const cats = CATEGORIES.map(
      (c) => `
        <article>
          <h2>${c.icon} ${escapeHtml(c.name)}</h2>
          <p>${this.byCategory(c.id).length} productos ·
             <a href="/category/${c.id}">ver categoría</a></p>
        </article>
      `,
    ).join("");

    return `
      <h1>🛒 ÑANDE Store</h1>
      <p>La tienda del mundo. Buscá y comprá con tu moneda N$.
      ${this.count()} productos en total.</p>
      <h2>Categorías</h2>
      ${cats}
    `;
  }

  renderCategory(categoryId: string): string | undefined {
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    if (!cat) return undefined;

    const items = this.byCategory(categoryId)
      .map(
        (p) => `
          <article>
            <h2>${escapeHtml(p.name)}</h2>
            <p>${escapeHtml(p.description)}</p>
            <p>N$ ${p.price} · vendedor: ${escapeHtml(p.seller)}
               · <a href="/item/${p.id}">ver</a></p>
          </article>
        `,
      )
      .join("");

    return `
      <h1>${cat.icon} ${escapeHtml(cat.name)}</h1>
      <p><a href="/">← Volver a la tienda</a></p>
      ${items || "<p>Sin productos en esta categoría.</p>"}
    `;
  }

  renderItem(id: string): string | undefined {
    const p = this.get(id);
    if (!p) return undefined;

    const bought = this.hasBought(id);

    return `
      <h1>${escapeHtml(p.name)}</h1>
      <p><strong>N$ ${p.price}</strong> · ${escapeHtml(p.category)}</p>
      <article>
        <p>${escapeHtml(p.description)}</p>
        <p>Vendedor: ${escapeHtml(p.seller)}</p>
      </article>
      ${
        bought
          ? `<p>✅ Ya es tuyo.</p>`
          : `<p><a href="/buy/${p.id}">🛒 Comprar por N$${p.price}</a></p>`
      }
      <p><a href="/">← Volver a la tienda</a></p>
    `;
  }

  /** Página de confirmación tras comprar (o de error). */
  renderBuyResult(id: string, ok: boolean, message: string): string {
    return `
      <h1>${ok ? "✅ Compra realizada" : "⚠ No se pudo comprar"}</h1>
      <p>${escapeHtml(message)}</p>
      <p><a href="/item/${id}">← Volver al producto</a> ·
         <a href="/">Ir a la tienda</a></p>
    `;
  }
}
