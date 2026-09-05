import { VirtualKernel } from "../VirtualKernel";

export class VirtualTerminal {
  private kernel: VirtualKernel;
  private currentUser: string;
  private currentDirectory: string;

  constructor(kernel: VirtualKernel) {
    this.kernel = kernel;
    this.currentUser = "student";
    this.currentDirectory = "/home/student";

  }

  getCurrentDirectory(): string {
    return this.currentDirectory;
  }

  getCurrentUser(): string {
    return this.currentUser;
  }

  execute(input: string): string {
    const commandLine = input.trim();

    if (!commandLine) {
      return "";
    }

    const commands = this.splitChain(commandLine);

    let output = "";

    for (const command of commands) {
      const result = this.executeSingle(command.command);

      if (result.output) {
        output += result.output;
      }

      if (result.isError) {
        return output;
      }

      if (command.operator === "&&" && result.isError) {
        return output;
      }
    }

    return output;
  }

  private splitChain(input: string): {
    command: string;
    operator: ";" | "&&" | null;
  }[] {
    const result: {
      command: string;
      operator: ";" | "&&" | null;
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
