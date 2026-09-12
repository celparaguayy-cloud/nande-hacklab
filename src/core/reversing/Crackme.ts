/**
 * Crackme — motor de reversing (ingeniería inversa) del universo. No es un
 * acertijo de texto: la "desencriptación" es matemática REAL. Un crackme
 * guarda una bandera cifrada con XOR de un solo byte; el jugador ve el hexdump
 * (los bytes de verdad), deduce o fuerza la clave, y al aplicar el XOR correcto
 * la bandera aparece — porque el XOR se ejecuta de verdad, no porque haya un
 * texto guardado.
 *
 * Enseña la técnica clásica de reversing: reconocer un cifrado débil, hacer
 * fuerza bruta del espacio de claves (256) y validar por texto imprimible.
 * Todo determinista y sandboxeado.
 */

export interface XorResult {
  key: number;
  text: string;
  printable: boolean;
  looksLikeFlag: boolean;
}

export class Crackme {
  private cipher: number[];
  private realKey: number;
  readonly flag: string;
  readonly name: string;

  constructor(seed: number) {
    // Clave de un byte determinista (1..255, nunca 0 para que cifre).
    this.realKey = 1 + (Math.abs(seed * 2654435761) % 255);
    const tok = (Math.abs(seed * 40503) % 100000).toString().padStart(5, "0");
    this.flag = `ND{reversing_xor_${tok}}`;
    this.name = `crackme_${tok}`;
    this.cipher = [...this.flag].map((c) => c.charCodeAt(0) ^ this.realKey);
  }

  /** Hexdump del binario: los bytes cifrados REALES que ve el jugador. */
  hexdump(): string {
    const rows: string[] = [];
    for (let i = 0; i < this.cipher.length; i += 8) {
      const chunk = this.cipher.slice(i, i + 8);
      const hex = chunk.map((b) => b.toString(16).padStart(2, "0")).join(" ");
      const off = i.toString(16).padStart(4, "0");
      rows.push(`  ${off}:  ${hex.padEnd(23)}`);
    }
    return rows.join("\n");
  }

  /** Pistas de "desensamblado": qué operación protege la bandera. */
  disasm(): string {
    return [
      `; ${this.name} — check de la bandera`,
      `  load   data[]        ; ${this.cipher.length} bytes cifrados (ver hexdump)`,
      `  xor    data[i], KEY  ; KEY es un solo byte (0x01..0xff)`,
      `  cmp    result, "ND{" ; una bandera válida empieza con ND{`,
      `; Pista: sólo hay 256 claves. Probalas todas: reverse brute`,
    ].join("\n");
  }

  /** Aplica un XOR con la clave dada. Matemática real: byte ^ key. */
  decrypt(key: number): XorResult {
    const bytes = this.cipher.map((b) => b ^ (key & 0xff));
    const text = bytes.map((b) => String.fromCharCode(b)).join("");
    const printable = bytes.every((b) => b >= 32 && b < 127);
    const looksLikeFlag = /^ND\{[\x20-\x7e]+\}$/.test(text);
    return { key: key & 0xff, text, printable, looksLikeFlag };
  }

  /**
   * Fuerza bruta del espacio de claves (256): devuelve las que producen texto
   * imprimible con pinta de bandera. Es LA técnica de reversing para XOR.
   */
  bruteforce(): XorResult[] {
    const hits: XorResult[] = [];
    for (let k = 1; k <= 255; k += 1) {
      const r = this.decrypt(k);
      if (r.looksLikeFlag) hits.push(r);
    }
    return hits;
  }

  /** ¿Esta clave revela la bandera? (validación real). */
  isSolution(key: number): boolean {
    return this.decrypt(key).text === this.flag;
  }
}
