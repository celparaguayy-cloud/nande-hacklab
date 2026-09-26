/**
 * CompromiseLog — la ÚNICA fuente de verdad sobre "qué hosts comprometió EL
 * JUGADOR" en el mundo de ÑANDE (regla maestra 2: hosts, sesiones y COMPROMISOS
 * tienen una sola fuente central, nada de estados paralelos contradictorios).
 *
 * Antes esa realidad vivía SÓLO en la sesión del terminal (remoteHost /
 * remoteStack): al salir de la sesión se perdía, no había forma de responder
 * "¿qué máquinas tengo?" (regla 15) y sistemas como el panel C2 fingían la
 * botnet con una lista PARALELA (labs resueltos + un formato de bandera) que no
 * coincidía con los hosts que el jugador realmente tomó pivotando por la LAN.
 *
 * Acá el compromiso es estado REAL y persistente del mundo: se registra cuando
 * el jugador entra a un host de verdad (connect/ssh con credenciales válidas),
 * sube a "root" cuando escala privilegios de verdad (sudo/GTFOBins) y acumula el
 * botín (banderas) que sacó de cada host. Es data pura y determinista; el
 * terminal lo llena, y netmap, C2, las estadísticas y el grafo lo LEEN (nadie
 * mantiene una copia). 100% dentro del sandbox: no hay red real ni acceso
 * remoto de verdad, sólo el registro de lo que pasó en el mundo virtual.
 */

export type AccessLevel = "user" | "root";

export interface Compromise {
  hostname: string;
  ip: string;
  os: string;
  /** Última cuenta con la que se accedió (root si se escaló). */
  user: string;
  /** Máximo nivel de acceso logrado en este host (nunca baja). */
  level: AccessLevel;
  /** Host desde el que se pivoteó para tomarlo; null = red del jugador. */
  via: string | null;
  /** Tick del primer compromiso y del acceso más reciente. */
  firstTick: number;
  lastTick: number;
  /** Botín (banderas/loot) recolectado en este host, sin duplicados. */
  loot: string[];
}

export interface RecordInput {
  hostname: string;
  ip: string;
  os: string;
  user: string;
  level: AccessLevel;
  via: string | null;
}

export class CompromiseLog {
  private map = new Map<string, Compromise>();
  private now: () => number;

  constructor(now: () => number = () => 0) {
    this.now = now;
  }

  private key(ref: string): string {
    return ref.toLowerCase();
  }

  /**
   * Registra (o actualiza) el compromiso de un host. Si ya estaba tomado:
   * refresca el acceso (lastTick, cuenta y ruta usada) y SUBE el nivel si el
   * nuevo es mayor, pero nunca lo baja (una vez root, sigue root). Idempotente:
   * re-conectarse al mismo host no crea entradas duplicadas.
   */
  record(input: RecordInput): Compromise {
    const k = this.key(input.hostname);
    const tick = this.now();
    const prev = this.map.get(k);
    if (prev) {
      prev.lastTick = tick;
      prev.user = input.user;
      prev.via = input.via;
      if (input.level === "root") prev.level = "root";
      // Mantener el ip/os más recientes conocidos (por si cambian de fuente).
      prev.ip = input.ip || prev.ip;
      prev.os = input.os || prev.os;
      return prev;
    }
    const entry: Compromise = {
      hostname: input.hostname,
      ip: input.ip,
      os: input.os,
      user: input.user,
      level: input.level,
      via: input.via,
      firstTick: tick,
      lastTick: tick,
      loot: [],
    };
    this.map.set(k, entry);
    return entry;
  }

  /** Sube el acceso de un host ya comprometido a root (escalada real). */
  upgradeToRoot(ref: string): boolean {
    const c = this.map.get(this.key(ref));
    if (!c) return false;
    c.level = "root";
    c.user = "root";
    c.lastTick = this.now();
    return true;
  }

  /** Suma una bandera/loot al host, sin duplicar. Devuelve si era nueva. */
  addLoot(ref: string, flag: string): boolean {
    const c = this.map.get(this.key(ref));
    if (!c || !flag) return false;
    if (c.loot.includes(flag)) return false;
    c.loot.push(flag);
    c.lastTick = this.now();
    return true;
  }

  get(ref: string): Compromise | undefined {
    return this.map.get(this.key(ref));
  }

  has(ref: string): boolean {
    return this.map.has(this.key(ref));
  }

  /** Todos los compromisos, ordenados por cuándo caíste (y nombre). */
  all(): Compromise[] {
    return [...this.map.values()].sort(
      (a, b) => a.firstTick - b.firstTick || a.hostname.localeCompare(b.hostname),
    );
  }

  /** Nombres de host comprometidos (para que otros sistemas deriven de acá). */
  hostnames(): string[] {
    return this.all().map((c) => c.hostname);
  }

  count(): number {
    return this.map.size;
  }

  rootCount(): number {
    let n = 0;
    for (const c of this.map.values()) if (c.level === "root") n += 1;
    return n;
  }

  /** Total de botín recolectado en todos los hosts. */
  lootCount(): number {
    let n = 0;
    for (const c of this.map.values()) n += c.loot.length;
    return n;
  }

  reset(): void {
    this.map.clear();
  }
}
