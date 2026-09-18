import type { Packet } from "./PacketCapture";

/**
 * Motor de "display filters" estilo Wireshark, de verdad — no un `includes`.
 *
 * Soporta el lenguaje real: campos con puntos (http.request.method), operadores
 * (== != > < >= <= contains matches), booleanos (and/or/not, && || !),
 * paréntesis y términos de protocolo sueltos (http, tcp, auth…). Se compila la
 * expresión a una función que evalúa cada paquete capturado. Si la sintaxis está
 * mal, devuelve el error (para pintar la barra en rojo, como Wireshark).
 *
 * Ejemplos reales que funcionan:
 *   http
 *   http.request.method == "POST"
 *   ip.addr == 10.10.0.5 and http
 *   http.response.code >= 400
 *   frame contains "password"
 *   http.host contains "banco" and not auth
 *   frame.len > 200 || nande.leak
 */

const PROTOCOLS = new Set(["http", "tcp", "ssh", "auth", "icmp"]);

/** Campos que el filtro entiende (con alias), para validar en tiempo de parseo. */
const KNOWN_FIELDS = new Set([
  "ip.addr", "ip.src", "ip.dst",
  "http.host", "host",
  "http.request.method", "http.method",
  "http.request.uri", "http.uri", "http.path",
  "http.response.code", "http.status", "status",
  "frame.len", "len", "length",
  "frame", "data", "text",
  "nande.leak", "leak",
]);

function isKnownField(field: string): boolean {
  const f = field.toLowerCase();
  return KNOWN_FIELDS.has(f) || PROTOCOLS.has(f);
}

/** Nombres de campo (con alias) y su lectura desde un paquete. */
function fieldValue(p: Packet, rawField: string): string | number | boolean | undefined {
  const field = rawField.toLowerCase();
  switch (field) {
    case "ip.addr":
      return `${p.src} ${p.dst}`;
    case "ip.src":
      return p.src;
    case "ip.dst":
      return p.dst;
    case "http.host":
    case "host":
      return p.host ?? "";
    case "http.request.method":
    case "http.method":
      return p.method ?? "";
    case "http.request.uri":
    case "http.uri":
    case "http.path":
      return p.path ?? "";
    case "http.response.code":
    case "http.status":
    case "status":
      return p.status;
    case "frame.len":
    case "len":
    case "length":
      return p.length;
    case "frame":
    case "data":
    case "text":
      return `${p.summary} ${p.detail}`;
    case "nande.leak":
    case "leak":
      return Boolean(p.leak);
    default:
      // Un protocolo suelto (http, tcp…) es un término booleano.
      if (PROTOCOLS.has(field)) return p.proto.toLowerCase() === field;
      return undefined;
  }
}

/* --------------------------------------------------------------- tokenizer */

type Tok =
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "str"; v: string }
  | { t: "num"; v: number }
  | { t: "and" }
  | { t: "or" }
  | { t: "not" }
  | { t: "lp" }
  | { t: "rp" };

const WORD_OPS: Record<string, string> = {
  eq: "==",
  ne: "!=",
  gt: ">",
  lt: "<",
  ge: ">=",
  le: "<=",
  contains: "contains",
  matches: "matches",
};

function tokenize(input: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const s = input;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t") {
      i += 1;
      continue;
    }
    if (c === "(") {
      toks.push({ t: "lp" });
      i += 1;
      continue;
    }
    if (c === ")") {
      toks.push({ t: "rp" });
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let str = "";
      while (j < s.length && s[j] !== c) {
        str += s[j];
        j += 1;
      }
      if (j >= s.length) throw new Error("comillas sin cerrar");
      toks.push({ t: "str", v: str });
      i = j + 1;
      continue;
    }
    // Operadores de dos/un carácter.
    const two = s.slice(i, i + 2);
    if (two === "==" || two === "!=" || two === ">=" || two === "<=" || two === "&&" || two === "||") {
      if (two === "&&") toks.push({ t: "and" });
      else if (two === "||") toks.push({ t: "or" });
      else toks.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if (c === ">" || c === "<") {
      toks.push({ t: "op", v: c });
      i += 1;
      continue;
    }
    if (c === "!") {
      toks.push({ t: "not" });
      i += 1;
      continue;
    }
    // Palabra: identificador, número, palabra-operador o booleano.
    if (/[A-Za-z0-9_.:-]/.test(c)) {
      let j = i;
      let word = "";
      while (j < s.length && /[A-Za-z0-9_.:-]/.test(s[j])) {
        word += s[j];
        j += 1;
      }
      i = j;
      const lower = word.toLowerCase();
      if (lower === "and") toks.push({ t: "and" });
      else if (lower === "or") toks.push({ t: "or" });
      else if (lower === "not") toks.push({ t: "not" });
      else if (WORD_OPS[lower]) toks.push({ t: "op", v: WORD_OPS[lower] });
      else if (/^-?\d+(\.\d+)?$/.test(word)) toks.push({ t: "num", v: Number(word) });
      else toks.push({ t: "id", v: word });
      continue;
    }
    throw new Error(`carácter inesperado: "${c}"`);
  }
  return toks;
}

/* ------------------------------------------------------------------ parser */

type Node = (p: Packet) => boolean;

class Parser {
  private pos = 0;
  private toks: Tok[];
  constructor(toks: Tok[]) {
    this.toks = toks;
  }

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }
  private next(): Tok | undefined {
    return this.toks[this.pos++];
  }

  parse(): Node {
    const node = this.parseOr();
    if (this.pos < this.toks.length) throw new Error("sobra texto en el filtro");
    return node;
  }

  private parseOr(): Node {
    let left = this.parseAnd();
    while (this.peek()?.t === "or") {
      this.next();
      const right = this.parseAnd();
      const l = left;
      left = (p) => l(p) || right(p);
    }
    return left;
  }

  private parseAnd(): Node {
    let left = this.parseNot();
    while (this.peek()?.t === "and") {
      this.next();
      const right = this.parseNot();
      const l = left;
      left = (p) => l(p) && right(p);
    }
    return left;
  }

  private parseNot(): Node {
    if (this.peek()?.t === "not") {
      this.next();
      const inner = this.parseNot();
      return (p) => !inner(p);
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const tok = this.peek();
    if (!tok) throw new Error("filtro incompleto");
    if (tok.t === "lp") {
      this.next();
      const inner = this.parseOr();
      if (this.peek()?.t !== "rp") throw new Error("falta cerrar el paréntesis");
      this.next();
      return inner;
    }
    if (tok.t !== "id") throw new Error("se esperaba un campo");
    const field = tok.v;
    if (!isKnownField(field)) throw new Error(`campo desconocido: ${field}`);
    this.next();

    const opTok = this.peek();
    if (!opTok || opTok.t !== "op") {
      // Término booleano suelto: protocolo o nande.leak.
      return (p) => fieldValue(p, field) === true;
    }
    this.next();
    const valTok = this.next();
    if (!valTok || (valTok.t !== "str" && valTok.t !== "num" && valTok.t !== "id")) {
      throw new Error("se esperaba un valor después del operador");
    }
    const op = opTok.v;
    const raw = valTok.t === "num" ? valTok.v : valTok.v;
    return (p) => compare(fieldValue(p, field), op, raw, field);
  }
}

function compare(
  actual: string | number | boolean | undefined,
  op: string,
  expected: string | number,
  _field: string,
): boolean {
  // Campo conocido pero ausente en ESTE paquete (p.ej. status en un TCP): no
  // coincide, igual que en Wireshark. La validación de campos desconocidos ya
  // se hizo al parsear.
  if (actual === undefined) return false;
  if (op === "contains") {
    return String(actual).toLowerCase().includes(String(expected).toLowerCase());
  }
  if (op === "matches") {
    try {
      return new RegExp(String(expected), "i").test(String(actual));
    } catch {
      throw new Error("expresión regular inválida");
    }
  }
  // Comparaciones numéricas si ambos lados son números.
  const an = typeof actual === "number" ? actual : Number(actual);
  const en = typeof expected === "number" ? expected : Number(expected);
  const numeric = typeof expected === "number" || (!Number.isNaN(an) && !Number.isNaN(en));
  if (numeric && (op === ">" || op === "<" || op === ">=" || op === "<=")) {
    switch (op) {
      case ">":
        return an > en;
      case "<":
        return an < en;
      case ">=":
        return an >= en;
      case "<=":
        return an <= en;
    }
  }
  const as = String(actual).toLowerCase();
  const es = String(expected).toLowerCase();
  if (op === "==") return numeric ? an === en : as.includes(es) || as === es;
  if (op === "!=") return numeric ? an !== en : !(as.includes(es) || as === es);
  // > < sobre strings: comparación lexicográfica.
  switch (op) {
    case ">":
      return as > es;
    case "<":
      return as < es;
    case ">=":
      return as >= es;
    case "<=":
      return as <= es;
  }
  throw new Error(`operador no soportado: ${op}`);
}

export interface CompiledFilter {
  ok: boolean;
  error?: string;
  test: (p: Packet) => boolean;
}

/** Compila una expresión de filtro. Nunca tira: informa el error. */
export function compileFilter(expr: string): CompiledFilter {
  const trimmed = expr.trim();
  if (!trimmed) return { ok: true, test: () => true };
  try {
    const node = new Parser(tokenize(trimmed)).parse();
    return { ok: true, test: node };
  } catch (e) {
    return { ok: false, error: (e as Error).message, test: () => true };
  }
}

/** Filtra una lista de paquetes con la expresión. Sintaxis mala → lista vacía. */
export function applyFilter(packets: Packet[], expr: string): Packet[] {
  const c = compileFilter(expr);
  if (!c.ok) return [];
  try {
    return packets.filter((p) => c.test(p));
  } catch {
    return [];
  }
}
