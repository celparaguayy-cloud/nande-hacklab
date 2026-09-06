import {
  escapeHtml,
  html,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { field, notice, page } from "./layout";

/**
 * Yvoty Blog — laboratorio de XSS reflejado.
 *
 * El buscador devuelve el término tal cual, sin escapar. Un
 * <script>...</script> en ?q= se refleja en la página: el clásico XSS
 * reflejado. El "navegador" de ÑANDE detecta el script inyectado y otorga
 * la bandera, en vez de ejecutarlo de verdad.
 */
export class BlogApp implements WebApp {
  readonly hostname = "blog.yvoty.nande";
  readonly title = "Yvoty Blog";
  readonly description = "Blog de noticias. Buscador vulnerable a XSS reflejado.";
  readonly kind = "blog" as const;

  handle(req: HttpRequest): HttpResponse {
    if (req.path !== "/" && req.path !== "/buscar") {
      return html(page(this.title, notice("No encontrado.", "err")), {
        status: 404,
      });
    }

    const q = req.query.q ?? "";

    // La vulnerabilidad: el término se inserta SIN escapar.
    const reflejo = q
      ? `<div class="lab-reflect">Resultados para: ${q}</div>`
      : "";

    const body = `
<p>El blog de la ciudad. Buscá una nota.</p>
<form method="GET" action="/buscar">
  ${field("Buscar", "q", "text", q)}
  <button type="submit">Buscar</button>
</form>
${reflejo}
<p class="lab-hint">Pista: lo que buscás se muestra tal cual, sin filtrar.
Probá <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> en la búsqueda.</p>`;

    return html(page(this.title, body));
  }
}

/**
 * Fotos Arandú — laboratorio de IDOR (referencia directa insegura).
 *
 * Cada álbum se ve por ?id=. El servidor no comprueba de quién es: cambiar
 * el número muestra el álbum privado de otra persona, y el álbum 7 tiene
 * la bandera.
 */
export class PhotosApp implements WebApp {
  readonly hostname = "fotos.arandu.nande";
  readonly title = "Fotos Arandú";
  readonly description = "Álbumes de fotos. Vulnerable a IDOR por ?id=.";
  readonly kind = "otro" as const;

  private albums: Record<number, { dueno: string; privado: boolean; contenido: string }> = {
    1: { dueno: "vos", privado: false, contenido: "Tus vacaciones en Areguá." },
    2: { dueno: "vos", privado: false, contenido: "Cumpleaños." },
    5: { dueno: "gabriela", privado: true, contenido: "Documentos escaneados de Gabriela." },
    7: {
      dueno: "admin",
      privado: true,
      contenido:
        "Álbum privado del admin. Bandera: ND{idor_album_ajeno}",
    },
  };

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/album") {
      const id = Number(req.query.id ?? 1);
      const album = this.albums[id];

      if (!album) {
        return html(
          page(this.title, notice(`No existe el álbum #${id}.`, "err")),
          { status: 404 },
        );
      }

      // El fallo: nunca se comprueba que el álbum sea tuyo.
      const body = `
${notice(`Álbum #${id} — de <strong>${escapeHtml(album.dueno)}</strong>`, "info")}
<div class="lab-card">${escapeHtml(album.contenido)}</div>
<p><a href="/">Volver</a></p>`;

      return html(page(this.title, body), {
        debug: { note: `Se pidió el álbum ${id} sin verificar dueño` },
      });
    }

    const body = `
<p>Tus álbumes:</p>
<ul>
  <li><a href="/album?id=1">Álbum #1</a></li>
  <li><a href="/album?id=2">Álbum #2</a></li>
</ul>
<p class="lab-hint">Pista: los álbumes se ven por <code>?id=</code> y el
servidor no comprueba de quién son. ¿Qué hay en otros números?</p>`;

    return html(page(this.title, body));
  }
}

/**
 * Archivos Tapé — laboratorio de path traversal.
 *
 * Un visor de documentos que sirve ?archivo= desde una carpeta pública.
 * No sanea la ruta, así que ../../ escapa a un "sistema de archivos" del
 * servidor y llega a un archivo de configuración con secretos.
 */
export class FilesApp implements WebApp {
  readonly hostname = "docs.tape.nande";
  readonly title = "Archivos Tapé";
  readonly description = "Visor de documentos. Vulnerable a path traversal.";
  readonly kind = "otro" as const;

  /** "Sistema de archivos" del servidor. */
  private fs: Record<string, string> = {
    "public/manual.txt": "Manual de uso del visor. Nada interesante acá.",
    "public/precios.txt": "Lista de precios pública.",
    "config/secrets.env":
      "DB_PASS=Tap3-r00t\nFLAG=ND{path_traversal_secreto}",
    "config/app.ini": "modo=produccion\ndebug=false",
  };

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/ver") {
      const pedido = req.query.archivo ?? "";

      // La vulnerabilidad: se antepone la carpeta pública pero no se
      // normaliza la ruta, así que ../ escapa.
      const resuelto = normalizar(`public/${pedido}`);
      const contenido = this.fs[resuelto];

      if (contenido === undefined) {
        return html(
          page(
            this.title,
            notice(`No se pudo abrir: ${escapeHtml(resuelto)}`, "err"),
          ),
          { status: 404, debug: { note: `ruta resuelta: ${resuelto}` } },
        );
      }

      const body = `
${notice(`Mostrando <code>${escapeHtml(resuelto)}</code>`, "info")}
<pre class="lab-file">${escapeHtml(contenido)}</pre>
<p><a href="/">Volver</a></p>`;

      return html(page(this.title, body), {
        debug: { note: `ruta resuelta: ${resuelto}` },
      });
    }

    const body = `
<p>Documentos públicos:</p>
<ul>
  <li><a href="/ver?archivo=manual.txt">manual.txt</a></li>
  <li><a href="/ver?archivo=precios.txt">precios.txt</a></li>
</ul>
<p class="lab-hint">Pista: el visor abre <code>public/&lt;archivo&gt;</code>.
¿Y si el archivo empieza con <code>../</code>? Hay un
<code>config/secrets.env</code> fuera de la carpeta pública.</p>`;

    return html(page(this.title, body));
  }
}

/**
 * Herramientas Pytã — laboratorio de inyección de comandos.
 *
 * Una herramienta de "ping" que pasa el host a un comando de sistema sin
 * sanear. Un `;` o `&&` encadena otro comando. El servidor simula un
 * mini-shell con unos pocos comandos, uno de los cuales revela la bandera.
 */
export class ToolsApp implements WebApp {
  readonly hostname = "tools.pyta.nande";
  readonly title = "Herramientas Pytã";
  readonly description = "Utilidad de red. Vulnerable a inyección de comandos.";
  readonly kind = "panel" as const;

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/ping") {
      const host = (req.query.host ?? req.body.host ?? "").trim();

      // La vulnerabilidad: el host va directo a la "línea de comandos".
      const comando = `ping -c1 ${host}`;
      const salida = ejecutarShell(comando);

      const body = `
${this.form(host)}
<pre class="lab-file">$ ${escapeHtml(comando)}\n${escapeHtml(salida)}</pre>
<p class="lab-hint">Pista: el host se pasa a un comando de sistema sin
filtrar. Encadená otro con <code>;</code> — probá
<code>127.0.0.1; whoami</code> o <code>127.0.0.1; cat flag</code>.</p>`;

      return html(page(this.title, body), { debug: { note: comando } });
    }

    return html(page(this.title, this.form("")));
  }

  private form(value: string): string {
    return `
<p>Verificá si un host responde.</p>
<form method="GET" action="/ping">
  ${field("Host", "host", "text", value)}
  <button type="submit">Ping</button>
</form>`;
  }
}

/* ================================================================
   Ayudantes de simulación
   ================================================================ */

/** Normaliza una ruta resolviendo ../ y ./ — pero SIN encerrarla, que es
    justo el bug del laboratorio de traversal. */
function normalizar(path: string): string {
  const partes: string[] = [];

  for (const seg of path.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") partes.pop();
    else partes.push(seg);
  }

  return partes.join("/");
}

/** Mini-shell del laboratorio de inyección de comandos. */
function ejecutarShell(comando: string): string {
  // Se parte por los separadores de comandos, como haría un shell real.
  const trozos = comando.split(/\s*(?:;|&&|\|\|)\s*/).filter(Boolean);
  const salidas: string[] = [];

  for (const trozo of trozos) {
    const [cmd, ...args] = trozo.trim().split(/\s+/);

    switch (cmd) {
      case "ping":
        salidas.push(
          `PING ${args[args.length - 1] ?? ""}: 64 bytes, tiempo=0.3ms`,
        );
        break;
      case "whoami":
        salidas.push("www-data");
        break;
      case "id":
        salidas.push("uid=33(www-data) gid=33(www-data)");
        break;
      case "ls":
        salidas.push("app.js  flag  index.html");
        break;
      case "cat":
        salidas.push(
          args.includes("flag")
            ? "ND{cmd_injection_pwned}"
            : `cat: ${args[0] ?? ""}: no existe`,
        );
        break;
      case "uname":
        salidas.push("Linux pyta-tools 6.1.0-nande");
        break;
      default:
        salidas.push(`${cmd}: comando no encontrado`);
    }
  }

  return salidas.join("\n");
}
