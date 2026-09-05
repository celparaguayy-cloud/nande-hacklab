export interface VirtualProgram {
  name: string;
  path: string;
  description: string;
  owner: string;
  permissions: string;
}

export class VirtualPrograms {
  private programs: Map<string, VirtualProgram>;

  constructor() {
    this.programs = new Map();

    this.register({
      name: "ls",
      path: "/bin/ls",
      description: "Lista el contenido de un directorio",
      owner: "root",
      permissions: "755",
    });

    this.register({
      name: "cat",
      path: "/bin/cat",
      description: "Muestra el contenido de un archivo",
      owner: "root",
      permissions: "755",
    });

    this.register({
      name: "echo",
      path: "/bin/echo",
      description: "Muestra texto",
      owner: "root",
      permissions: "755",
    });

    this.register({
      name: "pwd",
      path: "/bin/pwd",
      description: "Muestra el directorio actual",
      owner: "root",
      permissions: "755",
    });

    this.register({
      name: "whoami",
      path: "/usr/bin/whoami",
      description: "Muestra el usuario actual",
      owner: "root",
      permissions: "755",
    });

    this.register({
      name: "id",
      path: "/usr/bin/id",
      description: "Muestra información del usuario",
      owner: "root",
      permissions: "755",
    });
  }

  register(program: VirtualProgram): void {
    this.programs.set(program.name, program);
  }

  get(name: string): VirtualProgram | undefined {
    return this.programs.get(name);
  }

  exists(name: string): boolean {
    return this.programs.has(name);
  }

  all(): VirtualProgram[] {
    return Array.from(this.programs.values());
  }
}
