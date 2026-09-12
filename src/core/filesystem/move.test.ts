import { beforeEach, describe, expect, it } from "vitest";
import { VirtualFilesystem } from "./VirtualFilesystem";
import { resetStorage } from "../../test/setup";

describe("VirtualFilesystem — mover y renombrar", () => {
  let fs: VirtualFilesystem;

  beforeEach(() => {
    resetStorage();
    fs = new VirtualFilesystem();
  });

  it("renombra un archivo conservando su contenido", () => {
    fs.createFile("/home/student/a.txt", "hola");
    fs.rename("/home/student/a.txt", "b.txt");
    expect(fs.exists("/home/student/a.txt")).toBe(false);
    expect(fs.exists("/home/student/b.txt")).toBe(true);
    expect(fs.readFile("/home/student/b.txt")).toBe("hola");
  });

  it("mover un directorio arrastra a sus hijos", () => {
    fs.createDirectory("/home/student/proyecto");
    fs.createFile("/home/student/proyecto/main.js", "x=1");
    fs.move("/home/student/proyecto", "/home/student/tool");

    expect(fs.exists("/home/student/proyecto")).toBe(false);
    expect(fs.exists("/home/student/tool")).toBe(true);
    expect(fs.readFile("/home/student/tool/main.js")).toBe("x=1");
  });

  it("no permite mover a un destino ocupado ni dentro de sí mismo", () => {
    fs.createDirectory("/home/student/d1");
    fs.createDirectory("/home/student/d2");
    expect(() => fs.move("/home/student/d1", "/home/student/d2")).toThrow();
    expect(() => fs.move("/home/student/d1", "/home/student/d1/sub")).toThrow();
  });
});
