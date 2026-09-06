import { md5, sha256, guessAlgo } from "./hash";

/**
 * Crackeador de contraseñas de ÑANDE.
 *
 * Rompe un hash de verdad probando un diccionario (y variantes comunes)
 * contra MD5 o SHA-256. Enseña, jugando, por qué un hash sin sal es débil
 * y por qué la sal cambia todo: el mismo diccionario que revienta un MD5
 * pelado no sirve si no conocés la sal.
 */

/** Diccionario base: las contraseñas más usadas del mundo real. */
export const WORDLIST = [
  "123456", "password", "12345678", "qwerty", "123456789", "12345",
  "1234", "111111", "1234567", "dragon", "123123", "admin", "letmein",
  "welcome", "monkey", "login", "abc123", "starwars", "123321", "666666",
  "hola", "amor", "futbol", "boca", "river", "master", "shadow", "superman",
  "batman", "trustno1", "iloveyou", "sunshine", "princess", "football",
  "girasol", "qwerty123", "root", "toor", "changeme", "secret", "pass",
  "hunter2", "ninja", "hacker", "nande", "guarani", "paraguay", "asuncion",
];

export interface CrackResult {
  found: boolean;
  password?: string;
  algo: "md5" | "sha256" | "desconocido";
  /** Cuántos intentos hizo antes de encontrarla (o rendirse). */
  attempts: number;
  salted: boolean;
}

function hashWith(algo: "md5" | "sha256", text: string): string {
  return algo === "md5" ? md5(text) : sha256(text);
}

/** Variantes típicas de una palabra (leet, mayúscula, con año). */
function variants(word: string): string[] {
  const out = new Set<string>([word]);
  out.add(word[0]?.toUpperCase() + word.slice(1));
  out.add(word + "1");
  out.add(word + "123");
  out.add(word + "!");
  out.add(word + "2024");
  out.add(word.replace(/a/g, "@").replace(/o/g, "0").replace(/e/g, "3"));
  return [...out];
}

/**
 * Intenta romper un hash.
 *
 * @param salt  Si el hash es con sal, hay que pasarla. Sin ella, el mismo
 *              diccionario no lo rompe: esa es la lección.
 */
export function crack(
  hash: string,
  options: { salt?: string; wordlist?: string[] } = {},
): CrackResult {
  const target = hash.trim().toLowerCase();
  const algo = guessAlgo(target);
  const salt = options.salt ?? "";
  const list = options.wordlist ?? WORDLIST;

  if (algo === "desconocido") {
    return { found: false, algo, attempts: 0, salted: !!salt };
  }

  let attempts = 0;

  for (const word of list) {
    for (const candidate of variants(word)) {
      attempts += 1;
      // La sal se antepone, como en muchos esquemas reales.
      if (hashWith(algo, salt + candidate) === target) {
        return {
          found: true,
          password: candidate,
          algo,
          attempts,
          salted: !!salt,
        };
      }
    }
  }

  return { found: false, algo, attempts, salted: !!salt };
}

/**
 * Contraseña débil "de una persona", derivada de su nombre. La usan tanto
 * el sitio del habitante (la cuenta del dueño) como la red social (cuando
 * el NPC la filtra sin querer). Así, si la encontrás husmeando su feed,
 * esa misma clave te abre su sitio: ingeniería social que funciona de
 * verdad. Sale del diccionario para que también sea crackeable.
 */
export function weakPasswordFor(name: string): string {
  let h = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return WORDLIST[(h >>> 0) % WORDLIST.length];
}
