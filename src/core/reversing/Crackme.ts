/**
 * Crackme — el binario que se revierte, de verdad.
 *
 * No es un acertijo de texto ni un desensamblado inventado: hay un programa
 * REAL, escrito en el ensamblador de la ÑVM-8 (core/reversing/Machine), que se
 * ensambla a bytes. Esos bytes son los que el jugador ve en el hexdump, los que
 * el desensamblador decodifica, los que el intérprete ejecuta y los que se
 * pueden parchear.
 *
 * El programa es el crackme clásico: pide un serial, le hace un XOR acumulado
 * byte a byte y lo compara contra una constante. Si coincide, usa ESE mismo
 * acumulador como clave para descifrar la bandera y la imprime.
 *
 * De ahí salen las tres lecciones de reversing, todas jugables:
 *  1) Leer el desensamblado y encontrar la constante → fabricar un serial
 *     válido (keygen). Es el único camino que revela la bandera.
 *  2) Parchear el salto para saltarse el control → entrás, pero la bandera sale
 *     en basura, porque la clave de descifrado ERA el serial correcto. Parchear
 *     no recupera datos.
 *  3) Fuerza bruta del espacio de claves (256) sobre los bytes cifrados.
 */

import { assemble, disassemble, extractStrings, hexdump, run, type AsmLine, type Insn, type RunResult } from "./Machine";

export interface XorResult {
  key: number;
  text: string;
  printable: boolean;
  looksLikeFlag: boolean;
}

/** Dónde vive cada cosa dentro de los 256 bytes de datos. */
export const DATA = {
  serial: 0x00,   // 16 bytes: lo que escribe el jugador, terminado en 0
  flagEnc: 0x20,  // la bandera cifrada con XOR
  denied: 0x60,   // el texto del rechazo
} as const;

const DENIED = "ACCESO DENEGADO";

export class Crackme {
  private cipher: number[];
  private realKey: number;
  /** Bytes del código, ya ensamblados. Parchear escribe acá. */
  private code: number[];
  private original: number[];
  private data: number[];
  private labels: Map<string, number>;
  readonly flag: string;
  readonly name: string;

  constructor(seed: number) {
    const tok = (Math.abs(seed * 40503) % 100000).toString().padStart(5, "0");
    this.flag = `ND{reversing_xor_${tok}}`;
    this.name = `crackme_${tok}`;

    // La clave es un byte imprimible (así un serial de un solo carácter puede
    // valer, y además se lee en el desensamblado) que no aparezca en la
    // bandera: si apareciera, ese byte cifrado daría 0 y cortaría la cadena.
    const inFlag = new Set([...this.flag].map((c) => c.charCodeAt(0)));
    let k = 0x21 + (Math.abs(seed * 2654435761) % 0x5d);
    for (let i = 0; i < 0x5e && inFlag.has(k); i += 1) k = 0x21 + ((k - 0x21 + 1) % 0x5d);
    this.realKey = k;
    this.cipher = [...this.flag].map((c) => c.charCodeAt(0) ^ this.realKey);

    const asm = assemble(this.source());
    this.code = asm.code;
    this.original = [...asm.code];
    this.labels = asm.labels;

    this.data = new Array(256).fill(0);
    this.cipher.forEach((b, i) => { this.data[DATA.flagEnc + i] = b; });
    [...DENIED].forEach((c, i) => { this.data[DATA.denied + i] = c.charCodeAt(0); });
  }

  /** El programa, tal cual se ensambla. */
  private source(): AsmLine[] {
    return [
      { label: "inicio" },
      { op: "MOV", args: ["R0", 0] },              // índice
      { op: "MOV", args: ["R1", 0] },              // acumulador
      { label: "suma" },
      { op: "LDX", args: ["R2", DATA.serial] },    // R2 = serial[R0]
      { op: "CMP", args: ["R2", 0] },
      { op: "JZ", args: ["control"] },
      { op: "XOR", args: ["R1", "R2"] },
      { op: "ADD", args: ["R0", 1] },
      { op: "JMP", args: ["suma"] },
      { label: "control" },
      { op: "CMP", args: ["R1", this.realKey] },   // ← la constante delatora
      { op: "JNZ", args: ["rechazo"] },
      { op: "MOV", args: ["R0", 0] },
      { label: "revelar" },
      { op: "LDX", args: ["R2", DATA.flagEnc] },
      { op: "CMP", args: ["R2", 0] },
      { op: "JZ", args: ["fin"] },
      { op: "XOR", args: ["R2", "R1"] },           // descifra con el acumulador
      { op: "OUT", args: ["R2"] },
      { op: "ADD", args: ["R0", 1] },
      { op: "JMP", args: ["revelar"] },
      { label: "rechazo" },
      { op: "MOV", args: ["R0", 0] },
      { label: "negar" },
      { op: "LDX", args: ["R2", DATA.denied] },
      { op: "CMP", args: ["R2", 0] },
      { op: "JZ", args: ["fin"] },
      { op: "OUT", args: ["R2"] },
      { op: "ADD", args: ["R0", 1] },
      { op: "JMP", args: ["negar"] },
      { label: "fin" },
      { op: "HALT", args: [] },
    ];
  }

  /* ------------------------------------------------------------ inspección */

  /** Los bytes del código, como están ahora (con parches incluidos). */
  codeBytes(): number[] { return [...this.code]; }
  dataBytes(): number[] { return [...this.data]; }
  key(): number { return this.realKey; }

  /** Hexdump del código: los bytes REALES del programa. */
  hexdump(): string { return hexdump(this.code); }

  /** Hexdump de la sección de datos (ahí vive la bandera cifrada). */
  hexdumpData(): string { return hexdump(this.data); }

  /** Desensamblado real de los bytes actuales (barrido lineal). */
  listing(): Insn[] { return disassemble(this.code, this.labels); }

  /** Desensamblado como texto, con direcciones y bytes, estilo objdump. */
  disasm(): string {
    return this.listing()
      .map((i) => {
        const bytes = i.bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
        return `  ${i.addr.toString(16).padStart(4, "0")}:  ${bytes.padEnd(9)}  ${i.text}`;
      })
      .join("\n");
  }

  /** Cadenas legibles dentro de los datos (el clásico `strings`). */
  strings(): { addr: number; text: string }[] { return extractStrings(this.data); }

  /**
   * Referencias cruzadas: qué instrucciones apuntan a una dirección. Es lo
   * primero que se busca en Ghidra para entender quién usa qué.
   */
  xrefs(): { to: number; kind: "code" | "data"; from: number[] }[] {
    const code = new Map<number, number[]>();
    const data = new Map<number, number[]>();
    for (const i of this.listing()) {
      if (i.target !== undefined) code.set(i.target, [...(code.get(i.target) ?? []), i.addr]);
      if (i.dataRef !== undefined) data.set(i.dataRef, [...(data.get(i.dataRef) ?? []), i.addr]);
    }
    return [
      ...[...code.entries()].map(([to, from]) => ({ to, kind: "code" as const, from })),
      ...[...data.entries()].map(([to, from]) => ({ to, kind: "data" as const, from })),
    ].sort((a, b) => a.to - b.to);
  }

  /* -------------------------------------------------------------- ejecutar */

  /** Corre el binario con el serial que escribió el jugador. */
  run(serial: string): RunResult & { accepted: boolean; revealedFlag: boolean } {
    const mem = [...this.data];
    for (let i = 0; i < 16; i += 1) {
      mem[DATA.serial + i] = i < serial.length ? serial.charCodeAt(i) & 0xff : 0;
    }
    const r = run(this.code, mem);
    return { ...r, accepted: !r.output.startsWith(DENIED), revealedFlag: r.output === this.flag };
  }

  /* -------------------------------------------------------------- parcheo */

  /** Escribe un byte del código, como en un editor hexadecimal. */
  patch(offset: number, value: number): { ok: boolean; message: string } {
    if (!Number.isInteger(offset) || offset < 0 || offset >= this.code.length) {
      return { ok: false, message: `Offset fuera del código (0x0000..0x${(this.code.length - 1).toString(16)}).` };
    }
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return { ok: false, message: "El valor tiene que ser un byte (0..255)." };
    }
    const before = this.code[offset];
    this.code[offset] = value;
    return {
      ok: true,
      message: `0x${offset.toString(16).padStart(4, "0")}: 0x${before.toString(16).padStart(2, "0")} → 0x${value.toString(16).padStart(2, "0")}`,
    };
  }

  /** ¿Está parcheado respecto del binario original? */
  patched(): boolean { return this.code.some((b, i) => b !== this.original[i]); }

  /** Vuelve al binario original. */
  restore(): void { this.code = [...this.original]; }

  /* --------------------------------------------- criptoanálisis del cifrado */

  /** Aplica un XOR con la clave dada sobre los bytes cifrados. */
  decrypt(key: number): XorResult {
    const bytes = this.cipher.map((b) => b ^ (key & 0xff));
    const text = bytes.map((b) => String.fromCharCode(b)).join("");
    const printable = bytes.every((b) => b >= 32 && b < 127);
    const looksLikeFlag = /^ND\{[\x20-\x7e]+\}$/.test(text);
    return { key: key & 0xff, text, printable, looksLikeFlag };
  }

  /**
   * Fuerza bruta del espacio de claves (256): devuelve las que producen texto
   * con pinta de bandera. Es LA técnica cuando el cifrado es XOR de un byte.
   */
  bruteforce(): XorResult[] {
    const hits: XorResult[] = [];
    for (let k = 1; k <= 255; k += 1) {
      const r = this.decrypt(k);
      if (r.looksLikeFlag) hits.push(r);
    }
    return hits;
  }

  /** ¿Esta clave revela la bandera? (validación real). */
  isSolution(key: number): boolean { return this.decrypt(key).text === this.flag; }

  /** ¿Este serial pasa el control del binario? (lo ejecuta de verdad). */
  isValidSerial(serial: string): boolean { return this.run(serial).revealedFlag; }
}
