import type { WorldRegistry } from "../world/WorldRegistry";
import type { VirtualResource } from "../internet/VirtualInternet";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Repos base del ecosistema Git virtual. */
const SEED_REPOS = [
  { id: "nande-os", name: "nande-os", owner: "ÑANDE", desc: "El sistema operativo virtual de ÑANDE.", stars: 342 },
  { id: "security-labs", name: "security-labs", owner: "Pytã", desc: "Laboratorios de seguridad para practicar.", stars: 210 },
  { id: "ctf-framework", name: "ctf-framework", owner: "Arandu", desc: "Marco para armar retos CTF.", stars: 156 },
  { id: "nande-scanner", name: "nande-scanner", owner: "Yvoty", desc: "Escáner de puertos educativo.", stars: 98 },
];

interface Repo {
  id: string;
  name: string;
  owner: string;
  desc: string;
  stars: number;
}

function reposFrom(registry: WorldRegistry): Repo[] {
  // Las herramientas, apps y repos que crean los habitantes se listan acá.
  const fromWorld: Repo[] = registry
    .all()
    .filter((e) => ["tool", "app", "repository", "project"].includes(e.type))
    .slice(-20)
    .map((e) => ({
      id: e.id,
      name: e.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      owner: e.metadata.ownerName ?? e.ownerId,
      desc: e.description,
      stars: (e.id.length * 13) % 200,
    }));

  return [...SEED_REPOS, ...fromWorld];
}

/** Resuelve las páginas de git.nande. */
export function renderGitSite(
  registry: WorldRegistry,
  path: string,
): VirtualResource | undefined {
  const html = (content: string): VirtualResource => ({
    path,
    mimeType: "text/html",
    content,
  });

  const repos = reposFrom(registry);

  if (path === "/") {
    const items = repos
      .slice()
      .reverse()
      .map(
        (r) => `
          <article>
            <h2>📦 ${escapeHtml(r.name)}</h2>
            <p>${escapeHtml(r.desc)}</p>
            <p>por ${escapeHtml(r.owner)} · ⭐ ${r.stars}
               · <a href="/repo/${r.id}">abrir</a></p>
          </article>
        `,
      )
      .join("");

    return html(`
      <h1>💻 ÑANDE Git</h1>
      <p>Repositorios y herramientas del mundo virtual.
      ${repos.length} proyectos. Los habitantes suben los suyos.</p>
      ${items}
    `);
  }

  const match = path.match(/^\/repo\/([\w-]+)$/);
  if (match) {
    const repo = repos.find((r) => r.id === match[1]);
    if (!repo) return undefined;

    return html(`
      <h1>📦 ${escapeHtml(repo.name)}</h1>
      <p>por ${escapeHtml(repo.owner)} · ⭐ ${repo.stars} estrellas</p>
      <article>
        <h2>README</h2>
        <p>${escapeHtml(repo.desc)}</p>
        <p>Clonar (virtual): <code>git clone git.nande/${escapeHtml(repo.name)}</code></p>
      </article>
      <article>
        <h2>Archivos</h2>
        <ul>
          <li>README.md</li>
          <li>src/</li>
          <li>LICENSE</li>
        </ul>
      </article>
      <p><a href="/">← Volver a ÑANDE Git</a></p>
    `);
  }

  return undefined;
}
