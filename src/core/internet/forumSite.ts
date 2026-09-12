import type { VirtualPerson } from "../world/WorldEngine";

/**
 * foro.nande — un foro navegable del mundo (Foro Tapé). Los hilos y las
 * respuestas se generan de forma determinista a partir de los habitantes y
 * sus intereses: es contenido "real" del mundo, no texto escrito a mano.
 * Se recorre como cualquier sitio: portada con hilos, y cada hilo con sus
 * respuestas.
 */

function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

const TEMPLATES = [
  "¿Alguien más tuvo problemas con {tema}?",
  "Guía rápida de {tema} para principiantes",
  "Mi experiencia aprendiendo {tema}",
  "Duda sobre {tema}, ¿me ayudan?",
  "Lo que ojalá me hubieran dicho de {tema}",
  "Recursos gratis para {tema}",
];

const REPLIES = [
  "A mí me pasó lo mismo, lo resolví reiniciando el servicio.",
  "Buenísimo el aporte, justo lo necesitaba.",
  "Ojo con eso, revisá los permisos primero.",
  "¿Probaste mirar los logs? Ahí suele estar la pista.",
  "Gracias, me sirvió un montón.",
  "Yo lo hago distinto, después paso mi método.",
  "Cuidado que eso en producción puede romper todo.",
  "+1, me sumo a la duda.",
];

interface Thread {
  id: string;
  title: string;
  author: string;
  replies: { author: string; text: string }[];
  views: number;
}

function buildThreads(people: VirtualPerson[]): Thread[] {
  if (people.length === 0) return [];
  const threads: Thread[] = [];
  const count = Math.min(18, people.length);
  for (let i = 0; i < count; i += 1) {
    const p = people[(i * 41) % people.length];
    const s = seedOf(p.id + ":foro");
    const tema = (p.interests && p.interests[s % Math.max(1, p.interests.length)]) || "tecnología";
    const title = pick(TEMPLATES, s).replace("{tema}", tema);
    const nReplies = 1 + (s % 4);
    const replies = [];
    for (let r = 0; r < nReplies; r += 1) {
      const other = people[(i * 41 + r * 7 + 3) % people.length];
      replies.push({ author: other.name, text: pick(REPLIES, seedOf(p.id + r)) });
    }
    threads.push({
      id: `t${i}`,
      title,
      author: p.name,
      replies,
      views: 12 + (s % 900),
    });
  }
  return threads;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pageWrap(title: string, body: string): string {
  return `<div class="nande-site"><h1>🗣️ Foro Tapé</h1><p class="lab-sim-banner">🎓 SIMULACRO EDUCATIVO · foro ficticio · ningún dato sale de tu dispositivo</p>${body}<p class="site-foot">${esc(title)}</p></div>`;
}

/** Renderiza la portada del foro o un hilo. Devuelve HTML o undefined (404). */
export function renderForum(
  people: VirtualPerson[],
  path: string,
): string | undefined {
  const threads = buildThreads(people);

  if (path === "/" || path === "") {
    const rows = threads
      .map(
        (t) =>
          `<li><a href="/t/${t.id}">${esc(t.title)}</a><br>` +
          `<small>por ${esc(t.author)} · ${t.replies.length} respuestas · ${t.views} vistas</small></li>`,
      )
      .join("");
    return pageWrap("Foro Tapé", `<p>Últimos hilos de la comunidad:</p><ul class="forum-list">${rows}</ul>`);
  }

  const m = path.match(/^\/t\/(t\d+)$/);
  if (m) {
    const t = threads.find((x) => x.id === m[1]);
    if (!t) return undefined;
    const replies = t.replies
      .map((r) => `<li><strong>${esc(r.author)}:</strong> ${esc(r.text)}</li>`)
      .join("");
    return pageWrap(
      t.title,
      `<h2>${esc(t.title)}</h2><p><small>iniciado por ${esc(t.author)} · ${t.views} vistas</small></p>` +
        `<ul class="forum-thread">${replies}</ul>` +
        `<p><a href="/">← Volver al foro</a></p>`,
    );
  }

  return undefined;
}
