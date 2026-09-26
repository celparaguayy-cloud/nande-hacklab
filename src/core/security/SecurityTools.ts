import { TOOL_CATALOG } from "./toolCatalog";
import { crack as crackHash, WORDLIST as CRACK_WORDLIST } from "../crypto/cracker";
import { md5, sha256 } from "../crypto/hash";
import type { WirelessRadio } from "../hardware/WirelessRadio";
import type { WebServer } from "../http/WebServer";
import type { ToolCategory, ToolDef, ToolLevel } from "./toolCatalog";
import { LabNetwork } from "./LabNetwork";
import type { VirtualNetwork } from "../network/VirtualNetwork";
import type { VirtualDNS } from "../dns/VirtualDNS";
import type { HostRuntime } from "../net/HostRuntime";

export type { ToolDef, ToolCategory, ToolLevel } from "./toolCatalog";

export interface ToolRunResult {
  output: string;
  isError: boolean;
  /** Bandera encontrada, si la corrida la revela. */
  flag?: string;
}

/** Dependencias que necesitan las herramientas ejecutables. */
interface ToolContext {
  /** Radio 802.11 para la suite aircrack-ng (airmon/airodump/aireplay/aircrack). */
  radio?: WirelessRadio;
  /** Servidor web REAL del mundo: sqlmap/gobuster/curl atacan estas apps de verdad. */
  web?: WebServer;
  lab: LabNetwork;
  network: VirtualNetwork;
  dns: VirtualDNS;
  /** Fuente única de verdad de hosts/servicios vivos. Cuando está presente,
   *  nmap la consulta para reflejar el estado real (servicios apagados,
   *  puertos bloqueados). Sin ella, cae al catálogo estático de LabNetwork. */
  hosts?: HostRuntime;
  /** Red social real del mundo (Pulso) para OSINT: sherlock busca perfiles reales. */
  pulso?: PulsoSearch;
}

/** Vista mínima de Pulso que necesita OSINT (sherlock): buscar perfiles. */
export interface PulsoSearch {
  search(query: string): {
    name: string;
    handle: string;
    bio: string;
    followers: number;
    posts: { leak?: string; leakValue?: string }[];
  }[];
}

/**
 * Biblioteca de herramientas de la academia.
 *
 * Indexa el catálogo (fichas educativas) y ejecuta las herramientas que
 * son runnable. Toda ejecución apunta EXCLUSIVAMENTE a la red de
 * laboratorio virtual: si un objetivo no vive en el sandbox, la
 * herramienta se niega. Ese límite está en el código, no en la confianza.
 */
export class SecurityTools {
  private tools: Map<string, ToolDef>;
  private context: ToolContext;

  constructor(network: VirtualNetwork, dns: VirtualDNS, hosts?: HostRuntime, radio?: WirelessRadio, web?: WebServer) {
    this.tools = new Map(TOOL_CATALOG.map((tool) => [tool.id, tool]));
    this.context = {
      lab: new LabNetwork(),
      network,
      dns,
      hosts,
      radio,
      web,
    };
  }

  /** Conecta la red social real del mundo (Pulso) para OSINT (sherlock). */
  attachPulso(pulso: PulsoSearch): void {
    this.context.pulso = pulso;
  }

  /** Máquinas del laboratorio, para sembrarlas en el HostRuntime. */
  labMachines() {
    return this.context.lab.all();
  }

  all(): ToolDef[] {
    return TOOL_CATALOG.map((tool) => ({ ...tool }));
  }

  get(id: string): ToolDef | undefined {
    const tool = this.tools.get(id);

    return tool ? { ...tool } : undefined;
  }

  /** Busca por nombre exacto o id. */
  find(nameOrId: string): ToolDef | undefined {
    const normalized = nameOrId.toLowerCase();

    for (const tool of this.tools.values()) {
      if (tool.id === normalized || tool.name.toLowerCase() === normalized) {
        return { ...tool };
      }
    }

    return undefined;
  }

  byCategory(category: ToolCategory): ToolDef[] {
    return this.all().filter((tool) => tool.category === category);
  }

  byLevel(level: ToolLevel): ToolDef[] {
    return this.all().filter((tool) => tool.level === level);
  }

  count(): number {
    return this.tools.size;
  }

  categories(): ToolCategory[] {
    return [...new Set(TOOL_CATALOG.map((tool) => tool.category))];
  }

  /** Laboratorios disponibles para practicar. */
  labs() {
    return this.context.lab.all();
  }

  /**
   * Ejecuta una herramienta contra el laboratorio virtual.
   * Devuelve salida simulada coherente con el estado del mundo virtual.
   */
  run(name: string, args: string[]): ToolRunResult {
    const tool = this.find(name);

    if (!tool) {
      return { output: `${name}: herramienta desconocida\n`, isError: true };
    }

    if (!tool.runnable) {
      return {
        output:
          `${tool.name}: ficha educativa (todavía no ejecutable en ÑANDE).\n` +
          `Mirá 'tool ${tool.id}' para aprender qué hace y cómo se usa.\n`,
        isError: false,
      };
    }

    const runner = RUNNERS[tool.id];

    if (!runner) {
      return {
        output: `${tool.name}: sin implementación de laboratorio.\n`,
        isError: true,
      };
    }

    return runner(args, this.context);
  }
}

/** Diccionario de rutas para gobuster/ffuf (subconjunto de directory-list). */
const DIRB_WORDLIST = [
  "login", "admin", "panel", "dashboard", "movimientos", "cuenta", "cuentas",
  "api", "config", "config.php", ".git", "backup", "backups", "uploads",
  "files", "download", "search", "buscar", "user", "users", "perfil",
  "robots.txt", ".env", "test", "debug", "status", "info", "phpinfo.php",
];

/** Diccionario de subdominios/vhosts (subconjunto de subdomains-top1million). */
const SUBDOMAIN_WORDLIST = [
  "www", "mail", "ftp", "webmail", "smtp", "ns1", "ns2", "vpn", "dns",
  "api", "dev", "test", "staging", "admin", "panel", "portal", "dashboard",
  "blog", "shop", "store", "login", "cuenta", "m", "movil", "preview",
  "link", "cupones", "promo", "fotos", "img", "cdn", "docs", "doc", "wiki",
  "tools", "herramientas", "import", "export", "git", "ci", "jenkins",
  "soc", "gateway", "gw", "cpanel", "beta", "old", "backup", "interna",
];

/** Diccionarios de laboratorio para hydra (usuarios y claves comunes). Incluyen
 *  las credenciales débiles/filtradas del mundo para que la fuerza bruta las
 *  encuentre — y deje su rastro ruidoso en los logs, como en la realidad. */
const HYDRA_USERS = [
  "root", "admin", "administrator", "user", "test", "guest",
  "soporte", "svc-backup", "ana", "student", "postgres", "oracle",
];
const HYDRA_PASS = [
  "123456", "password", "admin", "root", "toor", "changeme", "qwerty",
  "Verano2024", "Backup#2024", "Password1", "welcome", "letmein",
];
const WORDLIST_USERS: Record<string, string[]> = {
  "users.txt": HYDRA_USERS,
  "userlist.txt": HYDRA_USERS,
};
const WORDLIST_PASS: Record<string, string[]> = {
  "rockyou.txt": HYDRA_PASS,
  "passwords.txt": HYDRA_PASS,
  "top12.txt": HYDRA_PASS.slice(0, 8),
};

/** Puertos "top" que nmap escanea por defecto (los más comunes, resumido). */
const TOP_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995,
  1723, 3306, 3389, 5432, 5900, 6379, 8000, 8080, 8443, 9000, 27017,
];

/** Nombres de servicio por puerto (fallback cuando el host no lo declara). */
const SERVICE_NAMES: Record<number, string> = {
  21: "ftp", 22: "ssh", 23: "telnet", 25: "smtp", 53: "domain", 80: "http",
  110: "pop3", 135: "msrpc", 139: "netbios-ssn", 143: "imap", 443: "https",
  445: "microsoft-ds", 3306: "mysql", 3389: "ms-wbt-server", 5432: "postgresql",
  5900: "vnc", 6379: "redis", 8080: "http-proxy", 8443: "https-alt",
  27017: "mongodb",
};

/** Rango [a, b] inclusive. */
function range(a: number, b: number): number[] {
  const out: number[] = [];
  for (let i = a; i <= b; i += 1) out.push(i);
  return out;
}

/** Parsea la sintaxis de -p de nmap: "22", "22,80,443", "1-1024", combinada. */
function parsePorts(spec: string): number[] {
  const set = new Set<number>();
  for (const part of spec.split(",")) {
    const p = part.trim();
    if (!p) continue;
    if (p.includes("-")) {
      const [lo, hi] = p.split("-").map((n) => parseInt(n, 10));
      if (!Number.isNaN(lo) && !Number.isNaN(hi)) {
        for (const n of range(Math.max(1, lo), Math.min(65535, hi))) set.add(n);
      }
    } else {
      const n = parseInt(p, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= 65535) set.add(n);
    }
  }
  return [...set].sort((a, b) => a - b);
}

/** Rechaza objetivos que no viven en la red virtual de ÑANDE. */
function requireVirtualTarget(target: string): string | null {
  if (!target) {
    return "falta el objetivo";
  }

  const isVirtualIp = target.startsWith("10.10.");
  const isVirtualHost =
    target.endsWith(".nande") || target.endsWith(".lab");

  if (!isVirtualIp && !isVirtualHost) {
    return `objetivo fuera del sandbox: "${target}". ÑANDE solo permite objetivos virtuales (10.10.x.y, *.nande, *.lab).`;
  }

  return null;
}

/* ------------------------------------------------------------------ *
 *  NSE — motor de scripts de nmap (-sC / --script).                   *
 *  Hace que el escaneo sea de verdad accionable: los scripts default   *
 *  enumeran (hostkeys, títulos, cabeceras) y la categoría 'vuln'       *
 *  APUNTA a las fallas reales de cada app del laboratorio.             *
 * ------------------------------------------------------------------ */

/** Vulnerabilidades web reales por host (lo que un --script vuln delata). */
const NSE_WEB_VULNS: Record<string, string[]> = {
  "banco.nande": [
    "| http-sql-injection:",
    "|   Posible SQLi en POST /login (parámetro 'usuario')",
    "|_  Posible SQLi en GET /movimientos (parámetro 'q') — UNION-based",
  ],
  "fotos.arandu.nande": [
    "| http-idor:",
    "|_  GET /album?id= usa referencia directa insegura (IDOR): cambiá el id",
  ],
  "docs.tape.nande": [
    "| http-path-traversal:",
    "|_  GET /ver?archivo=../ permite salir del directorio (LFI/traversal)",
  ],
  "tools.pyta.nande": [
    "| http-cmd-injection:",
    "|_  GET /ping?host= concatena la entrada en un comando del sistema",
  ],
  "blog.yvoty.nande": [
    "| http-stored-xss:",
    "|_  GET /buscar?q= refleja HTML sin escapar (XSS reflejado)",
  ],
};

/** Título HTTP conocido por host (para http-title, sin salir a la red). */
const NSE_HTTP_TITLES: Record<string, string> = {
  "banco.nande": "Banco Mbarete — Home Banking",
  "server.nande": "ÑANDE nginx — it works",
  "blog.yvoty.nande": "Blog de Yvoty",
  "fotos.arandu.nande": "Fotos Arandú",
  "docs.tape.nande": "Documentos Tapé",
  "tools.pyta.nande": "Pytã Tools",
  "soc.nande": "ÑANDE SOC",
};

/** Huella de clave pseudo-determinista a partir del hostname (ssh-hostkey). */
function nseFakeKey(host: string): string {
  // Math.imul preserva los 32 bits bajos; con '*' normal se pierde precisión y
  // el hash colapsa (salía "AAAA..."). Es sólo una huella pseudo-determinista.
  let h = 0x811c9dc5;
  for (const c of host) h = (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let s = "";
  for (let i = 0; i < 12; i += 1) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    s += chars[(h >>> 9) % 64];
  }
  return s;
}

/** Líneas de script NSE para un servicio abierto (formato real: | y |_). */
function nseForService(
  name: string,
  port: number,
  hostname: string,
  scriptSpec: string,
): string[] {
  const cat = scriptSpec === "" ? "default" : scriptSpec.toLowerCase();
  const vuln = /vuln/.test(cat);
  const isSsh = /ssh/i.test(name) || port === 22;
  const isHttp = /http|nginx|apache/i.test(name) || port === 80 || port === 8080;
  const isHttps = /https/i.test(name) || port === 443 || port === 8443;
  const out: string[] = [];

  if (isSsh) {
    if (vuln) {
      out.push("|_ssh-auth-methods: password habilitado → expuesto a fuerza bruta (probá hydra)");
    } else {
      out.push("| ssh-hostkey:");
      out.push(`|_  3072 SHA256:${nseFakeKey(hostname)} (RSA)`);
      out.push("|_ssh-auth-methods: publickey, password");
    }
  }
  if (isHttp || isHttps) {
    if (vuln) {
      const findings = NSE_WEB_VULNS[hostname];
      if (findings) out.push(...findings);
      else out.push("|_http-vuln: sin vulnerabilidades conocidas en el diccionario para este host");
    } else {
      out.push(`|_http-server-header: ${isHttps ? "nginx/1.24 (TLS)" : "nginx/1.24"}`);
      out.push(`|_http-title: ${NSE_HTTP_TITLES[hostname] ?? "Sitio ÑANDE"}`);
      out.push("|_http-methods: GET POST HEAD OPTIONS");
    }
  }
  return out;
}

type Runner = (args: string[], ctx: ToolContext) => ToolRunResult;

/* ============================================================= *
 *  Crackeo de contraseñas (john / hashcat) sobre el motor real   *
 * ============================================================= */

/** Hash de desafío del laboratorio: MD5("hunter2"). Al romperlo cae la bandera. */
const CRACK_FLAG_MD5 = md5("hunter2");

/** Modos hashcat soportados por el motor de ÑANDE (los demás se explican). */
const HASHCAT_MODES: Record<string, { algo: "md5" | "sha256"; name: string }> = {
  "0": { algo: "md5", name: "MD5" },
  "1400": { algo: "sha256", name: "SHA2-256" },
};
/** Formatos john equivalentes. */
const JOHN_FORMATS: Record<string, "md5" | "sha256"> = {
  "raw-md5": "md5", "raw-sha256": "sha256", md5: "md5", sha256: "sha256",
};

/** Fuerza bruta por máscara acotada (?d ?l ?u), como hashcat -a 3. */
function maskBrute(target: string, algo: "md5" | "sha256", mask: string):
  { found: boolean; password?: string; attempts: number; tooBig?: boolean } {
  const sets: string[] = [];
  const re = /\?([dlu])|(.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mask))) {
    if (m[1] === "d") sets.push("0123456789");
    else if (m[1] === "l") sets.push("abcdefghijklmnopqrstuvwxyz");
    else if (m[1] === "u") sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    else if (m[2]) sets.push(m[2]); // carácter literal en la máscara
  }
  const total = sets.reduce((n, s) => n * s.length, 1);
  if (total > 300000) return { found: false, attempts: 0, tooBig: true };
  const hashFn = algo === "md5" ? md5 : sha256;
  let attempts = 0;
  const idx = new Array(sets.length).fill(0);
  for (let i = 0; i < total; i += 1) {
    let cand = "";
    for (let j = 0; j < sets.length; j += 1) cand += sets[j][idx[j]];
    attempts += 1;
    if (hashFn(cand) === target) return { found: true, password: cand, attempts };
    // incrementar el contador mixto-radix
    for (let j = sets.length - 1; j >= 0; j -= 1) {
      idx[j] += 1;
      if (idx[j] < sets[j].length) break;
      idx[j] = 0;
    }
  }
  return { found: false, attempts };
}

/**
 * Motor compartido de john/hashcat. Crackea los hashes de los argumentos con
 * el motor REAL (md5/sha256), respetando formato/modo, diccionario, reglas y
 * máscara. Devuelve las líneas de resultado y la bandera si cae el desafío.
 */
function crackCli(
  args: string[],
  opts: { algo?: "md5" | "sha256"; rules?: boolean; mask?: string },
): { lines: string[]; cracked: { hash: string; algo: string; pass: string }[]; flag?: string } {
  const hashes = args.filter((a) => /^[0-9a-f]{32}$/i.test(a) || /^[0-9a-f]{64}$/i.test(a))
    .map((h) => h.toLowerCase());
  // Sin hash explícito: set de demostración (hashes REALES de palabras débiles).
  const demo = hashes.length ? hashes : [md5("password"), sha256("qwerty"), CRACK_FLAG_MD5];
  const lines: string[] = [];
  const cracked: { hash: string; algo: string; pass: string }[] = [];
  let flag: string | undefined;
  for (const h of demo) {
    const algo = opts.algo ?? (h.length === 32 ? "md5" : "sha256");
    let r: { found: boolean; password?: string; attempts: number };
    if (opts.mask) {
      const mb = maskBrute(h, algo, opts.mask);
      if (mb.tooBig) { lines.push(`${h}  → espacio de máscara demasiado grande para el lab (probá dic).`); continue; }
      r = mb;
    } else {
      const cr = crackHash(h, { wordlist: CRACK_WORDLIST, rules: opts.rules ?? true });
      r = { found: cr.found, password: cr.password, attempts: cr.attempts };
    }
    if (r.found && r.password) {
      cracked.push({ hash: h, algo, pass: r.password });
      if (h === CRACK_FLAG_MD5) flag = "ND{hash_crackeado}";
    } else {
      lines.push(`${h.slice(0, 24)}…  → sin resultado (${r.attempts} intentos).`);
    }
  }
  return { lines, cracked, flag };
}

/* ============================================================= *
 *  Sondas HTTP REALES para las tools web (dalfox/commix/nikto…)  *
 *  Nada pre-calculado: mandan el payload a la app del mundo y     *
 *  leen la respuesta de verdad (misma fuente que curl/gobuster).  *
 * ============================================================= */

/** Extrae el host de un argumento tipo URL (http://host/x) o nombre pelado. */
function targetHost(args: string[]): string {
  const url = args.find((a) => a.startsWith("http")) ?? args.find((a) => !a.startsWith("-")) ?? "";
  return url.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
}

/** Bandera (ND{...} o NANDE{...}) presente en un cuerpo, o null. */
function flagInBody(body: string): string | null {
  return body.match(/N(?:ANDE|D)\{[^}]+\}/)?.[0] ?? null;
}

/** Versión del servicio HTTP del host, desde la fuente única de hosts (o null). */
function httpVersionOf(ctx: ToolContext, host: string): string | null {
  const h = ctx.hosts?.resolve(host);
  const svc = h?.services.find((s) => s.name.includes("http") || s.port === 80 || s.name === "nginx");
  return svc?.version ?? null;
}

/** Parámetros y rutas típicos donde vive un reflejo/inyección (recon real). */
const XSS_PARAMS = ["q", "search", "buscar", "s", "query", "term", "name", "input"];
const XSS_PATHS = ["/buscar", "/search", "/"];
const CMDI_PARAMS = ["host", "ip", "cmd", "target", "addr", "ping", "domain"];
const CMDI_PATHS = ["/ping", "/exec", "/"];

interface WebFinding {
  path: string;
  param: string;
  payload: string;
  flag: string | null;
  evidence: string;
}

/** Prueba XSS reflejado REAL: inyecta y confirma que el payload vuelve sin filtrar. */
function probeReflectedXss(web: WebServer, host: string): WebFinding | null {
  const payload = "<script>alert(1)</script>";
  for (const path of XSS_PATHS) {
    for (const param of XSS_PARAMS) {
      const res = web.request("GET", host, `${path}?${param}=${payload}`, "", {});
      const body = res.body ?? "";
      if (body.includes(payload)) {
        return { path, param, payload, flag: flagInBody(body), evidence: "el payload volvió reflejado sin escapar" };
      }
    }
  }
  return null;
}

/** Prueba inyección de comandos REAL: encadena con ; y confirma salida de comando. */
function probeCmdInjection(web: WebServer, host: string): WebFinding | null {
  const payloads = ["127.0.0.1;cat flag", "127.0.0.1;id", "127.0.0.1 && whoami"];
  for (const path of CMDI_PATHS) {
    for (const param of CMDI_PARAMS) {
      for (const payload of payloads) {
        const res = web.request("GET", host, `${path}?${param}=${payload}`, "", {});
        const body = res.body ?? "";
        const flag = flagInBody(body);
        if (flag || /uid=\d+|www-data|Linux [\w.-]+/.test(body)) {
          const line = body.match(/uid=\d+[^\n<]*|www-data|Linux [\w.\- ]+/)?.[0] ?? "salida de comando";
          return { path, param, payload, flag, evidence: line };
        }
      }
    }
  }
  return null;
}

/* ============================================================= *
 *  Base de exploits para searchsploit — mapeada al software REAL  *
 *  de ÑANDE (mismas versiones que sirven los hosts/labs). Cada    *
 *  entrada cruza contra el mundo: qué hosts corren esa versión y  *
 *  con qué módulo de metasploit se explota. Nada ficticio.        *
 * ============================================================= */

interface ExploitEntry {
  id: string;
  title: string;
  type: "remote" | "webapps" | "local" | "dos";
  /** Palabras para el buscador (producto, protocolo, clase de fallo). */
  keywords: string[];
  /** Versión de servicio afectada (se cruza con service.version del mundo). */
  affects?: RegExp;
  /** Módulo de metasploit que lo explota en ÑANDE, si existe. */
  msf?: string;
  /** Cómo se explota fuera de msf (curl/tool), si aplica. */
  via?: string;
}

const EXPLOIT_DB: ExploitEntry[] = [
  {
    id: "NDB-SSH-0079", title: "OpenÑSSH < 8.3 — enumeración de usuarios (timing)",
    type: "remote", keywords: ["ssh", "openssh", "openÑssh", "enum", "username"],
    affects: /OpenÑSSH\s*(7\.|8\.[0-2])/i, via: "hydra/enum + fuerza bruta con users.txt",
  },
  {
    id: "NDB-FTP-0200", title: "ÑandeFTP 2.0 — acceso anónimo (lectura de archivos)",
    type: "remote", keywords: ["ftp", "ñandeftp", "nandeftp", "anonymous", "anon"],
    affects: /ÑandeFTP/i, msf: "auxiliary/scanner/ftp/anonymous",
  },
  {
    id: "NDB-TEL-0001", title: "Ñandelnetd — credenciales Telnet en texto plano",
    type: "remote", keywords: ["telnet", "cleartext", "ñandelnetd", "sniff"],
    affects: /Ñandelnetd|telnet/i, msf: "auxiliary/sniffer/telnet_cleartext",
  },
  {
    id: "NDB-HTTPD-0102", title: "ÑandeHTTPd 1.0–1.4 — path traversal (../ lee archivos)",
    type: "webapps", keywords: ["httpd", "ñandehttpd", "nandehttpd", "traversal", "lfi", "http", "web"],
    affects: /ÑandeHTTPd\s*1\.[0-4]/i, via: "curl ?archivo=../config/secrets.env",
  },
  {
    id: "NDB-SQL-0570", title: "ÑandeSQL 5.7 — bypass de login por SQL injection",
    type: "webapps", keywords: ["sql", "ñandesql", "nandesql", "sqli", "mysql", "login", "bypass"],
    affects: /ÑandeSQL/i, msf: "exploit/nande/http/sqli_login_bypass", via: "sqlmap / ' OR '1'='1",
  },
  {
    id: "NDB-WEB-CMDI", title: "Herramienta de ping web — inyección de comandos (RCE)",
    type: "webapps", keywords: ["cmd", "command", "injection", "rce", "ping", "commix", "shell"],
    msf: "exploit/nande/http/cmd_injection", via: "commix / curl ?host=127.0.0.1;cat flag",
  },
  {
    id: "NDB-WEB-XSS", title: "Buscador reflejado — XSS sin sanitizar",
    type: "webapps", keywords: ["xss", "reflejado", "script", "dalfox"],
    via: "dalfox / ?q=<script>alert(1)</script>",
  },
  {
    id: "NDB-LNX-SUID", title: "Binario SUID mal configurado — escalada a root (local)",
    type: "local", keywords: ["suid", "privesc", "local", "root", "linpeas", "gtfobins"],
    msf: "exploit/nande/local/suid_privesc", via: "linpeas → GTFOBins",
  },
];

const RUNNERS: Record<string, Runner> = {
  ping(args, ctx) {
    const target = args[0] ?? "";
    const err = requireVirtualTarget(target);

    if (err) {
      return { output: `ping: ${err}\n`, isError: true };
    }

    const ip = ctx.dns.resolve(target) ?? target;
    const machine = ctx.lab.resolve(target);
    const reachable = machine?.up || ctx.network.isReachable(ip);

    if (!reachable) {
      return {
        output: `ping: ${target} no responde (host inalcanzable).\n`,
        isError: false,
      };
    }

    const lines = [0, 1, 2].map(
      (n) => `64 bytes desde ${ip}: icmp_seq=${n + 1} tiempo=${8 + n}ms`,
    );

    return {
      output:
        `PING ${target} (${ip}) en la red virtual de ÑANDE\n` +
        lines.join("\n") +
        `\n--- estadísticas ---\n3 enviados, 3 recibidos, 0% perdidos\n`,
      isError: false,
    };
  },

  traceroute(args, ctx) {
    const target = args[0] ?? "";
    const err = requireVirtualTarget(target);

    if (err) {
      return { output: `traceroute: ${err}\n`, isError: true };
    }

    const ip = ctx.dns.resolve(target) ?? target;

    return {
      output:
        `traceroute a ${target} (${ip}), red virtual de ÑANDE\n` +
        ` 1  gateway.nande (10.10.0.1)  1ms\n` +
        ` 2  ${ip}  4ms\n`,
      isError: false,
    };
  },

  whois(args, ctx) {
    const target = (args.find((a) => !a.startsWith("-")) ?? "").toLowerCase();

    if (!target.endsWith(".nande") && !target.endsWith(".lab")) {
      return {
        output: `whois: solo dominios virtuales .nande/.lab\n`,
        isError: true,
      };
    }

    // Datos derivados del ESTADO REAL del mundo: IP del DNS, si es alcanzable
    // desde internet o es interno, y qué servicios publica.
    const ip = ctx.dns.resolve(target);
    const host = ctx.hosts?.resolve(target);
    if (!ip && !host) {
      return { output: `whois: ${target} no está registrado en el DNS del mundo.\n`, isError: false };
    }
    const visibilidad = ctx.hosts?.isPublic(target) ? "público (alcanzable desde tu red)" : "interno (sólo por pivoting)";
    const svc = host?.services.filter((s) => s.state === "running").map((s) => `${s.name}/${s.port}`) ?? [];
    return {
      output:
        `Dominio:      ${target}\n` +
        `Dirección:    ${ip ?? host?.ip ?? "?"}\n` +
        `Visibilidad:  ${visibilidad}\n` +
        (host ? `Sistema:      ${host.os}\n` : "") +
        (svc.length ? `Servicios:    ${svc.join(", ")}\n` : "") +
        `Servidor DNS: dns.nande\n` +
        `(Dominio del sandbox; los datos salen del estado real del mundo, no de un registro inventado.)\n`,
      isError: false,
    };
  },

  theharvester(args, ctx) {
    // OSINT real: enumera subdominios/hosts REALES bajo el dominio, leyendo el
    // DNS del mundo (fuente única). Nada inventado a partir del nombre.
    const raw = (args.find((a) => a.startsWith("-d")) ? args[args.indexOf("-d") + 1] : args[0]) ?? "nande";
    const domain = raw.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase().replace(/^www\./, "");
    if (!domain.endsWith("nande") && !domain.endsWith("lab")) {
      return { output: `theHarvester: solo dominios del sandbox (.nande/.lab). Objetivos reales no.\n`, isError: false };
    }
    const records = ctx.dns.listRecords()
      .filter((r) => r.hostname === domain || r.hostname.endsWith("." + domain))
      .sort((a, b) => a.hostname.localeCompare(b.hostname));
    const subs = records.map((r) => `  ${r.hostname.padEnd(28)} ${r.address}`);
    // Correos "corporativos" derivados de los hosts web REALES del dominio: son
    // direcciones plausibles del propio dominio, no de un tercero inventado.
    const webHosts = records.filter((r) => ctx.hosts?.resolve(r.hostname)?.services.some((s) => s.kind === "http" || s.kind === "https" || s.port === 80));
    const correos = webHosts.length
      ? [`  soporte@${domain}`, `  info@${domain}`, `  admin@${domain}`]
      : [];
    return {
      output:
        `theHarvester → dominio ${domain} (DNS del mundo)\n` +
        `Hosts/subdominios (${records.length}):\n` +
        (subs.length ? subs.join("\n") : "  (ninguno registrado)") + "\n" +
        (correos.length
          ? `Correos probables (por convención del dominio):\n` + correos.join("\n") + "\n"
          : "") +
        `Cada host es una superficie de ataque: pasale nmap/whatweb/nikto.\n`,
      isError: false,
    };
  },

  nmap(args, ctx) {
    const flags = args.filter((a) => a.startsWith("-"));
    const has = (f: string) => flags.includes(f);
    const wantsVersion = has("-sV") || has("-A");
    const wantsOs = has("-O") || has("-A");
    const skipDiscovery = has("-Pn");
    const udp = has("-sU");
    const scriptIdx = args.indexOf("--script");
    const scriptSpec = scriptIdx >= 0 ? (args[scriptIdx + 1] ?? "") : "";
    const wantsScripts = has("-sC") || has("-A") || scriptSpec !== "";

    // -p22 (pegado) o -p 22 (separado); -p- = todos los puertos.
    const pIdx = args.findIndex((a) => a === "-p" || (a.startsWith("-p") && a !== "-p-"));
    let portSpec = "";
    if (args.includes("-p-")) {
      portSpec = "-";
    } else if (pIdx >= 0) {
      const a = args[pIdx];
      if (a === "-p") { portSpec = args[pIdx + 1] ?? ""; }
      else { portSpec = a.slice(2); }
    }
    const topIdx = args.indexOf("--top-ports");
    const topN = topIdx >= 0 ? parseInt(args[topIdx + 1] ?? "0", 10) : 0;

    // Flags de nmap que llevan un operando: su valor NO es el objetivo. Así
    // `nmap --script vuln host`, `-oN salida.txt host`, `-D RND:5 host` funcionan.
    const VALUE_FLAGS = new Set([
      "-p", "--top-ports", "--script", "--script-args", "-oN", "-oX", "-oG", "-oA",
      "-D", "-S", "-e", "-g", "--source-port", "--data-length", "-T", "--min-rate",
      "--max-rate", "-iL", "--exclude", "-b",
    ]);
    const operandIdx = new Set<number>();
    args.forEach((a, i) => { if (VALUE_FLAGS.has(a)) operandIdx.add(i + 1); });

    // El objetivo es el primer argumento que NO es una bandera ni el operando
    // de una bandera que toma valor (si no, "22,80,443" se tomaría como host).
    const target = args.find((a, i) => !a.startsWith("-") && !operandIdx.has(i)) ?? "";
    const err = requireVirtualTarget(target);
    if (err) return { output: `nmap: ${err}\n`, isError: true };

    // Escaneo de subred (CIDR): descubrimiento de hosts vivos (ping sweep).
    if (target.includes("/")) {
      const [base, bitsRaw] = target.split("/");
      const bits = parseInt(bitsRaw, 10);
      const ipToInt = (ip: string) => ip.split(".").reduce((a, o) => (a << 8) + (parseInt(o, 10) || 0), 0) >>> 0;
      const mask = bits >= 32 ? 0xffffffff : (0xffffffff << (32 - bits)) >>> 0;
      const net = ipToInt(base) & mask;
      const live = (ctx.hosts?.all() ?? [])
        .filter((h) => h.up && (ipToInt(h.ip) & mask) === net)
        .sort((a, b) => ipToInt(a.ip) - ipToInt(b.ip));
      const rows = live.map((h) => {
        const open = h.services.filter((sv) => sv.state === "running" && !h.firewall.includes(sv.port)).length;
        return `Nmap scan report for ${h.hostname} (${h.ip})\nHost is up (0.0011s latency). ${open} puerto(s) abierto(s).`;
      });
      return {
        output:
          `Starting Nmap 7.94 ( https://nmap.org )\n` +
          (rows.length ? rows.join("\n") + "\n\n" : "No se descubrieron hosts vivos en el rango.\n") +
          `Nmap done: ${live.length} IP address(es) up scanned in ${(0.4 + live.length * 0.05).toFixed(2)}s\n` +
          (live.length ? `Escaneá uno en detalle: nmap -sV ${live[0].hostname}\n` : ""),
        isError: false,
      };
    }

    // Puertos a escanear. Sin -p: los "top ports" habituales. -p-: todo el rango.
    let requested: number[];
    let scannedLabel: string;
    if (portSpec === "-" || portSpec === "1-65535") {
      requested = range(1, 65535);
      scannedLabel = "65535";
    } else if (portSpec) {
      requested = parsePorts(portSpec);
      scannedLabel = String(requested.length);
    } else if (topN > 0) {
      requested = TOP_PORTS.slice(0, topN);
      scannedLabel = String(requested.length);
    } else {
      requested = TOP_PORTS;
      scannedLabel = String(TOP_PORTS.length);
    }

    // Estado real de cada puerto, tomado del mundo vivo cuando existe.
    const live = ctx.hosts?.has(target) ? ctx.hosts.resolve(target)! : null;
    const lab = live ? null : ctx.lab.resolve(target);
    const ip = live?.ip ?? lab?.ip ?? ctx.dns.resolve(target) ?? target;
    const hostname = live?.hostname ?? lab?.hostname ?? target;
    const os = live?.os ?? lab?.os ?? "desconocido";
    const up = live ? live.up : lab ? lab.up : true;

    if (!up && !skipDiscovery) {
      return {
        output:
          `Starting Nmap 7.94 ( https://nmap.org )\n` +
          `Nota: Host parece caído (${hostname}). Si estás seguro de que está, usá -Pn.\n` +
          `Nmap done: 1 IP address (0 hosts up) scanned\n`,
        isError: false,
      };
    }

    // Escaneo UDP (-sU): protocolo sin conexión, LENTO y ambiguo. Cuando no
    // hay respuesta, nmap no puede distinguir abierto de filtrado: "open|filtered".
    if (udp) {
      const udpCommon: { p: number; svc: string; open: boolean }[] = [
        { p: 53, svc: "domain", open: /dns|resolver|server/i.test(hostname) },
        { p: 123, svc: "ntp", open: true },
        { p: 161, svc: "snmp", open: false },
        { p: 500, svc: "isakmp", open: false },
      ];
      const urows = udpCommon.map((u) => {
        const state = u.open ? "open|filtered" : "closed";
        return `${`${u.p}/udp`.padEnd(10)}${state.padEnd(15)}${u.svc}`;
      });
      return {
        output:
          `Starting Nmap 7.94 ( https://nmap.org )\n` +
          `Nmap scan report for ${hostname} (${ip})\n` +
          `Host is up (0.0013s latency).\n` +
          `PORT      STATE          SERVICE\n` +
          urows.join("\n") + "\n" +
          `\nNmap done: 1 IP address (1 host up) scanned in 4.21s\n` +
          `\n(UDP es lento y ambiguo: 'open|filtered' significa que NO hubo ` +
          `respuesta —lo normal en UDP—. Confirmá con -sUV o pruebas específicas.)\n`,
        isError: false,
      };
    }

    // Servicios conocidos del objetivo (puerto -> {estado, servicio, versión}).
    const services = new Map<number, { name: string; version: string; running: boolean }>();
    const firewall = new Set<number>(live?.firewall ?? []);
    if (live) {
      for (const s of live.services) {
        services.set(s.port, { name: s.name, version: s.version, running: s.state === "running" });
      }
    } else if (lab) {
      for (const s of lab.services) {
        services.set(s.port, { name: s.name, version: s.version, running: true });
      }
    }

    const stateOf = (port: number): "open" | "closed" | "filtered" => {
      if (firewall.has(port)) return "filtered";
      const s = services.get(port);
      if (s && s.running) return "open";
      return "closed"; // sin servicio, o servicio detenido
    };

    // Con -p explícito, nmap MUESTRA cada puerto pedido (abierto o no); en un
    // escaneo amplio colapsa lo cerrado en "Not shown". Se replica esa conducta.
    const explicitPorts = portSpec !== "" && portSpec !== "-" && requested.length <= 64;
    const rows: string[] = [];
    let openCount = 0;
    const closedOrFiltered = { closed: 0, filtered: 0 };
    for (const port of requested) {
      const st = stateOf(port);
      if (st === "open") openCount += 1;
      else closedOrFiltered[st] += 1;
      if (st === "open" || explicitPorts) {
        const svc = services.get(port);
        const name = svc?.name ?? SERVICE_NAMES[port] ?? "unknown";
        const ver = wantsVersion && st === "open" ? svc?.version ?? "" : "";
        rows.push(
          `${`${port}/tcp`.padEnd(10)}${st.padEnd(9)}${name.padEnd(wantsVersion ? 14 : 0)}${ver}`.trimEnd(),
        );
        // Scripts NSE (-sC / --script): salen indentados bajo su puerto, como
        // en nmap real. La categoría 'vuln' delata las fallas reales del host.
        if (wantsScripts && st === "open") {
          for (const line of nseForService(name, port, hostname, scriptSpec)) {
            rows.push(line);
          }
        }
      }
    }

    // nmap colapsa lo que no es interesante: "Not shown: N closed/filtered ports".
    const notShown: string[] = [];
    if (!explicitPorts && closedOrFiltered.closed) notShown.push(`${closedOrFiltered.closed} closed tcp ports`);
    if (!explicitPorts && closedOrFiltered.filtered) notShown.push(`${closedOrFiltered.filtered} filtered tcp ports`);

    const header =
      `Starting Nmap 7.94 ( https://nmap.org )\n` +
      `Nmap scan report for ${hostname} (${ip})\n` +
      `Host is up (0.0012s latency).\n` +
      (notShown.length ? `Not shown: ${notShown.join(", ")}\n` : "");

    const table = rows.length
      ? `PORT      STATE    SERVICE${wantsVersion ? "       VERSION" : ""}\n` + rows.join("\n") + "\n"
      : `Todos los ${scannedLabel} puertos escaneados están cerrados/filtrados.\n`;

    const osLine = wantsOs
      ? `\nDevice type: general purpose\nRunning: ${os}\nOS details: ${os}\n`
      : "";

    const footer =
      `\nNmap done: 1 IP address (1 host up) scanned in ${(0.6 + requested.length / 20000).toFixed(2)}s\n` +
      (wantsVersion ? "" : `\n(Consejo: -sV detecta versiones, -O el sistema, -p- escanea los 65535 puertos.)\n`);

    return { output: header + table + osLine + footer, isError: false };
  },

  masscan(args, ctx) {
    const target = args[0] ?? "";
    const err = requireVirtualTarget(target.split("/")[0]);

    if (err) {
      return { output: `masscan: ${err}\n`, isError: true };
    }

    const hosts = ctx.lab.liveHosts();

    return {
      output:
        `masscan sobre ${target} (red virtual de ÑANDE)\n` +
        hosts
          .map((ip) => `Descubierto puerto abierto en ${ip}`)
          .join("\n") +
        `\n${hosts.length} hosts vivos. Afiná con: nmap <ip>\n`,
      isError: false,
    };
  },

  netdiscover(_args, ctx) {
    const hosts = ctx.lab.all();

    return {
      output:
        `netdiscover — hosts vivos en la red de laboratorio\n` +
        hosts
          .map((m) => `${m.ip.padEnd(14)}${m.hostname}  (${m.difficulty})`)
          .join("\n") +
        `\n${hosts.length} máquinas descubiertas.\n`,
      isError: false,
    };
  },

  nslookup(args, ctx) {
    const target = args[0] ?? "";
    const ip = ctx.dns.resolve(target) ?? ctx.lab.resolve(target)?.ip;

    if (!ip) {
      return {
        output: `nslookup: no se pudo resolver ${target}\n`,
        isError: false,
      };
    }

    return {
      output: `Servidor: dns.nande\n\nNombre: ${target}\nDirección: ${ip}\n`,
      isError: false,
    };
  },

  dig(args, ctx) {
    const target = args[0] ?? "";
    const ip = ctx.dns.resolve(target) ?? ctx.lab.resolve(target)?.ip;

    if (!ip) {
      return { output: `dig: ${target} sin respuesta (NXDOMAIN)\n`, isError: false };
    }

    return {
      output:
        `; dig ${target} (red virtual de ÑANDE)\n` +
        `;; ANSWER SECTION:\n${target}.  300  IN  A  ${ip}\n`,
      isError: false,
    };
  },

  curl(args, ctx) {
    const url = args.find((a) => !a.startsWith("-")) ?? "";
    const match = url.match(/^https?:\/\/([^/]+)(\/.*)?$/i);

    if (!match) {
      return { output: `curl: URL inválida: ${url}\n`, isError: true };
    }

    const host = match[1];
    const path = match[2] ?? "/";
    const machine = ctx.lab.resolve(host);

    if (!machine) {
      const err = requireVirtualTarget(host);

      if (err) {
        return { output: `curl: ${err}\n`, isError: true };
      }

      return {
        output: `HTTP/1.1 200 OK\n\n(Contenido virtual de ${host})\n`,
        isError: false,
      };
    }

    const route = machine.webRoutes.find((r) => r.path === path);
    const server = machine.services.find((s) => s.name.includes("http"));

    if (!route) {
      return {
        output: `HTTP/1.1 404 Not Found\nServer: ${server?.version ?? "?"}\n`,
        isError: false,
      };
    }

    // Si la ruta apunta a un archivo sensible que la máquina expone, se ve
    // su contenido: es justo el fallo de datos expuestos (A02) del lab.
    const leaked = machine.files.find(
      (f) => f.path.endsWith(path) || path.endsWith(f.path.split("/").pop()!),
    );

    return {
      output:
        `HTTP/1.1 200 OK\nServer: ${server?.version ?? "?"}\n\n` +
        (leaked
          ? `${leaked.content}\n`
          : `<h1>${route.title}</h1>\n<!-- ${machine.hostname}${path} -->\n`),
      isError: false,
    };
  },

  gobuster(args, ctx) {
    // gobuster real usa modo obligatorio (dir/dns/vhost) + -u/-d. Aceptamos
    // ambas formas: "gobuster dir -u http://host" y "gobuster http://host".
    const MODES = new Set(["dir", "dns", "vhost", "fuzz", "s3", "gcs"]);
    const mode = args.find((a) => MODES.has(a)) ?? "dir";
    const flagVal = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
    const uIdx = args.indexOf("-u");
    const dIdx = args.indexOf("-d");
    const xIdx = args.indexOf("-x");
    const operand = new Set<number>();
    ["-u", "-w", "-x", "-s", "-b", "-t", "-o", "-H", "-c", "-P", "-U", "-d", "-r"].forEach((f) => {
      const i = args.indexOf(f); if (i >= 0) operand.add(i + 1);
    });
    const bare = args.find((a, i) => !a.startsWith("-") && !operand.has(i) && !MODES.has(a)) ?? "";
    const rawTarget = uIdx >= 0 ? (args[uIdx + 1] ?? "") : dIdx >= 0 ? (args[dIdx + 1] ?? "") : bare;
    const host = rawTarget.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
    // En dns/vhost el objetivo es un DOMINIO (puede ser el TLD "nande" a secas).
    const dnsMode = mode === "dns" || mode === "vhost";
    const domainOk = dnsMode && (host === "nande" || host.endsWith(".nande") || host.endsWith(".lab"));
    if (!domainOk) {
      const guard = requireVirtualTarget(host);
      if (guard) return { output: `gobuster: ${guard}\n`, isError: true };
    }

    // ---- modo dns / vhost: enumerar subdominios/vhosts contra el DNS del mundo.
    if (mode === "dns" || mode === "vhost") {
      const domain = host.replace(/^www\./, "");
      const found: string[] = [];
      for (const w of SUBDOMAIN_WORDLIST) {
        const fqdn = `${w}.${domain}`;
        const ip = ctx.dns.resolve(fqdn);
        if (ip) found.push(`Found: ${fqdn}`.padEnd(34) + `[${ip}]`);
      }
      const label = mode === "dns" ? "dns mode (subdominios)" : "vhost mode";
      return {
        output:
          `===============================================================\n` +
          `Gobuster (edición ÑANDE) — ${label}\n` +
          `[+] Domain:   ${domain}\n` +
          `[+] Words:    ${SUBDOMAIN_WORDLIST.length}\n` +
          `===============================================================\n` +
          (found.length ? found.join("\n") : "(sin subdominios con este diccionario)") +
          `\n===============================================================\n` +
          `${found.length} subdominio(s). Cada uno es una superficie de ataque nueva (otro sitio que auditar).\n`,
        isError: false,
      };
    }

    // -x php,txt,bak: extensiones a probar además de la ruta base.
    const exts = xIdx >= 0 ? (args[xIdx + 1] ?? "").split(",").map((e) => e.trim()).filter(Boolean) : [];
    // -s: sólo estos estados (whitelist). -b: ocultar estos (blacklist, def. 404).
    const parseCodes = (s?: string) => new Set((s ?? "").split(",").map((c) => parseInt(c.trim(), 10)).filter((n) => !Number.isNaN(n)));
    const whitelist = flagVal("-s") ? parseCodes(flagVal("-s")) : null;
    const blacklist = flagVal("-b") ? parseCodes(flagVal("-b")) : new Set([404]);
    const follow = args.includes("-r");

    // Contra una app REAL del mundo: probamos un diccionario de rutas y
    // reportamos el STATUS real que devuelve el servidor a cada una.
    if (ctx.web?.has(host)) {
      const hits: string[] = [];
      const candidates = (word: string) => [word, ...exts.map((e) => `${word}.${e}`)];
      for (const word of DIRB_WORDLIST) {
        for (const cand of candidates(word)) {
          let res = ctx.web.request("GET", host, `/${cand}`, "", {});
          let tag = res.status === 301 || res.status === 302 ? `[--> ${res.headers.Location ?? "?"}]` : "";
          // -r: seguir el redirect y reportar el destino final.
          if (follow && (res.status === 301 || res.status === 302) && res.headers.Location) {
            const dest = ctx.web.request("GET", host, res.headers.Location, "", {});
            tag = `[--> ${res.headers.Location} (${dest.status})]`;
            res = dest;
          }
          if (whitelist ? !whitelist.has(res.status) : blacklist.has(res.status)) continue;
          const note = res.status === 401 || res.status === 403 ? "  (protegida)" : "";
          hits.push(`/${cand.padEnd(18)} (Status: ${res.status}) [Size: ${res.body.length}] ${tag}${note}`);
        }
      }
      const filterNote = whitelist ? `  (sólo ${[...whitelist].join(",")})` : blacklist.size ? `  (oculta ${[...blacklist].join(",")})` : "";
      return {
        output:
          `===============================================================\n` +
          `Gobuster (edición ÑANDE) — dir mode\n` +
          `[+] Url:      http://${host}\n` +
          `[+] Words:    ${DIRB_WORDLIST.length}   Status codes: 200,204,301,302,401,403${filterNote}\n` +
          `===============================================================\n` +
          (hits.length ? hits.join("\n") : "(sin rutas encontradas con este diccionario)") +
          `\n===============================================================\n` +
          `${hits.length} ruta(s). Las 401/403 (protegidas) y los redirects suelen ser lo jugoso.\n`,
        isError: false,
      };
    }

    // Fallback: catálogo estático de laboratorio (máquinas lab-*).
    const machine = ctx.lab.resolve(host);
    if (!machine) {
      return { output: `gobuster: ${host} no responde. Probá una app del mundo (banco.nande) o una máquina lab.\n`, isError: false };
    }
    const found = machine.webRoutes
      .map((r) => `/${r.path.replace(/^\//, "").padEnd(20)} (Status: 200)` + (r.hidden ? "  <- oculta" : ""))
      .join("\n");
    return {
      output: `gobuster sobre ${machine.hostname}\n${found}\n${machine.webRoutes.length} rutas encontradas.\n`,
      isError: false,
    };
  },

  ffuf(args, ctx) {
    // ffuf real: fuzzea la palabra FUZZ. Soporta -u http://host/FUZZ con
    // matchers/filtros -mc (match codes), -fc (filter codes), -fs (filter size).
    const flagVal = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
    const uVal = flagVal("-u") ?? args.find((a) => a.startsWith("http")) ?? "";
    const hasFuzz = /FUZZ/.test(uVal);

    // Sin FUZZ en la URL: se comporta como gobuster dir (compatibilidad).
    if (!hasFuzz) {
      const r = RUNNERS.gobuster(args, ctx);
      return { ...r, output: r.output.replace(/Gobuster \(edición ÑANDE\) — dir mode/, "ffuf (edición ÑANDE) — fuzzing de rutas") };
    }

    const host = uVal.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
    const guard = requireVirtualTarget(host);
    if (guard) return { output: `ffuf: ${guard}\n`, isError: true };
    if (!ctx.web?.has(host)) {
      return { output: `ffuf: ${host} no responde como app web. Probá banco.nande.\n`, isError: false };
    }
    const pathTmpl = "/" + uVal.replace(/^https?:\/\//, "").split("/").slice(1).join("/");
    const parseCodes = (s?: string) => new Set((s ?? "").split(",").map((c) => parseInt(c.trim(), 10)).filter((n) => !Number.isNaN(n)));
    const mc = flagVal("-mc") ? parseCodes(flagVal("-mc")) : new Set([200, 204, 301, 302, 307, 401, 403, 405, 500]);
    const fc = parseCodes(flagVal("-fc"));
    const fs = flagVal("-fs") ? parseInt(flagVal("-fs")!, 10) : NaN;

    const hits: string[] = [];
    for (const word of DIRB_WORDLIST) {
      const path = pathTmpl.replace(/FUZZ/, word);
      const res = ctx.web.request("GET", host, path, "", {});
      if (!mc.has(res.status) || fc.has(res.status)) continue;
      if (!Number.isNaN(fs) && res.body.length === fs) continue;
      hits.push(`${word.padEnd(18)} [Status: ${res.status}, Size: ${res.body.length}]`);
    }
    return {
      output:
        `        /'___\\  /'___\\           /'___\\\n` +
        `ffuf (edición ÑANDE) — fuzzing de rutas · v2.1\n` +
        `________________________________________________\n` +
        ` :: URL      : http://${host}${pathTmpl}\n` +
        ` :: Wordlist : FUZZ (${DIRB_WORDLIST.length} palabras)\n` +
        ` :: Matcher  : status ${[...mc].join(",")}\n` +
        (fc.size ? ` :: Filter   : status ${[...fc].join(",")}\n` : "") +
        (!Number.isNaN(fs) ? ` :: Filter   : size ${fs}\n` : "") +
        `________________________________________________\n` +
        (hits.length ? hits.join("\n") : "(sin coincidencias)") +
        `\n:: ${hits.length} resultado(s).\n`,
      isError: false,
    };
  },

  nikto(args, ctx) {
    const target = args.find((a) => !a.startsWith("-")) ?? "";
    const guard = requireVirtualTarget(target);

    if (guard) {
      return { output: `nikto: ${guard}\n`, isError: true };
    }

    // Contra una app REAL del mundo: probamos rutas comunes y disparamos las
    // vulns de verdad (XSS/CMDi), reportando sólo lo que el servidor confirma.
    const host = target.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
    if (ctx.web?.has(host)) {
      const ip = ctx.dns.resolve(host) ?? "";
      const root = ctx.web.request("GET", host, "/", "", {});
      const server = root.headers.Server ?? httpVersionOf(ctx, host) ?? "?";
      const findings: string[] = [];

      // Línea base soft-404: muchas apps devuelven 200 para CUALQUIER ruta. Un
      // scanner real pide una ruta imposible y sólo reporta lo que DIFIERE de
      // esa base (así no infla falsos positivos). Nada inventado.
      const baseline = ctx.web.request("GET", host, "/zzz-nikto-4f2a9c-noexiste", "", {});
      const baseLen = (baseline.body ?? "").length;
      const interesting = (r: { status: number; body?: string }) =>
        r.status !== baseline.status || Math.abs((r.body ?? "").length - baseLen) > 16;

      // Archivos/rutas sensibles expuestas (status real + diferencia real).
      const SENSITIVE = ["/robots.txt", "/.env", "/backup.txt", "/config.bak", "/.git/config", "/admin", "/api", "/api/clientes", "/server-status"];
      for (const p of SENSITIVE) {
        const r = ctx.web.request("GET", host, p, "", {});
        if (r.status !== 0 && r.status !== 404 && interesting(r)) {
          const flag = flagInBody(r.body ?? "");
          findings.push(`+ ${p}: [${r.status}] accesible${flag ? ` — bandera: ${flag}` : ""}`);
        }
      }

      // Vulns confirmadas mandando el payload real.
      const xss = probeReflectedXss(ctx.web, host);
      if (xss) findings.push(`+ OSVDB-XSS: XSS reflejado en ${xss.path}?${xss.param}= (payload vuelve sin escapar)`);
      const cmdi = probeCmdInjection(ctx.web, host);
      if (cmdi) findings.push(`+ OSVDB-CMDi: inyección de comandos en ${cmdi.path}?${cmdi.param}= (${cmdi.evidence})`);

      const capturedFlag = xss?.flag ?? cmdi?.flag ?? null;
      return {
        output:
          `- Nikto v(edición ÑANDE)\n` +
          `+ Target: http://${host}/${ip ? `  (${ip})` : ""}\n` +
          `+ Server: ${server}\n` +
          (findings.length ? findings.join("\n") : "+ Sin hallazgos evidentes por estas firmas.") +
          `\n+ ${findings.length} hallazgo(s) reportado(s).\n`,
        isError: false,
        flag: capturedFlag ?? undefined,
      };
    }

    // Fallback: máquina de laboratorio (modelo estático de vulns).
    const machine = ctx.lab.resolve(target);
    if (!machine) {
      return { output: `nikto: objetivo no válido.\n`, isError: false };
    }
    const web = machine.vulns.filter((v) => v.category === "web");
    return {
      output:
        `nikto sobre ${machine.hostname} (${machine.ip})\n` +
        `+ Servidor: ${machine.services.find((s) => s.name.includes("http"))?.version ?? "?"}\n` +
        (web.length
          ? web.map((v) => `+ OSVDB: ${v.title} [${v.severity}] — ${v.hint}`).join("\n")
          : "+ Sin hallazgos web evidentes.") +
        `\n`,
      isError: false,
    };
  },

  sqlmap(args, ctx) {
    const url = args.find((a) => a.startsWith("http")) ?? "";
    const m = url.match(/^https?:\/\/([^/]+)(\/[^?]*)?(?:\?(.*))?$/i);
    if (!m) return { output: `sqlmap: falta la URL. Ej: sqlmap -u http://banco.nande/login --data "usuario=a&password=b"\n`, isError: true };
    const host = m[1];
    const path = m[2] ?? "/";
    const queryStr = m[3] ?? "";
    const guard = requireVirtualTarget(host);
    if (guard) return { output: `sqlmap: ${guard}\n`, isError: true };

    // --data => POST (parámetros en el cuerpo); si no, GET con los de la URL.
    const dataIdx = args.indexOf("--data");
    const dataStr = dataIdx >= 0 ? (args[dataIdx + 1] ?? "") : "";
    const method: "GET" | "POST" = dataStr ? "POST" : "GET";
    // --cookie "sesion=..." se envía en cada petición (para endpoints con sesión).
    const cookieIdx = args.indexOf("--cookie");
    // 'let' porque sqlmap puede autenticarse solo si el endpoint exige sesión.
    let cookieHeader = cookieIdx >= 0 ? (args[cookieIdx + 1] ?? "") : "";
    const parseKV = (raw: string): Record<string, string> => {
      const o: Record<string, string> = {};
      for (const pair of raw.split("&")) {
        if (!pair) continue;
        const i = pair.indexOf("=");
        o[i < 0 ? pair : pair.slice(0, i)] = i < 0 ? "" : pair.slice(i + 1);
      }
      return o;
    };
    const params = dataStr ? parseKV(dataStr) : parseKV(queryStr);
    const paramNames = Object.keys(params);

    if (!ctx.web?.has(host)) {
      // Fallback: máquinas del laboratorio (lab-*) con su catálogo de vulns.
      const machine = ctx.lab.resolve(host);
      const sqli = machine?.vulns.find((v) => v.id.includes("SQLI"));
      if (machine && sqli) {
        return {
          output:
            `sqlmap sobre ${machine.hostname}\n` +
            `[!] parámetro VULNERABLE a inyección SQL\n` +
            `[*] tipo: boolean-based blind\n` +
            `[*] se pudo leer la tabla de usuarios (laboratorio)\n` +
            `bandera: ${machine.flag}\n` +
            `Lección: esto se evita con consultas parametrizadas.\n`,
          isError: false,
          flag: machine.flag,
        };
      }
      if (machine) {
        return { output: `sqlmap sobre ${machine.hostname}\nEl parámetro no parece inyectable.\n`, isError: false };
      }
      return {
        output: `sqlmap: ${host} no responde como aplicación web en este mundo. Probá banco.nande.\n`,
        isError: false,
      };
    }
    if (paramNames.length === 0) {
      return {
        output:
          `sqlmap: no hay parámetros que probar en ${url}.\n` +
          `Para un login: sqlmap -u http://${host}${path} --data "usuario=admin&password=x"\n`,
        isError: false,
      };
    }

    // Petición REAL contra la app + su motor SQL. Nada está pre-calculado:
    // sqlmap manda payloads y observa cómo responde la app de verdad.
    const send = (over: Record<string, string>) => {
      const body = { ...params, ...over };
      const qp = method === "GET"
        ? "?" + Object.entries(body).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")
        : "";
      return ctx.web!.request(method, host, path + qp, cookieHeader, method === "POST" ? body : {});
    };

    // Ojo: "sql" a secas era demasiado amplio y matcheaba la propia bandera
    // ND{sqli_union_dump} en una respuesta EXITOSA. Pedimos frases de error reales.
    const SQL_ERR = /error en la consulta|error sql|syntax|unterminated|sqlite|no such column/i;
    const lines: string[] = [
      `        ___`,
      `       __H__   sqlmap (edición ÑANDE) — sólo objetivos autorizados`,
      ``,
      `[*] objetivo: ${method} ${url}`,
      `[*] parámetros: ${paramNames.join(", ")}`,
      ``,
    ];

    // --batch: modo no interactivo (real: asume las respuestas por defecto y no
    // pregunta nada). --level/--risk suben la profundidad/agresividad del test.
    if (args.includes("--batch")) lines.push(`[*] --batch: modo no interactivo, asumiendo respuestas por defecto`);
    const levelIdx = args.indexOf("--level");
    const riskIdx = args.indexOf("--risk");
    if (levelIdx >= 0 || riskIdx >= 0) {
      const lvl = levelIdx >= 0 ? (args[levelIdx + 1] ?? "1") : "1";
      const rsk = riskIdx >= 0 ? (args[riskIdx + 1] ?? "1") : "1";
      lines.push(`[*] nivel=${lvl} riesgo=${rsk}: probando más parámetros y payloads (más ruidoso)`);
    }
    if (levelIdx >= 0 || riskIdx >= 0 || args.includes("--batch")) lines.push(``);

    // Auto-sesión: si el endpoint EXIGE sesión (401) y no diste --cookie, sqlmap
    // entra solo con el bypass del login (usuario=admin' --) y sigue con la
    // cookie obtenida. Es lo que haría un pentester: primero sesión, después
    // inyectar. Sin esto, "sqlmap ... /movimientos --dump" decía 'no inyectable'.
    if (!cookieHeader && method === "GET") {
      const baseline = send({});
      const needsSession =
        baseline.status === 401 ||
        /iniciá sesión|inicia sesión|sesión primero/i.test(baseline.body ?? "");
      if (needsSession) {
        const login = ctx.web!.request("POST", host, "/login", "", { usuario: "admin' -- ", password: "x" });
        const sid = login.setCookies?.sesion;
        if (sid) {
          cookieHeader = `sesion=${sid}`;
          lines.push(`[*] el endpoint exige sesión → sqlmap se autentica solo (bypass de login) y continúa`);
          lines.push(``);
        }
      }
    }

    let injectableParam = "";
    let technique = "";
    for (const p of paramNames) {
      const errRes = send({ [p]: `${params[p]}'` });
      const errBased = SQL_ERR.test(errRes.body);
      const tRes = send({ [p]: `${params[p]}' OR '1'='1' -- ` });
      const fRes = send({ [p]: `${params[p]}' AND '1'='2' -- ` });
      const boolBased = tRes.status !== fRes.status || Math.abs(tRes.body.length - fRes.body.length) > 8;
      if (errBased || boolBased) {
        injectableParam = p;
        technique = [errBased ? "error-based" : "", boolBased ? "boolean-based blind" : ""].filter(Boolean).join(" y ");
        lines.push(`[+] el parámetro '${p}' PARECE inyectable (${technique})`);
        if (errBased) lines.push(`    └─ el servidor devolvió un error SQL con la comilla: fuga por error.`);
        if (boolBased) lines.push(`    └─ 'OR 1=1' y 'AND 1=2' dieron respuestas distintas: blind booleana.`);
        break;
      }
      lines.push(`[-] el parámetro '${p}' no parece inyectable`);
    }

    if (!injectableParam) {
      return {
        output: lines.join("\n") + `\n\n[*] sin parámetros inyectables. ¿Consultas parametrizadas? Buen trabajo del dev.\n`,
        isError: false,
      };
    }


    // --dump / --tables / --dbs / --columns e info (--banner/--current-db/
    // --current-user): enumeración y volcado por UNION contra el motor SQL REAL.
    // Sin information_schema/sqlite_master, sqlmap cae a diccionarios de tablas/
    // columnas comunes (como --common-tables/--common-columns real).
    const wantsBanner = args.includes("--banner");
    const wantsCurrentUser = args.includes("--current-user");
    const wantsCurrentDb = args.includes("--current-db");
    const wantsInfo = wantsBanner || wantsCurrentUser || wantsCurrentDb;
    const wantsColumns = args.includes("--columns");
    const wantsDump =
      args.includes("--dump") || args.includes("--tables") || args.includes("--dbs") || wantsColumns || wantsInfo;
    if (wantsDump) {
      const clean = params[injectableParam] ?? "";
      const q = (payload: string) => send({ [injectableParam]: payload });
      const isErr = (r: { body: string }) => SQL_ERR.test(r.body);

      // ¿El endpoint refleja datos? (necesario para UNION-based). Login no refleja.
      // Determinar número de columnas con ORDER BY (técnica real).
      let cols = 0;
      for (let n = 1; n <= 12; n += 1) {
        if (isErr(q(`${clean}%' ORDER BY ${n} -- `))) { cols = n - 1; break; }
      }
      if (cols === 0) {
        lines.push(``, `[-] no pude determinar columnas por ORDER BY en '${injectableParam}'.`,
          `    Probá el buscador con sesión: sqlmap -u "http://${host}/movimientos?q=a" --cookie "sesion=..." --dump`);
        return { output: lines.join("\n") + "\n", isError: false };
      }
      lines.push(``, `[+] la consulta tiene ${cols} columnas (ORDER BY).`);

      // Posiciones reflejadas: UNION con marcadores y ver cuáles vuelven.
      const markers = Array.from({ length: cols }, (_, i) => `0xNDE${i}`);
      const nulls = (except: Record<number, string>) =>
        Array.from({ length: cols }, (_, i) => except[i] ?? "NULL").join(",");
      const markProbe = q(`${clean}%' UNION SELECT ${markers.map((m) => `'${m}'`).join(",")} -- `);
      const reflected = markers.map((m, i) => (markProbe.body.includes(m) ? i : -1)).filter((i) => i >= 0);
      if (reflected.length === 0) {
        lines.push(`[-] la inyección es ciega en este parámetro (no refleja datos). Probá --technique=B.`);
        return { output: lines.join("\n") + "\n", isError: false };
      }

      // --banner / --current-db / --current-user: datos del motor extraídos por
      // la misma inyección UNION (información antes de tocar las tablas).
      if (wantsInfo) {
        if (wantsBanner) lines.push(``, `[+] banner del DBMS: ÑandeSQL 3.4 (motor tipo SQLite del mundo ÑANDE)`);
        if (wantsCurrentDb) lines.push(`[+] base de datos actual: 'main'`);
        if (wantsCurrentUser) lines.push(`[+] usuario actual del DBMS: 'app_banco'@'10.10.7.10'`);
        if (!wantsColumns && !args.includes("--dump") && !args.includes("--tables") && !args.includes("--dbs")) {
          return { output: lines.join("\n") + "\n", isError: false };
        }
        lines.push(``);
      }

      // Diccionario de tablas/columnas comunes (fallback real de sqlmap).
      const COMMON_TABLES = ["usuarios", "users", "usuario", "clientes", "cuentas", "accounts", "admin", "movimientos"];
      const tExplicit = args.indexOf("-T");
      const tables = tExplicit >= 0 && args[tExplicit + 1] ? [args[tExplicit + 1]] : COMMON_TABLES;
      const found: string[] = [];
      for (const t of tables) {
        if (!isErr(q(`${clean}%' UNION SELECT ${nulls({})} FROM ${t} -- `))) found.push(t);
      }
      if (found.length === 0) {
        lines.push(`[-] ninguna tabla del diccionario respondió. Probá -T <tabla>.`);
        return { output: lines.join("\n") + "\n", isError: false };
      }
      lines.push(`[+] tabla(s) encontrada(s): ${found.join(", ")}`);
      if (args.includes("--tables") || args.includes("--dbs")) {
        if (args.includes("--dbs")) lines.push(`[+] DBMS: ÑandeSQL  ·  base de datos disponible: main`);
        return { output: lines.join("\n") + "\n", isError: false };
      }

      // Descubrir las columnas de la primera tabla probando un diccionario común
      // (fallback real de sqlmap cuando no hay information_schema accesible).
      const table = found[0];
      const COMMON_COLS = ["id", "usuario", "user", "username", "nombre", "password", "pass", "clave", "rol", "email", "saldo"];
      const okCols: string[] = [];
      for (const c of COMMON_COLS) {
        if (!isErr(q(`${clean}%' UNION SELECT ${nulls({ [reflected[0]]: c })} FROM ${table} -- `))) okCols.push(c);
      }
      if (okCols.length === 0) {
        lines.push(`[-] no pude confirmar columnas de ${table}. Probá -T ${table} --columns.`);
        return { output: lines.join("\n") + "\n", isError: false };
      }

      // --columns: enumerar las columnas SIN volcar los valores.
      if (wantsColumns && !args.includes("--dump")) {
        lines.push(
          ``,
          `[+] columnas de '${table}' (${okCols.length}): ${okCols.join(", ")}`,
          `    (para leer los datos: -T ${table} --dump)`,
        );
        return { output: lines.join("\n") + "\n", isError: false };
      }

      // --dump: mapear columnas confirmadas a las posiciones reflejadas y volcar.
      const dumpCols = okCols.slice(0, reflected.length);
      const proj: Record<number, string> = {};
      dumpCols.forEach((c, i) => { proj[reflected[i]] = c; });
      const dumpRes = q(`${clean}%' UNION SELECT ${nulls(proj)} FROM ${table} -- `);
      const cells = [...dumpRes.body.matchAll(/<td>([^<]*)<\/td>/g)].map((mm) => mm[1]);
      // Reagrupar por filas visibles (la tabla muestra 3 columnas por fila).
      const shown = reflected.length; // columnas reflejadas visibles
      const perRow = 3;
      const rows: string[][] = [];
      for (let i = 0; i + perRow <= cells.length; i += perRow) rows.push(cells.slice(i, i + perRow));
      lines.push(
        ``,
        `[+] volcado de ${table} (vía UNION, ${dumpCols.length} columnas: ${dumpCols.join(", ")}):`,
        `+${"-".repeat(48)}+`,
        ...rows.map((r) => `| ${r.join("  |  ").padEnd(46)} |`),
        `+${"-".repeat(48)}+`,
        `[*] ${rows.length} fila(s) extraída(s). Las contraseñas ahora se pueden crackear (john/hashcat).`,
      );
      void shown;
      return { output: lines.join("\n") + "\n", isError: false, flag: "ND{sqli_union_dump}" };
    }

    // Explotación real: bypass de autenticación y extracción de lo que devuelva
    // la app (seguimos el redirect con la cookie de sesión que emitió).
    lines.push(``, `[*] explotando: bypass de autenticación con "' OR '1'='1' -- "`);
    let flag: string | undefined;
    const bypass = send({ [injectableParam]: `admin' -- ` });
    if (bypass.status === 302 && bypass.headers.Location) {
      const cookie = bypass.setCookies.sesion ? `sesion=${bypass.setCookies.sesion}` : "";
      const after = ctx.web.request("GET", host, bypass.headers.Location, cookie, {});
      flag = after.body.match(/ND\{[^}]+\}/)?.[0];
      const rol = after.body.match(/ADMINISTRADOR|administrador/) ? "admin" : "usuario";
      lines.push(`[+] sesión iniciada SIN contraseña — acceso como ${rol}`);
      lines.push(`[+] DBMS: ÑandeSQL (SQLite-like)  ·  tabla: usuarios`);
      if (flag) lines.push(`[+] dato extraído del panel: ${flag}`);
    } else {
      // Extracción por error/booleana sin login (ej. buscadores).
      const dump = send({ [injectableParam]: `' OR '1'='1' -- ` });
      lines.push(`[+] la inyección alteró la consulta (status ${dump.status}). Revisá la respuesta para el volcado.`);
    }
    lines.push(``, `[!] Defensa: consultas parametrizadas (prepared statements). NUNCA concatenar entrada del usuario en SQL.`);

    return { output: lines.join("\n") + "\n", isError: false, flag };
  },

  hydra(args, ctx) {
    // Objetivo y servicio: "ssh://host", "host ssh", "host http-post-form", o
    // "host" (ssh por defecto). Se aceptan servicios de red y de formulario web.
    const SVC_WORDS = ["ssh", "ftp", "http", "https", "http-post-form", "http-get-form", "http-form", "mysql"];
    const svcArg = args.find((a) => /:\/\//.test(a) && SVC_WORDS.includes(a.split("://")[0]));
    const service = svcArg
      ? svcArg.split("://")[0]
      : args.find((a) => SVC_WORDS.includes(a)) ?? "ssh";
    // Los valores de -l/-L/-p/-P/-s son operandos, no el objetivo.
    const operandIdx = new Set<number>();
    args.forEach((a, i) => { if (["-l", "-L", "-p", "-P", "-s", "-t", "-C", "-e", "-o", "-m"].includes(a)) operandIdx.add(i + 1); });
    // -s <puerto>: puerto no estándar (hydra -s 2222 ... ssh).
    const sIdx = args.indexOf("-s");
    const customPort = sIdx >= 0 ? parseInt(args[sIdx + 1] ?? "", 10) : NaN;
    const target = svcArg
      ? svcArg.split("://")[1]
      : args.find((a, i) => !a.startsWith("-") && !SVC_WORDS.includes(a) && !operandIdx.has(i)) ?? "";
    const guard = requireVirtualTarget(target);
    if (guard) return { output: `hydra: ${guard}\n`, isError: true };

    // Listas: -l/-L usuarios, -p/-P claves. Sin flags, usa las de laboratorio.
    const lIdx = args.indexOf("-l");
    const bigLIdx = args.indexOf("-L");
    const pIdx = args.indexOf("-p");
    const bigPIdx = args.indexOf("-P");
    const users = lIdx >= 0 ? [args[lIdx + 1]].filter(Boolean)
      : bigLIdx >= 0 ? (WORDLIST_USERS[args[bigLIdx + 1]?.toLowerCase() ?? ""] ?? HYDRA_USERS)
        : HYDRA_USERS;
    const passes = pIdx >= 0 ? [args[pIdx + 1]].filter(Boolean)
      : bigPIdx >= 0 ? (WORDLIST_PASS[args[bigPIdx + 1]?.toLowerCase() ?? ""] ?? HYDRA_PASS)
        : HYDRA_PASS;
    const stopFirst = args.includes("-f"); // -f: parar en la primera válida
    const tIdx = args.indexOf("-t");
    const tasks = tIdx >= 0 ? parseInt(args[tIdx + 1] ?? "16", 10) || 16 : 16;

    // ---- Fuerza bruta de FORMULARIO WEB (http-post-form / http-get-form) ----
    // Golpea el login de la app web real (ej. banco.nande /login con los campos
    // usuario/password) y detecta el éxito por el redirect 302 al panel.
    const isWeb = /^http/.test(service) || service.includes("form");
    if (isWeb) {
      if (!ctx.web?.has(target)) {
        return {
          output: `hydra: ${target} no expone un formulario web en :80. Escaneá con nmap primero (nmap -sV ${target}).\n`,
          isError: false,
        };
      }
      const wfound: { user: string; pass: string }[] = [];
      let wattempts = 0;
      outer:
      for (const u of users) {
        for (const p of passes) {
          wattempts += 1;
          const r = ctx.web.request("POST", target, "/login", "", { usuario: u, password: p });
          const ok = r.status === 302 || /sesi[oó]n iniciada|ADMINISTRADOR/i.test(r.body ?? "");
          if (ok) {
            wfound.push({ user: u, pass: p });
            if (stopFirst) break outer;
          }
        }
      }
      const whead =
        `Hydra v9.5 (c) — sólo para pruebas autorizadas\n\n` +
        `[DATA] max ${tasks} tasks per host\n` +
        `[DATA] atacando http-post-form://${target}:80/login\n` +
        `[DATA] ${users.length} usuario(s) × ${passes.length} clave(s) = ${wattempts} intentos\n`;
      if (wfound.length === 0) {
        return {
          output:
            whead +
            `\n0 de ${wattempts} combinaciones válidas contra el formulario.\n` +
            `Lección: un login con contraseñas fuertes (y bloqueo por intentos / captcha) resiste.\n` +
            `Ojo: estos ${wattempts} intentos fallidos quedaron en los logs del servidor web (miralos en el SOC).\n`,
          isError: false,
        };
      }
      const wlines = wfound.map(
        (f) => `[80][http-post-form] host: ${target}   login: ${f.user}   password: ${f.pass}`,
      );
      return {
        output:
          whead +
          `\n${wlines.join("\n")}\n\n` +
          `${wfound.length} credencial(es) de formulario encontrada(s). Entrá por el navegador (http://${target}/) con esos datos.\n` +
          `Lección: el login web también se fuerza. Defensa: contraseñas fuertes, bloqueo por intentos, captcha y MFA.\n`,
        isError: false,
      };
    }

    // ---- Fuerza bruta de SERVICIO (SSH/FTP) contra el host ----
    if (!ctx.hosts?.has(target)) {
      return { output: `hydra: no encuentro el host "${target}" en la red.\n`, isError: false };
    }
    const host = ctx.hosts.resolve(target)!;
    if (!host.up) return { output: `hydra: ${host.hostname} está caído.\n`, isError: false };

    const port = !Number.isNaN(customPort) ? customPort : service === "ftp" ? 21 : 22;
    const svc = host.services.find((s) => s.port === port && s.state === "running");
    if (!svc) {
      return {
        output: `hydra: ${host.hostname} no expone ${service} (${port}/tcp) abierto. Escaneá con nmap primero.\n`,
        isError: false,
      };
    }

    // Fuerza bruta REAL: cada intento golpea la autenticación del host, que
    // deja evidencia (login.failure/success) que el SOC y DFIR ven de verdad.
    const found: { user: string; pass: string }[] = [];
    let attempts = 0;
    outerSsh:
    for (const u of users) {
      for (const p of passes) {
        attempts += 1;
        const r = ctx.hosts.authenticate(host.hostname, u, p);
        if (r.ok) {
          found.push({ user: u, pass: p });
          if (stopFirst) break outerSsh;
        }
      }
    }

    const lines = found.map(
      (f) => `[${port}][${service}] host: ${host.ip}   login: ${f.user}   password: ${f.pass}`,
    );
    const header =
      `Hydra v9.5 (c) — sólo para pruebas autorizadas\n\n` +
      `[DATA] max ${tasks} tasks per host\n` +
      `[DATA] atacando ${service}://${host.hostname}:${port}\n` +
      `[DATA] ${users.length} usuario(s) × ${passes.length} clave(s) = ${attempts} intentos\n`;

    if (found.length === 0) {
      return {
        output:
          header +
          `\n0 de ${attempts} combinaciones válidas. Ninguna clave de la lista funcionó.\n` +
          `Lección: una clave fuerte fuera del diccionario resiste la fuerza bruta.\n` +
          `Ojo: estos ${attempts} intentos fallidos quedaron registrados (miralos en el SOC).\n`,
        isError: false,
      };
    }
    return {
      output:
        header +
        `\n${lines.join("\n")}\n\n` +
        `${found.length} de ${attempts} credencial(es) encontrada(s). Entrá con: connect ${host.hostname} <usuario> <clave>\n` +
        `Lección: contraseñas fuertes + bloqueo por intentos + MFA. La fuerza bruta es RUIDOSA:\n` +
        `dejó ${attempts - found.length} fallos en los logs (el SOC ya lo está viendo).\n`,
      isError: false,
      flag: "ND{ssh_fuerza_bruta}",
    };
  },

  linpeas(args, ctx) {
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target);

    if (guard) {
      return { output: `linpeas: ${guard}\n`, isError: true };
    }

    const machine = ctx.lab.resolve(target);

    if (!machine) {
      return { output: `linpeas: objetivo no válido.\n`, isError: false };
    }

    const privesc = machine.vulns.filter((v) => v.category === "privesc");

    return {
      output:
        `linpeas sobre ${machine.hostname}\n` +
        (privesc.length
          ? privesc.map((v) => `[!] ${v.title} — ${v.hint}`).join("\n") +
            `\nbandera potencial: ${machine.flag}\n`
          : "Sin vías de escalada evidentes.\n"),
      isError: false,
      flag: privesc.length ? machine.flag : undefined,
    };
  },

  radare2(args) {
    const bin = (args[0] ?? "").trim().toLowerCase();
    if (!bin) {
      return { output: "radare2: falta el binario. Probá: radare2 licencia.bin\n", isError: false };
    }
    // Binario ficticio con una clave hardcodeada (mala práctica clásica).
    if (bin === "licencia.bin" || bin === "licencia") {
      return {
        output:
          "radare2 licencia.bin  [análisis estático]\n" +
          "[0x004011a0] sym.main:\n" +
          "  ; compara la clave ingresada con una cadena fija\n" +
          '  lea rsi, str.NANDE_2024_PRO   ; "NANDE-2024-PRO"\n' +
          "  call sym.strcmp ; test eax, eax -> jz valido\n" +
          "Clave hardcodeada encontrada: NANDE-2024-PRO\n" +
          "Bandera: ND{reversing_clave_hardcodeada}\n" +
          "Lección: un secreto en el binario NO es secreto; validar en el servidor.\n",
        isError: false,
        flag: "ND{reversing_clave_hardcodeada}",
      };
    }
    return {
      output:
        `radare2 ${bin}  [análisis estático]\n` +
        "Funciones: main, init, cleanup. Sin secretos obvios en las cadenas.\n" +
        "Probá con otro binario del lab (ej: licencia.bin).\n",
      isError: false,
    };
  },

  cuckoo(args) {
    const muestra = (args[0] ?? "").trim().toLowerCase();
    if (!muestra) {
      return { output: "cuckoo: falta la muestra. Probá: cuckoo factura.exe\n", isError: false };
    }
    // Muestra ficticia y NO operativa: solo describe comportamiento simulado.
    if (muestra === "factura.exe" || muestra === "factura") {
      return {
        output:
          "cuckoo: detonando factura.exe en el sandbox aislado...\n" +
          "[comportamiento observado]\n" +
          "  - crea persistencia (tarea programada simulada)\n" +
          "  - intenta contactar un C2 (dominio simulado: update.badcorp.invalid)\n" +
          "  - cifra archivos de prueba y pide rescate (ransomware simulado)\n" +
          "[IOCs] dominio: update.badcorp.invalid · hash: e3b0c442... · mutex: NANDE_LOCK\n" +
          "Veredicto: MALICIOSO. Bandera: ND{malware_iocs}\n" +
          "Nota: muestra ficticia, sin código real. Se analiza el comportamiento, no se despliega.\n",
        isError: false,
        flag: "ND{malware_iocs}",
      };
    }
    return {
      output:
        `cuckoo: detonando ${muestra} en el sandbox...\n` +
        "Sin comportamiento malicioso observado. Parece un archivo limpio.\n" +
        "Probá con una muestra sospechosa del lab (ej: factura.exe).\n",
      isError: false,
    };
  },

  tcpdump(args, ctx) {
    const target = args[args.length - 1] ?? "";
    const guard = requireVirtualTarget(target);
    if (guard) return { output: `tcpdump: ${guard}\n`, isError: true };
    const machine = ctx.lab.resolve(target);
    if (!machine) {
      return { output: `tcpdump: objetivo no válido (usá una IP 10.10.x.y de laboratorio).\n`, isError: false };
    }
    // Sniffing pasivo: si el objetivo habla un protocolo sin cifrar, se ven
    // las credenciales en texto plano.
    const claro = machine.services.find((sv) =>
      ["ftp", "telnet", "http"].includes(sv.name),
    );
    if (!claro) {
      return {
        output:
          `tcpdump escuchando en el segmento de ${machine.hostname}...\n` +
          `Solo tráfico cifrado (TLS/SSH). No se ven credenciales.\n` +
          `Lección: cifrar el tráfico hace inútil el sniffing.\n`,
        isError: false,
      };
    }
    return {
      output:
        `tcpdump -i eth0 host ${machine.ip}\n` +
        `12:04:11 ${machine.ip}.${claro.port} > cliente: ${claro.name.toUpperCase()} LOGIN\n` +
        `  usuario: soporte\n  password: Verano2024  (¡EN TEXTO PLANO!)\n` +
        `Capturaste credenciales sin cifrar. Bandera: ND{sniff_credenciales}\n`,
      isError: false,
      flag: "ND{sniff_credenciales}",
    };
  },

  arpspoof(args, ctx) {
    const victima = args[0] ?? "";
    const guard = requireVirtualTarget(victima);
    if (guard) return { output: `arpspoof: ${guard}\n`, isError: true };
    const machine = ctx.lab.resolve(victima);
    if (!machine) {
      return { output: `arpspoof: víctima no válida (IP 10.10.x.y).\n`, isError: false };
    }
    return {
      output:
        `arpspoof: haciéndome pasar por el router ante ${machine.hostname}...\n` +
        `[ARP] ${machine.ip} ahora cree que sos la puerta de enlace.\n` +
        `El tráfico de la víctima pasa por vos (man-in-the-middle).\n` +
        `Interceptada una cookie de sesión: sid=9f3c...  Bandera: ND{arp_mitm}\n` +
        `Defensa: cifrado extremo a extremo + ARP estático + detección de MITM.\n`,
      isError: false,
      flag: "ND{arp_mitm}",
    };
  },

  "airmon-ng"(args, ctx) {
    const radio = ctx.radio;
    if (!radio) return { output: "airmon-ng: la radio no está disponible.\n", isError: true };
    const sub = (args[0] ?? "").toLowerCase();
    if (sub === "start") {
      const r = radio.startMonitor();
      return {
        output:
          `PHY\tInterface\tDriver\t\tChipset\n` +
          `phy0\twlan0\t\tmac80211\tÑANDE Wireless\n\n` +
          `\t\t(${r.message})\n` +
          `\t\tInterfaz de monitoreo: wlan0mon\n\n` +
          `Siguiente: airodump-ng wlan0mon  (escuchar el aire)\n`,
        isError: false,
      };
    }
    if (sub === "stop") {
      const r = radio.stopMonitor();
      return { output: `${r.message}\n`, isError: !r.ok };
    }
    return {
      output:
        `airmon-ng — modo monitor de la placa WiFi\n` +
        `  airmon-ng start wlan0   Activar modo monitor (necesario para capturar)\n` +
        `  airmon-ng stop wlan0mon Volver a modo normal\n` +
        `Estado: ${radio.isMonitor() ? "MONITOR (wlan0mon)" : "managed (wlan0)"}\n`,
      isError: false,
    };
  },

  "airodump-ng"(args, ctx) {
    const radio = ctx.radio;
    if (!radio) return { output: "airodump-ng: la radio no está disponible.\n", isError: true };
    if (!radio.isMonitor()) {
      return {
        output: `airodump-ng: wlan0 no está en modo monitor. Corré primero: airmon-ng start wlan0\n`,
        isError: true,
      };
    }
    const target = args.find(
      (a) => !a.startsWith("-") && a.toLowerCase() !== "wlan0mon" && a.toLowerCase() !== "wlan0",
    );
    if (target) {
      const ap = radio.resolve(target);
      if (!ap) return { output: `airodump-ng: no veo el AP "${target}" en el aire.\n`, isError: false };
      // -w <nombre>: airodump escribe <nombre>-01.cap; lo mapeamos a este AP.
      const wIdx = args.indexOf("-w");
      const capName = wIdx >= 0 ? args[wIdx + 1] : undefined;
      if (capName) radio.recordCaptureFile(capName, ap.bssid);
      const clients = ap.clients.length
        ? ap.clients.map((c) => ` ${ap.bssid}  ${c}  ${ap.power - 4}   0 - 1      54`).join("\n")
        : " (sin clientes asociados)";
      const hs = radio.hasHandshake(ap.bssid) ? `  [ WPA handshake: ${ap.bssid} ]` : "";
      return {
        output:
          `CH ${String(ap.channel).padStart(2)} ][ Escuchando ${ap.essid}${hs}\n\n` +
          ` BSSID              PWR  CH  ENC   ESSID\n` +
          ` ${ap.bssid}  ${ap.power}  ${String(ap.channel).padStart(2)}  ${ap.encryption.padEnd(4)}  ${ap.essid}\n\n` +
          ` BSSID              STATION            PWR   Frames  Rate\n` +
          `${clients}\n\n` +
          (ap.encryption === "OPN"
            ? `Red ABIERTA: no hay handshake que capturar. El tráfico va en claro (usá NandeShark).\n`
            : radio.hasHandshake(ap.bssid)
              ? `Handshake capturado. Crackealo: aircrack-ng -w rockyou.txt ${ap.essid}\n`
              : `Forzá el handshake: aireplay-ng --deauth 5 -a ${ap.bssid} wlan0mon\n`),
        isError: false,
      };
    }
    const rows = radio
      .accessPoints()
      .map(
        (a) =>
          ` ${a.bssid}  ${String(a.power).padStart(4)}  ${String(a.channel).padStart(2)}  ${a.encryption.padEnd(4)}  ${a.clients.length}     ${a.essid}`,
      )
      .join("\n");
    return {
      output:
        `CH  6 ][ Elapsed: 12 s ][ ${radio.accessPoints().length} APs a la vista\n\n` +
        ` BSSID              PWR   CH  ENC   #CLI  ESSID\n` +
        rows +
        `\n\n` +
        `Enfocá un objetivo: airodump-ng --bssid <BSSID> -c <canal> wlan0mon\n` +
        `(o simplemente: airodump-ng <ESSID>)\n`,
      isError: false,
    };
  },

  "aireplay-ng"(args, ctx) {
    const radio = ctx.radio;
    if (!radio) return { output: "aireplay-ng: la radio no está disponible.\n", isError: true };
    const aIdx = args.indexOf("-a");
    const target =
      aIdx >= 0
        ? args[aIdx + 1]
        : args.find((a) => !a.startsWith("-") && !/^\d+$/.test(a) && a.toLowerCase() !== "wlan0mon");
    if (!target) {
      return {
        output:
          `aireplay-ng — ataque de deautenticación (fuerza el handshake)\n` +
          `  aireplay-ng --deauth 5 -a <BSSID> wlan0mon\n` +
          `  (o: aireplay-ng --deauth 5 <ESSID>)\n`,
        isError: false,
      };
    }
    const r = radio.deauth(target);
    if (!r.ok) return { output: `${r.message}\n`, isError: true };
    const ap = radio.resolve(target)!;
    return {
      output:
        `Waiting for beacon frame (BSSID: ${ap.bssid}) on channel ${ap.channel}\n` +
        `Sending 64 directed DeAuth (code 7). STMAC: [${ap.clients[0] ?? "--"}]\n` +
        `${r.message}\n`,
      isError: false,
    };
  },

  "aircrack-ng"(args, ctx) {
    const radio = ctx.radio;
    if (!radio) return { output: "aircrack-ng: la radio no está disponible.\n", isError: true };
    const wIdx = args.indexOf("-w");
    const wordlist = wIdx >= 0 ? args[wIdx + 1] ?? "rockyou.txt" : "rockyou.txt";
    const capArg = args.find((a) => a.endsWith(".cap"));
    const essidTarget = args.find((a, i) => !a.startsWith("-") && i !== wIdx + 1 && !a.endsWith(".cap"));
    // Un .cap se resuelve al AP cuyo handshake capturó airodump/aireplay.
    const capAp = capArg ? radio.resolveCaptureFile(capArg) : undefined;
    const target = essidTarget ?? capAp?.essid ?? "";
    if (!target) {
      return {
        output:
          `aircrack-ng — crackea un handshake WPA con diccionario\n` +
          `  aircrack-ng -w rockyou.txt <ESSID|captura.cap>\n` +
          `Antes: airmon-ng start wlan0 · airodump-ng · aireplay-ng --deauth\n`,
        isError: false,
      };
    }
    const r = radio.crack(target, wordlist);
    if (!r.ok) return { output: `${r.message}\n`, isError: false };
    const ap = radio.resolve(target)!;
    const secs = Math.max(1, Math.round(r.keysTested / Math.max(1, r.rate)));
    const header =
      `                              Aircrack-ng 1.7\n\n` +
      `      [00:00:${String(secs).padStart(2, "0")}] ${r.keysTested}/${r.keysTested} claves probadas (${r.rate} k/s)\n\n`;
    if (r.found) {
      return {
        output:
          header +
          `      KEY FOUND! [ ${r.key} ]\n\n` +
          `      Handshake de ${ap.essid} roto.${r.flag ? ` Bandera: ${r.flag}` : ""}\n`,
        isError: false,
        flag: r.flag,
      };
    }
    return { output: header + `      ${r.message}\n`, isError: false };
  },

  hcxdumptool(args, ctx) {
    // Ataque CLIENTLESS de PMKID: le pide el PMKID directo al AP, sin cliente
    // ni deauth. Necesita modo monitor. Deja el material listo para hashcat.
    const radio = ctx.radio;
    if (!radio) return { output: "hcxdumptool: la radio no está disponible.\n", isError: true };
    const target = args.find((a, i) => !a.startsWith("-") && args[i - 1] !== "-i" && !/wlan0/.test(a));
    if (!target) {
      // Sin objetivo explícito: barre el aire y saca PMKID de los que filtran.
      if (!radio.isMonitor()) {
        return { output: "hcxdumptool: la placa no está en modo monitor (corré 'airmon-ng start wlan0').\n", isError: true };
      }
      const hits = radio.accessPoints()
        .map((ap) => ({ ap, r: radio.capturePmkid(ap.essid) }))
        .filter((x) => x.r.captured);
      if (hits.length === 0) {
        return { output: "hcxdumptool: barrido completo. Ningún AP filtró PMKID (probá el handshake con airodump+aireplay).\n", isError: false };
      }
      return {
        output:
          `hcxdumptool -i wlan0mon --enable_status=1\n` +
          `[*] escuchando el aire (ataque clientless de PMKID)\n` +
          hits.map((x) => `[+] PMKID de ${x.ap.essid} (${x.ap.bssid})  →  ${x.r.hash}`).join("\n") +
          `\n[*] ${hits.length} PMKID guardado(s) en pmkid.pcapng. Crackealos: hashcat -m 22000 pmkid.pcapng -w rockyou.txt <ESSID>\n`,
        isError: false,
      };
    }
    // Los objetivos WiFi (ESSID/BSSID) son del sandbox por definición: la radio
    // sólo conoce APs virtuales, así que no hace falta el guard de red IP.
    const res = radio.capturePmkid(target);
    if (!res.ok) return { output: `hcxdumptool: ${res.message}\n`, isError: true };
    return {
      output:
        `hcxdumptool -i wlan0mon --filterlist_ap=${target}\n` +
        (res.hash ? `[+] ${res.message}\n    hash 22000: ${res.hash}\n` : `${res.message}\n`),
      isError: false,
    };
  },

  hcxpcapngtool(args, ctx) {
    // Convierte la captura .pcapng al formato de hash 22000 para hashcat.
    const radio = ctx.radio;
    if (!radio) return { output: "hcxpcapngtool: la radio no está disponible.\n", isError: true };
    const target = args.find((a) => !a.startsWith("-") && !/\.pcapng$|\.22000$|\.hc22000$/.test(a));
    const ap = target ? radio.resolve(target) : undefined;
    if (ap && radio.hasPmkid(ap.essid)) {
      const macAp = ap.bssid.replace(/:/g, "").toLowerCase();
      const essidHex = Array.from(ap.essid).map((c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
      return {
        output:
          `hcxpcapngtool -o hash.22000 pmkid.pcapng\n` +
          `[+] PMKID(s) written to hash.22000: 1\n` +
          `WPA*01*${macAp.padEnd(32, "0").slice(0, 32)}*${macAp}*3c5ab4000000*${essidHex}\n` +
          `[*] listo para: hashcat -m 22000 hash.22000 -w rockyou.txt\n`,
        isError: false,
      };
    }
    return {
      output: "hcxpcapngtool: no hay PMKID en la captura. Capturá uno primero con hcxdumptool.\n",
      isError: false,
    };
  },

  proxychains(args, ctx) {
    const objetivo = args[args.length - 1] ?? "";
    // Segmento interno 10.10.9.x: no accesible directo, solo por pivote.
    if (!objetivo.startsWith("10.10.9.")) {
      return {
        output:
          `proxychains: el objetivo debe estar en la red interna 10.10.9.x\n` +
          `Esa red no se alcanza directo: se llega pivoteando por un host ya tomado.\n` +
          `Probá: proxychains 10.10.9.10\n`,
        isError: false,
      };
    }
    void ctx;
    const internos: Record<string, string> = {
      "10.10.9.10": "panel-interno (RRHH) — expone la nómina",
      "10.10.9.20": "backup-db — copias sin cifrar",
    };
    const desc = internos[objetivo];
    if (!desc) {
      return { output: `proxychains: 10.10.9.x sin host en ${objetivo}.\n`, isError: false };
    }
    return {
      output:
        `proxychains nmap ${objetivo}  (a través del host pivote 10.10.5.20)\n` +
        `[proxychains] cadena: vos -> 10.10.5.20 -> ${objetivo}\n` +
        `${objetivo} ALCANZADO: ${desc}\n` +
        `Llegaste a la red interna moviéndote lateralmente. Bandera: ND{pivot_interno}\n`,
      isError: false,
      flag: "ND{pivot_interno}",
    };
  },

  searchsploit(args, ctx) {
    const query = args.filter((a) => !a.startsWith("-")).join(" ").trim().toLowerCase();
    if (!query) {
      return { output: `searchsploit: pasá un término. Ej: searchsploit ftp | searchsploit ÑandeHTTPd\n`, isError: true };
    }

    // Filtro real por término (producto/protocolo/clase de fallo o versión).
    const hits = EXPLOIT_DB.filter((e) => {
      const blob = (e.title + " " + e.keywords.join(" ") + " " + e.type).toLowerCase();
      return blob.includes(query) || e.keywords.some((k) => query.includes(k));
    });

    if (hits.length === 0) {
      return {
        output:
          `searchsploit "${query}"\n` +
          `Exploits: sin resultados.\n` +
          `Probá por producto (ftp, ssh, ÑandeHTTPd, ÑandeSQL) o clase (rce, sqli, xss, traversal, suid).\n`,
        isError: false,
      };
    }

    // Cruce con el mundo REAL: qué hosts corren una versión afectada (fuente
    // única). Es lo que convierte una búsqueda en un objetivo concreto.
    const services: { host: string; version: string }[] = [];
    for (const h of ctx.hosts?.all() ?? []) {
      for (const s of h.services) services.push({ host: h.hostname, version: s.version });
    }
    for (const m of ctx.lab.all()) {
      for (const s of m.services) services.push({ host: m.hostname, version: s.version });
    }

    const lines: string[] = [
      `------------------------------------------------------------`,
      ` Exploit Title                                    |  Path`,
      `------------------------------------------------------------`,
    ];
    for (const e of hits) {
      lines.push(` ${e.title}`);
      lines.push(`   ${e.id} · tipo: ${e.type}` + (e.msf ? ` · msf: ${e.msf}` : ""));
      if (e.via) lines.push(`   vía: ${e.via}`);
      if (e.affects) {
        const afectados = [...new Set(services.filter((s) => e.affects!.test(s.version)).map((s) => s.host))];
        if (afectados.length) {
          lines.push(`   ⮕ en ESTE mundo lo corren: ${afectados.slice(0, 6).join(", ")}${afectados.length > 6 ? "…" : ""}`);
        }
      }
    }
    lines.push(`------------------------------------------------------------`);
    lines.push(`${hits.length} exploit(s). Los que traen 'msf:' se lanzan con metasploit; el resto con la tool indicada en 'vía'.`);
    return { output: lines.join("\n") + "\n", isError: false };
  },

  strings(args, ctx) {
    const path = args[0] ?? "";
    const machine = ctx.lab.all().find((m) => m.files.some((f) => f.path === path));
    const file = machine?.files.find((f) => f.path === path);

    if (!file) {
      return {
        output: `strings: ${path} sin cadenas legibles o no existe.\n`,
        isError: false,
      };
    }

    return { output: `${file.content}\n`, isError: false };
  },

  file(args, ctx) {
    const path = args[0] ?? "";
    const known = ctx.lab.all().some((m) => m.files.some((f) => f.path === path));

    return {
      output: known
        ? `${path}: texto ASCII (archivo de laboratorio)\n`
        : `${path}: no se puede determinar (¿existe?)\n`,
      isError: false,
    };
  },

  base64(args) {
    const decode = args.includes("-d");
    const value = args.filter((a) => !a.startsWith("-"))[0] ?? "";

    try {
      // btoa/atob existen en el navegador y en Node moderno; nada de red.
      const result = decode
        ? decodeURIComponent(escape(atob(value)))
        : btoa(unescape(encodeURIComponent(value)));

      return { output: `${result}\n`, isError: false };
    } catch {
      return { output: `base64: entrada inválida\n`, isError: true };
    }
  },

  hashcalc(args) {
    // Firma didáctica: hash sha256|md5 <texto>. Hash simple, no cripto real.
    const algo = args[0] ?? "sha256";
    const text = args.slice(1).join(" ");

    if (!text) {
      return { output: `hash: uso: hash sha256 <texto>\n`, isError: true };
    }

    let h = 0;
    for (let i = 0; i < text.length; i++) {
      h = (Math.imul(h, 31) + text.charCodeAt(i)) >>> 0;
    }

    const digest = h.toString(16).padStart(8, "0").repeat(algo === "md5" ? 4 : 8);

    return {
      output: `${algo}("${text}") = ${digest}\n(hash educativo, no criptográfico)\n`,
      isError: false,
    };
  },

  hashid(args) {
    const hash = (args.find((a) => /^[$0-9a-f]/i.test(a)) ?? args[0] ?? "").trim();
    // Candidatos por longitud/forma, con su modo hashcat y formato john — igual
    // que hashid/hash-identifier reales: una longitud puede ser VARIOS tipos.
    let cands: string[];
    if (/^\$2[aby]\$/.test(hash)) cands = ["bcrypt $2*$ [hashcat -m 3200 · john bcrypt]"];
    else if (/^\$6\$/.test(hash)) cands = ["sha512crypt $6$ (Linux /etc/shadow) [-m 1800 · sha512crypt]"];
    else if (/^\$1\$/.test(hash)) cands = ["md5crypt $1$ [-m 500 · md5crypt]"];
    else if (/^[0-9a-f]{32}$/i.test(hash)) cands = [
      "MD5 [hashcat -m 0 · john raw-md5]",
      "NTLM [hashcat -m 1000 · john nt]",
      "LM [hashcat -m 3000]",
      "MD4 [hashcat -m 900]",
    ];
    else if (/^[0-9a-f]{40}$/i.test(hash)) cands = ["SHA1 [hashcat -m 100 · john raw-sha1]", "MySQL4.1+ [-m 300]"];
    else if (/^[0-9a-f]{64}$/i.test(hash)) cands = ["SHA2-256 [hashcat -m 1400 · john raw-sha256]"];
    else if (/^[0-9a-f]{128}$/i.test(hash)) cands = ["SHA2-512 [hashcat -m 1700]"];
    else if (/^[0-9a-f]{16}$/i.test(hash)) cands = ["MySQL323 (viejo) [-m 200]"];
    else cands = ["desconocido — ¿es un hash? Fijate la longitud y el prefijo ($2b$, $6$…)."];
    return {
      output:
        `hashid: analizando "${hash.slice(0, 40)}${hash.length > 40 ? "…" : ""}"\n` +
        cands.map((c) => `[+] ${c}`).join("\n") +
        (cands.length > 1 ? `\n(una misma longitud es varios tipos: probá el más probable primero — MD5 antes que NTLM en apps web).\n` : "\n"),
      isError: false,
    };
  },

  netstat(_args, ctx) {
    const iface = ctx.network.getInterface("eth0");

    return {
      output:
        `Conexiones activas (máquina virtual)\n` +
        `Proto  Local              Estado\n` +
        `tcp    ${iface?.ip ?? "10.10.0.10"}:47001  ESTABLISHED\n` +
        `tcp    0.0.0.0:22          LISTEN\n`,
      isError: false,
    };
  },

  ss(_args, ctx) {
    return RUNNERS.netstat(_args, ctx);
  },

  "phish-analyzer"(args) {
    const id = args[0] ?? "correo-01";

    return {
      output:
        `Análisis de ${id} (correo de laboratorio, ficticio)\n` +
        `Señales de phishing detectadas:\n` +
        `  ⚠ Remitente parecido pero falso: soporte@nande-seguridad.nande\n` +
        `  ⚠ Enlace que dice una cosa y apunta a otra\n` +
        `  ⚠ Urgencia: "tu cuenta se cierra en 24h"\n` +
        `Veredicto: MUY probablemente phishing.\n` +
        `Defensa: no hagas clic, verificá el dominio, activá segundo factor.\n`,
      isError: false,
    };
  },

  "phish-lab"() {
    return {
      output:
        `Anatomía de un phishing (simulación educativa)\n` +
        `1. Gancho: un mensaje que asusta o tienta.\n` +
        `2. Remitente falso: se parece al real pero no lo es.\n` +
        `3. Enlace trampa: lleva a una página copiada.\n` +
        `4. Pedido de datos: contraseña o tarjeta.\n` +
        `Aprendé a ver estas 4 partes y no caés. Todo aquí es ficticio.\n`,
      isError: false,
    };
  },

  "fraud-detector"(args) {
    const shop = args[0] ?? "shop.nande";

    return {
      output:
        `Detección de fraude en ${shop} (transacciones ficticias)\n` +
        `#1021  N$ 12  APROBADA\n` +
        `#1022  N$ 4.800  ⚠ SOSPECHOSA (5 intentos en 1 minuto)\n` +
        `#1023  N$ 30  APROBADA\n` +
        `#1024  N$ 9.900  ⚠ SOSPECHOSA (país imposible)\n` +
        `2 transacciones marcadas. El trabajo del defensor es distinguir fraude de compra real.\n` +
        `Defensa: segundo factor, límites, tokenización, PCI-DSS.\n`,
      isError: false,
    };
  },

  "pci-checker"(args) {
    const shop = args[0] ?? "shop.nande";

    return {
      output:
        `Auditoría PCI de ${shop} (laboratorio)\n` +
        `  ✖ Datos de tarjeta guardados sin cifrar (hallazgo crítico)\n` +
        `  ✖ Se retiene el número completo (no permitido)\n` +
        `  ✔ Conexión por HTTPS\n` +
        `Recomendación: tokenizar, cifrar y no almacenar el PAN completo.\n`,
      isError: false,
    };
  },

  logview(args, ctx) {
    const target = args[0] ?? "";
    const machine = ctx.lab.resolve(target);
    const host = machine?.hostname ?? "weblab01.lab";

    return {
      output:
        `Registros de ${host} (laboratorio)\n` +
        `08:01 login fallido para admin desde 10.10.0.10\n` +
        `08:01 login fallido para admin desde 10.10.0.10\n` +
        `08:02 200 GET /admin desde 10.10.0.10\n` +
        `08:02 escaneo de puertos detectado desde 10.10.0.10\n` +
        `Pista: varios fallos seguidos + acceso a /admin = intento de intrusión.\n`,
      isError: false,
    };
  },

  siem() {
    return {
      output:
        `SIEM — alertas correlacionadas (mundo virtual)\n` +
        `[ALTA] Fuerza bruta SSH en netlab01.lab\n` +
        `[MEDIA] Escaneo de puertos hacia varios hosts\n` +
        `[BAJA] Acceso a panel /admin fuera de horario\n` +
        `Correlación: el mismo origen dispara las tres. Probable intrusión en curso.\n`,
      isError: false,
    };
  },

  ids() {
    return {
      output:
        `IDS — estado (mundo virtual)\n` +
        `Reglas activas: 128\n` +
        `Alertas últimas 24h: 3\n` +
        `Última: patrón de inyección SQL hacia weblab01.lab\n`,
      isError: false,
    };
  },

  sherlock(args, ctx) {
    const user = (args.find((a) => !a.startsWith("-")) ?? "").trim();
    if (!user) {
      return { output: `sherlock: pasá un nombre o alias. Ej: sherlock ana\n`, isError: true };
    }
    if (!ctx.pulso) {
      return { output: `sherlock: sin índice social en este contexto.\n`, isError: false };
    }

    // OSINT real: busca el alias en la red social del mundo (Pulso). Los
    // perfiles, sus datos y las filtraciones salen del estado real, no de una
    // lista fija. Reusar un alias conecta identidades: eso rompe el OPSEC.
    const results = ctx.pulso.search(user);
    if (results.length === 0) {
      return {
        output:
          `sherlock "${user}" → red social del mundo (Pulso)\n` +
          `[-] sin perfiles públicos con ese nombre/alias.\n` +
          `Probá otro alias, o mirá 'pulso' para ver quién publica.\n`,
        isError: false,
      };
    }

    const lines: string[] = [];
    let leaks = 0;
    for (const p of results.slice(0, 8)) {
      lines.push(`[+] Pulso: ${p.handle}  (${p.name} · ${p.followers} seguidores)`);
      if (p.bio) lines.push(`    bio: ${p.bio}`);
      for (const post of p.posts) {
        if (post.leak && post.leakValue) {
          leaks += 1;
          const etiqueta =
            post.leak === "password" ? "posible contraseña"
            : post.leak === "pet" ? "nombre de mascota (respuesta de seguridad)"
            : post.leak === "birthday" ? "fecha de nacimiento"
            : "dato laboral";
          lines.push(`    ⚠ fuga en un post — ${etiqueta}: "${post.leakValue}"`);
        }
      }
    }
    return {
      output:
        `sherlock "${user}" → red social del mundo (Pulso)\n` +
        lines.join("\n") + "\n" +
        `${results.length} perfil(es); ${leaks} dato(s) sensible(s) filtrado(s).\n` +
        (leaks
          ? `Con eso se adivina una contraseña o se responde una pregunta de seguridad. Defensa: no publiques eso y no reuses el alias.\n`
          : `Reusar el mismo alias conecta todos tus perfiles: eso es lo que rompe el anonimato.\n`),
      isError: false,
    };
  },

  shodan(args, ctx) {
    // Buscador de servicios expuestos: lee los hosts REALES del mundo (fuente
    // única) y filtra por la consulta. Nada de catálogo fijo (§2/§6/§12).
    const q = (args.filter((a) => !a.startsWith("-")).join(" ") || "").toLowerCase();
    if (!ctx.hosts) {
      return { output: `shodan: sin índice de hosts en este contexto.\n`, isError: false };
    }
    // Sólo lo que se ve desde internet del sandbox: hosts públicos (no internos).
    const publicos = ctx.hosts.all().filter((h) => ctx.hosts!.isPublic(h.hostname));
    const rows: string[] = [];
    for (const h of publicos) {
      for (const s of h.services) {
        if (s.state !== "running") continue;
        const blob = `${h.hostname} ${h.ip} ${s.name} ${s.kind} ${s.version} ${s.port}`.toLowerCase();
        // q vacío o "http" (default histórico) → todo; si no, filtra de verdad.
        const match = !q || q === "http" ? true : blob.includes(q);
        if (match) {
          rows.push(`${h.ip.padEnd(15)} ${(s.name + "/" + s.port).padEnd(16)} ${s.version}  [${h.hostname}]`);
        }
      }
    }
    return {
      output:
        `shodan — servicios expuestos del sandbox${q && q !== "http" ? ` · filtro: "${q}"` : ""}\n` +
        (rows.length ? rows.join("\n") : "(sin resultados para esa consulta)") +
        `\n${rows.length} servicio(s) en ${publicos.length} host(s) público(s). Cada uno es una superficie a auditar.\n`,
      isError: false,
    };
  },

  whatweb(args, ctx) {
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target);

    if (guard) {
      return { output: `whatweb: ${guard}\n`, isError: true };
    }

    // Contra una app REAL: leemos la respuesta y su fingerprint de verdad.
    const host = target.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
    if (ctx.web?.has(host)) {
      const res = ctx.web.request("GET", host, "/", "", {});
      const server = res.headers.Server ?? httpVersionOf(ctx, host) ?? "servidor web";
      const title = (res.body ?? "").match(/<title>([^<]*)<\/title>/i)?.[1]
        ?? (res.body ?? "").match(/<h1>([^<]*)<\/h1>/i)?.[1]
        ?? "";
      const ip = ctx.dns.resolve(host) ?? "";
      const tech: string[] = [`HTTPServer[${server}]`, `Status[${res.status}]`];
      if (res.setCookies && Object.keys(res.setCookies).length) tech.push("Cookies");
      const body = res.body ?? "";
      if (/name="csrf|csrf_token/i.test(body)) tech.push("CSRF-Token");
      if (/<form[^>]*method="post"/i.test(body)) tech.push("HTML-Form");
      return {
        output:
          `whatweb http://${host}/\n` +
          `${ip ? "[" + ip + "] " : ""}${tech.join(", ")}` +
          (title ? `, Title[${title.trim()}]` : "") + `\n`,
        isError: false,
      };
    }

    const machine = ctx.lab.resolve(target);
    const http = machine?.services.find((s) => s.name.includes("http"));

    return {
      output: http
        ? `whatweb ${machine!.hostname}\n[${machine!.ip}] ${http.version}, ÑandeLinux\n`
        : `whatweb: sin servidor web detectable en ${target}\n`,
      isError: false,
    };
  },

  enum4linux() {
    // La enumeración REAL del dominio la sirve la terminal desde el Directorio
    // Activo vivo (kernel.directory), no una lista fija. Ver VirtualTerminal.
    return {
      output:
        `enum4linux enumera el dominio REAL desde la terminal:\n` +
        `  enum4linux nande.local     (usuarios, grupos, equipos, cuentas SPN)\n`,
      isError: false,
    };
  },

  smbclient() {
    // El listado REAL de comparticiones/archivos lo sirve la terminal leyendo
    // LabMachine.files, no una lista inventada. Ver VirtualTerminal.
    return {
      output:
        `smbclient navega comparticiones desde la terminal:\n` +
        `  smbclient -L 10.10.5.40          (lista comparticiones)\n` +
        `  smbclient //10.10.5.40/files     (lista archivos reales del host)\n`,
      isError: false,
    };
  },

  wpscan(args, ctx) {
    const target = args.find((a) => !a.startsWith("-")) ?? "";
    const guard = requireVirtualTarget(target);
    if (guard) return { output: `wpscan: ${guard}\n`, isError: true };

    const host = target.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
    if (!ctx.web?.has(host)) {
      return {
        output: `wpscan: ${target} no responde como aplicación web en este mundo.\n`,
        isError: false,
      };
    }

    // Fingerprint REAL de WordPress: sondeamos las rutas típicas y sólo
    // afirmamos lo que el servidor confirma (§219: nada de hallazgos ficticios).
    const WP_MARKERS = ["/wp-login.php", "/wp-admin/", "/wp-json/", "/readme.html", "/wp-content/"];
    const hits: string[] = [];
    for (const p of WP_MARKERS) {
      const r = ctx.web.request("GET", host, p, "", {});
      if (r.status !== 0 && r.status !== 404) hits.push(`+ ${p} [${r.status}]`);
    }
    const root = ctx.web.request("GET", host, "/", "", {});
    const looksWp = hits.length > 0 || /wp-content|wordpress/i.test(root.body ?? "");

    if (!looksWp) {
      return {
        output:
          `wpscan → http://${host}/\n` +
          `[i] Server: ${root.headers.Server ?? httpVersionOf(ctx, host) ?? "?"}\n` +
          `[-] No se detectó WordPress (ninguna ruta wp-* respondió). No es un sitio WordPress.\n` +
          `Tip: para una web genérica usá whatweb / nikto / gobuster.\n`,
        isError: false,
      };
    }
    return {
      output:
        `wpscan → http://${host}/\n` +
        `[+] WordPress detectado (rutas wp-* accesibles):\n` +
        hits.map((h) => "  " + h).join("\n") + "\n" +
        `Lección: actualizá núcleo y plugins; ocultá /wp-login.php y quitá lo que no uses.\n`,
      isError: false,
    };
  },

  zap(args, ctx) {
    const url = args.find((a) => a.startsWith("http")) ?? "";
    const host = url.match(/^https?:\/\/([^/]+)/i)?.[1] ?? "";
    const guard = requireVirtualTarget(host);
    if (guard) return { output: `zap: ${guard}\n`, isError: true };

    const machine = ctx.lab.resolve(host);
    const vulns = machine?.vulns ?? [];

    return {
      output:
        `ZAP scan de ${host} (laboratorio)\n` +
        (vulns.length
          ? vulns.map((v) => `[${v.severity}] ${v.title} — ${v.hint}`).join("\n")
          : "Sin hallazgos.") +
        `\n`,
      isError: false,
    };
  },

  dalfox(args, ctx) {
    const host = targetHost(args);
    const guard = requireVirtualTarget(host);
    if (guard) return { output: `dalfox: ${guard}\n`, isError: true };

    // Contra una app REAL del mundo: mandamos el payload y confirmamos el reflejo.
    if (ctx.web?.has(host)) {
      const find = probeReflectedXss(ctx.web, host);
      if (find) {
        return {
          output:
            `dalfox scan → http://${host}${find.path}\n` +
            `[*] parám probado: ${find.param}=${find.payload}\n` +
            `[POC] VULN: XSS reflejado — ${find.evidence}.\n` +
            `      GET ${find.path}?${find.param}=${find.payload}\n` +
            (find.flag ? `[grep] bandera: ${find.flag}\n` : "") +
            `Defensa: escapá la salida (HTML-encode) y aplicá Content-Security-Policy.\n`,
          isError: false,
          flag: find.flag ?? undefined,
        };
      }
      return {
        output:
          `dalfox scan → http://${host}/\n` +
          `[*] probé ${XSS_PARAMS.length} parámetros en ${XSS_PATHS.length} rutas.\n` +
          `[-] no se reflejó ningún payload sin filtrar: sin XSS por estas vías.\n`,
        isError: false,
      };
    }

    // Fallback: máquina de laboratorio (modelo estático de vulns).
    const machine = ctx.lab.resolve(host);
    const xss = machine?.vulns.find((v) => v.id.includes("XSS"));
    return {
      output: xss
        ? `dalfox: ${host}\n[POC] XSS reflejado en el buscador — ${xss.hint}\n` +
          `Defensa: escapá la salida y usá Content-Security-Policy.\n`
        : `dalfox: sin XSS evidente en ${host}\n`,
      isError: false,
    };
  },

  commix(args, ctx) {
    const host = targetHost(args);
    const guard = requireVirtualTarget(host);
    if (guard) return { output: `commix: ${guard}\n`, isError: true };

    // Contra una app REAL del mundo: encadenamos comandos y leemos la salida.
    if (ctx.web?.has(host)) {
      const find = probeCmdInjection(ctx.web, host);
      if (find) {
        return {
          output:
            `commix → http://${host}${find.path}\n` +
            `[*] parám probado: ${find.param}=${find.payload}\n` +
            `[!] VULNERABLE a inyección de comandos.\n` +
            `[*] salida del servidor: ${find.evidence}\n` +
            (find.flag ? `bandera: ${find.flag}\n` : "") +
            `Defensa: nunca pasar entrada del usuario a comandos del sistema.\n`,
          isError: false,
          flag: find.flag ?? undefined,
        };
      }
      return {
        output:
          `commix → http://${host}/\n` +
          `[-] ningún parámetro pasó entrada al shell: no inyectable por estas vías.\n` +
          `Lección: nunca pases datos del usuario a comandos del sistema.\n`,
        isError: false,
      };
    }

    // Fallback: máquina de laboratorio (modelo estático de vulns).
    const machine = ctx.lab.resolve(host);
    const cmdi = machine?.vulns.find((v) => v.id.includes("CMDI"));

    if (cmdi) {
      return {
        output:
          `commix: ${host}\n` +
          `[!] parámetro VULNERABLE a inyección de comandos\n` +
          `[*] se pudo ejecutar 'id' en el servidor: uid=33(www-data)\n` +
          `bandera: ${machine!.flag}\n` +
          `Defensa: nunca pasar entrada del usuario a comandos del sistema.\n`,
        isError: false,
        flag: machine!.flag,
      };
    }

    return {
      output:
        `commix: ${host}\n` +
        `El parámetro no pasa entrada al sistema: no inyectable aquí.\n` +
        `Lección: nunca pases datos del usuario a comandos del sistema.\n`,
      isError: false,
    };
  },

  ssrf(args, ctx) {
    const url = args.find((a) => a.startsWith("http")) ?? args[0] ?? "";
    const host = url.replace(/^https?:\/\//i, "").split("/")[0];
    const guard = requireVirtualTarget(host);
    if (guard) return { output: `ssrf: ${guard}\n`, isError: true };

    const machine = ctx.lab.resolve(host);
    const ssrf = machine?.vulns.find((v) => v.id.includes("SSRF"));

    if (ssrf) {
      return {
        output:
          `ssrf-test sobre ${host}\n` +
          `[!] VULNERABLE a SSRF: el servidor trae URLs que le pedís\n` +
          `[*] se pudo alcanzar un servicio interno del laboratorio\n` +
          `bandera: ${machine!.flag}\n` +
          `Defensa: validar y limitar a dónde puede conectarse el servidor.\n`,
        isError: false,
        flag: machine!.flag,
      };
    }

    return {
      output: `ssrf-test: ${host} no parece pedir URLs por vos.\n`,
      isError: false,
    };
  },

  sslscan(args, ctx) {
    const target = (args.find((a) => !a.startsWith("-")) ?? "").replace(/^https?:\/\//i, "").split("/")[0];
    const host = ctx.hosts?.resolve(target);
    const ip = ctx.dns.resolve(target) ?? host?.ip ?? ctx.lab.resolve(target)?.ip;
    if (!ip) return { output: `sslscan: no se resolvió ${target}\n`, isError: false };

    // En ÑANDE los servicios web sirven HTTP en claro (sin capa TLS modelada):
    // no inventamos un handshake TLS. Eso ES la lección — todo viaja visible.
    const tls = host?.services.find((s) => /https|tls|ssl/i.test(s.name) || s.port === 443);
    if (tls) {
      return {
        output:
          `sslscan ${target} (${ip}:${tls.port})\n` +
          `  Servicio: ${tls.version}\n` +
          `Revisá versión de TLS y cifrados con el material del curso de cripto.\n`,
        isError: false,
      };
    }
    const web = host?.services.find((s) => s.kind === "http" || s.kind === "https" || s.port === 80);
    return {
      output:
        `sslscan ${target} (${ip})\n` +
        (web
          ? `  ⚠ ${web.name}/${web.port} sirve HTTP en claro: no hay capa TLS.\n` +
            `  Todo el tráfico (credenciales incluidas) viaja visible.\n` +
            `Comprobalo vos: capturá con 'sniff'/'tcpdump ${target}' y vas a leer los datos.\n` +
            `Defensa: poné HTTPS (TLS) para cifrar el transporte.\n`
          : `  Sin servicio web/TLS detectable en ${target}.\n`),
      isError: false,
    };
  },

  exiftool(args) {
    const file = args.find((a) => !a.startsWith("-")) ?? "";
    const scrub = args.includes("-all=") || args.includes("--limpiar") || args.includes("-clean");

    if (!file) {
      return { output: "exiftool: falta el archivo. Probá: exiftool foto.jpg\n", isError: true };
    }

    if (scrub) {
      return {
        output:
          `exiftool ${file}: metadatos ELIMINADOS.\n` +
          `  Autor, GPS y software removidos. Ahora el archivo no te delata.\n` +
          `Defensa/OPSEC: limpiá SIEMPRE los metadatos antes de publicar.\n`,
        isError: false,
      };
    }

    // Sin limpiar: la foto delata datos aprovechables (esto es lo que enseña).
    return {
      output:
        `exiftool ${file} (metadatos)\n` +
        `  Autor:      Kamba Ríos\n` +
        `  Cámara:     ÑandePhone 3\n` +
        `  Software:   ÑandeCam 2.4\n` +
        `  Fecha:      día 1 del mundo, 21:47\n` +
        `  GPS:        -25.2985, -57.6350  (¡ubicación real!)\n` +
        `  Comentario: enviado desde casa\n\n` +
        `⚠ Una foto puede delatar quién sos y DÓNDE estás.\n` +
        `Limpiala con: exiftool -all= ${file}\n`,
      isError: false,
    };
  },

  binwalk(args) {
    const file = args[0] ?? "firmware.bin";
    return {
      output:
        `binwalk ${file} (laboratorio)\n` +
        `0x00    cabecera\n0x40    archivo comprimido gzip\n0x120   sistema de archivos embebido\n` +
        `Hay cosas escondidas adentro. Extraé y seguí investigando.\n`,
      isError: false,
    };
  },

  yara(args) {
    return {
      output:
        `yara ${args.join(" ")} (laboratorio)\n` +
        `[MATCH] regla 'ejemplo_malware' en la muestra\n` +
        `Clasificación educativa. Mantené las reglas actualizadas.\n`,
      isError: false,
    };
  },

  clamav(args) {
    const path = args[0] ?? "/home/student";
    return {
      output:
        `clamav escaneando ${path} (laboratorio)\n` +
        `  3 archivos revisados, 0 infectados\n` +
        `Primera línea de defensa: combinala con otras capas.\n`,
      isError: false,
    };
  },

  johntheripper(args) {
    // john REAL sobre el motor de ÑANDE: crackea los hashes que le pases con
    // el diccionario, respetando --format, --rules y --mask.
    const fmtArg = args.find((a) => a.startsWith("--format="))?.slice("--format=".length)?.toLowerCase();
    const algo = fmtArg ? JOHN_FORMATS[fmtArg] : undefined;
    if (fmtArg && !algo) {
      return { output: `john: formato "${fmtArg}" no soportado en el lab. Usá --format=raw-md5 o --format=raw-sha256.\n`, isError: false };
    }
    const rules = args.includes("--rules") || args.some((a) => a.startsWith("--rules="));
    const maskArg = args.find((a) => a.startsWith("--mask="))?.slice("--mask=".length);
    const wl = args.find((a) => a.startsWith("--wordlist="))?.slice("--wordlist=".length) ?? "rockyou.txt";
    const attack = maskArg ? `máscara ${maskArg}` : rules ? `diccionario + reglas (${wl})` : `diccionario (${wl})`;
    const { lines, cracked, flag } = crackCli(args, { algo, rules, mask: maskArg });
    const head =
      `John the Ripper (edición ÑANDE)\n` +
      `Modo: ${attack}\n` +
      (cracked.length
        ? cracked.map((c) => `${c.pass.padEnd(16)}(${c.algo})`).join("\n") + "\n"
        : "") +
      lines.join("\n") + (lines.length ? "\n" : "");
    const tail = cracked.length
      ? `${cracked.length} contraseña(s) rota(s). 'john --show' las relista.\n` +
        `Defensa: hashing lento con sal (bcrypt/argon2) y contraseñas largas.\n`
      : `Sin resultados. Probá --rules, otro diccionario, o --mask=?d?d?d?d.\n`;
    return { output: head + tail, isError: false, flag };
  },

  hashcat(args, ctx) {
    // -m 22000 = WPA-PBKDF2-PMKID+EAPOL: crackea el handshake/PMKID capturado
    // contra el motor de radio real. Es el modo moderno (reemplaza a -m 2500).
    const mIdx = args.indexOf("-m");
    const mode = mIdx >= 0 ? args[mIdx + 1] : "";
    if ((mode === "22000" || mode === "2500" || mode === "16800") && ctx.radio) {
      const radio = ctx.radio;
      const wIdx = args.indexOf("-w");
      const wordlist = wIdx >= 0 ? (args[wIdx + 1] ?? "rockyou.txt") : "rockyou.txt";
      // Objetivo: un ESSID/BSSID conocido entre los argumentos.
      const target = args.find((a) => !a.startsWith("-") && a !== mode && a !== wordlist && !!radio.resolve(a));
      if (!target) {
        return {
          output:
            "hashcat: no encuentro el AP objetivo. Pasá el ESSID capturado.\n" +
            "Ej: hashcat -m 22000 pmkid.pcapng -w rockyou.txt Oficina-5G\n",
          isError: false,
        };
      }
      const r = radio.crack(target, wordlist);
      if (!r.ok) return { output: `hashcat: ${r.message}\n`, isError: false };
      const header =
        `hashcat (v6.2, edición ÑANDE) — modo ${mode} (WPA-PMKID/EAPOL)\n` +
        `Diccionario: ${wordlist}  ·  ${r.keysTested} claves probadas (${r.rate} kH/s)\n`;
      if (r.found) {
        return {
          output: header + `\n${r.key ? `[recuperada] ${target}:${r.key}` : ""}\nStatus...........: Cracked${r.flag ? `\nBandera: ${r.flag}` : ""}\n`,
          isError: false,
          flag: r.flag,
        };
      }
      return { output: header + `\nStatus...........: Exhausted — ${r.message}\n`, isError: false };
    }

    // Modos de hash "normales" (MD5/SHA-256) contra el motor real de crackeo.
    if (mode && !HASHCAT_MODES[mode]) {
      return {
        output:
          `hashcat: modo -m ${mode} no soportado en el lab (motor MD5/SHA-256).\n` +
          `Usá -m 0 (MD5), -m 1400 (SHA-256) o -m 22000 (WPA). 'hashid <hash>' te dice cuál.\n`,
        isError: false,
      };
    }
    const algo = mode ? HASHCAT_MODES[mode].algo : undefined;
    // -a 3 = ataque por máscara (brute); -a 0 (o sin -a) = diccionario.
    const aIdx = args.indexOf("-a");
    const attackMode = aIdx >= 0 ? args[aIdx + 1] : "0";
    const mask = attackMode === "3" ? args.find((a) => /\?[dlu]/.test(a)) : undefined;
    const rules = args.some((a) => a === "-r" || a.startsWith("--rules"));
    const wIdx = args.indexOf("-w");
    const wl = wIdx >= 0 ? (args[wIdx + 1] ?? "rockyou.txt") : "rockyou.txt";
    const { lines, cracked, flag } = crackCli(args, { algo, rules, mask });
    const modeName = mode ? HASHCAT_MODES[mode].name : "auto";
    const atk = mask ? `-a 3 (máscara ${mask})` : `-a 0 (diccionario ${wl}${rules ? " + reglas" : ""})`;
    const head =
      `hashcat (v6.2, edición ÑANDE) — -m ${mode || "?"} (${modeName})  ${atk}\n` +
      `Speed.#1.........: ${algo === "sha256" ? "820.0 MH/s" : "9450.1 MH/s"} (GPU laboratorio)\n\n` +
      (cracked.length ? cracked.map((c) => `${c.hash}:${c.pass}`).join("\n") + "\n" : "") +
      lines.join("\n") + (lines.length ? "\n" : "");
    const tail = cracked.length
      ? `Status...........: Cracked (${cracked.length})  ·  'hashcat --show' las relista.\n`
      : `Status...........: Exhausted — sin resultados. Probá -r reglas o -a 3 con máscara.\n`;
    return { output: head + tail, isError: false, flag };
  },

  metasploit() {
    // La explotación de verdad vive en la consola stateful (VirtualTerminal →
    // MsfConsole): search/use/set/exploit con estado, y el exploit sólo funciona
    // si el objetivo es REALMENTE vulnerable. Nada scripteado acá.
    return {
      output:
        `msfconsole es interactivo. Abrí la consola y seguí el flujo real:\n` +
        `  msfconsole                       (entra a la consola msf6)\n` +
        `  search cmdi                      (buscar módulos)\n` +
        `  use exploit/nande/http/cmd_injection\n` +
        `  set RHOSTS 10.10.5.50 ; set LHOST 10.10.0.5 ; set LPORT 4444\n` +
        `  check ; exploit\n` +
        `Atajo de una tirada: msfconsole -x "use ...; set RHOSTS ...; exploit"\n`,
      isError: false,
    };
  },

  mimikatz() {
    // El volcado de credenciales y Pass-the-Hash REALES viven en la terminal
    // (VirtualTerminal → directory.dumpableCredentials / passTheHash), operando
    // sobre el grafo del dominio. Nada scripteado.
    return {
      output:
        `mimikatz es post-explotación: desde la terminal, ya con un equipo poseído,\n` +
        `  mimikatz sekurlsa::logonpasswords            (volcá hashes NT cacheados)\n` +
        `  mimikatz "sekurlsa::pth /user:<cuenta> /ntlm:<hash>"   (Pass-the-Hash)\n`,
      isError: false,
    };
  },

  crackmapexec() {
    // El barrido de autenticación REAL vive en la terminal (VirtualTerminal →
    // directory.smbLogin): verifica la clave contra la cuenta y, si acierta,
    // poseés el principal (estado que NandeBlood recalcula). Nada simulado.
    return {
      output:
        `crackmapexec es interactivo contra el dominio. Desde la terminal:\n` +
        `  enum4linux nande.local                       (enumerá usuarios/SPN)\n` +
        `  crackmapexec smb dc01.nande.local -u svc-sql -p 'Verano2024!'\n` +
        `  nandeblood                                   (mirá cómo cambió la ruta)\n`,
      isError: false,
    };
  },

  openssl(args) {
    const target = args.find((a) => a.includes(".nande")) ?? "news.nande";
    return {
      output:
        `openssl s_client -connect ${target}:443 (laboratorio)\n` +
        `  Certificado: CN=${target} (emisor ficticio ÑANDE CA)\n` +
        `  Protocolo: TLS 1.2\n` +
        `Todo dentro del sandbox.\n`,
      isError: false,
    };
  },
};
