import { VirtualKernel } from "../VirtualKernel";

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

    const [command, ...args] = input.split(/\s+/);

    switch (command) {
      case "pwd":
        return this.currentDirectory;

      case "whoami":
        return this.currentUser;

      case "hostname":
        return this.kernel.os.getState().hostname;

      case "uname":
        return this.kernel.os.getState().kernel;

      case "cd":
        return this.cd(args[0] ?? "/home/student");

      case "ls":
        return this.ls(args[0] ?? this.currentDirectory);

      case "cat":
        if (!args[0]) {
          return "cat: falta el nombre del archivo";
        }

        return this.kernel.filesystem.readFile(
          this.resolvePath(args[0]),
        );

      case "mkdir":
        if (!args[0]) {
          return "mkdir: falta el nombre del directorio";
        }

        this.kernel.filesystem.createDirectory(
          this.resolvePath(args[0]),
        );

        return "";

      case "touch":
        if (!args[0]) {
          return "touch: falta el nombre del archivo";
        }

        this.kernel.filesystem.createFile(
          this.resolvePath(args[0]),
        );

        return "";

      case "ps":
        return this.kernel.processes
          .getAllProcesses()
          .map(
            (process) =>
              `${process.pid}\t${process.status}\t${process.owner}\t${process.name}`,
          )
          .join("\n");

      case "clear":
        return "\x1b[CLEAR";

      case "help":
        return [
          "Comandos disponibles:",
          "  pwd",
          "  whoami",
          "  hostname",
          "  uname",
          "  cd <directorio>",
          "  ls [directorio]",
          "  cat <archivo>",
          "  mkdir <directorio>",
          "  touch <archivo>",
          "  ps",
          "  clear",
          "  help",
        ].join("\n");

      default:
        return `${command}: comando no encontrado`;
    }
  }

  private cd(path: string): string {
    const resolvedPath = this.resolvePath(path);

    const target = this.kernel.filesystem.getFile(
      resolvedPath,
    );

    if (!target) {
      return `cd: no existe el directorio: ${path}`;
    }

    if (target.type !== "directory") {
      return `cd: no es un directorio: ${path}`;
    }

    this.currentDirectory = resolvedPath;

    return "";
  }

  private ls(path: string): string {
    const resolvedPath = this.resolvePath(path);

    return this.kernel.filesystem
      .listDirectory(resolvedPath)
      .map((file) => {
        const suffix =
          file.type === "directory" ? "/" : "";

        const name =
          file.path.split("/").pop() || "/";

        return `${file.permissions} ${name}${suffix}`;
      })
      .join("\n");
  }

  private resolvePath(path: string): string {
    if (path.startsWith("/")) {
      return this.normalizePath(path);
    }

    return this.normalizePath(
      this.currentDirectory === "/"
        ? `/${path}`
        : `${this.currentDirectory}/${path}`,
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
        continue;
      }

      result.push(part);
    }

    return "/" + result.join("/");
  }
}
