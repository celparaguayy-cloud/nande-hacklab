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

/**
 * Sitio que arma sus paginas en el momento.
 *
 * Los sitios estaticos guardan recursos fijos; uno dinamico resuelve cada
 * ruta al pedirla, asi que su contenido refleja el estado actual del
 * mundo. Es lo que permite que news.nande muestre lo ultimo que paso.
 */
export interface DynamicSite {
  hostname: string;
  title: string;
  description: string;
  resolve: (path: string) => VirtualResource | undefined;
}

export class VirtualInternet {
  private sites: Map<string, VirtualSite>;
  private dynamic: Map<string, DynamicSite>;

  constructor() {
    this.sites = new Map();
    this.dynamic = new Map();

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

  /** Alta de un sitio que genera sus paginas al momento de pedirlas. */
  registerDynamicSite(site: DynamicSite): void {
    const hostname = site.hostname.toLowerCase();

    // Un sitio dinamico reemplaza al estatico del mismo dominio.
    this.sites.delete(hostname);
    this.dynamic.set(hostname, site);
  }

  getSite(hostname: string): VirtualSite | undefined {
    const key = hostname.toLowerCase();
    const site = this.sites.get(key);

    if (site) {
      return structuredClone(site);
    }

    const live = this.dynamic.get(key);

    if (!live) {
      return undefined;
    }

    // Sus paginas se resuelven una por una, no se listan de antemano.
    return {
      hostname: live.hostname,
      title: live.title,
      description: live.description,
      resources: [],
    };
  }

  getResource(
    hostname: string,
    path: string = "/"
  ): VirtualResource | undefined {
    const key = hostname.toLowerCase();
    const live = this.dynamic.get(key);

    if (live) {
      return live.resolve(path);
    }

    const site = this.sites.get(key);

    if (!site) {
      return undefined;
    }

    const resource = site.resources.find(
      (item) => item.path === path
    );

    return resource ? structuredClone(resource) : undefined;
  }

  /** Retira un sitio de la Internet virtual. */
  removeSite(hostname: string): boolean {
    const key = hostname.toLowerCase();

    return this.sites.delete(key) || this.dynamic.delete(key);
  }

  countSites(): number {
    return this.sites.size + this.dynamic.size;
  }

  hasSite(hostname: string): boolean {
    const key = hostname.toLowerCase();

    return this.sites.has(key) || this.dynamic.has(key);
  }

  listSites(): VirtualSite[] {
    const estaticos = Array.from(this.sites.values()).map((site) =>
      structuredClone(site)
    );

    const dinamicos = Array.from(this.dynamic.values()).map((site) => ({
      hostname: site.hostname,
      title: site.title,
      description: site.description,
      resources: [],
    }));

    return [...estaticos, ...dinamicos];
  }
}
