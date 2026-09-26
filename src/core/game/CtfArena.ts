/**
 * CtfArena — modo CTF contrarreloj. Te dan un objetivo (una IP con una falla
 * real), arranca el cronómetro, y ganás puntos por capturar su bandera rápido.
 * Reúne todos los labs que ya existen y agrega competencia y rejugabilidad.
 *
 * El puntaje y la tabla de mejores quedan guardados (localStorage). El reloj
 * es de tiempo real del jugador (inyectable para tests).
 */

import type { GeneratedChallenge, ForgeNivel } from "./CtfForge";

export type CtfNivel = "fácil" | "medio" | "difícil";

export interface CtfChallenge {
  ip: string;
  host: string;
  nivel: CtfNivel;
  flag: string;
  base: number;
  pista: string;
  /** Pistas de La Mani en escalera: empujón → técnica → comando exacto. */
  hints: string[];
  /** true si el reto lo fabricó el CtfForge (procedural, rejugable ∞). */
  procedural?: boolean;
  /** Arquetipo de la falla (sólo procedurales), para mostrarlo en la UI. */
  archetype?: string;
}

/** Genera un reto procedural fresco (mismo motor que el terminal `retos`). */
export type ProceduralProvider = (nivel: ForgeNivel | undefined, seed: number) => GeneratedChallenge;

/** Base de puntos por nivel (procedurales), alineada con el POOL curado. */
const BASE_POR_NIVEL: Record<CtfNivel, number> = { "fácil": 300, "medio": 500, "difícil": 800 };

/** Pistas escalonadas por arquetipo procedural: empujón → técnica → comando. */
function hintsFor(ch: GeneratedChallenge): string[] {
  const h = ch.hostname;
  switch (ch.archetype) {
    case "robots":
      return [
        "🥜 Todo pentest arranca con recon. ¿Qué archivo le dice a los buscadores qué NO indexar?",
        "🥜 Ese archivo lista rutas 'ocultas' en Disallow. Una de ellas tiene la bandera.",
        `🥜 Comando: curl http://${h}/robots.txt  y después pedí la ruta que aparece.`,
      ];
    case "backup":
      return [
        "🥜 Alguien dejó un backup olvidado. Probá nombres típicos.",
        "🥜 backup.txt o config.bak suelen filtrar rutas internas.",
        `🥜 Comando: curl http://${h}/backup.txt`,
      ];
    case "apiv1":
      return [
        "🥜 La API tiene versiones. La nueva pide auth… ¿y las viejas?",
        "🥜 Mirá qué versiones declara y pedí la vieja sin auth.",
        `🥜 Comando: curl http://${h}/api  → después curl http://${h}/api/v1/flag`,
      ];
    case "env":
      return [
        "🥜 Muchos deploys dejan archivos de entorno accesibles.",
        "🥜 Los dotfiles empiezan con un punto: .env guarda secretos.",
        `🥜 Comando: curl http://${h}/.env`,
      ];
    case "idor":
      return [
        "🥜 Los álbumes se abren por número: /album?id=1. ¿Y si probás otros?",
        "🥜 El del admin es un número bajo pero no el 1 (IDOR: acceso roto).",
        `🥜 Comando: for i en 2..9 → curl "http://${h}/album?id=<i>"`,
      ];
    case "hash":
      return [
        "🥜 La página filtró el md5 de la clave. Hay que crackearlo.",
        "🥜 Es una clave común: probá el diccionario. En ÑANDE Code tenés nande.wordlist() y nande.md5().",
        `🥜 Generá una tool que pruebe cada palabra, o logueate en http://${h}/login?pass=CLAVE`,
      ];
    default:
      return [`🥜 ${ch.clue}`, "🥜 Accedé al recurso real: la bandera se captura sola al verla.", `🥜 Empezá con: curl http://${h}/`];
  }
}

/** Convierte un reto del forge al formato de la Arena. */
function fromGenerated(ch: GeneratedChallenge): CtfChallenge {
  return {
    ip: ch.ip,
    host: ch.hostname,
    nivel: ch.nivel,
    flag: ch.flag,
    base: BASE_POR_NIVEL[ch.nivel],
    pista: ch.clue,
    hints: hintsFor(ch),
    procedural: true,
    archetype: ch.archetype,
  };
}

/** Bonus por racha (retos resueltos seguidos sin rendirse), tope 5. */
const STREAK_BONUS = 20;

export interface CtfScore {
  host: string;
  nivel: CtfNivel;
  seconds: number;
  score: number;
  /** Marca de tiempo (ms) en que se resolvió. */
  at: number;
  /** Bonus de racha aplicado a este puntaje. */
  streakBonus?: number;
  /** true si el reto era procedural. */
  procedural?: boolean;
}

const POOL: CtfChallenge[] = [
  {
    ip: "10.10.7.11", host: "blog.yvoty.nande", nivel: "fácil", flag: "ND{xss_reflejado}", base: 300,
    pista: "El buscador refleja lo que escribís sin filtrar (XSS).",
    hints: [
      "🥜 Fijate qué hace el buscador con lo que escribís: ¿lo muestra tal cual en la página?",
      "🥜 Si se muestra sin filtrar, metele una etiqueta <script>. Eso es XSS reflejado.",
      "🥜 Comando exacto: curl \"http://blog.yvoty.nande/buscar?q=<script>alert(1)</script>\"",
    ],
  },
  {
    ip: "10.10.7.12", host: "fotos.arandu.nande", nivel: "fácil", flag: "ND{idor_album_ajeno}", base: 300,
    pista: "Los álbumes se ven por ?id=. Cambiá el número (IDOR).",
    hints: [
      "🥜 Mirá cómo se abre un álbum: la URL lleva un ?id= con un número.",
      "🥜 Probá otros números: el servidor no chequea de quién es el álbum (IDOR). El del admin es el 7.",
      "🥜 Comando exacto: curl http://fotos.arandu.nande/album?id=7",
    ],
  },
  {
    ip: "10.10.7.13", host: "docs.tape.nande", nivel: "medio", flag: "ND{path_traversal_secreto}", base: 500,
    pista: "Salí de public/ con ../ (path traversal).",
    hints: [
      "🥜 El visor abre public/<archivo>. ¿Podés pedir un archivo de afuera de esa carpeta?",
      "🥜 Usá ../ para subir de directorio hasta la config con secretos.",
      "🥜 Comando exacto: curl \"http://docs.tape.nande/ver?archivo=../config/secrets.env\"",
    ],
  },
  {
    ip: "10.10.7.14", host: "tools.pyta.nande", nivel: "medio", flag: "ND{cmd_injection_pwned}", base: 500,
    pista: "Encadená otro comando con ; (inyección de comandos).",
    hints: [
      "🥜 El host que ponés va a un comando del sistema (ping). ¿Y si agregás otro comando?",
      "🥜 Encadená con ; para ejecutar algo tuyo, como leer la bandera.",
      "🥜 Comando exacto: curl \"http://tools.pyta.nande/ping?host=127.0.0.1; cat flag\"",
    ],
  },
  {
    ip: "10.10.7.16", host: "api.vortex.nande", nivel: "difícil", flag: "ND{jwt_alg_none}", base: 800,
    pista: "La API acepta JWT con alg:none. Forjá rol admin.",
    hints: [
      "🥜 Mirá el token JWT que te da la API: tiene header, payload y firma.",
      "🥜 Si el header dice alg:none, la firma no se valida. Forjá uno con rol:admin.",
      "🥜 Entrá a api.vortex.nande, copiá el token 'none' que te deja listo y abrí /panel con él.",
    ],
  },
  {
    ip: "10.10.66.10", host: "caja.interna.nande", nivel: "difícil", flag: "ND{pivoting_red_interna}", base: 800,
    pista: "Interno: entrá a server.nande y pivotá.",
    hints: [
      "🥜 Esta caja no se ve desde tu red: es interna. Necesitás un puente.",
      "🥜 Entrá a server.nande (connect server.nande soporte Verano2024) y desde adentro escaneá con nmap.",
      "🥜 Comandos: connect caja.interna.nande admin GiraSol#2024  y luego  cat /root/flag.txt",
    ],
  },
];

/** Puntos que descuenta cada pista de La Mani usada en el reto. */
const HINT_PENALTY = 60;

const STORAGE_KEY = "nande-ctf";

interface ActiveRound {
  challenge: CtfChallenge;
  startedAt: number;
  hintsUsed: number;
}

export class CtfArena {
  private now: () => number;
  private active: ActiveRound | null = null;
  private board: CtfScore[] = [];
  private rngState = 0x1234abcd;
  private provider: ProceduralProvider | null = null;
  private streak = 0;

  constructor(
    now: () => number = () => Date.now(),
    opts: { procedural?: ProceduralProvider } = {},
  ) {
    this.now = now;
    this.provider = opts.procedural ?? null;
    this.board = this.load();
  }

  /** Conecta (o reemplaza) el generador procedural (lo hace el kernel). */
  setProceduralProvider(p: ProceduralProvider): void {
    this.provider = p;
  }

  /** ¿La Arena puede fabricar retos procedurales infinitos? */
  hasProcedural(): boolean {
    return this.provider != null;
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
    this.active = { challenge: pick, startedAt: this.now(), hintsUsed: 0 };
    return pick;
  }

  /**
   * Empieza un reto PROCEDURAL fresco: bandera real, host real, nmap-visible,
   * infinito y determinista por semilla. Es "todo el motor" dentro de la
   * Arena. Si no hay proveedor conectado, cae a un reto curado del POOL.
   */
  startProcedural(nivel?: CtfNivel): CtfChallenge {
    if (!this.provider) return this.start(nivel);
    const seed = ((this.now() >>> 0) ^ Math.floor(this.nextRng() * 0xffffffff)) >>> 0;
    const gen = this.provider(nivel as ForgeNivel | undefined, seed);
    const challenge = fromGenerated(gen);
    this.active = { challenge, startedAt: this.now(), hintsUsed: 0 };
    return challenge;
  }

  /** Racha actual de retos resueltos seguidos (sin rendirse). */
  currentStreak(): number {
    return this.streak;
  }

  /**
   * La Mani te da la siguiente pista del reto activo (escalera: empujón →
   * técnica → comando exacto). Cada pista descuenta puntos del resultado.
   * Devuelve el texto y cuántas quedan, o null si no hay reto o ya no hay más.
   */
  hint(): { text: string; used: number; remaining: number } | null {
    if (!this.active) return null;
    const hints = this.active.challenge.hints;
    if (this.active.hintsUsed >= hints.length) {
      return { text: "🥜 Ya te di todas las pistas. ¡Ahora es tuyo!", used: this.active.hintsUsed, remaining: 0 };
    }
    const text = hints[this.active.hintsUsed];
    this.active.hintsUsed += 1;
    return { text, used: this.active.hintsUsed, remaining: hints.length - this.active.hintsUsed };
  }

  hintsUsed(): number {
    return this.active?.hintsUsed ?? 0;
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
    this.streak = 0;
  }

  /**
   * Marca el reto activo como resuelto y registra el puntaje. Lo llama la UI
   * cuando detecta que la bandera del reto activo ya fue capturada.
   * Devuelve el puntaje, o null si no había reto activo.
   */
  solve(): CtfScore | null {
    if (!this.active) return null;
    const seconds = this.elapsed();
    // Bonus por racha: usa la racha ANTES de este reto (el primero no suma).
    const streakBonus = Math.min(this.streak, 5) * STREAK_BONUS;
    const score = Math.max(
      10,
      this.active.challenge.base - seconds - this.active.hintsUsed * HINT_PENALTY + streakBonus,
    );
    const entry: CtfScore = {
      host: this.active.challenge.host,
      nivel: this.active.challenge.nivel,
      seconds,
      score,
      at: this.now(),
      streakBonus,
      procedural: this.active.challenge.procedural,
    };
    this.streak += 1;
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
