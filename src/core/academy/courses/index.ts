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
];
