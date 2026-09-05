import type { Academy } from "./Academy";
import type { SecurityTools } from "../security/SecurityTools";
import type { ToolDef } from "../security/toolCatalog";
import { LESSONS } from "./Lessons";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Emoji por nivel, para orientar de un vistazo. */
const LEVEL_ICON: Record<string, string> = {
  principiante: "🟢",
  intermedio: "🔵",
  avanzado: "🟠",
  experto: "🔴",
};

/** Sitio academy.nande: portada con la ruta y páginas de curso. */
export function renderAcademySite(
  academy: Academy,
  tools: SecurityTools,
  path: string,
): string {
  const courseMatch = path.match(/^\/course\/([\w-]+)$/);

  if (courseMatch) {
    return renderCourse(academy, tools, courseMatch[1]);
  }

  const items = academy
    .all()
    .map(
      (course) => `
        <article>
          <h2>${LEVEL_ICON[course.level] ?? ""} ${escapeHtml(course.title)}</h2>
          <p>${escapeHtml(course.simple)}</p>
          <p>
            ${course.requires.length
              ? `🔒 Antes: ${course.requires.map(escapeHtml).join(", ")}`
              : "✔ Sin requisitos: podés empezar acá"}
            · <a href="/course/${course.id}">abrir curso</a>
          </p>
        </article>
      `,
    )
    .join("");

  const lessons = LESSONS.map(
    (l) => `
      <article>
        <h2>📘 ${escapeHtml(l.title)} <small>[${escapeHtml(l.level)}]</small></h2>
        <p>${escapeHtml(l.summary)}</p>
        <p>Practicala en la Terminal: <code>learn ${l.id}</code></p>
      </article>
    `,
  ).join("");

  return `
    <h1>🎓 ÑANDE Academy</h1>
    <p>De no saber qué es una terminal a resolver laboratorios avanzados.
    Todo dentro del mundo virtual, explicado paso a paso.</p>
    <p>La ruta tiene ${academy.count()} niveles y ${tools.count()} herramientas.
    Empezá por el Nivel 0 y seguí el orden.</p>

    <h2>🧪 Lecciones guiadas — aprendé haciendo</h2>
    <p>Cada lección te lleva paso a paso usando herramientas reales contra
    un laboratorio. El sistema verifica que lo hiciste y te explica por qué.</p>
    ${lessons}

    <h2>📚 Ruta de cursos</h2>
    ${items}
  `;
}

function renderCourse(
  academy: Academy,
  tools: SecurityTools,
  id: string,
): string {
  const course = academy.get(id);

  if (!course) {
    return `<h1>Curso no encontrado</h1><p><a href="/">← Volver</a></p>`;
  }

  const toolList = course.tools
    .map((toolId) => tools.get(toolId))
    .filter((tool): tool is ToolDef => tool !== undefined)
    .map(
      (tool) =>
        `<li><a href="https://tools.nande/tool/${tool.id}">${escapeHtml(tool.name)}</a> — ${escapeHtml(tool.simple)}</li>`,
    )
    .join("");

  const topics = course.topics
    .map((topic) => `<li>${escapeHtml(topic)}</li>`)
    .join("");

  const labs = course.labs.length
    ? `<article><h2>Laboratorios para practicar</h2><ul>${course.labs
        .map((lab) => `<li>${escapeHtml(lab)}</li>`)
        .join("")}</ul></article>`
    : "";

  const requires = course.requires.length
    ? `<p>🔒 Antes conviene: ${course.requires
        .map(
          (req) => `<a href="/course/${req}">${escapeHtml(req)}</a>`,
        )
        .join(", ")}</p>`
    : "";

  return `
    <h1>${LEVEL_ICON[course.level] ?? ""} ${escapeHtml(course.title)}</h1>
    <p>${escapeHtml(course.simple)}</p>
    ${requires}

    <article>
      <h2>Qué vas a aprender</h2>
      <p>${escapeHtml(course.summary)}</p>
      <ul>${topics}</ul>
    </article>

    ${toolList ? `<article><h2>Herramientas</h2><ul>${toolList}</ul></article>` : ""}
    ${labs}

    <p><a href="/">← Volver a la ruta</a></p>
  `;
}

/** Sitio tools.nande: catálogo y ficha de cada herramienta. */
export function renderToolsSite(
  tools: SecurityTools,
  path: string,
): string | undefined {
  const toolMatch = path.match(/^\/tool\/([\w-]+)$/);

  if (toolMatch) {
    return renderTool(tools, toolMatch[1]);
  }

  if (path !== "/") {
    return undefined;
  }

  const byCategory = tools
    .categories()
    .map((category) => {
      const items = tools
        .byCategory(category)
        .map(
          (tool) => `
            <li>
              <a href="/tool/${tool.id}">${escapeHtml(tool.name)}</a>
              ${tool.runnable ? "▶" : "📖"}
              — ${escapeHtml(tool.simple)}
            </li>
          `,
        )
        .join("");

      return `<article><h2>${escapeHtml(category)}</h2><ul>${items}</ul></article>`;
    })
    .join("");

  return `
    <h1>🧰 ÑANDE Toolbox</h1>
    <p>${tools.count()} herramientas de seguridad, cada una explicada desde cero.
    ▶ se puede ejecutar en el laboratorio · 📖 es ficha de estudio.</p>
    <p>Todo apunta solo a objetivos virtuales (10.10.x.y, *.nande, *.lab).</p>
    ${byCategory}
  `;
}

function renderTool(
  tools: SecurityTools,
  id: string,
): string {
  const tool = tools.get(id);

  if (!tool) {
    return `<h1>Herramienta no encontrada</h1><p><a href="/">← Volver</a></p>`;
  }

  return `
    <h1>${escapeHtml(tool.name)} ${tool.runnable ? "▶" : "📖"}</h1>
    <p><strong>Nivel:</strong> ${escapeHtml(tool.level)} ·
       <strong>Categoría:</strong> ${escapeHtml(tool.category)}</p>

    <article>
      <h2>Para entenderlo fácil</h2>
      <p>${escapeHtml(tool.simple)}</p>
    </article>

    <article>
      <h2>Qué hace</h2>
      <p>${escapeHtml(tool.whatItDoes)}</p>
      <h2>Por qué existe</h2>
      <p>${escapeHtml(tool.whyExists)}</p>
      <h2>Cuándo se usa</h2>
      <p>${escapeHtml(tool.whenToUse)}</p>
      <h2>Qué significa el resultado</h2>
      <p>${escapeHtml(tool.resultMeaning)}</p>
    </article>

    <article>
      <h2>🛡️ Cómo se detecta su uso</h2>
      <p>${escapeHtml(tool.howToDetect)}</p>
      <h2>🛡️ Cómo defenderse</h2>
      <p>${escapeHtml(tool.howToDefend)}</p>
    </article>

    <article>
      <h2>Probalo</h2>
      <p>En la Terminal de ÑANDE:</p>
      <p><code>${escapeHtml(tool.usage)}</code></p>
      ${
        tool.runnable
          ? "<p>Esta herramienta se ejecuta contra el laboratorio virtual.</p>"
          : "<p>Ficha de estudio: todavía no ejecutable en ÑANDE.</p>"
      }
    </article>

    <p><a href="/">← Volver a la caja de herramientas</a></p>
  `;
}
