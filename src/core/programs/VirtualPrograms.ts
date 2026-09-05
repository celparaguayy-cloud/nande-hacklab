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

    this.registerDefaults();
  }

  private registerDefaults(): void {
    const programs: VirtualProgram[] = [
      {
        name: "ls",
        path: "/bin/ls",
        description: "Lista el contenido de un directorio",
        owner: "root",
        permissions: "755",
      },
      {
        name: "cat",
        path: "/bin/cat",
        description: "Muestra el contenido de un archivo",
        owner: "root",
        permissions: "755",
      },
      {
        name: "echo",
        path: "/bin/echo",
        description: "Muestra texto",
        owner: "root",
        permissions: "755",
      },
      {
        name: "pwd",
        path: "/bin/pwd",
        description: "Muestra el directorio actual",
        owner: "root",
        permissions: "755",
      },
      {
        name: "mkdir",
        path: "/bin/mkdir",
        description: "Crea directorios",
        owner: "root",
        permissions: "755",
      },
      {
        name: "touch",
        path: "/bin/touch",
        description: "Crea archivos",
        owner: "root",
        permissions: "755",
      },
      {
        name: "rm",
        path: "/bin/rm",
        description: "Elimina archivos o directorios",
        owner: "root",
        permissions: "755",
      },
      {
        name: "chmod",
        path: "/bin/chmod",
        description: "Cambia permisos",
        owner: "root",
        permissions: "755",
      },
      {
        name: "chown",
        path: "/bin/chown",
        description: "Cambia propietario",
        owner: "root",
        permissions: "755",
      },
      {
        name: "ps",
        path: "/bin/ps",
        description: "Muestra procesos virtuales",
        owner: "root",
        permissions: "755",
      },
      {
        name: "whoami",
        path: "/usr/bin/whoami",
        description: "Muestra el usuario actual",
        owner: "root",
        permissions: "755",
      },
      {
        name: "id",
        path: "/usr/bin/id",
        description: "Muestra información del usuario",
        owner: "root",
        permissions: "755",
      },
      {
        name: "hostname",
        path: "/bin/hostname",
        description: "Muestra el nombre del equipo",
        owner: "root",
        permissions: "755",
      },
      {
        name: "uname",
        path: "/bin/uname",
        description: "Muestra información del sistema",
        owner: "root",
        permissions: "755",
      },
    ];

    for (const program of programs) {
      this.register(program);
    }
  }

  register(program: VirtualProgram): void {
    this.programs.set(program.name, structuredClone(program));
  }

  get(name: string): VirtualProgram | undefined {
    const program = this.programs.get(name);

    return program ? structuredClone(program) : undefined;
  }

  exists(name: string): boolean {
    return this.programs.has(name);
  }

  all(): VirtualProgram[] {
    return Array.from(this.programs.values()).map((program) =>
      structuredClone(program),
    );
  }

  resolve(name: string): VirtualProgram | undefined {
    return this.get(name);
  }
}
