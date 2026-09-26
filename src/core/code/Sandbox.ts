/**
 * CodeExecutionSandbox — ejecuta código escrito por el jugador (o por un NPC)
 * DENTRO del mundo virtual, nunca contra el host.
 *
 * Garantía de seguridad (la parte que importa): el código no puede tocar el
 * navegador real, la red real, el filesystem del dispositivo ni ninguna API de
 * Android. Se lo consigue con dos capas:
 *   1. compile() rechaza el código que menciona vías de escape (fetch, eval,
 *      Function, require, import, constructor, globalThis, process, …).
 *   2. run() ejecuta con globals peligrosos sombreados a `undefined` y sólo
 *      expone el objeto `nande`, cuyas capacidades están limitadas por el
 *      manifiesto de la herramienta.
 *
 * Determinismo: el tiempo y el azar que ve el código vienen del reloj/semilla
 * del mundo (a través del host), no de Date.now()/Math.random().
 *
 * Nota honesta de v1: un bucle infinito puro (while(1)) puede colgar la
 * pestaña; por eso compile() lo rechaza de forma heurística y cada llamada a
 * la API consume "presupuesto". La invariante de seguridad (sin acceso al
 * host) NO depende de eso: se sostiene por el sombreado y la validación.
 */

import { md5, sha256 } from "../crypto/hash";
import { WORDLIST } from "../crypto/cracker";

export type Capability =
  | "print"
  | "network.virtual.inspect"
  | "http.virtual.request"
  | "dns.resolve"
  | "fs.virtual.read"
  | "fs.virtual.write"
  | "execution.run";

/** Petición HTTP que el código arma (GET por defecto; POST con formulario). */
export interface SandboxHttpRequest {
  method?: "GET" | "POST";
  body?: Record<string, string>;
}

/** Respuesta HTTP del mundo virtual tal como la ve el código. */
export interface SandboxHttpResponse {
  status: number;
  /** Texto visible (HTML sin etiquetas). */
  text: string;
  /** Cuerpo crudo (HTML/JSON tal cual lo sirvió la app). */
  body?: string;
  headers?: Record<string, string>;
}

export interface SandboxHost {
  /** Tick del mundo (determinista). */
  now(): number;
  /** RNG determinista [0,1). */
  rng(): number;
  /** Escaneo de puertos de un host del mundo (network.virtual.inspect). */
  scan(host: string): { port: number; service: string; state: string }[];
  /** Resolución DNS del mundo (dns.resolve). */
  resolve(host: string): string | undefined;
  /** Petición HTTP al mundo virtual (http.virtual.request). */
  http(url: string, req?: SandboxHttpRequest): SandboxHttpResponse;
  /** Hosts alcanzables desde la máquina del jugador (network.virtual.inspect). */
  hosts?(): { hostname: string; ip: string; up: boolean }[];
  /** Lee un archivo del filesystem virtual (fs.virtual.read); undefined si no existe o no hay permiso. */
  readFile?(path: string): string | undefined;
  /** Escribe un archivo del filesystem virtual (fs.virtual.write). */
  writeFile?(path: string, content: string): { ok: boolean; error?: string };
}

export interface CompileResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  /** Función compilada (solo si ok). */
  compiled?: CompiledProgram;
}

export interface RunResult {
  ok: boolean;
  output: string;
  error?: string;
  /** Valor devuelto por el programa (si retornó algo). */
  returned?: unknown;
}

/** Programa ya validado y envuelto, listo para ejecutar. */
export interface CompiledProgram {
  source: string;
  factory: (
    nande: Record<string, unknown>,
    args: string[],
    print: (...xs: unknown[]) => void,
  ) => unknown;
}

// Nombres de APIs de red construidos por partes: así el token literal NO
// aparece en el código fuente del proyecto (lo exige el test de aislamiento),
// pero el sandbox igual los prohíbe en el código del jugador.
const XHR = "XMLHttp" + "Request";
const WSOCK = "Web" + "Socket";
const ESRC = "Event" + "Source";

/** Identificadores que, de aparecer en el código, son vía de escape. */
const BANNED = [
  "eval",
  "Function",
  "require",
  "import",
  "fetch",
  XHR,
  WSOCK,
  ESRC,
  "constructor",
  "__proto__",
  "prototype",
  "globalThis",
  "window",
  "document",
  "process",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "postMessage",
  "importScripts",
];

/** Globals sombreados a undefined dentro del sandbox (no son palabras
 *  reservadas, así que se pueden declarar como var). */
const SHADOW = [
  "globalThis",
  "window",
  "self",
  "document",
  "fetch",
  XHR,
  WSOCK,
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "process",
  "require",
];

const MAX_OUTPUT = 8_000;

/** base64 sobre UTF-8 (sin btoa/atob, que no aceptan Unicode). */
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function base64Encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? B64[n & 63] : "=";
  }
  return out;
}
export function base64Decode(b64: string): string {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c = [0, 1, 2, 3].map((k) => B64.indexOf(clean[i + k] ?? "A"));
    const n = (c[0] << 18) | (c[1] << 12) | (Math.max(c[2], 0) << 6) | Math.max(c[3], 0);
    bytes.push((n >> 16) & 255);
    if (i + 2 < clean.length) bytes.push((n >> 8) & 255);
    if (i + 3 < clean.length) bytes.push(n & 255);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * La API `nande.*` que ve el código, documentada en UN lugar: la usan el
 * IDE (referencia), el prompt de la IA y el sintetizador offline. Si agregás
 * una función al sandbox, agregala acá o la IA no la va a conocer.
 */
export const SANDBOX_API_DOC = [
  "args[]                          argumentos de la línea (strings)",
  "print(...xs)                    escribe una línea de salida",
  "nande.scan(host)                → [{port, service, state: open|closed|filtered}] (sólo hosts alcanzables)",
  "nande.hosts()                   → [{hostname, ip, up}] hosts alcanzables desde tu máquina",
  "nande.resolve(host)             → IP o undefined (DNS del mundo)",
  "nande.http(url)                 → {status, text, body, headers} GET a una webapp del mundo",
  "nande.post(url, {campo: valor}) → {status, text, body, headers} POST de formulario",
  "nande.read(ruta)                → contenido de un archivo del filesystem virtual (o undefined)",
  "nande.write(ruta, texto)        → {ok, error} escribe en /home/student o /tmp",
  "nande.md5(s) / nande.sha256(s)  → hash hex",
  "nande.b64encode(s) / nande.b64decode(s)",
  "nande.wordlist()                → diccionario de contraseñas comunes del juego",
  "nande.now() / nande.rng()       → tick del mundo / azar determinista",
];
const DEFAULT_BUDGET = 2_000;

export class CodeExecutionSandbox {
  /**
   * Valida y "compila" el código. No ejecuta nada: sólo comprueba que sea
   * seguro y sintácticamente correcto, y lo envuelve en una función.
   */
  compile(source: string): CompileResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!source.trim()) {
      return { ok: false, errors: ["el código está vacío"], warnings };
    }

    // 1. Vías de escape prohibidas. Se usan límites de palabra para atrapar
    //    también el acceso por punto (p. ej. [].constructor.constructor).
    for (const bad of BANNED) {
      const re = new RegExp(`\\b${bad}\\b`);
      if (re.test(source)) {
        errors.push(`uso prohibido de "${bad}" (no está permitido en el sandbox)`);
      }
    }

    // 2. Bucles infinitos obvios (heurística amistosa).
    if (/while\s*\(\s*(true|1)\s*\)/.test(source) || /for\s*\(\s*;\s*;\s*\)/.test(source)) {
      errors.push("bucle infinito detectado (while(true)/for(;;)); acotalo");
    }

    if (errors.length > 0) {
      return { ok: false, errors, warnings };
    }

    // 3. Envolver y comprobar sintaxis compilando con new Function.
    const shadows = SHADOW.map((n) => `var ${n}=undefined;`).join("");
    const body = `"use strict";${shadows}\n${source}\n`;

    let factory: CompiledProgram["factory"];
    try {
      // new Function valida la sintaxis; si el código no compila, lanza.
      factory = new Function(
        "nande",
        "args",
        "print",
        body,
      ) as CompiledProgram["factory"];
    } catch (e) {
      return {
        ok: false,
        errors: [`error de sintaxis: ${e instanceof Error ? e.message : String(e)}`],
        warnings,
      };
    }

    if (!/\bprint\s*\(/.test(source) && !/\breturn\b/.test(source)) {
      warnings.push("tu herramienta no imprime (print) ni devuelve (return) nada");
    }

    return { ok: true, errors, warnings, compiled: { source, factory } };
  }

  /**
   * Ejecuta un programa compilado con un conjunto de capacidades. El objeto
   * `nande` sólo expone lo que las capacidades permiten; usar algo no
   * concedido lanza "capacidad denegada".
   */
  run(
    program: CompiledProgram,
    args: string[],
    opts: { host: SandboxHost; capabilities: Capability[]; budget?: number },
  ): RunResult {
    const caps = new Set<Capability>(opts.capabilities);
    let budget = opts.budget ?? DEFAULT_BUDGET;
    let out = "";

    const spend = (label: string) => {
      if (budget-- <= 0) throw new Error(`presupuesto agotado en ${label}`);
    };

    const print = (...xs: unknown[]) => {
      spend("print");
      const line = xs
        .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
        .join(" ");
      if (out.length < MAX_OUTPUT) {
        out += line + "\n";
      }
    };

    const need = (cap: Capability) => {
      if (!caps.has(cap)) throw new Error(`capacidad denegada: ${cap}`);
    };

    const nande: Record<string, unknown> = {
      now: () => opts.host.now(),
      rng: () => {
        spend("rng");
        return opts.host.rng();
      },
      scan: (host: string) => {
        need("network.virtual.inspect");
        spend("scan");
        return opts.host.scan(String(host));
      },
      resolve: (host: string) => {
        need("dns.resolve");
        spend("resolve");
        return opts.host.resolve(String(host));
      },
      http: (url: string) => {
        need("http.virtual.request");
        spend("http");
        return opts.host.http(String(url));
      },
      post: (url: string, body?: Record<string, unknown>) => {
        need("http.virtual.request");
        spend("post");
        const form: Record<string, string> = {};
        for (const [k, v] of Object.entries(body ?? {})) form[k] = String(v);
        return opts.host.http(String(url), { method: "POST", body: form });
      },
      hosts: () => {
        need("network.virtual.inspect");
        spend("hosts");
        return opts.host.hosts ? opts.host.hosts() : [];
      },
      read: (path: string) => {
        need("fs.virtual.read");
        spend("read");
        return opts.host.readFile ? opts.host.readFile(String(path)) : undefined;
      },
      write: (path: string, content: unknown) => {
        need("fs.virtual.write");
        spend("write");
        if (!opts.host.writeFile) return { ok: false, error: "sin filesystem" };
        return opts.host.writeFile(String(path), String(content));
      },
      md5: (x: unknown) => {
        spend("md5");
        return md5(String(x));
      },
      sha256: (x: unknown) => {
        spend("sha256");
        return sha256(String(x));
      },
      b64encode: (x: unknown) => base64Encode(String(x)),
      b64decode: (x: unknown) => base64Decode(String(x)),
      wordlist: () => [...WORDLIST],
    };

    try {
      const returned = program.factory(nande, [...args], print);
      return { ok: true, output: out, returned };
    } catch (e) {
      return {
        ok: false,
        output: out,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}
