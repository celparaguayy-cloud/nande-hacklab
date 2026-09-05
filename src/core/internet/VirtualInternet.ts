export interface VirtualResource {
  path: string;
  content: string;
  mimeType: string;
}

export interface VirtualSite {
  hostname: string;
  title: string;
  description: string;
  resources: VirtualResource[];
}

export class VirtualInternet {
  private sites: Map<string, VirtualSite>;

  constructor() {
    this.sites = new Map();

    this.registerSite({
      hostname: "www.nande",
      title: "ÑANDE",
      description: "Portal principal de la Internet virtual.",
      resources: [
        {
          path: "/",
          mimeType: "text/html",
          content: `
            <h1>ÑANDE</h1>
            <p>Bienvenido a la Internet virtual de ÑANDE HACKLAB.</p>
          `,
        },
      ],
    });

    this.registerSite({
      hostname: "video.nande",
      title: "ÑANDE Video",
      description: "Plataforma virtual de videos.",
      resources: [
        {
          path: "/",
          mimeType: "text/html",
          content: `
            <div class="video-home">
              <h1>▶ ÑANDE Video</h1>
              <p>Videos de la comunidad virtual.</p>

              <article>
                <h2>Introducción a ÑANDE Hacklab</h2>
                <p>Conocé el laboratorio virtual.</p>
                <a href="/watch/introduccion">Ver video</a>
              </article>

              <article>
                <h2>Fundamentos de redes</h2>
                <p>DNS, IP, HTTP y redes virtuales.</p>
                <a href="/watch/redes">Ver video</a>
              </article>

              <article>
                <h2>Seguridad informática</h2>
                <p>Conceptos fundamentales para el laboratorio.</p>
                <a href="/watch/seguridad">Ver video</a>
              </article>
            </div>
          `,
        },
        {
          path: "/watch/introduccion",
          mimeType: "text/html",
          content: `
            <h1>Introducción a ÑANDE Hacklab</h1>
            <p>Video educativo ficticio dentro del sandbox.</p>
            <p>▶ REPRODUCTOR VIRTUAL</p>
            <a href="/">← Volver a videos</a>
          `,
        },
        {
          path: "/watch/redes",
          mimeType: "text/html",
          content: `
            <h1>Fundamentos de redes</h1>
            <p>Video educativo ficticio sobre redes virtuales.</p>
            <p>▶ REPRODUCTOR VIRTUAL</p>
            <a href="/">← Volver a videos</a>
          `,
        },
        {
          path: "/watch/seguridad",
          mimeType: "text/html",
          content: `
            <h1>Seguridad informática</h1>
            <p>Contenido educativo ficticio.</p>
            <p>▶ REPRODUCTOR VIRTUAL</p>
            <a href="/">← Volver a videos</a>
          `,
        },
      ],
    });

    this.registerSite({
      hostname: "academy.nande",
      title: "ÑANDE Academy",
      description: "Academia virtual de ciberseguridad.",
      resources: [
        {
          path: "/",
          mimeType: "text/html",
          content: `
            <h1>🎓 ÑANDE Academy</h1>
            <p>Aprendé seguridad informática dentro de un entorno controlado.</p>
            <h2>Rutas de aprendizaje</h2>
            <ul>
              <li>Fundamentos de Linux</li>
              <li>Redes y DNS</li>
              <li>Seguridad web</li>
              <li>Blue Team</li>
              <li>CTF</li>
            </ul>
          `,
        },
      ],
    });

    this.registerSite({
      hostname: "news.nande",
      title: "ÑANDE News",
      description: "Noticias ficticias de la red virtual.",
      resources: [
        {
          path: "/",
          mimeType: "text/html",
          content: `
            <h1>📰 ÑANDE News</h1>
            <article>
              <h2>Nuevo laboratorio disponible</h2>
              <p>ÑANDE incorpora nuevos escenarios educativos.</p>
            </article>
            <article>
              <h2>Actualización de la red virtual</h2>
              <p>Se agregaron nuevos servicios al laboratorio.</p>
            </article>
          `,
        },
      ],
    });

    this.registerSite({
      hostname: "git.nande",
      title: "ÑANDE Git",
      description: "Plataforma virtual de repositorios.",
      resources: [
        {
          path: "/",
          mimeType: "text/html",
          content: `
            <h1>💻 ÑANDE Git</h1>
            <p>Repositorios de código dentro del laboratorio.</p>
            <h2>Repositorios destacados</h2>
            <ul>
              <li>nande-os</li>
              <li>security-labs</li>
              <li>ctf-challenges</li>
            </ul>
          `,
        },
      ],
    });

    this.registerSite({
      hostname: "ctf.nande",
      title: "ÑANDE CTF",
      description: "Plataforma de desafíos educativos.",
      resources: [
        {
          path: "/",
          mimeType: "text/html",
          content: `
            <h1>🏴 ÑANDE CTF</h1>
            <p>Desafíos completamente aislados del Internet real.</p>
            <h2>Desafíos</h2>
            <ul>
              <li>Web Basics</li>
              <li>Linux Basics</li>
              <li>Network Basics</li>
              <li>Forensics</li>
            </ul>
          `,
        },
      ],
    });

    this.registerSite({
      hostname: "shop.nande",
      title: "ÑANDE Shop",
      description: "Tienda ficticia de la Internet virtual.",
      resources: [
        {
          path: "/",
          mimeType: "text/html",
          content: `
            <h1>🛍️ ÑANDE Shop</h1>
            <p>Tienda completamente ficticia para prácticas.</p>
            <ul>
              <li>ÑANDE Laptop — 4.500 créditos</li>
              <li>Virtual Router — 1.200 créditos</li>
              <li>Cyber Kit — 800 créditos</li>
            </ul>
          `,
        },
      ],
    });
  }

  registerSite(site: VirtualSite): void {
    this.sites.set(
      site.hostname.toLowerCase(),
      structuredClone(site)
    );
  }

  getSite(hostname: string): VirtualSite | undefined {
    const site = this.sites.get(hostname.toLowerCase());

    return site ? structuredClone(site) : undefined;
  }

  getResource(
    hostname: string,
    path: string = "/"
  ): VirtualResource | undefined {
    const site = this.sites.get(hostname.toLowerCase());

    if (!site) {
      return undefined;
    }

    const resource = site.resources.find(
      (item) => item.path === path
    );

    return resource ? structuredClone(resource) : undefined;
  }

  hasSite(hostname: string): boolean {
    return this.sites.has(hostname.toLowerCase());
  }

  listSites(): VirtualSite[] {
    return Array.from(this.sites.values()).map((site) =>
      structuredClone(site)
    );
  }
}
