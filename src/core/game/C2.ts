/**
 * C2 / botnet educativo (20-cambios #18) — 100% simulado.
 *
 * NO hay malware, ni red real, ni infraestructura de mando: es un panel
 * conceptual que arma tu "botnet" con las máquinas que ya comprometiste EN
 * EL JUEGO (labs resueltos) y te muestra dos cosas a la vez: cómo un atacante
 * coordina bots por un canal de mando… y, sobre todo, cómo el Blue Team lo
 * detecta. Todo dentro del sandbox de ÑANDE, sin capacidad operativa.
 *
 * Es data pura y determinista: la UI solo lo muestra.
 */

export interface Bot {
  id: string;
  host: string;
  os: string;
  /** Cada cuántos segundos "llama a casa" (beacon). Regular = detectable. */
  beaconSec: number;
  online: boolean;
}

const OS_POOL = ["Linux 5.x", "Windows Server", "Debian", "Ubuntu", "Router embebido"];

function hashNum(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Arma la botnet a partir de lo comprometido: cada laboratorio resuelto y
 * cada toma de cuenta suma un "bot" (una máquina ficticia bajo tu control).
 */
export function buildBotnet(solvedLabs: string[], flags: string[]): Bot[] {
  const fuentes = [
    ...solvedLabs.map((id) => ({ key: id, host: id })),
    ...flags
      .filter((f) => /^ND\{acceso:(.+)\}$/.test(f))
      .map((f) => {
        const slug = f.match(/^ND\{acceso:(.+)\}$/)![1];
        return { key: f, host: `${slug}.nande` };
      }),
  ];

  return fuentes.map((src, i) => {
    const h = hashNum(src.key);
    return {
      id: `bot-${i}`,
      host: src.host,
      os: OS_POOL[h % OS_POOL.length],
      // Beacon regular (30/60/120s): justamente lo que lo delata.
      beaconSec: [30, 60, 120][h % 3],
      online: h % 5 !== 0, // ~80% online
    };
  });
}

export interface C2Task {
  id: string;
  nombre: string;
  /** Qué muestra (descripción conceptual, no un comando real). */
  resultado: string;
}

export const C2_TASKS: C2Task[] = [
  { id: "recon", nombre: "Reconocer", resultado: "El bot reporta su hostname, usuario y red interna. (Recon: entender dónde caíste.)" },
  { id: "listar", nombre: "Listar procesos", resultado: "Lista de procesos y servicios del equipo. (Enumeración: qué corre y qué se puede aprovechar.)" },
  { id: "pivotear", nombre: "Buscar vecinos", resultado: "Descubre otras máquinas de la red interna alcanzables desde este bot. (Movimiento lateral.)" },
  { id: "dormir", nombre: "Bajar el beacon", resultado: "El bot llama a casa con MENOS frecuencia y con intervalos irregulares. (Evasión: romper el patrón regular que te delata.)" },
];

export function runTask(bot: Bot, taskId: string): string {
  const t = C2_TASKS.find((x) => x.id === taskId);
  if (!t) return "Tarea desconocida.";
  return `[${bot.host}] ${t.resultado}`;
}

/**
 * El lado que importa: cómo te CAZAN. La señal principal de un C2 es el
 * "beaconing": conexiones periódicas y regulares al mismo destino. Detectar
 * ese patrón es el trabajo del defensor.
 */
export const DETECTION_OPTIONS: { id: string; texto: string; correcta: boolean }[] = [
  { id: "beacon", texto: "Conexiones periódicas y regulares al mismo destino (beaconing)", correcta: true },
  { id: "cpu", texto: "Un pico de CPU aislado", correcta: false },
  { id: "login", texto: "Un único login exitoso", correcta: false },
  { id: "disco", texto: "El disco a medio llenar", correcta: false },
];

/** ¿Identificó bien la señal que delata al C2? */
export function checkDetection(optionId: string): boolean {
  return DETECTION_OPTIONS.find((o) => o.id === optionId)?.correcta === true;
}

/** Nivel de "ruido" de la botnet: más bots y beacons regulares = más detectable. */
export function detectionRisk(bots: Bot[]): { nivel: "bajo" | "medio" | "alto"; nota: string } {
  const regulares = bots.filter((b) => b.beaconSec <= 60 && b.online).length;
  if (regulares >= 4) return { nivel: "alto", nota: "Muchos beacons regulares: un SIEM te detecta enseguida." };
  if (regulares >= 1) return { nivel: "medio", nota: "Hay patrón de beacon: bajá la frecuencia y aleatorizá (jitter)." };
  return { nivel: "bajo", nota: "Poco ruido. Igual, todo canal de mando deja rastro." };
}
