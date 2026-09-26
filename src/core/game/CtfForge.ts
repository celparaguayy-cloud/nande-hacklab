import type { WebServer } from "../http/WebServer";
import type { VirtualDNS } from "../dns/VirtualDNS";
import type { HostRuntime } from "../net/HostRuntime";
import { html, type HttpRequest, type HttpResponse, type WebApp } from "../http/types";
import { md5 } from "../crypto/hash";
import { WORDLIST } from "../crypto/cracker";

/**
 * CtfForge — generador de retos PROCEDURALES. No es una lista fija: cada reto
 * se fabrica con una semilla y planta una bandera REAL detrás de una app web
 * REAL, con una falla descubrible usando las herramientas de verdad (leer
 * robots.txt, encontrar un backup expuesto, atacar una versión vieja de la
 * API, enumerar IDs ajenos, leer un dotfile, crackear un hash). Se resuelve
 * accediendo al recurso real; la bandera se captura por el mismo camino que
 * cualquier otra (scanForSignals sobre la respuesta).
 *
 * Rejugabilidad infinita y determinista: la misma semilla da el mismo reto.
 * La Arena CTF usa este mismo motor (spawn) para sus retos contrarreloj, así
 * que un reto de la Arena es indistinguible de uno real: mismos hosts, mismo
 * nmap, misma captura de bandera.
 */

export type Archetype = "robots" | "backup" | "apiv1" | "env" | "idor" | "hash";

export type ForgeNivel = "fácil" | "medio" | "difícil";

export interface GeneratedChallenge {
  seed: number;
  hostname: string;
  ip: string;
  archetype: Archetype;
  flag: string;
  /** Pista inicial (el primer paso de recon). */
  clue: string;
  /** La ruta secreta que revela la bandera (para verificación/tests). */
  secretPath: string;
  /** Dificultad derivada del arquetipo. */
  nivel: ForgeNivel;
}

const ARCHETYPES: Archetype[] = ["robots", "backup", "apiv1", "env", "idor", "hash"];

/** Dificultad de cada arquetipo (la usa la Arena para elegir por nivel). */
export const ARCHETYPE_NIVEL: Record<Archetype, ForgeNivel> = {
  robots: "fácil",
  idor: "fácil",
  env: "fácil",
  backup: "medio",
  apiv1: "medio",
  hash: "difícil",
};

export function archetypesFor(nivel: ForgeNivel): Archetype[] {
  return ARCHETYPES.filter((a) => ARCHETYPE_NIVEL[a] === nivel);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Token corto determinista (para rutas y banderas). */
function token(rng: () => number, len = 6): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += alphabet[Math.floor(rng() * alphabet.length)];
  }
  return out;
}

/** Parámetros de configuración de un reto ya decidido por la semilla. */
interface ChallengeSpec {
  hostname: string;
  archetype: Archetype;
  secretPath: string;
  flag: string;
  /** id del álbum del admin (arquetipo idor). */
  idorId?: number;
  /** contraseña real detrás del hash (arquetipo hash). */
  secretWord?: string;
  /** md5 mostrado en la página (arquetipo hash). */
  hashShown?: string;
}

/** La app web generada: implementa la falla del arquetipo, de verdad. */
class GeneratedCtfApp implements WebApp {
  readonly title = "Reto ÑANDE";
  readonly description = "Reto procedural generado. Encontrá la bandera.";
  readonly kind = "portal" as const;
  readonly hostname: string;
  private spec: ChallengeSpec;

  constructor(spec: ChallengeSpec) {
    this.hostname = spec.hostname;
    this.spec = spec;
  }

  private flagBody(): HttpResponse {
    return html(`FLAG ${this.spec.flag}`, { contentType: "text/plain" });
  }

  handle(req: HttpRequest): HttpResponse {
    const p = req.path;
    const s = this.spec;

    switch (s.archetype) {
      case "robots": {
        if (p === s.secretPath) return this.flagBody();
        if (p === "/robots.txt") {
          return html(`User-agent: *\nDisallow: ${s.secretPath}\n`, { contentType: "text/plain" });
        }
        if (p === "/") {
          return html(
            `<h1>Reto: Recon básico</h1>` +
              `<p>Un buen pentester siempre empieza por el reconocimiento. ` +
              `¿Qué le pedimos a los buscadores que NO indexen?</p>` +
              `<p class="hint">Pista: curl http://${this.hostname}/robots.txt</p>`,
          );
        }
        break;
      }
      case "backup": {
        if (p === s.secretPath) return this.flagBody();
        if (p === "/backup.txt" || p === "/config.bak") {
          return html(
            `# copia de seguridad (¡NO subir a producción!)\n` +
              `PANEL_INTERNO=${s.secretPath}\n`,
            { contentType: "text/plain" },
          );
        }
        if (p === "/") {
          return html(
            `<h1>Reto: Archivos expuestos</h1>` +
              `<p>A veces queda un backup olvidado en el servidor. ` +
              `Probá nombres típicos: backup.txt, config.bak…</p>` +
              `<p class="hint">Pista: curl http://${this.hostname}/backup.txt</p>`,
          );
        }
        break;
      }
      case "apiv1": {
        if (p === s.secretPath) return this.flagBody();
        if (p === "/api" || p === "/api/") {
          return html(
            `{"version":"v2","deprecated":["/api/v1"],"note":"v1 sin auth, migrar pronto"}`,
            { contentType: "application/json" },
          );
        }
        if (p === "/") {
          return html(
            `<h1>Reto: Control de acceso roto</h1>` +
              `<p>La API tiene varias versiones. La nueva pide auth… ` +
              `¿y las viejas?</p>` +
              `<p class="hint">Pista: curl http://${this.hostname}/api</p>`,
          );
        }
        break;
      }
      case "env": {
        // Dotfile de configuración expuesto (clásico despiste de deploy).
        if (p === s.secretPath || p === "/.env") return this.flagBody();
        if (p === "/") {
          return html(
            `<h1>Reto: Secretos en el repo</h1>` +
              `<p>Muchos despliegues dejan archivos de entorno accesibles. ` +
              `Los dotfiles empiezan con un punto…</p>` +
              `<p class="hint">Pista: curl http://${this.hostname}/.env</p>`,
          );
        }
        break;
      }
      case "idor": {
        // Control de acceso roto: el álbum del admin se ve cambiando el id.
        if (p === "/album") {
          const id = Number(req.query.id ?? "1");
          if (id === s.idorId) {
            return html(`FLAG ${s.flag}`, { contentType: "text/plain" });
          }
          return html(`Álbum #${id} — fotos de vacaciones. (nada acá)`, { contentType: "text/plain" });
        }
        if (p === "/") {
          return html(
            `<h1>Reto: Álbumes privados (IDOR)</h1>` +
              `<p>Cada álbum se abre por su número: <code>/album?id=1</code>. ` +
              `El del administrador es un número bajo… pero no el 1.</p>` +
              `<p class="hint">Pista: probá curl "http://${this.hostname}/album?id=2" y subí</p>`,
          );
        }
        break;
      }
      case "hash": {
        // Login protegido; la página filtra el md5 de la clave. Hay que
        // crackearlo (nande.wordlist + nande.md5) y loguearse.
        if (p === "/login") {
          const pass = req.query.pass ?? req.body.pass ?? "";
          if (pass && pass === s.secretWord) {
            return html(`Acceso concedido.\nFLAG ${s.flag}`, { contentType: "text/plain" });
          }
          return html(`Acceso denegado.`, { status: 401, contentType: "text/plain" });
        }
        if (p === "/") {
          return html(
            `<h1>Reto: Crackeá el hash</h1>` +
              `<p>Se filtró el hash de la contraseña del admin:</p>` +
              `<pre>md5 = ${s.hashShown}</pre>` +
              `<p>Crackealo y logueate en <code>/login?pass=CLAVE</code>.</p>` +
              `<p class="hint">Pista: es una clave común. Probá el diccionario ` +
              `(en ÑANDE Code: nande.wordlist() + nande.md5()).</p>`,
          );
        }
        break;
      }
    }

    return html(`No encontrado.`, { status: 404, contentType: "text/plain" });
  }
}

export class CtfForge {
  private web: WebServer;
  private dns: VirtualDNS;
  private hosts: HostRuntime;
  private cur: GeneratedChallenge | null = null;
  private arena: GeneratedChallenge | null = null;
  private ipSeq = 20;

  constructor(web: WebServer, dns: VirtualDNS, hosts: HostRuntime) {
    this.web = web;
    this.dns = dns;
    this.hosts = hosts;
  }

  /** Decide todos los parámetros del reto a partir de la semilla. */
  private spec(seed: number, nivel?: ForgeNivel): { spec: ChallengeSpec; ip: string } {
    const rng = mulberry32(seed);
    const pool = nivel ? archetypesFor(nivel) : ARCHETYPES;
    const archetype = pool[Math.floor(rng() * pool.length)] ?? ARCHETYPES[0];
    const tok = token(rng);
    const flag = `ND{reto_${archetype}_${tok}}`;
    const hostname = `reto-${tok}.nande`;
    const ip = `10.10.13.${this.ipSeq++ % 240}`;

    const spec: ChallengeSpec = {
      hostname,
      archetype,
      flag,
      secretPath:
        archetype === "apiv1"
          ? "/api/v1/flag"
          : archetype === "env"
            ? "/.env"
            : `/_${token(rng)}`,
    };

    if (archetype === "idor") {
      // id del admin: bajo pero no 1 (2..9), determinista.
      spec.idorId = 2 + Math.floor(rng() * 8);
      spec.secretPath = `/album?id=${spec.idorId}`;
    }
    if (archetype === "hash") {
      spec.secretWord = WORDLIST[Math.floor(rng() * WORDLIST.length)];
      spec.hashShown = md5(spec.secretWord);
      spec.secretPath = `/login?pass=${spec.secretWord}`;
    }
    return { spec, ip };
  }

  /** Registra la app/DNS/host de un reto y devuelve su descriptor. */
  private register(seed: number, spec: ChallengeSpec, ip: string): GeneratedChallenge {
    const app = new GeneratedCtfApp(spec);
    this.web.register(app);
    if (!this.dns.has(spec.hostname)) this.dns.register(spec.hostname, ip);
    if (!this.hosts.has(spec.hostname)) this.hosts.registerWebHost(spec.hostname, ip);
    return {
      seed,
      hostname: spec.hostname,
      ip,
      archetype: spec.archetype,
      flag: spec.flag,
      clue: startClue(spec.archetype, spec.hostname),
      secretPath: spec.secretPath,
      nivel: ARCHETYPE_NIVEL[spec.archetype],
    };
  }

  /**
   * Fabrica (o re-fabrica) el reto activo del TERMINAL (`retos`). Reemplaza el
   * anterior para no acumular hosts.
   */
  generate(seed: number, nivel?: ForgeNivel): GeneratedChallenge {
    if (this.cur) this.web.unregister(this.cur.hostname);
    const { spec, ip } = this.spec(seed, nivel);
    this.cur = this.register(seed, spec, ip);
    return this.cur;
  }

  /**
   * Fabrica un reto para la ARENA contrarreloj. Vive en paralelo al del
   * terminal (no pisa `current()`); reemplaza sólo el anterior de la Arena.
   */
  spawnForArena(seed: number, nivel?: ForgeNivel): GeneratedChallenge {
    if (this.arena) this.web.unregister(this.arena.hostname);
    const { spec, ip } = this.spec(seed, nivel);
    this.arena = this.register(seed, spec, ip);
    return this.arena;
  }

  current(): GeneratedChallenge | null {
    return this.cur;
  }
}

function startClue(a: Archetype, host: string): string {
  switch (a) {
    case "robots": return `Recon: revisá http://${host}/robots.txt`;
    case "backup": return `Archivos olvidados: probá http://${host}/backup.txt`;
    case "apiv1": return `Versiones de API: mirá http://${host}/api`;
    case "env": return `Secretos de deploy: probá http://${host}/.env`;
    case "idor": return `Control de acceso: enumerá http://${host}/album?id=1`;
    case "hash": return `Hash filtrado: entrá a http://${host}/ y crackealo`;
  }
}
