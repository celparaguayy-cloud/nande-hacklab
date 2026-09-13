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
    id: "code",
    name: "Código",
    title: "ÑANDE Code — programá tus herramientas",
    summary: "Escribí, compilá y corré tus propias tools",
    category: "Desarrollo",
    from: "#86efac",
    to: "#15803d",
    dock: true,
  },
  {
    id: "soc",
    name: "SOC",
    title: "ÑANDE SOC — Blue Team",
    summary: "Alertas en vivo de eventos reales del sistema",
    category: "Sistema",
    from: "#38bdf8",
    to: "#1e3a8a",
    dock: false,
  },
  {
    id: "shark",
    name: "NandeShark",
    title: "NandeShark — análisis de tráfico",
    summary: "Capturá el tráfico real de la red: HTTP, logins, credenciales en claro",
    category: "Sistema",
    from: "#67e8f9",
    to: "#0e7490",
    dock: false,
  },
  {
    id: "blood",
    name: "NandeBlood",
    title: "NandeBlood — rutas de ataque en el dominio",
    summary: "El grafo del Directorio Activo: kerberoast, abuso de ACL y camino a Domain Admins",
    category: "Sistema",
    from: "#fca5a5",
    to: "#7f1d1d",
    dock: false,
  },
  {
    id: "containers",
    name: "NandeContainers",
    title: "NandeContainers — clúster K8s virtual",
    summary: "Contenedores con secretos filtrados y escape de contenedor privilegiado",
    category: "Sistema",
    from: "#93c5fd",
    to: "#1e40af",
    dock: false,
  },
  {
    id: "reverse",
    name: "NandeReverse",
    title: "NandeReverse — ingeniería inversa",
    summary: "Un crackme real: hexdump y fuerza bruta de XOR para revelar la bandera",
    category: "Sistema",
    from: "#c4b5fd",
    to: "#5b21b6",
    dock: false,
  },
  {
    id: "dfir",
    name: "DFIR",
    title: "DFIR — respuesta a incidentes",
    summary: "Reconstruí el ataque desde los eventos reales: timeline, veredicto y MITRE",
    category: "Sistema",
    from: "#7dd3fc",
    to: "#0369a1",
    dock: false,
  },
  {
    id: "arena",
    name: "Arena CTF",
    title: "Arena CTF — retos contrarreloj",
    summary: "Te dan una IP, la vulnerás contra reloj y sumás puntos",
    category: "Juegos",
    from: "#fca5a5",
    to: "#b91c1c",
    dock: true,
  },
  {
    id: "asistente",
    name: "Ñandú IA",
    title: "Ñandú — Asistente IA",
    summary: "Co-piloto de hacking (offline o con tu clave de Groq/Gemini)",
    category: "Educación",
    from: "#c4b5fd",
    to: "#6d28d9",
    dock: true,
  },
  {
    id: "mission",
    name: "Misión",
    title: "Centro de Mando — Operación Génesis",
    summary: "Tu campaña, tus stats y las reacciones del mundo",
    category: "Mundo",
    from: "#fca5a5",
    to: "#b91c1c",
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
  },
  {
    id: "pulso",
    name: "Pulso",
    title: "Pulso — la red social de ÑANDE",
    summary: "El feed del mundo · husmeá para hacer OSINT",
    category: "Internet",
    from: "#f0abfc",
    to: "#c026d3",
    dock: true,
  },
  {
    id: "company",
    name: "Mi Empresa",
    title: "Mi Empresa — fundá y defendé",
    summary: "Fundá tu empresa y defendela de los ataques",
    category: "Mundo",
    from: "#fca5a5",
    to: "#b45309",
  },
  {
    id: "c2",
    name: "C2",
    title: "Centro de mando (C2) — simulado",
    summary: "Tu botnet de máquinas comprometidas y cómo la detectan",
    category: "Desarrollo",
    from: "#f87171",
    to: "#7f1d1d",
  },
  {
    id: "team",
    name: "Equipo",
    title: "ÑANDE Equipo — tus especialistas",
    summary: "Consultá a Cipher, Trace, Byte, Nova, Root y Echo",
    category: "Educación",
    from: "#6ee7b7",
    to: "#0d9488",
  },
  {
    id: "chat",
    name: "Chat",
    title: "ÑANDE Chat",
    summary: "Conversá con los habitantes",
    category: "Internet",
    from: "#6ee7b7",
    to: "#059669",
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
  },
  {
    id: "world2d",
    name: "Mundo 2D",
    title: "ÑANDE World 2D",
    summary: "Caminá entre los habitantes",
    category: "Mundo",
    from: "#c4b5fd",
    to: "#7c3aed",
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
  },
  {
    id: "notes",
    name: "Notas",
    title: "Notas",
    summary: "Anotá lo que vas aprendiendo",
    category: "Oficina",
    from: "#fde68a",
    to: "#d97706",
  },
  {
    id: "games",
    name: "Juegos",
    title: "ÑANDE Juegos",
    summary: "Minijuegos del escritorio",
    category: "Juegos",
    from: "#f9a8d4",
    to: "#db2777",
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
  },
];

export const APP_BY_ID: Record<string, AppMeta> = Object.fromEntries(
  APPS.map((app) => [app.id, app]),
);

/** Título de la barra de la ventana; cae al id si la app no está registrada. */
export function appTitle(id: string): string {
  return APP_BY_ID[id]?.title ?? id;
}
