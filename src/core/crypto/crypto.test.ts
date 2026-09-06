import { describe, expect, it } from "vitest";
import { md5, sha256 } from "./hash";
import { crack } from "./cracker";
import { decodeJwt, signJwt, verifyJwt, crackJwtSecret } from "./jwt";

describe("crackeo de contraseñas real", () => {
  it("rompe un MD5 sin sal de una contraseña común", () => {
    const hash = md5("girasol");
    const r = crack(hash);
    expect(r.found).toBe(true);
    expect(r.password).toBe("girasol");
  });

  it("rompe una variante (Password1) por reglas", () => {
    const hash = md5("password1");
    const r = crack(hash);
    expect(r.found).toBe(true);
  });

  it("el mismo diccionario NO rompe el hash si tiene sal desconocida", () => {
    const hash = md5("s4l-secreta" + "girasol");
    expect(crack(hash).found).toBe(false);
  });

  it("con la sal correcta, sí lo rompe (lección de la sal)", () => {
    const salt = "s4l-secreta";
    const hash = md5(salt + "girasol");
    const r = crack(hash, { salt });
    expect(r.found).toBe(true);
    expect(r.password).toBe("girasol");
  });

  it("también rompe SHA-256", () => {
    const r = crack(sha256("qwerty"));
    expect(r.found).toBe(true);
    expect(r.password).toBe("qwerty");
  });
});

describe("JWT falsificable", () => {
  const secret = "nande"; // clave débil, está en la wordlist

  it("firma y verifica correctamente", () => {
    const t = signJwt({ user: "rocio", rol: "cliente" }, secret);
    expect(verifyJwt(t, secret)).toBe(true);
    expect(verifyJwt(t, "otra-clave")).toBe(false);
  });

  it("un token válido se decodifica", () => {
    const t = signJwt({ user: "rocio", rol: "cliente" }, secret);
    const parts = decodeJwt(t);
    expect(parts?.payload.rol).toBe("cliente");
  });

  it("ataque completo: crackear la clave y forjar un admin", () => {
    // El servidor emite este token con una clave débil.
    const legit = signJwt({ user: "rocio", rol: "cliente" }, secret);

    // 1) El atacante adivina la clave por diccionario.
    const found = crackJwtSecret(legit, ["123456", "admin", "nande", "root"]);
    expect(found).toBe("nande");

    // 2) Con la clave, forja un token de admin que el servidor acepta.
    const forged = signJwt({ user: "rocio", rol: "admin" }, found!);
    expect(verifyJwt(forged, secret)).toBe(true);
    expect(decodeJwt(forged)?.payload.rol).toBe("admin");
  });
});
