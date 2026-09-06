import type { WorldEntity } from "../world/WorldRegistry";

/**
 * Sitios vivos de los habitantes de ÑANDE.
 *
 * Antes lo que publicaba un bot era un cascarón: entrabas, había tres
 * frases y nada más. Ahora cada sitio es una web de verdad: tiene varias
 * páginas (inicio, blog, productos, commits, equipo…) y —lo importante—
 * CRECE con el tiempo. El contenido se deriva de la antigüedad del sitio
 * en días del mundo, así que cada vez que volvés hay más: más entradas de
 * blog, más commits, una versión más nueva. El bot "trabaja" en su sitio
 * sin que haya que guardar nada por tick: todo es determinista a partir
 * del id de la entidad y del día actual.
 */

export interface OwnerProfile {
  name: string;
  profession: string;
  interests: string[];
}

/* --------------------- utilidades deterministas --------------------- */

function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick<T>(arr: T[], seed: number): T {
  // Índice siempre positivo: el desplazamiento de bits puede dar negativos.
  const i = ((Math.trunc(seed) % arr.length) + arr.length) % arr.length;
  return arr[i];
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Fecha del mundo a partir de un "día". */
function fecha(day: number): string {
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const d = ((day * 7) % 28) + 1;
  const m = day % 12;
  return `${d} ${meses[m]}`;
}

/* --------------------- bancos de contenido --------------------- */

const TECH_TOPICS = [
  "optimización de consultas", "arquitectura de microservicios",
  "seguridad en APIs", "automatización con scripts", "contenedores y despliegue",
  "rendimiento en el front", "manejo de errores", "pruebas automatizadas",
  "refactorización", "cifrado de datos", "colas de mensajes", "cachés distribuidas",
];

const BIZ_TOPICS = [
  "cómo conseguimos nuestros primeros clientes", "lecciones de nuestro primer año",
  "por qué elegimos este mercado", "el equipo detrás del producto",
  "nuestra hoja de ruta", "un caso de éxito", "cómo medimos el impacto",
];

const OPENERS = [
  "Esta semana estuvimos trabajando en",
  "Después de varios días, por fin cerramos",
  "Quiero contarles cómo resolvimos",
  "Un problema recurrente que nos tocó fue",
  "Hoy liberamos una mejora en",
  "Nos preguntaron mucho sobre",
];

const BODIES = [
  "El detalle está en los bordes: lo que parecía simple escondía tres casos raros que tuvimos que contemplar.",
  "Medimos antes y después, y la diferencia fue clara. Los números acompañan la decisión.",
  "No fue directo. Probamos dos caminos, descartamos el primero y el segundo terminó siendo más limpio.",
  "La clave estuvo en simplificar: menos piezas móviles, menos cosas que se rompen.",
  "Documentamos todo el proceso para que el próximo que lo toque no sufra lo mismo que nosotros.",
  "Lo abrimos a la comunidad y el feedback fue enorme; varias ideas entraron directo al producto.",
];

/** Genera un artículo/post determinista para un índice dado. */
function makePost(baseSeed: number, index: number, topics: string[]): {
  title: string;
  body: string;
  day: number;
} {
  const s = seedOf(`${baseSeed}-post-${index}`);
  const r = rng(s);
  const topic = pick(topics, Math.floor(r() * 1000));
  const opener = pick(OPENERS, Math.floor(r() * 1000));
  const p1 = pick(BODIES, Math.floor(r() * 1000));
  const p2 = pick(BODIES, Math.floor(r() * 1000) + 1);

  return {
    title: `${opener} ${topic}`.replace(/^(\w)/, (c) => c.toUpperCase()),
    body: `${p1} ${p2}`,
    day: index + 1,
  };
}

const COMMIT_VERBS = [
  "feat", "fix", "refactor", "docs", "test", "perf", "chore", "style",
];
const COMMIT_MSGS = [
  "agrega validación de entrada", "corrige un borde en el parser",
  "mejora el rendimiento del render", "actualiza dependencias",
  "documenta la API pública", "cubre con pruebas el caso límite",
  "simplifica el manejo de estado", "arregla una fuga de memoria",
  "soporta el nuevo formato", "traduce los mensajes al guaraní",
];

function makeCommit(baseSeed: number, index: number): string {
  const s = seedOf(`${baseSeed}-commit-${index}`);
  const verb = pick(COMMIT_VERBS, s);
  const msg = pick(COMMIT_MSGS, s >>> 3);
  const hash = (s >>> 8).toString(16).padStart(7, "0").slice(0, 7);
  return `${hash}  ${verb}: ${msg}`;
}

const PRODUCTS = [
  "Plan Básico", "Plan Pro", "Plan Empresa", "Complemento Analítica",
  "Soporte Prioritario", "API de Integración", "Panel de Control", "App Móvil",
];

/* --------------------- páginas por tipo --------------------- */

/** Cuántos "items" (posts, commits…) tiene el sitio según su antigüedad. */
function itemsForAge(ageDays: number, perDay: number, min: number): number {
  return Math.max(min, Math.min(60, min + Math.floor(ageDays * perDay)));
}

function shell(title: string, nav: string, body: string): string {
  return `
    <h1>${esc(title)}</h1>
    <nav class="site-nav">${nav}</nav>
    ${body}
    <p class="site-foot"><a href="https://www.nande">← Portal de ÑANDE</a></p>
  `;
}

function navLinks(links: [string, string][], active: string): string {
  return links
    .map(
      ([path, label]) =>
        `<a href="${path}"${path === active ? ' class="active"' : ""}>${label}</a>`,
    )
    .join(" · ");
}

export interface RenderedPage {
  title: string;
  html: string;
}

/**
 * Renderiza una página del sitio de una entidad.
 * Devuelve null si la ruta no existe (404).
 */
export function renderLivingSite(
  entity: WorldEntity,
  owner: OwnerProfile,
  currentDay: number,
  path: string,
): RenderedPage | null {
  // No se acota a 1: los sitios sembrados llegan con createdTick negativo
  // (retrofechados) para arrancar ya establecidos, y necesitan esa
  // antigüedad para tener contenido rico.
  const createdDay = Math.floor(entity.createdTick / 1440) + 1;
  const ageDays = Math.max(0, currentDay - createdDay);
  const baseSeed = seedOf(entity.id);
  const name = entity.name;
  const kind = classify(entity.type);

  const p = path === "" ? "/" : path;

  switch (kind) {
    case "repo":
      return renderRepo(entity, owner, name, baseSeed, ageDays, p);
    case "company":
      return renderCompany(entity, owner, name, baseSeed, ageDays, currentDay, p);
    case "blog":
      return renderBlog(entity, owner, name, baseSeed, ageDays, currentDay, p);
    case "shop":
      return renderShop(entity, owner, name, baseSeed, ageDays, p);
    case "community":
      return renderCommunity(entity, owner, name, baseSeed, ageDays, p);
    case "media":
      return renderMedia(entity, owner, name, baseSeed, ageDays, currentDay, p);
    default:
      return renderGeneric(entity, owner, name, ageDays, p);
  }
}

type Kind = "repo" | "company" | "blog" | "shop" | "community" | "media" | "generic";

function classify(type: string): Kind {
  if (["repository", "tool", "app", "project"].includes(type)) return "repo";
  if (["company", "organization"].includes(type)) return "company";
  if (["website", "channel"].includes(type)) return "blog";
  if (["game", "video"].includes(type)) return "media";
  if (["community", "forum"].includes(type)) return "community";
  return "generic";
}

function renderRepo(
  entity: WorldEntity, owner: OwnerProfile, name: string,
  seed: number, age: number, path: string,
): RenderedPage {
  const nav = navLinks(
    [["/", "README"], ["/commits", "Commits"], ["/issues", "Issues"], ["/releases", "Releases"]],
    path,
  );
  const commits = itemsForAge(age, 1.5, 3);
  const version = `1.${Math.floor(age / 5)}.${age % 5}`;

  if (path === "/commits") {
    const list = Array.from({ length: commits }, (_, i) =>
      `<li><code>${esc(makeCommit(seed, commits - i))}</code></li>`,
    ).join("");
    return { title: `${name} · commits`, html: shell(name, nav, `<p>${commits} commits · rama <code>main</code></p><ul class="commit-list">${list}</ul>`) };
  }
  if (path === "/issues") {
    const open = 1 + (seed % 6);
    const items = Array.from({ length: open }, (_, i) =>
      `<li>#${i + 1} — ${esc(pick(COMMIT_MSGS, seed + i))} <span class="tag">abierto</span></li>`,
    ).join("");
    return { title: `${name} · issues`, html: shell(name, nav, `<p>${open} issues abiertos.</p><ul>${items}</ul>`) };
  }
  if (path === "/releases") {
    const rels = Math.max(1, Math.floor(age / 5) + 1);
    const items = Array.from({ length: rels }, (_, i) =>
      `<li><strong>v1.${rels - 1 - i}.0</strong> — ${esc(pick(COMMIT_MSGS, seed + i))}</li>`,
    ).join("");
    return { title: `${name} · releases`, html: shell(name, nav, `<ul>${items}</ul>`) };
  }

  return {
    title: name,
    html: shell(name, nav, `
      <p>${esc(entity.description)}</p>
      <article>
        <h2>Instalación</h2>
        <p><code>git clone https://${slug(name)}.nande/${slug(name)}.git</code></p>
        <p>Versión actual: <strong>v${version}</strong> · ${commits} commits · autor: ${esc(owner.name)}</p>
      </article>
      <article>
        <h2>Uso</h2>
        <p>Un proyecto de ${esc(owner.profession)} enfocado en ${esc(entity.tags[0] ?? "tecnología")}.
        Mantenido activamente: el último commit es de hace ${Math.max(0, age % 3)} días.</p>
      </article>`),
  };
}

function renderCompany(
  entity: WorldEntity, owner: OwnerProfile, name: string,
  seed: number, age: number, day: number, path: string,
): RenderedPage {
  const nav = navLinks(
    [["/", "Inicio"], ["/productos", "Productos"], ["/blog", "Blog"], ["/equipo", "Equipo"], ["/changelog", "Novedades"]],
    path,
  );
  const team = 2 + Math.floor(age / 3);
  const posts = itemsForAge(age, 0.5, 1);

  if (path === "/productos") {
    const n = 2 + (seed % 4);
    const items = Array.from({ length: n }, (_, i) => {
      const price = 50 + ((seed + i * 97) % 900);
      return `<article><h3>${esc(pick(PRODUCTS, seed + i))}</h3><p>Desde N$ ${price}/mes. ${esc(pick(BODIES, seed + i))}</p></article>`;
    }).join("");
    return { title: `${name} · productos`, html: shell(name, nav, items) };
  }
  if (path === "/blog") return blogIndex(name, nav, seed, posts, BIZ_TOPICS, "/blog");
  if (path.startsWith("/blog/")) return blogPost(name, nav, seed, path, BIZ_TOPICS, "/blog");
  if (path === "/equipo") {
    const roles = ["Fundador/a", "Desarrollo", "Diseño", "Ventas", "Soporte", "Operaciones"];
    const items = Array.from({ length: team }, (_, i) =>
      `<li>${i === 0 ? esc(owner.name) : `Integrante ${i + 1}`} — ${roles[i % roles.length]}</li>`,
    ).join("");
    return { title: `${name} · equipo`, html: shell(name, nav, `<p>Somos ${team} personas.</p><ul>${items}</ul>`) };
  }
  if (path === "/changelog") {
    const v = Math.floor(age / 2) + 1;
    const items = Array.from({ length: Math.min(12, v) }, (_, i) =>
      `<li><strong>v${v - i}.0</strong> · ${fecha(day - i * 2)} — ${esc(pick(BODIES, seed + i))}</li>`,
    ).join("");
    return { title: `${name} · novedades`, html: shell(name, nav, `<ul>${items}</ul>`) };
  }

  return {
    title: name,
    html: shell(name, nav, `
      <p class="lead">${esc(entity.description)}</p>
      <article><h2>Qué hacemos</h2><p>${esc(pick(BODIES, seed))} Fundada por ${esc(owner.name)}, hoy somos ${team} personas.</p></article>
      <article><h2>Números</h2><p>${age * 12 + 40} clientes · ${posts} publicaciones en el blog · ${Math.floor(age / 2) + 1} versiones lanzadas.</p></article>`),
  };
}

function renderBlog(
  entity: WorldEntity, owner: OwnerProfile, name: string,
  seed: number, age: number, day: number, path: string,
): RenderedPage {
  const nav = navLinks([["/", "Inicio"], ["/posts", "Entradas"], ["/sobre", "Sobre"]], path);
  const posts = itemsForAge(age, 0.8, 2);
  void day;

  if (path === "/posts") return blogIndex(name, nav, seed, posts, [...TECH_TOPICS, ...BIZ_TOPICS], "/posts");
  if (path.startsWith("/posts/")) return blogPost(name, nav, seed, path, [...TECH_TOPICS, ...BIZ_TOPICS], "/posts");
  if (path === "/sobre") {
    return { title: `${name} · sobre`, html: shell(name, nav, `<p>Blog de ${esc(owner.name)}, ${esc(owner.profession)}. Escribo sobre ${esc(owner.interests.join(", ") || "tecnología")}. ${posts} entradas y contando.</p>`) };
  }

  const latest = makePost(seed, posts, [...TECH_TOPICS, ...BIZ_TOPICS]);
  return {
    title: name,
    html: shell(name, nav, `
      <p class="lead">${esc(entity.description)}</p>
      <article><span class="post-date">${fecha(day)}</span><h2>${esc(latest.title)}</h2><p>${esc(latest.body)}</p><p><a href="/posts">Ver las ${posts} entradas →</a></p></article>`),
  };
}

function blogIndex(
  name: string, nav: string, seed: number, count: number, topics: string[], base: string,
): RenderedPage {
  const items = Array.from({ length: count }, (_, i) => {
    const post = makePost(seed, count - i, topics);
    return `<article><span class="post-date">día ${count - i}</span><h3><a href="${base}/${count - i}">${esc(post.title)}</a></h3><p>${esc(post.body.slice(0, 120))}…</p></article>`;
  }).join("");
  return { title: `${name} · entradas`, html: shell(name, nav, `<p>${count} entradas.</p>${items}`) };
}

function blogPost(
  name: string, nav: string, seed: number, path: string, topics: string[], base: string,
): RenderedPage {
  const idx = parseInt(path.slice(base.length + 1), 10) || 1;
  const post = makePost(seed, idx, topics);
  return {
    title: `${name} · ${post.title}`,
    html: shell(name, nav, `<article><span class="post-date">entrada #${idx}</span><h2>${esc(post.title)}</h2><p>${esc(post.body)}</p><p>${esc(pick(BODIES, seed + idx))}</p><p><a href="${base}">← Volver</a></p></article>`),
  };
}

function renderShop(
  entity: WorldEntity, owner: OwnerProfile, name: string,
  seed: number, age: number, path: string,
): RenderedPage {
  const nav = navLinks([["/", "Tienda"], ["/ofertas", "Ofertas"]], path);
  const n = 4 + (seed % 6) + Math.floor(age / 4);
  const productos = Array.from({ length: Math.min(20, n) }, (_, i) => {
    const price = 20 + ((seed + i * 137) % 1500);
    return `<article><h3>${esc(pick(PRODUCTS, seed + i))} ${i + 1}</h3><p>N$ ${price} · ${esc(pick(BODIES, seed + i).slice(0, 80))}</p></article>`;
  }).join("");

  if (path === "/ofertas") {
    return { title: `${name} · ofertas`, html: shell(name, nav, `<p>Ofertas de la semana en ${esc(name)}:</p>${productos}`) };
  }
  return {
    title: name,
    html: shell(name, nav, `<p class="lead">${esc(entity.description)} — de ${esc(owner.name)}.</p><p>${Math.min(20, n)} productos en catálogo.</p>${productos}`),
  };
}

function renderCommunity(
  entity: WorldEntity, owner: OwnerProfile, name: string,
  seed: number, age: number, path: string,
): RenderedPage {
  const nav = navLinks([["/", "Inicio"], ["/temas", "Temas"]], path);
  const members = 12 + age * 5 + (seed % 40);
  const threads = itemsForAge(age, 1.2, 3);
  void owner;

  if (path === "/temas") {
    const items = Array.from({ length: threads }, (_, i) =>
      `<li><a href="#">${esc(pick([...TECH_TOPICS, ...BIZ_TOPICS], seed + i))}</a> · ${1 + ((seed + i) % 40)} respuestas</li>`,
    ).join("");
    return { title: `${name} · temas`, html: shell(name, nav, `<ul>${items}</ul>`) };
  }
  return {
    title: name,
    html: shell(name, nav, `<p class="lead">${esc(entity.description)}</p><p><strong>${members}</strong> miembros · <strong>${threads}</strong> temas abiertos.</p><p>Último tema: “${esc(pick(TECH_TOPICS, seed))}”.</p>`),
  };
}

function renderMedia(
  entity: WorldEntity, owner: OwnerProfile, name: string,
  seed: number, age: number, day: number, path: string,
): RenderedPage {
  const nav = navLinks([["/", "Inicio"], ["/episodios", "Episodios"]], path);
  const eps = itemsForAge(age, 0.6, 1);
  void day;

  if (path === "/episodios") {
    const items = Array.from({ length: eps }, (_, i) =>
      `<li>Episodio ${eps - i}: ${esc(pick([...TECH_TOPICS, ...BIZ_TOPICS], seed + i))} · ${100 + ((seed + i) % 9000)} vistas</li>`,
    ).join("");
    return { title: `${name} · episodios`, html: shell(name, nav, `<ul>${items}</ul>`) };
  }
  return {
    title: name,
    html: shell(name, nav, `<p class="lead">${esc(entity.description)} — por ${esc(owner.name)}.</p><p>${eps} episodios · ${eps * (300 + (seed % 700))} reproducciones totales.</p>`),
  };
}

function renderGeneric(
  entity: WorldEntity, owner: OwnerProfile, name: string, age: number, path: string,
): RenderedPage {
  void path;
  return {
    title: name,
    html: shell(name, "", `<p>${esc(entity.description)}</p><p>Publicado por ${esc(owner.name)}. Activo desde hace ${age} días.</p>`),
  };
}

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ñ/gi, "n")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
