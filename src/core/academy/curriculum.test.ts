import { describe, expect, it } from "vitest";
import { CURSOS } from "./Curriculum";

/**
 * Anti-mock del currículo: los cursos interactivos tienen que estar BIEN
 * FORMADOS para que el reproductor (CoursePlayer) y los dibujos (ConceptArt)
 * no se rompan en runtime. Un curso mal armado (una pieza que falta, un id de
 * dibujo inventado, un quiz sin respuesta correcta) rompe la experiencia sin
 * que TypeScript lo note. Este test es la red de seguridad.
 */

// Deben coincidir EXACTAMENTE con DiagramId (courseTypes.ts) y con ART (ConceptArt.tsx).
const VALID_DIAGRAMS = new Set([
  "internet", "dominio", "ip", "puerto", "dns", "protocolo", "url", "capas",
  "escaneo", "handshake", "fuerzabruta", "inyeccion", "wifi", "escudo",
  "terminal", "archivo", "hash", "cookie", "firewall", "phishing", "vpn",
  "xss", "privesc", "osint",
  // Segunda tanda: una imagen enfocada por concepto (menos repetición).
  "exploit", "payload", "adgrafo", "kerberos", "pth", "spray", "sniffer",
  "crackhash", "directorios", "subdominios", "mitm", "pivot", "traversal",
  "idor", "ssrf", "cmdi", "jwt", "siem", "reversing", "contenedor",
]);

// Deben coincidir con GlyphName (Glyph.tsx).
const VALID_GLYPHS = new Set([
  "star", "target", "flame", "sprout", "book", "search", "mask", "gem",
  "crown", "eye", "drop", "dice", "code", "wallet", "medal", "bell", "heart",
  "comment", "trend", "person", "nandu",
]);

const VALID_SKILLS = new Set([
  "linux", "redes", "web", "pentesting", "blue-team", "forense", "cripto", "osint",
]);

const VALID_LEVELS = new Set(["principiante", "intermedio", "avanzado"]);

/** ¿El multiconjunto `pieces` contiene todos los tokens de `answer`? */
function piecesCoverAnswer(pieces: string[], answer: string[]): boolean {
  const pool = new Map<string, number>();
  for (const p of pieces) pool.set(p, (pool.get(p) ?? 0) + 1);
  for (const a of answer) {
    const n = pool.get(a) ?? 0;
    if (n <= 0) return false;
    pool.set(a, n - 1);
  }
  return true;
}

describe("Currículo interactivo — cursos bien formados", () => {
  it("hay una buena cantidad de cursos", () => {
    expect(CURSOS.length).toBeGreaterThanOrEqual(3);
  });

  it("los ids de curso son únicos", () => {
    const ids = CURSOS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const c of CURSOS) {
    describe(`curso ${c.id}`, () => {
      it("tiene metadatos válidos", () => {
        expect(c.id, "id").toMatch(/^c-[a-z0-9-]+$/);
        expect(c.title.length, "title").toBeGreaterThan(0);
        expect(c.subtitle.length, "subtitle").toBeGreaterThan(0);
        expect(VALID_LEVELS.has(c.level), `level ${c.level}`).toBe(true);
        expect(VALID_SKILLS.has(c.skill), `skill ${c.skill}`).toBe(true);
        expect(VALID_GLYPHS.has(c.glyph), `glyph ${c.glyph}`).toBe(true);
        expect(c.hue, "hue").toBeGreaterThanOrEqual(0);
        expect(c.hue, "hue").toBeLessThanOrEqual(360);
        expect(c.reward.xp, "xp").toBeGreaterThan(0);
        expect(c.reward.coins, "coins").toBeGreaterThanOrEqual(0);
      });

      it("es un curso COMPLETO (no una lección de un paso)", () => {
        expect(c.slides.length, "cantidad de pantallas").toBeGreaterThanOrEqual(6);
        const kinds = new Set(c.slides.map((s) => s.kind));
        // Un curso de verdad mezcla explicar + evaluar + practicar.
        expect(kinds.size, "variedad de tipos de pantalla").toBeGreaterThanOrEqual(3);
      });

      c.slides.forEach((s, i) => {
        it(`pantalla ${i + 1} (${s.kind}) es válida`, () => {
          if (s.kind === "concept") {
            expect(s.title.length, "title").toBeGreaterThan(0);
            expect(s.body.length, "body").toBeGreaterThan(0);
            if (s.diagram) expect(VALID_DIAGRAMS.has(s.diagram), `diagram ${s.diagram}`).toBe(true);
          } else if (s.kind === "quiz") {
            expect(s.prompt.length, "prompt").toBeGreaterThan(0);
            expect(s.options.length, "options").toBeGreaterThanOrEqual(2);
            expect(s.correct, "correct index").toBeGreaterThanOrEqual(0);
            expect(s.correct, "correct index").toBeLessThan(s.options.length);
            expect(s.explain.length, "explain").toBeGreaterThan(0);
            if (s.diagram) expect(VALID_DIAGRAMS.has(s.diagram), `diagram ${s.diagram}`).toBe(true);
          } else if (s.kind === "build") {
            expect(s.goal.length, "goal").toBeGreaterThan(0);
            expect(s.answer.length, "answer").toBeGreaterThanOrEqual(1);
            expect(s.pieces.length, "pieces").toBeGreaterThanOrEqual(s.answer.length);
            expect(
              piecesCoverAnswer(s.pieces, s.answer),
              `las piezas deben contener toda la respuesta: ${JSON.stringify(s.answer)}`,
            ).toBe(true);
            expect(s.hint.length, "hint").toBeGreaterThan(0);
            expect(s.explain.length, "explain").toBeGreaterThan(0);
          } else {
            // lab
            expect(s.title.length, "title").toBeGreaterThan(0);
            expect(s.body.length, "body").toBeGreaterThan(0);
            expect(s.command.length, "command").toBeGreaterThan(0);
            expect(s.explain.length, "explain").toBeGreaterThan(0);
            if (s.diagram) expect(VALID_DIAGRAMS.has(s.diagram), `diagram ${s.diagram}`).toBe(true);
          }
        });
      });
    });
  }
});
