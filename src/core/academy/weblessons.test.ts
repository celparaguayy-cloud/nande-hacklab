import { describe, expect, it, beforeEach } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

function terminal(): VirtualTerminal {
  resetStorage();
  seedRandom();
  return new VirtualTerminal(new VirtualKernel());
}

describe("lecciones web contra labs reales", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("la lección de SQLi login se completa evadiendo el login de verdad", () => {
    const t = terminal();
    expect(t.execute("learn l-web-sqli-login")).toContain("SQL");
    t.execute('curl -X POST http://banco.nande/login -d "usuario=rocio&password=malo"');
    const out = t.execute(
      `curl -X POST http://banco.nande/login -d "usuario=admin'--&password=x"`,
    );
    expect(out).toContain("Lección completada");
  });

  it("la lección de IDOR se completa leyendo el álbum ajeno real", () => {
    const t = terminal();
    t.execute("learn l-web-idor");
    t.execute("curl http://fotos.arandu.nande/album?id=1");
    const out = t.execute("curl http://fotos.arandu.nande/album?id=7");
    expect(out).toContain("Lección completada");
  });

  it("la lección de inyección de comandos se completa con ; cat flag", () => {
    const t = terminal();
    t.execute("learn l-web-cmdi");
    t.execute("curl http://tools.pyta.nande/ping?host=127.0.0.1");
    const out = t.execute('curl "http://tools.pyta.nande/ping?host=127.0.0.1; cat flag"');
    expect(out).toContain("Lección completada");
  });
});
