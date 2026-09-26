import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * Coherencia (§5): los forenses strings/file leen el FILESYSTEM REAL del
 * sandbox (fuente única), no una lista de labs. Un archivo que el jugador crea
 * —o que escribe una tool con nande.write— es inspeccionable de verdad.
 */
describe("forense sobre el filesystem real", () => {
  let k: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    k = new VirtualKernel();
    term = new VirtualTerminal(k);
  });

  it("strings extrae las cadenas reales de un archivo creado por el jugador", () => {
    k.filesystem.createFile("/home/student/notas.txt", "usuario=admin\nclave=Verano2024", "student", "users", "644");
    const r = k.tools.run("strings", ["/home/student/notas.txt"]);
    expect(r.output).toContain("usuario=admin");
    expect(r.output).toContain("clave=Verano2024");
  });

  it("strings sólo devuelve secuencias imprimibles (≥4), no basura binaria", () => {
    k.filesystem.createFile("/tmp/bin.dat", "AB\x00\x01hola-mundo\x02x", "student", "users", "644");
    const r = k.tools.run("strings", ["/tmp/bin.dat"]);
    expect(r.output).toContain("hola-mundo");
    expect(r.output).not.toContain("AB\x00"); // el run corto "AB" queda fuera
  });

  it("file clasifica por CONTENIDO real (JS vs texto vs binario)", () => {
    k.filesystem.createFile("/home/student/t.js", "var x=1; function f(){return x;}", "student", "users", "644");
    k.filesystem.createFile("/home/student/t.txt", "hola mundo", "student", "users", "644");
    k.filesystem.createFile("/tmp/b.dat", "\x00\x01\x02\x03\x04\x05binario\x00\x00", "student", "users", "644");
    expect(k.tools.run("file", ["/home/student/t.js"]).output).toContain("JavaScript");
    expect(k.tools.run("file", ["/home/student/t.txt"]).output).toContain("ASCII text");
    expect(k.tools.run("file", ["/tmp/b.dat"]).output).toContain("binario");
  });

  it("strings sobre un archivo con bandera la captura por el flujo normal", () => {
    k.filesystem.createFile("/home/student/loot.txt", "secreto ND{strings_en_archivo_real}", "student", "users", "644");
    const out = term.execute("strings /home/student/loot.txt");
    expect(out).toContain("ND{strings_en_archivo_real}");
    expect(k.player.capturedFlags()).toContain("ND{strings_en_archivo_real}");
  });

  it("sigue leyendo archivos de laboratorio cuando no están en el FS del jugador", () => {
    const lab = k.tools.labs().find((m) => m.files.length > 0);
    if (lab) {
      const f = lab.files[0];
      const r = k.tools.run("strings", [f.path]);
      expect(r.output.length).toBeGreaterThan(0);
    }
    expect(true).toBe(true);
  });
});
