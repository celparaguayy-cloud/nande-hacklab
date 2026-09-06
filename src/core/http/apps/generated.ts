import { Database, SqlError } from "../../db/Database";
import { md5 } from "../../crypto/hash";
import { WORDLIST } from "../../crypto/cracker";
import { renderLivingSite, type OwnerProfile } from "../../internet/LivingSite";
import type { WorldEntity } from "../../world/WorldRegistry";
import {
  escapeHtml,
  html,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";

/**
 * Sitio de habitante generado y HACKEABLE.
 *
 * Une las dos mitades de ÑANDE: cada web de un NPC es a la vez navegable
 * (varias páginas con contenido real que crece con el tiempo) y atacable
 * de verdad. Cada sitio recibe, de forma determinista según su id, una
 * vulnerabilidad real —un buscador inyectable— sobre una base con la
 * cuenta del dueño. Si la explotás con UNION, te llevás el usuario y el
 * HASH de su contraseña; lo crackeás con `crack` y ya tenés a la persona.
 *
 * Es la cadena "hackeás el sitio → sacás al usuario" sobre el motor SQL
 * real, sin nada guionado.
 */

/** Contraseña débil del dueño, elegida del diccionario para que `crack` la rompa. */
function ownerPassword(seed: number): string {
  return WORDLIST[seed % WORDLIST.length];
}

function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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

export class GeneratedSite implements WebApp {
  readonly hostname: string;
  readonly title: string;
  readonly description: string;
  readonly kind = "otro" as const;

  private entity: WorldEntity;
  private owner: OwnerProfile;
  private day: () => number;
  private db: Database;
  private ownerUser: string;
  private ownerPass: string;
  readonly flag: string;

  constructor(
    hostname: string,
    entity: WorldEntity,
    owner: OwnerProfile,
    day: () => number,
  ) {
    this.hostname = hostname;
    this.entity = entity;
    this.owner = owner;
    this.day = day;
    this.title = entity.name;
    this.description = entity.description;

    const seed = seedOf(entity.id);
    this.ownerUser = slug(owner.name).replace(/-/g, "") || "admin";
    this.ownerPass = ownerPassword(seed);
    this.flag = `ND{acceso:${slug(entity.name)}}`;

    // Base del sitio: la cuenta del dueño (con su contraseña hasheada en
    // MD5, débil a propósito) y un par de cuentas más. La bandera vive en
    // una tabla aparte que sale con el mismo UNION.
    this.db = new Database();
    this.db.createTable(
      "usuarios",
      ["id", "usuario", "password", "rol"],
      [
        [1, this.ownerUser, md5(this.ownerPass), "admin"],
        [2, "soporte", md5(WORDLIST[(seed >>> 3) % WORDLIST.length]), "staff"],
        [3, "invitado", md5("invitado"), "user"],
      ],
    );
    this.db.createTable("secretos", ["id", "dato"], [[1, this.flag]]);
  }

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/buscar") {
      return this.search(req);
    }
    // Cualquier otra ruta: el sitio navegable (contenido vivo).
    return this.front(req.path);
  }

  private front(path: string): HttpResponse {
    const page = renderLivingSite(this.entity, this.owner, this.day(), path);

    if (!page) {
      return html(`<h1>404</h1><p>No existe esa página.</p>`, { status: 404 });
    }

    // Se inyecta un buscador (el punto vulnerable) en el pie de toda página.
    const searchBox = `
<form method="GET" action="/buscar" class="site-search">
  <input name="q" placeholder="Buscar en el sitio…" />
  <button type="submit">Buscar</button>
</form>`;

    return html(page.html.replace("</h1>", "</h1>" + searchBox));
  }

  private search(req: HttpRequest): HttpResponse {
    const q = req.query.q ?? "";

    // La vulnerabilidad: el término se concatena en la consulta. El sitio
    // tiene una tabla "articulos" implícita; usamos una consulta sobre
    // usuarios para exponer el punto, con columnas que permiten UNION.
    const sql =
      `SELECT id, usuario, rol FROM usuarios ` +
      `WHERE usuario LIKE '%${q}%'`;

    let rows;
    try {
      rows = this.db.query(sql).rows;
    } catch (error) {
      const msg = error instanceof SqlError ? error.message : "error";
      return html(
        this.wrap(
          `<p class="lab-notice lab-notice--err">Error SQL: ${escapeHtml(msg)}</p>` +
            this.form(q),
        ),
        { debug: { sql } },
      );
    }

    const list = rows
      .map(
        (r) =>
          `<li>${escapeHtml(String(r[1]))} <span class="tag">${escapeHtml(String(r[2]))}</span></li>`,
      )
      .join("");

    return html(
      this.wrap(
        this.form(q) +
          `<ul>${list || "<li>Sin resultados.</li>"}</ul>` +
          `<p class="lab-hint">Pista: el buscador arma la consulta con tu
          texto. La tabla <code>usuarios</code> tiene id, usuario, password,
          rol. Probá un <code>UNION SELECT</code> para sacar las
          contraseñas. También hay una tabla <code>secretos(id, dato)</code>.</p>`,
      ),
      { debug: { sql } },
    );
  }

  private form(value: string): string {
    return `
<form method="GET" action="/buscar" class="site-search">
  <input name="q" value="${escapeHtml(value)}" placeholder="Buscar…" />
  <button type="submit">Buscar</button>
</form>`;
  }

  private wrap(body: string): string {
    return `<h1>${escapeHtml(this.entity.name)} · búsqueda</h1>${body}
      <p class="site-foot"><a href="/">← Volver al sitio</a></p>`;
  }
}
