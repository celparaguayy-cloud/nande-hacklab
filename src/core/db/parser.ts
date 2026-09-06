import { SqlSyntaxError, tokenize, type Token } from "./tokenizer";

/**
 * Parser de SQL.
 *
 * Cubre el subconjunto que hace falta para que la explotación web sea
 * genuina: SELECT con columnas o expresiones, WHERE con precedencia real
 * de OR/AND/NOT, UNION SELECT (la base de la extracción de datos),
 * ORDER BY (la base de la enumeración de columnas) y LIMIT.
 */

export type Expr =
  | { kind: "literal"; value: string | number | null | boolean }
  | { kind: "column"; table?: string; name: string }
  | { kind: "star" }
  | { kind: "binary"; op: string; left: Expr; right: Expr }
  | { kind: "unary"; op: string; operand: Expr }
  | { kind: "call"; name: string; args: Expr[] };

export interface SelectColumn {
  expr: Expr;
  alias?: string;
}

export interface OrderTerm {
  /** Puede ser un número (ORDER BY 3) o una expresión. */
  expr: Expr;
  direction: "asc" | "desc";
}

export interface SelectStatement {
  kind: "select";
  columns: SelectColumn[];
  from?: string;
  where?: Expr;
  orderBy?: OrderTerm[];
  limit?: number;
  offset?: number;
  /** Consultas encadenadas con UNION. */
  union?: { all: boolean; select: SelectStatement };
}

export type Statement = SelectStatement;

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(sql: string) {
    this.tokens = tokenize(sql);
  }

  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  private next(): Token {
    const token = this.peek();
    if (token.type !== "eof") this.pos += 1;
    return token;
  }

  private isKeyword(word: string, offset = 0): boolean {
    const token = this.peek(offset);
    return (
      token.type === "keyword" && token.value.toLowerCase() === word
    );
  }

  private isPunct(char: string): boolean {
    return this.peek().type === "punct" && this.peek().value === char;
  }

  private expectKeyword(word: string): void {
    if (!this.isKeyword(word)) {
      throw new SqlSyntaxError(
        `se esperaba ${word.toUpperCase()} cerca de "${this.peek().value}"`,
        this.peek().position,
      );
    }
    this.next();
  }

  private expectPunct(char: string): void {
    if (!this.isPunct(char)) {
      throw new SqlSyntaxError(
        `se esperaba "${char}" cerca de "${this.peek().value}"`,
        this.peek().position,
      );
    }
    this.next();
  }

  parseStatement(): Statement {
    const statement = this.parseSelect();

    // Un ";" final o una segunda sentencia se ignoran: los motores que
    // no permiten apilar consultas se comportan igual.
    if (this.isPunct(";")) this.next();

    return statement;
  }

  private parseSelect(): SelectStatement {
    this.expectKeyword("select");

    // DISTINCT / ALL se aceptan y se ignoran: no cambian la explotación.
    if (this.isKeyword("distinct") || this.isKeyword("all")) this.next();

    const columns: SelectColumn[] = [];

    do {
      const expr = this.parseExpression();
      let alias: string | undefined;

      if (this.isKeyword("as")) {
        this.next();
        alias = this.next().value;
      } else if (this.peek().type === "identifier") {
        alias = this.next().value;
      }

      columns.push({ expr, alias });
    } while (this.consumeComma());

    const select: SelectStatement = { kind: "select", columns };

    if (this.isKeyword("from")) {
      this.next();
      select.from = this.next().value;

      // Alias de tabla.
      if (this.peek().type === "identifier" && !this.isKeyword("where")) {
        this.next();
      }
    }

    if (this.isKeyword("where")) {
      this.next();
      select.where = this.parseExpression();
    }

    if (this.isKeyword("order")) {
      this.next();
      this.expectKeyword("by");
      select.orderBy = [];

      do {
        const expr = this.parseExpression();
        let direction: "asc" | "desc" = "asc";

        if (this.isKeyword("asc")) this.next();
        else if (this.isKeyword("desc")) {
          this.next();
          direction = "desc";
        }

        select.orderBy.push({ expr, direction });
      } while (this.consumeComma());
    }

    if (this.isKeyword("limit")) {
      this.next();
      select.limit = Number(this.next().literal ?? 0);

      if (this.isKeyword("offset")) {
        this.next();
        select.offset = Number(this.next().literal ?? 0);
      }
    }

    if (this.isKeyword("union")) {
      this.next();
      let all = false;

      if (this.isKeyword("all")) {
        this.next();
        all = true;
      }

      select.union = { all, select: this.parseSelect() };
    }

    return select;
  }

  private consumeComma(): boolean {
    if (this.isPunct(",")) {
      this.next();
      return true;
    }
    return false;
  }

  /* --------------------------------------------------------------
     Expresiones, de menor a mayor precedencia:
     OR → AND → NOT → comparación → suma → producto → unario → átomo
     -------------------------------------------------------------- */

  parseExpression(): Expr {
    return this.parseOr();
  }

  private parseOr(): Expr {
    let left = this.parseAnd();

    while (this.isKeyword("or")) {
      this.next();
      left = { kind: "binary", op: "or", left, right: this.parseAnd() };
    }

    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseNot();

    while (this.isKeyword("and")) {
      this.next();
      left = { kind: "binary", op: "and", left, right: this.parseNot() };
    }

    return left;
  }

  private parseNot(): Expr {
    if (this.isKeyword("not")) {
      this.next();
      return { kind: "unary", op: "not", operand: this.parseNot() };
    }

    return this.parseComparison();
  }

  private parseComparison(): Expr {
    let left = this.parseAdditive();

    for (;;) {
      const token = this.peek();

      if (
        token.type === "operator" &&
        ["=", "<>", "!=", "<", ">", "<=", ">="].includes(token.value)
      ) {
        this.next();
        left = {
          kind: "binary",
          op: token.value === "!=" ? "<>" : token.value,
          left,
          right: this.parseAdditive(),
        };
        continue;
      }

      if (this.isKeyword("like")) {
        this.next();
        left = {
          kind: "binary",
          op: "like",
          left,
          right: this.parseAdditive(),
        };
        continue;
      }

      // IS NULL / IS NOT NULL
      if (this.isKeyword("is")) {
        this.next();
        let negated = false;

        if (this.isKeyword("not")) {
          this.next();
          negated = true;
        }

        this.expectKeyword("null");

        const test: Expr = {
          kind: "binary",
          op: "is",
          left,
          right: { kind: "literal", value: null },
        };

        left = negated ? { kind: "unary", op: "not", operand: test } : test;
        continue;
      }

      return left;
    }
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();

    for (;;) {
      const token = this.peek();

      if (
        token.type === "operator" &&
        (token.value === "+" || token.value === "-" || token.value === "||")
      ) {
        this.next();
        left = {
          kind: "binary",
          op: token.value,
          left,
          right: this.parseMultiplicative(),
        };
        continue;
      }

      return left;
    }
  }

  private parseMultiplicative(): Expr {
    let left = this.parseUnary();

    for (;;) {
      const token = this.peek();

      if (
        token.type === "operator" &&
        (token.value === "*" || token.value === "/" || token.value === "%")
      ) {
        this.next();
        left = {
          kind: "binary",
          op: token.value,
          left,
          right: this.parseUnary(),
        };
        continue;
      }

      return left;
    }
  }

  private parseUnary(): Expr {
    const token = this.peek();

    if (token.type === "operator" && token.value === "-") {
      this.next();
      return { kind: "unary", op: "-", operand: this.parseUnary() };
    }

    return this.parseAtom();
  }

  private parseAtom(): Expr {
    const token = this.peek();

    if (token.type === "operator" && token.value === "*") {
      this.next();
      return { kind: "star" };
    }

    if (token.type === "number") {
      this.next();
      return { kind: "literal", value: token.literal as number };
    }

    if (token.type === "string") {
      this.next();
      return { kind: "literal", value: token.literal as string };
    }

    if (this.isPunct("(")) {
      this.next();
      const inner = this.parseExpression();
      this.expectPunct(")");
      return inner;
    }

    if (token.type === "keyword") {
      const word = token.value.toLowerCase();

      if (word === "null") {
        this.next();
        return { kind: "literal", value: null };
      }

      if (word === "true" || word === "false") {
        this.next();
        return { kind: "literal", value: word === "true" };
      }

      if (word === "count") {
        this.next();
        this.expectPunct("(");
        const args: Expr[] = [this.parseExpression()];
        this.expectPunct(")");
        return { kind: "call", name: "count", args };
      }
    }

    if (token.type === "identifier") {
      this.next();

      // Llamada a función: nombre(args)
      if (this.isPunct("(")) {
        this.next();
        const args: Expr[] = [];

        if (!this.isPunct(")")) {
          do {
            args.push(this.parseExpression());
          } while (this.consumeComma());
        }

        this.expectPunct(")");
        return { kind: "call", name: token.value.toLowerCase(), args };
      }

      // tabla.columna
      if (this.isPunct(".")) {
        this.next();
        const column = this.next();
        return { kind: "column", table: token.value, name: column.value };
      }

      return { kind: "column", name: token.value };
    }

    throw new SqlSyntaxError(
      `expresión inesperada cerca de "${token.value || "fin de consulta"}"`,
      token.position,
    );
  }
}

export function parse(sql: string): Statement {
  return new Parser(sql).parseStatement();
}
