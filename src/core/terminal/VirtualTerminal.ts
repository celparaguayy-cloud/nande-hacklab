import { VirtualKernel } from "../VirtualKernel";

interface ParsedCommand {
  command: string;
  args: string[];
}

interface ChainedCommand {
  command: string;
  operator: ";" | "&&" | null;
}

export class VirtualTerminal {
  private kernel: VirtualKernel;
  private currentUser = "student";
  private currentDirectory = "/home/student";

  constructor(kernel: VirtualKernel) {
    this.kernel = kernel;
  }

  execute(commandLine: string): string {
    const input = commandLine.trim();

    if (!input) {
      return "";
    }

    const chained = this.splitChainedCommands(input);

    if (chained.length > 1) {
      const outputs: string[] = [];
      let previousFailed = false;

      for (const item of chained) {
        if (
          item.operator === "&&" &&
          previousFailed
        ) {
          break;
        }

        const output = this.executeSingle(
          item.command,
        );

        if (output) {
          outputs.push(output);
        }

        previousFailed =
          this.isError(output);
      }

      return outputs.join("\n");
    }

    return this.executeSingle(input);
  }

  getCurrentDirectory(): string {
    return this.currentDirectory;
  }

  getCurrentUser(): string {
    return this.currentUser;
  }

  private executeSingle(
    input: string,
  ): string {
    const parsed =
      this.parseCommand(input);

    if (!parsed.command) {
      return "";
    }

    const { command, args } = parsed;

    switch (command) {
      case "pwd":
        return this.currentDirectory;

      case "whoami":
        return this.currentUser;

      case "id":
        return this.id();

      case "hostname":
        return this.kernel.os.getState().hostname;

      case "uname":
        return this.kernel.os.getState().kernel;

      case "cd":
        return this.cd(args[0] ?? "~");

      case "ls":
        return this.ls(
          args[0] ?? this.currentDirectory,
        );

      case "cat":
        return this.cat(args[0]);

      case "echo":
        return args.join(" ");

      case "mkdir":
        return this.mkdir(args);

      case "touch":
        return this.touch(args);

      case "rm":
        return this.rm(args);

      case "ps":
        return this.ps();

      case "clear":
        return "\x1b[CLEAR";

      case "help":
        return this.help();

      default:
        return `${command}: comando no encontrado`;
    }
  }

  private parseCommand(
    input: string,
  ): ParsedCommand {
    const tokens: string[] = [];

    let current = "";
    let quote: "'" | '"' | null = null;

    for (const character of input) {
      if (
        character === "'" ||
        character === '"'
      ) {
        if (quote === null) {
          quote = character;
          continue;
        }

        if (quote === character) {
          quote = null;
          continue;
        }
      }

      if (
        /\s/.test(character) &&
        quote === null
      ) {
        if (current.length > 0) {
          tokens.push(current);
          current = "";
        }

        continue;
      }

      current += character;
    }

    if (current.length > 0) {
      tokens.push(current);
    }

    return {
      command: tokens[0] ?? "",
      args: tokens.slice(1),
    };
  }

  private splitChainedCommands(
    input: string,
  ): ChainedCommand[] {
    const result: ChainedCommand[] = [];

    let current = "";
    let quote: "'" | '"' | null = null;

    let i = 0;

    while (i < input.length) {
      const character = input[i];

      if (
        character === "'" ||
        character === '"'
      ) {
        if (quote === null) {
          quote = character;
        } else if (quote === character) {
          quote = null;
        }

        current += character;
        i++;
        continue;
      }

      if (quote === null) {
        if (
          character === "&" &&
          input[i + 1] === "&"
        ) {
          if (current.trim()) {
            result.push({
              command: current.trim(),
              operator: "&&",
            });
          }

          current = "";
          i += 2;
          continue;
        }

        if (character === ";") {
          if (current.trim()) {
            result.push({
              command: current.trim(),
              operator: ";",
            });
          }

          current = "";
          i++;
          continue;
        }
      }

      current += character;
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

  private isError(output: string): boolean {
    return (
      output.startsWith("cd:") ||
      output.startsWith("ls:") ||
      output.startsWith("cat:") ||
      output.startsWith("mkdir:") ||
      output.startsWith("touch:") ||
      output.startsWith("rm:") ||
      output.includes("comando no encontrado")
    );
  }

  private cd(path: string): string {
    const resolvedPath =
      this.resolvePath(path);

    const target =
      this.kernel.filesystem.getFile(
        resolvedPath,
      );

    if (!target) {
      return `cd: no existe el directorio: ${path}`;
    }

    if (target.type !== "directory") {
      return `cd: no es un directorio: ${path}`;
    }

    this.currentDirectory =
      resolvedPath;

    return "";
  }

  private ls(path: string): string {
    const resolvedPath =
      this.resolvePath(path);

    const target =
      this.kernel.filesystem.getFile(
        resolvedPath,
      );

    if (!target) {
      return `ls: no existe el archivo o directorio: ${path}`;
    }

    if (target.type !== "directory") {
      return `${target.permissions} ${this.getName(
        target.path,
      )}`;
    }

    const entries =
      this.kernel.filesystem.listDirectory(
        resolvedPath,
      );

    if (entries.length === 0) {
      return "";
    }

    return entries
      .map((file) => {
        const suffix =
          file.type === "directory"
            ? "/"
            : "";

        return `${file.permissions} ${this.getName(
          file.path,
        )}${suffix}`;
      })
      .join("\n");
  }

  private cat(path?: string): string {
    if (!path) {
      return "cat: falta el nombre del archivo";
    }

    const resolvedPath =
      this.resolvePath(path);

    const target =
      this.kernel.filesystem.getFile(
        resolvedPath,
      );

    if (!target) {
      return `cat: no existe el archivo: ${path}`;
    }

    if (target.type === "directory") {
      return `cat: ${path}: es un directorio`;
    }

    return this.kernel.filesystem.readFile(
      resolvedPath,
    );
  }

  private mkdir(args: string[]): string {
    if (args.length === 0) {
      return "mkdir: falta el nombre del directorio";
    }

    const recursive =
      args.includes("-p");

    const paths = args.filter(
      (arg) => arg !== "-p",
    );

    if (paths.length === 0) {
      return "mkdir: falta el nombre del directorio";
    }

    for (const path of paths) {
      const resolvedPath =
        this.resolvePath(path);

      if (
        this.kernel.filesystem.exists(
          resolvedPath,
        )
      ) {
        if (recursive) {
          continue;
        }

        return `mkdir: ya existe: ${path}`;
      }

      try {
        if (recursive) {
          this.mkdirRecursive(
            resolvedPath,
          );
        } else {
          this.kernel.filesystem.createDirectory(
            resolvedPath,
          );
        }
      } catch {
        return `mkdir: no se pudo crear: ${path}`;
      }
    }

    return "";
  }

  private mkdirRecursive(
    path: string,
  ): void {
    const parts = path
      .split("/")
      .filter(Boolean);

    let current = "";

    for (const part of parts) {
      current += `/${part}`;

      if (
        !this.kernel.filesystem.exists(
          current,
        )
      ) {
        this.kernel.filesystem.createDirectory(
          current,
        );
      }
    }
  }

  private touch(args: string[]): string {
    if (args.length === 0) {
      return "touch: falta el nombre del archivo";
    }

    for (const path of args) {
      if (path.startsWith("-")) {
        continue;
      }

      const resolvedPath =
        this.resolvePath(path);

      if (
        this.kernel.filesystem.exists(
          resolvedPath,
        )
      ) {
        continue;
      }

      try {
        this.kernel.filesystem.createFile(
          resolvedPath,
        );
      } catch {
        return `touch: no se pudo crear: ${path}`;
      }
    }

    return "";
  }

  private rm(args: string[]): string {
    if (args.length === 0) {
      return "rm: falta el nombre del archivo";
    }

    const recursive =
      args.includes("-r") ||
      args.includes("-rf");

    const force =
      args.includes("-f") ||
      args.includes("-rf");

    const paths = args.filter(
      (arg) =>
        arg !== "-r" &&
        arg !== "-f" &&
        arg !== "-rf",
    );

    if (paths.length === 0) {
      return "rm: falta el nombre del archivo";
    }

    for (const path of paths) {
      const resolvedPath =
        this.resolvePath(path);

      const target =
        this.kernel.filesystem.getFile(
          resolvedPath,
        );

      if (!target) {
        if (force) {
          continue;
        }

        return `rm: no existe: ${path}`;
      }

      if (
        target.type === "directory" &&
        !recursive
      ) {
        return `rm: ${path}: es un directorio`;
      }

      try {
        this.kernel.filesystem.remove(
          resolvedPath,
        );
      } catch {
        return `rm: no se pudo eliminar: ${path}`;
      }
    }

    return "";
  }

  private ps(): string {
    const processes =
      this.kernel.processes.getAllProcesses();

    if (processes.length === 0) {
      return "No hay procesos.";
    }

    return [
      "PID\tSTATUS\tUSER\tNAME",
      ...processes.map(
        (process) =>
          `${process.pid}\t${process.status}\t${process.owner}\t${process.name}`,
      ),
    ].join("\n");
  }

  private id(): string {
    const user =
      this.kernel.users.getUser(
        this.currentUser,
      );

    if (!user) {
      return `uid=?(${this.currentUser})`;
    }

    return `uid=${user.uid}(${user.username}) groups=${user.groups.join(",")}`;
  }

  private help(): string {
    return [
      "ÑANDE OS — Terminal",
      "",
      "Navegación:",
      "  pwd                  Mostrar directorio actual",
      "  cd <ruta>            Cambiar directorio",
      "  cd ~                 Ir al directorio personal",
      "  cd ..                Subir un directorio",
      "  cd .                 Mantener directorio actual",
      "  ls [ruta]            Listar contenido",
      "",
      "Archivos:",
      "  cat <archivo>        Mostrar contenido",
      "  touch <archivo>      Crear archivo",
      "  mkdir <directorio>   Crear directorio",
      "  mkdir -p <ruta>      Crear ruta completa",
      "  rm <ruta>            Eliminar archivo",
      "  rm -r <directorio>   Eliminar directorio",
      "",
      "Sistema:",
      "  whoami               Usuario actual",
      "  id                   Identidad del usuario",
      "  hostname             Nombre del sistema",
      "  uname                Kernel virtual",
      "  ps                   Procesos virtuales",
      "",
      "Utilidades:",
      "  echo <texto>         Mostrar texto",
      "  clear                Limpiar terminal",
      "  help                 Mostrar esta ayuda",
      "",
      "Parser:",
      "  comando1 ; comando2      Ejecutar ambos",
      "  comando1 && comando2     Ejecutar segundo si el primero funciona",
      "  echo \"texto con espacios\"  Usar argumentos con espacios",
    ].join("\n");
  }

  private resolvePath(
    path: string,
  ): string {
    if (path === "~") {
      return "/home/student";
    }

    if (path.startsWith("~/")) {
      return this.normalizePath(
        `/home/student/${path.slice(2)}`,
      );
    }

    if (path.startsWith("/")) {
      return this.normalizePath(path);
    }

    return this.normalizePath(
      this.currentDirectory === "/"
        ? `/${path}`
        : `${this.currentDirectory}/${path}`,
    );
  }

  private normalizePath(
    path: string,
  ): string {
    const parts = path.split("/");
    const result: string[] = [];

    for (const part of parts) {
      if (!part || part === ".") {
        continue;
      }

      if (part === "..") {
        if (result.length > 0) {
          result.pop();
        }

        continue;
      }

      result.push(part);
    }

    return "/" + result.join("/");
  }

  private getName(
    path: string,
  ): string {
    if (path === "/") {
      return "/";
    }

    return (
      path
        .split("/")
        .filter(Boolean)
        .pop() || "/"
    );
  }
}
