/**
 * Bots especialistas de ÑANDE (compañeros virtuales).
 *
 * No son omniscientes ni infalibles: cada uno sabe de LO SUYO. Si le
 * preguntás algo de su área, te da una pista con alta confianza; si no es lo
 * suyo, te deriva al que sabe o arriesga una hipótesis con menos confianza.
 * Y a propósito pueden discrepar: en una investigación, dos expertos ven
 * cosas distintas. Enseña a contrastar fuentes, no a obedecer una sola.
 */

export type Domain =
  | "cripto"
  | "forense"
  | "programacion"
  | "redes"
  | "linux"
  | "investigacion";

export interface Specialist {
  id: string;
  name: string;
  emoji: string;
  domain: Domain;
  /** Cómo es (una línea de personalidad). */
  persona: string;
}

export const SPECIALISTS: Specialist[] = [
  { id: "cipher", name: "Cipher", emoji: "🔐", domain: "cripto", persona: "Obsesiva con las matemáticas. Desconfía de todo hash sin sal." },
  { id: "trace", name: "Trace", emoji: "🧵", domain: "forense", persona: "Paciente. Cree que los logs siempre cuentan la verdad si sabés leerlos." },
  { id: "byte", name: "Byte", emoji: "💾", domain: "programacion", persona: "Rápido y algo arrogante. Ve bugs donde otros ven features." },
  { id: "nova", name: "Nova", emoji: "🛰️", domain: "redes", persona: "Metódica. Dibuja la topología antes de tocar nada." },
  { id: "root", name: "Root", emoji: "🐧", domain: "linux", persona: "Veterano de terminal. Habla en comandos." },
  { id: "echo", name: "Echo", emoji: "🔎", domain: "investigacion", persona: "Curiosa. Pregunta '¿y por qué?' hasta el final." },
];

/** A qué dominio pertenece un tema/pista (por palabras clave). */
export function domainOf(topic: string): Domain {
  const t = topic.toLowerCase();
  if (/cripto|hash|crack|jwt|cifr|clave|firma/.test(t)) return "cripto";
  if (/forense|log|siem|dfir|incidente|alerta|timeline/.test(t)) return "forense";
  if (/ssti|deserial|xxe|nosql|código|codigo|plantilla|programa|api/.test(t)) return "programacion";
  if (/red|sniff|arp|wifi|pivot|ssrf|puerto|dns|mitm/.test(t)) return "redes";
  if (/linux|privesc|traversal|lfi|cmd|suid|permiso|shell|archivo/.test(t)) return "linux";
  return "investigacion";
}

export interface Advice {
  specialist: Specialist;
  confidence: number; // 0-100
  text: string;
  /** Si deriva a otro especialista. */
  defersTo?: string;
}

/** Consejo puntual de un dominio (lo que diría el experto de esa área). */
const TIPS: Record<Domain, string> = {
  cripto: "Mirá el hash: si es MD5/SHA sin sal, es diccionario. Si hay un JWT, revisá la firma y el algoritmo (¿acepta 'none'?).",
  forense: "Ordená los eventos en una línea de tiempo. Buscá la IP con muchos 401 seguidos y qué hizo justo después.",
  programacion: "¿Dónde entra tu input al código? Plantillas, deserialización y consultas son los sospechosos de siempre.",
  redes: "Dibujá la red. ¿Qué segmento no ves directo? ¿Qué viaja sin cifrar? Ahí está la puerta.",
  linux: "find / -perm -4000 para SUID, revisá sudo -l, y mirá qué archivos de config quedaron legibles.",
  investigacion: "No asumas. Observá qué hay, formulá una hipótesis, buscá evidencia que la contradiga.",
};

/** Qué dice un especialista sobre un tema (según sea o no lo suyo). */
export function adviceFrom(specialistId: string, topic: string): Advice | null {
  const sp = SPECIALISTS.find((s) => s.id === specialistId);
  if (!sp) return null;
  const dom = domainOf(topic);
  if (sp.domain === dom) {
    return { specialist: sp, confidence: 85, text: TIPS[sp.domain] };
  }
  const experto = SPECIALISTS.find((s) => s.domain === dom)!;
  return {
    specialist: sp,
    confidence: 35,
    text: `No es lo mío, pero tiraría por acá: ${TIPS[sp.domain]}`,
    defersTo: experto.name,
  };
}

/** El experto del tema + una segunda opinión (que puede discrepar). */
export function consult(topic: string): { experto: Advice; segundaOpinion: Advice } {
  const dom = domainOf(topic);
  const experto = SPECIALISTS.find((s) => s.domain === dom)!;
  // La segunda opinión la da Echo (investigación) salvo que el experto ya sea Echo.
  const otro = experto.id === "echo" ? SPECIALISTS.find((s) => s.id === "trace")! : SPECIALISTS.find((s) => s.id === "echo")!;
  return {
    experto: adviceFrom(experto.id, topic)!,
    segundaOpinion: adviceFrom(otro.id, topic)!,
  };
}
