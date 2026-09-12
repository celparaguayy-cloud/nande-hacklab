import type { ToolRuntime, TestCase } from "./ToolRuntime";

/**
 * NpcToolForge — el taller donde los NPC producen herramientas FUNCIONALES.
 *
 * Un NPC que "programa" no imprime "creé una herramienta": genera código real
 * a partir de una plantilla, lo compila, lo somete a sus pruebas y sólo si
 * pasan se instala en el ToolRuntime (origin: "npc"). Si el código no compila
 * o falla los tests, no se publica nada. El jugador puede luego `tool-list`,
 * `tool-info`, `code` y `run` esa herramienta: existe de verdad.
 *
 * Es determinista: la plantilla y el nombre se eligen por hash del id del NPC
 * y el tick, no por azar real.
 */

interface ToolTemplate {
  slug: string;
  description: string;
  source: string;
  tests: TestCase[];
}

/** Plantillas reales, todas válidas para el sandbox (sin vías de escape). */
const TEMPLATES: ToolTemplate[] = [
  {
    slug: "port-check",
    description: "Cuenta los puertos abiertos de un host.",
    source: `var objetivo = args[0] || "banco.nande";
var puertos = nande.scan(objetivo);
var abiertos = 0;
for (var i = 0; i < puertos.length; i++) {
  if (puertos[i].state === "open") abiertos++;
}
print(objetivo + ": " + abiertos + " puerto(s) abierto(s)");
`,
    tests: [{ args: ["banco.nande"], expect: "1 puerto(s) abierto(s)" }],
  },
  {
    slug: "http-ping",
    description: "Consulta el estado HTTP de una web del mundo.",
    source: `var url = args[0] || "http://server.nande/";
var r = nande.http(url);
print("estado " + r.status);
`,
    tests: [{ args: ["http://server.nande/"], expect: "estado 200" }],
  },
  {
    slug: "es-par",
    description: "Dice si un número es par o impar.",
    source: `var n = Number(args[0] || 0);
print(n + (n % 2 === 0 ? " es par" : " es impar"));
`,
    tests: [
      { args: ["4"], expect: "4 es par" },
      { args: ["7"], expect: "7 es impar" },
    ],
  },
  {
    slug: "promedio",
    description: "Calcula el promedio de una lista de números.",
    source: `var suma = 0;
for (var i = 0; i < args.length; i++) { suma += Number(args[i]); }
print("promedio=" + (args.length ? (suma / args.length) : 0));
`,
    tests: [{ args: ["2", "4"], expect: "promedio=3" }],
  },
];

/** Hash determinista de una cadena. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface ForgeResult {
  ok: boolean;
  name?: string;
  reason?: string;
}

export class NpcToolForge {
  private tools: ToolRuntime;

  constructor(tools: ToolRuntime) {
    this.tools = tools;
  }

  /**
   * Un NPC intenta crear y publicar una herramienta. Devuelve el resultado:
   * si el código no compila o falla los tests, NO se publica.
   */
  forge(
    npc: { id: string; name: string },
    tick: number,
  ): ForgeResult {
    const tmpl = TEMPLATES[hash(npc.id + ":" + tick) % TEMPLATES.length];
    const brand = npc.name.split(/\s+/)[0].toLowerCase().replace(/[^\w.-]/g, "");
    const name = `${brand}-${tmpl.slug}`;

    if (this.tools.has(name)) {
      return { ok: false, reason: "ya existe" };
    }

    const inst = this.tools.install(
      tmpl.source,
      { name, description: tmpl.description, author: npc.name },
      "npc",
    );
    if (!inst.ok) {
      return { ok: false, reason: `no compila: ${inst.errors.join("; ")}` };
    }

    // El NPC prueba su herramienta antes de publicarla.
    const t = this.tools.test(inst.name!, tmpl.tests);
    if (t.passed !== t.total) {
      // Falló sus propios tests: la retira (no publica basura).
      this.tools.remove(inst.name!);
      return { ok: false, reason: "falló sus tests" };
    }

    return { ok: true, name: inst.name! };
  }
}
