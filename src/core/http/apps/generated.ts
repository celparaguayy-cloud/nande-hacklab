import { Database, SqlError } from "../../db/Database";
import { md5 } from "../../crypto/hash";
import { WORDLIST, weakPasswordFor } from "../../crypto/cracker";
import { renderLivingSite, type OwnerProfile } from "../../internet/LivingSite";
import type { WorldEntity } from "../../world/WorldRegistry";
import {
  escapeHtml,
  html,
  redirect,
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

/**
 * Puente entre el sitio hackeado y la economía real del mundo. El panel lo
 * usa para mostrar el saldo verdadero del dueño y para transferirlo a la
 * billetera del jugador cuando roba. Lo provee el kernel; en pruebas que
 * construyen el sitio a mano puede faltar (cae a un saldo simulado).
 */
export interface SiteBank {
  /** Plata disponible del dueño, en guaraníes. */
  balanceOf(ownerId: string): number;
  /** Vacía la cuenta del dueño hacia el jugador. Devuelve lo robado y si lo detectaron. */
  rob(ownerId: string, siteName: string): { taken: number; busted: boolean };
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
  private sessionToken: string;
  private bank?: SiteBank;
  /** Ya se robó la cuenta: la plata ya no está. */
  private robbedInfo?: { taken: number };
  readonly flag: string;

  constructor(
    hostname: string,
    entity: WorldEntity,
    owner: OwnerProfile,
    day: () => number,
    bank?: SiteBank,
  ) {
    this.hostname = hostname;
    this.entity = entity;
    this.owner = owner;
    this.day = day;
    this.bank = bank;
    this.title = entity.name;
    this.description = entity.description;

    const seed = seedOf(entity.id);
    this.ownerUser = slug(owner.name).replace(/-/g, "") || "admin";
    this.ownerPass = weakPasswordFor(owner.name);
    this.flag = `ND{acceso:${slug(entity.name)}}`;
    // Token de sesión estable: quien tenga la contraseña puede regenerarlo,
    // pero no se puede adivinar sin ella. Es lo que valida el panel privado.
    this.sessionToken = md5(`${this.ownerUser}:${this.ownerPass}:sesion`);

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
    if (req.path === "/login") {
      return this.login(req);
    }
    if (req.path === "/panel") {
      return this.panel(req);
    }
    if (req.path === "/robar") {
      return this.rob(req);
    }
    if (req.path === "/salir") {
      return { ...redirect("/login"), setCookies: { sesion: "" } };
    }
    // Cualquier otra ruta: el sitio navegable (contenido vivo).
    return this.front(req.path);
  }

  private front(path: string): HttpResponse {
    const page = renderLivingSite(this.entity, this.owner, this.day(), path);

    if (!page) {
      return html(`<h1>404</h1><p>No existe esa página.</p>`, { status: 404 });
    }

    // Se inyecta un buscador (el punto vulnerable) en el pie de toda página,
    // y un acceso al panel privado del dueño (la meta del ataque).
    const searchBox = `
<form method="GET" action="/buscar" class="site-search">
  <input name="q" placeholder="Buscar en el sitio…" />
  <button type="submit">Buscar</button>
</form>
<p class="site-owner"><a href="/login">Acceso del propietario →</a></p>`;

    return html(page.html.replace("</h1>", "</h1>" + searchBox));
  }

  /** Cadena de números plausibles y deterministas para los datos privados. */
  private digits(salt: string, count: number): string {
    let s = seedOf(this.entity.id + salt);
    let out = "";
    for (let i = 0; i < count; i += 1) {
      s = (Math.imul(s, 1103515245) + 12345) >>> 0;
      out += ((s >>> 16) % 10).toString();
    }
    return out;
  }

  /** Formulario de login del propietario (evaluable de verdad). */
  private login(req: HttpRequest): HttpResponse {
    if (req.method === "POST") {
      const user = (req.body.usuario ?? "").trim();
      const pass = req.body.password ?? "";
      if (user === this.ownerUser && pass === this.ownerPass) {
        return {
          ...redirect("/panel"),
          setCookies: { sesion: this.sessionToken },
        };
      }
      return html(
        this.wrap(
          `<p class="lab-notice lab-notice--err">Usuario o contraseña incorrectos.</p>` +
            this.loginForm(),
        ),
      );
    }
    // Si ya trae sesión válida, directo al panel.
    if (req.cookies.sesion === this.sessionToken) {
      return redirect("/panel");
    }
    return html(this.wrap(this.loginForm()));
  }

  private loginForm(): string {
    return `
<form method="POST" action="/login" class="site-login">
  <label>Usuario<input name="usuario" placeholder="usuario" /></label>
  <label>Contraseña<input name="password" type="password" placeholder="••••••" /></label>
  <button type="submit">Entrar</button>
</form>
<p class="lab-hint">Pista: el usuario admin es <code>${escapeHtml(this.ownerUser)}</code>.
Su contraseña sale de crackear el hash que expone el buscador con un
<code>UNION SELECT</code>, o de husmear sus fugas en Pulso.</p>`;
  }

  /** Panel privado del dueño: solo accesible con la sesión válida. */
  private panel(req: HttpRequest): HttpResponse {
    if (req.cookies.sesion !== this.sessionToken) {
      return html(
        this.wrap(
          `<p class="lab-notice lab-notice--err">Necesitás iniciar sesión.</p>` +
            this.loginForm(),
        ),
        { status: 401 },
      );
    }

    // Saldo REAL del dueño (su riqueza en la economía del mundo). Sin banco
    // conectado (algunas pruebas), cae a un número simulado estable.
    const saldo = this.bank
      ? this.bank.balanceOf(this.entity.ownerId)
      : 50000 + (seedOf(this.entity.id + "saldo") % 9_950_000);
    const ci = this.digits("ci", 7);
    const tel = this.digits("tel", 9);
    const otraClave = weakPasswordFor(this.owner.name + " respaldo");

    // Zona de la billetera: o ya la vaciaste, o hay un botón para robar.
    let walletZone: string;
    if (this.robbedInfo) {
      walletZone = `
    <p class="panel-big">₲ ${saldo.toLocaleString("es-PY")}</p>
    <p class="panel-robbed">Ya transferiste ₲ ${this.robbedInfo.taken.toLocaleString("es-PY")}
       a tu billetera.</p>`;
    } else {
      walletZone = `
    <p class="panel-big">₲ ${saldo.toLocaleString("es-PY")}</p>
    <p>Cuenta a nombre de ${escapeHtml(this.owner.name)}.</p>
    <form method="POST" action="/robar" class="panel-rob">
      <button type="submit">Transferir todo a mi cuenta →</button>
    </form>`;
    }

    const body = `
<p class="lab-notice lab-notice--ok">Sesión iniciada como
  <strong>${escapeHtml(this.ownerUser)}</strong>. Estás dentro de la cuenta
  del dueño.</p>
<div class="panel-grid">
  <div class="panel-card">
    <h3>Billetera</h3>${walletZone}
  </div>
  <div class="panel-card">
    <h3>Datos personales</h3>
    <ul>
      <li>Nombre: ${escapeHtml(this.owner.name)}</li>
      <li>Profesión: ${escapeHtml(this.owner.profession)}</li>
      <li>CI: ${ci}</li>
      <li>Teléfono: 09${tel}</li>
    </ul>
  </div>
  <div class="panel-card">
    <h3>Notas privadas</h3>
    <p>Clave de respaldo que reusa en todos lados:
       <code>${escapeHtml(otraClave)}</code></p>
    <p class="panel-flag">${escapeHtml(this.flag)}</p>
  </div>
</div>
<p class="lab-hint">Reusar contraseñas es oro para vos: probá
<code>${escapeHtml(otraClave)}</code> en otras cuentas de esta persona.
Y robar deja rastro: te sube el calor y sale en las noticias.</p>
<p class="site-foot"><a href="/salir">Cerrar sesión</a> ·
  <a href="/">Volver al sitio</a></p>`;

    return html(this.wrap(body), { debug: { note: this.flag } });
  }

  /** Transferir la plata del dueño a la billetera del jugador. */
  private rob(req: HttpRequest): HttpResponse {
    if (req.cookies.sesion !== this.sessionToken) {
      return { ...redirect("/login"), status: 302 };
    }
    if (req.method !== "POST") {
      return redirect("/panel");
    }
    if (!this.robbedInfo && this.bank) {
      const { taken } = this.bank.rob(this.entity.ownerId, this.entity.name);
      this.robbedInfo = { taken };
    }
    return redirect("/panel");
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
          contraseñas. También hay una tabla <code>secretos(id, dato)</code>.</p>` +
          `<p class="site-foot"><a href="/login">Acceso del propietario →</a> ·
          <a href="/">Volver al sitio</a></p>`,
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
    return `<h1>${escapeHtml(this.entity.name)}</h1>${body}`;
  }
}
