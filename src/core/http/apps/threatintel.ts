import {
  escapeHtml,
  html,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { field, notice, page } from "./layout";
import { THREAT_ACTORS } from "../../threat/ThreatActors";

/**
 * ÑANDE TIP — plataforma de Threat Intelligence (§35).
 *
 * Del lado del analista de inteligencia: no todos los datos valen lo mismo.
 * Hay indicadores (IOCs) con distinta CONFIANZA de fuente, actores ficticios
 * con su infraestructura conocida, y campañas. El trabajo es correlacionar:
 * un IOC de una muestra (el dominio C2 que sacaste con cuckoo) apunta a un
 * actor. Atribuir bien —y no dejarse llevar por un rumor— es la bandera.
 */

interface Indicator {
  valor: string;
  tipo: "dominio" | "hash" | "ip" | "mutex";
  confianza: "alta" | "media" | "baja";
  fuente: string;
}

const INDICADORES: Indicator[] = [
  { valor: "update.badcorp.invalid", tipo: "dominio", confianza: "alta", fuente: "Sandbox interno (cuckoo)" },
  { valor: "NANDE_LOCK", tipo: "mutex", confianza: "alta", fuente: "Sandbox interno (cuckoo)" },
  { valor: "e3b0c44298fc1c14", tipo: "hash", confianza: "media", fuente: "Feed comunitario" },
  { valor: "203.0.113.66", tipo: "ip", confianza: "baja", fuente: "Rumor en foro (sin confirmar)" },
];

// Los actores salen del registro ÚNICO (regla 2): estos son EXACTAMENTE los que
// atacan tu data center (ThreatEngine) y corren kill-chains (RedTeamAgent), así
// que la atribución del curso se apoya en ataques reales del mundo (regla 16).
const ACTORES = THREAT_ACTORS;

export class ThreatIntel implements WebApp {
  readonly hostname = "ti.nande";
  readonly title = "ÑANDE TIP";
  readonly description = "Plataforma de Threat Intelligence: indicadores, actores y atribución.";
  readonly kind = "panel" as const;

  handle(req: HttpRequest): HttpResponse {
    switch (req.path) {
      case "/indicadores": return this.indicadores();
      case "/actores": return this.actores();
      case "/atribuir": return this.atribuir(req);
      default: return this.dashboard();
    }
  }

  private dashboard(): HttpResponse {
    return html(page(this.title, `
<h2>Plataforma de inteligencia</h2>
<p>Correlacioná lo que sabés. Un IOC bien atribuido vale más que mil rumores.</p>
<ul>
  <li><a href="/indicadores">Indicadores (IOCs) y su confianza →</a></li>
  <li><a href="/actores">Actores conocidos y su infraestructura →</a></li>
  <li><a href="/atribuir">Atribuir un incidente →</a></li>
</ul>`));
  }

  private indicadores(): HttpResponse {
    const filas = INDICADORES.map((i) => {
      const color = i.confianza === "alta" ? "#7ee787" : i.confianza === "media" ? "#f5b544" : "#ff7b72";
      return `<tr><td><code>${escapeHtml(i.valor)}</code></td><td>${i.tipo}</td>
        <td style="color:${color}">${i.confianza}</td><td>${escapeHtml(i.fuente)}</td></tr>`;
    }).join("");
    return html(page(this.title, `
<h2>Indicadores</h2>
<table class="lab-table"><tr><th>Valor</th><th>Tipo</th><th>Confianza</th><th>Fuente</th></tr>${filas}</table>`));
  }

  private actores(): HttpResponse {
    const cards = ACTORES.map((a) => `
<div class="lab-actor">
  <strong>${escapeHtml(a.nombre)}</strong> <span class="tag">${escapeHtml(a.alias)}</span>
  <div>${escapeHtml(a.motivacion)}</div>
  <div style="opacity:.8;font-size:12px">Infra: ${a.infra.map(escapeHtml).join(", ")}</div>
</div>`).join("");
    return html(page(this.title, `<h2>Actores</h2>${cards}`));
  }

  private atribuir(req: HttpRequest): HttpResponse {
    const ioc = (req.query.ioc ?? "").trim().toLowerCase();
    const actor = (req.query.actor ?? "").trim().toLowerCase();
    if (ioc || actor) {
      // El IOC del feed marcado como RUMOR (baja confianza) nunca atribuye:
      // acusar con eso es el error clásico de inteligencia.
      const rumor = ioc === "203.0.113.66";
      if (rumor) {
        return html(page(this.title, notice(
          "Atribuiste con un indicador de confianza BAJA (un rumor sin confirmar). En inteligencia, eso es un error: podés acusar al equivocado.", "err") + this.form(req)));
      }
      // Atribución correcta = nombrás un actor DOCUMENTADO (por alias o nombre,
      // aunque sea parcial: "gris" → GRIS FANTASMA) Y el IOC pertenece a SU
      // infraestructura confirmada (regla 16: cualquiera de los actores que te
      // ataca es atribuible con el IOC que dejó, no sólo uno hardcodeado). El
      // IOC desempata: sólo cierra el actor cuya infra contiene ese indicador.
      const found =
        actor.length >= 3
          ? THREAT_ACTORS.find(
              (a) =>
                (a.alias.toLowerCase().includes(actor) || a.nombre.toLowerCase().includes(actor)) &&
                a.infra.some((i) => i.toLowerCase() === ioc),
            )
          : undefined;
      if (found) {
        return html(page(this.title, `
${notice("Atribución correcta y bien fundada.", "ok")}
<pre class="lab-file">IOC: ${escapeHtml(ioc)} (confianza alta, infraestructura confirmada)
Actor: ${escapeHtml(found.nombre)} (${escapeHtml(found.alias)}) — ${escapeHtml(found.motivacion)}
Infraestructura compartida confirmada.
Bandera: ND{ti_atribucion}</pre>`),
          { debug: { note: `atribución correcta: ${found.id}` } });
      }
      return html(page(this.title, notice(
        "No cierra. Usá un IOC de confianza alta y el actor cuya infraestructura coincide.", "err") + this.form(req)));
    }
    return html(page(this.title, `<h2>Atribuir incidente</h2>
<p>¿A qué actor pertenece el ataque? Fundamentá con un IOC.</p>${this.form(req)}`));
  }

  private form(req: HttpRequest): string {
    return `
<form method="GET" action="/atribuir">
  ${field("IOC", "ioc", "text", req.query.ioc ?? "")}
  ${field("Actor", "actor", "text", req.query.actor ?? "")}
  <button type="submit">Atribuir</button>
</form>`;
  }
}
