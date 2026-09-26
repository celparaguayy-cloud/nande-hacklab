/**
 * Protocolo del multijugador de COMUNIDAD de ÑANDE (mundo online opcional).
 *
 * Mensajes puros (JSON) entre el cliente y el servidor de la comunidad. Acá NO
 * hay red: sólo tipos y (de/)serialización, testeables sin conexión —igual que
 * el mapeo de mensajes del asistente IA—. La red real vive en el transporte.
 *
 * IMPORTANTE (seguridad, público con menores): el canal transporta SÓLO estado
 * del JUEGO (alias, presencia, ranking). Nada de PII, nada de datos del
 * dispositivo, y NADA de las herramientas ofensivas: el hacking sigue 100%
 * contra el sandbox. El alias es un apodo, no una identidad real.
 */

/** Un apodo saneado (sin PII): alfanumérico + . _ -, 3–20, en minúsculas. */
export function sanitizeAlias(raw: string): string {
  return (raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 20);
}

export function isValidAlias(alias: string): boolean {
  const a = sanitizeAlias(alias);
  return a.length >= 3 && a === alias.toLowerCase();
}

/* --------------------------------- cliente → servidor -------------------- */

export type ClientMsg =
  | { t: "hello"; alias: string }
  | { t: "hb"; alias: string } // heartbeat de presencia (identifica al emisor)
  | { t: "score"; alias: string; notoriety: number }
  | { t: "bye"; alias: string };

/* --------------------------------- servidor → cliente -------------------- */

export interface PresencePlayer {
  alias: string;
}
export interface BoardRow {
  alias: string;
  notoriety: number;
}

export type ServerMsg =
  | { t: "presence"; online: number; players: PresencePlayer[] }
  | { t: "board"; rows: BoardRow[] }
  | { t: "welcome"; alias: string };

/** Serializa un mensaje de cliente. Función pura. */
export function encodeClient(msg: ClientMsg): string {
  return JSON.stringify(msg);
}

/** Parsea un mensaje del servidor con validación defensiva (dato no confiable
 *  viene de la red). Devuelve null si no es un mensaje reconocible. */
export function decodeServer(raw: string): ServerMsg | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const m = data as Record<string, unknown>;
  switch (m.t) {
    case "welcome":
      return typeof m.alias === "string" ? { t: "welcome", alias: sanitizeAlias(m.alias) } : null;
    case "presence": {
      const players = Array.isArray(m.players)
        ? m.players
            .map((p) => (p && typeof (p as { alias?: unknown }).alias === "string" ? { alias: sanitizeAlias((p as { alias: string }).alias) } : null))
            .filter((p): p is PresencePlayer => p !== null)
        : [];
      return { t: "presence", online: typeof m.online === "number" ? m.online : players.length, players };
    }
    case "board": {
      const rows = Array.isArray(m.rows)
        ? m.rows
            .map((r) => {
              const rr = r as { alias?: unknown; notoriety?: unknown };
              return typeof rr.alias === "string" && typeof rr.notoriety === "number"
                ? { alias: sanitizeAlias(rr.alias), notoriety: rr.notoriety }
                : null;
            })
            .filter((r): r is BoardRow => r !== null)
        : [];
      return { t: "board", rows };
    }
    default:
      return null;
  }
}
