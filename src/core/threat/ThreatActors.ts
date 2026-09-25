/**
 * ThreatActors — el registro ÚNICO de actores de amenaza del mundo (regla 2:
 * una sola fuente de verdad; regla 8: no duplicar). Antes había TRES listas
 * desconectadas de "adversarios": la que documenta el curso de Threat
 * Intelligence (ti.nande), la que ataca tu data center (ThreatEngine) y la que
 * corre kill-chains (RedTeamAgent) — con nombres inventados que NO estaban en la
 * base de TI, así que jamás podías ATRIBUIR un ataque real a un actor
 * documentado (lazo aprender↔jugar roto, regla 16).
 *
 * Ahora es una sola lista: el actor que te ataca (ThreatEngine / RedTeamAgent)
 * es exactamente el que aparece —con su infraestructura— en la plataforma de
 * inteligencia, de modo que la atribución del curso se apoya en ataques reales
 * del mundo. Actores 100% ficticios; IOCs con dominios .invalid (nunca reales).
 *
 * OJO: no confundir con RivalHackers, que son COMPETIDORES (peers del ranking
 * con los que competís/dueleás). Los actores de amenaza son el enemigo que
 * ataca infraestructura y que se defiende (Blue Team) y se atribuye (TI).
 */

export interface ThreatActor {
  id: string;
  /** Nombre en clave (como lo nombra el reporte de inteligencia). */
  nombre: string;
  /** Alias/handle con el que se lo conoce en los feeds. */
  alias: string;
  motivacion: string;
  /** Infraestructura conocida (IOCs): dominios/mutex .invalid, nunca reales. */
  infra: string[];
}

export const THREAT_ACTORS: ThreatActor[] = [
  {
    id: "gris-fantasma",
    nombre: "GRIS FANTASMA",
    alias: "GhostGrey",
    motivacion: "Ransomware con fines económicos.",
    infra: ["update.badcorp.invalid", "NANDE_LOCK", "pago.badcorp.invalid"],
  },
  {
    id: "lobo-azul",
    nombre: "LOBO AZUL",
    alias: "BlueWolf",
    motivacion: "Phishing y robo de credenciales.",
    infra: ["login-seguro.invalid", "correo-alertas.invalid"],
  },
  {
    id: "vibora-roja",
    nombre: "VÍBORA ROJA",
    alias: "RedViper",
    motivacion: "Espionaje: robo silencioso de información (APT).",
    infra: ["cdn-sync.invalid", "telemetry-node.invalid"],
  },
  {
    id: "kurupi",
    nombre: "KURUPÍ",
    alias: "Kurupi",
    motivacion: "Hacktivismo: defacement y filtraciones con mensaje.",
    infra: ["mirror-libre.invalid", "paste-anon.invalid"],
  },
];

/** Aliases de los actores (para quien sólo necesita el nombre del atacante). */
export function actorAliases(): string[] {
  return THREAT_ACTORS.map((a) => a.alias);
}

/** Busca un actor por alias o nombre (case-insensitive). */
export function findActor(nameOrAlias: string): ThreatActor | undefined {
  const q = nameOrAlias.trim().toLowerCase();
  return THREAT_ACTORS.find(
    (a) => a.alias.toLowerCase() === q || a.nombre.toLowerCase() === q,
  );
}
