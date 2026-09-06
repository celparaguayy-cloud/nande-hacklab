import type { WorldEntity, WorldEntityType } from "../world/WorldRegistry";

/** Noticias que se conservan en portada e historico. */
const MAX_ARTICLES = 60;

export interface NewsArticle {
  id: string;
  headline: string;
  body: string;
  /** Seccion del diario virtual. */
  category: string;
  tick: number;
  /** Habitante del que trata la noticia, si aplica. */
  subjectId?: string;
  /** Entidad que origino la noticia, si aplica. */
  entityId?: string;
  /** Dominio del sitio relacionado, para enlazar desde el articulo. */
  relatedHostname?: string;
}

/** Como se cubre cada tipo de entidad en el diario. */
const COVERAGE: Partial<
  Record<
    WorldEntityType,
    { category: string; verb: string; noun: string }
  >
> = {
  company: { category: "Economía", verb: "funda", noun: "una nueva empresa" },
  app: { category: "Tecnología", verb: "publica", noun: "una aplicación" },
  tool: { category: "Tecnología", verb: "publica", noun: "una herramienta" },
  lab: { category: "Seguridad", verb: "abre", noun: "un laboratorio" },
  course: { category: "Educación", verb: "estrena", noun: "un curso" },
  project: { category: "Proyectos", verb: "presenta", noun: "un proyecto" },
  website: { category: "Medios", verb: "lanza", noun: "un sitio" },
  game: { category: "Cultura", verb: "estrena", noun: "un juego" },
  community: { category: "Comunidad", verb: "abre", noun: "una comunidad" },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Redaccion del diario virtual.
 *
 * Convierte hechos del mundo en noticias: cuando un habitante funda una
 * empresa o publica una herramienta, aparece una nota en news.nande. Todo
 * el contenido es ficticio y se arma con datos del propio mundo, sin
 * ninguna fuente externa.
 */
/** Milisegundos minimos entre dos escrituras del diario. */
const SAVE_INTERVAL_MS = 1000;

const STORAGE_KEY = "nande-news";

export class NewsEngine {
  private articles: NewsArticle[];
  private counter: number;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSave = 0;

  constructor() {
    const saved = this.load();

    this.articles = saved?.articles ?? [];
    this.counter = saved?.counter ?? 1;
  }

  private load(): { articles: NewsArticle[]; counter: number } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      const saved = JSON.parse(raw) as {
        articles: NewsArticle[];
        counter: number;
      };

      if (
        !saved ||
        !Array.isArray(saved.articles) ||
        typeof saved.counter !== "number"
      ) {
        return null;
      }

      return saved;
    } catch {
      return null;
    }
  }

  private write(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          articles: this.articles,
          counter: this.counter,
        }),
      );
    } catch {
      // El diario sigue funcionando aunque no se pueda guardar.
    }
  }

  // El archivo es chico (60 notas), pero se agrupan las escrituras
  // igual que en el resto del mundo.
  private save(): void {
    if (this.saveTimer !== null) {
      return;
    }

    const elapsed = Date.now() - this.lastSave;
    const delay = Math.max(0, SAVE_INTERVAL_MS - elapsed);

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.lastSave = Date.now();
      this.write();
    }, delay);
  }

  /** Fuerza el guardado pendiente. */
  flush(): void {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.lastSave = Date.now();
    this.write();
  }

  /** Cubre la aparicion de una entidad. Devuelve la nota, si hubo. */
  coverEntity(
    entity: WorldEntity,
    authorName: string,
    hostname?: string,
  ): NewsArticle | undefined {
    const coverage = COVERAGE[entity.type];

    // No todo merece nota: solo los tipos con cobertura definida.
    if (!coverage) {
      return undefined;
    }

    const article: NewsArticle = {
      id: `news-${this.counter++}`,
      headline: `${authorName} ${coverage.verb} ${coverage.noun}: ${entity.name}`,
      body: entity.description,
      category: coverage.category,
      tick: entity.createdTick,
      subjectId: entity.ownerId,
      entityId: entity.id,
      relatedHostname: hostname,
    };

    this.articles.push(article);

    if (this.articles.length > MAX_ARTICLES) {
      this.articles.splice(0, this.articles.length - MAX_ARTICLES);
    }

    this.save();

    return article;
  }

  /**
   * Publica un titular arbitrario (no ligado a una entidad).
   * Lo usa el motor de consecuencias: un hack del jugador que sale en el
   * diario del mundo.
   */
  headline(
    headline: string,
    body: string,
    category: string,
    tick: number,
    relatedHostname?: string,
  ): NewsArticle {
    const article: NewsArticle = {
      id: `news-${this.counter++}`,
      headline,
      body,
      category,
      tick,
      relatedHostname,
    };

    this.articles.push(article);

    if (this.articles.length > MAX_ARTICLES) {
      this.articles.splice(0, this.articles.length - MAX_ARTICLES);
    }

    this.save();

    return article;
  }

  /** Notas mas recientes primero. */
  latest(limit: number = 10): NewsArticle[] {
    const start = Math.max(0, this.articles.length - limit);
    const recent: NewsArticle[] = [];

    for (let index = this.articles.length - 1; index >= start; index--) {
      recent.push(structuredClone(this.articles[index]));
    }

    return recent;
  }

  get(id: string): NewsArticle | undefined {
    const article = this.articles.find((item) => item.id === id);

    return article ? structuredClone(article) : undefined;
  }

  byCategory(category: string): NewsArticle[] {
    return this.articles
      .filter((article) => article.category === category)
      .map((article) => structuredClone(article))
      .reverse();
  }

  categories(): string[] {
    return [...new Set(this.articles.map((a) => a.category))].sort();
  }

  count(): number {
    return this.articles.length;
  }

  /** Portada de news.nande, armada con lo ultimo del mundo. */
  renderFront(): string {
    if (this.articles.length === 0) {
      return `
        <h1>📰 ÑANDE News</h1>
        <p>Todavía no hay noticias. El mundo acaba de empezar.</p>
      `;
    }

    const items = this.latest(10)
      .map(
        (article) => `
          <article>
            <h2>${escapeHtml(article.headline)}</h2>
            <p>${escapeHtml(article.body)}</p>
            <p>
              ${escapeHtml(article.category)} · tick ${article.tick}
              ${
                article.relatedHostname
                  ? ` · <a href="https://${escapeHtml(article.relatedHostname)}">visitar sitio</a>`
                  : ""
              }
              · <a href="/article/${article.id}">leer nota</a>
            </p>
          </article>
        `,
      )
      .join("");

    return `
      <h1>📰 ÑANDE News</h1>
      <p>Lo que pasa en el mundo virtual de ÑANDE.</p>
      ${items}
    `;
  }

  /** Pagina de una nota concreta. */
  renderArticle(id: string): string | undefined {
    const article = this.get(id);

    if (!article) {
      return undefined;
    }

    return `
      <h1>${escapeHtml(article.headline)}</h1>
      <p>${escapeHtml(article.category)} · tick ${article.tick}</p>

      <article>
        <p>${escapeHtml(article.body)}</p>
      </article>

      ${
        article.relatedHostname
          ? `<p><a href="https://${escapeHtml(article.relatedHostname)}">Visitar el sitio</a></p>`
          : ""
      }

      <p><a href="/">← Volver a la portada</a></p>
    `;
  }
}
