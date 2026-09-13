import {
  html,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { field, notice, page } from "./layout";

/**
 * ÑANDE Purple — laboratorio de Purple Team (§47).
 *
 * Ni solo rojo ni solo azul: los dos a la vez. Se te presenta un incidente
 * (un ataque que ya ocurrió) y tenés que cerrarlo como un equipo morado,
 * respondiendo las cinco preguntas que unen ataque y defensa: qué pasó, cómo
 * se detectó, qué evidencia quedó, qué control falló y cómo se mejora. No es
 * elegir una respuesta de una lista: es entender la cadena completa.
 */
export class PurpleTeam implements WebApp {
  readonly hostname = "purple.nande";
  readonly title = "ÑANDE Purple";
  readonly description = "Ejercicio Purple Team: ataque y defensa en un solo caso.";
  readonly kind = "panel" as const;

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/evaluar") return this.evaluar(req);
    return this.caso();
  }

  private caso(): HttpResponse {
    return html(page(this.title, `
<h2>Ejercicio Purple Team · caso "web-prod-02"</h2>
<pre class="lab-file">Resumen del incidente:
- Un atacante encontró un buscador que armaba la consulta con el texto del
  usuario y sacó la tabla de usuarios con un UNION SELECT.
- Con el hash del admin (MD5 sin sal) lo crackeó por diccionario y entró.
- El WAF no estaba, y el login no bloqueaba por intentos.
- En los logs quedaron los 401 repetidos y la consulta con UNION.</pre>
<p>Cerralo como equipo morado: respondé las cinco preguntas.</p>
${this.form({})}`));
  }

  private evaluar(req: HttpRequest): HttpResponse {
    const q = (k: string) => (req.query[k] ?? "").toLowerCase();
    const queOcurrio = q("que");
    const comoDetecto = q("deteccion");
    const evidencia = q("evidencia");
    const control = q("control");
    const mejora = q("mejora");

    const algo = queOcurrio || comoDetecto || evidencia || control || mejora;
    if (!algo) return html(page(this.title, this.caso().body));

    const ok1 = /sql|inyecc|union/.test(queOcurrio);
    const ok2 = /log|401|siem|alerta|patr/.test(comoDetecto);
    const ok3 = /log|union|consulta|hash|registro/.test(evidencia);
    const ok4 = /valida|parametr|prepared|rate|intento|waf|sal|hash/.test(control);
    const ok5 = /parametr|prepared|rate|mfa|sal|bcrypt|waf|monitoreo|escaneo/.test(mejora);
    const total = [ok1, ok2, ok3, ok4, ok5].filter(Boolean).length;

    if (total === 5) {
      return html(page(this.title, `
${notice("Ejercicio Purple Team aprobado: entendiste la cadena completa.", "ok")}
<pre class="lab-file">1. Qué pasó: inyección SQL (UNION) + crackeo del hash débil.
2. Detección: 401 repetidos + la consulta con UNION en los logs/SIEM.
3. Evidencia: los registros de acceso con la inyección y los intentos.
4. Control que falló: sin consultas parametrizadas, sin rate limit, hash sin sal.
5. Mejora: prepared statements + bcrypt con sal + rate limit + WAF + monitoreo.
Bandera: ND{purple_team}</pre>`),
        { debug: { note: "purple aprobado" } });
    }
    return html(page(this.title, `
${notice(`Vas ${total}/5. Repasá las que faltan y reforzá con palabras concretas.`, "info")}
${this.form(req.query)}`));
  }

  private form(v: Record<string, string>): string {
    return `
<form method="GET" action="/evaluar">
  ${field("1) ¿Qué ocurrió? (técnica)", "que", "text", v.que ?? "")}
  ${field("2) ¿Cómo se detectó?", "deteccion", "text", v.deteccion ?? "")}
  ${field("3) ¿Qué evidencia quedó?", "evidencia", "text", v.evidencia ?? "")}
  ${field("4) ¿Qué control falló?", "control", "text", v.control ?? "")}
  ${field("5) ¿Cómo se mejora?", "mejora", "text", v.mejora ?? "")}
  <button type="submit">Evaluar</button>
</form>`;
  }
}
