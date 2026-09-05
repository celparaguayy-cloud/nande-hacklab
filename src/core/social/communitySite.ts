import type { Community } from "./Communities";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Portada de community.nande con el ranking de comunidades. */
export function renderCommunitiesFront(communities: Community[]): string {
  if (communities.length === 0) {
    return `<h1>👥 ÑANDE Comunidades</h1><p>El mundo recién empieza.</p>`;
  }

  const items = communities
    .map(
      (c) => `
        <article>
          <h2>${escapeHtml(c.name)}</h2>
          <p>${escapeHtml(c.description)}</p>
          <p>
            ${c.memberIds.length} miembros · tema: ${escapeHtml(c.topic)}
            · <a href="/c/${c.id}">entrar</a>
          </p>
        </article>
      `,
    )
    .join("");

  return `
    <h1>👥 ÑANDE Comunidades</h1>
    <p>Grupos de habitantes reunidos por interés. Crecen con el tiempo.</p>
    ${items}
  `;
}

/** Página de una comunidad. */
export function renderCommunity(community: Community): string {
  return `
    <h1>${escapeHtml(community.name)}</h1>
    <p>${escapeHtml(community.description)}</p>

    <article>
      <h2>Sobre esta comunidad</h2>
      <p>Tema: ${escapeHtml(community.topic)}</p>
      <p>Fundada por: ${escapeHtml(community.founderName)}</p>
      <p>Miembros: ${community.memberIds.length}</p>
      <p>Actividad: ${community.activity} interacciones</p>
    </article>

    <p><a href="/">← Volver a las comunidades</a></p>
  `;
}
