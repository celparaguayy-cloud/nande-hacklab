import { VirtualKernel } from "../VirtualKernel";
import { crack, WORDLIST } from "../crypto/cracker";
import { decodeJwt, signJwt, verifyJwt, crackJwtSecret } from "../crypto/jwt";
import { randomMac } from "../security/Anonymity";

/** MACs de fábrica de las interfaces (para saber si el jugador las cambió). */
const DEFAULT_MACS: Record<string, string> = {
  eth0: "02:00:00:00:00:10",
  wlan0: "02:00:00:00:00:20",
};

/** Objetivos del modo "te dan una IP y la vulnerás". Cada uno es un host
 *  ficticio con una falla real; se completa capturando su bandera. */
const TARGETS: { ip: string; host: string; nivel: string; pista: string; flag: string }[] = [
  { ip: "10.10.7.11", host: "blog.yvoty.nande", nivel: "fácil", flag: "ND{xss_reflejado}",
    pista: "Un buscador que refleja lo que escribís sin filtrar. Pensá en XSS." },
  { ip: "10.10.7.12", host: "fotos.arandu.nande", nivel: "fácil", flag: "ND{idor_album_ajeno}",
    pista: "Los álbumes se ven por ?id=. ¿Y si cambiás el número? (IDOR)" },
  { ip: "10.10.7.13", host: "docs.tape.nande", nivel: "medio", flag: "ND{path_traversal_secreto}",
    pista: "Un visor que abre public/<archivo>. Salí de esa carpeta con ../ (path traversal)." },
  { ip: "10.10.7.14", host: "tools.pyta.nande", nivel: "medio", flag: "ND{cmd_injection_pwned}",
    pista: "Un ping que pasa el host a un comando. Encadená otro con ; (inyección de comandos)." },
  { ip: "10.10.66.10", host: "caja.interna.nande", nivel: "difícil", flag: "ND{pivoting_red_interna}",
    pista: "No se ve desde afuera: entrá a server.nande (soporte/Verano2024) y pivotá." },
];

/** Herramienta de ejemplo que `code new` deja lista para compilar y correr.
 *  Es código real que corre en el sandbox: escanea un host y lista puertos. */
const STARTER_TOOL = `// mini-scanner — escanea un host del mundo y lista sus puertos.
// Uso: run <esta-tool> <host>   (ej. run mi-scanner server.nande)
var objetivo = args[0] || "server.nande";
print("Escaneando " + objetivo + " ...");
var puertos = nande.scan(objetivo);
if (puertos.length === 0) {
  print("Sin respuesta: host caido o desconocido.");
} else {
  var abiertos = 0;
  for (var i = 0; i < puertos.length; i++) {
    var p = puertos[i];
    print(p.port + "/tcp  " + p.state + "  " + p.service);
    if (p.state === "open") abiertos++;
  }
  print("Total: " + abiertos + " puerto(s) abierto(s).");
}
`;

export class VirtualTerminal {
  private kernel: VirtualKernel;
  private currentUser: string;
  private currentDirectory: string;
  private environment: Record<string, string>;
  /** Lección guiada en curso y en qué paso va. */
  private activeLesson: string | null = null;
  private lessonStep = 0;
  /** Sesión remota activa (pivoting): host y usuario, o null si es local. */
  private remoteHost: string | null = null;
  private remoteUser = "root";
  /** Pila de hosts para volver con exit al pivotar en cadena. */
  private remoteStack: { host: string; user: string }[] = [];

  constructor(kernel: VirtualKernel) {
    this.kernel = kernel;
    this.currentUser = "student";
    this.currentDirectory = "/home/student";

    this.environment = {
      USER: "student",
      HOME: "/home/student",
      PWD: "/home/student",
      HOSTNAME: "nande-os",
      SHELL: "/bin/nande-shell",
      PATH: "/bin:/usr/bin",
      TERM: "nande-terminal",
    };
  }

  getCurrentDirectory(): string {
    return this.currentDirectory;
  }

  getCurrentUser(): string {
    return this.currentUser;
  }

  execute(input: string): string {
    const commandLine = this.expandVariables(input.trim());

    if (!commandLine) {
      return "";
    }

    const first = commandLine.split(/\s+/)[0];

    if (first === "learn") {
      return this.learnCmd(commandLine.split(/\s+/).slice(1));
    }

    if (first === "hint") {
      return this.lessonHint();
    }

    // Los pipes se procesan dentro del shell virtual.
    // Cada etapa recibe únicamente la salida de la etapa anterior.
    if (this.hasPipe(commandLine)) {
      return this.executePipeline(commandLine);
    }

    const commands = this.splitChain(commandLine);

    let output = "";
    let previousError = false;

    for (let i = 0; i < commands.length; i++) {
      const item = commands[i];

      if (i > 0) {
        if (item.operator === "&&" && previousError) {
          continue;
        }

        if (item.operator === "||" && !previousError) {
          continue;
        }
      }

      const result = this.executeSingle(item.command);

      if (result.output) {
        output += result.output;
      }

      previousError = result.isError;
    }

    const lessonNote = this.checkLessonProgress(commandLine, output);

    return output + lessonNote;
  }

  private hasPipe(input: string): boolean {
    let quote = "";

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (quote) {
        if (char === quote) {
          quote = "";
        }
        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }

      // Un solo "|" es pipe.
      // "||" pertenece al operador lógico OR.
      if (
        char === "|" &&
        input[i + 1] !== "|" &&
        input[i - 1] !== "|"
      ) {
        return true;
      }
    }

    return false;
  }

  private splitPipeline(input: string): string[] {
    const parts: string[] = [];
    let current = "";
    let quote = "";

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (quote) {
        current += char;

        if (char === quote) {
          quote = "";
        }

        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        current += char;
        continue;
      }

      if (char === "|") {
        if (current.trim()) {
          parts.push(current.trim());
        }

        current = "";
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  private executePipeline(input: string): string {
    const stages = this.splitPipeline(input);

    if (stages.length < 2) {
      return this.executeSingle(input).output;
    }

    let pipelineOutput = "";
    let pipelineError = false;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];

      if (i === 0) {
        const result = this.executeSingle(stage);
        pipelineOutput = result.output;
        pipelineError = result.isError;

        if (pipelineError) {
          return pipelineOutput;
        }

        continue;
      }

      const stageArgs = this.parseArguments(stage);

      if (stageArgs.length === 0) {
        continue;
      }

      const stageCommand = stageArgs[0];
      const commandArgs = stageArgs.slice(1);

      if (stageCommand === "grep") {
        if (commandArgs.length === 0) {
          return "grep: falta el patrón\n";
        }

        const pattern = commandArgs.join(" ");
        const lines = pipelineOutput.split("\n");

        pipelineOutput = lines
          .filter((line) => line.includes(pattern))
          .filter((line) => line.length > 0)
          .join("\n");

        if (pipelineOutput) {
          pipelineOutput += "\n";
        }

        continue;
      }

      if (stageCommand === "head") {
        const countIndex = commandArgs.indexOf("-n");
        const count =
          countIndex >= 0 && commandArgs[countIndex + 1]
            ? Number(commandArgs[countIndex + 1])
            : 10;

        pipelineOutput =
          pipelineOutput
            .split("\n")
            .filter((line) => line.length > 0)
            .slice(0, Number.isFinite(count) ? count : 10)
            .join("\n");

        if (pipelineOutput) {
          pipelineOutput += "\n";
        }

        continue;
      }

      if (stageCommand === "tail") {
        const countIndex = commandArgs.indexOf("-n");
        const count =
          countIndex >= 0 && commandArgs[countIndex + 1]
            ? Number(commandArgs[countIndex + 1])
            : 10;

        const lines = pipelineOutput
          .split("\n")
          .filter((line) => line.length > 0);

        pipelineOutput = lines
          .slice(-((Number.isFinite(count) ? count : 10)))
          .join("\n");

        if (pipelineOutput) {
          pipelineOutput += "\n";
        }

        continue;
      }

      if (stageCommand === "wc") {
        const lines = pipelineOutput
          .split("\n")
          .filter((line) => line.length > 0);

        if (commandArgs.includes("-l")) {
          pipelineOutput = `${lines.length}\n`;
        } else {
          const words = pipelineOutput.trim()
            ? pipelineOutput.trim().split(/\s+/).length
            : 0;

          pipelineOutput = `${lines.length} ${words}\n`;
        }

        continue;
      }

      return `${stageCommand}: comando no encontrado\n`;
    }

    return pipelineOutput;
  }

  private splitChain(
    input: string,
  ): {
    command: string;
    operator: "&&" | "||" | ";" | null;
  }[] {
    const result: {
      command: string;
      operator: "&&" | "||" | ";" | null;
    }[] = [];

    let current = "";
    let nextOperator: "&&" | "||" | ";" | null = null;
    let quote: "'" | '"' | null = null;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (quote) {
        current += char;

        if (char === quote) {
          quote = null;
        }

        continue;
      }

      if (char === "'" || char === '"') {
        quote = char;
        current += char;
        continue;
      }

      if (char === "&" && input[i + 1] === "&") {
        if (current.trim()) {
          result.push({
            command: current.trim(),
            operator: nextOperator,
          });
        }

        current = "";
        nextOperator = "&&";
        i++;
        continue;
      }

      if (char === "|" && input[i + 1] === "|") {
        if (current.trim()) {
          result.push({
            command: current.trim(),
            operator: nextOperator,
          });
        }

        current = "";
        nextOperator = "||";
        i++;
        continue;
      }

      if (char === ";") {
        if (current.trim()) {
          result.push({
            command: current.trim(),
            operator: nextOperator,
          });
        }

        current = "";
        nextOperator = ";";
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      result.push({
        command: current.trim(),
        operator: nextOperator,
      });
    }

    return result;
  }

  private expandVariables(input: string): string {
    return input.replace(
      /\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g,
      (_, name: string) => this.environment[name] ?? "",
    );
  }

  private parseArguments(input: string): string[] {
    const args: string[] = [];
    let current = "";
    let quote = "";

    for (const char of input) {
      if (quote) {
        if (char === quote) {
          quote = "";
        } else {
          current += char;
        }

        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }

      if (/\s/.test(char)) {
        if (current) {
          args.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    }

    if (current) {
      args.push(current);
    }

    return args;
  }

  private resolvePath(path: string): string {
    if (path === "~") {
      return "/home/student";
    }

    if (path.startsWith("~/")) {
      return `/home/student/${path.slice(2)}`;
    }

    if (path.startsWith("/")) {
      return this.normalizePath(path);
    }

    return this.normalizePath(
      `${this.currentDirectory}/${path}`,
    );
  }

  private normalizePath(path: string): string {
    const parts = path.split("/");
    const result: string[] = [];

    for (const part of parts) {
      if (!part || part === ".") {
        continue;
      }

      if (part === "..") {
        result.pop();
      } else {
        result.push(part);
      }
    }

    return "/" + result.join("/");
  }

  private executeIp(args: string[]): {
    output: string;
    isError: boolean;
  } {
    const subcommand = args[0] ?? "addr";
    const interfaces = this.kernel.network.listInterfaces();

    if (subcommand === "addr" || subcommand === "a") {
      const output = interfaces
        .map((iface, index) => {
          const state = iface.up ? "UP" : "DOWN";

          return [
            `${index + 1}: ${iface.name}: <${state}>`,
            `    inet ${iface.ip}`,
            `    netmask ${iface.netmask}`,
            `    ether ${iface.mac}`,
          ].join("\n");
        })
        .join("\n");

      return {
        output: `${output}\n`,
        isError: false,
      };
    }

    if (subcommand === "route" || subcommand === "r") {
      const eth0 = this.kernel.network.getInterface("eth0");

      if (!eth0 || !eth0.up) {
        return {
          output: "No hay rutas activas.\n",
          isError: false,
        };
      }

      return {
        output:
          `default via ${eth0.gateway} dev ${eth0.name}\n` +
          `10.10.0.0/24 dev ${eth0.name} src ${eth0.ip}\n`,
        isError: false,
      };
    }

    return {
      output: `ip: operación no soportada: ${subcommand}\n`,
      isError: true,
    };
  }

  private executeIfconfig(): {
    output: string;
    isError: boolean;
  } {
    const output = this.kernel.network
      .listInterfaces()
      .map((iface) => {
        const state = iface.up ? "UP" : "DOWN";

        return [
          `${iface.name}: flags=<${state}>`,
          `        inet ${iface.ip} netmask ${iface.netmask}`,
          `        ether ${iface.mac}`,
        ].join("\n");
      })
      .join("\n\n");

    return {
      output: `${output}\n`,
      isError: false,
    };
  }

  private executePing(args: string[]): {
    output: string;
    isError: boolean;
  } {
    const target = args[0];

    if (!target) {
      return {
        output: "ping: falta la dirección de destino\n",
        isError: true,
      };
    }

    if (!this.kernel.network.isReachable(target)) {
      return {
        output:
          `PING ${target}\n` +
          "Host de laboratorio no alcanzable.\n",
        isError: true,
      };
    }

    return {
      output:
        `PING ${target}\n` +
        `64 bytes from ${target}: virtual_seq=1 ttl=64 time=1 ms\n` +
        `64 bytes from ${target}: virtual_seq=2 ttl=64 time=1 ms\n` +
        `64 bytes from ${target}: virtual_seq=3 ttl=64 time=1 ms\n` +
        `--- ${target} ping statistics ---\n` +
        "3 packets transmitted, 3 received, 0% packet loss\n",
      isError: false,
    };
  }

  private executeSingle(input: string): {
    output: string;
    isError: boolean;
  } {
    const args = this.parseArguments(input);

    if (args.length === 0) {
      return {
        output: "",
        isError: false,
      };
    }

    const command = args[0];
    const commandArgs = args.slice(1);

    // En una sesión remota, los comandos operan contra el host remoto.
    if (this.remoteHost) {
      return this.executeRemote(command, commandArgs);
    }

    // connect/ssh: abrir una sesión remota (pivoting).
    if (command === "connect" || command === "ssh") {
      return this.connectCmd(commandArgs);
    }

    try {
      switch (command) {
      case "env": {
        return {
          output:
            Object.entries(this.environment)
              .map(([key, value]) => `${key}=${value}`)
              .join("\n") + "\n",
          isError: false,
        };
      }

      case "export": {
        if (commandArgs.length === 0) {
          return {
            output:
              Object.entries(this.environment)
                .map(([key, value]) => `export ${key}="${value}"`)
                .join("\n") + "\n",
            isError: false,
          };
        }

        for (const assignment of commandArgs) {
          const separator = assignment.indexOf("=");

          if (separator <= 0) {
            return {
              output: `export: formato inválido: ${assignment}\n`,
              isError: true,
            };
          }

          const key = assignment.slice(0, separator);
          const value = assignment.slice(separator + 1);

          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
            return {
              output: `export: nombre inválido: ${key}\n`,
              isError: true,
            };
          }

          this.environment[key] = value;
        }

        return {
          output: "",
          isError: false,
        };
      }

      case "which":
      case "command": {
        if (command === "command" && commandArgs[0] !== "-v") {
          return {
            output: "command: uso: command -v <programa>\n",
            isError: true,
          };
        }

        const programName =
          command === "which" ? commandArgs[0] : commandArgs[1];

        if (!programName) {
          return {
            output: `${command}: falta el nombre del programa\n`,
            isError: true,
          };
        }

        const program =
          this.kernel.programs.resolve(programName);

        if (!program) {
          return {
            output: `${programName}: comando no encontrado\n`,
            isError: true,
          };
        }

        return {
          output: `${program.path}\n`,
          isError: false,
        };
      }

      case "date": {
        const clock = this.kernel.world.getState().clock;
        const hour = String(clock.hour).padStart(2, "0");
        const minute = String(clock.minute).padStart(2, "0");

        return {
          output: `Día ${clock.day} ${hour}:${minute}\n`,
          isError: false,
        };
      }

      case "grep":
        return this.grep(commandArgs);

      case "head":
        return this.head(commandArgs);

      case "tail":
        return this.tail(commandArgs);

      case "wc":
        return this.wc(commandArgs);

      case "nslookup": {
        const hostname = commandArgs[0];

        if (!hostname) {
          return {
            output: "nslookup: falta el nombre del host\n",
            isError: true,
          };
        }

        const address = this.kernel.dns.resolve(hostname);

        if (!address) {
          return {
            output:
              `Servidor DNS virtual: 10.10.0.53\n` +
              `*** No se encontró ${hostname}\n`,
            isError: true,
          };
        }

        return {
          output:
            `Servidor DNS virtual: 10.10.0.53\n` +
            `Name: ${hostname}\n` +
            `Address: ${address}\n`,
          isError: false,
        };
      }

      case "printf":
        return this.printf(commandArgs);

      case "true":
        return {
          output: "",
          isError: false,
        };

      case "false":
        return {
          output: "",
          isError: true,
        };

      case "exit":
        return {
          output: "Sesión virtual terminada.\n",
          isError: false,
        };


        case "pwd":
          return {
            output: `${this.currentDirectory}\n`,
            isError: false,
          };

        case "whoami":
          return {
            output: `${this.currentUser}\n`,
            isError: false,
          };

        case "id":
          return {
            output: this.id(),
            isError: false,
          };

        case "hostname":
          return {
            output: `${this.kernel.world.getState().hostname}\n`,
            isError: false,
          };

        case "uname":
          return {
            output: "ÑANDE OS nande-kernel\n",
            isError: false,
          };

        case "cd":
          return this.cd(commandArgs);

        case "ls":
          return this.ls(commandArgs);

        case "cat":
          return this.cat(commandArgs);

        case "echo":
          return this.echo(commandArgs, input);

        case "mkdir":
          return this.mkdir(commandArgs);

        case "touch":
          return this.touch(commandArgs);

        case "rm":
          return this.rm(commandArgs);

        case "chmod":
          return this.chmod(commandArgs);

        case "chown":
          return this.chown(commandArgs);

        case "ps":
          return this.ps();

        case "clear":
          return {
            output: "\x1b[2J\x1b[H",
            isError: false,
          };

        case "help":
          return {
            output: this.help(),
            isError: false,
          };

        case "guia":
        case "guía":
        case "empezar":
        case "start":
          return { output: this.guia(), isError: false };

        case "objetivo":
        case "target":
        case "reto":
          return this.objetivoCmd(commandArgs);

        case "ip":
          return this.executeIp(commandArgs);

        case "ifconfig":
          return this.executeIfconfig();

        case "ping":
          return this.executePing(commandArgs);

        case "tools":
          return this.listTools(commandArgs);

        case "tool":
          return this.showTool(commandArgs);

        case "academy":
          return this.showAcademy(commandArgs);

        case "labs":
          return this.listLabs();

        case "vecinos":
          return this.showNeighbors();

        case "profile":
          return this.showProfile();

        case "skills":
          return this.showSkills();

        case "missions":
          return this.showMissions();

        case "mission":
          return this.showMission(commandArgs);

        case "store":
        case "tienda":
          return this.showStore();

        case "buy":
          return this.buyItem(commandArgs);

        case "run":
          return this.runCreation(commandArgs);

        case "market":
        case "bolsa":
        case "acciones":
          return this.showMarket();

        case "buy-stock":
        case "comprar-accion":
        case "invertir":
          return this.buyStock(commandArgs);

        case "sell-stock":
        case "vender-accion":
          return this.sellStock(commandArgs);

        case "portfolio":
        case "cartera":
          return this.showPortfolio();

        case "mail":
          return this.mailCmd(commandArgs);

        case "chat":
          return this.chatCmd(commandArgs);

        case "groups":
        case "grupos":
          return this.groupsCmd(commandArgs);

        case "neofetch":
        case "hw":
          return { output: `${this.kernel.hardware.render()}\n`, isError: false };

        case "publicar":
        case "publish":
          return this.publicarCmd(commandArgs);

        case "crack":
          return this.crackCmd(commandArgs);

        case "jwt":
          return this.jwtCmd(commandArgs);

        case "curl":
          return this.curlCmd(commandArgs);

        case "wifi":
          return this.wifiCmd(commandArgs);

        case "anon":
        case "tor":
          return this.anonCmd(commandArgs);

        case "macchanger":
          return this.macchangerCmd(commandArgs);

        case "identidad":
        case "whoami-net":
          return this.identidadCmd();

        case "services":
        case "servicios":
          return this.servicesCmd(commandArgs);

        case "service-info":
          return this.serviceInfoCmd(commandArgs);

        case "service-start":
        case "service-stop":
        case "service-restart":
          return this.serviceCtlCmd(command, commandArgs);

        case "firewall":
          return this.firewallCmd(commandArgs);

        case "soc":
        case "blue":
          return this.socCmd(commandArgs);

        case "defensa":
        case "contener":
          return this.defensaCmd(command, commandArgs);

        case "snapshot":
        case "foto":
          return this.snapshotCmd(commandArgs);

        case "db-list":
        case "db-schema":
        case "db-query":
          return this.dbCmd(command, commandArgs);

        case "code":
          return this.codeCmd(commandArgs);

        case "compile":
          return this.compileCmd(commandArgs);

        case "tool-install":
          return this.toolInstallCmd(commandArgs);

        case "tool-list":
        case "tools-mias":
          return this.toolListCmd();

        case "tool-info":
          return this.toolInfoCmd(commandArgs);

        case "tool-remove":
          return this.toolRemoveCmd(commandArgs);

        default: {
          // Si no es un builtin, quizas sea una herramienta de seguridad.
          if (this.kernel.tools.find(command)) {
            const result = this.kernel.tools.run(command, commandArgs);

            return this.rewardIfFlag(command, commandArgs, result);
          }

          return {
            output: `Comando no encontrado: ${command}\n`,
            isError: true,
          };
        }
      }
    } catch (error) {
      return {
        output:
          error instanceof Error
            ? `${error.message}\n`
            : "Error desconocido\n",
        isError: true,
      };
    }
  }

  /**
   * Si una herramienta capturo una bandera, se acredita: laboratorio
   * resuelto, misiones que avanzan, XP, moneda y posibles logros.
   */
  private rewardIfFlag(
    _command: string,
    args: string[],
    result: { output: string; isError: boolean; flag?: string },
  ): { output: string; isError: boolean } {
    // El mundo reacciona a cualquier señal en la salida (bandera ND{...} o
    // clave de campaña): economía, diario, notoriedad, avance de la campaña y
    // maestría de La Mani. Antes esto sólo ocurría en el navegador y en curl,
    // así que capítulos que se resuelven con herramientas —el pivoting con
    // proxychains, el sniffing con tcpdump— NO avanzaban aunque la bandera
    // saliera en pantalla: la campaña se trababa. Se escanea el texto de la
    // salida (y la bandera explícita, por si la herramienta no la imprime).
    const worldNotes = this.kernel.scanForSignals(
      result.output + (result.flag ? `\n${result.flag}` : ""),
    );
    const worldSuffix = worldNotes.length ? `\n${worldNotes.join("\n")}` : "";

    if (!result.flag) {
      return {
        output: result.output + (worldSuffix ? `${worldSuffix}\n` : ""),
        isError: result.isError,
      };
    }

    // Toda bandera capturada por una herramienta queda en el historial.
    if (result.flag.startsWith("ND{")) this.kernel.player.recordFlag(result.flag);

    // A que laboratorio pertenece la bandera capturada.
    const target = args.find(
      (a) => a.startsWith("10.10.") || a.includes(".lab") || a.startsWith("http"),
    );

    const host = target?.match(/^https?:\/\/([^/]+)/i)?.[1] ?? target ?? "";
    const machine = this.kernel.tools
      .labs()
      .find((m) => m.ip === host || m.hostname === host);

    if (!machine) {
      return {
        output: result.output + (worldSuffix ? `${worldSuffix}\n` : ""),
        isError: result.isError,
      };
    }

    const tick = this.kernel.world.getState().clock.tick;
    const extra: string[] = [];

    if (this.kernel.player.markLabSolved(machine.id)) {
      this.kernel.events.emit("lab.solved", { labId: machine.id, tick });

      this.kernel.player.award(machine.services.length * 20 + 60, {
        skill: "pentesting",
        coins: 80,
        tick,
      });

      extra.push(
        `\n🏁 Laboratorio ${machine.hostname} resuelto: +XP, +N$80.`,
      );

      // Primer laboratorio: logro.
      if (this.kernel.player.unlock(
        "primer-lab",
        "Primer laboratorio",
        "Resolviste tu primera máquina de práctica.",
        tick,
      )) {
        extra.push(`🏆 Logro desbloqueado: "Primer laboratorio".`);
      }

      const done = this.kernel.missions.onLabSolved(machine.id, tick);

      for (const mission of done) {
        extra.push(
          `✅ Misión completada: ${mission.title} (+${mission.reward.xp} XP, +N$${mission.reward.coins}).`,
        );
      }
    } else {
      extra.push(`\n(Este laboratorio ya estaba resuelto.)`);
    }

    return {
      output: result.output + extra.join("\n") + worldSuffix + "\n",
      isError: result.isError,
    };
  }

  private showProfile(): { output: string; isError: boolean } {
    const p = this.kernel.player.getState();
    const bar = this.progressBar(
      p.xp,
      this.kernel.player.xpToNext() + p.xp,
    );

    return {
      output:
        `👤 ${p.name}\n` +
        `Nivel ${p.level}   ${bar}\n` +
        `XP: ${p.xp}  (faltan ${this.kernel.player.xpToNext()} para el próximo nivel)\n` +
        `💰 N$ ${p.wallet}\n` +
        `🏆 Logros: ${p.achievements.length}\n` +
        `🏁 Labs resueltos: ${p.solvedLabs.length}\n\n` +
        `Mirá tus habilidades con 'skills' y tus misiones con 'missions'.\n`,
      isError: false,
    };
  }

  private showSkills(): { output: string; isError: boolean } {
    const skills = this.kernel.player.getState().skills;

    const lines = Object.entries(skills)
      .map(([id, xp]) => {
        const level = Math.floor(Math.sqrt(xp / 50));
        return `  ${id.padEnd(12)}Lv.${level}  (${xp} XP)`;
      })
      .join("\n");

    return {
      output: `🌳 Habilidades\n\n${lines}\n`,
      isError: false,
    };
  }

  private showMissions(): { output: string; isError: boolean } {
    const missions = this.kernel.missions.progress();

    const icon = {
      completada: "✅",
      disponible: "▶️",
      bloqueada: "🔒",
    } as const;

    const lines = missions
      .map(
        (m) =>
          `  ${icon[m.status]} ${m.difficulty} ${m.title.padEnd(28)}` +
          `${m.reward.xp} XP`,
      )
      .join("\n");

    return {
      output:
        `🎯 Misiones\n\n${lines}\n\n` +
        `Detalle: mission <id> — por ejemplo 'mission m-primer-escaneo'.\n`,
      isError: false,
    };
  }

  private showMission(args: string[]): { output: string; isError: boolean } {
    const id = args[0];

    if (!id) {
      return { output: "uso: mission <id>\n", isError: true };
    }

    const mission = this.kernel.missions.get(id);

    if (!mission) {
      return {
        output: `mission: "${id}" no existe. Probá 'missions'.\n`,
        isError: true,
      };
    }

    const status = this.kernel.missions.status(id);

    return {
      output:
        `${mission.difficulty} ${mission.title}  [${status}]\n\n` +
        `${mission.brief}\n\n` +
        `Pista: ${mission.hint}\n` +
        `Recompensa: ${mission.reward.xp} XP, N$${mission.reward.coins}` +
        (mission.reward.skill ? ` (habilidad ${mission.reward.skill})` : "") +
        `\n` +
        (mission.requires.length
          ? `Antes: ${mission.requires.join(", ")}\n`
          : ""),
      isError: false,
    };
  }

  private showStore(): { output: string; isError: boolean } {
    const items = this.kernel.store.listings().slice(-12).reverse();

    if (items.length === 0) {
      return {
        output:
          `🛒 ÑANDE Store\nTodavía no hay productos. Los habitantes están creando...\n`,
        isError: false,
      };
    }

    const lines = items
      .map(
        (item) =>
          `  N$${String(item.price).padEnd(5)}${item.name.padEnd(22)}[${item.type}]  ${item.id}`,
      )
      .join("\n");

    return {
      output:
        `🛒 ÑANDE Store — ${this.kernel.store.count()} productos de los habitantes\n\n` +
        `${lines}\n\n` +
        `Comprar: buy <id>. Navegable: https://store.nande\n`,
      isError: false,
    };
  }

  /**
   * Ejecuta el programa funcional de una creación de la store. Las
   * creaciones de los habitantes hacen algo de verdad: acá se corren.
   */
  /** Comandos de la academia guiada: learn, learn <id>, learn stop. */
  private learnCmd(args: string[]): string {
    const action = args[0];

    if (!action || action === "list") {
      const done = this.kernel.player.getState().completedCourses;
      const lines = this.kernel.lessons
        .all()
        .map((l) => {
          const mark = done.includes(`lesson:${l.id}`) ? "✅" : "▶️";
          return `  ${mark} ${l.id.padEnd(12)}[${l.level}] ${l.title}`;
        })
        .join("\n");

      return (
        `🎓 Lecciones guiadas — aprendé haciendo\n\n${lines}\n\n` +
        `Empezá una: learn <id>  (ej: learn l-nmap)\n`
      );
    }

    if (action === "stop") {
      this.activeLesson = null;
      this.lessonStep = 0;
      return "Lección abandonada. Podés retomar con learn <id>.\n";
    }

    const lesson = this.kernel.lessons.get(action);

    if (!lesson) {
      return `learn: no existe la lección "${action}". Probá 'learn'.\n`;
    }

    this.activeLesson = lesson.id;
    this.lessonStep = 0;

    return (
      `📘 ${lesson.title}  [${lesson.level}]\n\n` +
      `${lesson.concept}\n\n` +
      this.renderStep(lesson.id, 0) +
      `\n(Si te trabás, escribí 'hint'. Para salir, 'learn stop'.)\n`
    );
  }

  private renderStep(lessonId: string, index: number): string {
    const lesson = this.kernel.lessons.get(lessonId)!;
    const step = lesson.steps[index];

    return (
      `Paso ${index + 1}/${lesson.steps.length}\n` +
      `${step.explain}\n\n` +
      `👉 ${step.task}\n`
    );
  }

  private lessonHint(): string {
    if (!this.activeLesson) {
      return "No hay ninguna lección activa. Empezá con 'learn <id>'.\n";
    }

    const lesson = this.kernel.lessons.get(this.activeLesson)!;
    return `💡 ${lesson.steps[this.lessonStep].hint}\n`;
  }

  private checkLessonProgress(command: string, output: string): string {
    if (!this.activeLesson) {
      return "";
    }

    const lesson = this.kernel.lessons.get(this.activeLesson)!;
    const step = lesson.steps[this.lessonStep];

    if (!step.check(command, output)) {
      return "";
    }

    let note = `\n✅ ${step.debrief}\n`;

    this.lessonStep += 1;

    if (this.lessonStep < lesson.steps.length) {
      note += `\n${this.renderStep(lesson.id, this.lessonStep)}`;
      return note;
    }

    const tick = this.kernel.world.getState().clock.tick;
    const key = `lesson:${lesson.id}`;

    if (this.kernel.player.markCourseCompleted(key)) {
      this.kernel.player.award(lesson.reward.xp, {
        coins: lesson.reward.coins,
        tick,
      });
      note +=
        `\n🎉 Lección completada: ${lesson.title}\n` +
        `Recompensa: +${lesson.reward.xp} XP, +N$${lesson.reward.coins}\n`;

      if (this.kernel.player.unlock(
        "primera-leccion",
        "Primer paso",
        "Completaste tu primera lección guiada.",
        tick,
      )) {
        note += `🏆 Logro: "Primer paso".\n`;
      }
    } else {
      note += `\n🎉 Lección completada: ${lesson.title} (ya la habías hecho).\n`;
    }

    this.activeLesson = null;
    this.lessonStep = 0;

    return note;
  }

  /** Gestión del WiFi virtual: scan, connect, disconnect, status. */
  /**
   * curl: cliente HTTP contra las webs del mundo.
   *
   * Hace que la explotación web también se pueda hacer desde la terminal:
   *   curl "http://banco.nande/movimientos?q=%' UNION SELECT ..."
   *   curl -X POST http://banco.nande/login -d "usuario=admin'--&password=x"
   * Golpea el mismo servidor y la misma base de datos que el navegador.
   */
  /**
   * publicar: el jugador crea y publica su propio sitio en la Internet
   * virtual. Antes solo los habitantes podían crear cosas; ahora vos
   * también dejás tu marca en el mundo.
   *
   * Uso:  publicar <tipo> <nombre...>
   *   tipos: web, app, tool, repo, blog, juego
   */
  private publicarCmd(args: string[]): { output: string; isError: boolean } {
    const tipos: Record<string, string> = {
      web: "website",
      website: "website",
      app: "app",
      tool: "tool",
      herramienta: "tool",
      repo: "repository",
      repositorio: "repository",
      blog: "website",
      juego: "game",
      game: "game",
    };

    const tipo = tipos[(args[0] ?? "").toLowerCase()];
    const nombre = args.slice(1).join(" ").trim();

    if (!tipo || !nombre) {
      return {
        output:
          "Uso: publicar <tipo> <nombre>\n" +
          "  tipos: web, app, tool, repo, blog, juego\n" +
          "  ej: publicar web Mi Rincón\n",
        isError: true,
      };
    }

    const player = this.kernel.player.getState();
    const tick = this.kernel.world.getState().clock.tick;

    const entity = this.kernel.worldEngine.createEntity(
      tipo as never,
      nombre,
      `Publicado por ${player.name}, estudiante de ÑANDE.`,
      "player",
      tick,
      ["jugador"],
      { ownerName: player.name },
    );

    // El evento de creación ya publicó el sitio; su dominio es el último
    // que registró el publicador.
    const published = this.kernel.publisher.listPublished();
    const hostname = published[published.length - 1] ?? "tu-sitio.nande";
    void entity;

    // Pequeña recompensa por crear algo en el mundo.
    this.kernel.player.award(40, { coins: 20, tick });

    return {
      output:
        `✓ Publicaste "${nombre}" en la Internet virtual.\n` +
        `Tu sitio: https://${hostname}\n` +
        `Abrilo en el Navegador (escribí ${hostname} en la barra).\n` +
        `+40 XP, +N$20 por crear algo en el mundo.\n`,
      isError: false,
    };
  }


  /**
   * crack: crackea un hash de contraseña de verdad (MD5/SHA-256).
   *   crack <hash>              prueba el diccionario
   *   crack <hash> salt=<sal>   con sal conocida
   */
  private crackCmd(args: string[]): { output: string; isError: boolean } {
    const hash = args.find((a) => /^[0-9a-f]{32,64}$/i.test(a));

    if (!hash) {
      return {
        output:
          "Uso: crack <hash-md5-o-sha256> [salt=<sal>]\n" +
          "Ej: crack 5f4dcc3b5aa765d61d8327deb882cf99\n",
        isError: true,
      };
    }

    const saltArg = args.find((a) => a.startsWith("salt="));
    const salt = saltArg ? saltArg.slice(5) : undefined;

    const r = crack(hash, { salt });

    if (!r.found) {
      const extra = r.salted
        ? "El hash parece tener sal: sin la sal correcta el diccionario no alcanza."
        : "No estaba en el diccionario. Probá otra lista o un ataque más largo.";
      return {
        output:
          `crack: ${r.algo.toUpperCase()} · ${r.attempts} intentos\n` +
          `No se pudo romper. ${extra}\n`,
        isError: false,
      };
    }

    const tick = this.kernel.world.getState().clock.tick;
    this.kernel.player.award(120, { skill: "pentesting", coins: 80, tick });

    // Señal de campaña: "CRACK:<contraseña>".
    const notes = this.kernel.scanForSignals(`CRACK:${r.password}`);
    const suffix = notes.length ? "\n" + notes.join("\n") + "\n" : "";

    return {
      output:
        `crack: ${r.algo.toUpperCase()} roto en ${r.attempts} intentos\n` +
        `✓ Contraseña: ${r.password}\n` +
        `Lección: un hash sin sal es una contraseña con un disfraz barato.\n` +
        `+120 XP, +N$80.\n` +
        suffix,
      isError: false,
    };
  }

  /**
   * jwt: inspecciona, crackea y forja JSON Web Tokens (HS256).
   *   jwt decode <token>
   *   jwt crack  <token>            adivina la clave por diccionario
   *   jwt forge  <clave> rol=admin  firma un token nuevo
   */
  private jwtCmd(args: string[]): { output: string; isError: boolean } {
    const sub = (args[0] ?? "").toLowerCase();

    if (sub === "decode") {
      const parts = decodeJwt(args[1] ?? "");
      if (!parts) return { output: "jwt: token inválido.\n", isError: true };
      return {
        output:
          `Header:  ${JSON.stringify(parts.header)}\n` +
          `Payload: ${JSON.stringify(parts.payload)}\n` +
          `Firma:   ${parts.signature}\n`,
        isError: false,
      };
    }

    if (sub === "crack") {
      const token = args[1] ?? "";
      const secret = crackJwtSecret(token, WORDLIST);
      if (!secret) {
        return {
          output: "jwt: no se pudo adivinar la clave con el diccionario.\n",
          isError: false,
        };
      }
      return {
        output:
          `✓ Clave HS256 encontrada: ${secret}\n` +
          `Ahora forjá un token: jwt forge ${secret} rol=admin usuario=admin\n`,
        isError: false,
      };
    }

    if (sub === "forge") {
      const secret = args[1];
      if (!secret) {
        return { output: "Uso: jwt forge <clave> clave=valor ...\n", isError: true };
      }
      const payload: Record<string, unknown> = {};
      for (const a of args.slice(2)) {
        const eq = a.indexOf("=");
        if (eq > 0) payload[a.slice(0, eq)] = a.slice(eq + 1);
      }
      if (Object.keys(payload).length === 0) payload.rol = "admin";

      const token = signJwt(payload, secret);
      const esAdmin = payload.rol === "admin" && verifyJwt(token, secret);

      const notes = esAdmin
        ? this.kernel.scanForSignals("ND{jwt_forged_admin}")
        : [];
      const suffix = notes.length ? "\n" + notes.join("\n") + "\n" : "";

      const tick = this.kernel.world.getState().clock.tick;
      if (esAdmin) this.kernel.player.award(150, { skill: "pentesting", coins: 100, tick });

      return {
        output:
          `Token forjado:\n${token}\n` +
          (esAdmin
            ? `✓ Es un token de admin válido. ¡El servidor te creería!\n+150 XP, +N$100.\n`
            : `(Payload sin rol=admin; agregá rol=admin para el golpe.)\n`) +
          suffix,
        isError: false,
      };
    }

    // Ejemplo listo para practicar.
    const demo = signJwt({ usuario: "rocio", rol: "cliente" }, "nande");
    return {
      output:
        "jwt <decode|crack|forge>\n" +
        "Token de práctica (clave débil, cracker lo rompe):\n" +
        demo + "\n" +
        "Probá: jwt crack " + demo.slice(0, 24) + "...\n",
      isError: false,
    };
  }


  private curlCmd(args: string[]): { output: string; isError: boolean } {
    let method: "GET" | "POST" = "GET";
    let data = "";
    let url = "";

    for (let i = 0; i < args.length; i += 1) {
      const a = args[i];
      if (a === "-X" || a === "--request") {
        method = (args[++i] ?? "GET").toUpperCase() === "POST" ? "POST" : "GET";
      } else if (a === "-d" || a === "--data") {
        data = stripQuotes(args[++i] ?? "");
        method = method === "GET" ? "POST" : method;
      } else if (a === "-I" || a === "--head" || a === "-s" || a === "-v") {
        // Flags aceptados y sin efecto especial en el laboratorio.
      } else if (!a.startsWith("-")) {
        url = stripQuotes(a);
      }
    }

    if (!url) {
      return { output: "curl: falta la URL\n", isError: true };
    }

    const clean = url.replace(/^https?:\/\//i, "");
    const slash = clean.indexOf("/");
    const hostname = (slash === -1 ? clean : clean.slice(0, slash)).toLowerCase();
    const path = slash === -1 ? "/" : clean.slice(slash);

    if (!this.kernel.browser.isWebApp(hostname)) {
      // No es una app web del mundo (banco.nande, etc.): quizás sea una
      // máquina de la red de laboratorio (10.10.x). En ese caso se delega
      // en la herramienta curl clásica, que la sirve.
      if (this.kernel.tools.find("curl")) {
        return this.kernel.tools.run("curl", args);
      }

      return {
        output:
          `curl: no se pudo resolver '${hostname}'.\n` +
          `Apps web: banco.nande, blog.yvoty.nande, fotos.arandu.nande, ` +
          `docs.tape.nande, tools.pyta.nande, preview.vortex.nande, ` +
          `api.vortex.nande, link.gulu.nande, m.banco-justicia.nande, ` +
          `portal.nova.nande, files.bytebox.nande, cuenta.redix.nande, ` +
          `saludos.codea.nande, import.nova.nande, login.redix.nande, ` +
          `cupones.gulu.nande.\n`,
        isError: true,
      };
    }

    const body: Record<string, string> = {};
    if (data) {
      for (const pair of data.split("&")) {
        const eq = pair.indexOf("=");
        if (eq === -1) continue;
        body[decodeURIComponent(pair.slice(0, eq))] = decodeURIComponent(
          pair.slice(eq + 1),
        );
      }
    }

    try {
      const { response, finalPath } = this.kernel.browser.request(
        method,
        hostname,
        path,
        body,
      );

      const parts: string[] = [
        `HTTP ${response.status}  ${method} ${hostname}${finalPath}`,
      ];
      if (response.debug?.sql) {
        parts.push(`-- SQL: ${response.debug.sql}`);
      }
      // Se muestra el texto de la respuesta sin las etiquetas HTML.
      const text = response.body
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
      parts.push("", text);

      // Consecuencias en el mundo: banderas y señales de campaña detectadas
      // en la respuesta disparan economía, diario, notoriedad y campaña.
      const notes = this.kernel.scanForSignals(text);
      const suffix = notes.length ? "\n" + notes.join("\n") + "\n" : "";

      return { output: parts.join("\n") + "\n" + suffix, isError: false };
    } catch (error) {
      return {
        output: `curl: ${error instanceof Error ? error.message : "error"}\n`,
        isError: true,
      };
    }
  }


  /**
   * connect/ssh <host> [usuario] [clave] — abre una sesión remota.
   * Reglas de alcance: un host público se alcanza desde la red del jugador;
   * un host interno SÓLO se alcanza pivotando desde un host que lo lista en
   * reachableFrom (o sea, estando ya conectado a él). Si el host pide
   * credenciales, hay que darlas y ser válidas.
   */
  private connectCmd(args: string[]): { output: string; isError: boolean } {
    const positional = args.filter((a) => !a.startsWith("-"));
    const target = positional[0];
    if (!target) {
      return { output: "uso: connect <host> [usuario] [clave]\n", isError: true };
    }
    const host = this.kernel.hosts.resolve(target);
    if (!host) {
      return { output: `connect: host desconocido: ${target}\n`, isError: true };
    }
    if (!host.up) {
      return { output: `connect: ${host.hostname} está apagado\n`, isError: false };
    }

    const origin = this.remoteHost; // desde dónde nos conectamos (null = jugador)
    const alcanzable =
      this.kernel.hosts.isPublic(host.hostname) ||
      (origin !== null &&
        (host.reachableFrom ?? []).includes(origin.toLowerCase()));

    if (!alcanzable) {
      return {
        output:
          `connect: ${host.hostname} no es alcanzable desde acá.\n` +
          `(Es un host interno: hay que pivotar desde una máquina de su red.)\n`,
        isError: false,
      };
    }

    // Autenticación si el host tiene credenciales.
    if (host.creds.length > 0) {
      const user = positional[1];
      const pass = positional[2];
      if (!user || !pass) {
        return {
          output: `connect: ${host.hostname} pide credenciales. Usá: connect ${target} <usuario> <clave>\n`,
          isError: true,
        };
      }
      const auth = this.kernel.hosts.authenticate(host.hostname, user, pass);
      if (!auth.ok) {
        return { output: `✘ ${auth.message}\n`, isError: true };
      }
      if (origin !== null) this.remoteStack.push({ host: origin, user: this.remoteUser });
      else this.remoteStack = [];
      this.remoteHost = host.hostname;
      this.remoteUser = user;
    } else {
      if (origin !== null) this.remoteStack.push({ host: origin, user: this.remoteUser });
      else this.remoteStack = [];
      this.remoteHost = host.hostname;
      this.remoteUser = "root";
    }

    return {
      output:
        `✔ conectado a ${host.hostname} (${host.ip}) como ${this.remoteUser}.\n` +
        (host.files["/etc/motd"] ? `${host.files["/etc/motd"]}\n` : "") +
        `Comandos: ls · cat <archivo> · ps · services · service-stop <s> · kill <pid> · nmap · flag · exit\n`,
      isError: false,
    };
  }

  /**
   * Ejecuta un comando DENTRO de una sesión remota: opera contra el host
   * remoto (su filesystem, procesos y servicios), y `nmap` revela la red
   * interna alcanzable desde ahí (pivoting). `exit` cierra o vuelve un salto.
   */
  private executeRemote(
    command: string,
    args: string[],
  ): { output: string; isError: boolean } {
    const hostname = this.remoteHost!;
    const host = this.kernel.hosts.resolve(hostname);
    if (!host) {
      this.remoteHost = null;
      return { output: "sesión perdida: el host desapareció.\n", isError: true };
    }

    switch (command) {
      case "exit":
      case "logout": {
        const prev = this.remoteStack.pop();
        if (prev) {
          this.remoteHost = prev.host;
          this.remoteUser = prev.user;
          return { output: `Volviste a ${prev.host}.\n`, isError: false };
        }
        this.remoteHost = null;
        this.remoteUser = "root";
        return { output: `Cerraste la sesión en ${hostname}.\n`, isError: false };
      }

      case "connect":
      case "ssh":
        return this.connectCmd(args);

      case "whoami":
        return { output: `${this.remoteUser}\n`, isError: false };

      case "hostname":
        return { output: `${hostname}\n`, isError: false };

      case "pwd":
        return { output: `${this.remoteUser === "root" ? "/root" : `/home/${this.remoteUser}`}\n`, isError: false };

      case "ls": {
        const paths = Object.keys(host.files);
        if (paths.length === 0) return { output: "(sin archivos visibles)\n", isError: false };
        return { output: paths.join("\n") + "\n", isError: false };
      }

      case "cat": {
        const path = args[0];
        if (!path) return { output: "uso: cat <archivo>\n", isError: true };
        const content = host.files[path];
        if (content === undefined) {
          return { output: `cat: ${path}: no existe\n`, isError: true };
        }
        // Un flag en un archivo cuenta como capturado (consecuencias reales).
        const notes = this.kernel.scanForSignals(content);
        const suffix = notes.length ? "\n" + notes.join("\n") + "\n" : "";
        return { output: content + "\n" + suffix, isError: false };
      }

      case "flag": {
        const content = host.files["/root/flag.txt"] ?? host.flag;
        if (!content) return { output: "no hay bandera acá.\n", isError: false };
        const notes = this.kernel.scanForSignals(content);
        const suffix = notes.length ? "\n" + notes.join("\n") + "\n" : "";
        return { output: content + "\n" + suffix, isError: false };
      }

      case "ps": {
        const procs = this.kernel.hosts.processesOf(hostname);
        const rows = procs
          .map((p) => `  ${String(p.pid).padStart(5)}  ${p.owner.padEnd(10)} ${p.name}${p.service ? "  [servicio]" : ""}`)
          .join("\n");
        return { output: `PID    USUARIO    PROCESO\n${rows}\n`, isError: false };
      }

      case "kill": {
        const pid = Number(args[0]);
        if (!Number.isFinite(pid)) return { output: "uso: kill <pid>\n", isError: true };
        const r = this.kernel.hosts.killProcess(hostname, pid);
        return { output: `${r.ok ? "✔" : "✘"} ${r.message}\n`, isError: !r.ok };
      }

      case "services":
      case "servicios":
        return this.servicesCmd([hostname]);

      case "service-info":
        return this.serviceInfoCmd([args[0] ?? "", hostname]);

      case "service-start":
      case "service-stop":
      case "service-restart":
        return this.serviceCtlCmd(command, [args[0] ?? "", hostname]);

      case "nmap": {
        // Pivoting: revela la red interna alcanzable desde este host.
        const internos = this.kernel.hosts.reachableFrom(hostname);
        const lines = internos.map(
          (h) => `  ${h.ip.padEnd(14)} ${h.hostname}  (${h.services.length} servicios)`,
        );
        return {
          output:
            `Escaneo interno desde ${hostname}:\n` +
            (lines.length
              ? lines.join("\n") + `\n\nConectá con: connect <host|ip> <usuario> <clave>\n`
              : "  (no se ve ninguna red interna desde este host)\n"),
          isError: false,
        };
      }

      case "help":
        return {
          output:
            `Sesión remota en ${hostname} (${this.remoteUser}):\n` +
            `  ls, cat <archivo>, pwd, whoami, hostname\n` +
            `  ps, kill <pid>, services, service-stop/start <s>\n` +
            `  nmap (red interna), connect <host> <u> <c> (pivotar), flag, exit\n`,
          isError: false,
        };

      case "clear":
        return { output: "\x1b[2J\x1b[H", isError: false };

      default:
        return {
          output: `${command}: no disponible en sesión remota (escribí 'help' o 'exit').\n`,
          isError: true,
        };
    }
  }

  /** Carpeta donde viven las herramientas del jugador. */
  private toolsDir = "/home/student/tools";

  private ensureToolsDir(): void {
    if (!this.kernel.filesystem.exists(this.toolsDir)) {
      this.kernel.filesystem.createDirectory(this.toolsDir, "student", "users", "755");
    }
  }

  private toolPath(name: string): string {
    const clean = name.replace(/[^\w.-]/g, "");
    const file = clean.endsWith(".js") ? clean : `${clean}.js`;
    return file.startsWith("/") ? file : `${this.toolsDir}/${file}`;
  }

  /**
   * code new <nombre>   → crea una herramienta de ejemplo funcional
   * code <ruta|nombre>  → muestra el código fuente
   */
  private codeCmd(args: string[]): { output: string; isError: boolean } {
    const sub = args[0];

    if (sub === "new") {
      const name = args[1];
      if (!name) {
        return { output: "uso: code new <nombre>\n", isError: true };
      }
      this.ensureToolsDir();
      const path = this.toolPath(name);
      if (this.kernel.filesystem.exists(path)) {
        return { output: `code: ya existe ${path}\n`, isError: true };
      }
      const scaffold = STARTER_TOOL;
      this.kernel.filesystem.createFile(path, scaffold, "student", "users", "755");
      return {
        output:
          `✔ Creé ${path} con una herramienta de ejemplo.\n\n` +
          `Editala (app Archivos) o probala ya mismo:\n` +
          `  compile ${path}\n` +
          `  tool-install ${path}\n` +
          `  run ${name.replace(/\.js$/, "")} server.nande\n`,
        isError: false,
      };
    }

    const ref = sub;
    if (!ref) {
      return {
        output:
          "uso:\n  code new <nombre>     crea una herramienta de ejemplo\n" +
          "  code <ruta>           muestra el código\n",
        isError: false,
      };
    }
    const path = this.toolPath(ref);
    if (!this.kernel.filesystem.exists(path)) {
      return { output: `code: no existe ${path}\n`, isError: true };
    }
    const src = this.kernel.filesystem.readFile(path);
    return { output: `# ${path}\n${src}\n`, isError: false };
  }

  /** Compila (valida) un archivo de código sin instalarlo. */
  private compileCmd(args: string[]): { output: string; isError: boolean } {
    const ref = args.find((a) => !a.startsWith("-"));
    if (!ref) return { output: "uso: compile <ruta>\n", isError: true };
    const path = this.toolPath(ref);
    if (!this.kernel.filesystem.exists(path)) {
      return { output: `compile: no existe ${path}\n`, isError: true };
    }
    const src = this.kernel.filesystem.readFile(path);
    const r = this.kernel.sandbox.compile(src);
    const lines: string[] = [];
    if (r.ok) lines.push(`✔ ${path} compila.`);
    else lines.push(`✘ ${path} no compila:`);
    for (const e of r.errors) lines.push(`  error: ${e}`);
    for (const w of r.warnings) lines.push(`  aviso: ${w}`);
    return { output: lines.join("\n") + "\n", isError: !r.ok };
  }

  /** Compila e instala un archivo como herramienta ejecutable. */
  private toolInstallCmd(args: string[]): { output: string; isError: boolean } {
    const ref = args.find((a) => !a.startsWith("-"));
    if (!ref) return { output: "uso: tool-install <ruta>\n", isError: true };
    const path = this.toolPath(ref);
    if (!this.kernel.filesystem.exists(path)) {
      return { output: `tool-install: no existe ${path}\n`, isError: true };
    }
    const src = this.kernel.filesystem.readFile(path);
    const baseName = (path.split("/").pop() ?? "tool").replace(/\.js$/, "");
    const r = this.kernel.toolRuntime.install(src, { name: baseName }, "player");
    if (!r.ok) {
      return {
        output: `✘ no se instaló:\n${r.errors.map((e) => `  ${e}`).join("\n")}\n`,
        isError: true,
      };
    }
    const warn = r.warnings.length
      ? `\n${r.warnings.map((w) => `  aviso: ${w}`).join("\n")}`
      : "";
    return {
      output: `✔ herramienta "${r.name}" instalada. Ejecutala con: run ${r.name}${warn}\n`,
      isError: false,
    };
  }

  private toolListCmd(): { output: string; isError: boolean } {
    const tools = this.kernel.toolRuntime.list();
    if (tools.length === 0) {
      return {
        output:
          "No tenés herramientas instaladas.\n" +
          "Creá una: code new mi-tool → tool-install mi-tool → run mi-tool\n",
        isError: false,
      };
    }
    const lines = tools.map(
      (t) =>
        `  ${t.manifest.name.padEnd(18)} v${t.manifest.version.padEnd(8)} ` +
        `[${t.origin === "npc" ? "NPC" : "vos"}] ${t.manifest.description}`,
    );
    return {
      output: `Herramientas instaladas (${tools.length}):\n` + lines.join("\n") + "\n",
      isError: false,
    };
  }

  private toolInfoCmd(args: string[]): { output: string; isError: boolean } {
    const name = args[0];
    const tool = name ? this.kernel.toolRuntime.get(name) : undefined;
    if (!tool) return { output: `tool-info: no existe la herramienta ${name}\n`, isError: true };
    const m = tool.manifest;
    return {
      output:
        `${m.name} v${m.version}\n` +
        `  autor:        ${m.author} (${tool.origin})\n` +
        `  descripción:  ${m.description}\n` +
        `  capacidades:  ${m.capabilities.join(", ")}\n` +
        (m.input ? `  entrada:      ${m.input}\n` : "") +
        (m.output ? `  salida:       ${m.output}\n` : "") +
        `  código:       ${tool.source.split("\n").length} líneas\n`,
      isError: false,
    };
  }

  private toolRemoveCmd(args: string[]): { output: string; isError: boolean } {
    const name = args[0];
    if (!name) return { output: "uso: tool-remove <nombre>\n", isError: true };
    const ok = this.kernel.toolRuntime.remove(name);
    return {
      output: ok ? `✔ desinstalé "${name}"\n` : `tool-remove: no existe "${name}"\n`,
      isError: !ok,
    };
  }

  /**
   * soc [alerts|clear] — Centro de operaciones (Blue Team). Muestra las
   * alertas generadas por eventos REALES del runtime: apagá un servicio o
   * fallá un login y aparecen acá.
   */
  private socCmd(args: string[]): { output: string; isError: boolean } {
    const sub = args[0] ?? "status";

    if (sub === "clear") {
      this.kernel.soc.clear();
      return { output: "SOC: alertas archivadas.\n", isError: false };
    }

    const counts = this.kernel.soc.countBySeverity();
    const total = this.kernel.soc.count();

    if (sub === "status" || sub === "resumen") {
      const top = this.kernel.soc.topSeverity();
      return {
        output:
          `═══ SOC · Blue Team ═══\n` +
          `Alertas: ${total}  (crítica:${counts.critical} alta:${counts.high} media:${counts.medium} baja:${counts.low} info:${counts.info})\n` +
          `Nivel más alto: ${top ?? "sin alertas"}\n` +
          `Usá 'soc alerts' para ver el detalle. Cada alerta vino de un evento real del mundo.\n`,
        isError: false,
      };
    }

    // soc alerts
    const alerts = this.kernel.soc.list(30);
    if (alerts.length === 0) {
      return {
        output:
          "SOC: sin alertas. Provocá una (ej. service-stop nginx server.nande) y volvé a mirar.\n",
        isError: false,
      };
    }
    const icon: Record<string, string> = {
      critical: "🟥",
      high: "🟧",
      medium: "🟨",
      low: "🟦",
      info: "⬜",
    };
    const lines = alerts.map(
      (a) => `  ${icon[a.severity]} [${a.severity.toUpperCase().padEnd(8)}] ${a.title} · ${a.host}\n       ${a.detail} (t=${a.tick})`,
    );
    return {
      output: `Alertas del SOC (${alerts.length}):\n` + lines.join("\n") + "\n",
      isError: false,
    };
  }

  /**
   * defensa            → estado del Blue Team: incidentes, puntaje, rango.
   * contener [id|all]  → contené un incidente (restaura el servicio).
   */
  private defensaCmd(
    command: string,
    args: string[],
  ): { output: string; isError: boolean } {
    const t = this.kernel.threats;
    const tick = this.kernel.world.getState().clock.tick;

    if (command === "contener") {
      const id = args[0];
      if (!id) {
        return { output: "uso: contener <id-incidente>  ·  contener all\n", isError: true };
      }
      if (id === "all" || id === "todos") {
        const n = t.containAll(tick);
        return {
          output: n ? `✔ Contuviste ${n} incidente(s). Servicios restaurados.\n` : "No había incidentes abiertos.\n",
          isError: false,
        };
      }
      const r = t.contain(id, tick);
      return { output: `${r.ok ? "✔" : "✘"} ${r.message}\n`, isError: !r.ok };
    }

    // defensa (estado)
    const sc = t.scoreState();
    const abiertos = t.openIncidents();
    const lines = t.list(10).map(
      (i) => `  ${i.resolved ? "✅" : "🔴"} ${i.id}  ${i.rival} tiró ${i.service} de ${i.host}  (t=${i.tick})`,
    );
    return {
      output:
        `═══ DEFENSA · Blue Team ═══\n` +
        `Rango: ${t.rank()} · Puntaje: ${sc.score} · Contenidos: ${sc.contained}\n` +
        `Incidentes abiertos: ${abiertos.length}\n` +
        (lines.length ? lines.join("\n") + "\n" : "  (sin incidentes por ahora)\n") +
        (abiertos.length ? `\nContené con: contener ${abiertos[0].id}  (o 'contener all')\n` : ""),
      isError: false,
    };
  }

  /** db-list · db-schema <db> · db-query <db> <sql> — bases de datos reales. */
  private dbCmd(
    command: string,
    args: string[],
  ): { output: string; isError: boolean } {
    if (command === "db-list") {
      const dbs = this.kernel.databases.list();
      const lines = dbs.map(
        (d) => `  ${d.name.padEnd(14)} ${d.tables.length} tablas — ${d.description}`,
      );
      return { output: `Bases de datos:\n${lines.join("\n")}\n`, isError: false };
    }

    const dbName = args[0];
    const db = dbName ? this.kernel.databases.get(dbName) : undefined;
    if (!db) {
      return { output: `${command}: base desconocida. Mirá 'db-list'.\n`, isError: true };
    }

    if (command === "db-schema") {
      const info = this.kernel.databases.list().find((d) => d.name === dbName.toLowerCase())!;
      const lines = info.tables.map(
        (t) => `  ${t.name} (${t.columns.join(", ")}) — ${t.rows} filas`,
      );
      return { output: `Esquema de ${dbName}:\n${lines.join("\n")}\n`, isError: false };
    }

    // db-query <db> <sql...>
    const sql = args.slice(1).join(" ").trim();
    if (!sql) {
      return { output: "uso: db-query <base> <SQL>\n", isError: true };
    }
    try {
      const r = db.query(sql);
      const header = r.columns.join(" | ");
      const rows = r.rows.map((row) => row.map((c) => String(c ?? "NULL")).join(" | "));
      return {
        output: `${header}\n${"-".repeat(header.length)}\n${rows.join("\n")}\n(${r.rows.length} fila/s)\n`,
        isError: false,
      };
    } catch (error) {
      return {
        output: `db-query: ${error instanceof Error ? error.message : "error"}\n`,
        isError: true,
      };
    }
  }

  /** snapshot create|list|restore|rm <nombre> — fotos del mundo (Experimento G). */
  private snapshotCmd(args: string[]): { output: string; isError: boolean } {
    const sub = args[0] ?? "list";
    const name = args.slice(1).join(" ").trim();

    if (sub === "list" || sub === "ls") {
      const snaps = this.kernel.snapshots.list();
      if (snaps.length === 0) {
        return { output: "No hay fotos. Creá una: snapshot create <nombre>\n", isError: false };
      }
      const lines = snaps.map((s) => `  ${s.name.padEnd(20)} ${s.keys} claves  (t=${s.tick})`);
      return { output: `Fotos guardadas:\n${lines.join("\n")}\n`, isError: false };
    }

    if (sub === "create" || sub === "save") {
      const r = this.kernel.snapshots.create(name);
      return { output: `${r.ok ? "✔" : "✘"} ${r.message}\n`, isError: !r.ok };
    }

    if (sub === "restore" || sub === "load") {
      const r = this.kernel.snapshots.restore(name);
      return { output: `${r.ok ? "✔" : "✘"} ${r.message}\n`, isError: !r.ok };
    }

    if (sub === "rm" || sub === "delete" || sub === "borrar") {
      const ok = this.kernel.snapshots.remove(name);
      return { output: ok ? `✔ borré la foto "${name}"\n` : `✘ no existe "${name}"\n`, isError: !ok };
    }

    return {
      output: "uso: snapshot create|list|restore|rm <nombre>\n",
      isError: true,
    };
  }

  /** Lista hosts del mundo, o los servicios de un host con su estado real. */
  private servicesCmd(args: string[]): { output: string; isError: boolean } {
    const ref = args.find((a) => !a.startsWith("-"));

    if (!ref) {
      const hosts = this.kernel.hosts.all();
      if (hosts.length === 0) {
        return { output: "services: no hay hosts registrados.\n", isError: false };
      }
      const lines = hosts
        .map((h) => {
          const running = h.services.filter((s) => s.state === "running").length;
          return `  ${h.hostname.padEnd(26)} ${h.ip.padEnd(12)} ${running}/${h.services.length} activos${h.up ? "" : "  (host caído)"}`;
        })
        .join("\n");
      return {
        output:
          `Hosts del mundo virtual (usá 'services <host>' para ver sus servicios):\n` +
          lines +
          `\n`,
        isError: false,
      };
    }

    const host = this.kernel.hosts.resolve(ref);
    if (!host) {
      return { output: `services: host desconocido: ${ref}\n`, isError: true };
    }

    const rows = host.services
      .map((s) => {
        const estado = host.firewall.includes(s.port)
          ? "filtrado"
          : s.state === "running"
            ? "activo"
            : "detenido";
        return `  ${`${s.port}/${s.protocol}`.padEnd(10)} ${s.name.padEnd(10)} ${estado.padEnd(10)} ${s.version}`;
      })
      .join("\n");

    return {
      output:
        `Servicios de ${host.hostname} (${host.ip}) — ${host.up ? "encendido" : "APAGADO"}\n` +
        `  PUERTO     SERVICIO   ESTADO     VERSIÓN\n` +
        rows +
        `\n\nControlá: service-stop <servicio> ${host.hostname} · service-start <servicio> ${host.hostname}\n`,
      isError: false,
    };
  }

  private serviceInfoCmd(args: string[]): { output: string; isError: boolean } {
    const [svcRef, hostRef] = args.filter((a) => !a.startsWith("-"));
    const host = hostRef ? this.kernel.hosts.resolve(hostRef) : undefined;
    if (!host) {
      return { output: `service-info: usá service-info <servicio> <host>\n`, isError: true };
    }
    const svc = host.services.find(
      (s) => s.name.toLowerCase() === (svcRef ?? "").toLowerCase() || String(s.port) === svcRef,
    );
    if (!svc) {
      return { output: `service-info: no existe el servicio ${svcRef} en ${host.hostname}\n`, isError: true };
    }
    return {
      output:
        `${svc.name} @ ${host.hostname} (${host.ip})\n` +
        `  puerto:   ${svc.port}/${svc.protocol}\n` +
        `  tipo:     ${svc.kind}\n` +
        `  versión:  ${svc.version}\n` +
        `  estado:   ${svc.state}${host.firewall.includes(svc.port) ? " (puerto bloqueado por firewall)" : ""}\n` +
        `  al boot:  ${svc.enabled ? "sí" : "no"}\n`,
      isError: false,
    };
  }

  /**
   * service-start / service-stop / service-restart <servicio> <host>.
   * Acepta también el orden inverso <host> <servicio>. Al cambiar el estado,
   * el navegador, curl y nmap lo ven al instante: todos miran el mismo mundo.
   */
  private serviceCtlCmd(
    command: string,
    args: string[],
  ): { output: string; isError: boolean } {
    const positional = args.filter((a) => !a.startsWith("-"));
    if (positional.length < 2) {
      return {
        output: `${command}: usá ${command} <servicio> <host>  (ej. ${command} nginx server.nande)\n`,
        isError: true,
      };
    }

    // Detectar cuál argumento es el host (el que resuelve en el runtime).
    let [a, b] = positional;
    let host = this.kernel.hosts.resolve(b);
    let service = a;
    if (!host) {
      // Probar el orden inverso: <host> <servicio>.
      host = this.kernel.hosts.resolve(a);
      service = b;
    }
    if (!host) {
      return {
        output: `${command}: host desconocido. Mirá 'services' para la lista.\n`,
        isError: true,
      };
    }

    const action = command.slice("service-".length) as "start" | "stop" | "restart";
    const result =
      action === "start"
        ? this.kernel.hosts.startService(host.hostname, service)
        : action === "stop"
          ? this.kernel.hosts.stopService(host.hostname, service)
          : this.kernel.hosts.restartService(host.hostname, service);

    return {
      output: `${result.ok ? "✔" : "✘"} ${result.message}\n`,
      isError: !result.ok,
    };
  }

  /** firewall block|allow <host> <puerto>  ·  firewall <host> (ver reglas). */
  private firewallCmd(args: string[]): { output: string; isError: boolean } {
    const positional = args.filter((a) => !a.startsWith("-"));
    const action = positional[0];

    if (action === "block" || action === "allow") {
      const host = this.kernel.hosts.resolve(positional[1] ?? "");
      const port = Number(positional[2]);
      if (!host || !Number.isFinite(port)) {
        return {
          output: `firewall: usá firewall ${action} <host> <puerto>\n`,
          isError: true,
        };
      }
      const r =
        action === "block"
          ? this.kernel.hosts.blockPort(host.hostname, port)
          : this.kernel.hosts.allowPort(host.hostname, port);
      return { output: `${r.ok ? "✔" : "✘"} ${r.message}\n`, isError: !r.ok };
    }

    // Ver reglas de un host.
    const host = this.kernel.hosts.resolve(action ?? "");
    if (!host) {
      return {
        output:
          `firewall: usá 'firewall block <host> <puerto>', 'firewall allow <host> <puerto>' o 'firewall <host>'.\n`,
        isError: true,
      };
    }
    const bloqueados = host.firewall.length
      ? host.firewall.join(", ")
      : "(ninguno)";
    return {
      output: `Firewall de ${host.hostname}: puertos bloqueados → ${bloqueados}\n`,
      isError: false,
    };
  }

  /** Detecta si alguna interfaz tiene la MAC cambiada respecto de fábrica. */
  private macChanged(): boolean {
    return this.kernel.network.listInterfaces().some(
      (i) => DEFAULT_MACS[i.name] && i.mac !== DEFAULT_MACS[i.name],
    );
  }

  /** anon [status|on|off|new] — red de anonimato (tipo Tor). */
  private anonCmd(args: string[]): { output: string; isError: boolean } {
    const action = args[0] ?? "status";
    const a = this.kernel.anonymity;

    if (action === "on" || action === "start") {
      const exit = a.enableTor();
      return {
        output:
          `🧅 Red de anonimato ACTIVADA.\n` +
          `Tu tráfico sale por un nodo en ${exit.pais} (${exit.ip}).\n` +
          `El destino ve esa IP, no la tuya. Cambiá de circuito con 'anon new'.\n`,
        isError: false,
      };
    }
    if (action === "off" || action === "stop") {
      a.disableTor();
      return { output: "Red de anonimato DESACTIVADA. Volvés a salir con tu IP real.\n", isError: false };
    }
    if (action === "new" || action === "circuito") {
      const exit = a.newCircuit();
      return exit
        ? { output: `Nuevo circuito: salís por ${exit.pais} (${exit.ip}).\n`, isError: false }
        : { output: "La red de anonimato está apagada. Encendela con 'anon on'.\n", isError: false };
    }

    // status
    const eth0 = this.kernel.network.getInterface("eth0");
    const realIp = eth0?.ip ?? "10.10.0.10";
    const on = a.isTorEnabled();
    return {
      output:
        `Estado de anonimato:\n` +
        `  Red de anonimato: ${on ? "ACTIVA 🧅" : "apagada"}\n` +
        `  IP que ve el destino: ${a.visibleIp(realIp)}${on ? ` (nodo de salida en ${a.exitNode().pais})` : " (tu IP real)"}\n` +
        `  Comandos: anon on · anon off · anon new\n`,
      isError: false,
    };
  }

  /** macchanger <iface> [random|<MAC>] — cambia la MAC (MAC spoofing). */
  private macchangerCmd(args: string[]): { output: string; isError: boolean } {
    const iface = args[0];
    const mode = args[1] ?? "random";
    if (!iface) {
      return { output: "uso: macchanger <iface> [random|AA:BB:CC:DD:EE:FF]\n", isError: true };
    }
    const current = this.kernel.network.getInterface(iface);
    if (!current) {
      return { output: `macchanger: no existe la interfaz ${iface}\n`, isError: true };
    }
    const nueva =
      mode === "random"
        ? randomMac(this.kernel.world.getState().clock.tick + iface.length + 7)
        : mode;
    if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(nueva)) {
      return { output: `macchanger: MAC inválida: ${nueva}\n`, isError: true };
    }
    try {
      this.kernel.network.setMac(iface, nueva);
    } catch (e) {
      return { output: `macchanger: ${e instanceof Error ? e.message : "error"}\n`, isError: true };
    }
    return {
      output:
        `MAC de ${iface} cambiada:\n  antes: ${current.mac}\n  ahora: ${nueva}\n` +
        `Tu placa se presenta con otra identidad en la red local.\n`,
      isError: false,
    };
  }

  /** identidad — panel de tu huella en la red (IP, MAC, salida, nivel). */
  private identidadCmd(): { output: string; isError: boolean } {
    const eth0 = this.kernel.network.getInterface("eth0");
    const wlan0 = this.kernel.network.getInterface("wlan0");
    const realIp = eth0?.ip ?? "10.10.0.10";
    const a = this.kernel.anonymity;
    const changed = this.macChanged();
    const nivel = a.level(changed);
    const lines = [
      "═══ TU IDENTIDAD EN LA RED ═══",
      `  IP real:         ${realIp}`,
      `  IP visible:      ${a.visibleIp(realIp)}${a.isTorEnabled() ? " (por la red de anonimato)" : ""}`,
      `  MAC eth0:        ${eth0?.mac ?? "-"}${eth0 && eth0.mac !== DEFAULT_MACS.eth0 ? " (cambiada)" : ""}`,
      `  MAC wlan0:       ${wlan0?.mac ?? "-"}${wlan0 && wlan0.mac !== DEFAULT_MACS.wlan0 ? " (cambiada)" : ""}`,
      `  Anonimato:       ${nivel.label.toUpperCase()} (${nivel.score}/3)`,
      "",
      "Para mejorar:",
      ...nivel.tips.map((t) => `  • ${t}`),
      "",
    ];
    return { output: lines.join("\n") + "\n", isError: false };
  }

  private wifiCmd(args: string[]): { output: string; isError: boolean } {
    const action = args[0] ?? "status";

    if (action === "scan" || action === "list") {
      const nets = this.kernel.wifi.scan();
      const current = this.kernel.wifi.current();

      const lines = nets
        .map((n) => {
          const bars = "▂▄▆█".slice(
            0,
            Math.max(1, Math.ceil(n.signal / 25)),
          );
          const lock = n.security === "abierta" ? "  " : "🔒";
          const here = n.ssid === current ? " (conectado)" : "";
          return `  ${lock} ${bars.padEnd(4)} ${String(n.signal).padStart(3)}%  ${n.ssid}${here}\n     ${n.about}`;
        })
        .join("\n");

      return {
        output: `Redes WiFi a la vista:\n\n${lines}\n\nConectar: wifi connect <SSID> [contraseña]\n`,
        isError: false,
      };
    }

    if (action === "connect") {
      const ssid = args[1];

      if (!ssid) {
        return { output: "uso: wifi connect <SSID> [contraseña]\n", isError: true };
      }

      const result = this.kernel.wifi.connect(ssid, args[2]);

      return {
        output: `${result.ok ? "📶" : "⚠"} ${result.message}\n`,
        isError: !result.ok,
      };
    }

    if (action === "disconnect") {
      const result = this.kernel.wifi.disconnect();
      return { output: `${result.message}\n`, isError: !result.ok };
    }

    const current = this.kernel.wifi.current();

    return {
      output: current
        ? `📶 Conectado a "${current}" (wlan0 activa).\n`
        : `WiFi desconectado. Escaneá con 'wifi scan'.\n`,
      isError: false,
    };
  }

  /** Grupos hacker: listar, unirse, salir. */
  /** Resuelve lo que el jugador escribió (id, nombre, "rojo"/"azul"…) a un id. */
  private resolveGroupId(query: string): string | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const groups = this.kernel.groups.all();

    // Sinónimos cómodos para los equipos por color/tema.
    const alias: Record<string, string> = {
      rojo: "red-team", red: "red-team", ataque: "red-team",
      azul: "blue-team", blue: "blue-team", defensa: "blue-team",
      ctf: "ctf", privacidad: "privacidad", osint: "osint",
    };
    if (alias[q]) {
      const byFocus = groups.find((g) => g.focus === alias[q]);
      if (byFocus) return byFocus.id;
    }

    // id exacto, id sin el prefijo "g-", o nombre que contenga lo escrito.
    const exact = groups.find((g) => g.id.toLowerCase() === q);
    if (exact) return exact.id;
    const bySuffix = groups.find((g) => g.id.toLowerCase() === `g-${q}` || g.id.toLowerCase().endsWith(q));
    if (bySuffix) return bySuffix.id;
    const byName = groups.find((g) => g.name.toLowerCase().includes(q) || g.focus.includes(q));
    return byName ? byName.id : null;
  }

  private groupsCmd(args: string[]): { output: string; isError: boolean } {
    const sub = (args[0] ?? "").toLowerCase();
    const JOIN = ["join", "unir", "unirme", "unirse", "unite", "sumar", "sumarme", "entrar"];
    const LEAVE = ["leave", "salir", "dejar", "abandonar", "irme"];

    if (JOIN.includes(sub)) {
      const query = args.slice(1).join(" ");
      if (!query) {
        return { output: "¿A cuál te querés unir? Ej: grupos unir rojo (o el id, como g-redteam)\n", isError: true };
      }
      const id = this.resolveGroupId(query);
      if (!id) {
        return { output: `No encontré ningún grupo que coincida con "${query}". Escribí "grupos" para ver la lista.\n`, isError: true };
      }
      const r = this.kernel.groups.join(id);
      return { output: `${r.ok ? "✅" : "⚠"} ${r.message}\n`, isError: !r.ok };
    }

    if (LEAVE.includes(sub)) {
      const r = this.kernel.groups.leave();
      return { output: `${r.message}\n`, isError: !r.ok };
    }

    const memberOf = this.kernel.groups.memberOf();
    const lines = this.kernel.groups
      .all()
      .map((g) => {
        const mine = g.id === memberOf ? " ✅" : "";
        const rec = g.recruiting ? "" : " (cerrado)";
        return `  ${g.tag} ${g.id.padEnd(14)}${g.name}${mine}${rec}\n     ${g.members} miembros · rep ${g.reputation}`;
      })
      .join("\n");

    return {
      output:
        `🕶️ Grupos hacker (éticos, dentro del sandbox)\n\n${lines}\n\n` +
        `Unirse: grupos unir <rojo|azul|id> · Salir: grupos salir · Web: https://groups.nande\n`,
      isError: false,
    };
  }

  /** Chat con los habitantes: listar, ver una charla, escribir. */
  private chatCmd(args: string[]): { output: string; isError: boolean } {
    const engine = this.kernel.worldEngine;

    // chat contactos: muestra gente en línea para escribirle.
    if (args[0] === "contactos" || args[0] === "who") {
      const online = engine.getOnlinePeople().slice(0, 12);
      const lines = online
        .map((p) => `  ${p.id}  ${p.name} (${p.profession})`)
        .join("\n");
      return {
        output:
          `👥 En línea ahora (escribiles con: chat <id> <mensaje>)\n\n${lines}\n`,
        isError: false,
      };
    }

    // chat <id/nombre> <mensaje>: escribir a alguien.
    if (args.length >= 2) {
      const target = args[0];
      const text = args.slice(1).join(" ");

      // Buscar por id exacto o por nombre.
      let person = engine.getPerson(target);
      if (!person) {
        person = engine
          .getPeople()
          .find(
            (p) => p.name.toLowerCase() === target.toLowerCase(),
          );
      }

      if (!person) {
        return {
          output: `chat: no encontré a "${target}". Mirá 'chat contactos'.\n`,
          isError: true,
        };
      }

      const tick = this.kernel.world.getState().clock.tick;
      const reply = this.kernel.chat.send(person, text, tick);

      return {
        output: `Vos → ${person.name}: ${text}\n${person.name}: ${reply}\n`,
        isError: false,
      };
    }

    // chat: lista de conversaciones.
    const convos = this.kernel.chat.conversations();

    if (convos.length === 0) {
      return {
        output:
          `💬 Sin conversaciones todavía.\n` +
          `Mirá quién está en línea con 'chat contactos' y escribiles.\n`,
        isError: false,
      };
    }

    const lines = convos
      .map((c) => {
        const last = c.messages[c.messages.length - 1];
        const dot = c.unread > 0 ? "● " : "  ";
        const preview = last ? last.text.slice(0, 40) : "";
        return `  ${dot}${c.personName.padEnd(22)}${preview}`;
      })
      .join("\n");

    return {
      output:
        `💬 Chats (${this.kernel.chat.unreadTotal()} sin leer)\n\n${lines}\n\n` +
        `Escribir: chat <id o nombre> <mensaje>\n`,
      isError: false,
    };
  }

  /** Correo virtual: inbox, leer un mensaje, aceptar misión, responder. */
  private mailCmd(args: string[]): { output: string; isError: boolean } {
    const action = args[0];

    // mail read <id>
    if (action === "read") {
      const id = args[1];
      const msg = this.kernel.mail.get(id);

      if (!msg) {
        return { output: `mail: no existe "${id}". Mirá 'mail'.\n`, isError: true };
      }

      this.kernel.mail.markRead(msg.id);

      let out =
        `De: ${msg.fromName} <${msg.fromAddress}>\n` +
        `Asunto: ${msg.subject}\n\n${msg.body}\n`;

      if (msg.missionId) {
        const mission = this.kernel.missions.get(msg.missionId);
        out +=
          `\n📋 Este correo propone una misión: ${mission?.title ?? msg.missionId}\n` +
          `Aceptala con: mail accept ${msg.id}\n`;
      }

      return { output: out, isError: false };
    }

    // mail accept <id>
    if (action === "accept") {
      const id = args[1];
      const msg = this.kernel.mail.get(id);

      if (!msg || !msg.missionId) {
        return {
          output: `mail: ese correo no propone una misión.\n`,
          isError: true,
        };
      }

      const mission = this.kernel.missions.get(msg.missionId);

      if (!mission) {
        return { output: `mail: la misión ya no existe.\n`, isError: true };
      }

      const status = this.kernel.missions.status(msg.missionId);

      return {
        output:
          `✅ Misión aceptada: ${mission.title} [${status}]\n\n` +
          `${mission.brief}\n\nPista: ${mission.hint}\n` +
          `Recompensa: ${mission.reward.xp} XP, N$${mission.reward.coins}\n`,
        isError: false,
      };
    }

    // mail reply <id> <texto>
    if (action === "reply") {
      const id = args[1];
      const msg = this.kernel.mail.get(id);
      const text = args.slice(2).join(" ");

      if (!msg) {
        return { output: `mail: no existe "${id}".\n`, isError: true };
      }
      if (!text) {
        return { output: `uso: mail reply <id> <texto>\n`, isError: true };
      }

      const tick = this.kernel.world.getState().clock.tick;
      this.kernel.mail.sendReply(msg.fromName, text, tick);

      return {
        output: `📨 Respuesta enviada a ${msg.fromName}.\n`,
        isError: false,
      };
    }

    // mail (bandeja)
    const inbox = this.kernel.mail.inbox();

    if (inbox.length === 0) {
      return {
        output:
          `📭 Bandeja vacía. Los habitantes te van a escribir con el tiempo.\n`,
        isError: false,
      };
    }

    const lines = inbox
      .slice(0, 15)
      .map((m) => {
        const dot = m.read ? "  " : "● ";
        const tag = m.missionId ? " 📋" : "";
        return `  ${dot}${m.id.padEnd(9)}${m.fromName.padEnd(22)}${m.subject}${tag}`;
      })
      .join("\n");

    return {
      output:
        `📬 Bandeja de entrada (${this.kernel.mail.unreadCount()} sin leer)\n\n` +
        `${lines}\n\n` +
        `Leer: mail read <id> · Responder: mail reply <id> <texto>\n` +
        `📋 = propone una misión (aceptala con mail accept <id>)\n`,
      isError: false,
    };
  }

  /** Estado de la bolsa: índice, dinero movido y precios. */
  private showMarket(): { output: string; isError: boolean } {
    const eco = this.kernel.economy.snapshot();

    const rows = eco.stocks
      .map((s) => {
        const diff = s.price - s.prevPrice;
        const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "=";
        return `  ${s.ticker.padEnd(5)}${s.name.padEnd(18)}N$${String(s.price).padStart(5)}  ${arrow}${Math.abs(diff)}`;
      })
      .join("\n");

    return {
      output:
        `📈 Bolsa de ÑANDE\n` +
        `Índice: ${eco.index}   ·   Capitalización: N$${eco.marketCap.toLocaleString()}\n` +
        `💸 Dinero movido en el mundo: N$${eco.moneyMoved.toLocaleString()}\n\n` +
        `${rows}\n\n` +
        `Comprar: invertir <ticker> <cantidad> · Vender: vender-accion <ticker> <cantidad>\n` +
        `Tu cartera: portfolio\n`,
      isError: false,
    };
  }

  private buyStock(args: string[]): { output: string; isError: boolean } {
    const ticker = args[0];
    const qty = Number(args[1]);

    if (!ticker || !qty) {
      return { output: "uso: buy-stock <ticker> <cantidad>\n", isError: true };
    }

    const result = this.kernel.economy.buy(ticker, qty, (amount) =>
      this.kernel.player.spend(amount),
    );

    return {
      output: `${result.message}\n` +
        (result.ok ? `Saldo: N$${this.kernel.player.wallet}\n` : ""),
      isError: !result.ok,
    };
  }

  private sellStock(args: string[]): { output: string; isError: boolean } {
    const ticker = args[0];
    const qty = Number(args[1]);

    if (!ticker || !qty) {
      return { output: "uso: sell-stock <ticker> <cantidad>\n", isError: true };
    }

    const result = this.kernel.economy.sell(ticker, qty, (amount) =>
      this.kernel.player.earn(amount),
    );

    return {
      output: `${result.message}\n` +
        (result.ok ? `Saldo: N$${this.kernel.player.wallet}\n` : ""),
      isError: !result.ok,
    };
  }

  private showPortfolio(): { output: string; isError: boolean } {
    const eco = this.kernel.economy.snapshot();
    const entries = Object.entries(eco.portfolio);

    if (entries.length === 0) {
      return {
        output:
          `💼 Tu cartera está vacía.\n` +
          `Saldo: N$${this.kernel.player.wallet}. Invertí con 'buy-stock <ticker> <cantidad>'.\n`,
        isError: false,
      };
    }

    const rows = entries
      .map(([ticker, qty]) => {
        const stock = this.kernel.economy.getStock(ticker)!;
        return `  ${ticker.padEnd(5)}${String(qty).padStart(6)} acc.  valor N$${(stock.price * qty).toLocaleString()}`;
      })
      .join("\n");

    return {
      output:
        `💼 Tu cartera\n\n${rows}\n\n` +
        `Valor total: N$${eco.portfolioValue.toLocaleString()}  ·  Efectivo: N$${this.kernel.player.wallet}\n`,
      isError: false,
    };
  }

  private runCreation(args: string[]): { output: string; isError: boolean } {
    const id = args[0];

    if (!id) {
      return {
        output:
          "uso: run <nombre> [args]\nEjecutá una herramienta instalada (tool-list) o una creación de la store.\n",
        isError: true,
      };
    }

    // 1) ¿Es una herramienta funcional instalada por vos o por un NPC?
    if (this.kernel.toolRuntime.has(id)) {
      const tool = this.kernel.toolRuntime.get(id)!;
      const r = this.kernel.toolRuntime.run(id, args.slice(1));
      const head = `▶ ${tool.manifest.name} v${tool.manifest.version} (por ${tool.manifest.author})\n`;
      if (!r.ok) {
        return { output: head + `✘ error: ${r.error}\n${r.output}`, isError: true };
      }
      const worldNotes = this.kernel.scanForSignals(r.output);
      const suffix = worldNotes.length ? "\n" + worldNotes.join("\n") + "\n" : "";
      return { output: head + r.output + suffix, isError: false };
    }

    const item = this.kernel.store.get(id);

    if (!item) {
      return {
        output: `run: "${id}" no es una creación de la store. Mirá 'store'.\n`,
        isError: true,
      };
    }

    const program = this.kernel.store.programOf(id);

    if (!program) {
      return {
        output:
          `run: "${item.name}" es un ${item.type} sin programa ejecutable.\n` +
          `(Las herramientas, apps y juegos sí se ejecutan.)\n`,
        isError: false,
      };
    }

    const output = program.run(args.slice(1));

    return {
      output:
        `▶ ${item.name} — ${program.label} (por ${item.metadata.ownerName ?? item.ownerId})\n` +
        `${output}\n`,
      isError: false,
    };
  }

  private buyItem(args: string[]): { output: string; isError: boolean } {
    const id = args[0];

    if (!id) {
      return { output: "uso: buy <id>\n", isError: true };
    }

    const item = this.kernel.store.get(id);

    if (!item) {
      return {
        output: `buy: producto "${id}" no encontrado. Mirá 'store'.\n`,
        isError: true,
      };
    }

    if (!this.kernel.player.spend(item.price)) {
      return {
        output:
          `buy: no te alcanza. Cuesta N$${item.price} y tenés N$${this.kernel.player.wallet}.\n`,
        isError: true,
      };
    }

    return {
      output:
        `✅ Compraste "${item.name}" por N$${item.price}.\n` +
        `Te quedan N$${this.kernel.player.wallet}.\n`,
      isError: false,
    };
  }

  private progressBar(value: number, max: number): string {
    const ratio = max > 0 ? Math.min(1, value / max) : 0;
    const filled = Math.round(ratio * 10);

    return "█".repeat(filled) + "░".repeat(10 - filled);
  }

  private listTools(args: string[]): {
    output: string;
    isError: boolean;
  } {
    const filter = args[0];
    const tools = filter
      ? this.kernel.tools
          .all()
          .filter(
            (tool) =>
              tool.category === filter || tool.level === filter,
          )
      : this.kernel.tools.all();

    if (tools.length === 0) {
      return {
        output: `No hay herramientas para "${filter}".\n`,
        isError: false,
      };
    }

    const lines = tools
      .map(
        (tool) =>
          `  ${tool.runnable ? "▶" : "📖"} ${tool.name.padEnd(16)}${tool.simple}`,
      )
      .join("\n");

    return {
      output:
        `ÑANDE Toolbox — ${tools.length} herramientas` +
        (filter ? ` (${filter})` : "") +
        `\n▶ ejecutable · 📖 ficha de estudio\n\n${lines}\n\n` +
        `Ficha completa: tool <nombre>. Navegable: https://tools.nande\n`,
      isError: false,
    };
  }

  private showTool(args: string[]): {
    output: string;
    isError: boolean;
  } {
    const name = args[0];

    if (!name) {
      return { output: "uso: tool <nombre>\n", isError: true };
    }

    const tool = this.kernel.tools.find(name);

    if (!tool) {
      return {
        output: `tool: "${name}" no está en la biblioteca. Probá 'tools'.\n`,
        isError: true,
      };
    }

    return {
      output:
        `${tool.name}  [${tool.level} · ${tool.category}]\n\n` +
        `Fácil:      ${tool.simple}\n` +
        `Qué hace:   ${tool.whatItDoes}\n` +
        `Por qué:    ${tool.whyExists}\n` +
        `Cuándo:     ${tool.whenToUse}\n` +
        `Resultado:  ${tool.resultMeaning}\n` +
        `Detección:  ${tool.howToDetect}\n` +
        `Defensa:    ${tool.howToDefend}\n\n` +
        `Ejemplo:    ${tool.usage}\n` +
        (tool.runnable
          ? `(ejecutable contra el laboratorio virtual)\n`
          : `(ficha de estudio, todavía no ejecutable)\n`),
      isError: false,
    };
  }

  private showAcademy(args: string[]): {
    output: string;
    isError: boolean;
  } {
    const id = args[0];

    if (id) {
      const course = this.kernel.academy.get(id);

      if (!course) {
        return {
          output: `academy: curso "${id}" no existe. Probá 'academy'.\n`,
          isError: true,
        };
      }

      return {
        output:
          `${course.title}\n\n${course.simple}\n\n` +
          `Vas a aprender: ${course.summary}\n` +
          `Temas: ${course.topics.join(", ")}\n` +
          (course.tools.length
            ? `Herramientas: ${course.tools.join(", ")}\n`
            : "") +
          (course.labs.length ? `Labs: ${course.labs.join(", ")}\n` : "") +
          (course.requires.length
            ? `Antes: ${course.requires.join(", ")}\n`
            : "Sin requisitos: podés empezar acá.\n") +
          `\nMás detalle: https://academy.nande/course/${course.id}\n`,
        isError: false,
      };
    }

    const lines = this.kernel.academy
      .all()
      .map((course) => `  ${course.title}`)
      .join("\n");

    return {
      output:
        `🎓 ÑANDE Academy — ruta de aprendizaje\n\n${lines}\n\n` +
        `Detalle de un nivel: academy <id> (ej: academy redes).\n` +
        `Navegable: https://academy.nande\n`,
      isError: false,
    };
  }

  private showNeighbors(): { output: string; isError: boolean } {
    const hour = this.kernel.world.getState().clock.hour;
    const engine = this.kernel.worldEngine;

    // Una muestra de habitantes y qué está haciendo cada uno ahora.
    const people = engine.getOnlinePeople().slice(0, 8);

    const lines = people
      .map((person) => {
        const life = engine.getPersonLife(person.id, hour);
        return `  ${life?.icon ?? "·"} ${person.name.padEnd(22)}${life?.activity ?? "?"} (${person.profession})`;
      })
      .join("\n");

    const breakdown = engine.lifeBreakdown(hour);
    const resumen = Object.entries(breakdown)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([act, n]) => `${act}: ${n}`)
      .join("  ·  ");

    return {
      output:
        `🏘️  El mundo a las ${String(hour).padStart(2, "0")}:00\n\n` +
        `${lines || "  (no hay nadie en línea ahora)"}\n\n` +
        `El mundo ahora mismo:\n  ${resumen}\n`,
      isError: false,
    };
  }

  private listLabs(): {
    output: string;
    isError: boolean;
  } {
    const labs = this.kernel.tools.labs();

    const lines = labs
      .map(
        (lab) =>
          `  ${lab.ip.padEnd(14)}${lab.hostname.padEnd(18)}[${lab.difficulty}]\n     ${lab.description}`,
      )
      .join("\n");

    return {
      output:
        `Laboratorios de práctica (máquinas virtuales de ÑANDE)\n\n${lines}\n\n` +
        `Empezá con: nmap ${labs[0]?.ip ?? "10.10.5.10"}\n`,
      isError: false,
    };
  }

  private grep(args: string[]): {
    output: string;
    isError: boolean;
  } {
    if (!args[0]) {
      return {
        output: "grep: falta el patrón\n",
        isError: true,
      };
    }

    return {
      output: `grep: uso independiente: usa grep dentro de un pipe\n`,
      isError: true,
    };
  }

  private head(_args: string[]): {
    output: string;
    isError: boolean;
  } {
    return {
      output: "head: uso independiente: usa head dentro de un pipe\n",
      isError: true,
    };
  }

  private tail(_args: string[]): {
    output: string;
    isError: boolean;
  } {
    return {
      output: "tail: uso independiente: usa tail dentro de un pipe\n",
      isError: true,
    };
  }

  private wc(_args: string[]): {
    output: string;
    isError: boolean;
  } {
    return {
      output: "wc: uso independiente: usa wc dentro de un pipe\n",
      isError: true,
    };
  }

  private printf(args: string[]): {
    output: string;
    isError: boolean;
  } {
    if (args.length === 0) {
      return {
        output: "",
        isError: false,
      };
    }

    let format = args[0];
    const values = args.slice(1);

    let index = 0;

    format = format.replace(/%s/g, () => values[index++] ?? "");
    format = format.replace(/\\n/g, "\n");

    return {
      output: format,
      isError: false,
    };
  }

  private id(): string {
    const user = this.kernel.users.getUser(this.currentUser);

    if (!user) {
      return `uid=unknown(${this.currentUser}) groups=unknown\n`;
    }

    return `uid=${user.uid}(${user.username}) groups=${user.groups.join(",")}\n`;
  }

  private cd(args: string[]): {
    output: string;
    isError: boolean;
  } {
    const target = args[0] ?? "~";
    const path = this.resolvePath(target);
    const file = this.kernel.filesystem.getFile(path);

    if (!file || file.type !== "directory") {
      return {
        output: `cd: no existe el directorio: ${target}\n`,
        isError: true,
      };
    }

    if (
      !this.kernel.filesystem.canAccess(
        path,
        this.currentUser,
        "execute",
        this.kernel.users.getUser(this.currentUser)?.groups ?? [],
      )
    ) {
      return {
        output: `cd: permiso denegado: ${target}\n`,
        isError: true,
      };
    }

    this.currentDirectory = path;
    this.environment.PWD = path;

    return {
      output: "",
      isError: false,
    };
  }

  private ls(args: string[]): {
    output: string;
    isError: boolean;
  } {
    const target = this.resolvePath(args[0] ?? ".");

    const groups =
      this.kernel.users.getUser(this.currentUser)?.groups ?? [];

    if (
      !this.kernel.filesystem.canAccess(
        target,
        this.currentUser,
        "read",
        groups,
      ) ||
      !this.kernel.filesystem.canAccess(
        target,
        this.currentUser,
        "execute",
        groups,
      )
    ) {
      return {
        output: `ls: permiso denegado: ${args[0] ?? "."}\n`,
        isError: true,
      };
    }

    const files = this.kernel.filesystem.listDirectory(target);

    const output = files
      .map(
        (file) =>
          `${file.permissions} ${file.owner} ${file.group} ${
            file.type === "directory"
              ? `${file.path.split("/").pop()}/`
              : file.path.split("/").pop()
          }`,
      )
      .join("\n");

    return {
      output: output ? `${output}\n` : "",
      isError: false,
    };
  }

  private cat(args: string[]): {
    output: string;
    isError: boolean;
  } {
    if (!args[0]) {
      return {
        output: "cat: falta el archivo\n",
        isError: true,
      };
    }

    const path = this.resolvePath(args[0]);
    const groups =
      this.kernel.users.getUser(this.currentUser)?.groups ?? [];

    if (!this.kernel.filesystem.exists(path)) {
      return {
        output: `cat: no existe el archivo: ${args[0]}\n`,
        isError: true,
      };
    }

    if (
      !this.kernel.filesystem.canAccess(
        path,
        this.currentUser,
        "read",
        groups,
      )
    ) {
      return {
        output: `cat: permiso denegado: ${args[0]}\n`,
        isError: true,
      };
    }

    return {
      output: `${this.kernel.filesystem.readFile(path)}\n`,
      isError: false,
    };
  }

  private echo(
    args: string[],
    originalInput: string,
  ): {
    output: string;
    isError: boolean;
  } {
    const append = originalInput.includes(">>");
    const redirect = append
      ? ">>"
      : originalInput.includes(">")
        ? ">"
        : null;

    if (!redirect) {
      return {
        output: `${args.join(" ")}\n`,
        isError: false,
      };
    }

    const index = originalInput.indexOf(redirect);

    const left = originalInput
      .slice(0, index)
      .replace(/^echo\s+/, "")
      .trim();

    const target = originalInput
      .slice(index + redirect.length)
      .trim()
      .replace(/^["']|["']$/g, "");

    const content = left.replace(/^["']|["']$/g, "");
    const path = this.resolvePath(target);

    const groups =
      this.kernel.users.getUser(this.currentUser)?.groups ?? [];

    const file = this.kernel.filesystem.getFile(path);

    if (!file) {
      const parent =
        path.substring(0, path.lastIndexOf("/")) || "/";

      if (
        !this.kernel.filesystem.canAccess(
          parent,
          this.currentUser,
          "write",
          groups,
        ) ||
        !this.kernel.filesystem.canAccess(
          parent,
          this.currentUser,
          "execute",
          groups,
        )
      ) {
        return {
          output: `echo: permiso denegado: ${target}\n`,
          isError: true,
        };
      }

      this.kernel.filesystem.createFile(
        path,
        content,
        this.currentUser,
        "users",
        "644",
      );

      return {
        output: "",
        isError: false,
      };
    }

    if (
      !this.kernel.filesystem.canAccess(
        path,
        this.currentUser,
        "write",
        groups,
      )
    ) {
      return {
        output: `echo: permiso denegado: ${target}\n`,
        isError: true,
      };
    }

    const previous = append
      ? this.kernel.filesystem.readFile(path)
      : "";

    this.kernel.filesystem.writeFile(
      path,
      append
        ? `${previous}\n${content}`
        : content,
    );

    return {
      output: "",
      isError: false,
    };
  }

  private mkdir(args: string[]): {
    output: string;
    isError: boolean;
  } {
    if (!args[0]) {
      return {
        output: "mkdir: falta el nombre del directorio\n",
        isError: true,
      };
    }

    const path = this.resolvePath(args[0]);
    const parent = path.substring(0, path.lastIndexOf("/")) || "/";

    const groups =
      this.kernel.users.getUser(this.currentUser)?.groups ?? [];

    if (
      !this.kernel.filesystem.canAccess(
        parent,
        this.currentUser,
        "write",
        groups,
      ) ||
      !this.kernel.filesystem.canAccess(
        parent,
        this.currentUser,
        "execute",
        groups,
      )
    ) {
      return {
        output: `mkdir: permiso denegado: ${args[0]}\n`,
        isError: true,
      };
    }

    this.kernel.filesystem.createDirectory(path);

    return {
      output: "",
      isError: false,
    };
  }

  private touch(args: string[]): {
    output: string;
    isError: boolean;
  } {
    if (!args[0]) {
      return {
        output: "touch: falta el nombre del archivo\n",
        isError: true,
      };
    }

    const path = this.resolvePath(args[0]);
    const parent = path.substring(0, path.lastIndexOf("/")) || "/";

    const groups =
      this.kernel.users.getUser(this.currentUser)?.groups ?? [];

    if (
      !this.kernel.filesystem.canAccess(
        parent,
        this.currentUser,
        "write",
        groups,
      ) ||
      !this.kernel.filesystem.canAccess(
        parent,
        this.currentUser,
        "execute",
        groups,
      )
    ) {
      return {
        output: `touch: permiso denegado: ${args[0]}\n`,
        isError: true,
      };
    }

    if (this.kernel.filesystem.exists(path)) {
      return {
        output: `El archivo ya existe: ${path}\n`,
        isError: true,
      };
    }

    this.kernel.filesystem.createFile(path);

    return {
      output: "",
      isError: false,
    };
  }

  private rm(args: string[]): {
    output: string;
    isError: boolean;
  } {
    if (!args[0]) {
      return {
        output: "rm: falta el archivo\n",
        isError: true,
      };
    }

    const path = this.resolvePath(args[0]);
    const parent = path.substring(0, path.lastIndexOf("/")) || "/";

    const groups =
      this.kernel.users.getUser(this.currentUser)?.groups ?? [];

    if (
      !this.kernel.filesystem.canAccess(
        parent,
        this.currentUser,
        "write",
        groups,
      ) ||
      !this.kernel.filesystem.canAccess(
        parent,
        this.currentUser,
        "execute",
        groups,
      )
    ) {
      return {
        output: `rm: permiso denegado: ${args[0]}\n`,
        isError: true,
      };
    }

    this.kernel.filesystem.remove(path);

    return {
      output: "",
      isError: false,
    };
  }

  private chmod(args: string[]): {
    output: string;
    isError: boolean;
  } {
    if (args.length < 2) {
      return {
        output: "chmod: uso: chmod <permisos> <archivo>\n",
        isError: true,
      };
    }

    const user = this.kernel.users.getUser(this.currentUser);

    const path = this.resolvePath(args[1]);
    const file = this.kernel.filesystem.getFile(path);

    if (!file) {
      return {
        output: `chmod: no existe: ${args[1]}\n`,
        isError: true,
      };
    }

    if (this.currentUser !== "root" && file.owner !== user?.username) {
      return {
        output: `chmod: permiso denegado: ${args[1]}\n`,
        isError: true,
      };
    }

    this.kernel.filesystem.chmod(path, args[0]);

    return {
      output: "",
      isError: false,
    };
  }

  private chown(args: string[]): {
    output: string;
    isError: boolean;
  } {
    if (args.length < 2) {
      return {
        output: "chown: uso: chown <usuario>[:grupo] <archivo>\n",
        isError: true,
      };
    }

    if (this.currentUser !== "root") {
      return {
        output: "chown: solo root puede cambiar propietarios\n",
        isError: true,
      };
    }

    const [owner, group] = args[0].split(":");
    const path = this.resolvePath(args[1]);

    this.kernel.filesystem.chown(path, owner, group);

    return {
      output: "",
      isError: false,
    };
  }

  private ps(): {
    output: string;
    isError: boolean;
  } {
    const processes = this.kernel.processes;

    const processList = [
      processes.find(1),
      processes.find(2),
      processes.find(3),
    ].filter((process) => process !== undefined);

    const output = processList
      .map(
        (process) =>
          `${process.pid}\t${process.owner}\t${process.status}\t${process.name}`,
      )
      .join("\n");

    return {
      output: output
        ? `PID\tUSER\tSTATUS\tNAME\n${output}\n`
        : "",
      isError: false,
    };
  }

  /**
   * objetivo [lista] — modo "te dan una IP y la vulnerás". Te asigna el
   * primer objetivo sin resolver (su bandera no está capturada todavía),
   * con pista. Al capturar la bandera del objetivo, queda marcado y el
   * siguiente 'objetivo' te da otro. Todo ficticio y dentro del sandbox.
   */
  private objetivoCmd(args: string[]): { output: string; isError: boolean } {
    const captured = new Set(this.kernel.player.capturedFlags());
    const done = (t: (typeof TARGETS)[number]) => captured.has(t.flag);

    if (args[0] === "lista" || args[0] === "list") {
      const rows = TARGETS.map(
        (t, i) => `  ${done(t) ? "✅" : "🎯"} #${i + 1} ${t.ip.padEnd(13)} ${t.host}  [${t.nivel}]`,
      ).join("\n");
      const hechos = TARGETS.filter(done).length;
      return {
        output: `Objetivos (${hechos}/${TARGETS.length} vulnerados):\n${rows}\n`,
        isError: false,
      };
    }

    const pendiente = TARGETS.find((t) => !done(t));
    if (!pendiente) {
      return {
        output:
          "🏆 ¡Vulneraste todos los objetivos! Sos un operador completo.\n" +
          "Mirá 'objetivo lista' para repasar.\n",
        isError: false,
      };
    }

    return {
      output:
        `🎯 OBJETIVO ASIGNADO\n` +
        `  IP:     ${pendiente.ip}\n` +
        `  Host:   ${pendiente.host}\n` +
        `  Nivel:  ${pendiente.nivel}\n\n` +
        `Misión: enumerá el objetivo, encontrá la falla y capturá su bandera.\n` +
        `  1) nmap ${pendiente.ip}\n` +
        `  2) abrí el sitio (Navegador) o usá curl http://${pendiente.host}/\n` +
        `  Pista: ${pendiente.pista}\n\n` +
        `Cuando captures la bandera, escribí 'objetivo' para el siguiente.\n` +
        `¿Trabado? 'hint' o preguntale a Ñandú (Asistente IA).\n`,
      isError: false,
    };
  }

  /** Guía de arranque: qué hacer en los primeros minutos. */
  private guia(): string {
    return [
      "╔══════════════════════════════════════════╗",
      "║   CÓMO EMPEZAR EN ÑANDE — 4 pasos         ║",
      "╚══════════════════════════════════════════╝",
      "",
      "1) Abrí la app «Misión» (en el dock): te dice tu",
      "   PRÓXIMO PASO exacto y te lleva al lugar.",
      "   (o escribí 'objetivo': te dan una IP para vulnerar)",
      "",
      "2) ¿Nunca hackeaste? Abrí «Learn» y hacé la",
      "   lección de nmap. Se aprende haciendo.",
      "",
      "3) En esta Terminal probá:",
      "     nmap server.nande      (ver puertos)",
      "     curl http://banco.nande/   (una web real)",
      "     learn                  (lecciones guiadas)",
      "",
      "4) ¿Trabado? Escribí  hint  para una pista, o",
      "   preguntale a «La Mani» (el maní flotante).",
      "",
      "Tip: 'help' lista TODOS los comandos.",
      "",
    ].join("\n");
  }

  private help(): string {
    return [
      "Comandos disponibles:",
      "  guia             ⭐ Cómo empezar (leé esto primero)",
      "  objetivo         🎯 Te asignan una IP para vulnerar (reto)",
      "",
      "  pwd              Muestra el directorio actual",
      "  cd <ruta>        Cambia de directorio",
      "  ls [ruta]        Lista archivos",
      "  cat <archivo>    Muestra un archivo",
      "  echo <texto>     Muestra texto",
      "  echo x > archivo Escribe un archivo",
      "  echo x >> archivo Agrega texto",
      "  mkdir <dir>      Crea un directorio",
      "  touch <archivo>  Crea un archivo",
      "  rm <ruta>        Elimina un archivo/directorio",
      "  chmod <perm> <f> Cambia permisos",
      "  chown <u> <f>    Cambia propietario",
      "  pwd              Directorio actual",
      "  whoami           Usuario actual",
      "  id               Información del usuario",
      "  hostname         Nombre del sistema",
      "  uname            Información del kernel",
      "  ps               Procesos virtuales",
      "  clear            Limpia la terminal",
      "",
      "Redes y academia:",
      "  ping <ip>        Ver si una máquina responde",
      "  nslookup <host>  Resolver un nombre",
      "  nmap <ip>        Escanear puertos (probá: nmap 10.10.5.20)",
      "  academy          Ruta de aprendizaje de ciberseguridad",
      "  learn            Lecciones guiadas (aprendé haciendo)",
      "  hint             Pista de la lección activa",
      "  tools [cat]      Biblioteca de herramientas",
      "  tool <nombre>    Ficha de una herramienta (ej: tool nmap)",
      "  labs             Máquinas de práctica",
      "  vecinos          Qué hace la gente del mundo ahora",
      "  profile          Tu progreso (nivel, XP, dinero)",
      "  missions         Tus misiones",
      "  store            Tienda de creaciones de habitantes",
      "  run <id>         Ejecuta una creación de la store",
      "",
      "Economía:",
      "  market           Bolsa: precios, índice y dinero que se mueve",
      "  buy-stock T N    Comprar N acciones de T",
      "  sell-stock T N   Vender N acciones de T",
      "  portfolio        Tu cartera y saldo",
      "",
      "Correo:",
      "  mail             Bandeja de entrada",
      "  mail read <id>   Leer un mensaje",
      "  mail accept <id> Aceptar una misión propuesta",
      "  mail reply <id> X Responder",
      "",
      "Chat:",
      "  chat             Tus conversaciones",
      "  chat contactos   Quién está en línea",
      "  chat <id> <msg>  Escribirle a un habitante",
      "  groups           Grupos hacker éticos (unirse/salir)",
      "",
      "Hacking web y cripto:",
      "  curl <url>       Petición HTTP a las webs del mundo (SQLi, etc.)",
      "  crack <hash>     Crackea un hash MD5/SHA-256 de verdad",
      "  jwt <sub>        Inspecciona/crackea/forja tokens JWT",
      "  publicar <t> <n> Publicá tu propio sitio en la Internet virtual",
      "",
      "Programación (herramientas funcionales de verdad):",
      "  code new <nombre>   Crea una herramienta de ejemplo (corre en sandbox)",
      "  code <ruta>         Muestra el código de una herramienta",
      "  compile <ruta>      Valida el código sin instalar",
      "  tool-install <ruta> Compila e instala la herramienta",
      "  tool-list           Tus herramientas instaladas",
      "  tool-info <nombre>  Detalle de una herramienta",
      "  tool-remove <nombre> Desinstala",
      "  run <nombre> [args] Ejecuta una herramienta instalada",
      "",
      "Anonimato y OPSEC:",
      "  identidad          Tu huella en la red (IP, MAC, nivel)",
      "  anon on|off|new    Enrutar por la red de anonimato (tipo Tor)",
      "  macchanger <if> random   Cambiar tu MAC (MAC spoofing)",
      "  exiftool <archivo>       Ver/limpiar metadatos que te delatan",
      "",
      "Acceso remoto y pivoting (ultra):",
      "  connect <host> [usuario] [clave]  Entra a una máquina (SSH virtual)",
      "  (dentro) ls · cat <f> · ps · kill <pid> · services · nmap · flag · exit",
      "  → desde una máquina comprometida, 'nmap' revela su red INTERNA",
      "",
      "Hosts, servicios y firewall (mundo real):",
      "  services [host]  Lista hosts, o los servicios de un host y su estado",
      "  service-info <s> <host>       Detalle de un servicio",
      "  service-stop <s> <host>       Detiene un servicio (curl/nmap lo ven)",
      "  service-start <s> <host>      Arranca un servicio",
      "  service-restart <s> <host>    Reinicia un servicio",
      "  firewall block <host> <puerto>  Bloquea un puerto",
      "  firewall allow <host> <puerto>  Permite un puerto",
      "  soc / soc alerts   Centro de operaciones: alertas de eventos reales",
      "",
      "Hardware y WiFi:",
      "  neofetch         Muestra tu PC virtual (specs)",
      "  wifi scan        Redes WiFi virtuales a la vista",
      "  wifi connect X   Conectarse a una red",
      "  wifi status      Estado de la conexión",
      "  help             Muestra esta ayuda",
      "",
    ].join("\n");
  }
}

/** Quita comillas envolventes de un argumento (curl "..."). */
function stripQuotes(value: string): string {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
