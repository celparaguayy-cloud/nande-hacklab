import { beforeEach, describe, expect, it } from "vitest";
import { Database, SqlError } from "./Database";

function nuevaDb(): Database {
  const db = new Database();

  db.createTable(
    "users",
    ["id", "username", "password", "role", "email"],
    [
      [1, "admin", "s3cr3t-admin", "admin", "admin@banco.nd"],
      [2, "ana", "girasol", "user", "ana@banco.nd"],
      [3, "beto", "12345", "user", "beto@banco.nd"],
    ],
  );

  db.createTable(
    "secrets",
    ["id", "flag"],
    [[1, "ND{sql_union_ftw}"]],
  );

  return db;
}

describe("motor SQL", () => {
  let db: Database;

  beforeEach(() => {
    db = nuevaDb();
  });

  it("SELECT con WHERE devuelve la fila que corresponde", () => {
    const r = db.query("SELECT username, role FROM users WHERE id = 1");
    expect(r.rows).toEqual([["admin", "admin"]]);
  });

  it("SELECT * expande todas las columnas", () => {
    const r = db.query("SELECT * FROM users WHERE username = 'ana'");
    expect(r.columns).toContain("password");
    expect(r.rows[0]).toContain("girasol");
  });

  describe("inyección SQL — el corazón del juego", () => {
    // Login típico mal hecho: arma la consulta pegando lo que escribe el
    // usuario. Es exactamente lo que hace la web vulnerable del banco.
    const login = (user: string, pass: string) =>
      db.query(
        `SELECT * FROM users WHERE username = '${user}' AND password = '${pass}'`,
      );

    it("con credenciales correctas entra un solo usuario", () => {
      expect(login("ana", "girasol").rows).toHaveLength(1);
    });

    it("con contraseña incorrecta no entra nadie", () => {
      expect(login("ana", "no-es").rows).toHaveLength(0);
    });

    it("' OR '1'='1 NO evade este login: el AND de la contraseña gana", () => {
      // username='' OR '1'='1' AND password='x' → por precedencia es
      // '' OR ('1'='1' AND password='x'), y la contraseña falsa lo anula.
      // Este matiz es justo lo que enseña la lección: hay que comentar.
      expect(login("' OR '1'='1", "x").rows).toHaveLength(0);
    });

    it("' OR '1'='1' -- evade el login comentando la contraseña", () => {
      const r = login("' OR '1'='1' -- ", "x");
      expect(r.rows.length).toBeGreaterThan(0);
    });

    it("admin'-- comenta la verificación de contraseña", () => {
      const r = login("admin'--", "lo que sea");
      expect(r.rows).toHaveLength(1);
      expect(r.rows[0]).toContain("admin");
    });

    it("una comilla suelta rompe la consulta, como un motor real", () => {
      expect(() => login("ana'", "x")).toThrow(SqlError);
    });

    it("UNION SELECT extrae datos de otra tabla", () => {
      const r = db.query(
        `SELECT id, username, password, role, email FROM users ` +
          `WHERE id = 0 UNION SELECT 1, flag, 'x', 'x', 'x' FROM secrets`,
      );
      const values = r.rows.flat();
      expect(values).toContain("ND{sql_union_ftw}");
    });

    it("ORDER BY por número permite contar columnas", () => {
      expect(() =>
        db.query("SELECT id, username FROM users ORDER BY 5"),
      ).toThrow(SqlError);
      expect(
        db.query("SELECT id, username FROM users ORDER BY 2").rows.length,
      ).toBeGreaterThan(0);
    });
  });

  it("informa la columna inexistente (inyección basada en error)", () => {
    expect(() => db.query("SELECT no_existe FROM users")).toThrow(
      /no existe la columna/,
    );
  });

  it("precedencia: OR no se traga al AND", () => {
    // id=3 AND role='admin' es falso; el OR id=1 lo rescata.
    const r = db.query(
      "SELECT id FROM users WHERE id = 1 OR id = 3 AND role = 'admin'",
    );
    expect(r.rows.flat()).toEqual([1]);
  });

  it("LIKE con comodines filtra", () => {
    const r = db.query("SELECT username FROM users WHERE email LIKE '%@banco.nd'");
    expect(r.rows).toHaveLength(3);
  });

  it("comparación laxa: '1' = 1", () => {
    expect(db.query("SELECT * FROM users WHERE id = '1'").rows).toHaveLength(1);
  });
});
