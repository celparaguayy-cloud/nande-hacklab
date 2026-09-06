/**
 * JWT de ÑANDE (HS256), didáctico.
 *
 * Un JSON Web Token es base64url(header).base64url(payload).firma. La firma
 * HS256 es HMAC-SHA256 de "header.payload" con una clave secreta. Si esa
 * clave es débil, el token se falsifica: cambiás el payload (rol: admin),
 * lo re-firmás con la clave adivinada, y el servidor te cree. Ese es el
 * laboratorio. Todo sobre nuestra SHA-256 pura, offline y determinista.
 */

import { sha256Raw } from "./hash";

/** Cadena → bytes UTF-8. */
function utf8Bytes(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i += 1) {
    const c = str.charCodeAt(i);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return out;
}

function hexToBytes(hex: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hex.length; i += 2) out.push(parseInt(hex.slice(i, i + 2), 16));
  return out;
}

/** HMAC-SHA256 (RFC 2104) sobre bytes; devuelve bytes. */
function hmacSha256(key: number[], message: number[]): number[] {
  const blockSize = 64;
  let k = key.length > blockSize ? hexToBytes(sha256Raw(key)) : [...key];
  while (k.length < blockSize) k.push(0);

  const oKeyPad = k.map((b) => b ^ 0x5c);
  const iKeyPad = k.map((b) => b ^ 0x36);

  const inner = hexToBytes(sha256Raw([...iKeyPad, ...message]));
  return hexToBytes(sha256Raw([...oKeyPad, ...inner]));
}

// Base64 propio (sin Buffer ni btoa) para funcionar igual en el navegador
// y en las pruebas, sobre bytes crudos.
const B64 =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : B64[b2 & 63];
  }
  return out;
}

function base64ToBytes(b64: string): number[] {
  const clean = b64.replace(/=+$/, "");
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const val = B64.indexOf(ch);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return out;
}

function base64url(bytes: number[]): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlToStr(part: string): string {
  const bytes = base64ToBytes(part.replace(/-/g, "+").replace(/_/g, "/"));
  // Decodifica UTF-8.
  return decodeUtf8(bytes);
}

function decodeUtf8(bytes: number[]): string {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
    } else if (b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else {
      out += String.fromCharCode(
        ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f),
      );
      i += 3;
    }
  }
  return out;
}

export interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

export function decodeJwt(token: string): JwtParts | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return {
      header: JSON.parse(base64urlToStr(parts[0])),
      payload: JSON.parse(base64urlToStr(parts[1])),
      signature: parts[2],
    };
  } catch {
    return null;
  }
}

export function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
): string {
  const h = base64url(utf8Bytes(JSON.stringify(header)));
  const p = base64url(utf8Bytes(JSON.stringify(payload)));
  const sig = base64url(hmacSha256(utf8Bytes(secret), utf8Bytes(`${h}.${p}`)));
  return `${h}.${p}.${sig}`;
}

export function verifyJwt(token: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const expected = base64url(
    hmacSha256(utf8Bytes(secret), utf8Bytes(`${parts[0]}.${parts[1]}`)),
  );
  return expected === parts[2];
}

/** Adivina la clave HS256 de un token probando un diccionario. */
export function crackJwtSecret(token: string, wordlist: string[]): string | null {
  for (const secret of wordlist) {
    if (verifyJwt(token, secret)) return secret;
  }
  return null;
}
