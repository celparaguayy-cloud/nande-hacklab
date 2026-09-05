import type { HackerGroups } from "./HackerGroups";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Portada de groups.nande. */
export function renderGroupsFront(groups: HackerGroups): string {
  const memberOf = groups.memberOf();

  const items = groups
    .all()
    .map((g) => {
      const mine = g.id === memberOf ? " ✅ (sos parte)" : "";
      return `
        <article>
          <h2>${g.tag} ${escapeHtml(g.name)}${mine}</h2>
          <p>${escapeHtml(g.description)}</p>
          <p>${g.members} miembros · reputación ${g.reputation}
             · <a href="/g/${g.id}">ver grupo</a></p>
        </article>
      `;
    })
    .join("");

  const ops = groups
    .recentOps(8)
    .map((o) => `<li>${escapeHtml(o.text)} <small>(tick ${o.tick})</small></li>`)
    .join("");

  return `
    <h1>🕶️ Grupos hacker de ÑANDE</h1>
    <p>Colectivos de hackers éticos: equipos rojos y azules, gente de CTF y
    activistas de privacidad. Todo legal y dentro del sandbox.</p>
    ${items}
    ${ops ? `<h2>Actividad reciente</h2><ul>${ops}</ul>` : ""}
  `;
}

/** Página de un grupo, con opción de unirse. */
export function renderGroup(groups: HackerGroups, id: string): string | undefined {
  const g = groups.get(id);
  if (!g) return undefined;

  const mine = groups.memberOf() === id;

  return `
    <h1>${g.tag} ${escapeHtml(g.name)}</h1>
    <article>
      <p>${escapeHtml(g.description)}</p>
      <p>Miembros: ${g.members} · Reputación: ${g.reputation}</p>
      <p>Enfoque: ${escapeHtml(g.focus)}</p>
    </article>
    ${
      mine
        ? `<p>✅ Ya sos parte de este grupo. <a href="/leave/${g.id}">salir</a></p>`
        : g.recruiting
        ? `<p><a href="/join/${g.id}">➕ Unirme a ${escapeHtml(g.name)}</a></p>`
        : `<p>Este grupo no está reclutando ahora.</p>`
    }
    <p><a href="/">← Volver a los grupos</a></p>
  `;
}
