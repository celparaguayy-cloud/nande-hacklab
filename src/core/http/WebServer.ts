import {
  parseCookies,
  parseQueryString,
  splitPath,
  type HttpRequest,
  type HttpResponse,
  type HttpMethod,
  type WebApp,
} from "./types";

/**
 * Servidor web virtual: el registro de aplicaciones del mundo y el que
 * arma la petición HTTP a partir de lo que hace el navegador.
 *
 * El estado del cliente (las cookies) lo guarda el navegador, no el
 * servidor; acá sólo se enruta al host correcto y se le entrega la
 * petición ya parseada.
 */
export class WebServer {
  private apps = new Map<string, WebApp>();

  register(app: WebApp): void {
    this.apps.set(app.hostname.toLowerCase(), app);
  }

  unregister(hostname: string): boolean {
    return this.apps.delete(hostname.toLowerCase());
  }

  has(hostname: string): boolean {
    return this.apps.has(hostname.toLowerCase());
  }

  get(hostname: string): WebApp | undefined {
    return this.apps.get(hostname.toLowerCase());
  }

  list(): WebApp[] {
    return [...this.apps.values()];
  }

  /**
   * Procesa una petición.
   *
   * @param cookieHeader  Cookies actuales del cliente, como cabecera.
   * @param body          Campos del formulario en un POST.
   */
  request(
    method: HttpMethod,
    hostname: string,
    fullPath: string,
    cookieHeader = "",
    body: Record<string, string> = {},
  ): HttpResponse {
    const app = this.apps.get(hostname.toLowerCase());

    if (!app) {
      return {
        status: 404,
        body: notFoundPage(hostname),
        contentType: "text/html",
        headers: {},
        setCookies: {},
      };
    }

    const { path, queryString } = splitPath(fullPath);

    const req: HttpRequest = {
      method,
      hostname: hostname.toLowerCase(),
      path,
      query: parseQueryString(queryString),
      body,
      cookies: parseCookies(cookieHeader),
    };

    try {
      return app.handle(req);
    } catch (error) {
      // Un error no controlado del servidor se muestra como un 500 con la
      // traza: la fuga de información por errores es, además, una lección.
      const message = error instanceof Error ? error.message : String(error);

      return {
        status: 500,
        body: serverErrorPage(hostname, message),
        contentType: "text/html",
        headers: {},
        setCookies: {},
        debug: { note: message },
      };
    }
  }
}

function notFoundPage(hostname: string): string {
  return (
    `<h1>404 — no encontrado</h1>` +
    `<p>El servidor <code>${hostname}</code> no tiene esa ruta.</p>`
  );
}

function serverErrorPage(hostname: string, message: string): string {
  return (
    `<h1>500 — error del servidor</h1>` +
    `<p><code>${hostname}</code> devolvió un error:</p>` +
    `<pre>${message}</pre>`
  );
}
