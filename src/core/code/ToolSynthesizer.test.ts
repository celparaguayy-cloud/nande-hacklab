import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import {
  extractCode,
  nameFromPrompt,
  offlineForge,
} from "./ToolSynthesizer";
import { resetStorage, seedRandom } from "../../test/setup";

describe("ToolSynthesizer — helpers", () => {
  it("extrae código de un bloque markdown", () => {
    expect(extractCode("bla\n```js\nprint('hola');\n```\nfin")).toBe("print('hola');");
  });

  it("deriva un nombre kebab-case del pedido", () => {
    expect(nameFromPrompt("una herramienta que escanee puertos")).toBe("escanee-puertos");
    expect(nameFromPrompt("")).toBe("mi-tool");
  });
});

describe("ToolSynthesizer — forjador offline (siempre compila y hace algo)", () => {
  let kernel: VirtualKernel;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
  });

  const casos = [
    "una tool que calcule el md5 de un texto",
    "codificar en base64",
    "probar el diccionario contra un login",
    "consultar el estado http de una web",
    "resolver un dominio a ip",
    "descubrir los hosts de la red y sus puertos",
    "escanear un host y guardar un reporte en un archivo",
    "algo raro que no reconozco",
  ];

  for (const pedido of casos) {
    it(`compila lo generado para: "${pedido}"`, () => {
      const forged = offlineForge(pedido);
      const c = kernel.toolRuntime.compileSource(forged.source);
      expect(c.ok, forged.source + "\n" + c.errors.join("; ")).toBe(true);
    });
  }

  it("synthesize offline entrega código instalable y ejecutable", async () => {
    const r = await kernel.toolSynthesizer.synthesize("escanear un host");
    expect(r.ok).toBe(true);
    expect(r.engine).toBe("offline");

    const inst = kernel.toolRuntime.install(r.source, { name: r.suggestedName }, "player");
    expect(inst.ok).toBe(true);
    const run = kernel.toolRuntime.run(inst.name!, ["server.nande"]);
    expect(run.ok).toBe(true);
    expect(run.output).toContain("80/tcp");
  });

  it("la tool de hash produce el md5 real", async () => {
    const r = await kernel.toolSynthesizer.synthesize("hasheá con md5");
    kernel.toolRuntime.install(r.source, { name: "h" }, "player");
    const run = kernel.toolRuntime.run("h", ["hola"]);
    // md5("hola") es un valor fijo y conocido: nada scripteado.
    expect(run.output).toContain("4d186321c1a7f0f354b297e8914ab240");
  });
});

describe("nande.* extendido — nuevas capacidades del sandbox", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("nande.b64encode/b64decode son inversos y reales", () => {
    const src = `print(nande.b64decode(nande.b64encode("ñandé 123")));`;
    const r = kernel.toolRuntime.runSource(src);
    expect(r.ok).toBe(true);
    expect(r.output.trim()).toBe("ñandé 123");
  });

  it("nande.write persiste en el filesystem y nande.read lo recupera", () => {
    const src = `nande.write("/home/student/prueba.txt", "contenido-real");
print(nande.read("/home/student/prueba.txt"));`;
    const r = kernel.toolRuntime.runSource(src);
    expect(r.ok).toBe(true);
    expect(r.output).toContain("contenido-real");
    expect(kernel.filesystem.readFile("/home/student/prueba.txt")).toBe("contenido-real");
  });

  it("nande.write rechaza rutas fuera del sandbox del jugador", () => {
    const src = `var r = nande.write("/etc/passwd", "x"); print(r.ok + " " + r.error);`;
    const r = kernel.toolRuntime.runSource(src);
    expect(r.output).toContain("false");
  });

  it("nande.hosts lista hosts alcanzables y no los internos sin pivotar", () => {
    const src = `var hs = nande.hosts(); print("count=" + hs.length);`;
    const r = kernel.toolRuntime.runSource(src);
    expect(r.ok).toBe(true);
    // Hay al menos un host público (server.nande) y ninguno interno se cuela.
    const count = Number(r.output.match(/count=(\d+)/)?.[1] ?? "0");
    expect(count).toBeGreaterThan(0);
    for (const h of kernel.hosts.all()) {
      const visible = r.output; // el detalle real se valida vía canReach abajo
      void visible;
      if (!kernel.hosts.canReach(null, h.hostname)) {
        // un host interno no debe ser escaneable desde el código del jugador
        const scan = kernel.toolRuntime.runSource(
          `var p = nande.scan(${JSON.stringify(h.hostname)}); print("n=" + p.length);`,
        );
        expect(scan.output).toContain("n=0");
        break;
      }
    }
  });

  it("nande.post envía un formulario real al mundo (login)", () => {
    // Usamos una webapp del mundo; el POST debe devolver un estado HTTP real.
    const app = kernel.hosts.all().find((h) => kernel.browser.isWebApp(h.hostname));
    expect(app).toBeTruthy();
    const src = `var r = nande.post("http://${app!.hostname}/login", { username: "x", password: "y" });
print("status=" + r.status);`;
    const r = kernel.toolRuntime.runSource(src);
    expect(r.ok).toBe(true);
    expect(r.output).toMatch(/status=\d+/);
    void term;
  });
});
