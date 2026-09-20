/**
 * Catálogo de MÁQUINAS de práctica de ÑANDE (estilo salas de HackTheBox/TryHackMe).
 *
 * Cada máquina es un objetivo REAL del mundo virtual que se vulnera de punta a
 * punta con las herramientas del sandbox. Las banderas que lista cada tarea son
 * las MISMAS que caen al explotar de verdad (verificado por retos.functional y
 * por machines.test): nada acá está scripteado ni de adorno.
 *
 * 100% contenido: todos los objetivos son *.nande / 10.10.x.y del sandbox.
 */

export type MachineDifficulty = "principiante" | "intermedio" | "avanzado" | "experto";

/** Un objetivo puntual dentro de una máquina, con la bandera real que lo prueba. */
export interface MachineTask {
  label: string;
  /** Bandera ND{...} que se captura al lograrlo (existe de verdad en el mundo). */
  flag: string;
}

export interface PracticeMachine {
  id: string;
  /** Nombre de la sala (como la ve el jugador). */
  name: string;
  /** Host/objetivo real del mundo virtual. */
  host: string;
  ip?: string;
  os: string;
  difficulty: MachineDifficulty;
  /** Etiquetas de técnica (web, sqli, pivoting…). */
  tags: string[];
  /** Puntos al rootearla (todas sus tareas completas). */
  points: number;
  /** Escenario/briefing de la sala. */
  brief: string;
  /** Objetivos con sus banderas reales. */
  tasks: MachineTask[];
  /** Primer comando recomendado (se lanza a la terminal al "empezar"). */
  entry: string;
  /** Pista de arranque. */
  hint: string;
  /** Curso que enseña la técnica (para "repasar"). */
  courseId?: string;
}

export const MACHINES: PracticeMachine[] = [
  {
    id: "m-banco",
    name: "Mbarete Bank",
    host: "banco.nande",
    ip: "10.10.7.10",
    os: "ÑandeLinux + ÑandeSQL",
    difficulty: "intermedio",
    tags: ["web", "sqli", "union"],
    points: 200,
    brief:
      "El home banking de Mbarete arma sus consultas pegando el texto del usuario. Entrá sin la clave y, ya adentro, llevate toda la base de clientes con sus contraseñas.",
    tasks: [
      { label: "Burlá el login con SQLi", flag: "ND{sqli_login_bypass}" },
      { label: "Volcá la tabla usuarios por UNION", flag: "ND{sqli_union_dump}" },
    ],
    entry: "gobuster dir -u http://banco.nande",
    hint: "Enumerá primero (gobuster), después probá la comilla en el login y el buscador de /movimientos.",
    courseId: "c-web-sqlmap",
  },
  {
    id: "m-soporte",
    name: "Soporte",
    host: "server.nande",
    ip: "10.10.0.42",
    os: "ÑandeServer (SSH + nginx)",
    difficulty: "intermedio",
    tags: ["red", "ssh", "fuerza-bruta"],
    points: 150,
    brief:
      "El servidor de soporte expone SSH y el equipo dejó una contraseña floja. Mapealo, encontrá la credencial y entrá antes que un atacante real.",
    tasks: [{ label: "Entrá por SSH por fuerza bruta", flag: "ND{ssh_fuerza_bruta}" }],
    entry: "nmap -p- -sV server.nande",
    hint: "nmap -p- -sV para ver los puertos y versiones; después hydra ssh://server.nande.",
    courseId: "c-pass-hydra",
  },
  {
    id: "m-caja",
    name: "Caja Interna",
    host: "caja.interna.nande",
    ip: "10.10.66.10",
    os: "ÑandeServer (segmentado)",
    difficulty: "experto",
    tags: ["pivoting", "post-explotación", "lateral"],
    points: 300,
    brief:
      "La caja de la empresa vive en una subred interna que NO se ve desde afuera. Tomá primero server.nande y usalo de trampolín para pivotar y quedarte con la bandera de root.",
    tasks: [{ label: "Pivoteá y leé /root/flag.txt", flag: "ND{pivoting_red_interna}" }],
    entry: "connect server.nande soporte Verano2024",
    hint: "Necesitás foothold en server.nande primero. Desde adentro, la nota revela caja.interna.nande y su clave.",
    courseId: "c-op-killchain",
  },
  {
    id: "m-fotos",
    name: "Arandú Fotos",
    host: "fotos.arandu.nande",
    os: "ÑandeLinux (galería web)",
    difficulty: "intermedio",
    tags: ["web", "idor", "control-de-acceso"],
    points: 120,
    brief:
      "La galería pide cada álbum con ?id=. Pero no comprueba de quién es. Mirá el álbum privado de otra persona cambiando ese número (IDOR).",
    tasks: [{ label: "Accedé a un álbum ajeno (IDOR)", flag: "ND{idor_album_ajeno}" }],
    entry: "curl http://fotos.arandu.nande/album?id=7",
    hint: "El id de la URL lo controlás vos: probá otros números.",
    courseId: "c-web-idor-traversal",
  },
  {
    id: "m-docs",
    name: "Tapé Docs",
    host: "docs.tape.nande",
    os: "ÑandeLinux (visor de archivos)",
    difficulty: "intermedio",
    tags: ["web", "path-traversal", "lfi"],
    points: 130,
    brief:
      "El visor sirve archivos con ?archivo=. Si no limpia los '../', podés escaparte del directorio y leer secretos del servidor.",
    tasks: [{ label: "Leé un secreto con path traversal", flag: "ND{path_traversal_secreto}" }],
    entry: 'curl "http://docs.tape.nande/ver?archivo=../config/secrets.env"',
    hint: "Subí de directorio con ../ hasta llegar a config/secrets.env.",
    courseId: "c-web-idor-traversal",
  },
  {
    id: "m-tools",
    name: "Pytã Tools",
    host: "tools.pyta.nande",
    os: "ÑandeLinux (utilidades web)",
    difficulty: "avanzado",
    tags: ["web", "rce", "cmd-injection"],
    points: 200,
    brief:
      "La herramienta de ping arma un comando del sistema con tu texto. Colá tu propio comando y ejecutá lo que quieras en el servidor (RCE).",
    tasks: [{ label: "Ejecutá comandos en el server (cmdi)", flag: "ND{cmd_injection_pwned}" }],
    entry: 'curl "http://tools.pyta.nande/ping?host=localhost"',
    hint: "Encadená tu comando con ; o && dentro del parámetro host.",
    courseId: "c-web-cmdi-jwt",
  },
  {
    id: "m-vortex",
    name: "Vortex API",
    host: "api.vortex.nande",
    ip: "10.10.7.16",
    os: "ÑandeAPI (JWT)",
    difficulty: "avanzado",
    tags: ["web", "jwt", "auth"],
    points: 180,
    brief:
      "La API confía en un JSON Web Token para saber quién sos. Si la firma es débil (o acepta alg:none), podés forjar un token de administrador.",
    tasks: [{ label: "Forjá un token de admin (JWT)", flag: "ND{jwt_forged_admin}" }],
    entry: "jwt forge nande123 rol=admin usuario=admin",
    hint: "Forjá el token con rol=admin y probalo contra /panel de la API.",
    courseId: "c-web-cmdi-jwt",
  },
  {
    id: "m-blog",
    name: "Yvoty Blog",
    host: "blog.yvoty.nande",
    os: "ÑandeLinux (blog)",
    difficulty: "intermedio",
    tags: ["web", "xss"],
    points: 110,
    brief:
      "El buscador del blog devuelve tu texto sin limpiarlo. Meté un <script> y hacelo correr en la página (XSS reflejado).",
    tasks: [{ label: "Reflejá tu script (XSS)", flag: "ND{xss_reflejado}" }],
    entry: 'curl "http://blog.yvoty.nande/buscar?q=<script>alert(1)</script>"',
    hint: "Mandá un <script> en ?q= y mirá cómo vuelve dentro del HTML.",
    courseId: "c-web-xss",
  },
  {
    id: "m-ad",
    name: "Guaraní Domain",
    host: "dc.nande",
    ip: "10.10.10.10",
    os: "ÑandeServer AD — NANDE.LOCAL (Kerberos + SMB)",
    difficulty: "experto",
    tags: ["active-directory", "kerberos", "pass-the-hash"],
    points: 320,
    brief:
      "El controlador de dominio de NANDE.LOCAL. Entrás como un usuario común y tenés que llegar a Domain Admin de punta a punta: enumerá el dominio, kerberosteá la cuenta de servicio con SPN, crackeá su TGS offline, movete lateral al servidor que administra y robá el hash del Domain Admin con mimikatz. Un Pass-the-Hash y sos dueño del bosque. El grafo es estado real: cada cuenta que tomás recalcula la ruta (nandeblood).",
    tasks: [{ label: "Comprometé el dominio (Domain Admin)", flag: "ND{dominio_comprometido}" }],
    entry: "enum4linux NANDE.LOCAL",
    hint: "enum4linux NANDE.LOCAL revela el SPN; kerberoast + crack-tgs con una clave de temporada (Verano2024!); ya dueño de SVC-SQL, abuse su AdminTo a DB01, mimikatz sekurlsa::logonpasswords y Pass-the-Hash del Domain Admin. La ruta completa: nandeblood.",
    courseId: "c-ad-directorio",
  },
];

/** Estado de una máquina según las banderas ya capturadas por el jugador. */
export interface MachineProgress {
  captured: number;
  total: number;
  rooted: boolean;
  started: boolean;
}

export function machineProgress(m: PracticeMachine, flags: readonly string[]): MachineProgress {
  const captured = m.tasks.filter((t) => flags.includes(t.flag)).length;
  return {
    captured,
    total: m.tasks.length,
    rooted: captured === m.tasks.length,
    started: captured > 0,
  };
}
