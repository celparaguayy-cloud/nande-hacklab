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

    this.createDirectory("/", "root", "root");
    this.createDirectory("/home", "root", "root");
    this.createDirectory("/home/student", "student", "users");
    this.createDirectory("/tmp", "root", "root");
    this.createDirectory("/etc", "root", "root");
  }

  exists(path: string): boolean {
    return this.files.has(path);
  }

  createDirectory(
    path: string,
    owner = "student",
    group = "users",
  ): void {
    if (this.exists(path)) {
      throw new Error(`El directorio ya existe: ${path}`);
    }

    this.files.set(path, {
      path,
      type: "directory",
      content: "",
      permissions: "755",
      owner,
      group,
    });
  }

  createFile(
    path: string,
    content = "",
    owner = "student",
    group = "users",
  ): void {
    if (this.exists(path)) {
      throw new Error(`El archivo ya existe: ${path}`);
    }

    this.files.set(path, {
      path,
      type: "file",
      content,
      permissions: "644",
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
    if (!this.exists(path)) {
      throw new Error(`No existe: ${path}`);
    }

    this.files.delete(path);
  }

  chmod(path: string, permissions: string): void {
    const file = this.files.get(path);

    if (!file) {
      throw new Error(`No existe: ${path}`);
    }

    if (!/^[0-7]{3}$/.test(permissions)) {
      throw new Error(`Permisos inválidos: ${permissions}`);
    }

    file.permissions = permissions;
  }

  chown(path: string, owner: string, group?: string): void {
    const file = this.files.get(path);

    if (!file) {
      throw new Error(`No existe: ${path}`);
    }

    file.owner = owner;

    if (group !== undefined) {
      file.group = group;
    }
  }

  canAccess(
    path: string,
    username: string,
    action: "read" | "write" | "execute",
  ): boolean {
    const file = this.files.get(path);

    if (!file) {
      return false;
    }

    // root tiene acceso administrativo dentro del sistema virtual.
    if (username === "root") {
      return true;
    }

    const permissions = file.permissions;

    const ownerPermissions = Number(permissions[0]);
    const otherPermissions = Number(permissions[2]);

    let permissionValue = otherPermissions;

    if (username === file.owner) {
      permissionValue = ownerPermissions;
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
