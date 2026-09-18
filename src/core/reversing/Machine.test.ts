import { describe, expect, it } from "vitest";
import { Crackme, DATA } from "./Crackme";
import { assemble, disassemble, run } from "./Machine";

/**
 * ÑVM-8 y el crackme — pruebas de REALIDAD. Anti-mock: el desensamblado sale de
 * decodificar los bytes que produjo el ensamblador, el intérprete ejecuta esos
 * mismos bytes, y parchear uno cambia lo que hace el programa. Nada está
 * escrito a mano.
 */
describe("ÑVM-8 — ensamblador, desensamblador e intérprete", () => {
  it("ensambla y desensambla de ida y vuelta (round-trip)", () => {
    const { code, labels } = assemble([
      { label: "arranque" },
      { op: "MOV", args: ["R0", 0x41] },
      { op: "OUT", args: ["R0"] },
      { op: "HALT", args: [] },
    ]);
    expect(code).toEqual([0x01, 0, 0x41, 0x50, 0, 0xf0]);
    const insns = disassemble(code, labels);
    expect(insns.map((i) => i.text)).toEqual(["MOV R0, 0x41", "OUT R0", "HALT"]);
    expect(insns[0].addr).toBe(0);
    expect(insns[1].addr).toBe(3);
  });

  it("ejecuta de verdad: el programa imprime lo que dicen sus bytes", () => {
    const { code } = assemble([
      { op: "MOV", args: ["R0", 0x48] },
      { op: "OUT", args: ["R0"] },
      { op: "MOV", args: ["R0", 0x49] },
      { op: "OUT", args: ["R0"] },
      { op: "HALT", args: [] },
    ]);
    const r = run(code, new Array(256).fill(0));
    expect(r.output).toBe("HI");
    expect(r.stop).toBe("halt");
  });

  it("un bucle real recorre datos con LDX y corta en el 0", () => {
    const data = new Array(256).fill(0);
    "ÑANDE".split("").forEach((c, i) => { data[i] = c.charCodeAt(0) & 0xff; });
    const { code } = assemble([
      { op: "MOV", args: ["R0", 0] },
      { label: "bucle" },
      { op: "LDX", args: ["R2", 0] },
      { op: "CMP", args: ["R2", 0] },
      { op: "JZ", args: ["fin"] },
      { op: "OUT", args: ["R2"] },
      { op: "ADD", args: ["R0", 1] },
      { op: "JMP", args: ["bucle"] },
      { label: "fin" },
      { op: "HALT", args: [] },
    ]);
    expect(run(code, data).output.length).toBe(5);
  });

  it("un bucle infinito para por límite de pasos (no cuelga el juego)", () => {
    const { code } = assemble([{ label: "x" }, { op: "JMP", args: ["x"] }]);
    const r = run(code, new Array(256).fill(0), 500);
    expect(r.stop).toBe("limit");
    expect(r.steps).toBe(500);
  });
});

describe("Crackme — el binario que se revierte", () => {
  it("el desensamblado sale de los bytes: la constante del control está ahí", () => {
    const cm = new Crackme(7);
    const dis = cm.disasm();
    expect(dis).toContain("CMP R1, 0x" + cm.key().toString(16).padStart(2, "0"));
    // Y sale de decodificar: cada línea lleva su dirección y sus bytes.
    expect(dis).toMatch(/^ {2}0000: {2}[0-9a-f]{2}/);
  });

  it("un serial correcto (leído del desensamblado) revela la bandera al EJECUTAR", () => {
    const cm = new Crackme(7);
    const serial = String.fromCharCode(cm.key()); // XOR de un solo byte = la clave
    const r = cm.run(serial);
    expect(r.revealedFlag).toBe(true);
    expect(r.output).toBe(cm.flag);
    expect(cm.isValidSerial(serial)).toBe(true);
  });

  it("un serial incorrecto es rechazado por el programa, no por un if de la UI", () => {
    const cm = new Crackme(7);
    const r = cm.run("nopass");
    expect(r.accepted).toBe(false);
    expect(r.output).toBe("ACCESO DENEGADO");
  });

  it("parchear el salto deja entrar pero NO recupera la bandera", () => {
    const cm = new Crackme(7);
    const jnz = cm.listing().find((i) => i.text.startsWith("JNZ"))!;
    // 0x42 (JNZ) → 0x41 (JZ): el control queda invertido.
    expect(cm.patch(jnz.addr, 0x41).ok).toBe(true);
    expect(cm.patched()).toBe(true);
    expect(cm.listing().find((i) => i.addr === jnz.addr)!.text.startsWith("JZ")).toBe(true);

    const r = cm.run("serial-cualquiera");
    expect(r.accepted).toBe(true);          // pasó el control
    expect(r.revealedFlag).toBe(false);     // pero la bandera sale en basura
    expect(r.output).not.toBe(cm.flag);

    cm.restore();
    expect(cm.patched()).toBe(false);
    expect(cm.run("serial-cualquiera").accepted).toBe(false);
  });

  it("un parche fuera del código se rechaza con motivo", () => {
    const cm = new Crackme(7);
    expect(cm.patch(9999, 0).ok).toBe(false);
    expect(cm.patch(0, 300).message).toContain("byte");
  });

  it("strings encuentra el texto real de los datos y xrefs dice quién lo usa", () => {
    const cm = new Crackme(7);
    const s = cm.strings();
    expect(s.some((x) => x.text.includes("ACCESO DENEGADO"))).toBe(true);

    const refs = cm.xrefs();
    const denied = refs.find((r) => r.kind === "data" && r.to === DATA.denied);
    expect(denied).toBeDefined();
    expect(denied!.from.length).toBeGreaterThan(0);
  });

  it("la bandera NO está en claro dentro del binario (hay que descifrarla)", () => {
    const cm = new Crackme(7);
    expect(cm.hexdumpData()).not.toContain("ND{");
    expect(cm.strings().some((x) => x.text.includes(cm.flag))).toBe(false);
    // …pero con la clave correcta aparece.
    expect(cm.decrypt(cm.key()).text).toBe(cm.flag);
  });
});
