/**
 * Modelo HTTP de ÑANDE.
 *
 * Los sitios del mundo dejan de ser HTML fijo y pasan a ser aplicaciones
 * que responden a peticiones: reciben query string, cuerpo de formularios
 * y cookies, y devuelven una respuesta con su cuerpo, sus cabeceras y sus
 * cookies. Es lo mínimo para que una web sea atacable de verdad —sin
 * método POST ni sesiones no hay login que evadir ni IDOR que explotar.
 */

export type HttpMethod = "GET" | "POST";

export interface HttpRequest {
  method: HttpMethod;
  hostname: string;
  path: string;
  /** Parámetros del query string (?a=1&b=2), ya decodificados. */
  query: Record<string, string>;
  /** Campos del formulario en un POST. */
  body: Record<string, string>;
  /** Cookies que manda el cliente. */
  cookies: Record<string, string>;
}

export interface HttpResponse {
  status: number;
  /** Cuerpo de la respuesta (HTML por defecto). */
  body: string;
  contentType: string;
  headers: Record<string, string>;
  /** Cookies a fijar en el cliente (nombre → valor). */
  setCookies: Record<string, string>;
  /**
   * Rastro visible en las herramientas de desarrollo del navegador: la
   * consulta SQL que se ejecutó, el comando de sistema, etc. Es lo que
   * convierte al navegador en una herramienta de aprendizaje.
   */
  debug?: {
    sql?: string;
    note?: string;
  };
}

export function html(
  body: string,
  overrides: Partial<HttpResponse> = {},
): HttpResponse {
  return {
    status: 200,
    body,
    contentType: "text/html",
    headers: {},
    setCookies: {},
    ...overrides,
  };
}

export function redirect(path: string): HttpResponse {
  return {
    status: 302,
    body: "",
    contentType: "text/html",
    headers: { Location: path },
    setCookies: {},
  };
}

/**
 * Una aplicación web del mundo.
 *
 * `handle` recibe la petición ya parseada y devuelve la respuesta. Puede
 * guardar estado propio (usuarios, sesiones, mensajes), y ahí es donde
 * viven —a propósito— las vulnerabilidades de cada laboratorio.
 */
export interface WebApp {
  hostname: string;
  title: string;
  description: string;
  /** Categoría para el catálogo y la academia. */
  kind?: "banco" | "tienda" | "foro" | "blog" | "panel" | "portal" | "otro";
  handle(request: HttpRequest): HttpResponse;
}

/** Parsea "a=1&b=hola%20mundo" en un objeto. */
export function parseQueryString(raw: string): Record<string, string> {
  const out: Record<string, string> = {};

  if (!raw) return out;

  for (const pair of raw.split("&")) {
    if (!pair) continue;

    const eq = pair.indexOf("=");
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? "" : pair.slice(eq + 1);

    try {
      out[decodeURIComponent(key.replace(/\+/g, " "))] = decodeURIComponent(
        value.replace(/\+/g, " "),
      );
    } catch {
      // Un %XX inválido no debe tumbar la petición: se deja crudo, como
      // hacen los servidores tolerantes.
      out[key] = value;
    }
  }

  return out;
}

/** Parsea "sesion=abc; tema=oscuro" en un objeto de cookies. */
export function parseCookies(raw: string): Record<string, string> {
  const out: Record<string, string> = {};

  if (!raw) return out;

  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;

    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();

    if (key) out[key] = value;
  }

  return out;
}

/** Separa "/ruta?a=1" en ruta y query string. */
export function splitPath(fullPath: string): {
  path: string;
  queryString: string;
} {
  const q = fullPath.indexOf("?");

  if (q === -1) return { path: fullPath || "/", queryString: "" };

  return {
    path: fullPath.slice(0, q) || "/",
    queryString: fullPath.slice(q + 1),
  };
}

/** Escapa HTML: la ausencia de esto es exactamente lo que causa el XSS. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
