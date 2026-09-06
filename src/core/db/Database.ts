import { parse, type Expr, type SelectStatement } from "./parser";
import { SqlSyntaxError } from "./tokenizer";

/**
 * Base de datos en memoria de ÑANDE.
 *
 * Ejecuta de verdad las consultas que arman las webs vulnerables del
 * mundo. No hay respuestas guionadas: si el jugador logra que la consulta
 * devuelva filas, entra; si arma un UNION con el número correcto de
 * columnas, se lleva los datos de la otra tabla. Eso es lo que convierte
 * el ejercicio en aprendizaje real.
 */

export type SqlValue = string | number | boolean | null;

export interface Table {
  name: string;
  columns: string[];
  rows: SqlValue[][];
}

export interface QueryResult {
  columns: string[];
  rows: SqlValue[][];
}

export class SqlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SqlError";
  }
}

/** Convierte un valor a booleano con las reglas laxas de SQL. */
function truthy(value: SqlValue): boolean {
  if (value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  // Una cadena numérica vale por su número; el resto es falso.
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber !== 0 : false;
}

/** Comparación laxa, como la de MySQL: '1' = 1 es verdadero. */
function looseEquals(a: SqlValue, b: SqlValue): boolean {
  if (a === null || b === null) return false;
  if (typeof a === typeof b) return a === b;

  if (typeof a === "number" || typeof b === "number") {
    return Number(a) === Number(b);
  }

  return String(a) === String(b);
}

function compare(a: SqlValue, b: SqlValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;

  const na = Number(a);
  const nb = Number(b);

  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;

  return String(a).localeCompare(String(b));
}

/** Traduce el patrón de LIKE (% y _) a una expresión regular. */
function likeToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/%/g, ".*").replace(/_/g, ".")}$`, "i");
}

interface Row {
  columns: string[];
  values: SqlValue[];
  table?: string;
}

export class Database {
  private tables = new Map<string, Table>();

  createTable(name: string, columns: string[], rows: SqlValue[][] = []): void {
    this.tables.set(name.toLowerCase(), { name, columns, rows });
  }

  getTable(name: string): Table | undefined {
    return this.tables.get(name.toLowerCase());
  }

  tableNames(): string[] {
    return [...this.tables.values()].map((t) => t.name);
  }

  insert(tableName: string, values: SqlValue[]): void {
    const table = this.getTable(tableName);

    if (!table) throw new SqlError(`no existe la tabla '${tableName}'`);

    table.rows.push(values);
  }

  /**
   * Ejecuta una consulta.
   *
   * Los errores salen con el mismo tono que los de un motor real, porque
   * enseñar inyección basada en errores necesita que el error diga algo.
   */
  query(sql: string): QueryResult {
    let statement;

    try {
      statement = parse(sql);
    } catch (error) {
      if (error instanceof SqlSyntaxError) {
        throw new SqlError(
          `Error de sintaxis SQL: ${error.message}`,
        );
      }
      throw error;
    }

    return this.runSelect(statement);
  }

  private runSelect(select: SelectStatement): QueryResult {
    const base = this.runSingleSelect(select);

    if (!select.union) return base;

    const other = this.runSelect(select.union.select);

    if (other.columns.length !== base.columns.length) {
      // El error que guía la enumeración de columnas.
      throw new SqlError(
        "Las consultas de un UNION deben tener el mismo número de columnas",
      );
    }

    const rows = [...base.rows, ...other.rows];

    return {
      columns: base.columns,
      rows: select.union.all ? rows : dedupe(rows),
    };
  }

  private runSingleSelect(select: SelectStatement): QueryResult {
    let sourceRows: Row[];
    let tableColumns: string[] = [];

    if (select.from) {
      const table = this.getTable(select.from);

      if (!table) {
        throw new SqlError(`no existe la tabla '${select.from}'`);
      }

      tableColumns = table.columns;
      sourceRows = table.rows.map((values) => ({
        columns: table.columns,
        values,
        table: table.name,
      }));
    } else {
      // SELECT sin FROM: una única fila vacía, como en MySQL.
      sourceRows = [{ columns: [], values: [] }];
    }

    // --- WHERE ---
    const filtered = select.where
      ? sourceRows.filter((row) => truthy(this.evaluate(select.where!, row)))
      : sourceRows;

    // --- Columnas proyectadas ---
    const outputColumns: string[] = [];
    const expanded: Expr[] = [];

    for (const column of select.columns) {
      if (column.expr.kind === "star") {
        for (let i = 0; i < tableColumns.length; i += 1) {
          outputColumns.push(tableColumns[i]);
          expanded.push({ kind: "column", name: tableColumns[i] });
        }
        continue;
      }

      outputColumns.push(column.alias ?? describe(column.expr));
      expanded.push(column.expr);
    }

    // --- COUNT(...) sobre el conjunto ---
    if (expanded.some((expr) => expr.kind === "call" && expr.name === "count")) {
      const values = expanded.map((expr) =>
        expr.kind === "call" && expr.name === "count"
          ? filtered.length
          : filtered.length > 0
            ? this.evaluate(expr, filtered[0])
            : null,
      );

      return { columns: outputColumns, rows: [values] };
    }

    let rows = filtered.map((row) =>
      expanded.map((expr) => this.evaluate(expr, row)),
    );

    // --- ORDER BY ---
    if (select.orderBy && select.orderBy.length > 0) {
      const terms = select.orderBy;

      // ORDER BY 3 se refiere a la tercera columna: es la técnica que se
      // usa para contar cuántas columnas tiene la consulta.
      for (const term of terms) {
        if (
          term.expr.kind === "literal" &&
          typeof term.expr.value === "number"
        ) {
          const index = term.expr.value;

          if (index < 1 || index > outputColumns.length) {
            throw new SqlError(
              `la columna ${index} del ORDER BY está fuera de rango`,
            );
          }
        }
      }

      const withSource = rows.map((values, index) => ({
        values,
        source: filtered[index],
      }));

      withSource.sort((a, b) => {
        for (const term of terms) {
          let left: SqlValue;
          let right: SqlValue;

          if (
            term.expr.kind === "literal" &&
            typeof term.expr.value === "number"
          ) {
            left = a.values[term.expr.value - 1];
            right = b.values[term.expr.value - 1];
          } else {
            left = this.evaluate(term.expr, a.source);
            right = this.evaluate(term.expr, b.source);
          }

          const result = compare(left, right);

          if (result !== 0) {
            return term.direction === "desc" ? -result : result;
          }
        }

        return 0;
      });

      rows = withSource.map((entry) => entry.values);
    }

    // --- LIMIT / OFFSET ---
    const offset = select.offset ?? 0;

    if (select.limit !== undefined) {
      rows = rows.slice(offset, offset + select.limit);
    } else if (offset > 0) {
      rows = rows.slice(offset);
    }

    return { columns: outputColumns, rows };
  }

  private evaluate(expr: Expr, row: Row): SqlValue {
    switch (expr.kind) {
      case "literal":
        return expr.value;

      case "star":
        return row.values[0] ?? null;

      case "column": {
        const index = row.columns.findIndex(
          (name) => name.toLowerCase() === expr.name.toLowerCase(),
        );

        if (index === -1) {
          // Este error es el que delata el nombre de las columnas.
          throw new SqlError(`no existe la columna '${expr.name}'`);
        }

        return row.values[index] ?? null;
      }

      case "unary": {
        const value = this.evaluate(expr.operand, row);

        if (expr.op === "not") return !truthy(value);
        if (expr.op === "-") return -Number(value);

        return null;
      }

      case "call":
        return this.evaluateCall(expr, row);

      case "binary":
        return this.evaluateBinary(expr, row);
    }
  }

  private evaluateCall(
    expr: Extract<Expr, { kind: "call" }>,
    row: Row,
  ): SqlValue {
    const args = expr.args.map((arg) => this.evaluate(arg, row));

    switch (expr.name) {
      case "count":
        return 1;
      case "upper":
        return String(args[0] ?? "").toUpperCase();
      case "lower":
        return String(args[0] ?? "").toLowerCase();
      case "length":
        return String(args[0] ?? "").length;
      case "concat":
        return args.map((a) => (a === null ? "" : String(a))).join("");
      case "substr":
      case "substring": {
        const text = String(args[0] ?? "");
        const from = Number(args[1] ?? 1) - 1;
        const size = args[2] === undefined ? undefined : Number(args[2]);
        return text.substr(from, size);
      }
      case "database":
        return "nande_app";
      case "version":
        return "ÑandeSQL 1.0";
      default:
        throw new SqlError(`la función '${expr.name}' no existe`);
    }
  }

  private evaluateBinary(
    expr: Extract<Expr, { kind: "binary" }>,
    row: Row,
  ): SqlValue {
    // AND y OR cortocircuitan, igual que en un motor real.
    if (expr.op === "and") {
      return (
        truthy(this.evaluate(expr.left, row)) &&
        truthy(this.evaluate(expr.right, row))
      );
    }

    if (expr.op === "or") {
      return (
        truthy(this.evaluate(expr.left, row)) ||
        truthy(this.evaluate(expr.right, row))
      );
    }

    const left = this.evaluate(expr.left, row);
    const right = this.evaluate(expr.right, row);

    switch (expr.op) {
      case "=":
        return looseEquals(left, right);
      case "<>":
        return !looseEquals(left, right);
      case "<":
        return compare(left, right) < 0;
      case ">":
        return compare(left, right) > 0;
      case "<=":
        return compare(left, right) <= 0;
      case ">=":
        return compare(left, right) >= 0;
      case "is":
        return left === null && right === null;
      case "like":
        return likeToRegExp(String(right ?? "")).test(String(left ?? ""));
      case "+":
        return Number(left) + Number(right);
      case "-":
        return Number(left) - Number(right);
      case "*":
        return Number(left) * Number(right);
      case "/":
        return Number(right) === 0 ? null : Number(left) / Number(right);
      case "%":
        return Number(left) % Number(right);
      case "||":
        return `${left ?? ""}${right ?? ""}`;
      default:
        throw new SqlError(`operador desconocido '${expr.op}'`);
    }
  }
}

function describe(expr: Expr): string {
  switch (expr.kind) {
    case "column":
      return expr.name;
    case "literal":
      return expr.value === null ? "NULL" : String(expr.value);
    case "call":
      return `${expr.name}(...)`;
    default:
      return "expr";
  }
}

function dedupe(rows: SqlValue[][]): SqlValue[][] {
  const seen = new Set<string>();
  const out: SqlValue[][] = [];

  for (const row of rows) {
    const key = JSON.stringify(row);

    if (!seen.has(key)) {
      seen.add(key);
      out.push(row);
    }
  }

  return out;
}
