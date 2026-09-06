/**
 * Registro de aplicaciones del escritorio.
 *
 * Un solo lugar define el nombre, la categoría y el icono de cada app.
 * Antes esa información estaba repetida entre el escritorio (los botones),
 * el WindowManager (los títulos) y cada vista (el emoji del encabezado).
 */

export type AppCategory =
  | "Desarrollo"
  | "Educación"
  | "Internet"
  | "Juegos"
  | "Mundo"
  | "Oficina"
  | "Sistema";

export const CATEGORIES: AppCategory[] = [
  "Desarrollo",
  "Educación",
  "Internet",
  "Juegos",
  "Mundo",
  "Oficina",
  "Sistema",
];

export interface AppMeta {
  id: string;
  /** Nombre corto, el que se ve bajo el icono. */
  name: string;
  /** Título completo de la barra de la ventana. */
  title: string;
  /** Una línea que explica para qué sirve (subtítulo y búsqueda). */
  summary: string;
  category: AppCategory;
  /** Los dos colores del degradado del icono. */
  from: string;
  to: string;
  /** Aparece en el dock inferior. */
  dock?: boolean;
}

export const APPS: AppMeta[] = [
  {
    id: "terminal",
    name: "Terminal",
    title: "Terminal — student@nande-os",
    summary: "La consola de ÑANDE OS",
    category: "Desarrollo",
    from: "#4b5563",
    to: "#1f2937",
    dock: true,
  },
  {
    id: "learn",
    name: "Learn",
    title: "ÑANDE Learn — aprendé hacking",
    summary: "Lecciones guiadas de seguridad",
    category: "Educación",
    from: "#f0abfc",
    to: "#a855f7",
    dock: true,
  },
  {
    id: "files",
    name: "Archivos",
    title: "Archivos — /home/student",
    summary: "Explorá el sistema de archivos",
    category: "Sistema",
    from: "#fcd34d",
    to: "#f59e0b",
    dock: true,
  },
  {
    id: "browser",
    name: "Navegador",
    title: "ÑANDE Browser",
    summary: "Navegá la Internet virtual",
    category: "Internet",
    from: "#7dd3fc",
    to: "#0284c7",
    dock: true,
  },
  {
    id: "mail",
    name: "Correo",
    title: "ÑANDE Mail",
    summary: "Misiones y mensajes de los personajes",
    category: "Internet",
    from: "#93c5fd",
    to: "#2563eb",
    dock: true,
  },
  {
    id: "chat",
    name: "Chat",
    title: "ÑANDE Chat",
    summary: "Conversá con los habitantes",
    category: "Internet",
    from: "#6ee7b7",
    to: "#059669",
    dock: true,
  },
  {
    id: "network",
    name: "Red",
    title: "Gestor de red",
    summary: "Interfaces, wifi y conexiones",
    category: "Internet",
    from: "#a5b4fc",
    to: "#4f46e5",
  },
  {
    id: "map",
    name: "Mapa",
    title: "ÑANDE Map",
    summary: "El mundo virtual por zonas",
    category: "Mundo",
    from: "#5eead4",
    to: "#0d9488",
    dock: true,
  },
  {
    id: "world2d",
    name: "Mundo 2D",
    title: "ÑANDE World 2D",
    summary: "Caminá entre los habitantes",
    category: "Mundo",
    from: "#c4b5fd",
    to: "#7c3aed",
    dock: true,
  },
  {
    id: "world",
    name: "Monitor",
    title: "ÑANDE World",
    summary: "Qué está pasando en el mundo",
    category: "Mundo",
    from: "#67e8f9",
    to: "#0891b2",
  },
  {
    id: "market",
    name: "Bolsa",
    title: "ÑANDE Bolsa",
    summary: "Acciones y economía del mundo",
    category: "Oficina",
    from: "#fca5a5",
    to: "#dc2626",
    dock: true,
  },
  {
    id: "notes",
    name: "Notas",
    title: "Notas",
    summary: "Anotá lo que vas aprendiendo",
    category: "Oficina",
    from: "#fde68a",
    to: "#d97706",
    dock: true,
  },
  {
    id: "games",
    name: "Juegos",
    title: "ÑANDE Juegos",
    summary: "Minijuegos del escritorio",
    category: "Juegos",
    from: "#f9a8d4",
    to: "#db2777",
    dock: true,
  },
  {
    id: "processes",
    name: "Procesos",
    title: "Monitor de procesos",
    summary: "Qué corre en la máquina",
    category: "Sistema",
    from: "#bef264",
    to: "#65a30d",
  },
  {
    id: "settings",
    name: "Configuración",
    title: "Configuración del sistema",
    summary: "Fondo, acento y preferencias",
    category: "Sistema",
    from: "#cbd5e1",
    to: "#64748b",
    dock: true,
  },
];

export const APP_BY_ID: Record<string, AppMeta> = Object.fromEntries(
  APPS.map((app) => [app.id, app]),
);

/** Título de la barra de la ventana; cae al id si la app no está registrada. */
export function appTitle(id: string): string {
  return APP_BY_ID[id]?.title ?? id;
}
