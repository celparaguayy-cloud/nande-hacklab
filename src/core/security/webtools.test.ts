import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * sqlmap y gobuster — pruebas de REALIDAD. Golpean las apps web REALES del
 * mundo (con su motor SQL de verdad): sqlmap detecta la inyección por la
 * diferencia real de respuestas y extrae la bandera del panel siguiendo el
 * redirect; gobuster reporta el STATUS real de cada ruta. Nada pre-calculado.
 */
describe("sqlmap — inyección real contra el motor SQL del mundo", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => { resetStorage(); seedRandom(); kernel = new VirtualKernel(); term = new VirtualTerminal(kernel); });

  it("detecta la SQLi del login del banco y extrae la bandera de verdad", () => {
    const out = term.execute('sqlmap -u http://banco.nande/login --data "usuario=admin&password=x"');
    expect(out).toContain("inyectable");
    expect(out).toContain("ND{sqli_login_bypass}");
    expect(kernel.player.capturedFlags()).toContain("ND{sqli_login_bypass}");
  });

  it("la detección es real: sale de la diferencia de respuestas de la app", () => {
    // Prueba de que NO está hardcodeado: un endpoint sin el param vulnerable
    // no reporta inyección.
    const out = term.execute('sqlmap -u http://banco.nande/login --data "otro=1"');
    expect(out).toContain("no parece inyectable");
    expect(out).not.toContain("ND{sqli_login_bypass}");
  });

  it("--dump extrae la tabla usuarios de verdad vía UNION (con sesión)", () => {
    // Sesión real por bypass, como haría un atacante.
    const login = kernel.web.request("POST", "banco.nande", "/login", "", { usuario: "admin' -- ", password: "x" });
    const cookie = `sesion=${login.setCookies.sesion}`;
    const out = term.execute(`sqlmap -u "http://banco.nande/movimientos?q=a" --cookie "${cookie}" --dump`);
    expect(out).toContain("4 columnas"); // detectadas por ORDER BY, no hardcodeado
    expect(out).toContain("usuarios");
    expect(out).toContain("M8arete-2024!"); // contraseña REAL extraída del motor SQL
    expect(kernel.player.capturedFlags()).toContain("ND{sqli_union_dump}");
  });

  it("--tables enumera tablas por diccionario sin volcar", () => {
    const login = kernel.web.request("POST", "banco.nande", "/login", "", { usuario: "admin' -- ", password: "x" });
    const cookie = `sesion=${login.setCookies.sesion}`;
    const out = term.execute(`sqlmap -u "http://banco.nande/movimientos?q=a" --cookie "${cookie}" --tables`);
    expect(out).toContain("usuarios");
    expect(out).not.toContain("M8arete-2024!"); // --tables no vuelca contenido
  });

  it("se autentica solo cuando el endpoint exige sesión (--dump sin cookie)", () => {
    // Regresión: /movimientos exige sesión. Antes sqlmap decía "no inyectable"
    // porque el 401 tapaba la inyección. Ahora hace bypass de login y sigue.
    const out = term.execute('sqlmap -u "http://banco.nande/movimientos?q=a" --dump');
    expect(out).toContain("se autentica solo"); // bypass de login automático
    expect(out).toContain("usuarios");
    expect(out).toContain("M8arete-2024!"); // extrae de verdad tras auto-login
    expect(kernel.player.capturedFlags()).toContain("ND{sqli_union_dump}");
  });

  it("--dbs revela el motor y la base de datos actual", () => {
    const out = term.execute('sqlmap -u "http://banco.nande/movimientos?q=a" --dbs');
    expect(out).toContain("DBMS");
    expect(out).toContain("main"); // base de datos disponible
    expect(out).not.toContain("M8arete-2024!"); // --dbs no vuelca datos
  });

  it("--columns enumera las columnas de una tabla sin volcar valores", () => {
    const out = term.execute('sqlmap -u "http://banco.nande/movimientos?q=a" -T usuarios --columns');
    expect(out).toContain("columnas de 'usuarios'");
    expect(out).toContain("password"); // la columna aparece…
    expect(out).not.toContain("M8arete-2024!"); // …pero su valor NO
  });

  it("--banner / --current-db / --current-user extraen info del DBMS", () => {
    const out = term.execute('sqlmap -u "http://banco.nande/movimientos?q=a" --banner --current-db --current-user');
    expect(out).toContain("ÑandeSQL"); // banner del motor
    expect(out).toContain("base de datos actual");
    expect(out).toContain("usuario actual del DBMS");
    expect(out).not.toContain("volcado de"); // info sola no dispara el dump
  });

  it("--batch y --level/--risk cambian el modo de escaneo (y siguen funcionando)", () => {
    const out = term.execute('sqlmap -u "http://banco.nande/movimientos?q=a" --batch --level 3 --risk 2 --dump');
    expect(out).toContain("modo no interactivo"); // --batch
    expect(out).toMatch(/nivel=3 riesgo=2/); // --level/--risk reconocidos
    expect(out).toContain("M8arete-2024!"); // y el volcado sigue funcionando
  });

  it("pide parámetros y respeta el sandbox", () => {
    expect(term.execute("sqlmap -u http://banco.nande/")).toContain("no hay parámetros");
    expect(term.execute("sqlmap -u http://evil.com/?x=1")).toContain("fuera del sandbox");
  });
});

describe("gobuster — enumeración real de rutas del servidor web", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => { resetStorage(); seedRandom(); kernel = new VirtualKernel(); term = new VirtualTerminal(kernel); });

  it("reporta el status real de cada ruta (200 login, 401 panel protegido)", () => {
    const out = term.execute("gobuster -u http://banco.nande");
    expect(out).toMatch(/\/login\s+\(Status: 200\)/);
    expect(out).toMatch(/\/panel\s+\(Status: 401\)/);
    expect(out).toContain("protegida");
  });

  it("una ruta inexistente (404) no aparece en los resultados", () => {
    const out = term.execute("gobuster -u http://banco.nande");
    expect(out).not.toContain("/noexiste");
  });

  it("ffuf comparte el motor real y reporta como fuzzing", () => {
    const out = term.execute("ffuf -u http://banco.nande");
    expect(out).toContain("fuzzing de rutas");
    expect(out).toMatch(/\/login\s+\(Status: 200\)/);
  });
});
