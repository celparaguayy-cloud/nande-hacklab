export type FileType = "file" | "directory";

export interface VirtualFile {
  path: string;
  type: FileType;
  content: string;
  permissions: string;
}

export class VirtualFilesystem {
  private files: Map<string, VirtualFile>;

  constructor() {
    this.files = new Map();

    this.createDirectory("/");
    this.createDirectory("/home");
    this.createDirectory("/home/student");
    this.createDirectory("/tmp");
    this.createDirectory("/etc");
  }

  exists(path: string): boolean {
    return this.files.has(path);
  }

  createDirectory(path: string): void {
    if (this.exists(path)) {
      throw new Error(`El directorio ya existe: ${path}`);
    }

    this.files.set(path, {
      path,
      type: "directory",
      content: "",
      permissions: "755",
    });
  }

  createFile(path: string, content = ""): void {
    if (this.exists(path)) {
      throw new Error(`El archivo ya existe: ${path}`);
    }

    this.files.set(path, {
      path,
      type: "file",
      content,
      permissions: "644",
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
      if (file.path === path) return false;
      if (!file.path.startsWith(prefix)) return false;

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

    file.permissions = permissions;
  }

  getFile(path: string): VirtualFile | undefined {
    return this.files.get(path);
  }
}
