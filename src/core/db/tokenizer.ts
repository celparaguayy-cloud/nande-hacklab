/**
 * Tokenizador de SQL.
 *
 * Es la pieza que hace que las inyecciones de ÑANDE sean reales: cuando el
 * texto que escribe el jugador se concatena dentro de una consulta, acá se
 * parte igual que lo haría un motor de verdad. Por eso una comilla suelta
 * rompe la consulta, `--` comenta el resto y `' OR '1'='1` cambia la
 * lógica en lugar de ser una cadena buscada literalmente.
 */

export type TokenType =
  | "number"
  | "string"
  | "identifier"
  | "keyword"
  | "operator"
  | "punct"
  | "eof";

export interface Token {
  type: TokenType;
  /** Texto tal cual apareció (para identificadores y operadores). */
  value: string;
  /** Valor ya interpretado, para números y cadenas. */
  literal?: string | number;
  position: number;
}

export const KEYWORDS = new Set([
  "select",
  "from",
  "where",
  "and",
  "or",
  "not",
  "union",
  "all",
  "order",
  "by",
  "asc",
  "desc",
  "limit",
  "offset",
  "as",
  "null",
  "is",
  "like",
  "in",
  "between",
  "true",
  "false",
  "insert",
  "into",
  "values",
  "update",
  "set",
  "delete",
  "drop",
  "table",
  "join",
  "on",
  "inner",
  "left",
  "count",
  "distinct",
]);

/** Operadores de dos caracteres, probados antes que los de uno. */
const TWO_CHAR_OPERATORS = ["<>", "<=", ">=", "!=", "||"];
const ONE_CHAR_OPERATORS = ["=", "<", ">", "+", "-", "*", "/", "%"];

export class SqlSyntaxError extends Error {
  readonly position: number;

  constructor(message: string, position: number) {
    super(message);
    this.name = "SqlSyntaxError";
    this.position = position;
  }
}

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const push = (
    type: TokenType,
    value: string,
    position: number,
    literal?: string | number,
  ) => {
    tokens.push({ type, value, position, literal });
  };

  while (i < sql.length) {
    const char = sql[i];

    // --- Espacios ---
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    // --- Comentario de línea: -- resto  ó  # resto ---
    if ((char === "-" && sql[i + 1] === "-") || char === "#") {
      while (i < sql.length && sql[i] !== "\n") i += 1;
      continue;
    }

    // --- Comentario de bloque:  /* ... */  ---
    if (char === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }

    // --- Cadena entre comillas simples o dobles ---
    if (char === "'" || char === '"') {
      const quote = char;
      const start = i;
      i += 1;
      let text = "";

      while (i < sql.length) {
        // Comilla escapada al estilo SQL: '' dentro de la cadena.
        if (sql[i] === quote && sql[i + 1] === quote) {
          text += quote;
          i += 2;
          continue;
        }

        // Escape con barra, como en MySQL.
        if (sql[i] === "\\" && i + 1 < sql.length) {
          text += sql[i + 1];
          i += 2;
          continue;
        }

        if (sql[i] === quote) break;

        text += sql[i];
        i += 1;
      }

      if (i >= sql.length) {
        // Cadena sin cerrar: el error clásico que revela una inyección.
        throw new SqlSyntaxError(
          `cadena sin cerrar cerca de la posición ${start}`,
          start,
        );
      }

      i += 1;
      push("string", text, start, text);
      continue;
    }

    // --- Identificador entre acentos graves ---
    if (char === "`") {
      const start = i;
      const end = sql.indexOf("`", i + 1);

      if (end === -1) {
        throw new SqlSyntaxError("identificador sin cerrar", start);
      }

      push("identifier", sql.slice(i + 1, end), start);
      i = end + 1;
      continue;
    }

    // --- Número ---
    if (/[0-9]/.test(char)) {
      const start = i;
      while (i < sql.length && /[0-9.]/.test(sql[i])) i += 1;
      const text = sql.slice(start, i);
      push("number", text, start, Number(text));
      continue;
    }

    // --- Identificador o palabra clave ---
    if (/[A-Za-z_]/.test(char)) {
      const start = i;
      while (i < sql.length && /[A-Za-z0-9_$]/.test(sql[i])) i += 1;
      const text = sql.slice(start, i);

      push(
        KEYWORDS.has(text.toLowerCase()) ? "keyword" : "identifier",
        text,
        start,
      );
      continue;
    }

    // --- Operadores ---
    const two = sql.slice(i, i + 2);

    if (TWO_CHAR_OPERATORS.includes(two)) {
      push("operator", two, i);
      i += 2;
      continue;
    }

    if (ONE_CHAR_OPERATORS.includes(char)) {
      push("operator", char, i);
      i += 1;
      continue;
    }

    if ("(),;.".includes(char)) {
      push("punct", char, i);
      i += 1;
      continue;
    }

    throw new SqlSyntaxError(`carácter inesperado "${char}"`, i);
  }

  push("eof", "", sql.length);

  return tokens;
}
