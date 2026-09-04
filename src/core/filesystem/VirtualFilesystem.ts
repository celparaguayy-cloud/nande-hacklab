export type FileType = "file" | "directory";

export interface VirtualFile {
  path: string;
  type: FileType;
  content: string;
  permissions: string;
  owner: string;
  group: string;
}

export class VirtualFilesystem {
  private files: Map<string, VirtualFile>;

  constructor() {
    this.files = new Map();

    this.createDirectory("/", "root", "root", "755");

    this.createDirectory("/bin", "root", "root", "755");
    this.createDirectory("/dev", "root", "root", "755");
    this.createDirectory("/etc", "root", "root", "755");

    this.createDirectory("/home", "root", "root", "755");
    this.createDirectory("/home/student", "student", "users", "755");

    this.createDirectory("/root", "root", "root", "700");

    this.createDirectory("/tmp", "root", "root", "1777");

    this.createDirectory("/usr", "root", "root", "755");
    this.createDirectory("/usr/bin", "root", "root", "755");
    this.createDirectory("/usr/lib", "root", "root", "755");

    this.createDirectory("/var", "root", "root", "755");
    this.createDirectory("/var/log", "root", "root", "755");
    this.createDirectory("/var/tmp", "root", "root", "1777");

    this.createFile(
      "/etc/motd",
      "Bienvenido a ÑANDE OS.",
      "root",
      "root",
      "644",
    );
  }

  exists(path: string): boolean {
    return this.files.has(path);
  }

  createDirectory(
    path: string,
    owner = "student",
    group = "users",
    permissions = "755",
  ): void {
    if (this.exists(path)) {
      throw new Error(`El directorio ya existe: ${path}`);
    }

    if (!/^[0-7]{3,4}$/.test(permissions)) {
      throw new Error(`Permisos inválidos: ${permissions}`);
    }

    this.files.set(path, {
      path,
      type: "directory",
      content: "",
      permissions,
      owner,
      group,
    });
  }

  createFile(
    path: string,
    content = "",
    owner = "student",
    group = "users",
    permissions = "644",
  ): void {
    if (this.exists(path)) {
      throw new Error(`El archivo ya existe: ${path}`);
    }

    if (!/^[0-7]{3,4}$/.test(permissions)) {
      throw new Error(`Permisos inválidos: ${permissions}`);
    }

    this.files.set(path, {
      path,
      type: "file",
      content,
      permissions,
      owner,
      group,
    });
  }

  readFile(path: string): string {
    const file = this.files.get(path);

    if (!file || file.type !== "file") {
      throw new Error(`Archivo no encontrado: ${path}`);
    }

    return file.content;
  }

  writeFile(path: string, content: string): void {
    const file = this.files.get(path);

    if (!file || file.type !== "file") {
      throw new Error(`Archivo no encontrado: ${path}`);
    }

    file.content = content;
  }

  listDirectory(path: string): VirtualFile[] {
    const directory = this.files.get(path);

    if (!directory || directory.type !== "directory") {
      throw new Error(`Directorio no encontrado: ${path}`);
    }

    const prefix = path === "/" ? "/" : `${path}/`;

    return Array.from(this.files.values()).filter((file) => {
      if (file.path === path) {
        return false;
      }

      if (!file.path.startsWith(prefix)) {
        return false;
      }

      const remaining = file.path.slice(prefix.length);

      return !remaining.includes("/");
    });
  }

  remove(path: string): void {
    if (path === "/") {
      throw new Error("No se puede eliminar el directorio raíz");
    }

    if (!this.exists(path)) {
      throw new Error(`No existe: ${path}`);
    }

    const target = this.files.get(path);

    if (target?.type === "directory") {
      const prefix = path === "/" ? "/" : `${path}/`;

      for (const filePath of this.files.keys()) {
        if (filePath.startsWith(prefix)) {
          this.files.delete(filePath);
        }
      }
    }

    this.files.delete(path);
  }

  chmod(path: string, permissions: string): void {
    const file = this.files.get(path);

    if (!file) {
      throw new Error(`No existe: ${path}`);
    }

    if (!/^[0-7]{3,4}$/.test(permissions)) {
      throw new Error(`Permisos inválidos: ${permissions}`);
    }

    file.permissions = permissions;
  }

  chown(path: string, owner: string, group?: string): void {
    const file = this.files.get(path);

    if (!file) {
      throw new Error(`No existe: ${path}`);
    }

    if (!owner) {
      throw new Error("Propietario inválido");
    }

    file.owner = owner;

    if (group !== undefined && group.length > 0) {
      file.group = group;
    }
  }

  canAccess(
    path: string,
    username: string,
    action: "read" | "write" | "execute",
    groups: string[] = [],
  ): boolean {
    const file = this.files.get(path);

    if (!file) {
      return false;
    }

    // root tiene acceso administrativo dentro del sistema virtual.
    if (username === "root") {
      return true;
    }

    const permissions = file.permissions.padStart(3, "0");

    const ownerPermissions = Number(
      permissions[permissions.length - 3],
    );

    const groupPermissions = Number(
      permissions[permissions.length - 2],
    );

    const otherPermissions = Number(
      permissions[permissions.length - 1],
    );

    let permissionValue = otherPermissions;

    if (username === file.owner) {
      permissionValue = ownerPermissions;
    } else if (groups.includes(file.group)) {
      permissionValue = groupPermissions;
    }

    const requiredBit = {
      read: 4,
      write: 2,
      execute: 1,
    }[action];

    return (permissionValue & requiredBit) !== 0;
  }

  getFile(path: string): VirtualFile | undefined {
    return this.files.get(path);
  }
}
