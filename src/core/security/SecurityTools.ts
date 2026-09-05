import { TOOL_CATALOG } from "./toolCatalog";
import type { ToolCategory, ToolDef, ToolLevel } from "./toolCatalog";
import { LabNetwork } from "./LabNetwork";
import type { VirtualNetwork } from "../network/VirtualNetwork";
import type { VirtualDNS } from "../dns/VirtualDNS";

export type { ToolDef, ToolCategory, ToolLevel } from "./toolCatalog";

export interface ToolRunResult {
  output: string;
  isError: boolean;
  /** Bandera encontrada, si la corrida la revela. */
  flag?: string;
}

/** Dependencias que necesitan las herramientas ejecutables. */
interface ToolContext {
  lab: LabNetwork;
  network: VirtualNetwork;
  dns: VirtualDNS;
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

  constructor(network: VirtualNetwork, dns: VirtualDNS) {
    this.tools = new Map(TOOL_CATALOG.map((tool) => [tool.id, tool]));
    this.context = {
      lab: new LabNetwork(),
      network,
      dns,
    };
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
    const target = args.find((a) => !a.startsWith("-")) ?? "";
    const err = requireVirtualTarget(target);

    if (err) {
      return { output: `nmap: ${err}\n`, isError: true };
    }

    const machine = ctx.lab.resolve(target);

    if (!machine) {
      const ip = ctx.dns.resolve(target);

      if (ip) {
        return {
          output:
            `Nmap scan para ${target} (${ip})\n` +
            `Host activo. Servicio web virtual en 80/tcp.\n` +
            `Sugerencia: probá una máquina de laboratorio (nmap 10.10.5.10).\n`,
          isError: false,
        };
      }

      return {
        output: `nmap: ${target} no está en la red de laboratorio.\n`,
        isError: false,
      };
    }

    if (!machine.up) {
      return { output: `nmap: ${target} parece caído.\n`, isError: false };
    }

    const rows = machine.services
      .map(
        (s) =>
          `${s.port}/${s.protocol}`.padEnd(10) +
          `open`.padEnd(8) +
          `${s.name}`.padEnd(10) +
          s.version,
      )
      .join("\n");

    return {
      output:
        `Nmap scan para ${machine.hostname} (${machine.ip})\n` +
        `Sistema: ${machine.os}\n\n` +
        `PUERTO    ESTADO  SERVICIO  VERSIÓN\n` +
        rows +
        `\n\n${machine.services.length} puertos abiertos. ` +
        `Siguiente paso: identificá los servicios y buscá fallos conocidos.\n`,
      isError: false,
    };
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

    return {
      output:
        `HTTP/1.1 200 OK\nServer: ${server?.version ?? "?"}\n\n` +
        `<h1>${route.title}</h1>\n<!-- ${machine.hostname}${path} -->\n`,
      isError: false,
    };
  },

  gobuster(args, ctx) {
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target);

    if (guard) {
      return { output: `gobuster: ${guard}\n`, isError: true };
    }

    const machine = ctx.lab.resolve(target);

    if (!machine) {
      return {
        output: `gobuster: ${target} no es una máquina de laboratorio.\n`,
        isError: false,
      };
    }

    const found = machine.webRoutes
      .map(
        (r) =>
          `/${r.path.replace(/^\//, "").padEnd(20)} (Status: 200)` +
          (r.hidden ? "  <- oculta" : ""),
      )
      .join("\n");

    return {
      output:
        `gobuster sobre ${machine.hostname}\n${found}\n` +
        `${machine.webRoutes.length} rutas encontradas. Las ocultas suelen ser lo interesante.\n`,
      isError: false,
    };
  },

  ffuf(args, ctx) {
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target);

    if (guard) {
      return { output: `ffuf: ${guard}\n`, isError: true };
    }

    const machine = ctx.lab.resolve(target);

    if (!machine) {
      return { output: `ffuf: objetivo no válido.\n`, isError: false };
    }

    const hidden = machine.webRoutes.filter((r) => r.hidden);

    return {
      output:
        `ffuf sobre ${machine.hostname}\n` +
        (hidden.length
          ? hidden.map((r) => `${r.path}  [Status: 200]`).join("\n")
          : "sin rutas ocultas") +
        `\n`,
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
    const host = url.match(/^https?:\/\/([^/]+)/i)?.[1] ?? "";
    const guard = requireVirtualTarget(host);

    if (guard) {
      return { output: `sqlmap: ${guard}\n`, isError: true };
    }

    const machine = ctx.lab.resolve(host);
    const sqli = machine?.vulns.find((v) => v.id.includes("SQLI"));

    if (!machine) {
      return { output: `sqlmap: objetivo no válido.\n`, isError: false };
    }

    if (!sqli) {
      return {
        output:
          `sqlmap sobre ${machine.hostname}\n` +
          `El parámetro no parece inyectable. Probá otra máquina (lab-web-01).\n`,
        isError: false,
      };
    }

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
  },

  hydra(args, ctx) {
    const target = args[0] ?? "";
    const guard = requireVirtualTarget(target);

    if (guard) {
      return { output: `hydra: ${guard}\n`, isError: true };
    }

    const machine = ctx.lab.resolve(target);

    if (!machine) {
      return { output: `hydra: objetivo no válido.\n`, isError: false };
    }

    const hasSsh = machine.services.some((s) => s.name === "ssh");

    if (!hasSsh) {
      return {
        output: `hydra: ${machine.hostname} no expone SSH.\n`,
        isError: false,
      };
    }

    return {
      output:
        `hydra contra ${machine.hostname}:22 (ssh)\n` +
        `[intentando lista de contraseñas comunes...]\n` +
        `[22][ssh] login: student  password: (débil, de laboratorio)\n` +
        `1 credencial encontrada. Lección: contraseñas fuertes + bloqueo por intentos.\n`,
      isError: false,
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

  commix(args) {
    const url = args.find((a) => a.startsWith("http")) ?? "";
    const host = url.match(/^https?:\/\/([^/]+)/i)?.[1] ?? "";
    const guard = requireVirtualTarget(host);
    if (guard) return { output: `commix: ${guard}\n`, isError: true };

    return {
      output:
        `commix: ${host}\n` +
        `El parámetro no pasa entrada al sistema: no inyectable aquí.\n` +
        `Lección: nunca pases datos del usuario a comandos del sistema.\n`,
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
    const file = args[0] ?? "";
    return {
      output:
        `exiftool ${file} (metadatos ficticios)\n` +
        `  Cámara: ÑandePhone 3\n  Fecha: día 1 del mundo\n` +
        `  Ubicación: (removida)\n` +
        `Lección: limpiá metadatos antes de publicar archivos.\n`,
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
