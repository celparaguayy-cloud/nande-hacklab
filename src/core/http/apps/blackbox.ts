import {
  escapeHtml,
  html,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { notice, page } from "./layout";
import { field } from "./layout";

/**
 * ÑANDE Blackbox — el examen final.
 *
 * No hay guía. Te dan una organización ficticia desconocida y una sola
 * frase: "algo está ocurriendo". Tenés que investigar de cero: reconocer
 * qué hay, encontrar la falla, seguir la evidencia y entregar un informe
 * con vulnerabilidad, causa raíz, impacto y mitigación. Combina todo lo
 * aprendido —ataque, defensa y documentación— en un solo desafío.
 */
export class NandeBlackbox implements WebApp {
  readonly hostname = "blackbox.nande";
  readonly title = "Corporación Nimbus";
  readonly description = "Examen final ÑANDE Blackbox: investigá la organización.";
  readonly kind = "portal" as const;

  handle(req: HttpRequest): HttpResponse {
    switch (req.path) {
      case "/robots.txt": return this.robots();
      case "/api/clientes": return this.api(req);
      case "/respaldos": return this.respaldos();
      case "/respaldos/access.log": return this.accessLog();
      case "/informe": return this.informe(req);
      default: return this.home();
    }
  }

  private home(): HttpResponse {
    return html(page(this.title, `
<h2>Corporación Nimbus</h2>
<p>Soluciones en la nube para todo el mundo.</p>
<p class="lab-notice lab-notice--info"><b>Examen ÑANDE Blackbox.</b> Algo está
ocurriendo en esta organización. Nadie te va a decir qué. Investigá vos:
¿qué hay?, ¿qué falla?, ¿qué pasó?, ¿cuál es la causa? Cuando lo tengas,
entregá tu <a href="/informe">informe</a>.</p>
<p style="opacity:.6">Pista de arranque: un buen recon empieza mirando qué
le pide un sitio a los buscadores…</p>`));
  }

  private robots(): HttpResponse {
    return html(page(this.title, `<pre class="lab-file">User-agent: *
Disallow: /api/clientes
Disallow: /respaldos
</pre>`),
      { debug: { note: "robots.txt filtra rutas" } });
  }

  private api(req: HttpRequest): HttpResponse {
    const id = (req.query.id ?? "").trim();
    // Falla 1: IDOR — no valida de quién es el registro. id=42 es interno.
    const registros: Record<string, string> = {
      "1": '{ "id":1, "nombre":"Cliente Demo", "rol":"user" }',
      "42": '{ "id":42, "nombre":"admin.interno", "rol":"admin", "nota":"reusa la clave del panel" }',
    };
    if (!id) {
      return html(page(this.title, `<pre class="lab-file">Uso: /api/clientes?id=N</pre>`));
    }
    const reg = registros[id];
    return html(page(this.title, `<pre class="lab-file">GET /api/clientes?id=${escapeHtml(id)}
${reg ?? '{ "error": "no existe" }'}</pre>
${id === "42" ? notice("Encontraste una cuenta interna expuesta por IDOR.", "ok") : ""}`),
      { debug: { note: `IDOR id=${id}` } });
  }

  private respaldos(): HttpResponse {
    return html(page(this.title, `<h2>Índice de /respaldos</h2>
<pre class="lab-file">clientes-2024.sql        (2.1 MB)
access.log               (14 KB)</pre>
<p><a href="/respaldos/access.log">Ver access.log →</a></p>`));
  }

  private accessLog(): HttpResponse {
    return html(page(this.title, `<pre class="lab-file">198.51.100.7 [02:10] GET /api/clientes?id=1 200
198.51.100.7 [02:10] GET /api/clientes?id=2 200
198.51.100.7 [02:11] GET /api/clientes?id=42 200   <-- accedió a la cuenta interna
198.51.100.7 [02:12] POST /panel/login usuario=admin.interno 200
198.51.100.7 [02:13] GET /respaldos/clientes-2024.sql 200   <-- exfiltró la base
</pre>`),
      { debug: { note: "evidencia de intrusión" } });
  }

  private informe(req: HttpRequest): HttpResponse {
    const vuln = (req.query.vuln ?? "").toLowerCase();
    const causa = (req.query.causa ?? "").toLowerCase();
    const impacto = (req.query.impacto ?? "").toLowerCase();
    const mitig = (req.query.mitigacion ?? "").toLowerCase();

    if (vuln || causa || impacto || mitig) {
      const vulnOk = /idor|referencia|acceso/.test(vuln);
      const causaOk = /autoriz|permis|dueñ|owner|valida/.test(causa);
      const impactoOk = /exfil|fuga|base|datos|clientes|backup|respaldo/.test(impacto);
      const mitigOk = /autoriz|permis|control|acceso|servidor|validar/.test(mitig);
      const ok = vulnOk && causaOk && impactoOk && mitigOk;
      if (ok) {
        return html(page(this.title, `
${notice("Informe aceptado. Examen ÑANDE Blackbox APROBADO.", "ok")}
<pre class="lab-file">Vulnerabilidad: IDOR en /api/clientes
Causa raíz: falta de control de autorización por objeto
Impacto: exfiltración de la base de clientes (backup expuesto)
Mitigación: validar el dueño/permiso en el servidor por cada recurso;
            no exponer backups ni logs.
Veredicto: COMPETENTE. Bandera: ND{blackbox_aprobado}</pre>
<p>🏅 Demostraste investigar de cero: recon → hallazgo → evidencia → informe.</p>`),
          { debug: { note: "blackbox aprobado" } });
      }
      return html(page(this.title, notice(
        "El informe todavía no cierra. Revisá cada campo con lo que encontraste.", "err")
        + this.form(req)));
    }
    return html(page(this.title, `<h2>Informe del incidente</h2>
<p>Entregá tus conclusiones. Sé concreto en cada campo.</p>${this.form(req)}`));
  }

  private form(req: HttpRequest): string {
    return `
<form method="GET" action="/informe">
  ${field("Vulnerabilidad", "vuln", "text", req.query.vuln ?? "")}
  ${field("Causa raíz", "causa", "text", req.query.causa ?? "")}
  ${field("Impacto", "impacto", "text", req.query.impacto ?? "")}
  ${field("Mitigación", "mitigacion", "text", req.query.mitigacion ?? "")}
  <button type="submit">Entregar informe</button>
</form>`;
  }
}
