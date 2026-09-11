import {
  escapeHtml,
  html,
  type HttpRequest,
  type HttpResponse,
  type WebApp,
} from "../types";
import { field, notice, page } from "./layout";

/**
 * Cuarta tanda de laboratorios web de ÑANDE: SSTI, XXE, inyección NoSQL y
 * condición de carrera (TOCTOU). Cada uno es un fallo real, atacable por el
 * motor HTTP, con su bandera ND{...}.
 */

/* ================================================================
   SSTI — Server-Side Template Injection
   ================================================================ */

/**
 * Codeá Saludos — laboratorio de SSTI.
 *
 * Arma el saludo metiendo tu nombre DENTRO de la plantilla, así que lo que
 * pongas entre {{ }} se evalúa en el servidor. {{7*7}} devuelve 49 (prueba
 * de ejecución); llegar al contexto del servidor revela la bandera.
 */
export class SstiApp implements WebApp {
  readonly hostname = "saludos.codea.nande";
  readonly title = "Codeá Saludos";
  readonly description = "Generador de saludos. Vulnerable a SSTI.";
  readonly kind = "otro" as const;

  // Contexto del servidor al que NO deberías poder llegar desde la plantilla.
  private readonly contexto: Record<string, string> = {
    empresa: "Codeá",
    secreto: "ND{ssti_contexto_expuesto}",
  };

  /** Evalúa una expresión de plantilla {{...}} (a propósito, de más). */
  private evalExpr(expr: string): string {
    const e = expr.trim();
    // Aritmética simple: la prueba clásica {{7*7}} = 49.
    const m = e.match(/^(\d+)\s*([-+*/])\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]), b = Number(m[3]);
      const r = m[2] === "+" ? a + b : m[2] === "-" ? a - b : m[2] === "*" ? a * b : b ? a / b : 0;
      return String(r);
    }
    // Acceso al contexto del servidor (config, variables, secretos).
    if (e === "config" || e === "self" || e === "contexto") {
      return JSON.stringify(this.contexto);
    }
    if (e in this.contexto) return this.contexto[e];
    return "";
  }

  handle(req: HttpRequest): HttpResponse {
    const nombre = req.query.nombre ?? "";
    // La vulnerabilidad: el nombre se inserta en la plantilla y se evalúa.
    const plantilla = `Hola ${nombre}, ¡bienvenido!`;
    const render = plantilla.replace(/\{\{([^}]*)\}\}/g, (_, expr) => this.evalExpr(String(expr)));

    const body = `
<form method="GET" action="/">
  ${field("Tu nombre", "nombre", "text", nombre)}
  <button type="submit">Saludar</button>
</form>
${nombre ? `<div class="lab-reflect">${escapeHtml(render)}</div>` : ""}
<p class="lab-hint">Pista: tu nombre entra en la plantilla del servidor.
Probá <code>{{7*7}}</code> (debería dar 49) y después
<code>{{secreto}}</code> o <code>{{config}}</code>.</p>`;

    return html(page(this.title, body), { debug: { note: `render: ${render}` } });
  }
}

/* ================================================================
   XXE — XML External Entity
   ================================================================ */

/**
 * Nova Importador — laboratorio de XXE.
 *
 * Importás datos en XML. El parser resuelve entidades externas, así que un
 * <!ENTITY ... SYSTEM "file://..."> hace que el servidor lea archivos suyos
 * y los meta en la respuesta.
 */
export class XxeApp implements WebApp {
  readonly hostname = "import.nova.nande";
  readonly title = "Nova Importador";
  readonly description = "Importador de XML. Vulnerable a XXE.";
  readonly kind = "panel" as const;

  // "Disco" del servidor accesible por file://
  private readonly archivos: Record<string, string> = {
    "/etc/passwd": "root:x:0:0:root:/root:/bin/bash",
    "/etc/nova/secret": "ND{xxe_archivo_leido}",
  };

  handle(req: HttpRequest): HttpResponse {
    const xml = req.body.xml ?? req.query.xml ?? "";
    let salida = "";

    if (xml) {
      // La vulnerabilidad: se resuelven entidades externas SYSTEM file://.
      const ent = xml.match(/<!ENTITY\s+(\w+)\s+SYSTEM\s+"file:\/\/([^"]+)"\s*>/i);
      let resuelto = xml;
      if (ent) {
        const [, nombre, ruta] = ent;
        const contenido = this.archivos[ruta] ?? `(archivo no encontrado: ${ruta})`;
        // Sustituye &nombre; por el contenido del archivo.
        resuelto = resuelto.replace(new RegExp(`&${nombre};`, "g"), contenido);
      }
      // Extrae el texto de <nota>...</nota> ya con las entidades resueltas.
      const cuerpo = resuelto.match(/<nota>([\s\S]*?)<\/nota>/i);
      salida = cuerpo ? cuerpo[1] : resuelto;
    }

    const ejemplo = `<?xml version="1.0"?>
<!DOCTYPE nota [<!ENTITY xxe SYSTEM "file:///etc/nova/secret">]>
<nota>&xxe;</nota>`;

    const body = `
<p>Pegá un XML con una nota para importar.</p>
<form method="POST" action="/">
  ${field("XML", "xml", "text", xml)}
  <button type="submit">Importar</button>
</form>
${xml ? `<pre class="lab-file">Nota importada:\n${escapeHtml(salida)}</pre>` : ""}
<p class="lab-hint">Pista: el parser resuelve entidades externas. Probá:
<br><code>${escapeHtml(ejemplo)}</code></p>`;

    return html(page(this.title, body), { debug: { note: "parse XML con entidades externas" } });
  }
}

/* ================================================================
   NoSQL injection
   ================================================================ */

/**
 * Redix Login — laboratorio de inyección NoSQL.
 *
 * El login arma una consulta tipo Mongo con lo que mandás. Si en vez de una
 * contraseña mandás un operador ({"$ne": null}), la consulta hace "match"
 * con cualquiera y entrás sin saber la clave.
 */
export class NoSqlApp implements WebApp {
  readonly hostname = "login.redix.nande";
  readonly title = "Redix Login";
  readonly description = "Login estilo Mongo. Vulnerable a inyección NoSQL.";
  readonly kind = "panel" as const;

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/entrar") {
      const usuario = (req.query.usuario ?? req.body.usuario ?? "").trim();
      const passRaw = (req.query.password ?? req.body.password ?? "").trim();

      // Se intenta parsear la contraseña como objeto (como haría un body JSON).
      let passCond: unknown = passRaw;
      try {
        if (passRaw.startsWith("{")) passCond = JSON.parse(passRaw);
      } catch {
        /* queda como string */
      }

      // La vulnerabilidad: un operador como {$ne:null} matchea cualquier clave.
      const esOperador =
        passCond !== null &&
        typeof passCond === "object" &&
        Object.keys(passCond as object).some((k) => k.startsWith("$"));

      const claveReal = "s3cr3t-redix";
      const autenticado = usuario === "admin" && (esOperador || passCond === claveReal);

      if (autenticado) {
        return html(
          page(
            this.title,
            `${notice("Sesión iniciada como admin.", "ok")}
<pre class="lab-file">Bienvenido, admin.
${esOperador ? "Entraste con un operador NoSQL, sin saber la contraseña." : ""}
Bandera: ND{nosql_auth_bypass}</pre>`,
          ),
          { debug: { note: `query: {usuario:'${usuario}', password:${JSON.stringify(passCond)}}` } },
        );
      }
      return html(page(this.title, notice("Credenciales inválidas.", "err") + this.form()));
    }
    return html(page(this.title, this.form()));
  }

  private form(): string {
    return `
<p>Ingresá a tu cuenta.</p>
<form method="GET" action="/entrar">
  ${field("Usuario", "usuario", "text", "")}
  ${field("Contraseña", "password", "text", "")}
  <button type="submit">Entrar</button>
</form>
<p class="lab-hint">Pista: la contraseña se usa tal cual en una consulta
tipo Mongo. Probá usuario <code>admin</code> y contraseña
<code>{"$ne": null}</code>: el operador matchea cualquier valor.</p>`;
  }
}

/* ================================================================
   Race condition / TOCTOU
   ================================================================ */

/**
 * Gulu Cupones — laboratorio de condición de carrera (TOCTOU).
 *
 * Un cupón se puede canjear UNA vez. Pero entre que se chequea el saldo y se
 * descuenta hay una ventana: si llegan varias peticiones a la vez, todas ven
 * el cupón disponible y lo canjean. Es el clásico Time-Of-Check/Time-Of-Use.
 */
export class RaceApp implements WebApp {
  readonly hostname = "cupones.gulu.nande";
  readonly title = "Gulu Cupones";
  readonly description = "Canje de cupones. Vulnerable a race condition.";
  readonly kind = "otro" as const;

  private usosRestantes = 1;

  handle(req: HttpRequest): HttpResponse {
    if (req.path === "/canjear") {
      const paralelo = Math.max(1, Math.min(50, Number(req.query.paralelo ?? "1") || 1));

      // La vulnerabilidad: check-then-act sin atomicidad. Con N peticiones a
      // la vez, TODAS leen usosRestantes>0 antes de que alguna descuente.
      const disponibleAlLeer = this.usosRestantes; // Time Of Check
      let canjes = 0;
      if (disponibleAlLeer > 0) {
        // Cada petición paralela ve lo mismo y canjea (Time Of Use).
        canjes = paralelo;
        this.usosRestantes -= paralelo; // queda negativo: se sobregiró
      }

      const explotado = canjes > 1;
      const body = `
${this.form()}
<pre class="lab-file">Cupón: 1 uso permitido
Peticiones simultáneas: ${paralelo}
Canjes realizados: ${canjes}
Saldo del cupón: ${this.usosRestantes}
${explotado
  ? "¡Canjeaste de más por la ventana de carrera! Bandera: ND{race_condition_toctou}"
  : "Con una sola petición no se nota el fallo. Probá varias a la vez."}</pre>`;
      return html(page(this.title, body), { debug: { note: `canjes=${canjes}` } });
    }

    // Reset para volver a probar.
    if (req.path === "/reset") {
      this.usosRestantes = 1;
    }
    return html(page(this.title, this.form()));
  }

  private form(): string {
    return `
<p>Canjeá tu cupón (1 uso). <a href="/reset">Reiniciar cupón</a></p>
<form method="GET" action="/canjear">
  ${field("Peticiones simultáneas", "paralelo", "text", "1")}
  <button type="submit">Canjear</button>
</form>
<p class="lab-hint">Pista: el chequeo y el descuento no son atómicos. Mandá
varias a la vez: <code>/canjear?paralelo=10</code> — todas ven el cupón
disponible y lo canjean.</p>`;
  }
}
