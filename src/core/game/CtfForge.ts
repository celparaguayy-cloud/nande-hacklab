import type { WebServer } from "../http/WebServer";
import type { VirtualDNS } from "../dns/VirtualDNS";
import type { HostRuntime } from "../net/HostRuntime";
import { html, type HttpRequest, type HttpResponse, type WebApp } from "../http/types";

/**
 * CtfForge — generador de retos PROCEDURALES. No es una lista fija: cada reto
 * se fabrica con una semilla y planta una bandera REAL detrás de una app web
 * REAL, con una falla descubrible usando las herramientas de verdad (leer
 * robots.txt, encontrar un backup expuesto, atacar una versión vieja de la
 * API). Se resuelve accediendo al recurso real; la bandera se captura por el
 * mismo camino que cualquier otra (scanForSignals sobre la respuesta).
 *
 * Rejugabilidad infinita y determinista: la misma semilla da el mismo reto.
 */

export type Archetype = "robots" | "backup" | "apiv1";

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
}

const ARCHETYPES: Archetype[] = ["robots", "backup", "apiv1"];

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

/** La app web generada: implementa la falla del arquetipo, de verdad. */
class GeneratedCtfApp implements WebApp {
  readonly title = "Reto ÑANDE";
  readonly description = "Reto procedural generado. Encontrá la bandera.";
  readonly kind = "portal" as const;
  readonly hostname: string;
  private archetype: Archetype;
  private secretPath: string;
  private flag: string;

  constructor(hostname: string, archetype: Archetype, secretPath: string, flag: string) {
    this.hostname = hostname;
    this.archetype = archetype;
    this.secretPath = secretPath;
    this.flag = flag;
  }

  handle(req: HttpRequest): HttpResponse {
    const p = req.path;

    // La ruta secreta SIEMPRE entrega la bandera (recurso real detrás).
    if (p === this.secretPath) {
      return html(`FLAG ${this.flag}`, { contentType: "text/plain" });
    }

    switch (this.archetype) {
      case "robots": {
        if (p === "/robots.txt") {
          // Recon clásico: robots.txt revela una ruta que "no querían indexar".
          return html(
            `User-agent: *\nDisallow: ${this.secretPath}\n`,
            { contentType: "text/plain" },
          );
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
        if (p === "/backup.txt" || p === "/config.bak") {
          // Fuga de configuración: un backup expuesto revela la ruta interna.
          return html(
            `# copia de seguridad (¡NO subir a producción!)\n` +
              `PANEL_INTERNO=${this.secretPath}\n`,
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
        if (p === "/api" || p === "/api/") {
          // La versión actual está protegida; la vieja (v1) sigue viva y no.
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
    }

    return html(`No encontrado.`, { status: 404, contentType: "text/plain" });
  }
}

export class CtfForge {
  private web: WebServer;
  private dns: VirtualDNS;
  private hosts: HostRuntime;
  private cur: GeneratedChallenge | null = null;
  private ipSeq = 20;

  constructor(web: WebServer, dns: VirtualDNS, hosts: HostRuntime) {
    this.web = web;
    this.dns = dns;
    this.hosts = hosts;
  }

  /**
   * Fabrica (o re-fabrica) el reto activo a partir de una semilla. Registra la
   * app web real, su DNS y su host (para que nmap la vea). Reemplaza el reto
   * anterior para no acumular hosts.
   */
  generate(seed: number): GeneratedChallenge {
    if (this.cur) {
      this.web.unregister(this.cur.hostname);
    }
    const rng = mulberry32(seed);
    const archetype = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)];
    const tok = token(rng);
    const flag = `ND{reto_${archetype}_${tok}}`;
    const secretPath =
      archetype === "apiv1" ? "/api/v1/flag" : `/_${token(rng)}`;
    const hostname = `reto-${tok}.nande`;
    const ip = `10.10.13.${this.ipSeq++ % 240}`;

    const app = new GeneratedCtfApp(hostname, archetype, secretPath, flag);
    this.web.register(app);
    if (!this.dns.has(hostname)) this.dns.register(hostname, ip);
    if (!this.hosts.has(hostname)) this.hosts.registerWebHost(hostname, ip);

    this.cur = { seed, hostname, ip, archetype, flag, clue: startClue(archetype, hostname), secretPath };
    return this.cur;
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
  }
}
