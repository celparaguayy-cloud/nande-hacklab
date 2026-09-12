import { html, type HttpRequest, type HttpResponse, type WebApp } from "../types";
import { notice, page } from "./layout";

/**
 * server.nande — un servidor web común del mundo, sin vulnerabilidad.
 *
 * Su razón de ser es didáctica: es el host de referencia para entender que
 * un sitio responde SOLO si su servicio HTTP (nginx) está corriendo. Si con
 * `service-stop nginx server.nande` apagás el servicio, este sitio deja de
 * responder en el navegador y en `curl` — porque ambos preguntan al mismo
 * HostRuntime. Volvés a arrancarlo y vuelve a funcionar.
 */
export class ServerApp implements WebApp {
  readonly hostname = "server.nande";
  readonly title = "server.nande";
  readonly description = "Servidor web de referencia del mundo virtual.";
  readonly kind = "otro" as const;

  handle(req: HttpRequest): HttpResponse {
    if (req.path !== "/" && req.path !== "/estado") {
      return html(page(this.title, notice("No encontrado.", "err")), {
        status: 404,
      });
    }

    const body = `
${notice("nginx está sirviendo esta página. Servicio HTTP activo en 80/tcp.", "ok")}
<p>Este es un servidor web corriente del mundo de ÑANDE.</p>
<p>Probá desde la terminal:</p>
<pre class="lab-file">nmap server.nande          # ves 80/tcp open (nginx)
service-stop nginx server.nande
curl http://server.nande   # ahora falla: conexión rechazada
nmap server.nande          # 80/tcp closed
service-start nginx server.nande
curl http://server.nande   # vuelve a responder</pre>
<p>El navegador, curl y nmap consultan el MISMO estado del servidor.</p>`;

    return html(page(this.title, body));
  }
}
