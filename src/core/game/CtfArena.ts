/**
 * CtfArena — modo CTF contrarreloj. Te dan un objetivo (una IP con una falla
 * real), arranca el cronómetro, y ganás puntos por capturar su bandera rápido.
 * Reúne todos los labs que ya existen y agrega competencia y rejugabilidad.
 *
 * El puntaje y la tabla de mejores quedan guardados (localStorage). El reloj
 * es de tiempo real del jugador (inyectable para tests).
 */

export type CtfNivel = "fácil" | "medio" | "difícil";

export interface CtfChallenge {
  ip: string;
  host: string;
  nivel: CtfNivel;
  flag: string;
  base: number;
  pista: string;
}

export interface CtfScore {
  host: string;
  nivel: CtfNivel;
  seconds: number;
  score: number;
  /** Marca de tiempo (ms) en que se resolvió. */
  at: number;
}

const POOL: CtfChallenge[] = [
  { ip: "10.10.7.11", host: "blog.yvoty.nande", nivel: "fácil", flag: "ND{xss_reflejado}", base: 300, pista: "El buscador refleja lo que escribís sin filtrar (XSS)." },
  { ip: "10.10.7.12", host: "fotos.arandu.nande", nivel: "fácil", flag: "ND{idor_album_ajeno}", base: 300, pista: "Los álbumes se ven por ?id=. Cambiá el número (IDOR)." },
  { ip: "10.10.7.13", host: "docs.tape.nande", nivel: "medio", flag: "ND{path_traversal_secreto}", base: 500, pista: "Salí de public/ con ../ (path traversal)." },
  { ip: "10.10.7.14", host: "tools.pyta.nande", nivel: "medio", flag: "ND{cmd_injection_pwned}", base: 500, pista: "Encadená otro comando con ; (inyección de comandos)." },
  { ip: "10.10.7.16", host: "api.vortex.nande", nivel: "difícil", flag: "ND{jwt_alg_none}", base: 800, pista: "La API acepta JWT con alg:none. Forjá rol admin." },
  { ip: "10.10.66.10", host: "caja.interna.nande", nivel: "difícil", flag: "ND{pivoting_red_interna}", base: 800, pista: "Interno: entrá a server.nande y pivotá." },
];

const STORAGE_KEY = "nande-ctf";

interface ActiveRound {
  challenge: CtfChallenge;
  startedAt: number;
}

export class CtfArena {
  private now: () => number;
  private active: ActiveRound | null = null;
  private board: CtfScore[] = [];
  private rngState = 0x1234abcd;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
    this.board = this.load();
  }

  private load(): CtfScore[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as CtfScore[];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.board.slice(0, 50)));
    } catch {
      /* sin persistencia */
    }
  }

  private nextRng(): number {
    this.rngState = (Math.imul(this.rngState, 1664525) + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  }

  /** Retos disponibles (opcionalmente filtrados por nivel). */
  challenges(nivel?: CtfNivel): CtfChallenge[] {
    return nivel ? POOL.filter((c) => c.nivel === nivel) : [...POOL];
  }

  /** Empieza un reto (aleatorio del nivel dado) y arranca el cronómetro. */
  start(nivel?: CtfNivel): CtfChallenge {
    const opciones = this.challenges(nivel);
    const pick = opciones[Math.floor(this.nextRng() * opciones.length)] ?? POOL[0];
    this.active = { challenge: pick, startedAt: this.now() };
    return pick;
  }

  current(): CtfChallenge | null {
    return this.active?.challenge ?? null;
  }

  /** Segundos transcurridos del reto activo. */
  elapsed(): number {
    if (!this.active) return 0;
    return Math.max(0, Math.floor((this.now() - this.active.startedAt) / 1000));
  }

  abandon(): void {
    this.active = null;
  }

  /**
   * Marca el reto activo como resuelto y registra el puntaje. Lo llama la UI
   * cuando detecta que la bandera del reto activo ya fue capturada.
   * Devuelve el puntaje, o null si no había reto activo.
   */
  solve(): CtfScore | null {
    if (!this.active) return null;
    const seconds = this.elapsed();
    const score = Math.max(10, this.active.challenge.base - seconds);
    const entry: CtfScore = {
      host: this.active.challenge.host,
      nivel: this.active.challenge.nivel,
      seconds,
      score,
      at: this.now(),
    };
    this.board.unshift(entry);
    this.board.sort((a, b) => b.score - a.score);
    this.board = this.board.slice(0, 50);
    this.save();
    this.active = null;
    return entry;
  }

  /** ¿La bandera del reto activo está entre las capturadas? */
  isSolved(capturedFlags: string[]): boolean {
    return this.active != null && capturedFlags.includes(this.active.challenge.flag);
  }

  leaderboard(limit = 10): CtfScore[] {
    return this.board.slice(0, limit);
  }

  best(): number {
    return this.board.reduce((m, s) => Math.max(m, s.score), 0);
  }

  clearBoard(): void {
    this.board = [];
    this.save();
  }
}
