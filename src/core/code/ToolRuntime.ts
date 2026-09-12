import {
  CodeExecutionSandbox,
  type Capability,
  type CompiledProgram,
  type RunResult,
  type SandboxHost,
} from "./Sandbox";

/**
 * ToolRuntime — el registro de herramientas FUNCIONALES creadas dentro de
 * ÑANDE, tanto por el jugador como por los NPC.
 *
 * Una herramienta no es un adorno: es código que compila, pasa sus pruebas,
 * se instala y después `run <nombre>` la ejecuta de verdad en el sandbox.
 * Persiste en localStorage, así que sigue existiendo al recargar la app
 * (Experimento C). Un NPC que "programa" produce exactamente lo mismo: si su
 * código no compila o falla los tests, no se publica (Experimento D).
 */

export interface ToolManifest {
  name: string;
  version: string;
  description: string;
  capabilities: Capability[];
  author: string;
  input?: string;
  output?: string;
}

export interface ToolArtifact {
  manifest: ToolManifest;
  source: string;
  createdTick: number;
  origin: "player" | "npc";
}

export interface InstallResult {
  ok: boolean;
  name?: string;
  errors: string[];
  warnings: string[];
}

export interface TestCase {
  args: string[];
  /** Substring que la salida debe contener para pasar. */
  expect: string;
}

const STORAGE_KEY = "nande-tools";

/** Infiere las capacidades necesarias mirando qué llama el código. */
export function inferCapabilities(source: string): Capability[] {
  const caps: Capability[] = ["print"];
  if (/\bnande\s*\.\s*scan\b/.test(source)) caps.push("network.virtual.inspect");
  if (/\bnande\s*\.\s*http\b/.test(source)) caps.push("http.virtual.request");
  if (/\bnande\s*\.\s*resolve\b/.test(source)) caps.push("dns.resolve");
  return caps;
}

export class ToolRuntime {
  private sandbox: CodeExecutionSandbox;
  private host: SandboxHost;
  private now: () => number;
  private tools = new Map<string, ToolArtifact>();
  private compiledCache = new Map<string, CompiledProgram>();

  constructor(
    sandbox: CodeExecutionSandbox,
    host: SandboxHost,
    opts: { now?: () => number } = {},
  ) {
    this.sandbox = sandbox;
    this.host = host;
    this.now = opts.now ?? (() => 0);
    this.load();
  }

  /* ------------------------------------------------------------- persistencia */

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as ToolArtifact[];
      if (!Array.isArray(list)) return;
      for (const t of list) {
        if (t?.manifest?.name && typeof t.source === "string") {
          this.tools.set(t.manifest.name.toLowerCase(), t);
        }
      }
    } catch {
      /* storage deshabilitado o corrupto: arrancamos sin tools */
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.tools.values()]));
    } catch {
      /* sin persistencia disponible */
    }
  }

  /* --------------------------------------------------------------- instalar */

  /**
   * Compila e instala una herramienta desde su código fuente. Si no compila,
   * NO se instala y se devuelven los errores. El nombre sale del manifiesto
   * parcial o se deriva del argumento.
   */
  install(
    source: string,
    manifest: Partial<ToolManifest> & { name: string },
    origin: "player" | "npc" = "player",
  ): InstallResult {
    const compiled = this.sandbox.compile(source);
    if (!compiled.ok) {
      return { ok: false, errors: compiled.errors, warnings: compiled.warnings };
    }

    const name = manifest.name.trim().toLowerCase().replace(/[^\w.-]/g, "-");
    if (!name) {
      return { ok: false, errors: ["nombre de herramienta inválido"], warnings: [] };
    }

    const full: ToolManifest = {
      name,
      version: manifest.version ?? "0.1.0",
      description: manifest.description ?? "Herramienta creada en ÑANDE.",
      capabilities: manifest.capabilities ?? inferCapabilities(source),
      author: manifest.author ?? (origin === "npc" ? "npc" : "jugador"),
      input: manifest.input,
      output: manifest.output,
    };

    this.tools.set(name, {
      manifest: full,
      source,
      createdTick: this.now(),
      origin,
    });
    this.compiledCache.set(name, compiled.compiled!);
    this.save();

    return { ok: true, name, errors: [], warnings: compiled.warnings };
  }

  /* --------------------------------------------------------------- consulta */

  list(): ToolArtifact[] {
    return [...this.tools.values()];
  }

  has(name: string): boolean {
    return this.tools.has(name.toLowerCase());
  }

  get(name: string): ToolArtifact | undefined {
    return this.tools.get(name.toLowerCase());
  }

  remove(name: string): boolean {
    const key = name.toLowerCase();
    this.compiledCache.delete(key);
    const ok = this.tools.delete(key);
    if (ok) this.save();
    return ok;
  }

  count(): number {
    return this.tools.size;
  }

  /* --------------------------------------------------------------- ejecutar */

  private compileFor(name: string): CompiledProgram | undefined {
    const key = name.toLowerCase();
    const cached = this.compiledCache.get(key);
    if (cached) return cached;
    const tool = this.tools.get(key);
    if (!tool) return undefined;
    const c = this.sandbox.compile(tool.source);
    if (!c.ok || !c.compiled) return undefined;
    this.compiledCache.set(key, c.compiled);
    return c.compiled;
  }

  /** Ejecuta una herramienta instalada con sus capacidades declaradas. */
  run(name: string, args: string[] = []): RunResult {
    const tool = this.get(name);
    if (!tool) {
      return { ok: false, output: "", error: `herramienta no instalada: ${name}` };
    }
    const compiled = this.compileFor(name);
    if (!compiled) {
      return { ok: false, output: "", error: `no se pudo compilar ${name}` };
    }
    return this.sandbox.run(compiled, args, {
      host: this.host,
      capabilities: tool.manifest.capabilities,
    });
  }

  /**
   * Corre una batería de pruebas contra una herramienta. Devuelve cuántas
   * pasaron. Lo usan el jugador (`tool-test`) y los NPC antes de publicar.
   */
  test(
    name: string,
    cases: TestCase[],
  ): { passed: number; total: number; details: string[] } {
    const details: string[] = [];
    let passed = 0;
    for (const [i, c] of cases.entries()) {
      const r = this.run(name, c.args);
      const ok = r.ok && r.output.includes(c.expect);
      if (ok) passed += 1;
      details.push(
        `  caso ${i + 1} [${c.args.join(" ")}]: ${ok ? "PASA" : "FALLA"}` +
          (ok ? "" : ` (esperaba «${c.expect}»${r.error ? `, error: ${r.error}` : ""})`),
      );
    }
    return { passed, total: cases.length, details };
  }
}
