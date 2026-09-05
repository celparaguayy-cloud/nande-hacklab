/**
 * Lecciones guiadas de ÑANDE: aprender hacking haciendo.
 *
 * Cada lección es una secuencia de pasos. En cada paso el alumno recibe una
 * explicación sencilla y un objetivo concreto; usa una herramienta REAL
 * contra un laboratorio virtual; el sistema verifica que lo hizo mirando el
 * comando y su salida, y recién entonces explica por qué funcionó y cómo se
 * defiende. Todo dentro del sandbox.
 */

export interface LessonStep {
  /** Qué se está aprendiendo, explicado simple. */
  explain: string;
  /** Qué tiene que hacer el alumno. */
  task: string;
  /** Pista si se traba. */
  hint: string;
  /**
   * Verifica si el paso se cumplió, mirando el comando escrito y su salida.
   * Debe ser una función pura.
   */
  check: (command: string, output: string) => boolean;
  /** Explicación tras lograrlo: por qué funciona y cómo defenderse. */
  debrief: string;
}

export interface Lesson {
  id: string;
  title: string;
  level: "principiante" | "intermedio" | "avanzado";
  /** De qué trata, en una línea. */
  summary: string;
  /** Concepto que enseña. */
  concept: string;
  reward: { xp: number; coins: number };
  steps: LessonStep[];
}

function usedTool(command: string, tool: string): boolean {
  return command.trim().toLowerCase().startsWith(tool.toLowerCase());
}

export const LESSONS: Lesson[] = [
  {
    id: "l-nmap",
    title: "Tu primer escaneo con nmap",
    level: "principiante",
    summary: "Descubrir qué puertas tiene abiertas una máquina.",
    concept:
      "Una máquina ofrece servicios por 'puertos'. Antes de nada, un hacker mira cuáles están abiertos.",
    reward: { xp: 80, coins: 60 },
    steps: [
      {
        explain:
          "Primero hay que saber si la máquina está viva. 'ping' le manda un saludito y espera respuesta, como tocar el timbre.",
        task: "Hacé ping a la máquina de laboratorio: ping 10.10.5.20",
        hint: "Escribí: ping 10.10.5.20",
        check: (cmd, out) =>
          usedTool(cmd, "ping") &&
          cmd.includes("10.10.5.20") &&
          (out.includes("recibidos") || out.includes("received")),
        debrief:
          "La máquina respondió: está viva. Si no contestara, estaría apagada o un firewall la taparía. Defensa: se puede configurar para no responder pings.",
      },
      {
        explain:
          "Ahora sí: 'nmap' golpea todas las puertas (puertos) y te dice cuáles están abiertas y qué servicio corre en cada una.",
        task: "Escaneá los puertos: nmap 10.10.5.20",
        hint: "Escribí: nmap 10.10.5.20",
        check: (cmd, out) =>
          usedTool(cmd, "nmap") &&
          cmd.includes("10.10.5.20") &&
          out.includes("open"),
        debrief:
          "Cada 'open' es una puerta con un servicio detrás (ssh, http, mysql...). Con esto ya sabés por dónde se podría entrar. Defensa: cerrar los puertos que no se usan y detectar escaneos.",
      },
    ],
  },
  {
    id: "l-sqli",
    title: "Encontrá el login vulnerable (SQL Injection)",
    level: "intermedio",
    summary: "Engañar a la base de datos de un login mal hecho.",
    concept:
      "Si una web arma su consulta a la base de datos pegando lo que escribís sin limpiarlo, se la puede engañar. Eso es inyección SQL.",
    reward: { xp: 200, coins: 150 },
    steps: [
      {
        explain:
          "Primero mirá qué corre la máquina del login. Un escaneo te muestra el servidor web.",
        task: "Escaneá weblab01: nmap 10.10.5.10",
        hint: "Escribí: nmap 10.10.5.10",
        check: (cmd, out) =>
          usedTool(cmd, "nmap") &&
          cmd.includes("10.10.5.10") &&
          out.includes("http"),
        debrief:
          "Hay un servidor web en el puerto 80. Ahí vive el formulario de login que vamos a probar.",
      },
      {
        explain:
          "sqlmap prueba automáticamente si un parámetro del login llega sin filtrar a la base de datos.",
        task: "Probá la inyección: sqlmap http://10.10.5.10/login user",
        hint: "Escribí: sqlmap http://10.10.5.10/login user",
        check: (cmd, out) =>
          usedTool(cmd, "sqlmap") &&
          cmd.includes("10.10.5.10") &&
          out.includes("VULNERABLE"),
        debrief:
          "El login era vulnerable: se pudo leer la tabla de usuarios. Esto pasa por armar SQL pegando texto del usuario. Defensa: consultas parametrizadas — nunca construir SQL con lo que escribe la gente.",
      },
    ],
  },
  {
    id: "l-gobuster",
    title: "Descubrí rutas ocultas",
    level: "intermedio",
    summary: "Encontrar páginas que no están enlazadas.",
    concept:
      "Muchas webs tienen páginas sin enlazar (paneles, backups). Probando nombres comunes se las encuentra.",
    reward: { xp: 150, coins: 120 },
    steps: [
      {
        explain:
          "gobuster prueba una lista de nombres de carpeta contra la web y te dice cuáles existen.",
        task: "Buscá rutas ocultas: gobuster 10.10.5.10",
        hint: "Escribí: gobuster 10.10.5.10",
        check: (cmd, out) =>
          usedTool(cmd, "gobuster") &&
          cmd.includes("10.10.5.10") &&
          out.includes("/admin"),
        debrief:
          "Apareció /admin, una ruta que no estaba a la vista. Los paneles ocultos son un blanco típico. Defensa: no dejar paneles sin proteger y vigilar los 404 masivos.",
      },
    ],
  },
  {
    id: "l-privesc",
    title: "De usuario a root",
    level: "avanzado",
    summary: "Convertir un acceso limitado en control total.",
    concept:
      "Entrar como usuario común es solo el principio. Un descuido en los permisos puede darte control total de la máquina.",
    reward: { xp: 400, coins: 300 },
    steps: [
      {
        explain:
          "linpeas revisa la máquina por dentro buscando configuraciones peligrosas que permitan escalar privilegios.",
        task: "Buscá vías de escalada: linpeas 10.10.5.40",
        hint: "Escribí: linpeas 10.10.5.40",
        check: (cmd, out) =>
          usedTool(cmd, "linpeas") &&
          cmd.includes("10.10.5.40") &&
          out.toUpperCase().includes("SUID"),
        debrief:
          "linpeas encontró un binario con SUID mal configurado: eso permite ejecutar algo como root. Defensa: permisos mínimos, sin SUID de más y sin credenciales sueltas en archivos.",
      },
    ],
  },
  {
    id: "l-owasp-cmdi",
    title: "OWASP A03 — Inyección de comandos",
    level: "avanzado",
    summary: "Hacer que una web ejecute órdenes en su servidor.",
    concept:
      "Si una web pasa lo que escribís a un comando del sistema, se le puede colar una orden propia. Es inyección de comandos, parte de A03: Injection del OWASP Top 10.",
    reward: { xp: 250, coins: 180 },
    steps: [
      {
        explain:
          "Primero mirá qué corre la máquina. Un escaneo confirma el servidor web del laboratorio OWASP.",
        task: "Escaneá owasplab: nmap 10.10.5.50",
        hint: "Escribí: nmap 10.10.5.50",
        check: (cmd, out) =>
          usedTool(cmd, "nmap") &&
          cmd.includes("10.10.5.50") &&
          out.includes("http"),
        debrief:
          "Hay un servidor web. Tiene una 'herramienta de ping' que le pasa tu texto al sistema.",
      },
      {
        explain:
          "commix prueba si un parámetro llega a un comando del sistema y se puede abusar.",
        task: "Probá la inyección: commix http://10.10.5.50/ping",
        hint: "Escribí: commix http://10.10.5.50/ping",
        check: (cmd, out) =>
          usedTool(cmd, "commix") &&
          cmd.includes("10.10.5.50") &&
          out.includes("VULNERABLE"),
        debrief:
          "Se pudo ejecutar un comando en el servidor. Esto pasa cuando la web arma un comando pegando tu texto. Defensa: nunca pasar entrada del usuario a comandos del sistema; usar APIs seguras.",
      },
    ],
  },
  {
    id: "l-owasp-ssrf",
    title: "OWASP A10 — SSRF",
    level: "avanzado",
    summary: "Usar el servidor para llegar a donde vos no podés.",
    concept:
      "SSRF (A10) es cuando una web trae URLs que le pedís. Si no valida a dónde va, se la puede usar para alcanzar servicios internos.",
    reward: { xp: 250, coins: 180 },
    steps: [
      {
        explain:
          "El importador de imágenes de la web acepta una URL para ir a buscarla. Vamos a ver si valida a dónde va.",
        task: "Probá SSRF: ssrf http://10.10.5.50/import",
        hint: "Escribí: ssrf http://10.10.5.50/import",
        check: (cmd, out) =>
          usedTool(cmd, "ssrf") &&
          cmd.includes("10.10.5.50") &&
          out.includes("VULNERABLE"),
        debrief:
          "El servidor fue a buscar una URL interna por vos: eso es SSRF. Un atacante lo usa para llegar a servicios que no ve directamente. Defensa: validar y limitar los destinos con lista blanca.",
      },
    ],
  },
  {
    id: "l-owasp-misconf",
    title: "OWASP A05 — Configuración insegura",
    level: "intermedio",
    summary: "Encontrar archivos que no deberían estar públicos.",
    concept:
      "A05: Security Misconfiguration. A veces quedan expuestos archivos internos (.git, backups) que revelan secretos.",
    reward: { xp: 200, coins: 150 },
    steps: [
      {
        explain:
          "gobuster prueba nombres comunes de archivos y carpetas para encontrar los que quedaron expuestos.",
        task: "Buscá lo expuesto: gobuster 10.10.5.50",
        hint: "Escribí: gobuster 10.10.5.50",
        check: (cmd, out) =>
          usedTool(cmd, "gobuster") &&
          cmd.includes("10.10.5.50") &&
          (out.includes(".git") || out.includes("config.bak")),
        debrief:
          "Aparecieron .git y un backup: nunca deberían estar en producción. Defensa: no publicar archivos internos y revisar qué queda accesible.",
      },
      {
        explain:
          "Un archivo de backup viejo puede tener credenciales. curl lo trae para leerlo.",
        task: "Leé el backup: curl http://10.10.5.50/config.bak",
        hint: "Escribí: curl http://10.10.5.50/config.bak",
        check: (cmd, out) =>
          usedTool(cmd, "curl") &&
          cmd.includes("config.bak") &&
          out.includes("DB_PASS"),
        debrief:
          "El backup dejó a la vista usuario y contraseña de la base (A02: datos sensibles expuestos). Defensa: no dejar backups accesibles y no guardar secretos en archivos del sitio.",
      },
    ],
  },
  {
    id: "l-owasp-auth",
    title: "OWASP A07 — Fallas de autenticación",
    level: "intermedio",
    summary: "Por qué una contraseña débil se rompe sola.",
    concept:
      "A07: Identification and Authentication Failures. Si un login no limita los intentos, se prueban miles de contraseñas hasta entrar.",
    reward: { xp: 180, coins: 140 },
    steps: [
      {
        explain:
          "hydra prueba muchas contraseñas contra un servicio de login. Contra netlab01, que expone SSH.",
        task: "Probá fuerza bruta: hydra 10.10.5.20",
        hint: "Escribí: hydra 10.10.5.20",
        check: (cmd, out) =>
          usedTool(cmd, "hydra") &&
          cmd.includes("10.10.5.20") &&
          out.toLowerCase().includes("login"),
        debrief:
          "Se encontró una credencial débil probando muchas. Sin límite de intentos, la fuerza bruta funciona. Defensa: bloqueo tras varios fallos, segundo factor y contraseñas largas.",
      },
    ],
  },
  {
    id: "l-blue",
    title: "Del lado del defensor",
    level: "intermedio",
    summary: "Leer los registros y entender un ataque.",
    concept:
      "Todo lo anterior fue atacar. El defensor mira los registros (logs) para detectar qué pasó y responder.",
    reward: { xp: 180, coins: 140 },
    steps: [
      {
        explain:
          "Los logs son el diario de la máquina: quedan anotados los intentos de login y los accesos. Ahí se ve el ataque.",
        task: "Revisá los registros: logview weblab01.lab",
        hint: "Escribí: logview weblab01.lab",
        check: (cmd, out) =>
          usedTool(cmd, "logview") &&
          out.toLowerCase().includes("login"),
        debrief:
          "En los logs se ven varios logins fallidos seguidos y un acceso a /admin: la firma de una intrusión. Detectar esto a tiempo es el trabajo del Blue Team. Defensa: centralizar y proteger los logs, y alertar por patrones así.",
      },
    ],
  },
];

/** Motor de lecciones: mantiene el paso actual de la lección activa. */
export class LessonEngine {
  private byId: Map<string, Lesson>;

  constructor() {
    this.byId = new Map(LESSONS.map((l) => [l.id, l]));
  }

  all(): Lesson[] {
    return LESSONS.map((l) => ({ ...l }));
  }

  get(id: string): Lesson | undefined {
    const lesson = this.byId.get(id);
    return lesson ? { ...lesson } : undefined;
  }

  count(): number {
    return this.byId.size;
  }
}
