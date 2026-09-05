import type { WorldEntity } from "../world/WorldRegistry";

/**
 * Programas funcionales de las creaciones de los habitantes.
 *
 * Cuando un habitante (bot) publica una herramienta, app o juego, no es
 * solo un nombre: acá se le genera un mini-programa que de verdad hace
 * algo. El comportamiento se deriva del id de la entidad, así que cada
 * creación es distinta pero siempre igual a sí misma (determinista).
 *
 * Todo corre dentro del sandbox: son funciones puras sobre su entrada, sin
 * red, disco ni ejecución de código externo.
 */

export type ProgramKind =
  | "texto"
  | "numero"
  | "generador"
  | "juego"
  | "utilidad";

export interface CreationProgram {
  kind: ProgramKind;
  /** Etiqueta corta de qué tipo de programa es. */
  label: string;
  /** Ayuda de uso. */
  help: string;
  /** Ejecuta el programa con argumentos del usuario. */
  run: (args: string[]) => string;
}

/** Hash estable del id, para elegir comportamiento. */
function seed(entity: WorldEntity): number {
  let hash = 0;

  for (let i = 0; i < entity.id.length; i++) {
    hash = (hash * 31 + entity.id.charCodeAt(i)) >>> 0;
  }

  return hash;
}

// ---- Bloques de comportamiento reutilizables ----

function caesar(text: string, shift: number): string {
  return text.replace(/[a-záéíóúñ]/gi, (ch) => {
    const lower = ch.toLowerCase();
    const idx = "abcdefghijklmnopqrstuvwxyz".indexOf(lower);

    if (idx < 0) {
      return ch;
    }

    const rotated = "abcdefghijklmnopqrstuvwxyz"[(idx + shift + 26) % 26];

    return ch === lower ? rotated : rotated.toUpperCase();
  });
}

function simpleHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(h, 31) + text.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const TEXT_TOOLS: Array<{
  label: string;
  help: string;
  fn: (input: string) => string;
}> = [
  {
    label: "invertir texto",
    help: "run <id> <texto> — devuelve el texto al revés",
    fn: (s) => s.split("").reverse().join(""),
  },
  {
    label: "MAYÚSCULAS",
    help: "run <id> <texto> — pasa el texto a mayúsculas",
    fn: (s) => s.toUpperCase(),
  },
  {
    label: "contar palabras",
    help: "run <id> <texto> — cuenta palabras y caracteres",
    fn: (s) => {
      const words = s.trim() ? s.trim().split(/\s+/).length : 0;
      return `${words} palabras, ${s.length} caracteres`;
    },
  },
  {
    label: "cifrado César",
    help: "run <id> <texto> — cifra con desplazamiento 3",
    fn: (s) => caesar(s, 3),
  },
  {
    label: "huella (hash)",
    help: "run <id> <texto> — calcula una huella del texto",
    fn: (s) => simpleHash(s),
  },
];

const GENERATORS: Array<{
  label: string;
  help: string;
  fn: (seedValue: number, args: string[]) => string;
}> = [
  {
    label: "generador de contraseñas",
    help: "run <id> [largo] — genera una contraseña ficticia",
    fn: (s, args) => {
      const len = Math.min(32, Math.max(6, Number(args[0]) || 12));
      const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let out = "";
      let state = s;
      for (let i = 0; i < len; i++) {
        state = (Math.imul(state, 1103515245) + 12345) >>> 0;
        out += chars[state % chars.length];
      }
      return out;
    },
  },
  {
    label: "generador de nombres",
    help: "run <id> — inventa un nombre de proyecto",
    fn: (s) => {
      const a = ["Nova", "Cyber", "Ñande", "Data", "Cripto", "Neo", "Pyta"];
      const b = ["Core", "Lab", "Net", "Forge", "Guard", "Byte", "Sync"];
      return `${a[s % a.length]}${b[(s >>> 3) % b.length]}`;
    },
  },
  {
    label: "dado virtual",
    help: "run <id> [caras] — tira un dado",
    fn: (_s, args) => {
      const faces = Math.max(2, Number(args[0]) || 6);
      const roll = 1 + Math.floor(Math.random() * faces);
      return `🎲 ${roll} (de ${faces})`;
    },
  },
];

const GAMES: Array<{
  label: string;
  help: string;
  fn: (args: string[]) => string;
}> = [
  {
    label: "piedra, papel o tijera",
    help: "run <id> piedra|papel|tijera",
    fn: (args) => {
      const opts = ["piedra", "papel", "tijera"];
      const you = args[0]?.toLowerCase();

      if (!you || !opts.includes(you)) {
        return "Elegí: run <id> piedra | papel | tijera";
      }

      const cpu = opts[Math.floor(Math.random() * 3)];
      const wins: Record<string, string> = {
        piedra: "tijera",
        papel: "piedra",
        tijera: "papel",
      };

      const result =
        you === cpu ? "empate" : wins[you] === cpu ? "¡ganaste!" : "perdiste";

      return `Vos: ${you} · Máquina: ${cpu} → ${result}`;
    },
  },
  {
    label: "adiviná el número",
    help: "run <id> <1-100> — adiviná el número secreto",
    fn: (args) => {
      // El secreto depende del día del intento para que cambie, pero sea
      // consistente dentro de una tirada de pistas.
      const guess = Number(args[0]);

      if (!guess || guess < 1 || guess > 100) {
        return "Adiviná un número del 1 al 100: run <id> <n>";
      }

      const secret = 1 + Math.floor(Math.random() * 100);

      if (guess === secret) {
        return `🎯 ${secret}: ¡acertaste!`;
      }

      return guess < secret
        ? `${guess} es muy bajo. Probá más alto.`
        : `${guess} es muy alto. Probá más bajo.`;
    },
  },
  {
    label: "la fortuna del día",
    help: "run <id> — recibí un mensaje de la suerte",
    fn: () => {
      const fortunes = [
        "Hoy tu código compila a la primera.",
        "Un bug viejo se resuelve solo.",
        "Alguien va a estrellar tu proyecto... con cariño.",
        "El escaneo revela un puerto inesperado.",
        "Buen día para aprender algo nuevo.",
      ];
      return `🔮 ${fortunes[Math.floor(Math.random() * fortunes.length)]}`;
    },
  },
];

/**
 * Genera el programa funcional de una creación según su tipo e id.
 * tool → utilidad de texto; app → generador; game → mini-juego.
 */
export function programFor(entity: WorldEntity): CreationProgram | undefined {
  const s = seed(entity);

  if (entity.type === "tool") {
    const tool = TEXT_TOOLS[s % TEXT_TOOLS.length];

    return {
      kind: "texto",
      label: tool.label,
      help: tool.help,
      run: (args) =>
        args.length
          ? tool.fn(args.join(" "))
          : `${tool.label}\n${tool.help}`,
    };
  }

  if (entity.type === "app") {
    const gen = GENERATORS[s % GENERATORS.length];

    return {
      kind: "generador",
      label: gen.label,
      help: gen.help,
      run: (args) => gen.fn(s, args),
    };
  }

  if (entity.type === "game") {
    const game = GAMES[s % GAMES.length];

    return {
      kind: "juego",
      label: game.label,
      help: game.help,
      run: (args) => game.fn(args),
    };
  }

  // project u otros: sin programa ejecutable.
  return undefined;
}

/** Etiqueta corta del programa para la vitrina, sin ejecutarlo. */
export function programLabel(entity: WorldEntity): string | undefined {
  return programFor(entity)?.label;
}
