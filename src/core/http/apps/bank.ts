import { Database } from "../../db/Database";
import { SqlError } from "../../db/Database";
import {
  escapeHtml,
  html,
  redirect,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { field, notice, page } from "./layout";

/**
 * Banco Mbarete — laboratorio de inyección SQL.
 *
 * El login arma la consulta pegando lo que escribe el usuario, sin
 * parámetros. Contra el motor SQL real esto es explotable de verdad:
 *   usuario:  admin'--
 *   usuario:  ' OR '1'='1' --
 * Y el buscador de movimientos es inyectable con UNION para sacar la
 * tabla de credenciales. No hay respuestas guionadas: si la consulta que
 * se arma devuelve filas, entrás.
 */
export class BankApp implements WebApp {
  readonly hostname = "banco.nande";
  readonly title = "Banco Mbarete";
  readonly description = "Home banking del mundo. Login vulnerable a SQLi.";
  readonly kind = "banco" as const;

  private db = new Database();
  /** Sesiones válidas: token → usuario. */
  private sessions = new Map<string, string>();
  private sessionCounter = 0;

  constructor() {
    this.db.createTable(
      "usuarios",
      ["id", "usuario", "password", "rol", "saldo"],
      [
        [1, "admin", "M8arete-2024!", "admin", 999999],
        [2, "rocio", "girasol77", "cliente", 12500],
        [3, "dario", "boca123", "cliente", 3400],
        [4, "sofia", "qwerty", "cliente", 88000],
      ],
    );

    this.db.createTable(
      "movimientos",
      ["id", "usuario", "detalle", "monto"],
      [
        [1, "rocio", "Sueldo", 8000],
        [2, "rocio", "Supermercado", -1200],
        [3, "dario", "Transferencia recibida", 2000],
        [4, "sofia", "Compra dólares", -50000],
      ],
    );
  }

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/" || req.path === "/login") {
      return req.method === "POST" ? this.login(req) : this.loginPage();
    }

    if (req.path === "/panel") return this.panel(req);
    if (req.path === "/movimientos") return this.movimientos(req);
    if (req.path === "/logout") return this.logout(req);

    return html(page(this.title, notice("Página no encontrada.", "err")), {
      status: 404,
    });
  }

  private loginPage(message = ""): HttpResponse {
    const body = `
${message}
<p>Ingresá a tu cuenta.</p>
<form method="POST" action="/login">
  ${field("Usuario", "usuario")}
  ${field("Contraseña", "password", "password")}
  <button type="submit">Ingresar</button>
</form>
<p class="lab-hint">Pista de laboratorio: el login arma la consulta SQL
pegando el texto. Probá un usuario como <code>admin'--</code></p>`;

    return html(page(this.title, body));
  }

  private login(req: HttpRequest): HttpResponse {
    const usuario = req.body.usuario ?? "";
    const password = req.body.password ?? "";

    // La vulnerabilidad, tal cual se ve en el mundo real: concatenación.
    const sql =
      `SELECT id, usuario, rol FROM usuarios ` +
      `WHERE usuario = '${usuario}' AND password = '${password}'`;

    let rows;

    try {
      rows = this.db.query(sql).rows;
    } catch (error) {
      const message =
        error instanceof SqlError ? error.message : "error desconocido";

      // El error de SQL se filtra al usuario: inyección basada en error.
      return html(
        page(
          this.title,
          notice(`Error en la consulta: ${escapeHtml(message)}`, "err") +
            this.loginFormOnly(),
        ),
        { debug: { sql } },
      );
    }

    if (rows.length === 0) {
      return html(
        page(
          this.title,
          notice("Usuario o contraseña incorrectos.", "err") +
            this.loginFormOnly(),
        ),
        { debug: { sql } },
      );
    }

    const nombre = String(rows[0][1]);
    const token = `s${this.sessionCounter++}-${Math.random().toString(36).slice(2)}`;
    this.sessions.set(token, nombre);

    const res = redirect("/panel");
    res.setCookies.sesion = token;
    res.debug = { sql, note: `Login correcto como ${nombre}` };
    return res;
  }

  private loginFormOnly(): string {
    return `
<form method="POST" action="/login">
  ${field("Usuario", "usuario")}
  ${field("Contraseña", "password", "password")}
  <button type="submit">Ingresar</button>
</form>`;
  }

  private currentUser(req: HttpRequest): string | undefined {
    const token = req.cookies.sesion;
    return token ? this.sessions.get(token) : undefined;
  }

  private panel(req: HttpRequest): HttpResponse {
    const usuario = this.currentUser(req);

    if (!usuario) {
      return html(
        page(this.title, notice("Iniciá sesión primero.", "err")),
        { status: 401 },
      );
    }

    const info = this.db.query(
      `SELECT usuario, rol, saldo FROM usuarios WHERE usuario = '${usuario}'`,
    ).rows[0];

    const esAdmin = info && String(info[1]) === "admin";

    const body = `
${notice(`Sesión iniciada como <strong>${escapeHtml(usuario)}</strong>.`, "ok")}
<p>Saldo: <strong>N$ ${info ? escapeHtml(String(info[2])) : "?"}</strong></p>
${
  esAdmin
    ? notice(
        "Panel de ADMINISTRADOR. Bandera: <code>ND{sqli_login_bypass}</code>",
        "ok",
      )
    : ""
}
<p><a href="/movimientos">Ver mis movimientos</a> · <a href="/logout">Salir</a></p>`;

    return html(page(this.title, body));
  }

  private movimientos(req: HttpRequest): HttpResponse {
    const usuario = this.currentUser(req);

    if (!usuario) {
      return html(page(this.title, notice("Iniciá sesión primero.", "err")), {
        status: 401,
      });
    }

    const buscar = req.query.q ?? "";

    // Segundo punto inyectable: el buscador arma la consulta con el texto.
    // Un UNION con 4 columnas saca la tabla de usuarios (con contraseñas).
    const sql =
      `SELECT id, detalle, monto, usuario FROM movimientos ` +
      `WHERE usuario = '${usuario}' AND detalle LIKE '%${buscar}%'`;

    let result;

    try {
      result = this.db.query(sql);
    } catch (error) {
      const message =
        error instanceof SqlError ? error.message : "error desconocido";

      return html(
        page(
          this.title,
          this.searchForm(buscar) +
            notice(`Error SQL: ${escapeHtml(message)}`, "err"),
        ),
        { debug: { sql } },
      );
    }

    const filas = result.rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(String(r[0]))}</td>` +
          `<td>${escapeHtml(String(r[1]))}</td>` +
          `<td>${escapeHtml(String(r[2]))}</td></tr>`,
      )
      .join("");

    const body = `
${this.searchForm(buscar)}
<table class="lab-table">
  <thead><tr><th>#</th><th>Detalle</th><th>Monto</th></tr></thead>
  <tbody>${filas || '<tr><td colspan="3">Sin resultados.</td></tr>'}</tbody>
</table>
<p class="lab-hint">Pista: el buscador arma la consulta con tu texto. La
tabla <code>usuarios</code> tiene columnas id, usuario, password, rol,
saldo. Probá un <code>UNION SELECT</code>.</p>
<p><a href="/panel">Volver</a></p>`;

    return html(page(this.title, body), { debug: { sql } });
  }

  private searchForm(value: string): string {
    return `
<form method="GET" action="/movimientos">
  ${field("Buscar en el detalle", "q", "text", value)}
  <button type="submit">Buscar</button>
</form>`;
  }

  private logout(req: HttpRequest): HttpResponse {
    const token = req.cookies.sesion;
    if (token) this.sessions.delete(token);

    const res = redirect("/login");
    res.setCookies.sesion = "";
    return res;
  }
}
