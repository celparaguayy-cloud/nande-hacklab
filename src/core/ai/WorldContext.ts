import type { VirtualKernel } from "../VirtualKernel";
import { HEAT_BUST } from "../game/Notoriety";

/**
 * WorldContext — el "snapshot" del mundo que Ñandú consulta para responder con
 * la verdad del runtime, NO con lo que se imagina (Spec §57-59). Es determinista
 * y sin red: lee de los runtimes que ya son la fuente de verdad (hosts, sesión,
 * misión, notoriedad, navegador). No duplica estado.
 *
 * Regla anti-alucinación: si un dato no está acá, Ñandú NO lo inventa. Sólo
 * incluimos hosts PÚBLICOS (los que se descubren por DNS/nmap igual): los
 * internos siguen ocultos hasta que el jugador los encuentra — eso protege el
 * juego y, de paso, impide que la IA "spoilee" o alucine máquinas.
 */

export interface CtxHost {
  hostname: string;
  ip: string;
  up: boolean;
  openPorts: { port: number; service: string }[];
}

export interface WorldContext {
  player: {
    name: string;
    level: number;
    wallet: number;
    notoriety: number;
    heat: number;
    heatMax: number;
    alignment: string;
  };
  mission: {
    chapter: number;
    title: string;
    nextObjective: string | null;
    finished: boolean;
  } | null;
  position: { site: string | null; anon: boolean };
  hosts: CtxHost[];
  tools: string[];
  ctf: { host: string; title: string } | null;
  world: { people: number; online: number };
}

/** Envuelve una lectura del runtime: si algo falla, devuelve un valor seguro. */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/** Comandos REALES del juego que Ñandú puede recomendar sin equivocarse. */
const KNOWN_COMMANDS = [
  "nmap", "sniff", "curl", "connect", "ssh", "ls", "cat", "cd", "pwd", "ps",
  "whoami", "ip", "nslookup", "jwt", "crack", "kerberoast", "nandeblood",
  "mitre", "dfir", "redteam", "opsec", "anon", "nandec", "reverse", "reto",
  "defensa", "missions", "universo", "run", "tool-list", "tool-install",
];

/** Construye el snapshot actual del mundo desde los runtimes-fuente. */
export function buildWorldContext(kernel: VirtualKernel): WorldContext {
  const player = safe(() => {
    const p = kernel.player.getState();
    const n = kernel.notoriety.getState();
    return {
      name: p.name,
      level: p.level,
      wallet: p.wallet,
      notoriety: n.notoriety,
      heat: Math.round(n.heat),
      heatMax: HEAT_BUST,
      alignment: n.alignment,
    };
  }, {
    name: "operador", level: 1, wallet: 0, notoriety: 0,
    heat: 0, heatMax: HEAT_BUST, alignment: "white",
  });

  const mission = safe<WorldContext["mission"]>(() => {
    const chapter = kernel.campaign.currentChapter();
    const state = kernel.campaign.getState();
    if (!chapter) return state.finished
      ? { chapter: 0, title: "Operación Génesis completada", nextObjective: null, finished: true }
      : null;
    const undone = chapter.objectives.find(
      (o) => !kernel.campaign.isObjectiveDone(o.id),
    );
    return {
      chapter: chapter.number,
      title: chapter.title,
      nextObjective: undone?.text ?? null,
      finished: false,
    };
  }, null);

  const position = safe(() => ({
    site: kernel.browser.currentSite() || null,
    anon: kernel.anonymity.isTorEnabled(),
  }), { site: null, anon: false });

  // Sólo hosts PÚBLICOS (discoverables). Nada interno ni oculto.
  const hosts = safe<CtxHost[]>(() => {
    return kernel.hosts
      .all()
      .filter((h) => kernel.hosts.isPublic(h.hostname))
      .map((h) => ({
        hostname: h.hostname,
        ip: h.ip,
        up: h.up,
        openPorts: h.services
          .filter((s) => s.state === "running" && !h.firewall.includes(s.port))
          .map((s) => ({ port: s.port, service: s.name })),
      }))
      .sort((a, b) => a.hostname.localeCompare(b.hostname));
  }, []);

  const ctf = safe<WorldContext["ctf"]>(() => {
    const c = kernel.ctf.current();
    if (!c) return null;
    return { host: c.host, title: (c as { title?: string }).title ?? c.host };
  }, null);

  const world = safe(() => ({
    people: kernel.worldEngine.getPeopleCount(),
    online: kernel.worldEngine.getOnlineCount(),
  }), { people: 0, online: 0 });

  return { player, mission, position, hosts, tools: KNOWN_COMMANDS, ctf, world };
}

/** ¿El mundo conoce este host? (para no inventar). Acepta hostname o IP. */
export function knowsHost(ctx: WorldContext, ref: string): boolean {
  const r = ref.toLowerCase().trim();
  return ctx.hosts.some((h) => h.hostname === r || h.ip === r);
}

/** Busca un host del contexto por hostname o IP. */
export function findHost(ctx: WorldContext, ref: string): CtxHost | null {
  const r = ref.toLowerCase().trim();
  return ctx.hosts.find((h) => h.hostname === r || h.ip === r) ?? null;
}

/** Lista legible de los hosts alcanzables (para responder de verdad). */
export function describeHosts(ctx: WorldContext): string {
  if (ctx.hosts.length === 0) return "Todavía no hay hosts públicos en tu radar.";
  const up = ctx.hosts.filter((h) => h.up);
  const lines = up.slice(0, 24).map((h) => {
    const ports = h.openPorts.length
      ? h.openPorts.map((p) => `${p.port}/${p.service}`).join(", ")
      : "sin puertos abiertos";
    return `• ${h.hostname} (${h.ip}) — ${ports}`;
  });
  const extra = up.length > 24 ? `\n…y ${up.length - 24} más.` : "";
  return `Hosts públicos que podés alcanzar ahora (${up.length}):\n${lines.join("\n")}${extra}`;
}

/**
 * Bloque de contexto compacto para el modelo conectado (Groq/OpenAI/…). Le da
 * la verdad del runtime para que responda sobre ESTE mundo y no alucine.
 */
export function worldContextPrompt(ctx: WorldContext): string {
  const parts: string[] = [];
  parts.push(
    `ESTADO ACTUAL DEL MUNDO (verdad del runtime — respondé SOLO con esto; ` +
      `si algo no está acá, decí que no está disponible, NO lo inventes):`,
  );
  parts.push(
    `Jugador: ${ctx.player.name}, nivel ${ctx.player.level}, N$${ctx.player.wallet}, ` +
      `notoriedad ${ctx.player.notoriety}, calor ${ctx.player.heat}/${ctx.player.heatMax} (${ctx.player.alignment}).`,
  );
  if (ctx.mission) {
    parts.push(
      ctx.mission.finished
        ? `Campaña: completada.`
        : `Misión: cap. ${ctx.mission.chapter} "${ctx.mission.title}". ` +
            `Próximo objetivo: ${ctx.mission.nextObjective ?? "—"}.`,
    );
  }
  parts.push(
    `Posición: ${ctx.position.site ? `navegando ${ctx.position.site}` : "sin sitio abierto"}, ` +
      `anonimato ${ctx.position.anon ? "ACTIVO" : "apagado"}.`,
  );
  if (ctx.ctf) parts.push(`Reto activo: ${ctx.ctf.title} (host ${ctx.ctf.host}).`);
  const hostList = ctx.hosts
    .filter((h) => h.up)
    .slice(0, 20)
    .map((h) => h.hostname)
    .join(", ");
  parts.push(`Hosts públicos alcanzables: ${hostList || "ninguno todavía"}.`);
  parts.push(`Comandos disponibles: ${ctx.tools.join(", ")}.`);
  return parts.join("\n");
}
