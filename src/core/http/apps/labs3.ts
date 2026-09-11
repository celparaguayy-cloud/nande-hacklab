import {
  escapeHtml,
  html,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { field, notice, page } from "./layout";

/**
 * Tercera tanda de laboratorios web de ÑANDE: CSRF, LFI, subida de archivos
 * sin restringir y deserialización insegura. Cada uno es un fallo real,
 * atacable por el motor HTTP, con su bandera ND{...}.
 */

/** base64 → texto, tolerante (para el lab de deserialización). */
function fromBase64(s: string): string {
  try {
    return atob(s.trim());
  } catch {
    return "";
  }
}

/* ================================================================
   CSRF — Cross-Site Request Forgery
   ================================================================ */

/**
 * Banco Justicia (móvil) — laboratorio de CSRF.
 *
 * Estás logueado (la app te deja una cookie de sesión). La transferencia se
 * hace con solo la cookie: no pide ningún token anti-CSRF ni comprueba el
 * origen. Por eso una página cualquiera podría disparar la transferencia en
 * tu nombre. Hacerla sin token revela la bandera.
 */
export class CsrfApp implements WebApp {
  readonly hostname = "m.banco-justicia.nande";
  readonly title = "Banco Justicia · app";
  readonly description = "Banca móvil. Transferencia vulnerable a CSRF.";
  readonly kind = "banco" as const;

  handle(req: HttpRequest): HttpResponse {
    const logueado = req.cookies.sesion === "victima-logueada";

    if (req.path === "/transferir") {
      if (!logueado) {
        return {
          ...html(page(this.title, notice("Iniciá sesión primero (volvé al inicio).", "err") + this.home(false))),
          setCookies: { sesion: "victima-logueada" },
        };
      }
      const para = (req.query.para ?? req.body.para ?? "").trim();
      const monto = (req.query.monto ?? req.body.monto ?? "").trim();
      const token = req.query.csrf ?? req.body.csrf ?? "";

      if (!para || !monto) {
        return html(page(this.title, notice("Faltan datos.", "err") + this.home(true)));
      }

      // El bug: se ejecuta con solo la cookie, SIN token anti-CSRF.
      const protegida = token === "tok-valido-de-la-sesion";
      const body = `
${notice(`Transferencia de N$ ${escapeHtml(monto)} a "${escapeHtml(para)}" realizada.`, "ok")}
<pre class="lab-file">POST /transferir  (cookie: sesion=victima-logueada)
token anti-CSRF enviado: ${protegida ? "sí" : "NO"}

La operación se hizo con solo la cookie de sesión.
Cualquier sitio podría forzar esta misma petición en tu nombre.
Bandera: ND{csrf_transferencia}</pre>
<p class="site-foot"><a href="/">Volver</a></p>`;
      return html(page(this.title, body), { debug: { note: "transferencia sin token CSRF" } });
    }

    // Inicio: "inicia sesión" dejando la cookie.
    return {
      ...html(page(this.title, this.home(logueado))),
      setCookies: logueado ? {} : { sesion: "victima-logueada" },
    };
  }

  private home(logueado: boolean): string {
    return `
<p>Estás ${logueado ? "<b>conectado</b>" : "entrando"} a tu banca móvil.</p>
<form method="GET" action="/transferir">
  ${field("Para", "para", "text", "")}
  ${field("Monto", "monto", "text", "")}
  <button type="submit">Transferir</button>
</form>
<p class="lab-hint">Pista: la transferencia no pide token anti-CSRF ni valida
el origen. Se ejecuta con solo tu cookie. Probá:
<code>/transferir?para=atacante&amp;monto=99999</code> — un sitio ajeno
podría enviar exactamente eso por vos.</p>`;
  }
}

/* ================================================================
   LFI — Local File Inclusion
   ================================================================ */

/**
 * Portal Nova — laboratorio de LFI.
 *
 * El portal arma cada página incluyendo un archivo por su nombre: ?pg=inicio
 * carga "inicio". No filtra, así que con ../ salís del directorio de vistas
 * y hacés que incluya archivos del sistema —incluida la config con secretos.
 */
export class LfiApp implements WebApp {
  readonly hostname = "portal.nova.nande";
  readonly title = "Portal Nova";
  readonly description = "Portal con páginas dinámicas. Vulnerable a LFI.";
  readonly kind = "portal" as const;

  private readonly vistas: Record<string, string> = {
    inicio: "Bienvenido al Portal Nova.",
    contacto: "Escribinos a hola@nova.nande.",
  };

  private readonly sistema: Record<string, string> = {
    "/etc/passwd": "root:x:0:0:root:/root:/bin/bash\nnova:x:1000:1000::/home/nova:/bin/sh",
    "config/secretos.env": "DB_PASS=nova2024\nADMIN_TOKEN=ND{lfi_config_incluida}",
  };

  handle(req: HttpRequest): HttpResponse {
    const pg = (req.query.pg ?? "inicio").trim();

    // La vulnerabilidad: se "incluye" el nombre pedido sin confinarlo.
    let contenido: string | undefined = this.vistas[pg];

    if (contenido === undefined) {
      // Resuelve ../ como un include real y busca en el "disco".
      const limpio = pg.replace(/^(\.\.\/)+/, "").replace(/^\/*/, (m) => m);
      contenido =
        this.sistema[pg] ??
        this.sistema[limpio] ??
        this.sistema["/" + limpio] ??
        this.sistema[limpio.replace(/^\/*/, "")];
    }

    const cuerpo =
      contenido !== undefined
        ? `<pre class="lab-file">${escapeHtml(contenido)}</pre>`
        : notice(`No se pudo incluir "${escapeHtml(pg)}".`, "err");

    const body = `
<nav><a href="/?pg=inicio">Inicio</a> · <a href="/?pg=contacto">Contacto</a></nav>
${cuerpo}
<p class="lab-hint">Pista: la página se arma incluyendo <code>?pg=</code> sin
filtrar. Salí del directorio de vistas: <code>?pg=../../config/secretos.env</code>
o <code>?pg=/etc/passwd</code>.</p>`;

    return html(page(this.title, body), { debug: { note: `include ${pg}` } });
  }
}

/* ================================================================
   Subida de archivos sin restringir → webshell
   ================================================================ */

/**
 * Bytebox Files — laboratorio de subida de archivos maliciosos.
 *
 * Acepta cualquier archivo, sin validar la extensión ni el contenido. Si
 * subís un "shell" (.php, .jsp, .sh...) y después lo abrís, el servidor lo
 * "ejecuta": es el clásico camino de subida sin restringir a webshell.
 */
export class UploadApp implements WebApp {
  readonly hostname = "files.bytebox.nande";
  readonly title = "Bytebox Files";
  readonly description = "Alojamiento de archivos. Subida sin restringir.";
  readonly kind = "otro" as const;

  private subidos = new Map<string, string>();

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/subir") {
      const nombre = (req.body.nombre ?? req.query.nombre ?? "").trim();
      const contenido = req.body.contenido ?? req.query.contenido ?? "";
      if (!nombre) {
        return html(page(this.title, notice("Poné un nombre de archivo.", "err") + this.form()));
      }
      // El bug: guarda cualquier extensión, sin validar.
      this.subidos.set(nombre, contenido);
      return html(
        page(
          this.title,
          notice(`Archivo "${escapeHtml(nombre)}" subido.`, "ok") +
            `<p>Ahora abrilo: <a href="/subidas/${encodeURIComponent(nombre)}">/subidas/${escapeHtml(nombre)}</a></p>` +
            this.form(),
        ),
      );
    }

    if (req.path.startsWith("/subidas/")) {
      const nombre = decodeURIComponent(req.path.slice("/subidas/".length));
      const contenido = this.subidos.get(nombre);
      if (contenido === undefined) {
        return html(page(this.title, notice("No existe ese archivo.", "err")), { status: 404 });
      }
      // Si es "ejecutable", el server lo corre en vez de servirlo como texto.
      if (/\.(php|jsp|asp|sh|cgi|py)$/i.test(nombre)) {
        return html(
          page(
            this.title,
            `<pre class="lab-file">$ ejecutando ${escapeHtml(nombre)} en el servidor...
uid=33(www-data) gid=33(www-data)
Tu código corrió en el servidor. Bandera: ND{upload_webshell}</pre>`,
          ),
          { debug: { note: `exec ${nombre}` } },
        );
      }
      return html(page(this.title, `<pre class="lab-file">${escapeHtml(contenido)}</pre>`));
    }

    return html(page(this.title, this.form()));
  }

  private form(): string {
    return `
<p>Subí un archivo (foto de perfil, dice el formulario…).</p>
<form method="POST" action="/subir">
  ${field("Nombre", "nombre", "text", "")}
  ${field("Contenido", "contenido", "text", "")}
  <button type="submit">Subir</button>
</form>
<p class="lab-hint">Pista: no valida la extensión. Subí un
<code>shell.php</code> con cualquier contenido y después abrilo en
<code>/subidas/shell.php</code>: el server lo ejecuta.</p>`;
  }
}

/* ================================================================
   Deserialización insegura
   ================================================================ */

/**
 * Redix Sesiones — laboratorio de deserialización insegura.
 *
 * La sesión viaja como un objeto serializado (base64 de JSON) y el servidor
 * CONFÍA en lo que venga: si el objeto dice rol admin, te trata como admin.
 * Nunca hay que deserializar datos del cliente sin validar.
 */
export class DeserializeApp implements WebApp {
  readonly hostname = "cuenta.redix.nande";
  readonly title = "Redix Sesiones";
  readonly description = "Gestor de sesión serializada. Deserialización insegura.";
  readonly kind = "panel" as const;

  handle(req: HttpRequest): HttpResponse {
    const raw = req.query.sesion ?? req.cookies.sesion ?? "";
    let obj: Record<string, unknown> = { rol: "user", usuario: "invitado" };
    if (raw) {
      try {
        const parsed = JSON.parse(fromBase64(raw));
        if (parsed && typeof parsed === "object") obj = parsed as Record<string, unknown>;
      } catch {
        /* sesión inválida: queda el usuario por defecto */
      }
    }

    const rol = String(obj.rol ?? "user");
    const esAdmin = rol === "admin";

    const panel = esAdmin
      ? `<pre class="lab-file">Panel de administración de Redix
usuario: ${escapeHtml(String(obj.usuario ?? "?"))}  ·  rol: admin
Bandera: ND{deserializacion_insegura}</pre>`
      : notice(`Sesión de rol "${escapeHtml(rol)}". El panel es solo para admin.`, "info");

    const ejemplo = btoa('{"usuario":"admin","rol":"admin"}');
    const body = `
<p>Tu sesión viaja serializada (base64 de JSON) en el parámetro/cookie <code>sesion</code>.</p>
<pre class="lab-file">sesión recibida: ${escapeHtml(raw || "—")}
deserializada: ${escapeHtml(JSON.stringify(obj))}</pre>
${panel}
<p class="lab-hint">Pista: el server confía en el objeto que le mandes. Armá
uno con <code>rol:admin</code> y pasalo en base64. Te dejo uno listo:
<br><code>${escapeHtml(ejemplo)}</code>
<br>Probalo: <a href="/?sesion=${encodeURIComponent(ejemplo)}">/?sesion=…</a></p>`;

    return html(page(this.title, body), { debug: { note: "deserializa sesión del cliente" } });
  }
}
