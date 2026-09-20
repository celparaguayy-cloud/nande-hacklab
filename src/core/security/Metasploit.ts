import type { LabMachine } from "./LabNetwork";

/**
 * ÑandeMSF — una consola de explotación estilo Metasploit Framework, REAL y
 * determinista, 100% dentro del sandbox.
 *
 * No es una salida scripteada: es una máquina de estados con datastore,
 * módulos y sesiones. Un exploit SÓLO tiene éxito si el objetivo (una máquina
 * del laboratorio) tiene DE VERDAD la vulnerabilidad que el módulo ataca y las
 * opciones requeridas están puestas. Si el servicio no es vulnerable, falla —
 * igual que en la vida real. Los objetivos son exclusivamente la red 10.10.x.y
 * del laboratorio: nada de esto alcanza a internet real.
 *
 * Flujo idéntico al real:
 *   search <término> → use <módulo|N> → set RHOSTS <ip> → set PAYLOAD <p> →
 *   show options → check → exploit/run → sessions -i <n> → sysinfo/getuid/cat.
 */

export type MsfKind = "exploit" | "auxiliary" | "post";

export interface MsfModule {
  path: string;
  kind: MsfKind;
  rank: "excellent" | "great" | "good" | "normal";
  desc: string;
  /** Id de la vuln de laboratorio que este módulo explota (LabVuln.id). */
  targetVuln?: string;
  /** Puerto por defecto del servicio atacado. */
  rport?: number;
  /** ¿Necesita un PAYLOAD? (los exploits de código remoto, sí). */
  needsPayload?: boolean;
  /** ¿Necesita una SESSION previa? (los módulos local/post, sí). */
  needsSession?: boolean;
  /** Qué entrega al tener éxito. */
  gives: "meterpreter" | "shell" | "loot" | "root";
  /** Referencia educativa (categoría OWASP/MITRE, no un CVE real). */
  ref: string;
}

export interface MsfSession {
  id: number;
  type: "meterpreter" | "shell";
  target: string;
  host: string;
  user: string;
  root: boolean;
  via: string;
}

export interface MsfResult {
  output: string;
  isError: boolean;
  /** Bandera de la máquina comprometida (para acreditar el lab resuelto). */
  flag?: string;
  /** IP del objetivo comprometido (para que el terminal acredite el lab). */
  rhosts?: string;
}

/** Payloads compatibles del framework (ficticios, de laboratorio). */
const PAYLOADS = [
  "nande/shell/reverse_tcp",
  "nande/shell/bind_tcp",
  "nande/meterpreter/reverse_tcp",
  "nande/meterpreter/bind_tcp",
];

/** Catálogo de módulos, cada uno atado a una vuln REAL del laboratorio. */
const MODULES: MsfModule[] = [
  {
    path: "exploit/nande/http/cmd_injection",
    kind: "exploit",
    rank: "excellent",
    desc: "Inyección de comandos en la herramienta de ping (RCE → sesión).",
    targetVuln: "NANDE-WEB-CMDI",
    rport: 80,
    needsPayload: true,
    gives: "meterpreter",
    ref: "OWASP A03:2021 (Injection) · MITRE T1190",
  },
  {
    path: "exploit/nande/http/sqli_login_bypass",
    kind: "exploit",
    rank: "great",
    desc: "Bypass de autenticación por SQLi en el login (foothold web).",
    targetVuln: "NANDE-WEB-SQLI",
    rport: 80,
    needsPayload: false,
    gives: "shell",
    ref: "OWASP A03:2021 (Injection) · MITRE T1190",
  },
  {
    path: "auxiliary/scanner/ftp/anonymous",
    kind: "auxiliary",
    rank: "normal",
    desc: "Detecta y usa el acceso FTP anónimo para leer archivos del server.",
    targetVuln: "NANDE-NET-FTPANON",
    rport: 21,
    needsPayload: false,
    gives: "loot",
    ref: "MITRE T1078 (Valid Accounts) · CWE-287",
  },
  {
    path: "auxiliary/sniffer/telnet_cleartext",
    kind: "auxiliary",
    rank: "normal",
    desc: "Captura credenciales de Telnet, que viajan sin cifrar.",
    targetVuln: "NANDE-NET-TELNET",
    rport: 23,
    needsPayload: false,
    gives: "loot",
    ref: "MITRE T1040 (Network Sniffing) · CWE-319",
  },
  {
    path: "exploit/nande/local/suid_privesc",
    kind: "exploit",
    rank: "great",
    desc: "Escala a root abusando de un binario con SUID mal puesto.",
    targetVuln: "NANDE-LNX-SUID",
    needsPayload: false,
    needsSession: true,
    gives: "root",
    ref: "MITRE T1548.001 (SUID/SGID) · GTFOBins",
  },
  {
    path: "post/nande/gather/hashdump",
    kind: "post",
    rank: "normal",
    desc: "Vuelca los hashes de contraseñas de una sesión ya obtenida.",
    needsSession: true,
    gives: "loot",
    ref: "MITRE T1003 (OS Credential Dumping)",
  },
];

export class MsfConsole {
  private modules: MsfModule[] = MODULES;
  private current: MsfModule | null = null;
  private datastore: Record<string, string> = {};
  private sessions: MsfSession[] = [];
  private nextSid = 1;
  /** Resultado de la última búsqueda, para `use <N>`. */
  private lastSearch: MsfModule[] = [];

  /** El prompt actual, tal cual lo muestra msfconsole. */
  prompt(): string {
    if (!this.current) return "msf6 > ";
    const kind = this.current.kind;
    return `msf6 ${kind}(${this.current.path.replace(/^(exploit|auxiliary|post)\//, "")}) > `;
  }

  /** Estado de sesiones (para que el terminal lo consulte si hace falta). */
  openSessions(): MsfSession[] {
    return [...this.sessions];
  }

  banner(): string {
    return (
      "       =[ ÑandeMSF v6 — Framework de explotación de laboratorio ]\n" +
      "+ -- --=[ " + this.modules.length + " módulos · payloads: " + PAYLOADS.length + " ]\n" +
      "+ -- --=[ 100% offline · objetivos SÓLO en 10.10.x.y ]\n\n" +
      "Objetivos: usá 'search', luego 'use <módulo>'. 'help' para la lista.\n"
    );
  }

  /** Ejecuta una línea de consola. `machines` es la foto viva del laboratorio. */
  exec(line: string, machines: LabMachine[]): MsfResult {
    const parts = line.trim().split(/\s+/);
    const cmd = (parts[0] ?? "").toLowerCase();
    const rest = parts.slice(1);

    switch (cmd) {
      case "":
        return this.ok("");
      case "help":
      case "?":
        return this.ok(this.help());
      case "banner":
        return this.ok(this.banner());
      case "version":
        return this.ok("Framework: ÑandeMSF v6 (laboratorio)\n");
      case "search":
        return this.search(rest.join(" "));
      case "use":
        return this.use(rest[0] ?? "");
      case "back":
        this.current = null;
        return this.ok("");
      case "info":
        return this.info();
      case "show":
        return this.show(rest[0] ?? "");
      case "options":
        return this.show("options");
      case "payloads":
        return this.show("payloads");
      case "set":
        return this.set(rest[0] ?? "", rest.slice(1).join(" "));
      case "setg":
        return this.set(rest[0] ?? "", rest.slice(1).join(" "));
      case "unset":
        return this.unset(rest[0] ?? "");
      case "check":
        return this.check(machines);
      case "exploit":
      case "run":
        return this.run(machines);
      case "sessions":
        return this.sessionsCmd(rest, machines);
      case "sysinfo":
      case "getuid":
      case "shell":
        return this.sessionAction(cmd);
      case "cat":
        return this.catLoot(rest[0] ?? "", machines);
      default:
        return this.err(
          `[-] Comando desconocido: "${cmd}". Escribí 'help'.\n`,
        );
    }
  }

  /* ------------------------------------------------------------- comandos */

  private search(term: string): MsfResult {
    const t = term.toLowerCase();
    const hits = t
      ? this.modules.filter(
          (m) =>
            m.path.toLowerCase().includes(t) ||
            m.desc.toLowerCase().includes(t) ||
            m.ref.toLowerCase().includes(t) ||
            (m.targetVuln ?? "").toLowerCase().includes(t) ||
            m.kind.includes(t),
        )
      : [...this.modules];
    this.lastSearch = hits;
    if (hits.length === 0) return this.ok(`No hay módulos que matcheen "${term}".\n`);
    const rows = hits
      .map((m, i) => `  ${String(i).padStart(2)}  ${m.path.padEnd(38)} ${m.rank.padEnd(9)} ${m.desc}`)
      .join("\n");
    return this.ok(
      `Matching Modules\n================\n\n  #   Name                                   Rank      Description\n  -   ----                                   ----      -----------\n${rows}\n\nUsá: use <#>  ó  use <nombre>\n`,
    );
  }

  private use(sel: string): MsfResult {
    if (!sel) return this.err("Uso: use <módulo|N>\n");
    let mod: MsfModule | undefined;
    if (/^\d+$/.test(sel)) mod = this.lastSearch[parseInt(sel, 10)];
    else mod = this.modules.find((m) => m.path === sel || m.path.endsWith("/" + sel));
    if (!mod) return this.err(`Módulo no encontrado: ${sel}\n`);
    this.current = mod;
    // Valores por defecto del módulo (como el real precarga RPORT, etc.).
    if (mod.rport) this.datastore.RPORT = String(mod.rport);
    if (mod.needsPayload && !this.datastore.PAYLOAD) {
      this.datastore.PAYLOAD = "nande/meterpreter/reverse_tcp";
    }
    return this.ok(
      `[*] Módulo cargado: ${mod.path}\n` +
        (mod.needsPayload ? `[*] payload por defecto → ${this.datastore.PAYLOAD}\n` : ""),
    );
  }

  private info(): MsfResult {
    const m = this.current;
    if (!m) return this.err("No hay módulo cargado. Usá 'use <módulo>'.\n");
    return this.ok(
      `       Name: ${m.path}\n` +
        `     Module: ${m.kind}\n` +
        `       Rank: ${m.rank}\n` +
        `Description: ${m.desc}\n` +
        ` References: ${m.ref}\n` +
        (m.targetVuln ? `   Objetivo: vuln ${m.targetVuln}\n` : "") +
        (m.needsSession ? `      Nota: requiere SESSION (módulo local/post).\n` : ""),
    );
  }

  private show(what: string): MsfResult {
    const w = what.toLowerCase();
    if (w === "payloads") {
      if (!this.current?.needsPayload) return this.ok("Este módulo no usa payloads.\n");
      return this.ok(
        "Compatible Payloads\n===================\n\n" +
          PAYLOADS.map((p, i) => `  ${i}  ${p}`).join("\n") +
          "\n",
      );
    }
    if (w === "options") return this.showOptions();
    if (w === "targets") return this.ok("  0  Automatic\n");
    if (w === "sessions") return this.sessionsCmd(["-l"], []);
    return this.err("show: probá 'show options' o 'show payloads'.\n");
  }

  private showOptions(): MsfResult {
    const m = this.current;
    if (!m) return this.err("No hay módulo cargado. Usá 'use <módulo>'.\n");
    const rows: string[] = [];
    const opt = (name: string, req: boolean, desc: string) => {
      const val = this.datastore[name] ?? "";
      rows.push(`  ${name.padEnd(10)} ${val.padEnd(22)} ${req ? "yes" : "no "}       ${desc}`);
    };
    rows.push("Name       Current Setting        Required  Description");
    rows.push("----       ---------------        --------  -----------");
    if (m.needsSession) {
      opt("SESSION", true, "La sesión sobre la que actuar (sessions -l)");
    } else {
      opt("RHOSTS", true, "El objetivo (IP 10.10.x.y del laboratorio)");
      if (m.rport) opt("RPORT", true, "Puerto del servicio");
    }
    if (m.needsPayload) {
      opt("PAYLOAD", true, "El payload a entregar");
      opt("LHOST", true, "Tu IP para la conexión inversa");
      opt("LPORT", true, "Tu puerto de escucha");
    }
    const missing = this.missingOptions();
    return this.ok(
      `Module options (${m.path}):\n\n${rows.join("\n")}\n\n` +
        (missing.length
          ? `[!] Falta definir: ${missing.join(", ")}\n`
          : `[+] Todas las opciones requeridas están puestas.\n`),
    );
  }

  private missingOptions(): string[] {
    const m = this.current;
    if (!m) return [];
    const need: string[] = [];
    if (m.needsSession) {
      if (!this.datastore.SESSION) need.push("SESSION");
    } else {
      if (!this.datastore.RHOSTS) need.push("RHOSTS");
      if (m.rport && !this.datastore.RPORT) need.push("RPORT");
    }
    if (m.needsPayload) {
      if (!this.datastore.PAYLOAD) need.push("PAYLOAD");
      if (!this.datastore.LHOST) need.push("LHOST");
      if (!this.datastore.LPORT) need.push("LPORT");
    }
    return need;
  }

  private set(name: string, value: string): MsfResult {
    if (!name || !value) return this.err("Uso: set <OPCIÓN> <valor>\n");
    const key = name.toUpperCase();
    if (key === "PAYLOAD" && !PAYLOADS.includes(value)) {
      return this.err(`[-] Payload inválido: ${value}. Mirá 'show payloads'.\n`);
    }
    this.datastore[key] = value;
    return this.ok(`${key} => ${value}\n`);
  }

  private unset(name: string): MsfResult {
    const key = name.toUpperCase();
    if (this.datastore[key] === undefined) return this.err(`${key} no estaba puesto.\n`);
    delete this.datastore[key];
    return this.ok(`Unsetting ${key}...\n`);
  }

  /** `check`: dice si el objetivo es vulnerable, sin explotar. */
  private check(machines: LabMachine[]): MsfResult {
    const m = this.current;
    if (!m) return this.err("No hay módulo cargado.\n");
    if (m.needsSession) return this.ok("[*] Este módulo es local/post: no aplica 'check' remoto.\n");
    const rhosts = this.datastore.RHOSTS;
    if (!rhosts) return this.err("[-] Falta RHOSTS.\n");
    const machine = machines.find((x) => x.ip === rhosts || x.hostname === rhosts);
    if (!machine) return this.err(`[-] ${rhosts} no es una máquina del laboratorio.\n`);
    if (!machine.up) return this.ok(`[*] ${rhosts} - El host parece estar apagado.\n`);
    const vuln = this.matchVuln(machine, m);
    return this.ok(
      vuln
        ? `[+] ${rhosts}:${this.datastore.RPORT ?? "?"} - El objetivo ES vulnerable (${vuln.id}).\n`
        : `[-] ${rhosts} - El objetivo NO parece vulnerable a este módulo (servicio parcheado o inexistente).\n`,
    );
  }

  private matchVuln(machine: LabMachine, m: MsfModule) {
    return machine.vulns.find((v) => v.id === m.targetVuln);
  }

  /** El corazón: explota SÓLO si el objetivo es de verdad vulnerable. */
  private run(machines: LabMachine[]): MsfResult {
    const m = this.current;
    if (!m) return this.err("No hay módulo cargado. Usá 'use <módulo>'.\n");

    const missing = this.missingOptions();
    if (missing.length) return this.err(`[-] Faltan opciones: ${missing.join(", ")}. Mirá 'show options'.\n`);

    // Módulos local/post: operan sobre una SESSION ya abierta.
    if (m.needsSession) return this.runLocal(m, machines);

    const rhosts = this.datastore.RHOSTS;
    const machine = machines.find((x) => x.ip === rhosts || x.hostname === rhosts);
    if (!machine) return this.err(`[-] ${rhosts} no es una máquina del laboratorio (sólo 10.10.x.y).\n`);
    if (!machine.up) return this.err(`[-] Exploit falló: ${rhosts} está apagado.\n`);

    // ¿El puerto/servicio existe realmente?
    if (m.rport) {
      const svc = machine.services.find((s) => s.port === Number(this.datastore.RPORT ?? m.rport));
      if (!svc) {
        return this.err(
          `[*] Iniciando handler...\n[-] Exploit falló: no hay servicio en ${rhosts}:${this.datastore.RPORT}.\n`,
        );
      }
    }

    // ¿Es de verdad vulnerable a ESTE módulo?
    const vuln = this.matchVuln(machine, m);
    if (!vuln) {
      return this.err(
        `[*] ${rhosts}:${this.datastore.RPORT ?? ""} - Enviando exploit...\n` +
          `[-] Exploit completado, pero no se creó ninguna sesión.\n` +
          `    El objetivo no es vulnerable a ${m.path} (servicio parcheado).\n` +
          `    Lección: un exploit sólo funciona si el fallo existe. Reconocé antes de disparar.\n`,
      );
    }

    // Éxito real.
    if (m.kind === "auxiliary") {
      return this.auxSuccess(m, machine);
    }

    const type: MsfSession["type"] = m.gives === "meterpreter" ? "meterpreter" : "shell";
    const session = this.openSession(type, machine, m.path, false, "www-data");
    return {
      output:
        (m.needsPayload
          ? `[*] Iniciando handler inverso en ${this.datastore.LHOST}:${this.datastore.LPORT}\n`
          : "") +
        `[*] ${machine.ip}:${this.datastore.RPORT ?? ""} - Enviando exploit (${vuln.id})...\n` +
        `[+] ${machine.ip} - ¡Explotado! ${vuln.title}\n` +
        `[*] Sesión ${type} ${session.id} abierta (${machine.ip})\n\n` +
        `[+] Bandera del sistema: ${machine.flag}\n` +
        `Interactuá con: sessions -i ${session.id}   (sysinfo · getuid · cat flag)\n`,
      isError: false,
      flag: machine.flag,
      rhosts: machine.ip,
    };
  }

  private auxSuccess(m: MsfModule, machine: LabMachine): MsfResult {
    const isFtp = m.path.includes("ftp");
    const loot = isFtp
      ? machine.files.map((f) => `    ${f.path}`).join("\n") || "    (sin archivos legibles)"
      : "    usuario: soporte   contraseña: Verano2024  (¡en texto plano!)";
    return {
      output:
        `[*] ${machine.ip}:${this.datastore.RPORT ?? ""} - Ejecutando módulo auxiliar...\n` +
        `[+] ${machine.ip} - ${m.desc}\n` +
        `[+] Loot:\n${loot}\n\n` +
        `[+] Bandera del sistema: ${machine.flag}\n`,
      isError: false,
      flag: machine.flag,
      rhosts: machine.ip,
    };
  }

  private runLocal(m: MsfModule, machines: LabMachine[]): MsfResult {
    const sid = Number(this.datastore.SESSION);
    const base = this.sessions.find((s) => s.id === sid);
    if (!base) return this.err(`[-] La sesión ${this.datastore.SESSION} no existe. Mirá 'sessions -l'.\n`);
    const machine = machines.find((x) => x.ip === base.target);
    if (!machine) return this.err(`[-] La sesión ${sid} no apunta a una máquina conocida.\n`);

    // post/hashdump: no necesita vuln, sólo la sesión.
    if (m.kind === "post") {
      return this.ok(
        `[*] Ejecutando ${m.path} contra la sesión ${sid} (${machine.ip})...\n` +
          `[+] Hashes volcados:\n` +
          `    root:$1$Ñand$3b8f... \n    ${base.user}:$1$Ñand$9c2a...\n` +
          `[+] Guardado en loot. Crackealos offline con john/hashcat.\n`,
      );
    }

    // exploit local (privesc): requiere que la máquina tenga la vuln.
    const vuln = this.matchVuln(machine, m);
    if (!vuln) {
      return this.err(
        `[*] Buscando vector de escalada en ${machine.ip}...\n` +
          `[-] No se encontró el fallo ${m.targetVuln}: no se pudo escalar.\n`,
      );
    }
    const rooted = this.openSession("shell", machine, m.path, true, "root");
    return {
      output:
        `[*] Escalando privilegios en la sesión ${sid} (${machine.ip})...\n` +
        `[+] ${vuln.title} — abusado con éxito.\n` +
        `[+] uid=0(root) gid=0(root)\n` +
        `[*] Nueva sesión ${rooted.type} ${rooted.id} abierta como root (${machine.ip})\n\n` +
        `[+] Bandera de root: ${machine.flag}\n`,
      isError: false,
      flag: machine.flag,
      rhosts: machine.ip,
    };
  }

  private openSession(
    type: MsfSession["type"],
    machine: LabMachine,
    via: string,
    root: boolean,
    user: string,
  ): MsfSession {
    const session: MsfSession = {
      id: this.nextSid,
      type,
      target: machine.ip,
      host: machine.hostname,
      user,
      root,
      via,
    };
    this.nextSid += 1;
    this.sessions.push(session);
    return session;
  }

  private sessionsCmd(rest: string[], machines: LabMachine[]): MsfResult {
    if (rest[0] === "-i") {
      const sid = Number(rest[1]);
      const s = this.sessions.find((x) => x.id === sid);
      if (!s) return this.err(`[-] No existe la sesión ${rest[1]}.\n`);
      this.datastore.SESSION = String(sid);
      const machine = machines.find((x) => x.ip === s.target);
      const flag = machine ? `\n${machine.flag}` : "";
      return this.ok(
        `[*] Interactuando con la sesión ${sid} (${s.type} @ ${s.host} ${s.target})\n` +
          `${s.user}@${s.host}:${s.root ? "#" : "$"} \n` +
          `(comandos: sysinfo · getuid · cat flag${flag})\n`,
      );
    }
    // sessions / sessions -l
    if (this.sessions.length === 0) return this.ok("No hay sesiones activas.\n");
    const rows = this.sessions
      .map((s) => `  ${s.id}  ${s.type.padEnd(11)} ${s.user}@${s.host} (${s.target})  vía ${s.via}`)
      .join("\n");
    return this.ok(`Active sessions\n===============\n\n  Id  Type        Info\n  --  ----        ----\n${rows}\n`);
  }

  private activeSession(): MsfSession | undefined {
    const sid = Number(this.datastore.SESSION);
    return this.sessions.find((s) => s.id === sid);
  }

  private sessionAction(cmd: string): MsfResult {
    const s = this.activeSession();
    if (!s) return this.err("[-] No hay sesión activa. Usá 'sessions -i <n>'.\n");
    if (cmd === "getuid") return this.ok(`Server username: ${s.user}${s.root ? " (uid=0)" : ""}\n`);
    if (cmd === "sysinfo") {
      return this.ok(
        `Computer     : ${s.host}\nOS           : ÑandeLinux (virtual)\nMeterpreter  : ${s.type}\nSession vía  : ${s.via}\n`,
      );
    }
    return this.ok(`${s.user}@${s.host}:${s.root ? "#" : "$"} (shell interactiva de laboratorio)\n`);
  }

  private catLoot(path: string, machines: LabMachine[]): MsfResult {
    const s = this.activeSession();
    if (!s) return this.err("[-] No hay sesión activa. Usá 'sessions -i <n>'.\n");
    const machine = machines.find((x) => x.ip === s.target);
    if (!machine) return this.err("[-] Sesión sin máquina asociada.\n");
    if (/flag|bandera/i.test(path)) {
      return {
        output: `${machine.flag}\n`,
        isError: false,
        flag: machine.flag,
        rhosts: machine.ip,
      };
    }
    const file = machine.files.find((f) => f.path === path || f.path.endsWith("/" + path));
    if (!file) return this.err(`cat: ${path}: no such file\n`);
    return this.ok(`${file.content}\n`);
  }

  private help(): string {
    return (
      "Comandos de la consola ÑandeMSF:\n" +
      "  search <t>        buscar módulos (por nombre, categoría o vuln)\n" +
      "  use <mód|N>       cargar un módulo\n" +
      "  info              detalle del módulo cargado\n" +
      "  show options      opciones (y cuáles faltan)\n" +
      "  show payloads     payloads compatibles\n" +
      "  set OPT valor     definir una opción (RHOSTS, PAYLOAD, LHOST, ...)\n" +
      "  check             ¿el objetivo es vulnerable? (sin explotar)\n" +
      "  exploit / run     lanzar el módulo\n" +
      "  sessions -l       listar sesiones abiertas\n" +
      "  sessions -i <n>   interactuar con una sesión\n" +
      "  sysinfo/getuid    dentro de una sesión\n" +
      "  cat flag          leer la bandera de la máquina comprometida\n" +
      "  back              soltar el módulo · exit para salir de la consola\n"
    );
  }

  private ok(output: string): MsfResult {
    return { output, isError: false };
  }
  private err(output: string): MsfResult {
    return { output, isError: true };
  }
}
