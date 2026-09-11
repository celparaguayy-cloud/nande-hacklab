/**
 * Facciones de ÑANDE (§70).
 *
 * Cinco bandos con ideología propia. Tu "standing" con cada uno no se elige:
 * emerge de lo que HACÉS. Atacar te acerca a los ofensivos; defender, a los
 * guardianes; robar, a los mercenarios; aprender de todo, a la comunidad.
 * Algunos son incompatibles: subir con unos te baja con otros. Se calcula
 * de forma pura a partir de las banderas capturadas.
 */

export interface Faction {
  id: string;
  name: string;
  emoji: string;
  ideologia: string;
}

export const FACTIONS: Faction[] = [
  { id: "nightbyte", name: "NIGHTBYTE", emoji: "🌒", ideologia: "Colectivo descentralizado. La información quiere ser pública." },
  { id: "phantom", name: "PHANTOM GRID", emoji: "👻", ideologia: "Clandestinos. Demuestran las debilidades que otros ocultan." },
  { id: "sentinel", name: "SENTINEL", emoji: "🛡️", ideologia: "Defensores e investigadores. Proteger antes que romper." },
  { id: "blackcircuit", name: "BLACK CIRCUIT", emoji: "♠️", ideologia: "Mercenarios. Reputación, dinero y poder virtual." },
  { id: "opennode", name: "OPEN NODE", emoji: "🌐", ideologia: "Comunidad educativa. Aprender y enseñar en abierto." },
];

export type Tier = "enemigo" | "desconfianza" | "neutral" | "aliado" | "leyenda";

export interface FactionStanding {
  faction: Faction;
  score: number;
  tier: Tier;
}

function tierOf(score: number): Tier {
  if (score <= -20) return "enemigo";
  if (score < 0) return "desconfianza";
  if (score < 25) return "neutral";
  if (score < 60) return "aliado";
  return "leyenda";
}

/** Clasifica una bandera capturada por su "sabor". */
function saborDe(flag: string): "ofensiva" | "defensiva" | "botin" | "maestria" {
  if (/forense|soc_triage|siem_correlacion|dfir_timeline/.test(flag)) return "defensiva";
  if (/^ND\{acceso:/.test(flag) || /robar|heist/.test(flag)) return "botin";
  if (/blackbox_aprobado/.test(flag)) return "maestria";
  return "ofensiva";
}

/** Standing con cada facción a partir de las banderas capturadas. */
export function factionStandingFor(flags: string[]): FactionStanding[] {
  const s = { nightbyte: 0, phantom: 0, sentinel: 0, blackcircuit: 0, opennode: 0 };

  for (const f of flags) {
    const sabor = saborDe(f);
    s.opennode += 3; // aprender de cualquier cosa suma con la comunidad
    if (sabor === "ofensiva") {
      s.nightbyte += 5; s.phantom += 5; s.sentinel -= 2;
    } else if (sabor === "defensiva") {
      s.sentinel += 8; s.opennode += 2; s.phantom -= 2;
    } else if (sabor === "botin") {
      s.blackcircuit += 10; s.sentinel -= 5; s.nightbyte += 1;
    } else if (sabor === "maestria") {
      s.sentinel += 10; s.opennode += 10; s.nightbyte += 3;
    }
  }

  return FACTIONS.map((faction) => {
    const score = s[faction.id as keyof typeof s];
    return { faction, score, tier: tierOf(score) };
  });
}
