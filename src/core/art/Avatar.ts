/**
 * Avatar — imágenes REALES generadas por código. Cada habitante tiene un
 * avatar de pixel-art determinista (mismo id → misma cara), dibujado como SVG
 * y devuelto como data URI. No hay archivos externos (respeta el aislamiento y
 * la CSP): la imagen se genera en el dispositivo. Da al mundo caras de verdad,
 * no sólo texto y emojis.
 */

/** Hash determinista simple (FNV-1a) para derivar la cara de un id. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const SKIN = ["#f2c9a0", "#e0a878", "#c68642", "#8d5524", "#ffdbac", "#d99a6c"];
const HAIR = ["#2b2b2b", "#5a3825", "#8b5a2b", "#1a1a1a", "#6b4226", "#3b2f2f", "#a55d35"];
const BG = ["#1e3a5f", "#3b2f5e", "#0e5a4a", "#5e2f4a", "#42506b", "#5e4630", "#2f5e4a"];

/**
 * Devuelve un avatar SVG (data URI) determinista para un id. Es una carita
 * pixel-art 8x8 simétrica: fondo, pelo, piel, ojos y una sonrisa. Reproducible.
 */
export function avatarDataUri(seed: string, size = 64): string {
  const h = hash(seed);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const bg = BG[(h >> 6) % BG.length];
  const px = 8;
  const cell = size / px;
  const rects: string[] = [];
  const put = (x: number, y: number, c: string) =>
    rects.push(`<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${c}"/>`);

  // Cara base (filas 1..7, columnas 1..6) piel.
  for (let y = 1; y <= 6; y += 1) for (let x = 1; x <= 6; x += 1) put(x, y, skin);
  // Pelo arriba (fila 0..1).
  for (let x = 1; x <= 6; x += 1) put(x, 0, hair);
  put(1, 1, hair); put(6, 1, hair);
  // Flequillo variable según el hash (simétrico).
  if (h & 1) { put(2, 1, hair); put(5, 1, hair); }
  // Ojos (fila 3).
  put(2, 3, "#101418"); put(5, 3, "#101418");
  // Sonrisa (fila 5).
  put(2, 5, "#7a4a3a"); put(3, 5, "#7a4a3a"); put(4, 5, "#7a4a3a"); put(5, 5, "#7a4a3a");
  // Mejillas si el hash lo indica.
  if (h & 2) { put(1, 4, "#e08a7a"); put(6, 4, "#e08a7a"); }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="${bg}"/>` +
    rects.join("") +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
