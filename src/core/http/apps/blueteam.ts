import {
  escapeHtml,
  html,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { field, notice, page } from "./layout";

/**
 * ÑANDE SOC — laboratorio de Blue Team (análisis forense).
 *
 * Del otro lado del mostrador: no atacás, DEFENDÉS. Te dan los registros de
 * un servidor y tenés que reconstruir la intrusión: de qué IP vino y qué
 * técnica usó. Identificarlo bien es la bandera. Enseña a leer logs, que es
 * el pan de cada día del defensor.
 */
export class ForensicsApp implements WebApp {
  readonly hostname = "soc.nande";
  readonly title = "ÑANDE SOC";
  readonly description = "Centro de operaciones de seguridad. Análisis forense de logs.";
  readonly kind = "panel" as const;

  /** La IP del atacante y la técnica, escondidas en el patrón de los logs. */
  private readonly atacante = "10.10.66.13";

  private readonly logs = [
    "10.10.66.13 - - [09:14:02] GET /login 200",
    "10.10.66.13 - - [09:14:05] POST /login 401  usuario=admin",
    "10.10.66.13 - - [09:14:06] POST /login 401  usuario=admin",
    "10.10.66.13 - - [09:14:07] POST /login 401  usuario=admin",
    "10.10.66.13 - - [09:14:09] GET /buscar?q=%27+UNION+SELECT+usuario,password+FROM+usuarios-- 200",
    "10.10.66.13 - - [09:14:11] GET /admin 200",
    "10.10.4.7   - - [09:15:00] GET /  200",
    "10.10.4.7   - - [09:15:20] GET /productos 200",
    "10.10.9.2   - - [09:16:41] GET /nosotros 200",
  ];

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/logs") {
      return html(
        page(
          this.title,
          `<h2>Registros de acceso — web-prod-01</h2>
<pre class="lab-file">${this.logs.map(escapeHtml).join("\n")}</pre>
${this.reportForm("")}
<p class="lab-hint">Pista: buscá la IP con muchos <code>401</code> seguidos
(fuerza bruta) y una consulta con <code>UNION SELECT</code> (inyección SQL)
justo antes de un <code>200</code> en <code>/admin</code>.</p>`,
        ),
      );
    }

    if (req.path === "/reportar") {
      const ip = (req.query.ip ?? "").trim();
      const tecnica = (req.query.tecnica ?? "").trim().toLowerCase();
      const ipOk = ip === this.atacante;
      const tecOk = /sql|inyecc|union/.test(tecnica);

      if (ipOk && tecOk) {
        return html(
          page(
            this.title,
            `${notice("Incidente confirmado. Buen trabajo, analista.", "ok")}
<pre class="lab-file">Atacante: ${escapeHtml(ip)}
Técnica: inyección SQL (UNION) tras fuerza bruta de login
Acción: bloquear IP, rotar credenciales, parchear el buscador.
Bandera: ND{forense_intrusion}</pre>`,
          ),
          { debug: { note: "incidente correlacionado" } },
        );
      }
      return html(
        page(
          this.title,
          notice(
            !ip || !tecnica
              ? "Completá IP y técnica."
              : "No coincide con el patrón. Revisá los logs otra vez.",
            "err",
          ) + this.reportForm(ip),
        ),
      );
    }

    return html(
      page(
        this.title,
        `<h2>Panel del analista</h2>
<p>Hubo una alerta en <b>web-prod-01</b>. Revisá los registros y reportá el incidente.</p>
<p><a href="/logs">Ver registros de acceso →</a></p>`,
      ),
    );
  }

  private reportForm(ip: string): string {
    return `
<h3>Reportar incidente</h3>
<form method="GET" action="/reportar">
  ${field("IP del atacante", "ip", "text", ip)}
  ${field("Técnica usada", "tecnica", "text", "")}
  <button type="submit">Reportar</button>
</form>`;
  }
}
