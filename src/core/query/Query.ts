/**
 * Motor de consulta genérico: el mismo parser que usa el filtro de Wireshark
 * (NandeShark) y la barra de búsqueda del SOC. Tokeniza, parsea con precedencia
 * (or < and < not < primario) y evalúa contra cualquier tipo de ítem mediante
 * un "esquema" que dice qué campos existen y cómo leerlos.
 *
 * Soporta: campos con punto, operadores == != > < >= <= contains matches,
 * booleanos and/or/not (y && || !), paréntesis, y términos booleanos sueltos.
 */

export interface QuerySchema<T> {
  /** ¿Existe este campo? (valida al parsear, como Wireshark). */
  isKnownField(field: string): boolean;
  /** Valor del campo para un ítem. `undefined` = ausente en ESTE ítem. */
  value(item: T, field: string): string | number | boolean | undefined;
  /**
   * Para enums ordenados (p.ej. severity: info<low<medium<high<critical):
   * convierte un valor a número para poder comparar con > y <.
   */
  ordinal?(field: string, raw: string | number): number | undefined;
}

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
  eq: "==", ne: "!=", gt: ">", lt: "<", ge: ">=", le: "<=",
  contains: "contains", matches: "matches",
};

export function tokenize(input: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const s = input;
  while (i < s.length) {
    const c = s[i];
    if (c === " " || c === "\t") { i += 1; continue; }
    if (c === "(") { toks.push({ t: "lp" }); i += 1; continue; }
    if (c === ")") { toks.push({ t: "rp" }); i += 1; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1; let str = "";
      while (j < s.length && s[j] !== c) { str += s[j]; j += 1; }
      if (j >= s.length) throw new Error("comillas sin cerrar");
      toks.push({ t: "str", v: str }); i = j + 1; continue;
    }
    const two = s.slice(i, i + 2);
    if (two === "==" || two === "!=" || two === ">=" || two === "<=" || two === "&&" || two === "||") {
      if (two === "&&") toks.push({ t: "and" });
      else if (two === "||") toks.push({ t: "or" });
      else toks.push({ t: "op", v: two });
      i += 2; continue;
    }
    if (c === ">" || c === "<") { toks.push({ t: "op", v: c }); i += 1; continue; }
    if (c === "=") { toks.push({ t: "op", v: "==" }); i += 1; continue; }
    if (c === "!") { toks.push({ t: "not" }); i += 1; continue; }
    if (/[A-Za-z0-9_.:@/-]/.test(c)) {
      let j = i; let word = "";
      while (j < s.length && /[A-Za-z0-9_.:@/-]/.test(s[j])) { word += s[j]; j += 1; }
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

class Parser<T> {
  private pos = 0;
  private toks: Tok[];
  private schema: QuerySchema<T>;
  constructor(toks: Tok[], schema: QuerySchema<T>) {
    this.toks = toks;
    this.schema = schema;
  }
  private peek(): Tok | undefined { return this.toks[this.pos]; }
  private next(): Tok | undefined { return this.toks[this.pos++]; }

  parse(): (item: T) => boolean {
    const node = this.parseOr();
    if (this.pos < this.toks.length) throw new Error("sobra texto en la consulta");
    return node;
  }
  private parseOr(): (item: T) => boolean {
    let left = this.parseAnd();
    while (this.peek()?.t === "or") {
      this.next(); const right = this.parseAnd(); const l = left;
      left = (p) => l(p) || right(p);
    }
    return left;
  }
  private parseAnd(): (item: T) => boolean {
    let left = this.parseNot();
    while (this.peek()?.t === "and") {
      this.next(); const right = this.parseNot(); const l = left;
      left = (p) => l(p) && right(p);
    }
    return left;
  }
  private parseNot(): (item: T) => boolean {
    if (this.peek()?.t === "not") {
      this.next(); const inner = this.parseNot();
      return (p) => !inner(p);
    }
    return this.parsePrimary();
  }
  private parsePrimary(): (item: T) => boolean {
    const tok = this.peek();
    if (!tok) throw new Error("consulta incompleta");
    if (tok.t === "lp") {
      this.next(); const inner = this.parseOr();
      if (this.peek()?.t !== "rp") throw new Error("falta cerrar el paréntesis");
      this.next(); return inner;
    }
    if (tok.t !== "id") throw new Error("se esperaba un campo");
    const field = tok.v;
    if (!this.schema.isKnownField(field)) throw new Error(`campo desconocido: ${field}`);
    this.next();

    const opTok = this.peek();
    if (!opTok || opTok.t !== "op") {
      return (p) => this.schema.value(p, field) === true;
    }
    this.next();
    const valTok = this.next();
    if (!valTok || (valTok.t !== "str" && valTok.t !== "num" && valTok.t !== "id")) {
      throw new Error("se esperaba un valor después del operador");
    }
    const op = opTok.v;
    const raw = valTok.v;
    return (p) => this.compare(this.schema.value(p, field), op, raw, field);
  }

  private compare(
    actual: string | number | boolean | undefined,
    op: string,
    expected: string | number,
    field: string,
  ): boolean {
    // Campo conocido pero ausente en ESTE ítem: no coincide (como Wireshark).
    if (actual === undefined) return false;
    if (op === "contains") {
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    }
    if (op === "matches") {
      try { return new RegExp(String(expected), "i").test(String(actual)); }
      catch { throw new Error("expresión regular inválida"); }
    }
    // Enums ordenados (severity >= high).
    const ordA = this.schema.ordinal?.(field, actual as string | number);
    const ordE = this.schema.ordinal?.(field, expected);
    if (ordA !== undefined && ordE !== undefined) {
      switch (op) {
        case "==": return ordA === ordE;
        case "!=": return ordA !== ordE;
        case ">": return ordA > ordE;
        case "<": return ordA < ordE;
        case ">=": return ordA >= ordE;
        case "<=": return ordA <= ordE;
      }
    }
    const an = typeof actual === "number" ? actual : Number(actual);
    const en = typeof expected === "number" ? expected : Number(expected);
    const numeric = typeof expected === "number" || (!Number.isNaN(an) && !Number.isNaN(en));
    if (numeric && (op === ">" || op === "<" || op === ">=" || op === "<=")) {
      switch (op) {
        case ">": return an > en;
        case "<": return an < en;
        case ">=": return an >= en;
        case "<=": return an <= en;
      }
    }
    const as = String(actual).toLowerCase();
    const es = String(expected).toLowerCase();
    if (op === "==") return numeric ? an === en : as.includes(es) || as === es;
    if (op === "!=") return numeric ? an !== en : !(as.includes(es) || as === es);
    switch (op) {
      case ">": return as > es;
      case "<": return as < es;
      case ">=": return as >= es;
      case "<=": return as <= es;
    }
    throw new Error(`operador no soportado: ${op}`);
  }
}

export interface Compiled<T> {
  ok: boolean;
  error?: string;
  test: (item: T) => boolean;
}

/** Compila una consulta. Nunca tira: informa el error para pintarlo en rojo. */
export function compileQuery<T>(expr: string, schema: QuerySchema<T>): Compiled<T> {
  const trimmed = expr.trim();
  if (!trimmed) return { ok: true, test: () => true };
  try {
    const node = new Parser<T>(tokenize(trimmed), schema).parse();
    return { ok: true, test: node };
  } catch (e) {
    return { ok: false, error: (e as Error).message, test: () => true };
  }
}

/** Filtra una lista. Sintaxis inválida → lista vacía. */
export function runQuery<T>(items: T[], expr: string, schema: QuerySchema<T>): T[] {
  const c = compileQuery(expr, schema);
  if (!c.ok) return [];
  try { return items.filter((i) => c.test(i)); } catch { return []; }
}
