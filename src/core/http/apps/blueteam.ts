import {
  escapeHtml,
  html,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { field, notice, page } from "./layout";

/**
 * ÑANDE SOC — laboratorio de Blue Team completo.
 *
 * Del otro lado del mostrador: no atacás, DEFENDÉS. Un centro de operaciones
 * de seguridad con cuatro estaciones reales:
 *   /alertas    triage: separar el incidente real de los falsos positivos.
 *   /siem       buscar y correlacionar eventos por IP/palabra.
 *   /logs       los registros crudos del servidor.
 *   /incidente  DFIR: reconstruir la cadena y la causa raíz.
 * Cada estación bien resuelta da su bandera. Enseña el trabajo diario del
 * analista: mirar, correlacionar, concluir.
 */
export class ForensicsApp implements WebApp {
  readonly hostname = "soc.nande";
  readonly title = "ÑANDE SOC";
  readonly description = "Centro de operaciones de seguridad. Blue Team: triage, SIEM y DFIR.";
  readonly kind = "panel" as const;

  private readonly atacante = "10.10.66.13";

  /** Registros crudos: la intrusión mezclada con tráfico normal. */
  private readonly logs = [
    "10.10.66.13 - [09:14:02] GET /login 200",
    "10.10.66.13 - [09:14:05] POST /login 401  usuario=admin",
    "10.10.66.13 - [09:14:06] POST /login 401  usuario=admin",
    "10.10.66.13 - [09:14:07] POST /login 401  usuario=admin",
    "10.10.66.13 - [09:14:09] GET /buscar?q=%27+UNION+SELECT+usuario,password+FROM+usuarios-- 200",
    "10.10.66.13 - [09:14:11] GET /admin 200",
    "10.10.66.13 - [09:14:14] GET /admin/exportar?tabla=clientes 200",
    "10.10.4.7   - [09:15:00] GET /  200",
    "10.10.4.7   - [09:15:20] GET /productos 200",
    "10.10.9.2   - [09:16:41] GET /nosotros 200",
    "10.10.0.5   - [03:00:00] GET /healthz 200  (monitor interno)",
  ];

  /** Cola de alertas: una es real, las demás son falsos positivos. */
  private readonly alertas = [
    { id: "A1", sev: "baja", verdadero: false, texto: "Pico de CPU en web-prod-01 (job de backup 03:00)" },
    { id: "A2", sev: "media", verdadero: false, texto: "10.10.4.7 navegó varias páginas seguidas (usuario real)" },
    { id: "A3", sev: "crítica", verdadero: true, texto: "10.10.66.13: múltiples 401 y luego 200 en /admin tras un UNION SELECT" },
    { id: "A4", sev: "baja", verdadero: false, texto: "Chequeo de salud /healthz desde el monitor interno 10.10.0.5" },
  ];

  handle(req: HttpRequest): HttpResponse {
    switch (req.path) {
      case "/alertas": return this.alertasView(req);
      case "/triage": return this.triage(req);
      case "/siem": return this.siem(req);
      case "/logs": return this.logsView();
      case "/incidente": return this.incidente(req);
      case "/reportar": return this.reportar(req);
      default: return this.dashboard();
    }
  }

  private dashboard(): HttpResponse {
    const abiertas = this.alertas.length;
    return html(page(this.title, `
<h2>Panel del analista · turno mañana</h2>
<p>Hay <b>${abiertas} alertas</b> abiertas en <b>web-prod-01</b>. Tu trabajo:
separá el incidente real, correlacioná en el SIEM y reconstruí qué pasó.</p>
<ul>
  <li><a href="/alertas">1) Cola de alertas — hacé el triage →</a></li>
  <li><a href="/siem">2) SIEM — buscá y correlacioná →</a></li>
  <li><a href="/logs">Registros crudos →</a></li>
  <li><a href="/incidente">3) DFIR — reconstruí el incidente →</a></li>
</ul>`));
  }

  private alertasView(_req: HttpRequest): HttpResponse {
    const filas = this.alertas.map((a) =>
      `<tr><td><a href="/triage?id=${a.id}">${a.id}</a></td>
       <td>${a.sev}</td><td>${escapeHtml(a.texto)}</td></tr>`).join("");
    return html(page(this.title, `
<h2>Cola de alertas</h2>
<table class="lab-table"><tr><th>ID</th><th>Severidad</th><th>Detalle</th></tr>${filas}</table>`));
  }

  private triage(req: HttpRequest): HttpResponse {
    const a = this.alertas.find((x) => x.id === (req.query.id ?? ""));
    if (!a) return html(page(this.title, notice("Alerta inexistente.", "err")), { status: 404 });
    if (a.verdadero) {
      return html(page(this.title, `
${notice("Triage correcto: es un incidente real, no un falso positivo.", "ok")}
<pre class="lab-file">${escapeHtml(a.texto)}
Clasificado como INCIDENTE. Escalado al SIEM.
Bandera: ND{soc_triage}</pre>
<p><a href="/siem?q=10.10.66.13">Ir al SIEM a correlacionar →</a></p>`),
        { debug: { note: "triage ok" } });
    }
    return html(page(this.title, notice(
      `${a.id} es un FALSO POSITIVO (${escapeHtml(a.texto)}). Cerrala y seguí buscando.`, "info")
      + `<p><a href="/alertas">← Volver a la cola</a></p>`));
  }

  private siem(req: HttpRequest): HttpResponse {
    const q = (req.query.q ?? "").trim();
    const hits = q ? this.logs.filter((l) => l.toLowerCase().includes(q.toLowerCase())) : [];
    // Correlación lograda: buscar por la IP del atacante trae toda su cadena.
    const correlado = q === this.atacante && hits.length >= 5;
    return html(page(this.title, `
<h2>SIEM · búsqueda de eventos</h2>
<form method="GET" action="/siem">
  ${field("Consulta (IP o palabra)", "q", "text", q)}
  <button type="submit">Buscar</button>
</form>
${q ? `<pre class="lab-file">${hits.length} eventos\n${hits.map(escapeHtml).join("\n") || "(sin resultados)"}</pre>` : ""}
${correlado ? notice("Correlación lista: todos los eventos del atacante en una sola vista. Bandera: ND{siem_correlacion}", "ok") : ""}`),
      { debug: { note: `siem q=${q}` } });
  }

  private logsView(): HttpResponse {
    return html(page(this.title, `
<h2>Registros de acceso — web-prod-01</h2>
<pre class="lab-file">${this.logs.map(escapeHtml).join("\n")}</pre>
<p><a href="/incidente">Reconstruir el incidente →</a></p>`));
  }

  private incidente(req: HttpRequest): HttpResponse {
    const primero = (req.query.primero ?? "").toLowerCase();
    const causa = (req.query.causa ?? "").toLowerCase();
    if (primero || causa) {
      const primOk = /fuerza|brute|401|login/.test(primero);
      const causaOk = /sql|union|inyecc/.test(causa);
      if (primOk && causaOk) {
        return html(page(this.title, `
${notice("Cadena reconstruida. Causa raíz confirmada.", "ok")}
<pre class="lab-file">Timeline del incidente (web-prod-01):
 1. 09:14:05-07  Fuerza bruta de login (3× 401) desde ${this.atacante}
 2. 09:14:09     Inyeccion SQL (UNION SELECT) -> credenciales
 3. 09:14:11     Acceso a /admin (200)
 4. 09:14:14     Exfiltracion: /admin/exportar?tabla=clientes
Causa raiz: buscador vulnerable a SQLi + sin bloqueo por intentos.
Bandera: ND{dfir_timeline}</pre>`),
          { debug: { note: "timeline reconstruido" } });
      }
      return html(page(this.title, notice("Todavía no cuadra. Mirá el orden en los logs.", "err") + this.incidenteForm()));
    }
    return html(page(this.title, `
<h2>DFIR · reconstrucción</h2>
<p>Con los logs, decí cuál fue el <b>primer</b> paso del ataque y la <b>causa raíz</b>.</p>
${this.incidenteForm()}`));
  }

  private incidenteForm(): string {
    return `
<form method="GET" action="/incidente">
  ${field("Primer paso", "primero", "text", "")}
  ${field("Causa raíz", "causa", "text", "")}
  <button type="submit">Confirmar</button>
</form>`;
  }

  /** Estación heredada: reporte directo (compatibilidad). */
  private reportar(req: HttpRequest): HttpResponse {
    const ip = (req.query.ip ?? "").trim();
    const tecnica = (req.query.tecnica ?? "").trim().toLowerCase();
    if (ip === this.atacante && /sql|inyecc|union/.test(tecnica)) {
      return html(page(this.title, `
${notice("Incidente confirmado. Buen trabajo, analista.", "ok")}
<pre class="lab-file">Atacante: ${escapeHtml(ip)}
Técnica: inyección SQL (UNION) tras fuerza bruta
Bandera: ND{forense_intrusion}</pre>`));
    }
    return html(page(this.title, notice("No coincide con el patrón. Revisá los logs.", "err")
      + `<p><a href="/logs">Ver registros →</a></p>`));
  }
}
