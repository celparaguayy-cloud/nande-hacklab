import { escapeHtml } from "../types";

/**
 * Cascarón visual compartido por las webs del laboratorio.
 *
 * Se mantiene aparte para que cada app se concentre en su lógica (y en su
 * vulnerabilidad), no en el maquetado.
 */
export function page(
  title: string,
  bodyHtml: string,
  options: { accent?: string; nav?: string } = {},
): string {
  const accent = options.accent ?? "#4fd1c5";

  return `
<!doctype html>
<article class="lab-site" style="--lab-accent:${accent}">
  <header class="lab-header">
    <strong>${escapeHtml(title)}</strong>
    ${options.nav ?? ""}
  </header>
  <div class="lab-body">
    ${bodyHtml}
  </div>
  <footer class="lab-footer">Laboratorio ÑANDE · entorno de práctica</footer>
</article>`.trim();
}

export function field(
  label: string,
  name: string,
  type = "text",
  value = "",
): string {
  return `
<label class="lab-field">
  <span>${escapeHtml(label)}</span>
  <input type="${type}" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />
</label>`.trim();
}

export function notice(text: string, tone: "ok" | "err" | "info" = "info"): string {
  return `<p class="lab-notice lab-notice--${tone}">${text}</p>`;
}
