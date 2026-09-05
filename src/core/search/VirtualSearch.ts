export interface SearchResult {
  hostname: string;
  title: string;
  description: string;
  keywords: string[];
  /** Presente cuando el resultado viene de una entidad del mundo. */
  entityId?: string;
  entityType?: string;
}

/** Tope del indice: evita que crezca sin limite con el mundo. */
const MAX_INDEXED = 2000;

export class VirtualSearch {
  private index_: SearchResult[];

  constructor() {
    this.index_ = [
      {
        hostname: "www.nande",
        title: "ÑANDE — Inicio",
        description:
          "Portal principal de la red virtual de ÑANDE HACKLAB.",
        keywords: ["nande", "inicio", "portal", "hacklab"],
      },
      {
        hostname: "academy.nande",
        title: "ÑANDE Academy",
        description:
          "Cursos y laboratorios educativos de ciberseguridad.",
        keywords: [
          "academy",
          "cursos",
          "seguridad",
          "ciberseguridad",
          "educacion",
        ],
      },
      {
        hostname: "ctf.nande",
        title: "ÑANDE CTF",
        description:
          "Retos y desafíos de seguridad dentro del laboratorio virtual.",
        keywords: ["ctf", "retos", "desafios", "seguridad"],
      },
      {
        hostname: "news.nande",
        title: "ÑANDE News",
        description:
          "Noticias ficticias sobre el mundo virtual de ÑANDE.",
        keywords: ["news", "noticias", "novedades"],
      },
      {
        hostname: "git.nande",
        title: "ÑANDE Git",
        description:
          "Servicio virtual de repositorios y proyectos.",
        keywords: ["git", "github", "repositorios", "codigo"],
      },
      {
        hostname: "shop.nande",
        title: "ÑANDE Shop",
        description:
          "Tienda ficticia dentro de la red virtual.",
        keywords: ["shop", "tienda", "productos", "compras"],
      },
    ];
  }

  /**
   * Alta o reemplazo de una entrada. Es la puerta por la que el mundo
   * hace buscable lo que crean sus habitantes.
   */
  index(entry: SearchResult): void {
    const existing = this.index_.findIndex(
      (item) => item.hostname === entry.hostname,
    );

    if (existing >= 0) {
      this.index_[existing] = structuredClone(entry);
      return;
    }

    this.index_.push(structuredClone(entry));

    if (this.index_.length > MAX_INDEXED) {
      this.index_.splice(0, this.index_.length - MAX_INDEXED);
    }
  }

  removeByHostname(hostname: string): boolean {
    const position = this.index_.findIndex(
      (item) => item.hostname === hostname,
    );

    if (position < 0) {
      return false;
    }

    this.index_.splice(position, 1);

    return true;
  }

  count(): number {
    return this.index_.length;
  }

  /**
   * Respuestas rápidas: ciertas palabras llevan directo al sitio útil
   * (buscar "compras" o "ferretería" apunta a la tienda, "github" al Git
   * virtual, etc.), como un buscador de verdad.
   */
  private smartResults(query: string): SearchResult[] {
    const q = query.toLowerCase();
    const out: SearchResult[] = [];
    const add = (
      hostname: string,
      title: string,
      description: string,
    ) => out.push({ hostname, title, description, keywords: [] });

    if (/(compra|comprar|tienda|shop|producto|precio)/.test(q)) {
      add("shop.nande", "🛒 ÑANDE Store", "Buscá y comprá productos con N$.");
    }
    if (/(ferreter|herramienta|taladro|martillo|taller)/.test(q)) {
      add("shop.nande/category/ferreteria", "🔧 Ferretería", "Herramientas del taller.");
    }
    if (/(electr[oó]nica|laptop|monitor|router|computadora)/.test(q)) {
      add("shop.nande/category/electronica", "💻 Electrónica", "Equipos y dispositivos.");
    }
    if (/(github|git|repositori|repo|c[oó]digo)/.test(q)) {
      add("git.nande", "💻 ÑANDE Git", "Repositorios y herramientas del mundo.");
    }
    if (/(curso|aprender|academia|estudiar|hacking)/.test(q)) {
      add("academy.nande", "🎓 ÑANDE Academy", "Aprendé ciberseguridad de cero a experto.");
    }
    if (/(noticia|news|diario|actualidad)/.test(q)) {
      add("news.nande", "📰 ÑANDE News", "Lo último del mundo virtual.");
    }
    if (/(herramienta.*seguridad|nmap|tool|toolbox)/.test(q)) {
      add("tools.nande", "🧰 ÑANDE Toolbox", "Biblioteca de herramientas de seguridad.");
    }
    if (/(comunidad|social)/.test(q)) {
      add("community.nande", "👥 Comunidades", "Comunidades de habitantes.");
    }
    if (/(grupo|hacker|red team|blue team|ctf|colectivo|activista)/.test(q)) {
      add("groups.nande", "🕶️ Grupos hacker", "Colectivos de hackers éticos.");
    }

    return out;
  }

  search(query: string): SearchResult[] {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return [];
    }

    const terms = normalized.split(/\s+/);

    const indexed = this.index_
      .map((result) => {
        const searchable = [
          result.hostname,
          result.title,
          result.description,
          ...result.keywords,
        ]
          .join(" ")
          .toLowerCase();

        const score = terms.reduce(
          (total, term) =>
            total + (searchable.includes(term) ? 1 : 0),
          0,
        );

        return {
          result,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => structuredClone(item.result));

    // Las respuestas rápidas van primero, sin duplicar dominios.
    const smart = this.smartResults(normalized);
    const seen = new Set(smart.map((s) => s.hostname));

    return [...smart, ...indexed.filter((r) => !seen.has(r.hostname))];
  }

  all(): SearchResult[] {
    return this.index_.map((result) =>
      structuredClone(result),
    );
  }
}
