import { TOOL_CATALOG } from "./toolCatalog";
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

  whois(args) {
    const target = args[0] ?? "";

    if (!target.endsWith(".nande") && !target.endsWith(".lab")) {
      return {
        output: `whois: solo dominios virtuales .nande/.lab\n`,
        isError: true,
      };
    }

    return {
      output:
        `Dominio: ${target}\n` +
        `Registrante: Habitante virtual de ÑANDE (ficticio)\n` +
        `Creado: día 1 del mundo\n` +
        `Servidores: dns.nande\n` +
        `(Todos los datos son ficticios del sandbox.)\n`,
      isError: false,
    };
  },

  harvester(args) {
    const target = args[0] ?? "startup.nande";

    return {
      output:
        `harvester sobre ${target} (datos ficticios de ÑANDE)\n` +
        `Correos:\n  info@${target}\n  soporte@${target}\n` +
        `Subdominios:\n  www.${target}\n  api.${target}\n`,
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
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target);

    if (guard) {
      return { output: `nikto: ${guard}\n`, isError: true };
    }

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

  searchsploit(args) {
    const query = args.join(" ") || "?";

    return {
      output:
        `searchsploit "${query}" (catálogo educativo de ÑANDE)\n` +
        `- ${query}: desbordamiento conocido (ficticio) — severidad alta\n` +
        `- ${query}: bypass de autenticación (ficticio) — severidad media\n` +
        `Nota: relacioná versión + fallo, y verificá en un lab.\n`,
      isError: false,
    };
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
    const hash = args[0] ?? "";
    const len = hash.length;
    const guess =
      len === 32 ? "MD5" : len === 40 ? "SHA1" : len === 64 ? "SHA256" : "desconocido";

    return {
      output: `hashid: "${hash}"\nPosible tipo: ${guess}\n`,
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

  sherlock(args) {
    const user = args[0] ?? "yvoty";

    return {
      output:
        `sherlock "${user}" (perfiles ficticios de ÑANDE)\n` +
        `[+] social.nande/${user}\n` +
        `[+] git.nande/user/${user}\n` +
        `[-] video.nande/${user} (no encontrado)\n`,
      isError: false,
    };
  },

  shodan(args) {
    const q = args[0] ?? "http";

    return {
      output:
        `shodan "${q}" (catálogo virtual de ÑANDE)\n` +
        `10.10.5.10  ÑandeHTTPd/1.4  puerto 80\n` +
        `10.10.5.20  ÑandeSQL 5.7  puerto 3306\n` +
        `Solo servicios del sandbox. Nada real.\n`,
      isError: false,
    };
  },

  whatweb(args, ctx) {
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target);

    if (guard) {
      return { output: `whatweb: ${guard}\n`, isError: true };
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

  enum4linux(args, ctx) {
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target);
    if (guard) return { output: `enum4linux: ${guard}\n`, isError: true };

    const machine = ctx.lab.resolve(target);
    if (!machine) return { output: `enum4linux: objetivo no válido.\n`, isError: false };

    return {
      output:
        `enum4linux sobre ${machine.hostname} (${machine.ip})\n` +
        `[+] Usuarios: student, admin, backup (laboratorio)\n` +
        `[+] Grupos: users, wheel\n` +
        `[+] Comparticiones: /pub (lectura anónima)\n` +
        `Lección: restringí el acceso anónimo a recursos compartidos.\n`,
      isError: false,
    };
  },

  smbclient(args) {
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target);
    if (guard) return { output: `smbclient: ${guard}\n`, isError: true };

    return {
      output:
        `smbclient //${target}/pub (laboratorio)\n` +
        `  documento.txt\n  respaldo.zip\n  notas.md\n` +
        `Acceso anónimo permitido: hallazgo de seguridad.\n`,
      isError: false,
    };
  },

  wpscan(args) {
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target);
    if (guard) return { output: `wpscan: ${guard}\n`, isError: true };

    return {
      output:
        `wpscan sobre ${target} (simulación)\n` +
        `[+] WordPress 5.2 (desactualizado)\n` +
        `[!] plugin 'contact-form' 1.0 — vulnerable (ficticio)\n` +
        `[+] usuarios: admin, editor\n` +
        `Lección: actualizá núcleo y plugins; quitá los que no uses.\n`,
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
    const url = args.find((a) => a.startsWith("http")) ?? "";
    const host = url.match(/^https?:\/\/([^/]+)/i)?.[1] ?? "";
    const guard = requireVirtualTarget(host);
    if (guard) return { output: `dalfox: ${guard}\n`, isError: true };

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
    const url = args.find((a) => a.startsWith("http")) ?? "";
    const host = url.match(/^https?:\/\/([^/]+)/i)?.[1] ?? "";
    const guard = requireVirtualTarget(host);
    if (guard) return { output: `commix: ${guard}\n`, isError: true };

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
    const target = args[0] ?? "";
    const ip = ctx.dns.resolve(target) ?? ctx.lab.resolve(target)?.ip;
    if (!ip) return { output: `sslscan: no se resolvió ${target}\n`, isError: false };

    return {
      output:
        `sslscan ${target} (laboratorio)\n` +
        `  TLS 1.2  aceptado\n  TLS 1.0  aceptado  ⚠ obsoleto\n` +
        `  Cifrado débil detectado ⚠\n` +
        `Defensa: desactivá TLS viejo y cifrados débiles.\n`,
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
    return {
      output:
        `john ${args.join(" ") || "hashes.txt"} (laboratorio)\n` +
        `hola123      (usuario1)\n123456       (usuario2)\n` +
        `2 contraseñas rotas: eran débiles.\n` +
        `Defensa: hashing lento con sal y contraseñas largas.\n`,
      isError: false,
    };
  },

  hashcat(args) {
    return RUNNERS.johntheripper(args, {} as ToolContext);
  },

  metasploit(args, ctx) {
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target);
    if (guard) return { output: `msf: ${guard}\n`, isError: true };

    const machine = ctx.lab.resolve(target);
    if (!machine) return { output: `msf: objetivo no válido.\n`, isError: false };

    return {
      output:
        `msf > exploit contra ${machine.hostname} (laboratorio)\n` +
        `[*] probando módulo compatible con ${machine.services[0]?.name ?? "servicio"}...\n` +
        `[+] sesión abierta (simulada) en ${machine.ip}\n` +
        `Lección: si el servicio está parcheado, el exploit no funciona.\n`,
      isError: false,
    };
  },

  crackmapexec(args, ctx) {
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target.split("/")[0]);
    if (guard) return { output: `cme: ${guard}\n`, isError: true };

    return {
      output:
        `cme sobre ${target} (laboratorio)\n` +
        ctx.lab.liveHosts().map((ip) => `${ip}  [+] credencial válida (simulada)`).join("\n") +
        `\nLección: una contraseña reutilizada abre media red.\n`,
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
