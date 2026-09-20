import { beforeEach, describe, expect, it } from "vitest";
import { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";
import { md5, sha256 } from "../crypto/hash";
import { resetStorage, seedRandom } from "../../test/setup";

/**
 * john / hashcat sobre el motor REAL de crackeo: los hashes se rompen de verdad
 * (md5/sha256), respetando formato/modo, diccionario, reglas y máscara. Nada
 * hardcodeado: el hash de un texto se calcula y se recupera el texto.
 */
describe("john / hashcat — crackeo real de hashes", () => {
  let kernel: VirtualKernel;
  let term: VirtualTerminal;
  beforeEach(() => { resetStorage(); seedRandom(); kernel = new VirtualKernel(); term = new VirtualTerminal(kernel); });

  it("hashid identifica MD5 y avisa la ambigüedad (MD5/NTLM)", () => {
    const out = term.execute(`hashid ${md5("password")}`);
    expect(out).toContain("MD5");
    expect(out).toContain("NTLM"); // 32 hex es ambiguo
  });

  it("hashcat -m 0 crackea un MD5 por diccionario", () => {
    const out = term.execute(`hashcat -m 0 ${md5("qwerty")} -w rockyou.txt`);
    expect(out).toContain("qwerty");
    expect(out).toContain("Cracked");
  });

  it("john --format=raw-sha256 crackea un SHA-256", () => {
    const out = term.execute(`john --format=raw-sha256 --wordlist=rockyou.txt ${sha256("dragon")}`);
    expect(out).toContain("dragon");
  });

  it("hashcat -a 3 (máscara) rompe un PIN de 4 dígitos por fuerza bruta", () => {
    const out = term.execute(`hashcat -m 0 -a 3 ${md5("4242")} ?d?d?d?d`);
    expect(out).toContain("4242");
  });

  it("el hash de desafío cae y captura la bandera", () => {
    // 2ab9...767 = MD5("hunter2"): el reto r-crack.
    term.execute("hashcat -m 0 2ab96390c7dbe3439de74d0c9b0b1767 -w rockyou.txt");
    expect(kernel.player.capturedFlags()).toContain("ND{hash_crackeado}");
  });

  it("un modo no soportado avisa en vez de mentir", () => {
    const out = term.execute(`hashcat -m 99999 ${md5("password")}`);
    expect(out).toMatch(/no soportado/i);
  });
});
