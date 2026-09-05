import { VirtualKernel } from "../VirtualKernel";

export class VirtualTerminal {
  private kernel: VirtualKernel;
  private currentUser: string;
  private currentDirectory: string;
  private environment: Record<string, string>;

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

    // Los pipes se procesan dentro del shell virtual.
    // Cada etapa recibe únicamente la salida de la etapa anterior.
    if (this.hasPipe(commandLine)) {
      return this.executePipeline(commandLine);
    }

    const commands = this.splitChain(commandLine);

    let output = "";
    let previousError = false;

    for (const item of commands) {
      if (item.operator === "&&" && previousError) {
        continue;
      }

      if (item.operator === "||" && !previousError) {
        continue;
      }

      const result = this.executeSingle(item.command);

      if (result.output) {
        output += result.output;
      }

      previousError = result.isError;
    }

    return output;
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

      if (char === "|") {
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

  private splitChain(input: string): {
    command: string;
    operator: ";" | "&&" | "||" | null;
  }[] {
    const result: {
      command: string;
      operator: ";" | "&&" | "||" | null;
    }[] = [];

    let current = "";
    let quote = "";
    let i = 0;

    while (i < input.length) {
      const char = input[i];

      if (quote) {
        current += char;

        if (char === quote) {
          quote = "";
        }

        i++;
        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        current += char;
        i++;
        continue;
      }

      if (input.slice(i, i + 2) === "&&") {
        result.push({
          command: current.trim(),
          operator: "&&",
        });

        current = "";
        i += 2;
        continue;
      }

      if (input.slice(i, i + 2) === "||") {
        result.push({
          command: current.trim(),
          operator: "||",
        });

        current = "";
        i += 2;
        continue;
      }

      if (char === ";") {
        result.push({
          command: current.trim(),
          operator: ";",
        });

        current = "";
        i++;
        continue;
      }

      current += char;
      i++;
    }

    if (current.trim()) {
      result.push({
        command: current.trim(),
        operator: null,
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

        default:
          return {
            output: `Comando no encontrado: ${command}\n`,
            isError: true,
          };
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

    if (!this.kernel.filesystem.exists(path)) {
      this.kernel.filesystem.createFile(path);
    }

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
      "  help             Muestra esta ayuda",
      "",
    ].join("\n");
  }
}
