/**
 * Academia de ÑANDE: la ruta de cero a experto.
 *
 * Organiza el aprendizaje en niveles con requisitos, para que nadie se
 * pierda. Cada curso conecta un concepto con las herramientas y los
 * laboratorios donde practicarlo. Todo explicado de lo más simple a lo
 * más técnico.
 */

export type CourseLevel =
  | "principiante"
  | "intermedio"
  | "avanzado"
  | "experto";

export interface Course {
  id: string;
  /** Orden dentro de la ruta (0 = absoluto principiante). */
  stage: number;
  title: string;
  level: CourseLevel;
  /** Explicación para alguien que recién arranca. */
  simple: string;
  /** Qué se aprende. */
  summary: string;
  /** Cursos que conviene completar antes (ids). */
  requires: string[];
  /** Conceptos que cubre. */
  topics: string[];
  /** Herramientas de la biblioteca que se usan (ids). */
  tools: string[];
  /** Máquinas de laboratorio para practicar (ids). */
  labs: string[];
}

/** Ruta de aprendizaje completa, del nivel 0 al avanzado. */
export const COURSES: Course[] = [
  {
    id: "computacion",
    stage: 0,
    title: "Nivel 0 — ¿Qué es una computadora?",
    level: "principiante",
    simple:
      "Antes de hackear hay que saber qué es una compu: una máquina que sigue órdenes, guarda cosas y habla con otras.",
    summary:
      "Ideas base: qué es un archivo, una carpeta, un programa, la memoria, el procesador y una red.",
    requires: [],
    topics: ["computadora", "archivo", "carpeta", "programa", "memoria", "red", "IP"],
    tools: [],
    labs: [],
  },
  {
    id: "linux",
    stage: 1,
    title: "Nivel 1 — Linux y la terminal",
    level: "principiante",
    simple:
      "La terminal es una forma de darle órdenes a la compu escribiendo, en vez de hacer clic. Es la herramienta número uno.",
    summary:
      "Moverse por el sistema, leer y crear archivos, entender usuarios y permisos.",
    requires: ["computacion"],
    topics: ["terminal", "bash", "ls", "cd", "cat", "permisos", "usuarios", "procesos"],
    tools: ["strings", "file", "netstat", "ss"],
    labs: [],
  },
  {
    id: "redes",
    stage: 2,
    title: "Nivel 2 — Redes: cómo se hablan las máquinas",
    level: "principiante",
    simple:
      "Una IP es como la dirección de una casa dentro de una red. Un puerto es como una puerta de esa casa. Vamos a aprender a mirarlas.",
    summary:
      "IP, puertos, DNS, TCP/UDP y cómo viaja la información.",
    requires: ["linux"],
    topics: ["IP", "puerto", "DNS", "TCP", "UDP", "HTTP", "routing"],
    tools: ["ping", "traceroute", "nslookup", "dig", "whois", "netstat"],
    labs: ["lab-net-01"],
  },
  {
    id: "reconocimiento",
    stage: 3,
    title: "Nivel 3 — Reconocimiento",
    level: "principiante",
    simple:
      "Antes de tocar nada, un hacker mira. Averigua qué máquinas hay y qué ofrecen. Se llama reconocimiento.",
    summary:
      "Descubrir máquinas vivas, escanear puertos e identificar servicios y versiones.",
    requires: ["redes"],
    topics: ["escaneo", "puertos", "servicios", "versiones", "OSINT"],
    tools: ["nmap", "masscan", "netdiscover", "whatweb", "shodan", "sherlock", "theharvester"],
    labs: ["lab-net-01", "lab-web-01"],
  },
  {
    id: "web-basics",
    stage: 4,
    title: "Nivel 4 — Cómo funciona la web",
    level: "intermedio",
    simple:
      "Cuando entrás a una página, tu compu le pide algo a un servidor y este contesta. Vamos a espiar esa conversación.",
    summary:
      "HTTP, cabeceras, rutas, cookies y sesiones. Hablar con un servidor sin navegador.",
    requires: ["reconocimiento"],
    topics: ["HTTP", "headers", "cookies", "sesiones", "rutas", "API"],
    tools: ["curl", "gobuster", "ffuf", "whatweb"],
    labs: ["lab-web-01", "lab-web-02"],
  },
  {
    id: "web-security",
    stage: 5,
    title: "Nivel 5 — Seguridad web",
    level: "intermedio",
    simple:
      "Las páginas a veces confían de más en lo que uno escribe. Ahí aparecen los fallos. Vamos a encontrarlos para aprender a taparlos.",
    summary:
      "Los fallos web más comunes: inyección SQL, XSS, IDOR, y cómo se defienden.",
    requires: ["web-basics"],
    topics: ["SQL injection", "XSS", "IDOR", "CSRF", "validación", "OWASP"],
    tools: ["sqlmap", "nikto", "dalfox", "commix", "jwt-tool"],
    labs: ["lab-web-01", "lab-web-02"],
  },
  {
    id: "passwords",
    stage: 6,
    title: "Nivel 6 — Contraseñas y autenticación",
    level: "intermedio",
    simple:
      "Una contraseña débil es como una cerradura de juguete. Vamos a ver por qué, para elegir cerraduras buenas.",
    summary:
      "Cómo se guardan, cómo se rompen las débiles y cómo se protege la autenticación.",
    requires: ["web-basics"],
    topics: ["hashes", "sal", "fuerza bruta", "segundo factor"],
    tools: ["hydra", "johntheripper", "hashcat", "hashid", "hashcalc"],
    labs: ["lab-net-01"],
  },
  {
    id: "phishing",
    stage: 6,
    title: "Nivel 6 — Phishing: el engaño",
    level: "intermedio",
    simple:
      "El truco más usado no rompe máquinas: engaña personas. Aprender a reconocerlo es la mejor defensa.",
    summary:
      "Cómo se arma un engaño por correo y cómo detectarlo antes de caer.",
    requires: ["web-basics"],
    topics: ["ingeniería social", "correos falsos", "dominios parecidos", "concienciación"],
    tools: ["phish-analyzer", "phish-lab"],
    labs: [],
  },
  {
    id: "pagos",
    stage: 7,
    title: "Nivel 7 — Seguridad de pagos y antifraude",
    level: "intermedio",
    simple:
      "Las tiendas mueven dinero, y los ladrones lo saben. Este nivel enseña a PROTEGER los pagos y detectar fraude.",
    summary:
      "Cómo se protegen los datos de tarjeta (PCI-DSS) y cómo se detecta el fraude en un comercio.",
    requires: ["web-security"],
    topics: ["PCI-DSS", "tokenización", "detección de fraude", "protección de datos"],
    tools: ["fraud-detector", "pci-checker"],
    labs: ["lab-web-02"],
  },
  {
    id: "pentesting",
    stage: 8,
    title: "Nivel 8 — Pentesting en laboratorios",
    level: "avanzado",
    simple:
      "Ahora juntamos todo: mirar, encontrar un fallo, entrar de forma controlada y anotar cómo arreglarlo.",
    summary:
      "El ciclo completo: reconocimiento, explotación controlada, post-explotación y reporte.",
    requires: ["web-security", "passwords"],
    topics: ["metodología", "explotación", "post-explotación", "reporte"],
    tools: ["metasploit", "searchsploit", "msfvenom", "enum4linux", "smbclient"],
    labs: ["lab-web-01", "lab-net-01", "lab-web-02"],
  },
  {
    id: "privesc",
    stage: 9,
    title: "Nivel 9 — Escalada de privilegios",
    level: "avanzado",
    simple:
      "Entrar como usuario normal es solo el principio. Acá se aprende a encontrar descuidos que dan control total... para saber cerrarlos.",
    summary:
      "Cómo un acceso limitado se convierte en control total por permisos mal puestos.",
    requires: ["pentesting"],
    topics: ["SUID", "cron", "configuraciones inseguras", "credenciales sueltas"],
    tools: ["linpeas", "strings"],
    labs: ["lab-linux-01"],
  },
  {
    id: "blue-team",
    stage: 10,
    title: "Nivel 10 — Blue Team: defender",
    level: "avanzado",
    simple:
      "Todo lo anterior fue atacar. Ahora nos ponemos del lado que protege: mirar los diarios, detectar y responder.",
    summary:
      "Logs, detección, alertas y respuesta a incidentes usando el propio mundo virtual.",
    requires: ["pentesting"],
    topics: ["logs", "SIEM", "IDS", "detección", "respuesta a incidentes"],
    tools: ["logview", "siem", "ids", "yara", "clamav"],
    labs: ["lab-web-01"],
  },
  {
    id: "forense",
    stage: 11,
    title: "Nivel 11 — Forense",
    level: "avanzado",
    simple:
      "Cuando algo ya pasó, el forense reconstruye la historia: qué archivos, qué pasos, qué evidencia quedó.",
    summary:
      "Analizar archivos, logs y artefactos para reconstruir un incidente.",
    requires: ["blue-team"],
    topics: ["análisis de archivos", "metadatos", "línea de tiempo", "evidencia"],
    tools: ["strings", "file", "exiftool", "binwalk", "volatility"],
    labs: ["lab-linux-01"],
  },
  {
    id: "cripto",
    stage: 12,
    title: "Nivel 12 — Criptografía",
    level: "avanzado",
    simple:
      "Cómo se esconden y protegen los secretos: desde disfrazar texto hasta candados matemáticos de verdad.",
    summary:
      "Codificación vs. cifrado, hashes, sal, y por qué importan las claves.",
    requires: ["passwords"],
    topics: ["encoding", "hashing", "cifrado simétrico", "cifrado asimétrico", "certificados"],
    tools: ["base64", "hashcalc", "hashid", "openssl", "cyberchef"],
    labs: [],
  },
  {
    id: "reversing",
    stage: 13,
    title: "Nivel 13 — Ingeniería inversa",
    level: "experto",
    simple:
      "Abrir un programa para ver cómo funciona por dentro, aunque no venga con instrucciones.",
    summary:
      "Desarmar binarios de laboratorio para entender su lógica y encontrar fallos.",
    requires: ["forense"],
    topics: ["binarios", "assembly", "análisis estático", "análisis dinámico"],
    tools: ["ghidra", "gdb", "radare2", "strings"],
    labs: [],
  },
  {
    id: "advanced",
    stage: 14,
    title: "Nivel 14 — Seguridad avanzada",
    level: "experto",
    simple:
      "El panorama grande: redes de empresa, nube, arquitectura de seguridad y cómo pensar como quien diseña la defensa.",
    summary:
      "Conceptos de seguridad empresarial, modelado de amenazas y arquitectura defensiva.",
    requires: ["blue-team", "pentesting"],
    topics: ["redes empresariales", "nube", "modelado de amenazas", "arquitectura de seguridad"],
    tools: ["crackmapexec", "maltego", "siem"],
    labs: [],
  },
];

export class Academy {
  private courses: Map<string, Course>;

  constructor() {
    this.courses = new Map(COURSES.map((course) => [course.id, course]));
  }

  all(): Course[] {
    return [...COURSES]
      .sort((a, b) => a.stage - b.stage)
      .map((course) => ({ ...course }));
  }

  get(id: string): Course | undefined {
    const course = this.courses.get(id);

    return course ? { ...course } : undefined;
  }

  count(): number {
    return this.courses.size;
  }

  /**
   * Verifica requisitos. Devuelve los cursos que faltan completar antes,
   * dada una lista de cursos ya completados.
   */
  missingRequirements(id: string, completed: string[]): string[] {
    const course = this.courses.get(id);

    if (!course) {
      return [];
    }

    const done = new Set(completed);

    return course.requires.filter((req) => !done.has(req));
  }

  /** Grafo de aprendizaje: cada curso con lo que habilita después. */
  learningGraph(): Array<{ id: string; title: string; unlocks: string[] }> {
    return this.all().map((course) => ({
      id: course.id,
      title: course.title,
      unlocks: COURSES.filter((c) => c.requires.includes(course.id)).map(
        (c) => c.id,
      ),
    }));
  }
}
