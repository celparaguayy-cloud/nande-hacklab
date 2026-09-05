export interface SearchResult {
  hostname: string;
  title: string;
  description: string;
  keywords: string[];
}

export class VirtualSearch {
  private index: SearchResult[];

  constructor() {
    this.index = [
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

  search(query: string): SearchResult[] {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return [];
    }

    const terms = normalized.split(/\s+/);

    return this.index
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
  }

  all(): SearchResult[] {
    return this.index.map((result) =>
      structuredClone(result),
    );
  }
}
