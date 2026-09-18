/**
 * ÑVM-8 — una máquina de verdad, chiquita.
 *
 * NandeReverse no puede enseñar ingeniería inversa con un "desensamblado" de
 * mentira: revertir es leer BYTES, entender qué hace la CPU con ellos, y
 * cambiarlos. Así que acá hay una máquina real, con su juego de instrucciones,
 * su codificación binaria, su ensamblador, su desensamblador y su intérprete.
 *
 * El binario que ve el jugador son los bytes que este ensamblador produjo, el
 * desensamblado sale de decodificar ESOS bytes (barrido lineal, como radare2 o
 * Ghidra), y al ejecutar corre esa misma memoria. Si el jugador parchea un
 * byte, el desensamblado cambia y el programa se comporta distinto — porque es
 * el mismo programa.
 *
 * Registros: R0..R3 (8 bits). Bandera: ZF. Datos: 256 bytes.
 * R0 hace de índice para las cargas indexadas (LDX), que es lo que permite
 * escribir bucles sobre cadenas.
 */

export const REGS = ["R0", "R1", "R2", "R3"] as const;
export type RegName = (typeof REGS)[number];

/** Forma de los operandos de cada instrucción (define también su tamaño). */
type Form = "none" | "reg" | "addr" | "reg_imm" | "reg_reg" | "reg_addr" | "addr_reg";

interface OpDef {
  op: number;
  name: string;
  form: Form;
  /** Comentario didáctico que acompaña al desensamblado. */
  note: string;
}

const OPS: OpDef[] = [
  { op: 0x00, name: "NOP", form: "none", note: "no hace nada" },
  { op: 0x01, name: "MOV", form: "reg_imm", note: "carga un número en el registro" },
  { op: 0x02, name: "MOV", form: "reg_reg", note: "copia un registro en otro" },
  { op: 0x10, name: "LDX", form: "reg_addr", note: "lee datos[base + R0]" },
  { op: 0x11, name: "ST", form: "addr_reg", note: "escribe datos[dir] = registro" },
  { op: 0x20, name: "XOR", form: "reg_reg", note: "XOR entre registros" },
  { op: 0x21, name: "ADD", form: "reg_imm", note: "suma" },
  { op: 0x22, name: "SUB", form: "reg_imm", note: "resta" },
  { op: 0x30, name: "CMP", form: "reg_imm", note: "compara con un número y prende ZF si son iguales" },
  { op: 0x31, name: "CMP", form: "reg_reg", note: "compara dos registros" },
  { op: 0x40, name: "JMP", form: "addr", note: "salta siempre" },
  { op: 0x41, name: "JZ", form: "addr", note: "salta si ZF (si fueron iguales)" },
  { op: 0x42, name: "JNZ", form: "addr", note: "salta si NO ZF (si fueron distintos)" },
  { op: 0x50, name: "OUT", form: "reg", note: "imprime el byte como carácter" },
  { op: 0xf0, name: "HALT", form: "none", note: "termina" },
];

const BY_OP = new Map(OPS.map((d) => [d.op, d]));
const SIZE: Record<Form, number> = { none: 1, reg: 2, addr: 2, reg_imm: 3, reg_reg: 3, reg_addr: 3, addr_reg: 3 };

/* ------------------------------------------------------------ ensamblador */

/** Una línea de ensamblador: etiqueta, o instrucción con sus operandos. */
export type AsmLine =
  | { label: string }
  | { op: string; args: (string | number)[]; comment?: string };

function regIndex(r: string): number {
  const i = REGS.indexOf(r.toUpperCase() as RegName);
  if (i < 0) throw new Error(`registro desconocido: ${r}`);
  return i;
}

function findOp(name: string, args: (string | number)[]): OpDef {
  const up = name.toUpperCase();
  const isReg = (v: string | number) => typeof v === "string" && REGS.includes(v.toUpperCase() as RegName);
  for (const d of OPS) {
    if (d.name !== up) continue;
    const f = d.form;
    if (f === "none" && args.length === 0) return d;
    if (f === "reg" && args.length === 1 && isReg(args[0])) return d;
    if (f === "addr" && args.length === 1 && !isReg(args[0])) return d;
    if (args.length !== 2) continue;
    if (f === "reg_reg" && isReg(args[0]) && isReg(args[1])) return d;
    if (f === "reg_imm" && isReg(args[0]) && !isReg(args[1])) return d;
    if (f === "reg_addr" && isReg(args[0]) && !isReg(args[1])) return d;
    if (f === "addr_reg" && !isReg(args[0]) && isReg(args[1])) return d;
  }
  throw new Error(`instrucción desconocida: ${name} ${args.join(", ")}`);
}

/**
 * Ensambla a bytes en dos pasadas (la primera mide y ubica las etiquetas, la
 * segunda resuelve los saltos). Es el mismo procedimiento que un ensamblador
 * de verdad.
 */
export function assemble(lines: AsmLine[]): { code: number[]; labels: Map<string, number> } {
  const labels = new Map<string, number>();
  let pc = 0;
  for (const l of lines) {
    if ("label" in l) { labels.set(l.label, pc); continue; }
    pc += SIZE[findOp(l.op, l.args).form];
  }
  const code: number[] = [];
  for (const l of lines) {
    if ("label" in l) continue;
    const d = findOp(l.op, l.args);
    const val = (a: string | number): number => {
      if (typeof a === "number") return a & 0xff;
      const lbl = labels.get(a);
      if (lbl === undefined) throw new Error(`etiqueta desconocida: ${a}`);
      return lbl & 0xff;
    };
    code.push(d.op);
    switch (d.form) {
      case "none": break;
      case "reg": code.push(regIndex(l.args[0] as string)); break;
      case "addr": code.push(val(l.args[0])); break;
      case "reg_imm":
      case "reg_addr": code.push(regIndex(l.args[0] as string), val(l.args[1])); break;
      case "reg_reg": code.push(regIndex(l.args[0] as string), regIndex(l.args[1] as string)); break;
      case "addr_reg": code.push(val(l.args[0]), regIndex(l.args[1] as string)); break;
    }
  }
  return { code, labels };
}

/* ---------------------------------------------------------- desensamblador */

export interface Insn {
  /** Dirección de la instrucción dentro del código. */
  addr: number;
  /** Los bytes crudos que la forman (lo que el jugador puede parchear). */
  bytes: number[];
  /** Texto de la instrucción, ya legible. */
  text: string;
  /** Qué hace, en criollo. */
  note: string;
  /** Si es un salto, a dónde va (para las referencias cruzadas). */
  target?: number;
  /** Si toca datos, a qué dirección de datos (para las referencias cruzadas). */
  dataRef?: number;
}

/**
 * Barrido lineal: decodifica desde el principio, instrucción por instrucción.
 * Un byte que no es una instrucción válida se muestra como `.byte`, igual que
 * en un desensamblador de verdad cuando pierde el paso.
 */
export function disassemble(code: number[], labels?: Map<string, number>): Insn[] {
  const nameAt = new Map<number, string>();
  if (labels) for (const [n, a] of labels) if (!nameAt.has(a)) nameAt.set(a, n);
  const out: Insn[] = [];
  let pc = 0;
  while (pc < code.length) {
    const d = BY_OP.get(code[pc]);
    if (!d) {
      out.push({ addr: pc, bytes: [code[pc]], text: `.byte 0x${hex(code[pc])}`, note: "byte suelto (no es una instrucción)" });
      pc += 1;
      continue;
    }
    const size = SIZE[d.form];
    const bytes = code.slice(pc, pc + size);
    if (bytes.length < size) {
      out.push({ addr: pc, bytes, text: `.byte 0x${hex(code[pc])}`, note: "instrucción cortada al final del código" });
      break;
    }
    const a = bytes[1];
    const b = bytes[2];
    const lbl = (v: number) => nameAt.get(v) ?? `0x${hex(v)}`;
    let text = d.name;
    let target: number | undefined;
    let dataRef: number | undefined;
    switch (d.form) {
      case "none": break;
      case "reg": text += ` ${REGS[a & 3]}`; break;
      case "addr": text += ` ${lbl(a)}`; target = a; break;
      case "reg_imm": text += ` ${REGS[a & 3]}, 0x${hex(b)}`; break;
      case "reg_reg": text += ` ${REGS[a & 3]}, ${REGS[b & 3]}`; break;
      case "reg_addr": text += ` ${REGS[a & 3]}, [datos+0x${hex(b)}+R0]`; dataRef = b; break;
      case "addr_reg": text += ` [datos+0x${hex(a)}], ${REGS[b & 3]}`; dataRef = a; break;
    }
    out.push({ addr: pc, bytes, text, note: d.note, target, dataRef });
    pc += size;
  }
  return out;
}

export function hex(n: number, w = 2): string {
  return (n & 0xffff).toString(16).padStart(w, "0");
}

/* -------------------------------------------------------------- intérprete */

export interface RunResult {
  /** Lo que el programa imprimió con OUT. */
  output: string;
  /** Registros al terminar (R1 suele ser la clave deducida). */
  regs: number[];
  /** Instrucciones ejecutadas. */
  steps: number;
  /** Por qué paró: HALT, límite de pasos, o byte inválido. */
  stop: "halt" | "limit" | "invalid";
  /** Direcciones de código realmente ejecutadas, en orden (la traza). */
  trace: number[];
}

/**
 * Ejecuta el código sobre una copia de los datos. Es un intérprete de verdad:
 * si parcheás un byte, acá se nota.
 */
export function run(code: number[], data: number[], maxSteps = 20000): RunResult {
  const mem = [...data];
  const regs = [0, 0, 0, 0];
  let zf = false;
  let pc = 0;
  let out = "";
  let steps = 0;
  const trace: number[] = [];
  while (steps < maxSteps) {
    if (pc < 0 || pc >= code.length) return { output: out, regs, steps, stop: "invalid", trace };
    const d = BY_OP.get(code[pc]);
    if (!d) return { output: out, regs, steps, stop: "invalid", trace };
    if (trace.length < 400) trace.push(pc);
    const a = code[pc + 1] ?? 0;
    const b = code[pc + 2] ?? 0;
    const size = SIZE[d.form];
    steps += 1;
    switch (d.op) {
      case 0x00: break;
      case 0x01: regs[a & 3] = b & 0xff; break;
      case 0x02: regs[a & 3] = regs[b & 3]; break;
      case 0x10: regs[a & 3] = mem[(b + regs[0]) & 0xff] ?? 0; break;
      case 0x11: mem[a & 0xff] = regs[b & 3]; break;
      case 0x20: regs[a & 3] = (regs[a & 3] ^ regs[b & 3]) & 0xff; break;
      case 0x21: regs[a & 3] = (regs[a & 3] + b) & 0xff; break;
      case 0x22: regs[a & 3] = (regs[a & 3] - b) & 0xff; break;
      case 0x30: zf = regs[a & 3] === (b & 0xff); break;
      case 0x31: zf = regs[a & 3] === regs[b & 3]; break;
      case 0x40: pc = a; continue;
      case 0x41: if (zf) { pc = a; continue; } break;
      case 0x42: if (!zf) { pc = a; continue; } break;
      case 0x50: out += String.fromCharCode(regs[a & 3]); break;
      case 0xf0: return { output: out, regs, steps, stop: "halt", trace };
    }
    pc += size;
  }
  return { output: out, regs, steps, stop: "limit", trace };
}

/** Cadenas imprimibles dentro de los datos, con su dirección (el `strings`). */
export function extractStrings(data: number[], min = 3): { addr: number; text: string }[] {
  const found: { addr: number; text: string }[] = [];
  let start = -1;
  let cur = "";
  for (let i = 0; i <= data.length; i += 1) {
    const c = data[i];
    if (c !== undefined && c >= 32 && c < 127) {
      if (start < 0) start = i;
      cur += String.fromCharCode(c);
    } else {
      if (cur.length >= min) found.push({ addr: start, text: cur });
      start = -1;
      cur = "";
    }
  }
  return found;
}

/** Volcado hexadecimal + ASCII, 16 bytes por línea (como cualquier hexeditor). */
export function hexdump(bytes: number[], base = 0): string {
  const lines: string[] = [];
  for (let off = 0; off < bytes.length; off += 16) {
    const chunk = bytes.slice(off, off + 16);
    const cols: string[] = [];
    let ascii = "";
    for (let i = 0; i < 16; i += 1) {
      cols.push(i < chunk.length ? hex(chunk[i]) : "  ");
      if (i === 7) cols.push("");
      const c = chunk[i];
      ascii += c !== undefined && c >= 32 && c < 127 ? String.fromCharCode(c) : c === undefined ? " " : ".";
    }
    lines.push(`${hex(base + off, 4)}  ${cols.join(" ")}  ${ascii}`);
  }
  return lines.join("\n");
}
