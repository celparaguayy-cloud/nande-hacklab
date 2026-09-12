import {
  escapeHtml,
  html,
  redirect,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { field, notice, page } from "./layout";
import { signJwt, decodeJwt, verifyJwt, base64url, utf8Bytes } from "../../crypto/jwt";

/**
 * Segunda tanda de laboratorios web de ÑANDE. Cada uno es una vulnerabilidad
 * real, atacable por el motor HTTP, con su bandera ND{...}.
 */

/* ================================================================
   SSRF — Server-Side Request Forgery
   ================================================================ */

/**
 * Vortex Preview — laboratorio de SSRF.
 *
 * Un servicio que "trae" la URL que le pidas para previsualizarla. La
 * petición la hace el SERVIDOR, así que podés llegar a lugares internos que
 * tu navegador no alcanza: la metadata de la nube, un panel de admin en
 * localhost, la red interna. Ahí está la bandera.
 */
export class SsrfApp implements WebApp {
  readonly hostname = "preview.vortex.nande";
  readonly title = "Vortex Preview";
  readonly description = "Previsualizador de enlaces. Vulnerable a SSRF.";
  readonly kind = "panel" as const;

  handle(req: HttpRequest): HttpResponse {
    if (req.path !== "/fetch") {
      return html(page(this.title, this.form("")));
    }

    const url = (req.query.url ?? req.body.url ?? "").trim();
    const target = url.toLowerCase();

    // La vulnerabilidad: el servidor busca CUALQUIER url sin restringir a
    // dónde. Los destinos internos son alcanzables solo desde el server.
    let resultado: string;
    if (
      target.includes("169.254.169.254") ||
      target.includes("metadata")
    ) {
      resultado =
        `--- respuesta interna (metadata de la nube) ---\n` +
        `instance-id: i-0nande77\n` +
        `iam/security-credentials/rol-admin:\n` +
        `  AccessKeyId: AKIA-NANDE-INTERNO\n` +
        `  SecretAccessKey: ND{ssrf_metadata_robada}\n`;
    } else if (
      target.includes("127.0.0.1") ||
      target.includes("localhost") ||
      target.includes("10.0.0.") ||
      target.includes("//internal")
    ) {
      resultado =
        `--- respuesta interna (panel solo-localhost) ---\n` +
        `<h1>Panel interno</h1>\n` +
        `Bienvenido, administrador. Token de servicio: ND{ssrf_interno}\n`;
    } else if (target.startsWith("http://") || target.startsWith("https://")) {
      resultado =
        `--- vista previa de ${escapeHtml(url)} ---\n` +
        `<title>Sitio público</title> (contenido externo sin secretos)\n`;
    } else {
      return html(
        page(this.title, notice("URL inválida. Empezá con http://", "err") + this.form(url)),
      );
    }

    const body = `
${this.form(url)}
<pre class="lab-file">GET ${escapeHtml(url || "—")}\n\n${escapeHtml(resultado)}</pre>
<p class="lab-hint">Pista: la busca el <b>servidor</b>, no vos. Apuntá a algo
interno que él sí alcance: <code>http://169.254.169.254/latest/meta-data/</code>
o <code>http://127.0.0.1/admin</code>.</p>`;

    return html(page(this.title, body), { debug: { note: `fetch ${url}` } });
  }

  private form(value: string): string {
    return `
<p>Pegá un enlace y te muestro una vista previa.</p>
<p class="lab-hint">Objetivo: la URL la pide el <b>servidor</b>, no tu
navegador. Apuntá a un destino interno que solo él alcanza — probá
<code>http://169.254.169.254/metadata</code>.</p>
<form method="GET" action="/fetch">
  ${field("URL", "url", "text", value)}
  <button type="submit">Previsualizar</button>
</form>`;
  }
}

/* ================================================================
   JWT alg:none — confusión de algoritmo
   ================================================================ */

const JWT_SECRET = "vortex-super-secreto-2024";

/** Token malicioso ya forjado (alg:none, rol:admin, sin firma). */
function forgeNoneToken(): string {
  const h = base64url(utf8Bytes(JSON.stringify({ alg: "none", typ: "JWT" })));
  const p = base64url(utf8Bytes(JSON.stringify({ usuario: "admin", rol: "admin" })));
  return `${h}.${p}.`; // firma vacía
}

/**
 * Vortex API — laboratorio de JWT con alg:none.
 *
 * La API te da un token de usuario normal y "verifica" el que le mandes.
 * El bug: si el token dice alg:none, lo acepta SIN comprobar la firma. Vos
 * forjás uno con rol:admin y entrás. Bandera en el panel de admin.
 */
export class JwtNoneApp implements WebApp {
  readonly hostname = "api.vortex.nande";
  readonly title = "Vortex API";
  readonly description = "API con sesión por JWT. Vulnerable a alg:none.";
  readonly kind = "panel" as const;

  handle(req: HttpRequest): HttpResponse {
    const token = req.query.token ?? req.cookies.token ?? "";

    if (req.path === "/panel") {
      const parts = decodeJwt(token);
      // Verificación VULNERABLE: acepta alg:none sin firma.
      const alg = parts?.header?.alg;
      const ok =
        parts != null &&
        (alg === "none" || verifyJwt(token, JWT_SECRET));

      if (!ok) {
        return html(
          page(this.title, notice("Token inválido o ausente.", "err") + this.home("")),
          { status: 401 },
        );
      }

      const rol = String(parts.payload.rol ?? "user");
      if (rol !== "admin") {
        return html(
          page(this.title, notice(`Sesión de rol "${escapeHtml(rol)}". El panel es solo para admin.`, "info") + this.home(token)),
        );
      }

      const body = `
${notice("Acceso de administrador concedido.", "ok")}
<pre class="lab-file">Panel de administración de Vortex
Usuario: ${escapeHtml(String(parts.payload.usuario ?? "?"))}  ·  rol: admin
Bandera: ND{jwt_alg_none}</pre>
<p class="site-foot"><a href="/">Volver</a></p>`;
      return html(page(this.title, body), { debug: { note: "alg:none aceptado" } });
    }

    // Portada: entrega un token de usuario normal y explica.
    const userToken = token || signJwt({ usuario: "invitado", rol: "user" }, JWT_SECRET);
    return {
      ...html(page(this.title, this.home(userToken))),
      setCookies: token ? {} : { token: userToken },
    };
  }

  private home(token: string): string {
    const decoded = decodeJwt(token);
    const forged = forgeNoneToken();
    return `
<p>Bienvenido a la API. Tu sesión viaja en un JWT.</p>
<pre class="lab-file">Tu token: ${escapeHtml(token || "—")}
Decodificado: ${escapeHtml(JSON.stringify(decoded?.payload ?? {}))}</pre>
<p><a href="/panel?token=${encodeURIComponent(token)}">Ir al panel de admin →</a></p>
<p class="lab-hint">Pista: la API acepta tokens con <code>alg:none</code> sin
verificar la firma. Forjá uno con <code>rol:admin</code>. Ya te dejo uno listo:
<br><code>${escapeHtml(forged)}</code>
<br>Probalo: <a href="/panel?token=${encodeURIComponent(forged)}">/panel?token=…</a></p>`;
  }
}

/* ================================================================
   Open Redirect
   ================================================================ */

/**
 * Gulu Link — laboratorio de redirección abierta.
 *
 * Un acortador que te manda a la URL de ?next= sin validar el destino.
 * Sirve para armar phishing: un enlace de gulu.nande que en realidad te
 * lleva a un sitio del atacante.
 */
export class RedirectApp implements WebApp {
  readonly hostname = "link.gulu.nande";
  readonly title = "Gulu Link";
  readonly description = "Acortador de enlaces. Vulnerable a open redirect.";
  readonly kind = "portal" as const;

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/go") {
      const next = (req.query.next ?? "").trim();
      const lower = next.toLowerCase();
      const esExterno =
        (lower.startsWith("http://") || lower.startsWith("https://")) &&
        !lower.includes("gulu.nande");

      if (!next) {
        return html(page(this.title, notice("Falta ?next=", "err") + this.form("")));
      }

      // El bug: redirige a cualquier lado. Si el destino es EXTERNO, se
      // demuestra el phishing y cae la bandera.
      if (esExterno) {
        const body = `
${notice("Redirigiendo fuera de gulu.nande…", "info")}
<pre class="lab-file">Location: ${escapeHtml(next)}

Un enlace de gulu.nande te llevó a un sitio ajeno sin avisar.
Así se arma un phishing convincente.
Bandera: ND{open_redirect}</pre>
<p class="site-foot"><a href="/">Volver</a></p>`;
        return html(page(this.title, body), { debug: { note: `redirect ${next}` } });
      }

      // Destino interno: redirección normal (segura).
      return redirect(next.startsWith("/") ? next : "/");
    }

    return html(page(this.title, this.form("")));
  }

  private form(value: string): string {
    return `
<p>Acortá un enlace. Te redirige a donde apunte.</p>
<form method="GET" action="/go">
  ${field("Destino (next)", "next", "text", value)}
  <button type="submit">Ir</button>
</form>
<p class="lab-hint">Pista: no valida el destino. Tocá este payload para
probarlo: <code>/go?next=http://sitio-atacante.evil</code> — te manda afuera
sin chequear.</p>`;
  }
}
