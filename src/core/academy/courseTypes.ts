/**
 * Tipos compartidos del currículo interactivo de ÑANDE.
 *
 * Viven en su propio archivo para que cada MÓDULO de cursos (redes, web, wifi,
 * blue team…) pueda importarlos sin depender del agregador `Curriculum.ts`, y
 * así los cursos se escriben y prueban por separado, sin pisarse.
 *
 * Reglas de oro del contenido (para que sea de verdad y siga siendo offline):
 *  - Las imágenes son `DiagramId` que la UI dibuja con SVG (ver ConceptArt.tsx).
 *    NUNCA URLs ni archivos externos: el juego funciona 100% sin internet.
 *  - Los `lab` apuntan a comandos y hosts REALES del mundo ÑANDE.
 */

import type { SkillId } from "../game/Progression";

/** Id de una ilustración que la UI dibuja con SVG (ver ConceptArt.tsx). */
export type DiagramId =
  | "internet"
  | "dominio"
  | "ip"
  | "puerto"
  | "dns"
  | "protocolo"
  | "url"
  | "capas"
  | "escaneo"
  | "handshake"
  | "fuerzabruta"
  | "inyeccion"
  | "wifi"
  | "escudo"
  | "terminal"
  | "archivo"
  | "hash"
  | "cookie"
  | "firewall"
  | "phishing"
  | "vpn"
  | "xss"
  | "privesc"
  | "osint"
  // Segunda tanda: una imagen enfocada por concepto (menos repetición).
  | "exploit"
  | "payload"
  | "adgrafo"
  | "kerberos"
  | "pth"
  | "spray"
  | "sniffer"
  | "crackhash"
  | "directorios"
  | "subdominios"
  | "mitm"
  | "pivot"
  | "traversal"
  | "idor"
  | "ssrf"
  | "cmdi"
  | "jwt"
  | "siem"
  | "reversing"
  | "contenedor";

/** Pantalla de explicación con un dibujo que hace visible la idea. */
export interface ConceptSlide {
  kind: "concept";
  title: string;
  body: string;
  diagram?: DiagramId;
  /** Puntos clave, en viñetas cortas. */
  bullets?: string[];
}

/** Pregunta de comprensión con opciones (una correcta). */
export interface QuizSlide {
  kind: "quiz";
  prompt: string;
  options: string[];
  /** Índice de la opción correcta. */
  correct: number;
  /** Por qué esa es la respuesta (se muestra al responder). */
  explain: string;
  diagram?: DiagramId;
}

/** Armar un comando tocando las piezas en el orden correcto. */
export interface BuildSlide {
  kind: "build";
  /** Qué se quiere lograr (el objetivo del comando). */
  goal: string;
  /** Piezas que se muestran para tocar (incluye la solución y a veces señuelos). */
  pieces: string[];
  /** La solución, en orden. Al unirla con espacios se obtiene el comando. */
  answer: string[];
  hint: string;
  /** Qué hace ese comando y por qué se arma así (al acertar). */
  explain: string;
}

/** Practicar de verdad en la terminal (o el navegador), con una herramienta real. */
export interface LabSlide {
  kind: "lab";
  title: string;
  body: string;
  /** Comando de ejemplo que se enviará a la terminal al practicar. */
  command: string;
  /** Qué debería ver/aprender el alumno al correrlo. */
  explain: string;
  diagram?: DiagramId;
}

export type Slide = ConceptSlide | QuizSlide | BuildSlide | LabSlide;

export interface Curso {
  id: string;
  title: string;
  /** Una línea de qué trata. */
  subtitle: string;
  level: "principiante" | "intermedio" | "avanzado";
  skill: SkillId;
  /** Tono del banner (0-360). La UI lo usa para el color del curso. */
  hue: number;
  /** Glifo del banner (nombre de Glyph válido). */
  glyph: string;
  reward: { xp: number; coins: number };
  slides: Slide[];
}
