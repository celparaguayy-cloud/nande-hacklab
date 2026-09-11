import {
  html,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { notice, page } from "./layout";

/**
 * ÑANDE CI — laboratorio de DevSecOps (§43).
 *
 * La seguridad no empieza en producción: empieza en el repo y el pipeline.
 * Acá hay dos clásicos que cuestan caro: un secreto commiteado que quedó en
 * la historia de git, y una dependencia con una vulnerabilidad conocida que
 * el pipeline despliega igual. Encontrarlos es la lección de "shift left".
 */
export class CicdLab implements WebApp {
  readonly hostname = "ci.nande";
  readonly title = "ÑANDE CI";
  readonly description = "Pipeline CI/CD ficticio: secretos en el repo y dependencias vulnerables.";
  readonly kind = "panel" as const;

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/repo") return this.repo();
    if (req.path.startsWith("/repo/commit/")) return this.commit(req.path.slice("/repo/commit/".length));
    if (req.path === "/dependencias") return this.deps();
    if (req.path === "/pipeline") return this.pipeline();
    return this.dashboard();
  }

  private dashboard(): HttpResponse {
    return html(page(this.title, `
<h2>ÑANDE CI · pipeline de nimbus/web</h2>
<ul>
  <li><a href="/repo">Repositorio e historial de git →</a></li>
  <li><a href="/dependencias">Dependencias →</a></li>
  <li><a href="/pipeline">Pipeline de despliegue →</a></li>
</ul>
<p class="lab-hint">Pista: revisá el historial de git (los secretos quedan
aunque borres el archivo después) y las versiones de las dependencias.</p>`));
  }

  private repo(): HttpResponse {
    return html(page(this.title, `
<h2>Historial de git</h2>
<pre class="lab-file">a1b2c3  fix: quitar config.env del repo        (hace 2 días)
9f8e7d  feat: agregar despliegue automatico
4d5e6f  chore: subir config.env por error         &lt;-- sospechoso
1122aa  init</pre>
<p>Ver un commit: <a href="/repo/commit/4d5e6f">/repo/commit/4d5e6f</a></p>
<p class="lab-hint">Borraron config.env en un commit posterior, pero en git
NADA se borra: el secreto sigue en el commit donde se subió.</p>`));
  }

  private commit(hash: string): HttpResponse {
    if (hash === "4d5e6f") {
      return html(page(this.title, `
${notice("Secreto encontrado en la historia de git.", "ok")}
<pre class="lab-file">commit 4d5e6f  chore: subir config.env por error
+ config.env:
+   DB_PASSWORD=nimbus2024
+   DEPLOY_TOKEN=ND{devsecops_secreto_filtrado}</pre>
<p class="lab-hint">Defensa: nunca commitear secretos (usar .gitignore +
gestor de secretos). Si pasó, rotar la credencial y purgar la historia.</p>`),
        { debug: { note: "secreto en git" } });
    }
    return html(page(this.title, notice("Ese commit no tiene nada interesante.", "info")));
  }

  private deps(): HttpResponse {
    return html(page(this.title, `
<h2>Dependencias</h2>
<table class="lab-table"><tr><th>Paquete</th><th>Versión</th><th>Estado</th></tr>
<tr><td>express</td><td>4.19.2</td><td style="color:#7ee787">ok</td></tr>
<tr><td>left-pad-nimbus</td><td>1.0.1</td><td style="color:#ff7b72">CVE ÑND-2024-001 (crítica)</td></tr>
</table>
<p class="lab-hint">Una dependencia con una vulnerabilidad conocida crítica se
está desplegando igual. Un escaneo de dependencias (SCA) en el pipeline la
frenaría. Bandera: <code>ND{dependencia_vulnerable}</code> — reportala en el pipeline.</p>`));
  }

  private pipeline(): HttpResponse {
    return html(page(this.title, `
<h2>Pipeline</h2>
<pre class="lab-file">on: push
jobs:
  deploy:
    steps:
      - build
      - deploy   &lt;-- despliega SIN correr tests ni escaneo de seguridad
Env: DEPLOY_TOKEN en texto plano</pre>
<p class="lab-notice lab-notice--ok">Detectaste dos riesgos del pipeline:
despliega sin tests/escaneo y expone el token. ND{dependencia_vulnerable}</p>
<p class="lab-hint">Defensa: "shift left" — tests, SCA y escaneo de secretos
como pasos que BLOQUEAN el despliegue si fallan; secretos por gestor.</p>`),
      { debug: { note: "pipeline inseguro" } });
  }
}
