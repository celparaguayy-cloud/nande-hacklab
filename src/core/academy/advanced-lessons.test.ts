import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3VhcmlvIjoicm9jaW8iLCJyb2wiOiJjbGllbnRlIn0.tz0HEvkrWYXTlNMMkKy23z7R6SspncHkFJB_F7_5pCo";

/**
 * Reality tests de las lecciones nuevas (DNS, HTTP+XSS, JWT, pivoting): se
 * juegan de punta a punta con la terminal REAL. Si los comandos que enseñan no
 * dieran la salida esperada, estos tests fallan — garantizan que la academia
 * enseña técnicas que funcionan de verdad en el sandbox.
 */
describe("lecciones nuevas — verificadas contra la terminal real", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("l-dns: nslookup traduce nombre a IP", () => {
    term.execute("learn l-dns");
    const done = term.execute("nslookup banco.nande");
    expect(done).toContain("Lección completada");
  });

  it("l-http-xss: curl + inyección de script capturan la bandera", () => {
    term.execute("learn l-http-xss");
    term.execute("curl http://blog.yvoty.nande/");
    const done = term.execute(
      "curl http://blog.yvoty.nande/?q=<script>alert(1)</script>",
    );
    expect(done).toContain("Lección completada");
  });

  it("l-jwt: decode → crack → forge completan la lección", () => {
    term.execute("learn l-jwt");
    term.execute("jwt decode " + TOKEN);
    term.execute("jwt crack " + TOKEN);
    const done = term.execute("jwt forge nande rol=admin usuario=admin");
    expect(done).toContain("Lección completada");
  });

  it("l-pivot: connect + leer la nota interna completan la lección", () => {
    term.execute("learn l-pivot");
    term.execute("connect server.nande soporte Verano2024");
    const done = term.execute("cat /home/soporte/notas.txt");
    expect(done).toContain("Lección completada");
  });
});
