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
          "  ls",
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

  private ls(path: string): string {
    const resolvedPath = this.resolvePath(path);

    return this.kernel.filesystem
      .listDirectory(resolvedPath)
      .map((file) => {
        const suffix = file.type === "directory" ? "/" : "";
        return `${file.permissions} ${file.path.split("/").pop()}${suffix}`;
      })
      .join("\n");
  }

  private resolvePath(path: string): string {
    if (path.startsWith("/")) {
      return path;
    }

    return this.currentDirectory === "/"
      ? `/${path}`
      : `${this.currentDirectory}/${path}`;
  }
}
