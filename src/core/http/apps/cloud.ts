import {
  html,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { notice, page } from "./layout";

/**
 * Nimbus Cloud — consola de nube ficticia (§40-42).
 *
 * Los errores más caros de la nube no son exploits: son CONFIGURACIONES.
 * Un bucket público, una política IAM con permisos de más, un contenedor
 * privilegiado con secretos en las variables. Este lab deja tocar las tres
 * y ver por qué duelen —y cómo se arreglan.
 */
export class NimbusCloud implements WebApp {
  readonly hostname = "cloud.nande";
  readonly title = "Nimbus Cloud";
  readonly description = "Consola de nube ficticia: almacenamiento, IAM y contenedores.";
  readonly kind = "panel" as const;

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/buckets") return this.buckets();
    if (req.path.startsWith("/buckets/")) return this.bucket(req.path.slice("/buckets/".length));
    if (req.path === "/iam") return this.iam();
    if (req.path === "/iam/asumir") return this.asumir(req);
    if (req.path === "/contenedores") return this.contenedores();
    if (req.path.startsWith("/contenedores/")) return this.contenedor(req.path.slice("/contenedores/".length));
    return this.dashboard();
  }

  private dashboard(): HttpResponse {
    return html(page(this.title, `
<h2>Nimbus Cloud · consola</h2>
<p>Tres servicios, tres configuraciones para auditar.</p>
<ul>
  <li><a href="/buckets">Almacenamiento (buckets) →</a></li>
  <li><a href="/iam">IAM · roles y políticas →</a></li>
  <li><a href="/contenedores">Contenedores →</a></li>
</ul>`));
  }

  // ---- Almacenamiento ----
  private buckets(): HttpResponse {
    return html(page(this.title, `
<h2>Buckets</h2>
<table class="lab-table"><tr><th>Nombre</th><th>Acceso</th></tr>
<tr><td><a href="/buckets/nimbus-privado">nimbus-privado</a></td><td>privado</td></tr>
<tr><td><a href="/buckets/nimbus-backups">nimbus-backups</a></td><td style="color:#ff7b72">PÚBLICO</td></tr>
</table>`));
  }

  private bucket(name: string): HttpResponse {
    if (name === "nimbus-backups") {
      return html(page(this.title, `
${notice("Bucket público: accesible sin credenciales.", "ok")}
<pre class="lab-file">GET /buckets/nimbus-backups  (acceso anónimo)
- clientes.csv
- .env  (¡secretos!)  DB_PASS=nimbus2024  API_KEY=ND{cloud_bucket_publico}
</pre>`),
        { debug: { note: "bucket público" } });
    }
    if (name === "nimbus-privado") {
      return html(page(this.title, notice("403 · Acceso denegado. Necesitás credenciales.", "err")), { status: 403 });
    }
    return html(page(this.title, notice("Bucket inexistente.", "err")), { status: 404 });
  }

  // ---- IAM ----
  private iam(): HttpResponse {
    return html(page(this.title, `
<h2>IAM · roles</h2>
<table class="lab-table"><tr><th>Rol</th><th>Política</th></tr>
<tr><td>lector-reportes</td><td>s3:GetObject en reportes/*</td></tr>
<tr><td>deploy-bot</td><td style="color:#ff7b72">Action: * · Resource: * (¡todo!)</td></tr>
</table>
<p>Asumir un rol: <a href="/iam/asumir?rol=deploy-bot">/iam/asumir?rol=deploy-bot</a></p>`));
  }

  private asumir(req: HttpRequest): HttpResponse {
    const rol = (req.query.rol ?? "").trim();
    if (rol === "deploy-bot") {
      return html(page(this.title, `
${notice("Rol asumido: deploy-bot (Action:* Resource:*).", "ok")}
<pre class="lab-file">Ahora podés hacer CUALQUIER cosa en la cuenta:
crear usuarios, leer todos los buckets, borrar logs.
Escalada por IAM permisivo. Bandera: ND{iam_permisivo}</pre>`),
        { debug: { note: "IAM permisivo" } });
    }
    if (rol === "lector-reportes") {
      return html(page(this.title, notice("Rol asumido: solo lectura de reportes/*. Poco alcance.", "info")));
    }
    return html(page(this.title, notice("Rol desconocido.", "err")), { status: 404 });
  }

  // ---- Contenedores ----
  private contenedores(): HttpResponse {
    return html(page(this.title, `
<h2>Contenedores</h2>
<table class="lab-table"><tr><th>ID</th><th>Imagen</th><th>Config</th></tr>
<tr><td><a href="/contenedores/web-01">web-01</a></td><td>nimbus/web:1.4</td><td>estándar</td></tr>
<tr><td><a href="/contenedores/job-07">job-07</a></td><td>nimbus/job:2.0</td><td style="color:#ff7b72">privilegiado</td></tr>
</table>`));
  }

  private contenedor(id: string): HttpResponse {
    if (id === "job-07") {
      return html(page(this.title, `
${notice("Contenedor mal configurado.", "ok")}
<pre class="lab-file">docker inspect job-07
  Privileged: true
  Mounts: /var/run/docker.sock -> /var/run/docker.sock
  Env: AWS_SECRET=nimbus-... ADMIN_TOKEN=ND{contenedor_inseguro}
Con el socket de Docker montado y privilegios, se escapa al host.</pre>`),
        { debug: { note: "contenedor inseguro" } });
    }
    if (id === "web-01") {
      return html(page(this.title, notice("web-01: sin privilegios, sin secretos expuestos. Correcto.", "info")));
    }
    return html(page(this.title, notice("Contenedor inexistente.", "err")), { status: 404 });
  }
}
