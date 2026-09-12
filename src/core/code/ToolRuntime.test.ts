import { beforeEach, describe, expect, it } from "vitest";
import { CodeExecutionSandbox, type SandboxHost } from "./Sandbox";
import { ToolRuntime } from "./ToolRuntime";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { resetStorage, seedRandom } from "../../test/setup";

/** Host de prueba: un mini-mundo con un host y dos puertos. */
function fakeHost(): SandboxHost {
  return {
    now: () => 42,
    rng: () => 0.5,
    resolve: (h) => (h === "demo.nande" ? "10.10.9.9" : undefined),
    scan: (h) =>
      h === "demo.nande"
        ? [
            { port: 80, service: "nginx", state: "open" },
            { port: 22, service: "sshd", state: "closed" },
          ]
        : [],
    http: () => ({ status: 200, text: "hola mundo" }),
  };
}

describe("CodeExecutionSandbox (seguridad y ejecución)", () => {
  const sb = new CodeExecutionSandbox();

  it("rechaza vías de escape al host", () => {
    for (const bad of [
      "fetch('http://x')",
      "eval('1')",
      "new Function('return 1')()",
      "require('fs')",
      "[].constructor.constructor('return this')()",
      "window.location",
      "localStorage.getItem('x')",
    ]) {
      const r = sb.compile(bad);
      expect(r.ok, bad).toBe(false);
    }
  });

  it("rechaza bucles infinitos obvios", () => {
    expect(sb.compile("while(true){}").ok).toBe(false);
    expect(sb.compile("for(;;){}").ok).toBe(false);
  });

  it("compila y ejecuta código válido con print", () => {
    const c = sb.compile('print("hola " + (1+2));');
    expect(c.ok).toBe(true);
    const r = sb.run(c.compiled!, [], { host: fakeHost(), capabilities: ["print"] });
    expect(r.ok).toBe(true);
    expect(r.output).toContain("hola 3");
  });

  it("niega capacidades no concedidas", () => {
    const c = sb.compile("print(nande.scan('demo.nande').length);");
    expect(c.ok).toBe(true);
    // Sin la capacidad network.virtual.inspect → debe fallar.
    const r = sb.run(c.compiled!, [], { host: fakeHost(), capabilities: ["print"] });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("capacidad denegada");
  });

  it("con la capacidad, el código ve el mundo (scan real)", () => {
    const c = sb.compile(
      "var p = nande.scan('demo.nande'); print(p[0].port + ' ' + p[0].state);",
    );
    const r = sb.run(c.compiled!, [], {
      host: fakeHost(),
      capabilities: ["print", "network.virtual.inspect"],
    });
    expect(r.ok).toBe(true);
    expect(r.output).toContain("80 open");
  });
});

describe("Experimento C — el jugador programa una tool que corre y persiste", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;

  beforeEach(() => {
    resetStorage();
    seedRandom();
    kernel = new VirtualKernel();
    term = new VirtualTerminal(kernel);
  });

  it("code new → compile → tool-install → run: la tool ejecuta de verdad", () => {
    expect(term.execute("code new mi-scanner")).toContain("mi-scanner");
    expect(term.execute("compile mi-scanner")).toContain("compila");

    const install = term.execute("tool-install mi-scanner");
    expect(install).toContain("instalada");

    const run = term.execute("run mi-scanner server.nande");
    expect(run).toContain("80/tcp");
    expect(run).toContain("open");
  });

  it("la tool refleja el estado del mundo: apagar nginx cambia su salida", () => {
    term.execute("code new mi-scanner");
    term.execute("tool-install mi-scanner");

    expect(term.execute("run mi-scanner server.nande")).toContain("80/tcp  open  nginx");

    term.execute("service-stop nginx server.nande");
    const run = term.execute("run mi-scanner server.nande");
    expect(run).toContain("80/tcp  closed  nginx");
  });

  it("la tool persiste: un ToolRuntime nuevo la reencuentra en storage", () => {
    term.execute("code new mi-scanner");
    term.execute("tool-install mi-scanner");
    expect(kernel.toolRuntime.has("mi-scanner")).toBe(true);

    // Simula recargar la app: otro ToolRuntime leyendo el mismo localStorage.
    const otro = new ToolRuntime(new CodeExecutionSandbox(), fakeHost());
    expect(otro.has("mi-scanner")).toBe(true);
    const r = otro.run("mi-scanner", ["demo.nande"]);
    expect(r.ok).toBe(true);
    expect(r.output).toContain("80/tcp");
  });
});

describe("Experimento D — un NPC produce una tool real (o falla)", () => {
  beforeEach(() => {
    resetStorage();
    seedRandom();
  });

  it("si el código del NPC no compila, NO se instala", () => {
    const rt = new ToolRuntime(new CodeExecutionSandbox(), fakeHost());
    const bad = rt.install("esto no es js válido {{{", { name: "npc-roto" }, "npc");
    expect(bad.ok).toBe(false);
    expect(rt.has("npc-roto")).toBe(false);
  });

  it("si compila y pasa sus tests, queda como artefacto ejecutable", () => {
    const rt = new ToolRuntime(new CodeExecutionSandbox(), fakeHost());
    const src = 'print("suma=" + (Number(args[0]) + Number(args[1])));';
    const inst = rt.install(src, { name: "npc-suma", author: "kamba" }, "npc");
    expect(inst.ok).toBe(true);

    const t = rt.test("npc-suma", [
      { args: ["2", "3"], expect: "suma=5" },
      { args: ["10", "1"], expect: "suma=11" },
    ]);
    expect(t.passed).toBe(2);
    expect(t.total).toBe(2);

    const tool = rt.get("npc-suma")!;
    expect(tool.origin).toBe("npc");
    expect(tool.manifest.author).toBe("kamba");
  });
});
