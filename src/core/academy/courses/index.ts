/**
 * Agregador de los módulos de cursos del currículo ÑANDE. Cada tema vive en su
 * propio archivo para poder escribirse y probarse por separado. Curriculum.ts
 * suma estos a los cursos base.
 */

import type { Curso } from "../courseTypes";
import { LINUX_COURSES } from "./linux";
import { REDES_COURSES } from "./redes";
import { WEB_COURSES } from "./web";
import { PASSWORDS_COURSES } from "./passwords";
import { WIFI_COURSES } from "./wifi";
import { BLUE_COURSES } from "./blue";
import { OSINT_COURSES } from "./osint";
import { EXPLOTACION_COURSES } from "./explotacion";
import { AD_COURSES } from "./ad";
import { KILLCHAIN_COURSES } from "./killchain";
import { AD_AVANZADO_COURSES } from "./ad-avanzado";
import { DEFENSA_AVANZADA_COURSES } from "./defensa-avanzada";
import { OPERACIONES_RED_COURSES } from "./operaciones-red";
import { OT_COURSES } from "./ot";
import { FORENSE_COURSES } from "./forense";
import { CLOUD_COURSES } from "./cloud";
import { WEB_MODERNO_COURSES } from "./web-moderno";
import { ANONIMATO_AVANZADO_COURSES } from "./anonimato-avanzado";
import { REDES_AVANZADO_COURSES } from "./redes-avanzado";
import { PASSWORDS_AVANZADO_COURSES } from "./passwords-avanzado";

/** Orden pedagógico: de lo básico (Linux) a lo especializado y el capstone. */
export const EXTRA_CURSOS: Curso[] = [
  ...LINUX_COURSES,
  ...REDES_COURSES,
  ...WEB_COURSES,
  ...PASSWORDS_COURSES,
  ...WIFI_COURSES,
  ...BLUE_COURSES,
  ...OSINT_COURSES,
  ...EXPLOTACION_COURSES,
  ...AD_COURSES,
  ...KILLCHAIN_COURSES,
  // Tercera tanda: especializaciones avanzadas (para profesionales).
  ...AD_AVANZADO_COURSES,
  ...DEFENSA_AVANZADA_COURSES,
  ...OPERACIONES_RED_COURSES,
  ...OT_COURSES,
  ...FORENSE_COURSES,
  // Cuarta tanda: cloud native y DevSecOps (contenido actualizado 2024-2025).
  ...CLOUD_COURSES,
  // Quinta tanda: web moderno (SSRF/metadata, JWT, open redirect).
  ...WEB_MODERNO_COURSES,
  // Sexta tanda: anonimato y OSINT avanzado (Tor, censura, OPSEC, desanon).
  ...ANONIMATO_AVANZADO_COURSES,
  // Séptima tanda: redes avanzadas (análisis de tráfico, TCP/IP por dentro).
  ...REDES_AVANZADO_COURSES,
  // Octava tanda: cracking y autenticación avanzada.
  ...PASSWORDS_AVANZADO_COURSES,
];
