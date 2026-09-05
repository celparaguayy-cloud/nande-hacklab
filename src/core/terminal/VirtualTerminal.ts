import { VirtualKernel } from "../VirtualKernel";

export class VirtualTerminal {
  private kernel: VirtualKernel;
  private currentUser: string;
  private currentDirectory: string;
  private environment: Record<string, string>;
  /** Lección guiada en curso y en qué paso va. */
  private activeLesson: string | null = null;
  private lessonStep = 0;

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
              output: `export: formato inválido: ${assignment}\\n`,
              isError: true,
            };
          }

          const key = assignment.slice(0, separator);
          const value = assignment.slice(separator + 1);

          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
            return {
              output: `export: nombre inválido: ${key}\\n`,
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
            output: `${command}: falta el nombre del programa\\n`,
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
          output: "Sesión virtual terminada.\\n",
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
          return this.showStore();

        case "buy":
          return this.buyItem(commandArgs);

        case "run":
          return this.runCreation(commandArgs);

        case "market":
        case "bolsa":
          return this.showMarket();

        case "buy-stock":
          return this.buyStock(commandArgs);

        case "sell-stock":
          return this.sellStock(commandArgs);

        case "portfolio":
        case "cartera":
          return this.showPortfolio();

        case "mail":
          return this.mailCmd(commandArgs);

        case "neofetch":
        case "hw":
          return { output: `${this.kernel.hardware.render()}\n`, isError: false };

        case "wifi":
          return this.wifiCmd(commandArgs);

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
    if (!result.flag) {
      return { output: result.output, isError: result.isError };
    }

    // A que laboratorio pertenece la bandera capturada.
    const target = args.find(
      (a) => a.startsWith("10.10.") || a.includes(".lab") || a.startsWith("http"),
    );

    const host = target?.match(/^https?:\/\/([^/]+)/i)?.[1] ?? target ?? "";
    const machine = this.kernel.tools
      .labs()
      .find((m) => m.ip === host || m.hostname === host);

    if (!machine) {
      return { output: result.output, isError: result.isError };
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
      output: result.output + extra.join("\n") + "\n",
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
        `Comprar: buy-stock <ticker> <cantidad> · Vender: sell-stock <ticker> <cantidad>\n` +
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
          "uso: run <id> [args]\nMirá qué hay en 'store' y ejecutá una creación.\n",
        isError: true,
      };
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
        output: "grep: falta el patrón\\n",
        isError: true,
      };
    }

    return {
      output: `grep: uso independiente: usa grep dentro de un pipe\\n`,
      isError: true,
    };
  }

  private head(_args: string[]): {
    output: string;
    isError: boolean;
  } {
    return {
      output: "head: uso independiente: usa head dentro de un pipe\\n",
      isError: true,
    };
  }

  private tail(_args: string[]): {
    output: string;
    isError: boolean;
  } {
    return {
      output: "tail: uso independiente: usa tail dentro de un pipe\\n",
      isError: true,
    };
  }

  private wc(_args: string[]): {
    output: string;
    isError: boolean;
  } {
    return {
      output: "wc: uso independiente: usa wc dentro de un pipe\\n",
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
    format = format.replace(/\\n/g, "\\n");

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

  private help(): string {
    return [
      "Comandos disponibles:",
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
