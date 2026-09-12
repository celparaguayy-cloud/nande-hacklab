import { Database } from "./Database";

/**
 * VirtualDatabaseRuntime — el catálogo de bases de datos consultables del
 * mundo. Cada una es un `Database` real (motor SQL de ÑANDE), no un mock: las
 * consultas se ejecutan de verdad. Sirve para practicar SQL de forma segura y
 * para que los laboratorios y paneles compartan un modelo de datos común.
 */
export interface DbInfo {
  name: string;
  description: string;
  tables: { name: string; columns: string[]; rows: number }[];
}

export class DatabaseRuntime {
  private dbs = new Map<string, { db: Database; description: string }>();

  constructor() {
    this.seed();
  }

  register(name: string, description: string, db: Database): void {
    this.dbs.set(name.toLowerCase(), { db, description });
  }

  get(name: string): Database | undefined {
    return this.dbs.get(name.toLowerCase())?.db;
  }

  has(name: string): boolean {
    return this.dbs.has(name.toLowerCase());
  }

  list(): DbInfo[] {
    return [...this.dbs.entries()].map(([name, { db, description }]) => ({
      name,
      description,
      tables: db.tableNames().map((t) => {
        const table = db.getTable(t)!;
        return { name: table.name, columns: table.columns, rows: table.rows.length };
      }),
    }));
  }

  /** Base determinista de ejemplo para practicar SQL. */
  private seed(): void {
    const padron = new Database();
    padron.createTable("personas", ["id", "nombre", "ciudad", "edad"], [
      [1, "Kamba Ríos", "Asunción", 29],
      [2, "Arandú Benítez", "Encarnación", 41],
      [3, "Yvoty Cáceres", "Ciudad del Este", 23],
      [4, "Tapé Giménez", "Luque", 35],
      [5, "Porã Duarte", "San Lorenzo", 52],
    ]);
    padron.createTable("ciudades", ["ciudad", "region"], [
      ["Asunción", "Central"],
      ["Encarnación", "Itapúa"],
      ["Ciudad del Este", "Alto Paraná"],
      ["Luque", "Central"],
      ["San Lorenzo", "Central"],
    ]);
    this.register("padron", "Padrón de práctica: personas y ciudades (SQL seguro).", padron);
  }
}
