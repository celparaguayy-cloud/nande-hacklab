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

/**
 * Consejos por dominio. Varios por área y con una palabra clave que los
 * dispara: así el experto responde a LO QUE preguntaste, no una sola frase
 * fija para todo. Si nada matchea, cae en el primero (el consejo general).
 */
const TIPS: Record<Domain, { key: RegExp; text: string }[]> = {
  cripto: [
    { key: /jwt|token|firma|none|alg/, text: "Revisá el JWT parte por parte: header, payload, firma. Si el header acepta alg:none o la clave es floja, lo forjás vos — probá `jwt crack <token>` y después `jwt forge`." },
    { key: /sal|salt/, text: "Con sal, el diccionario directo no alcanza: necesitás la sal y probar candidato+sal. Sin sal, un MD5/SHA cae en minutos con `crack`." },
    { key: /.*/, text: "Mirá bien el hash: si es MD5/SHA sin sal, es diccionario directo — `crack <hash>`. Un hash sin sal es una contraseña con un disfraz barato." },
  ],
  forense: [
    { key: /siem|correlac|buscar|query/, text: "En el SIEM filtrá por la IP sospechosa y ordená por hora. Lo que te interesa es la secuencia: qué pidió, en qué orden, y cuándo pasó de 401 a 200." },
    { key: /alerta|falso positivo|triage/, text: "La mayoría de las alertas son ruido (backups, health-checks, un usuario normal). La real muestra intención: muchos 401 seguidos y después un 200 en algo sensible." },
    { key: /.*/, text: "Armá una línea de tiempo con los eventos. Buscá la IP con muchos 401 seguidos y qué hizo justo después — ahí está el hilo." },
  ],
  programacion: [
    { key: /plantilla|template|ssti|saludo/, text: "Si tu texto se mete en una plantilla del servidor, probá una expresión como {{7*7}}: si te devuelve 49, tenés SSTI y podés ejecutar del lado server." },
    { key: /deserial|base64|sesión|sesion|cookie/, text: "Si la sesión viaja serializada (base64 que decodifica a un objeto), editá el rol adentro y volvé a codificar. El server confía en lo que le mandás." },
    { key: /xxe|xml|entidad/, text: "En un import de XML, declará una entidad externa que apunte a un archivo local: si el parser la resuelve, te lee el archivo. Eso es XXE." },
    { key: /.*/, text: "¿Dónde entra tu input al código? Plantillas, deserialización y consultas son los sospechosos de siempre. Seguí el dato desde el formulario hasta donde se ejecuta." },
  ],
  redes: [
    { key: /ssrf|url|fetch|metadata/, text: "En un SSRF la URL la pide el servidor, no vos: apuntá a algo interno que sólo él alcanza, como el endpoint de metadata 169.254.169.254." },
    { key: /pivot|interno|proxychains/, text: "A la red interna no llegás directo: tomás una máquina que sí la ve y pivoteás por ella — `proxychains` sobre el host ya comprometido." },
    { key: /sniff|arp|mitm|tráfico|trafico/, text: "Si el tráfico no va cifrado, se escucha. Poné a capturar y, si hace falta, envenená ARP para quedar en el medio — ahí caen credenciales en claro." },
    { key: /.*/, text: "Dibujá la red antes de tocar nada. ¿Qué segmento no ves directo? ¿Qué viaja sin cifrar? Ahí está la puerta." },
  ],
  linux: [
    { key: /suid|privesc|escalar|root/, text: "Para escalar, buscá binarios SUID con `find / -perm -4000 2>/dev/null` y cruzá cada uno con GTFOBins. Mirá también `sudo -l`." },
    { key: /traversal|lfi|include|\.\.\//, text: "Si un visor abre archivos por nombre, salí de su carpeta con ../ hasta /etc/passwd. Sin canonicalización, el path traversal funciona." },
    { key: /cmd|comando|shell|ping/, text: "Si tu texto va a un comando del sistema, encadená otro con ; o && — probá `127.0.0.1; whoami` y después `; cat flag`." },
    { key: /.*/, text: "`find / -perm -4000` para SUID, revisá `sudo -l`, y mirá qué archivos de config quedaron legibles. Linux perdona poco los permisos flojos." },
  ],
  investigacion: [
    { key: /osint|persona|perfil|red social|pulso/, text: "La gente filtra sola: en su perfil mirá mascota, trabajo, cumpleaños. Muchas contraseñas salen de ahí — probá esos datos en su sitio." },
    { key: /.*/, text: "No asumas. Observá qué hay, formulá una hipótesis, y buscá la evidencia que la CONTRADIGA. Si sobrevive, vas bien." },
  ],
};

/** Hash chico y determinista, para elegir sin depender del orden. */
function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** El consejo del dominio que mejor matchea lo que se preguntó. */
function tipFor(dom: Domain, topic: string): string {
  const t = topic.toLowerCase();
  const opciones = TIPS[dom];
  const matched = opciones.filter((o) => o.key.source !== ".*" && o.key.test(t));
  if (matched.length > 0) {
    return matched[hashOf(topic) % matched.length].text;
  }
  return opciones[opciones.length - 1].text; // el general
}

/** Recorta la pregunta para citarla sin que quede eterna. */
function eco(topic: string): string {
  const t = topic.trim().replace(/\s+/g, " ");
  return t.length > 48 ? `${t.slice(0, 46)}…` : t;
}

/** Qué dice un especialista sobre un tema (según sea o no lo suyo). */
export function adviceFrom(specialistId: string, topic: string): Advice | null {
  const sp = SPECIALISTS.find((s) => s.id === specialistId);
  if (!sp) return null;
  const dom = domainOf(topic);
  const tip = tipFor(dom, topic);
  const h = hashOf(`${specialistId}:${topic}`);
  if (sp.domain === dom) {
    return {
      specialist: sp,
      confidence: 82 + (h % 12), // 82–93: alta, y no siempre igual
      text: `Sobre "${eco(topic)}": ${tip}`,
    };
  }
  const experto = SPECIALISTS.find((s) => s.domain === dom)!;
  // Segunda opinión de verdad: el que NO es del tema aporta SU ángulo (su
  // dominio), no repite lo del experto. Por eso a veces "discrepan".
  const propio = tipFor(sp.domain, topic);
  return {
    specialist: sp,
    confidence: 30 + (h % 20), // 30–49: baja, deriva al que sabe
    text: `No es exactamente lo mío, pero desde ${sp.domain} lo miraría así: ${propio} — para "${eco(topic)}" el que más sabe es ${experto.name}.`,
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
