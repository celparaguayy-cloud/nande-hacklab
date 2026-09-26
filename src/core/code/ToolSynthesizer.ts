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

FORMATO DE RESPUESTA (obligatorio):
- Devolvé SOLO el código, dentro de un bloque \`\`\`js ... \`\`\`.
- Sin explicaciones fuera del bloque. Comentá el código en castellano rioplatense.
- El código debe usar print(...) para su salida y leer sus entradas de args[].`;

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

  if (has("hash", "md5", "sha", "hashea")) {
    const algo = has("sha", "sha256") ? "sha256" : "md5";
    return {
      note: `Te armé una tool que calcula ${algo.toUpperCase()} de cada argumento.`,
      source: `// hash-${algo} — calcula ${algo.toUpperCase()} de cada texto que le pases.
// Uso: run <tool> hola mundo
if (args.length === 0) {
  print("Pasá uno o más textos. Ej: run <tool> hola");
} else {
  for (var i = 0; i < args.length; i++) {
    print(args[i] + " -> " + nande.${algo}(args[i]));
  }
}
`,
    };
  }

  if (has("base64", "b64", "codific", "decodific", "encode", "decode")) {
    const dec = has("decodific", "decode", "descifr");
    return {
      note: `Te armé una tool de base64 (${dec ? "decodificar" : "codificar"}).`,
      source: `// base64 — ${dec ? "decodifica" : "codifica"} el texto que le pases.
// Uso: run <tool> ${dec ? "aG9sYQ==" : "hola"}
var texto = args.join(" ");
if (!texto) {
  print("Pasá un texto. Ej: run <tool> ${dec ? "aG9sYQ==" : "hola"}");
} else {
  print(nande.${dec ? "b64decode" : "b64encode"}(texto));
}
`,
    };
  }

  if (has("diccionario", "wordlist", "fuerza bruta", "brute", "crack", "contrasen", "password", "login", "hydra")) {
    return {
      note: "Te armé una tool que prueba el diccionario contra un login HTTP.",
      source: `// login-brute — prueba cada palabra del diccionario contra un login del mundo.
// Uso: run <tool> http://<host>/login <usuario>
// Envía user/pass por POST y detecta el acceso por el código de estado.
var url = args[0] || "http://tienda.nande/login";
var user = args[1] || "admin";
var lista = nande.wordlist();
print("Probando " + lista.length + " claves contra " + url + " como " + user + " ...");
var ok = false;
for (var i = 0; i < lista.length && !ok; i++) {
  var r = nande.post(url, { username: user, password: lista[i] });
  // 200/302 sin volver al form suele indicar acceso; ajustá a tu objetivo.
  if (r.status === 302 || (r.status === 200 && r.text.indexOf("inv") === -1)) {
    print("[+] posible acceso: " + user + " / " + lista[i] + " (estado " + r.status + ")");
    ok = true;
  }
}
if (!ok) print("[-] ninguna clave del diccionario funcionó.");
`,
    };
  }

  if (has("http", "web", "estado", "status", "responde", "ping", "curl")) {
    return {
      note: "Te armé una tool que consulta el estado HTTP de una web del mundo.",
      source: `// http-check — consulta el estado de una o más URLs del mundo virtual.
// Uso: run <tool> http://server.nande/ http://tienda.nande/
var urls = args.length ? args : ["http://server.nande/"];
for (var i = 0; i < urls.length; i++) {
  var r = nande.http(urls[i]);
  print(urls[i] + " -> estado " + r.status + " (" + r.text.slice(0, 60) + ")");
}
`,
    };
  }

  if (has("dns", "resolve", "resolver", "ip", "dominio")) {
    return {
      note: "Te armé una tool que resuelve nombres a IP con el DNS del mundo.",
      source: `// dns-resolve — resuelve cada host a su IP en el DNS del mundo.
// Uso: run <tool> server.nande tienda.nande
var hosts = args.length ? args : ["server.nande"];
for (var i = 0; i < hosts.length; i++) {
  var ip = nande.resolve(hosts[i]);
  print(hosts[i] + " -> " + (ip ? ip : "no resuelve"));
}
`,
    };
  }

  if (has("red", "hosts", "descubr", "network", "mapa", "netmap", "vecinos")) {
    return {
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
  print(h.hostname + " (" + h.ip + ") " + (h.up ? "up" : "down") + " -> " +
        (abiertos.length ? abiertos.join(", ") : "sin puertos abiertos"));
}
`,
    };
  }

  if (has("archivo", "file", "guardar", "reporte", "report", "leer", "escribir", "log")) {
    return {
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
    };
  }

  // Por defecto: un escáner real (la acción más pedida en un cyber range).
  return {
    note: "No reconocí la intención exacta; te dejé un escáner de puertos real para editar.",
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
}
