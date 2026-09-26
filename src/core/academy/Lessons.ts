/**
 * Lecciones guiadas de ÑANDE: aprender hacking haciendo.
 *
 * Cada lección es una secuencia de pasos. En cada paso el alumno recibe una
 * explicación sencilla y un objetivo concreto; usa una herramienta REAL
 * contra un laboratorio virtual; el sistema verifica que lo hizo mirando el
 * comando y su salida, y recién entonces explica por qué funcionó y cómo se
 * defiende. Todo dentro del sandbox.
 */

/**
 * Ventana al estado real del mundo para verificar un paso CONTRA la realidad
 * (no sólo con un regex sobre el texto, que sería trampeable con un `echo`).
 */
export interface LessonWorld {
  /** Banderas realmente capturadas por el jugador. */
  capturedFlags(): string[];
  /** Estado real de un servicio en un host ("running"/"stopped"/…), o undefined. */
  serviceState(host: string, service: string): string | undefined;
  /** Directorio actual de la terminal (para validar navegación real). */
  cwd(): string;
}

export interface LessonStep {
  /** Qué se está aprendiendo, explicado simple. */
  explain: string;
  /** Qué tiene que hacer el alumno. */
  task: string;
  /** Pista simple (compatibilidad). Preferí `hints` para pistas escalonadas. */
  hint: string;
  /** Pistas escalonadas: de un empujón suave a la solución. Si falta, se usa `hint`. */
  hints?: string[];
  /**
   * Paso de ACCIÓN: verifica que el alumno HIZO algo (corrió un comando y
   * obtuvo cierta salida), mirando comando, salida y el estado real del mundo.
   * Un paso es de acción (check) o de pregunta (question), no ambos obligatorios.
   */
  check?: (command: string, output: string, world?: LessonWorld) => boolean;
  /**
   * Paso de PREGUNTA (estilo TryHackMe): el alumno debe LEER lo que obtuvo y
   * responder con `responder <respuesta>`. Fuerza a entender, no a copiar.
   */
  question?: string;
  /** Respuestas aceptadas (se comparan normalizadas: sin may/min ni espacios extra). */
  answers?: string[];
  /** Si la respuesta se valida de forma flexible (contiene el texto), no exacta. */
  answerContains?: boolean;
  /** Explicación de la brief tras lograrlo: por qué funciona y cómo defenderse. */
  debrief: string;
  /**
   * Qué app abrir para este paso: "terminal" (por defecto) o "browser" (labs
   * web donde conviene ver el objetivo). La UI la usa para llevar al alumno.
   */
  app?: "terminal" | "browser";
  /** URL a precargar si el paso es de navegador (ej. "http://banco.nande/"). */
  url?: string;
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
    id: "l-cero-consola",
    title: "Cero absoluto: encendé la consola",
    level: "principiante",
    summary: "Qué es esta pantalla negra y cómo hablarle a la computadora.",
    concept:
      "La 'terminal' es una ventanita donde le escribís órdenes a la computadora con palabras, en vez de tocar botones. Vos escribís, ella hace y te contesta.",
    reward: { xp: 40, coins: 30 },
    steps: [
      {
        explain:
          "Imaginá que la computadora es un ayudante que no te ve la cara. Lo primero es preguntarle: ¿yo quién soy acá adentro? Eso se pide con 'whoami' (en inglés: '¿quién soy?').",
        task: "Escribí: whoami",
        hint: "Solo escribí la palabra whoami y apretá Enter.",
        check: (cmd, out) =>
          usedTool(cmd, "whoami") && /student|estudiante/i.test(out),
        debrief:
          "¡Ese sos vos! Sos el usuario 'student'. Cada persona en una computadora tiene un nombre de usuario, como tu nombre en la escuela. Todo lo que hagas queda a nombre de ese usuario.",
      },
      {
        explain:
          "Ahora preguntemos: ¿en qué cajón estoy parado? Las computadoras guardan todo en 'carpetas' (como cajones). 'pwd' te dice en qué carpeta estás ahora.",
        task: "Escribí: pwd",
        hint: "Solo escribí pwd y Enter.",
        check: (cmd, out) => usedTool(cmd, "pwd") && out.includes("/home/"),
        debrief:
          "Estás en /home/student: tu carpeta personal, tu 'pieza'. La barra / separa las carpetas, como los pisos de un edificio. Siempre conviene saber dónde estás parado antes de tocar algo.",
      },
    ],
  },
  {
    id: "l-cero-mirar",
    title: "Cero absoluto: mirá y leé",
    level: "principiante",
    summary: "Ver qué hay en una carpeta y abrir un archivo para leerlo.",
    concept:
      "Antes de tocar, se mira. 'ls' lista lo que hay (como abrir el cajón y ver qué tiene). 'cat' abre un archivo de texto y te lo muestra.",
    reward: { xp: 40, coins: 30 },
    steps: [
      {
        explain:
          "Abramos el cajón para ver qué hay. 'ls' (de 'list', listar) muestra los archivos y carpetas del lugar donde estás.",
        task: "Escribí: ls",
        hint: "Solo escribí ls y Enter.",
        check: (cmd, out) =>
          usedTool(cmd, "ls") && /bienvenida|documentos/i.test(out),
        debrief:
          "Eso que apareció son tus archivos y carpetas. Ves 'bienvenida.txt' (un archivo de texto) y 'documentos' (una carpeta). Mirar antes de actuar es el hábito número uno de un buen hacker.",
      },
      {
        explain:
          "Hay un archivo llamado bienvenida.txt. Un '.txt' es texto puro, como una carta. 'cat' lo abre y te lo lee en pantalla.",
        task: "Leé el archivo: cat bienvenida.txt",
        hint: "Escribí: cat bienvenida.txt",
        check: (cmd, out) =>
          usedTool(cmd, "cat") &&
          cmd.includes("bienvenida") &&
          out.trim().length > 20 &&
          !/no existe|not found|no such|no se encontr/i.test(out),
        debrief:
          "¡Leíste tu primer archivo! Los hackers leen MUCHO: archivos de configuración, notas, registros. Muchas veces la contraseña o la pista está escrita en un archivo que nadie se molestó en esconder bien.",
      },
    ],
  },
  {
    id: "l-cero-moverse",
    title: "Cero absoluto: moverse entre carpetas",
    level: "principiante",
    summary: "Entrar y salir de carpetas sin perderte.",
    concept:
      "'cd' (change directory, cambiar de carpeta) te mueve de un cajón a otro. 'cd ..' te devuelve al cajón de arriba. Siempre podés confirmar con 'pwd'.",
    reward: { xp: 45, coins: 35 },
    steps: [
      {
        explain:
          "Vamos a entrar a la carpeta 'documentos'. Es como abrir un cajón que está dentro de otro cajón. Se usa 'cd' seguido del nombre.",
        task: "Entrá a la carpeta: cd documentos",
        hint: "Escribí: cd documentos",
        check: (cmd) => usedTool(cmd, "cd") && cmd.includes("documentos"),
        debrief:
          "Entraste. Ahora estás 'adentro' de documentos. Todo lo que hagas pasa ahí adentro hasta que salgas.",
      },
      {
        explain:
          "Confirmemos que nos movimos. 'pwd' de nuevo te dice dónde estás parado ahora.",
        task: "Confirmá dónde estás: pwd",
        hint: "Escribí: pwd",
        check: (cmd, out) => usedTool(cmd, "pwd") && out.includes("documentos"),
        debrief:
          "La ruta ahora termina en /documentos: te moviste de verdad. Cuando entres a máquinas ajenas, saber moverte sin perderte es clave. Para volver atrás usás 'cd ..' (dos puntitos = 'la carpeta de arriba').",
      },
    ],
  },
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
          "gobuster prueba una lista de nombres de carpeta contra la web y te dice cuáles existen (código 200), sin necesidad de que estén enlazadas.",
        task: "Buscá rutas ocultas: gobuster 10.10.5.10",
        hint: "Escribí: gobuster 10.10.5.10",
        hints: [
          "La herramienta se llama gobuster y necesita el objetivo.",
          "El objetivo es la máquina 10.10.5.10.",
          "Escribí exactamente: gobuster 10.10.5.10",
        ],
        check: (cmd, out) =>
          usedTool(cmd, "gobuster") && cmd.includes("10.10.5.10") && out.includes("/admin"),
        debrief:
          "Apareció /admin y /robots.txt: rutas que no estaban a la vista. Los paneles ocultos son un blanco típico.",
      },
      {
        explain:
          "Encontrar una ruta no es entrar: hay que pedirla. Con curl le hacés la petición HTTP directamente y ves qué responde.",
        task: "Abrí la ruta oculta: curl http://10.10.5.10/admin",
        hint: "Escribí: curl http://10.10.5.10/admin",
        hints: [
          "Usá curl contra la URL completa.",
          "La URL es http://10.10.5.10/admin",
          "Escribí: curl http://10.10.5.10/admin",
        ],
        check: (cmd, out) =>
          usedTool(cmd, "curl") && cmd.includes("/admin") && /200|admin/i.test(out),
        debrief:
          "El servidor te devolvió la página del panel: estaba ahí, sólo que sin enlace. 'Oculto' no es 'protegido'.",
      },
      {
        explain:
          "robots.txt le pide a los buscadores que NO indexen ciertas rutas… lo que a un atacante le sirve justo para descubrirlas. Es lo primero que se mira.",
        task: "Leé el mapa que el sitio regala: curl http://10.10.5.10/robots.txt",
        hint: "Escribí: curl http://10.10.5.10/robots.txt",
        hints: [
          "Pedí el archivo robots.txt con curl.",
          "La URL es http://10.10.5.10/robots.txt",
          "Escribí: curl http://10.10.5.10/robots.txt",
        ],
        check: (cmd, out) =>
          usedTool(cmd, "curl") && cmd.includes("robots.txt") && /200|robots|disallow|admin/i.test(out),
        debrief:
          "robots.txt suele listar justo las rutas 'privadas'. Defensa: no confiar en robots para esconder nada, proteger los paneles con autenticación y vigilar los 404 masivos de un gobuster.",
      },
    ],
  },
  {
    id: "l-recon-mirror",
    title: "Clonar un sitio para estudiarlo offline",
    level: "intermedio",
    summary: "Bajás una copia del sitio con wget y la analizás sin volver a tocar el servidor.",
    concept:
      "El mirroring es recon puro: te llevás una copia del sitio a tu máquina y la peinás tranquilo (links, comentarios, rutas). Menos ruido en el objetivo y todo el tiempo del mundo para leer. wget -r sigue los links del HTML como haría un navegador.",
    reward: { xp: 170, coins: 130 },
    steps: [
      {
        explain:
          "Primero, una sola página para ver cómo funciona: wget baja el HTML y lo guarda en ./<host>/. No lo muestra pelado como curl: guarda el archivo para después.",
        task: "Bajá el login: wget http://banco.nande/login",
        hint: "Escribí: wget http://banco.nande/login",
        hints: [
          "La herramienta es wget y necesita la URL completa.",
          "La URL es http://banco.nande/login",
          "Escribí: wget http://banco.nande/login",
        ],
        check: (cmd, out) =>
          usedTool(cmd, "wget") && cmd.includes("banco.nande") && /\.html|guardado|HTTP 200/i.test(out),
        debrief:
          "Quedó ./banco.nande/login.html en tu disco. Ya tenés una copia para analizar sin volver a pedirla al servidor.",
      },
      {
        explain:
          "Para clonar el área privada hay que tener sesión. Entrá con el bypass de SQLi que ya conocés: la cookie de sesión queda guardada y wget la va a reusar (mismo navegador, misma sesión).",
        task: "Conseguí sesión: curl -X POST http://banco.nande/login -d \"usuario=admin' -- &password=x\"",
        hint: "Es el mismo bypass de login por SQLi, mandado con curl -X POST y -d.",
        hints: [
          "Usá curl -X POST contra /login con -d \"usuario=...&password=...\".",
          "El usuario es  admin' --  (el comentario apaga el chequeo de la clave).",
          "curl -X POST http://banco.nande/login -d \"usuario=admin' -- &password=x\"",
        ],
        check: (cmd, out) =>
          usedTool(cmd, "curl") && /administrador|sesión iniciada|ND\{sqli_login_bypass\}/i.test(out),
        debrief:
          "Entraste sin la clave y el navegador guardó tu cookie de sesión. Ahora wget puede clonar lo que sólo se ve logueado.",
      },
      {
        explain:
          "Ahora el espejo del área privada: wget -r arranca en /panel y SIGUE los links del HTML (a /movimientos, /logout…), bajando cada página. Así se reconstruye el sitio entero de un tiro.",
        task: "Clonalo recursivo: wget -r http://banco.nande/panel",
        hint: "Agregá -r (recursivo) y apuntá a /panel: wget -r http://banco.nande/panel",
        hints: [
          "El flag -r hace que wget siga los links del HTML.",
          "Arrancá en el área privada: /panel.",
          "wget -r http://banco.nande/panel",
        ],
        check: (cmd, out) =>
          usedTool(cmd, "wget") && /-r|--mirror|-m\b/.test(cmd) && out.includes("/movimientos"),
        debrief:
          "wget siguió los links y bajó panel, movimientos y logout. Tenés el área privada entera en ./banco.nande/ para estudiar offline.",
      },
      {
        explain:
          "El premio del mirroring: analizás la copia sin tocar más el servidor. Un grep sobre los archivos te muestra los links (href) que quedaron guardados — ahí aparecen rutas que quizá no viste en pantalla.",
        task: "Peiná la copia: cat banco.nande/panel.html | grep href",
        hint: "Usá cat sobre el archivo clonado y pasalo por grep href con un pipe (|).",
        hints: [
          "grep se usa dentro de un pipe: cat <archivo> | grep <palabra>.",
          "El archivo es banco.nande/panel.html y la palabra es href.",
          "cat banco.nande/panel.html | grep href",
        ],
        check: (cmd, out) =>
          usedTool(cmd, "cat") && cmd.includes("grep") && out.includes("href"),
        debrief:
          "Encontraste los links dentro del HTML clonado, sin generar una sola petición nueva al banco. Eso es recon de bajo ruido. Defensa: no dejar rutas ni comentarios sensibles en el HTML, y recordar que cualquiera puede clonar lo que sirve tu servidor.",
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
  {
    id: "l-web-sqli-login",
    title: "Evadir un login con inyección SQL",
    level: "intermedio",
    summary: "Entrar como admin sin la contraseña, contra una base real.",
    concept:
      "Si un login arma la consulta pegando tu texto, un comentario SQL (--) puede anular la verificación de la contraseña.",
    reward: { xp: 160, coins: 120 },
    steps: [
      {
        explain:
          "El banco del mundo arma la consulta del login concatenando lo que escribís. Mirá cómo responde con datos cualquiera.",
        task: 'Probá: curl -X POST http://banco.nande/login -d "usuario=rocio&password=malo"',
        hint: 'curl -X POST http://banco.nande/login -d "usuario=rocio&password=malo"',
        check: (cmd: string, out: string) =>
          cmd.includes("banco.nande/login") && /incorrect|error|HTTP/i.test(out),
        debrief:
          "Con datos malos no entra. Pero la consulta usa tu texto: si cerrás la comilla del usuario y comentás el resto con --, la contraseña deja de importar.",
      },
      {
        explain:
          "Como usuario mandá  admin'--  : la comilla cierra la cadena y -- comenta la parte de la contraseña.",
        task: "Evadí el login como admin con admin'-- de usuario.",
        hint: `curl -X POST http://banco.nande/login -d "usuario=admin'--&password=x"`,
        check: (cmd: string, out: string) =>
          cmd.includes("banco.nande") && /admin/i.test(out) && !/incorrect/i.test(out),
        debrief:
          "Entraste como admin sin su contraseña. Defensa: consultas parametrizadas, donde los datos nunca se pegan al SQL.",
      },
    ],
  },
  {
    id: "l-web-sqli-union",
    title: "Robar datos con UNION SELECT",
    level: "intermedio",
    summary: "Sacar la tabla de contraseñas por un buscador inyectable.",
    concept:
      "UNION pega los resultados de otra consulta a la original: si controlás una consulta, podés leer cualquier tabla.",
    reward: { xp: 200, coins: 150 },
    steps: [
      {
        explain: "Logueáte como cliente para llegar al buscador de movimientos.",
        task: 'Entrá: curl -X POST http://banco.nande/login -d "usuario=rocio&password=girasol77"',
        hint: 'curl -X POST http://banco.nande/login -d "usuario=rocio&password=girasol77"',
        check: (cmd: string, out: string) =>
          cmd.includes("banco.nande/login") && /rocio|Saldo|sesi/i.test(out),
        debrief:
          "Adentro. El buscador arma otra consulta con tu texto y devuelve 4 columnas: es inyectable con UNION.",
      },
      {
        explain:
          "La tabla usuarios tiene id, usuario, password, rol, saldo. Cerrá con %' y armá un UNION de 4 columnas.",
        task: "Sacá las contraseñas con UNION SELECT desde el buscador.",
        hint: `curl "http://banco.nande/movimientos?q=%25' UNION SELECT id, usuario, password, rol FROM usuarios -- "`,
        check: (cmd: string, out: string) =>
          /union\s+select/i.test(cmd) && out.includes("M8arete-2024!"),
        debrief:
          "Extrajiste la contraseña del admin de otra tabla. UNION exige el mismo número de columnas (por eso se cuentan con ORDER BY n). Defensa: consultas parametrizadas y permisos mínimos de BD.",
      },
    ],
  },
  {
    id: "l-web-idor",
    title: "Acceder a datos ajenos (IDOR)",
    level: "intermedio",
    summary: "Ver el álbum privado de otro cambiando un número.",
    concept:
      "Si el servidor no comprueba de quién es un recurso, cambiar el id te da acceso a lo ajeno.",
    reward: { xp: 140, coins: 100 },
    steps: [
      {
        explain: "Fotos Arandú muestra álbumes por ?id=. Mirá el álbum 1, que es tuyo.",
        task: "Abrí: curl http://fotos.arandu.nande/album?id=1",
        hint: "curl http://fotos.arandu.nande/album?id=1",
        check: (cmd: string) =>
          cmd.includes("fotos.arandu.nande/album") && cmd.includes("id=1"),
        debrief: "Te dio el álbum sin comprobar que sea tuyo. ¿Y si probás otros números?",
      },
      {
        explain: "Probá álbumes ajenos. El del admin tiene una bandera.",
        task: "Encontrá el álbum privado del admin (probá id=7).",
        hint: "curl http://fotos.arandu.nande/album?id=7",
        check: (_cmd: string, out: string) => out.includes("ND{idor_album_ajeno}"),
        debrief:
          "Leíste un recurso ajeno solo cambiando el id: eso es IDOR. Defensa: verificar que el recurso pertenece a quien lo pide.",
      },
    ],
  },
  {
    id: "l-web-cmdi",
    title: "Inyección de comandos",
    level: "avanzado",
    summary: "Ejecutar comandos en el servidor por una utilidad de red.",
    concept:
      "Si una web pasa tu texto a un comando de sistema sin filtrar, un ';' encadena tus propios comandos.",
    reward: { xp: 220, coins: 160 },
    steps: [
      {
        explain: "Herramientas Pytã hace ping a un host que escribís. Probá 127.0.0.1.",
        task: "curl http://tools.pyta.nande/ping?host=127.0.0.1",
        hint: "curl http://tools.pyta.nande/ping?host=127.0.0.1",
        check: (cmd: string, out: string) =>
          cmd.includes("tools.pyta.nande/ping") && /PING/i.test(out),
        debrief:
          "El host va a 'ping -c1 TU_TEXTO'. Si agregás ; y otro comando, se ejecuta también.",
      },
      {
        explain: "Encadená ; cat flag después del host para leer la bandera del servidor.",
        task: "Leé la bandera con inyección de comandos.",
        hint: 'curl "http://tools.pyta.nande/ping?host=127.0.0.1; cat flag"',
        check: (_cmd: string, out: string) => out.includes("ND{cmd_injection_pwned}"),
        debrief:
          "Ejecutaste 'cat flag' en el servidor. Defensa: nunca construir comandos con texto del usuario; usar APIs seguras y listas blancas.",
      },
    ],
  },

  /* ===================================================================
     MEGA UPDATE — lecciones de los sistemas nuevos (servicios, código,
     pivoting). Enseñan haciendo, verificando comando + salida reales.
     =================================================================== */
  {
    id: "l-servicios",
    title: "Servicios y puertos: apagá y prendé",
    level: "principiante",
    summary: "Entender que un puerto abierto es un servicio corriendo.",
    concept:
      "Un puerto está 'open' porque hay un servicio vivo detrás. Si lo apagás, el puerto se cierra y las webs dejan de responder. nmap, el navegador y curl miran el MISMO estado.",
    reward: { xp: 90, coins: 70 },
    steps: [
      {
        explain:
          "Todo servidor del mundo tiene servicios. Mirá los de server.nande y su estado real.",
        task: "Escribí: services server.nande",
        hint: "services server.nande",
        check: (cmd, out) =>
          usedTool(cmd, "services") && /nginx/i.test(out),
        debrief:
          "nginx (puerto 80) es lo que sirve la web. 'activo' = corriendo. Ese estado es real y se puede cambiar.",
      },
      {
        explain:
          "Apagá el servicio HTTP. A partir de ahí el sitio no debería responder.",
        task: "Escribí: service-stop nginx server.nande",
        hint: "service-stop nginx server.nande",
        check: (cmd) =>
          usedTool(cmd, "service-stop") && cmd.includes("nginx"),
        debrief:
          "Detuviste el proceso de nginx. El puerto 80 quedó cerrado para todo el mundo, no sólo para vos.",
      },
      {
        explain:
          "Comprobá el efecto: intentá abrir el sitio con curl. Debería fallar.",
        task: 'Escribí: curl http://server.nande',
        hint: "curl http://server.nande",
        check: (cmd, out) =>
          usedTool(cmd, "curl") &&
          cmd.includes("server.nande") &&
          /rechazada|caído|no responde/i.test(out),
        debrief:
          "curl, el navegador y nmap ven lo mismo porque consultan el mismo mundo. Volvé a prenderlo con service-start nginx server.nande. Defensa (Blue Team): apagar servicios innecesarios reduce la superficie de ataque.",
      },
    ],
  },
  {
    id: "l-codigo",
    title: "Programá tu primera herramienta",
    level: "intermedio",
    summary: "Escribir código que corre en el sandbox y se vuelve una tool.",
    concept:
      "En ÑANDE podés programar herramientas de verdad: se compilan, corren en un sandbox seguro y se instalan para reusarlas con 'run'.",
    reward: { xp: 120, coins: 90 },
    steps: [
      {
        explain:
          "Creá el esqueleto de una herramienta. Se guarda como archivo de código.",
        task: "Escribí: code new mi-scanner",
        hint: "code new mi-scanner",
        check: (cmd, out) => usedTool(cmd, "code") && /mi-scanner/.test(out),
        debrief:
          "Se creó un archivo con un mini-escáner de ejemplo. Podés editarlo en la app Código.",
      },
      {
        explain:
          "Instalala: se compila (rechazando cosas peligrosas) y queda ejecutable.",
        task: "Escribí: tool-install mi-scanner",
        hint: "tool-install mi-scanner",
        check: (cmd, out) =>
          usedTool(cmd, "tool-install") && /instalada/i.test(out),
        debrief:
          "Quedó registrada y persiste aunque cierres la app. Compilar la validó: sin fetch, sin eval, sin salir del sandbox.",
      },
      {
        explain: "Corré tu herramienta contra un host del mundo.",
        task: "Escribí: run mi-scanner server.nande",
        hint: "run mi-scanner server.nande",
        check: (cmd, out) =>
          usedTool(cmd, "run") && /tcp/i.test(out),
        debrief:
          "Tu código consultó el mundo virtual (los puertos reales del host) y devolvió resultado. Acabás de crear una tool funcional.",
      },
    ],
  },
  {
    id: "l-pivoting",
    title: "Pivoting: entrar y saltar a la red interna",
    level: "avanzado",
    summary: "Conectarse a una máquina y alcanzar lo que sólo se ve desde ahí.",
    concept:
      "Comprometido un host, te conectás con sus credenciales y desde adentro alcanzás máquinas de una red interna que no se ven desde afuera. Eso es pivotar.",
    reward: { xp: 160, coins: 120 },
    steps: [
      {
        explain:
          "Entrá a server.nande con las credenciales de soporte (las que se filtran por la red).",
        task: "Escribí: connect server.nande soporte Verano2024",
        hint: "connect server.nande soporte Verano2024",
        check: (cmd, out) =>
          usedTool(cmd, "connect") && /conectado a server\.nande/i.test(out),
        debrief:
          "Estás dentro del servidor. Ahora tu terminal opera contra ESA máquina.",
      },
      {
        explain:
          "Desde adentro, escaneá para ver la red interna que no se veía desde tu casa.",
        task: "Escribí: nmap",
        hint: "nmap",
        check: (_cmd, out) => /caja\.interna\.nande/i.test(out),
        debrief:
          "Apareció caja.interna.nande: sólo se ve pivotando por este server. Ese es el corazón del pivoting.",
      },
      {
        explain:
          "Saltá a la máquina interna con sus credenciales y leé la bandera.",
        task: "connect caja.interna.nande admin GiraSol#2024  y luego  cat /root/flag.txt",
        hint: "connect caja.interna.nande admin GiraSol#2024",
        check: (_cmd, out) => out.includes("ND{pivoting_red_interna}"),
        debrief:
          "Llegaste a la caja fuerte pivotando en cadena. Defensa (Blue Team): segmentar la red y no reusar credenciales corta el pivoting; el SOC detecta los accesos.",
      },
    ],
  },

  /* ===================================================================
     CAPSTONE "YVYTU CLOUD" — una intrusión completa, guiada paso a paso:
     foothold → escalada (sudo awk) → pivote lateral → exfiltración. Cada
     paso enciende su técnica en el SOC (mirá 'killchain' al final).
     =================================================================== */
  {
    id: "l-yvytu",
    title: "Capstone: comprometer un pipeline CI/CD de punta a punta",
    level: "avanzado",
    summary: "Una cadena real: foothold, escalar con sudo awk, pivotar y robar el botín.",
    concept:
      "Un ataque real no es un solo comando: es una cadena. Acá entrás a un runner de CI/CD con una clave floja, escalás a root abusando un sudo NOPASSWD sobre awk (GTFOBins), y usás las credenciales del pipeline para pivotar a un repositorio interno y robar el secreto. Cada paso deja rastro: el SOC lo ve.",
    reward: { xp: 320, coins: 240 },
    steps: [
      {
        explain:
          "El runner deploy.yvytu.nande expone SSH y el usuario de servicio 'ci' tiene una clave floja. Entrá.",
        task: "Escribí: connect deploy.yvytu.nande ci Deploy2024",
        hint: "connect deploy.yvytu.nande ci Deploy2024",
        check: (cmd, out) =>
          usedTool(cmd, "connect") && /conectado a deploy\.yvytu\.nande/i.test(out),
        debrief:
          "Tenés foothold como ci. Tu terminal ahora opera contra el runner.",
      },
      {
        explain: "Llevate la bandera de usuario para confirmar el acceso.",
        task: "Escribí: cat /home/ci/user.txt",
        hint: "cat /home/ci/user.txt",
        check: (_cmd, out) => out.includes("ND{yvytu_foothold}"),
        debrief:
          "Foothold confirmado. Pero 'ci' no es root: todavía no ves /root. Hay que escalar.",
      },
      {
        explain:
          "Mirá qué podés correr como root sin contraseña. Ese suele ser el vector de escalada.",
        task: "Escribí: sudo -l",
        hint: "sudo -l",
        check: (cmd, out) => usedTool(cmd, "sudo") && /awk/i.test(out) && /NOPASSWD/i.test(out),
        debrief:
          "ci puede correr awk como root sin clave. awk puede ejecutar comandos del sistema: es tu escape.",
      },
      {
        explain:
          "awk ejecuta comandos con BEGIN{system(...)}. Corrido como root, te abre una shell de root (GTFOBins).",
        task: "Escribí: sudo awk 'BEGIN{system(\"/bin/sh\")}'",
        hint: "sudo awk 'BEGIN{system(\"/bin/sh\")}'",
        check: (cmd, out) => usedTool(cmd, "sudo") && /sos root/i.test(out),
        debrief:
          "Sos root en el runner. La escalada IMPORTA: recién ahora leés /root. (SOC: se encendió Privilege Escalation, T1548.)",
      },
      {
        explain:
          "Ya root, el pipeline guarda en /root la credencial del repositorio de artefactos. Leela.",
        task: "Escribí: cat /root/deploy.env",
        hint: "cat /root/deploy.env",
        check: (_cmd, out) => /artefactos\.yvytu\.nande/i.test(out) && /deployer/i.test(out),
        debrief:
          "El .env filtra host y credencial del repo interno. Reusar credenciales del pipeline es un clásico: así se pivota.",
      },
      {
        explain:
          "El repositorio de artefactos vive en un segmento interno que SÓLO se ve desde el runner. Pivotá.",
        task: "Escribí: connect artefactos.yvytu.nande deployer Art3f@cts!2024",
        hint: "connect artefactos.yvytu.nande deployer Art3f@cts!2024",
        check: (cmd, out) =>
          usedTool(cmd, "connect") && /conectado a artefactos\.yvytu\.nande/i.test(out),
        debrief:
          "Movimiento lateral logrado (SOC: T1021). Estás en el repo que era invisible desde afuera.",
      },
      {
        explain: "Robá el botín: el secreto de producción del repositorio.",
        task: "Escribí: cat /root/flag.txt",
        hint: "cat /root/flag.txt",
        check: (_cmd, out) => out.includes("ND{yvytu_exfil}"),
        debrief:
          "Cadena completa: foothold → escalada → lateral → exfiltración (SOC: T1005). Corré 'killchain' y vas a ver toda tu historia. Defensa (Blue Team): quitar el sudo de awk, no guardar credenciales en /root ni reusarlas, y segmentar el repo cortan esta cadena.",
      },
    ],
  },

  /* ===================================================================
     BLUE TEAM — investigar y ATRIBUIR un incidente con el motor real:
     drill (incidente de práctica) → DFIR → atribución en TI → contención.
     El complemento defensivo del capstone rojo (rojo↔azul sobre un caso).
     =================================================================== */
  {
    id: "l-dfir-atribucion",
    title: "Blue Team: investigar y atribuir un incidente (DFIR → TI)",
    level: "avanzado",
    summary: "Generar un incidente real, reconstruirlo con DFIR, atribuir al actor y contenerlo.",
    concept:
      "Defender no es sólo apagar el fuego: es entender qué pasó, quién fue y con qué evidencia. Vas a generar un incidente de práctica, reconstruirlo con DFIR, sacar sus indicadores (IOCs), atribuirlo a un actor documentado en la plataforma de Threat Intelligence, y recién ahí contenerlo. Todo con el motor real: el mismo incidente que produce el mundo.",
    reward: { xp: 260, coins: 200 },
    steps: [
      {
        explain:
          "Generá un incidente de práctica: un ataque real contra tu data center, con el IOC que deja el actor.",
        task: "Escribí: defensa drill",
        hint: "defensa drill",
        check: (cmd, out) =>
          usedTool(cmd, "defensa") && /PRÁCTICA/i.test(out) && /IOC dejado/i.test(out),
        debrief:
          "Se cayó un servicio de tu data center y el atacante dejó un IOC. Ese indicador es tu hilo para atribuirlo.",
      },
      {
        explain: "Mirá el estado del Blue Team: el incidente abierto y su indicador.",
        task: "Escribí: defensa",
        hint: "defensa",
        check: (cmd, out) => usedTool(cmd, "defensa") && /🔴/.test(out),
        debrief:
          "Ahí está el incidente en rojo, con el IOC que dejó. Antes de contener, investiguemos.",
      },
      {
        explain: "Reconstruí el incidente con DFIR: la línea de tiempo de lo que pasó, desde la evidencia real.",
        task: "Escribí: dfir",
        hint: "dfir",
        check: (cmd, out) => usedTool(cmd, "dfir") && /(reconstrucción|Severidad|Técnicas MITRE)/i.test(out),
        debrief:
          "El DFIR arma el timeline desde los eventos reales del mundo, no de un guion.",
      },
      {
        explain: "Extraé los indicadores de compromiso (IOCs). El del actor aparece como 'amenaza'.",
        task: "Escribí: dfir iocs",
        hint: "dfir iocs",
        check: (cmd, out) =>
          usedTool(cmd, "dfir") && /Indicadores de compromiso/i.test(out) && /amenaza/i.test(out),
        debrief:
          "El IOC de 'amenaza' es el que atribuye: pertenece a la infraestructura de un actor documentado.",
      },
      {
        explain:
          "Atribuí el ataque en la plataforma de TI: nombrás al actor y fundamentás con SU IOC. (Mirá los actores en: curl http://ti.nande/actores)",
        task: 'Escribí: curl "http://ti.nande/atribuir?ioc=cdn-sync.invalid&actor=RedViper"',
        hint: 'curl "http://ti.nande/atribuir?ioc=cdn-sync.invalid&actor=RedViper"',
        hints: [
          "Un IOC bien atribuido vale más que mil rumores: usá uno de confianza alta (el que dejó el actor), no un rumor.",
          "El actor es aquel cuya infraestructura conocida incluye ese IOC. Buscalo en curl http://ti.nande/actores.",
          'curl "http://ti.nande/atribuir?ioc=cdn-sync.invalid&actor=RedViper"',
        ],
        check: (_cmd, out) => out.includes("ND{ti_atribucion}"),
        debrief:
          "Atribución correcta y fundada (bandera ND{ti_atribucion}). Sabés qué pasó y quién fue. Ahora, a contener.",
      },
      {
        explain: "Contené el incidente: restaurá el servicio caído. Responder rápido puntúa (sube tu reputación defensiva).",
        task: "Escribí: contener all",
        hint: "contener all",
        check: (cmd, out) => usedTool(cmd, "contener") && /(Contuviste|contenido|restaurad)/i.test(out),
        debrief:
          "Incidente cerrado: investigado, atribuido y contenido. Ese es el ciclo azul completo. En un cyber range, esto vale igual que el ataque — suma a tu reputación.",
      },
    ],
  },

  /* ===================================================================
     ANONIMATO Y OPSEC — cuidar tu rastro. Aprendizaje avanzado: qué te
     delata y cómo bajás tu huella (sin creer en la "invisibilidad total").
     =================================================================== */
  {
    id: "l-anonimato",
    title: "Anonimato: tu huella y cómo bajarla",
    level: "avanzado",
    summary: "Ver qué te identifica en la red y reducirlo (MAC, red tipo Tor).",
    concept:
      "En la red te identifican tu IP y la MAC de tu placa. Podés cambiar la MAC (MAC spoofing) y enrutar el tráfico por una red de anonimato (tipo Tor) para que el destino vea otra IP. El anonimato perfecto NO existe: baja tu huella, no la borra.",
    reward: { xp: 140, coins: 100 },
    steps: [
      {
        explain:
          "Primero, mirá tu huella actual: qué IP y MAC te identifican y qué nivel de anonimato tenés.",
        task: "Escribí: identidad",
        hint: "identidad",
        check: (cmd, out) => usedTool(cmd, "identidad") && /IP real/i.test(out),
        debrief:
          "Esa IP y esas MAC te siguen a todas partes. Bajemos la huella paso a paso.",
      },
      {
        explain:
          "La MAC es el 'número de serie' de tu placa de red en la red local. Cambiala para no ser el mismo dispositivo de siempre.",
        task: "Escribí: macchanger wlan0 random",
        hint: "macchanger wlan0 random",
        check: (cmd, out) =>
          usedTool(cmd, "macchanger") && cmd.includes("wlan0") && /cambiada/i.test(out),
        debrief:
          "Cambiaste tu MAC: en la red local ahora sos otro equipo. Defensa (Blue Team): monitorear cambios de MAC y usar 802.1X.",
      },
      {
        explain:
          "Ahora enrutá tu tráfico por la red de anonimato: el destino verá la IP de un nodo de salida en otro país, no la tuya.",
        task: "Escribí: anon on",
        hint: "anon on",
        check: (cmd, out) => usedTool(cmd, "anon") && /ACTIVADA|anonimato/i.test(out),
        debrief:
          "Tu tráfico sale por un nodo lejano. Cambiá de circuito con 'anon new' cuando quieras otra salida.",
      },
      {
        explain:
          "Confirmá el cambio: volvé a mirar tu identidad. La IP visible ya no debería ser la tuya.",
        task: "Escribí: identidad",
        hint: "identidad",
        check: (cmd, out) =>
          usedTool(cmd, "identidad") && /por la red de anonimato/i.test(out),
        debrief:
          "Subiste tu nivel de anonimato. Pero OJO: los metadatos, los horarios y reutilizar identidades te delatan igual. Eso lo vemos en OPSEC.",
      },
    ],
  },
  {
    id: "l-opsec",
    title: "OPSEC: lo que te delata sin que lo notes",
    level: "avanzado",
    summary: "Metadatos y errores que arruinan el anonimato — y cómo evitarlos.",
    concept:
      "OPSEC (seguridad de las operaciones) es cuidar los detalles: una foto lleva tu ubicación GPS y tu nombre en los metadatos; publicar a la misma hora, reusar un alias o mandar un archivo sin limpiar te identifica aunque uses Tor.",
    reward: { xp: 150, coins: 110 },
    steps: [
      {
        explain:
          "Mirá los metadatos de una foto con exiftool. Vas a ver cuánto delata un archivo común.",
        task: "Escribí: exiftool foto.jpg",
        hint: "exiftool foto.jpg",
        check: (cmd, out) => usedTool(cmd, "exiftool") && /GPS/i.test(out),
        debrief:
          "La foto tenía tu nombre y tu ubicación GPS. Publicada así, te ubica en el mapa. Nunca subas archivos sin revisar esto.",
      },
      {
        explain:
          "Limpiá los metadatos antes de publicar. Con exiftool se borran de un saque.",
        task: "Escribí: exiftool -all= foto.jpg",
        hint: "exiftool -all= foto.jpg",
        check: (cmd, out) => usedTool(cmd, "exiftool") && /ELIMINADOS/i.test(out),
        debrief:
          "Ahora el archivo no te delata. Regla OPSEC: limpiá metadatos SIEMPRE, separá identidades, variá horarios y nunca mezcles tu vida real con la operación. La técnica sin OPSEC no sirve.",
      },
    ],
  },

  /* ===================================================================
     CRIPTOGRAFÍA Y CRACKING — cómo se guardan y se rompen las claves.
     =================================================================== */
  {
    id: "l-cripto",
    title: "Criptografía: hashes y cracking",
    level: "avanzado",
    summary: "Identificar un hash y romper una contraseña débil (y cómo defenderla).",
    concept:
      "Las contraseñas no se guardan tal cual: se guardan 'hasheadas'. Un hash es de una sola vía, pero si la clave es débil se rompe probando (fuerza bruta / diccionario). Por eso importan las claves largas, el 'salt' y los hashes lentos (bcrypt/argon2).",
    reward: { xp: 140, coins: 100 },
    steps: [
      {
        explain:
          "Primero identificá qué tipo de hash tenés: la longitud delata el algoritmo. Un MD5 tiene 32 caracteres.",
        task: "Escribí: hashid 5f4dcc3b5aa765d61d8327deb882cf99",
        hint: "hashid 5f4dcc3b5aa765d61d8327deb882cf99",
        check: (cmd, out) => usedTool(cmd, "hashid") && /MD5/i.test(out),
        debrief:
          "Es MD5: rápido y viejo, pésimo para guardar contraseñas justamente porque se rompe rápido.",
      },
      {
        explain:
          "Ahora rompelo: 'crack' prueba un diccionario contra el hash. Esta clave es débil, así que caerá.",
        task: "Escribí: crack 5f4dcc3b5aa765d61d8327deb882cf99",
        hint: "crack 5f4dcc3b5aa765d61d8327deb882cf99",
        check: (cmd, out) => usedTool(cmd, "crack") && /roto/i.test(out),
        debrief:
          "Era 'password'. Defensa: claves largas y únicas, hashes LENTOS con salt (bcrypt/argon2) y segundo factor. Así el diccionario no alcanza.",
      },
    ],
  },

  /* ===================================================================
     OSINT — lo que se sabe de un objetivo mirando fuentes abiertas.
     =================================================================== */
  {
    id: "l-osint",
    title: "OSINT: el rastro público",
    level: "intermedio",
    summary: "Reunir información de fuentes abiertas y entender por qué es peligrosa.",
    concept:
      "OSINT es investigar con información PÚBLICA: quién registró un dominio, en qué redes está un usuario, qué dejó ver la gente. Con piezas sueltas se arma un perfil. Es la otra cara del OPSEC.",
    reward: { xp: 120, coins: 90 },
    steps: [
      {
        explain:
          "Empezá por el dominio: 'whois' dice quién y cuándo lo registró.",
        task: "Escribí: whois banco.nande",
        hint: "whois banco.nande",
        check: (cmd, out) => usedTool(cmd, "whois") && /Registrante/i.test(out),
        debrief:
          "Con eso ya tenés un punto de partida. Ahora busquemos a una persona.",
      },
      {
        explain:
          "'sherlock' busca un mismo nombre de usuario en muchos sitios: si alguien reusa su alias, lo encontrás en todos.",
        task: "Escribí: sherlock kamba",
        hint: "sherlock kamba",
        check: (cmd, out) => usedTool(cmd, "sherlock") && /\[\+\]/.test(out),
        debrief:
          "Reusar el mismo alias conecta todos tus perfiles: eso es lo que rompe el anonimato. Defensa/OPSEC: separá identidades y minimizá lo que publicás.",
      },
    ],
  },

  /* ===================================================================
     WIRELESS — seguridad de redes WiFi (con permiso, en el laboratorio).
     =================================================================== */
  {
    id: "l-wifi",
    title: "WiFi: por qué una clave débil se rompe",
    level: "intermedio",
    summary: "Escanear redes y crackear un WPA2 con clave de diccionario.",
    concept:
      "El WiFi WPA2 se protege con una clave. Si es corta o común, se puede capturar el 'handshake' y probarla contra un diccionario hasta romperla. La defensa es una clave larga y aleatoria (o WPA3).",
    reward: { xp: 130, coins: 100 },
    steps: [
      {
        explain:
          "Mirá qué redes hay alrededor y con qué seguridad. Siempre con permiso y sobre tu propia red.",
        task: "Escribí: wifi scan",
        hint: "wifi scan",
        check: (cmd, out) => usedTool(cmd, "wifi") && /Vecino-2G/i.test(out),
        debrief:
          "Cada red muestra su cifrado. WPA2 con clave débil es atacable; una red abierta ni siquiera cifra.",
      },
      {
        explain:
          "Para capturar el handshake hay que poner la placa en 'modo espía' (monitor). Ese es el primer paso real de la suite aircrack-ng.",
        task: "Escribí: airmon-ng start wlan0",
        hint: "airmon-ng start wlan0",
        check: (cmd, out) => usedTool(cmd, "airmon-ng") && /wlan0mon|monitor/i.test(out),
        debrief:
          "Ahora la interfaz wlan0mon escucha TODO el aire, no solo tu red. Sin esto, airodump y aireplay no funcionan.",
      },
      {
        explain:
          "El handshake solo viaja cuando alguien se conecta. Un ataque de deauth expulsa a un cliente para que, al reconectarse, lo capturemos.",
        task: "Escribí: aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon",
        hint: "aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon",
        check: (cmd, out) => usedTool(cmd, "aireplay-ng") && /handshake/i.test(out),
        debrief:
          "El deauth SÍ se detecta (es una firma clásica). WPA3 y 802.11w lo bloquean: por eso son la defensa.",
      },
      {
        explain:
          "Con el handshake capturado, aircrack-ng prueba un diccionario (rockyou.txt) contra él. Si la clave es débil, cae.",
        task: "Escribí: aircrack-ng -w rockyou.txt Vecino-2G",
        hint: "aircrack-ng -w rockyou.txt Vecino-2G",
        check: (cmd, out) => usedTool(cmd, "aircrack-ng") && /KEY FOUND/i.test(out),
        debrief:
          "La clave estaba en el diccionario. Defensa: clave larga y aleatoria (12+ caracteres), WPA3 y no reusar la contraseña del router.",
      },
    ],
  },

  /* ===================================================================
     ANÁLISIS ESTÁTICO — buscar secretos dentro de archivos/binarios.
     =================================================================== */
  {
    id: "l-reversing",
    title: "Análisis estático: secretos en los archivos",
    level: "avanzado",
    summary: "Extraer cadenas de un archivo y encontrar credenciales quemadas.",
    concept:
      "Muchos programas guardan secretos 'quemados' en el código o la config. 'strings' saca todo el texto legible de un archivo: a veces ahí aparecen usuarios y contraseñas. Nunca hay que dejar credenciales en el código.",
    reward: { xp: 130, coins: 100 },
    steps: [
      {
        explain:
          "En una máquina de laboratorio hay un archivo de configuración. Sacale las cadenas legibles con 'strings'.",
        task: "Escribí: strings /var/www/config.php",
        hint: "strings /var/www/config.php",
        check: (cmd, out) => usedTool(cmd, "strings") && /pass/i.test(out),
        debrief:
          "Apareció una credencial quemada en la config. Defensa: nunca guardar secretos en el código; usar variables de entorno o un gestor de secretos, y rotarlos.",
      },
    ],
  },

  /* ===================================================================
     BLUE TEAM — detectar. Toda acción real deja un evento que el SOC ve.
     =================================================================== */
  {
    id: "l-blueteam",
    title: "Blue Team: detectar lo que pasa",
    level: "avanzado",
    summary: "Ver cómo una acción genera un evento y el SOC lo convierte en alerta.",
    concept:
      "El defensor no ataca: observa. Cada acción en el mundo (un servicio que cae, un login fallido) deja un evento, y el SOC lo convierte en una alerta con severidad. Detectar a tiempo es la mitad de la defensa.",
    reward: { xp: 140, coins: 100 },
    steps: [
      {
        explain:
          "Provocá un incidente: detené el servicio web de un host. Eso, en la vida real, sería una caída sospechosa.",
        task: "Escribí: service-stop nginx server.nande",
        hint: "service-stop nginx server.nande",
        check: (cmd, out) => usedTool(cmd, "service-stop") && /detenido|✔/i.test(out),
        debrief:
          "Ese cambio quedó registrado como evento del sistema, aunque nadie estuviera mirando.",
      },
      {
        explain:
          "Ahora ponete el sombrero de Blue Team: mirá el panel del SOC. La caída tiene que aparecer como alerta.",
        task: "Escribí: soc alerts",
        hint: "soc alerts",
        check: (cmd, out) => usedTool(cmd, "soc") && /server\.nande/i.test(out),
        debrief:
          "El SOC detectó la caída y la clasificó. Blue Team: investigás la alerta, contenés y documentás. La detección temprana es lo que frena un ataque real.",
      },
    ],
  },

  /* ===================================================================
     NUBE — configuraciones inseguras (buckets/IAM/contenedores).
     =================================================================== */
  {
    id: "l-cloud",
    title: "Nube: un bucket público lo lee cualquiera",
    level: "avanzado",
    summary: "Leer un bucket mal configurado y entender el default seguro.",
    concept:
      "En la nube, el almacenamiento (buckets) debe ser privado por defecto. Uno marcado 'público' lo lee cualquiera de Internet — y ahí suele haber secretos (.env, backups).",
    reward: { xp: 150, coins: 110 },
    steps: [
      {
        explain:
          "El servicio de nube tiene un bucket marcado PÚBLICO. Leelo directo con curl, sin credenciales.",
        task: "Escribí: curl http://cloud.nande/buckets/nimbus-backups",
        hint: "curl http://cloud.nande/buckets/nimbus-backups",
        check: (cmd, out) => usedTool(cmd, "curl") && /cloud_bucket_publico/i.test(out),
        debrief:
          "Un bucket público expone todo a Internet. Defensa: privado por defecto, cifrado, y nunca guardar secretos ahí; revisar accesos periódicamente.",
      },
    ],
  },

  /* ===================================================================
     DEVSECOPS — secretos en el repo y dependencias vulnerables.
     =================================================================== */
  {
    id: "l-devsecops",
    title: "DevSecOps: el secreto que quedó en git",
    level: "avanzado",
    summary: "Encontrar un token filtrado en la historia de git.",
    concept:
      "Borrar un archivo con secretos NO los borra: en git quedan en el commit donde se subieron. Por eso nunca hay que commitear credenciales, y si pasa, hay que rotarlas y purgar la historia.",
    reward: { xp: 150, coins: 110 },
    steps: [
      {
        explain:
          "En el pipeline hay un repo. Mirá el commit donde subieron config.env 'por error'.",
        task: "Escribí: curl http://ci.nande/repo/commit/4d5e6f",
        hint: "curl http://ci.nande/repo/commit/4d5e6f",
        check: (cmd, out) => usedTool(cmd, "curl") && /devsecops_secreto_filtrado/i.test(out),
        debrief:
          "El token seguía ahí aunque borraron el archivo después. Defensa: .gitignore + gestor de secretos, escaneo de secretos en CI, y rotar lo filtrado.",
      },
    ],
  },

  /* ===================================================================
     THREAT INTEL — atribuir con evidencia, no con rumores.
     =================================================================== */
  {
    id: "l-threatintel",
    title: "Threat Intel: atribuir con evidencia",
    level: "avanzado",
    summary: "Atribuir un ataque cruzando IOCs de confianza con el actor correcto.",
    concept:
      "La inteligencia de amenazas cruza indicadores (IOCs) con actores conocidos. Clave: usar indicadores de CONFIANZA ALTA. Atribuir por un rumor de baja confianza puede acusar al equivocado.",
    reward: { xp: 150, coins: 110 },
    steps: [
      {
        explain:
          "Atribuí el incidente usando un IOC de confianza alta y el actor cuya infraestructura coincide.",
        task: 'Escribí: curl "http://ti.nande/atribuir?ioc=nande_lock&actor=gris"',
        hint: 'curl "http://ti.nande/atribuir?ioc=nande_lock&actor=gris"',
        check: (cmd, out) => usedTool(cmd, "curl") && /ti_atribucion/i.test(out),
        debrief:
          "Atribuiste bien y con fundamento. Regla: nunca atribuir con un solo indicador débil; correlacioná varias fuentes de confianza.",
      },
    ],
  },

  /* ===================================================================
     INGENIERÍA SOCIAL — reconocer un phishing.
     =================================================================== */
  {
    id: "l-phishing",
    title: "Ingeniería social: cazar un phishing",
    level: "intermedio",
    summary: "Analizar un correo y reconocer las señales de engaño.",
    concept:
      "La mayoría de los ataques empiezan por una persona, no por un exploit. El phishing usa remitentes parecidos, enlaces engañosos y urgencia para que hagas clic sin pensar.",
    reward: { xp: 120, coins: 90 },
    steps: [
      {
        explain:
          "Analizá un correo sospechoso con phish-analyzer: te marca las señales de engaño.",
        task: "Escribí: phish-analyzer correo-01",
        hint: "phish-analyzer correo-01",
        check: (cmd, out) => usedTool(cmd, "phish-analyzer") && /phishing/i.test(out),
        debrief:
          "Remitente falso, enlace mentiroso y urgencia: el combo clásico. Defensa: no hagas clic apurado, verificá el dominio real y activá segundo factor. Ante la duda, no abras.",
      },
    ],
  },
  {
    id: "l-dns",
    title: "Nombres y números: cómo encuentra la web (DNS)",
    level: "principiante",
    summary: "Entender que cada nombre esconde un número (una IP).",
    concept:
      "Vos escribís 'banco.nande', pero las máquinas no entienden nombres: usan números llamados IP. El DNS es la 'guía telefónica' que traduce el nombre al número.",
    reward: { xp: 70, coins: 50 },
    steps: [
      {
        explain:
          "Preguntémosle al DNS qué número (IP) tiene un nombre. Es como buscar un contacto en la agenda: ponés el nombre y te da el teléfono.",
        task: "Traducí el nombre a IP: nslookup banco.nande",
        hint: "Escribí: nslookup banco.nande",
        hints: [
          "La herramienta se llama nslookup.",
          "Pedile la IP de banco.nande.",
          "Escribí: nslookup banco.nande",
        ],
        check: (cmd, out) =>
          usedTool(cmd, "nslookup") && out.includes("10.10.7.10"),
        debrief:
          "banco.nande vive en 10.10.7.10. Todo nombre se traduce así antes de conectarse.",
      },
      {
        explain:
          "Cada nombre tiene su propio número. Probá otro host del mundo y compará: el DNS te va armando el mapa de la red.",
        task: "Traducí otro nombre: nslookup server.nande",
        hint: "Escribí: nslookup server.nande",
        hints: [
          "Mismo comando, otro nombre.",
          "El host es server.nande.",
          "Escribí: nslookup server.nande",
        ],
        check: (cmd, out) =>
          usedTool(cmd, "nslookup") && cmd.includes("server.nande") && out.includes("10.10.0.42"),
        debrief:
          "server.nande está en 10.10.0.42, otra subred. Mapear nombre→IP es el primer paso del reconocimiento.",
      },
      {
        explain:
          "dig es la herramienta pro para consultar DNS: muestra el 'registro A' (el que liga nombre → IPv4) con más detalle que nslookup.",
        task: "Consultá el registro A: dig banco.nande",
        hint: "Escribí: dig banco.nande",
        hints: [
          "La herramienta se llama dig.",
          "Consultá banco.nande.",
          "Escribí: dig banco.nande",
        ],
        check: (cmd, out) =>
          usedTool(cmd, "dig") && cmd.includes("banco.nande") && /\bA\b|10\.10\.7\.10/.test(out),
        debrief:
          "El registro A es el que traduce a IPv4. Para un atacante, el DNS revela nombres internos y a veces IPs que no deberían verse desde afuera. Defensa: separar el DNS interno del público (split-horizon).",
      },
    ],
  },
  {
    id: "l-http-xss",
    title: "Hablarle a una web sin navegador (HTTP) + tu primer XSS",
    level: "intermedio",
    summary: "Pedir una página con curl y lograr que ejecute tu código.",
    concept:
      "Una web es un servidor que te contesta cuando le pedís algo (HTTP). Con 'curl' le pedís directo desde la terminal. Si el sitio no filtra lo que escribís, podés inyectar código: eso es XSS.",
    reward: { xp: 130, coins: 100 },
    steps: [
      {
        explain:
          "Primero pedile la página de inicio al blog, sin abrir el navegador. 'curl' trae el HTML crudo y te muestra el código de estado (200 = todo bien).",
        task: "Pedí la página: curl http://blog.yvoty.nande/",
        hint: "Escribí: curl http://blog.yvoty.nande/",
        check: (cmd, out) =>
          usedTool(cmd, "curl") &&
          cmd.includes("blog.yvoty") &&
          out.includes("200"),
        debrief:
          "El servidor te contestó '200 OK' y te mandó su contenido. Así funciona toda la web: pedido → respuesta. Ahora fijate que el buscador refleja lo que escribís…",
      },
      {
        explain:
          "El buscador devuelve tal cual lo que le pasás en ?q=. Si le mandás una etiqueta <script>, el navegador la EJECUTA en vez de mostrarla. Eso es Cross-Site Scripting (XSS).",
        task:
          "Inyectá un script: curl http://blog.yvoty.nande/?q=<script>alert(1)</script>",
        hint:
          "Escribí: curl http://blog.yvoty.nande/?q=<script>alert(1)</script>",
        check: (cmd, out) =>
          usedTool(cmd, "curl") &&
          /xss_reflejado|xss reflejado/i.test(out),
        debrief:
          "¡Capturaste ND{xss_reflejado}! El sitio no 'escapó' tu texto, así que tu <script> corrió. Con esto un atacante roba sesiones o engaña usuarios. Defensa: escapar/filtrar TODO lo que el usuario escribe antes de mostrarlo.",
      },
    ],
  },
  {
    id: "l-jwt",
    title: "Romper un token JWT (clave débil)",
    level: "avanzado",
    summary: "Leer, crackear y forjar un token de sesión.",
    concept:
      "Muchos sitios te dan un 'token' (JWT) que dice quién sos y qué rol tenés. Está firmado con una clave secreta. Si esa clave es débil, se puede adivinar y entonces te fabricás un token de admin.",
    reward: { xp: 200, coins: 160 },
    steps: [
      {
        explain:
          "Un JWT tiene 3 partes separadas por puntos: encabezado, datos y firma. 'jwt decode' te muestra qué dice adentro (no está cifrado, solo codificado).",
        task:
          "Leé el token: jwt decode eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3VhcmlvIjoicm9jaW8iLCJyb2wiOiJjbGllbnRlIn0.tz0HEvkrWYXTlNMMkKy23z7R6SspncHkFJB_F7_5pCo",
        hint: "Copiá: jwt decode <el token largo>",
        check: (cmd, out) =>
          usedTool(cmd, "jwt") &&
          cmd.includes("decode") &&
          /payload|rol|usuario/i.test(out),
        debrief:
          "Ves que el token dice rol:cliente. El servidor confía en esto… si la firma es válida. Ahora atacamos la firma.",
      },
      {
        explain:
          "'jwt crack' prueba miles de claves comunes contra la firma. Si el desarrollador usó una clave floja, la encuentra en segundos.",
        task:
          "Crackeá la clave: jwt crack eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3VhcmlvIjoicm9jaW8iLCJyb2wiOiJjbGllbnRlIn0.tz0HEvkrWYXTlNMMkKy23z7R6SspncHkFJB_F7_5pCo",
        hint: "Copiá: jwt crack <el token largo>",
        check: (cmd, out) =>
          usedTool(cmd, "jwt") &&
          cmd.includes("crack") &&
          /clave|encontrad|nande/i.test(out),
        debrief:
          "La clave era 'nande'. Con la clave en la mano, ya podés firmar tus propios tokens: el servidor los va a creer.",
      },
      {
        explain:
          "Ahora forjás un token nuevo diciendo que sos admin, firmado con la clave que encontraste. El servidor no puede distinguirlo del real.",
        task: "Forjá un token admin: jwt forge nande rol=admin usuario=admin",
        hint: "Escribí: jwt forge nande rol=admin usuario=admin",
        check: (cmd, out) =>
          usedTool(cmd, "jwt") && cmd.includes("forge") && out.includes("eyJ"),
        debrief:
          "Fabricaste un token de admin. Eso es una escalada de privilegios completa. Defensa: usar claves largas y aleatorias, algoritmos fuertes, y NUNCA aceptar alg:none. Firmar bien es todo.",
      },
    ],
  },
  {
    id: "l-pivot",
    title: "Pivoting: saltar a la red interna",
    level: "avanzado",
    summary: "Usar una máquina comprometida como puente hacia lo oculto.",
    concept:
      "Hay máquinas que no se ven desde afuera. El truco: entrás a una máquina de borde con credenciales robadas y, desde adentro, alcanzás la red interna. A eso se le dice 'pivotar'.",
    reward: { xp: 220, coins: 180 },
    steps: [
      {
        explain:
          "Entramos al servidor de borde con credenciales de soporte (las mismas que se sniffean en el lab de tráfico). 'connect' abre una sesión adentro de esa máquina.",
        task: "Entrá al server: connect server.nande soporte Verano2024",
        hint: "Escribí: connect server.nande soporte Verano2024",
        check: (cmd, out) =>
          usedTool(cmd, "connect") && /conectad/i.test(out),
        debrief:
          "Estás DENTRO de server.nande. Ahora ves lo que ve esa máquina, no lo que ve tu compu. Muchos archivos guardan pistas de la red interna.",
      },
      {
        explain:
          "Adentro, los administradores dejan notas. Leé la nota de soporte: suele tener credenciales o direcciones internas 'para acordarse'.",
        task: "Leé la nota: cat /home/soporte/notas.txt",
        hint: "Escribí: cat /home/soporte/notas.txt",
        check: (cmd, out) =>
          usedTool(cmd, "cat") &&
          /caja\.interna|10\.10\.66|girasol/i.test(out),
        debrief:
          "La nota revela caja.interna.nande (10.10.66.10), que SÓLO se ve desde este server, con usuario admin. Ese es el premio del pivoting: desde acá ya podés atacar la caja interna. Defensa: no guardar credenciales en archivos y segmentar bien la red.",
      },
    ],
  },
  {
    id: "l-eng-web",
    title: "ENGAGEMENT: auditá el banco de punta a punta",
    level: "avanzado",
    summary:
      "Una auditoría web completa como en la vida real: reconocer, enumerar, explotar, saquear y leer lo que sacaste.",
    concept:
      "Esto no es un truco suelto: es una AUDITORÍA completa, la metodología que usa un pentester de verdad. El orden es sagrado: (1) reconocer qué hay, (2) enumerar las rutas, (3) explotar la falla, (4) saquear los datos, (5) LEER e interpretar lo que sacaste. Cada paso te da la pista para el siguiente. No corras: mirá cada salida y entendela, porque después te voy a preguntar.",
    reward: { xp: 320, coins: 260 },
    steps: [
      {
        explain:
          "Paso 1 — RECONOCIMIENTO. Antes de tocar nada, mirás. ¿Qué máquina es banco.nande y qué puertas tiene abiertas? Escaneá sus servicios con detección de versión.",
        task: "Escaneá: nmap -sV banco.nande",
        hints: [
          "La herramienta de escaneo es nmap; -sV detecta la versión del servicio.",
          "Escribí: nmap -sV banco.nande",
        ],
        hint: "Escribí: nmap -sV banco.nande",
        check: (cmd, out) =>
          usedTool(cmd, "nmap") &&
          /banco\.nande/i.test(cmd) &&
          /80\/tcp/.test(out) &&
          /open/i.test(out),
        debrief:
          "Un solo puerto abierto: el 80 (web, nginx). No hay SSH ni nada más: TODA la superficie de ataque es la web. Ya sabés por dónde entrar.",
      },
      {
        explain:
          "Leé la salida del escaneo que acabás de ver y respondé, para asegurarnos de que la entendiste.",
        task: "Respondé con 'responder ...'",
        hint: "Fijate la línea que dice '80/tcp open nginx'. El número del puerto alcanza.",
        question: "¿Qué número de puerto quedó ABIERTO en banco.nande?",
        answers: ["80", "80/tcp", "puerto 80", "el 80"],
        answerContains: true,
        debrief:
          "Exacto: el 80, el puerto web (HTTP). Cada puerto abierto es una puerta; esta es la única, así que por acá vamos.",
      },
      {
        explain:
          "Paso 2 — ENUMERACIÓN. Sabés que hay una web, pero no qué páginas tiene. gobuster prueba una lista de rutas comunes y te dice cuáles existen y con qué estado responden.",
        task: "Enumerá rutas: gobuster dir -u http://banco.nande -w comun",
        hints: [
          "gobuster en modo 'dir' prueba rutas; -u es la URL y -w la lista de palabras.",
          "Escribí: gobuster dir -u http://banco.nande -w comun",
        ],
        hint: "Escribí: gobuster dir -u http://banco.nande -w comun",
        check: (cmd, out) =>
          usedTool(cmd, "gobuster") &&
          /\/login/.test(out) &&
          /(\/movimientos|\/panel)/.test(out),
        debrief:
          "Tres rutas: /login responde 200 (abierta), y /panel y /movimientos responden 401 (protegidas, piden sesión). Lo PROTEGIDO es lo jugoso: ahí están los datos. Y /login es la puerta para conseguir esa sesión.",
      },
      {
        explain: "Mirá las rutas que encontró gobuster y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "La que responde 200 (no 401) es por donde te autenticás.",
        question: "¿Qué ruta (200) sirve para autenticarte?",
        answers: ["/login", "login"],
        answerContains: true,
        debrief:
          "Sí: /login. Las 401 (/panel, /movimientos) recién se abren con sesión. Vamos a conseguirla rompiendo el login.",
      },
      {
        explain:
          "Paso 3 — EXPLOTACIÓN. El login arma su consulta SQL pegando lo que escribís. Inyectá un usuario que haga la condición SIEMPRE verdadera y comente el chequeo de la contraseña.",
        task:
          "Burlá el login (copiá tal cual):  curl -X POST http://banco.nande/login -d \"usuario=admin' OR '1'='1 --&password=x\"",
        hints: [
          "Cerrás la comilla del usuario, agregás  OR '1'='1  (siempre verdadero) y comentás el resto con --.",
          "curl -X POST http://banco.nande/login -d \"usuario=admin' OR '1'='1 --&password=x\"",
        ],
        hint: "curl -X POST http://banco.nande/login -d \"usuario=admin' OR '1'='1 --&password=x\"",
        check: (_cmd, out) =>
          /sesi[oó]n iniciada/i.test(out) || out.includes("ND{sqli_login_bypass}"),
        debrief:
          "¡Adentro! ' OR '1'='1 hace que la condición nunca falle, y -- comenta el chequeo de la contraseña. Entraste al panel sin saber ninguna clave: bandera ND{sqli_login_bypass}.",
      },
      {
        explain: "Leé la respuesta del panel al que entraste y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "Fijate la línea 'Sesión iniciada como ...'.",
        question: "¿Como qué usuario entraste al panel?",
        answers: ["admin"],
        answerContains: true,
        debrief:
          "Entraste como admin, el usuario más poderoso. Con esa sesión ya podés tocar las rutas protegidas.",
      },
      {
        explain:
          "Paso 4 — SAQUEO. El buscador de /movimientos también es inyectable. Contá que son 4 columnas y usá UNION SELECT para traer la tabla usuarios (con sus contraseñas) dentro del mismo resultado.",
        task:
          "Volcá los usuarios:  curl \"http://banco.nande/movimientos?q=a%' UNION SELECT id,usuario,password,rol FROM usuarios--\"",
        hints: [
          "UNION SELECT pega una segunda consulta de 4 columnas que lee otra tabla.",
          "curl \"http://banco.nande/movimientos?q=a%' UNION SELECT id,usuario,password,rol FROM usuarios--\"",
        ],
        hint: "curl \"http://banco.nande/movimientos?q=a%' UNION SELECT id,usuario,password,rol FROM usuarios--\"",
        check: (_cmd, out) =>
          out.includes("ND{sqli_union_dump}") || /M8arete-2024!/.test(out),
        debrief:
          "Volcaste la tabla usuarios entera, con las contraseñas EN CLARO (agravante gravísimo): bandera ND{sqli_union_dump}. Ese es el daño real de una SQLi: no es entrar, es llevarse todo.",
      },
      {
        explain:
          "Paso 5 — INTERPRETAR. Un pentester no solo saca datos: los lee. Mirá la tabla que volcaste y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "En la fila del usuario 'admin', la contraseña aparece en la columna del monto.",
        question: "¿Cuál es la contraseña real del usuario admin que sacaste?",
        answers: ["M8arete-2024!"],
        answerContains: true,
        debrief:
          "Esa contraseña la sacaste vos de la base, no estaba escrita en ningún lado. Con ella entrarías directo, sin la inyección.",
      },
      {
        explain:
          "Cierre — INFORME Y DEFENSA. Toda auditoría termina explicando cómo se arregla. Una sola palabra cierra el caso.",
        task: "Respondé con 'responder ...'",
        hint: "Separan la orden SQL del dato para que tu texto nunca sea código. Son consultas ___.",
        question: "¿Qué tipo de consultas SQL hace que ' OR '1'='1 ya NO funcione?",
        answers: ["preparadas", "parametrizadas", "prepared", "preparada", "parametrizada"],
        answerContains: true,
        debrief:
          "Consultas preparadas (parametrizadas): mandan la orden y los datos por caminos separados, así tu texto nunca se vuelve SQL. Cerraste una auditoría completa: recon → enumeración → explotación → saqueo → interpretación → informe. Eso es hacking de verdad, y el hacker ético REPORTA el hallazgo, no roba.",
      },
    ],
  },
  {
    id: "l-eng-host",
    title: "ENGAGEMENT: tomá el servidor y pivotá a la red interna",
    level: "avanzado",
    summary:
      "Una intrusión completa: escanear, romper el SSH por fuerza bruta, entrar, enumerar adentro y saltar a una máquina oculta.",
    concept:
      "Otra auditoría real, esta vez contra un servidor. La cadena: recon → fuerza bruta del acceso → entrar → enumerar DESDE ADENTRO → pivotar a lo que no se ve desde afuera. Cada máquina comprometida es un trampolín a la siguiente. Leé cada salida: las pistas para el próximo salto están ahí.",
    reward: { xp: 340, coins: 280 },
    steps: [
      {
        explain:
          "Paso 1 — RECONOCIMIENTO. Escaneá server.nande con detección de versión para ver qué servicios expone.",
        task: "Escaneá: nmap -sV server.nande",
        hints: ["nmap -sV muestra el servicio y su versión.", "Escribí: nmap -sV server.nande"],
        hint: "Escribí: nmap -sV server.nande",
        check: (cmd, out) =>
          usedTool(cmd, "nmap") &&
          /server\.nande/i.test(cmd) &&
          /22\/tcp/.test(out) &&
          /open/i.test(out),
        debrief:
          "Dos puertas: 22 (SSH, acceso remoto por consola) y 80 (web). El SSH abierto es una invitación a probar credenciales.",
      },
      {
        explain: "Leé el escaneo y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "SSH, el acceso remoto, corre en el puerto clásico 22.",
        question: "¿Qué puerto usarías para intentar entrar por consola remota (SSH)?",
        answers: ["22", "22/tcp", "puerto 22", "el 22", "ssh 22"],
        answerContains: true,
        debrief: "El 22, SSH. Vamos a probar contraseñas contra ese servicio.",
      },
      {
        explain:
          "Paso 2 — FUERZA BRUTA. hydra prueba muchas combinaciones de usuario y contraseña contra el SSH hasta que una entra. (En la vida real: solo con autorización.)",
        task: "Atacá el SSH: hydra ssh://server.nande",
        hints: [
          "hydra ssh://<objetivo> usa las listas de usuarios y claves por defecto.",
          "Escribí: hydra ssh://server.nande",
        ],
        hint: "Escribí: hydra ssh://server.nande",
        check: (_cmd, out) =>
          (/soporte/.test(out) && /Verano2024/.test(out)) ||
          out.includes("ND{ssh_fuerza_bruta}"),
        debrief:
          "hydra encontró credenciales válidas: soporte / Verano2024 (bandera ND{ssh_fuerza_bruta}). Ojo: dejó 143 intentos fallidos en los logs. La fuerza bruta es RUIDOSA — el SOC ya lo está viendo.",
      },
      {
        explain: "Leé lo que reportó hydra y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "Mirá la línea 'login: soporte  password: ...'.",
        question: "¿Qué contraseña encontró hydra para el usuario soporte?",
        answers: ["Verano2024"],
        answerContains: true,
        debrief: "Esa clave débil (una estación + un año) es exactamente lo que un diccionario prueba primero.",
      },
      {
        explain:
          "Paso 3 — ACCESO. Usá las credenciales para abrir una sesión dentro del servidor.",
        task: "Entrá: connect server.nande soporte Verano2024",
        hints: ["connect <host> <usuario> <clave> abre la sesión.", "connect server.nande soporte Verano2024"],
        hint: "Escribí: connect server.nande soporte Verano2024",
        check: (cmd, out) => usedTool(cmd, "connect") && /conectad/i.test(out),
        debrief:
          "Estás DENTRO de server.nande como soporte. Ahora ves lo que ve esa máquina. Toca enumerar: buscar credenciales y caminos a otras máquinas.",
      },
      {
        explain:
          "Paso 4 — ENUMERACIÓN INTERNA. Los administradores dejan notas con recordatorios. Leé la nota de soporte.",
        task: "Leé la nota: cat /home/soporte/notas.txt",
        hints: ["Escribí: cat /home/soporte/notas.txt"],
        hint: "Escribí: cat /home/soporte/notas.txt",
        check: (cmd, out) =>
          usedTool(cmd, "cat") && /caja\.interna|10\.10\.66/i.test(out),
        debrief:
          "La nota revela una máquina que NO se ve desde afuera: caja.interna.nande (10.10.66.10), con usuario admin / clave GiraSol#2024. Ese es el próximo salto.",
      },
      {
        explain: "Leé la nota que encontraste y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "Es el host 'interno' que menciona la nota (empieza con caja...).",
        question: "¿Qué máquina interna descubriste que solo se ve desde el servidor?",
        answers: ["caja.interna.nande", "caja.interna", "caja", "10.10.66.10", "10.10.66"],
        answerContains: true,
        debrief: "caja.interna.nande. Como solo se alcanza desde server.nande, vas a PIVOTAR: saltar a ella usando este servidor como puente.",
      },
      {
        explain:
          "Paso 5 — PIVOTING. Desde adentro del servidor, conectate a la máquina interna con las credenciales que encontraste.",
        task: "Pivotá: connect caja.interna.nande admin GiraSol#2024",
        hints: ["connect caja.interna.nande admin GiraSol#2024"],
        hint: "Escribí: connect caja.interna.nande admin GiraSol#2024",
        check: (cmd, out) =>
          usedTool(cmd, "connect") && /conectad/i.test(out) && /caja\.interna/i.test(out),
        debrief:
          "¡Pivote logrado! Estás en caja.interna.nande, una máquina que era invisible desde tu compu. Este es el corazón del post-explotación: moverse lateralmente por la red.",
      },
      {
        explain:
          "Paso 6 — BOTÍN. Leé la bandera de la máquina interna para probar que llegaste.",
        task: "Sacá la bandera: cat /root/flag.txt",
        hints: ["Escribí: cat /root/flag.txt (o simplemente: flag)"],
        hint: "Escribí: cat /root/flag.txt",
        check: (_cmd, out) => out.includes("ND{pivoting_red_interna}"),
        debrief:
          "Bandera ND{pivoting_red_interna}: comprometiste la red interna partiendo de una sola contraseña débil en la web. Así se encadena una intrusión real.",
      },
      {
        explain:
          "Cierre — DEFENSA. Toda la cadena arrancó por un SSH con clave débil. Una palabra sobre cómo cortarla.",
        task: "Respondé con 'responder ...'",
        hint: "Frenás la fuerza bruta bloqueando tras varios intentos, o usando llaves/MFA. Bloqueo por ___.",
        question: "¿Qué defensa corta de raíz la fuerza bruta de contraseñas? (una palabra)",
        answers: ["intentos", "fail2ban", "mfa", "2fa", "llaves", "bloqueo"],
        answerContains: true,
        debrief:
          "Bloqueo por intentos (fail2ban), llaves SSH en vez de contraseñas y MFA cortan la fuerza bruta; y segmentar la red hace que un pivote como este NO llegue a la caja. Cerraste una intrusión completa con post-explotación. Recordá: esto es solo con permiso, y el hacker ético reporta el camino entero para que lo tapen.",
      },
    ],
  },
  {
    id: "l-eng-blue",
    title: "ENGAGEMENT: cazá al atacante (Blue Team)",
    level: "avanzado",
    summary:
      "La otra mitad del oficio: sos el analista del SOC y tenés que detectar, correlacionar y reconstruir el MISMO ataque que aprendiste a hacer.",
    concept:
      "Ahora estás del lado que defiende. Alguien atacó web-prod-01 y dejó rastros en los logs. Tu trabajo de analista SOC: (1) leer los registros, (2) hacer TRIAGE (¿es real o falso positivo?), (3) correlacionar en el SIEM, (4) reconstruir el timeline (DFIR) y (5) reportar. Vas a reconocer las técnicas: son la fuerza bruta y la SQLi que vos mismo practicaste. Atacar te enseñó a defender.",
    reward: { xp: 340, coins: 280 },
    steps: [
      {
        explain:
          "Paso 1 — LEER LOS LOGS. Todo incidente deja huellas. Mirá los registros de acceso crudos del servidor atacado.",
        task: "Leé los logs: curl http://soc.nande/logs",
        hints: ["Escribí: curl http://soc.nande/logs"],
        hint: "Escribí: curl http://soc.nande/logs",
        check: (cmd, out) =>
          usedTool(cmd, "curl") && /10\.10\.66\.13/.test(out) && /401/.test(out),
        debrief:
          "Una IP salta: 10.10.66.13 hizo varios POST /login con 401 (fallos) y después un UNION SELECT y acceso a /admin. El resto del tráfico es normal. Esa IP es tu sospechosa.",
      },
      {
        explain: "Leé los logs y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "Es la IP que repite POST /login con 401.",
        question: "¿Qué IP hizo los intentos fallidos (401) contra /login?",
        answers: ["10.10.66.13"],
        answerContains: true,
        debrief: "Esa IP concentra toda la actividad sospechosa. Ahora hay que decidir si es un incidente real.",
      },
      {
        explain:
          "Paso 2 — TRIAGE. No toda alerta es un ataque; muchas son ruido (falsos positivos). Clasificá la alerta A3 para decidir si escala.",
        task: "Hacé triage: curl http://soc.nande/triage?id=A3",
        hints: ["Escribí: curl http://soc.nande/triage?id=A3"],
        hint: "Escribí: curl http://soc.nande/triage?id=A3",
        check: (_cmd, out) => out.includes("ND{soc_triage}"),
        debrief:
          "Triage correcto: 401 repetidos y LUEGO un 200 en /admin tras un UNION SELECT no es ruido — es un incidente real. Lo escalaste (bandera ND{soc_triage}).",
      },
      {
        explain: "Pensá en lo que viste y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "Hubo fallos y después acceso al panel tras un UNION: no es ruido, hay que subirla.",
        question: "¿Hay que ESCALAR la alerta o cerrarla como ruido?",
        answers: ["escalar", "escalarla", "escalar la", "hay que escalar", "incidente real"],
        answerContains: true,
        debrief: "Escalarla: es un incidente real. Un buen analista separa lo real del ruido antes de gastar tiempo. Vamos a juntar todo en el SIEM.",
      },
      {
        explain:
          "Paso 3 — CORRELACIÓN (SIEM). Un SIEM junta eventos sueltos de muchas fuentes en una sola historia. Buscá todos los eventos de la IP atacante.",
        task: "Correlacioná: curl http://soc.nande/siem?q=10.10.66.13",
        hints: ["Escribí: curl http://soc.nande/siem?q=10.10.66.13"],
        hint: "Escribí: curl http://soc.nande/siem?q=10.10.66.13",
        check: (_cmd, out) => out.includes("ND{siem_correlacion}"),
        debrief:
          "El SIEM te muestra los 7 eventos del atacante en orden: reconocimiento, 3 fallos de login, la inyección UNION, y el acceso + exportación de /admin (bandera ND{siem_correlacion}). Ya ves la película completa.",
      },
      {
        explain: "Mirá la secuencia correlacionada y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "Después de los 401 aparece un 'UNION SELECT ... FROM usuarios': es una inyección ___.",
        question: "¿Qué técnica usó el atacante para robar las credenciales tras los fallos de login?",
        answers: ["sql", "sqli", "union", "inyeccion sql", "inyección sql", "inyeccion"],
        answerContains: true,
        debrief: "Inyección SQL (UNION), la misma que practicaste atacando. Reconocerla en un log es medio trabajo del defensor.",
      },
      {
        explain:
          "Paso 4 — RECONSTRUCCIÓN (DFIR). Armá la línea de tiempo del incidente indicando qué pasó primero y cuál fue la causa raíz.",
        task:
          "Reconstruí: curl \"http://soc.nande/incidente?primero=fuerza+bruta&causa=inyeccion+sql\"",
        hints: [
          "El primer evento fue la fuerza bruta; la causa que dejó entrar fue la inyección SQL.",
          "curl \"http://soc.nande/incidente?primero=fuerza+bruta&causa=inyeccion+sql\"",
        ],
        hint: "curl \"http://soc.nande/incidente?primero=fuerza+bruta&causa=inyeccion+sql\"",
        check: (_cmd, out) => out.includes("ND{dfir_timeline}"),
        debrief:
          "Timeline reconstruido: fuerza bruta → SQLi → acceso a /admin → exfiltración de la tabla clientes. Causa raíz: buscador vulnerable a SQLi y sin bloqueo por intentos (bandera ND{dfir_timeline}).",
      },
      {
        explain:
          "Paso 5 — INFORME. Cerrá el caso reportando el atacante y la técnica.",
        task: "Reportá: curl \"http://soc.nande/reportar?ip=10.10.66.13&tecnica=sql\"",
        hints: ["curl \"http://soc.nande/reportar?ip=10.10.66.13&tecnica=sql\""],
        hint: "curl \"http://soc.nande/reportar?ip=10.10.66.13&tecnica=sql\"",
        check: (_cmd, out) => out.includes("ND{forense_intrusion}"),
        debrief:
          "Incidente confirmado y documentado (bandera ND{forense_intrusion}). Un informe claro es lo que permite arreglar la falla y que no se repita.",
      },
      {
        explain:
          "Cierre — LA CURA. El atacante entró por el buscador. Una palabra sobre cómo se tapa esa puerta.",
        task: "Respondé con 'responder ...'",
        hint: "Separan la orden del dato para que el UNION no funcione: consultas ___.",
        question: "¿Qué arreglo en el buscador habría evitado el robo de credenciales?",
        answers: ["preparadas", "parametrizadas", "prepared", "consultas preparadas"],
        answerContains: true,
        debrief:
          "Consultas preparadas cierran la SQLi, y el bloqueo por intentos (fail2ban) corta la fuerza bruta. Cerraste una investigación completa: logs → triage → correlación → DFIR → informe. El atacante y el defensor estudian lo MISMO; por eso saber atacar te hace mejor defensor.",
      },
    ],
  },
  {
    id: "l-eng-wifi",
    title: "ENGAGEMENT: romper una WiFi WPA2 (con permiso)",
    level: "avanzado",
    summary:
      "La operación WiFi completa: modo monitor, escuchar el aire, capturar el handshake con un deauth y crackearlo con diccionario.",
    concept:
      "Una auditoría de WiFi de punta a punta, la cadena real de aircrack-ng. El orden: (1) poner la placa en modo monitor, (2) escuchar el aire y elegir objetivo, (3) capturar el 'handshake' (el saludo cifrado que se manda al conectarse), (4) forzarlo con un deauth, (5) crackearlo con un diccionario. IMPORTANTE: esto es solo en TU red o con permiso explícito por escrito.",
    reward: { xp: 320, coins: 260 },
    steps: [
      {
        explain:
          "Paso 1 — MODO MONITOR. Una placa WiFi normal solo escucha lo suyo. El modo monitor la pone a 'oír todo el aire'. Activalo sobre wlan0.",
        task: "Activá el monitor: airmon-ng start wlan0",
        hints: ["Escribí: airmon-ng start wlan0"],
        hint: "Escribí: airmon-ng start wlan0",
        check: (cmd, out) =>
          usedTool(cmd, "airmon-ng") && /monitor/i.test(out) && /wlan0mon/.test(out),
        debrief:
          "Listo: se creó la interfaz wlan0mon en modo monitor. Ahora podés capturar el tráfico de redes ajenas que pasa por el aire (no su contenido cifrado, pero sí los 'saludos').",
      },
      {
        explain:
          "Paso 2 — ESCUCHAR EL AIRE. Escaneá las redes cercanas para elegir objetivo. Vas a ver su BSSID (la 'MAC' del router), canal, cifrado y nombre.",
        task: "Escaneá: airodump-ng wlan0mon",
        hints: ["Escribí: airodump-ng wlan0mon"],
        hint: "Escribí: airodump-ng wlan0mon",
        check: (cmd, out) =>
          usedTool(cmd, "airodump-ng") && /Vecino-2G/.test(out) && /E8:94:F6:77:88:04/.test(out),
        debrief:
          "Varias redes. El objetivo autorizado es Vecino-2G (BSSID E8:94:F6:77:88:04), WPA2, en el canal 6. Ojo: hay redes WPA3 (Corp-Secure) — esas NO caen con diccionario offline.",
      },
      {
        explain: "Mirá la tabla de redes y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "En la fila de Vecino-2G, la columna CH es el canal.",
        question: "¿En qué canal (CH) está la red Vecino-2G?",
        answers: ["6", "canal 6", "ch 6"],
        answerContains: true,
        debrief: "Canal 6. Hay que fijar la escucha a ESE canal para no perder el handshake.",
      },
      {
        explain:
          "Paso 3 — CAPTURAR. Enfocá la escucha en el objetivo y su canal, y grabá a un archivo con -w. Ahí va a caer el handshake cuando alguien se conecte.",
        task:
          "Capturá: airodump-ng --bssid E8:94:F6:77:88:04 -c 6 -w captura wlan0mon",
        hints: [
          "--bssid fija el router, -c el canal, -w el archivo de captura.",
          "airodump-ng --bssid E8:94:F6:77:88:04 -c 6 -w captura wlan0mon",
        ],
        hint: "airodump-ng --bssid E8:94:F6:77:88:04 -c 6 -w captura wlan0mon",
        check: (cmd, out) =>
          usedTool(cmd, "airodump-ng") && /Vecino-2G/.test(out) && /(Escuchando|captura)/i.test(out),
        debrief:
          "Estás grabando el tráfico de Vecino-2G en captura-01.cap. Hay un cliente conectado: si lo echamos un instante, al reconectarse va a repetir el handshake y lo atrapamos.",
      },
      {
        explain:
          "Paso 4 — FORZAR EL HANDSHAKE. Un 'deauth' expulsa un momento al cliente conectado; al volver, repite el saludo (handshake) y tu captura lo agarra.",
        task: "Forzá el handshake: aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon",
        hints: [
          "--deauth manda paquetes de desautenticación; -a es el BSSID objetivo.",
          "aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon",
        ],
        hint: "aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon",
        check: (cmd, out) =>
          usedTool(cmd, "aireplay-ng") && /handshake/i.test(out) && /capturad/i.test(out),
        debrief:
          "¡Handshake capturado! Ese saludo contiene una prueba matemática de la contraseña (no la contraseña en sí). Ahora hay que adivinarla probando un diccionario contra esa prueba.",
      },
      {
        explain: "El deauth mostró a QUÉ cliente estás echando. Leé la salida y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "Buscá 'STMAC: [ ... ]' en la salida del deauth (o la columna STATION de la captura).",
        question: "¿Cuál es la MAC del cliente (STATION) conectado a Vecino-2G?",
        answers: ["3C:5A:B4:00:00:55"],
        answerContains: true,
        debrief: "Esa STATION es la que echaste con el deauth; al reconectarse repitió el handshake y tu captura lo agarró. Ese es el truco: sin un cliente al que echar, habría que esperar a que alguien entre solo.",
      },
      {
        explain:
          "Paso 5 — CRACKEAR. Probá un diccionario de contraseñas contra el handshake capturado. Si la clave es débil y está en la lista, cae.",
        task: "Crackeá: aircrack-ng -w rockyou.txt captura-01.cap",
        hints: [
          "-w es el diccionario (rockyou.txt), y al final el archivo .cap con el handshake.",
          "aircrack-ng -w rockyou.txt captura-01.cap",
        ],
        hint: "aircrack-ng -w rockyou.txt captura-01.cap",
        check: (_cmd, out) =>
          out.includes("ND{wifi_wpa_crackeada}") || /KEY FOUND/i.test(out),
        debrief:
          "KEY FOUND: la clave era débil y estaba en el diccionario (bandera ND{wifi_wpa_crackeada}). Aircrack no 'adivina en vivo': prueba el diccionario contra la prueba matemática del handshake, offline.",
      },
      {
        explain: "Leé el resultado de aircrack y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "Está entre corchetes: KEY FOUND! [ ... ].",
        question: "¿Cuál era la contraseña de la WiFi Vecino-2G?",
        answers: ["invitado"],
        answerContains: true,
        debrief: "‘invitado’: corta y común, justo lo que un diccionario prueba primero.",
      },
      {
        explain:
          "Cierre — DEFENSA. Todo esto funcionó porque la clave era débil. Dos cosas la habrían salvado.",
        task: "Respondé con 'responder ...'",
        hint: "El estándar nuevo que resiste el diccionario offline se llama WPA___ (un número).",
        question: "¿Qué estándar WiFi NO cae ante este ataque de diccionario offline?",
        answers: ["wpa3", "wpa 3", "wpa-3"],
        answerContains: true,
        debrief:
          "WPA3: su handshake (SAE) no se puede probar offline como WPA2. Y en cualquier caso, una frase larga y única deja el diccionario inútil. Cerraste una operación WiFi completa: monitor → escucha → captura → deauth → crackeo. Recordá: SOLO en tu red o con permiso escrito; hacerlo en una red ajena es delito.",
      },
    ],
  },
  {
    id: "l-eng-osint",
    title: "ENGAGEMENT: investigá con datos públicos y operá sin rastro",
    level: "avanzado",
    summary:
      "OSINT + OPSEC de punta a punta: sacar dónde y quién de una foto, limpiar tu propia huella, y llegar a un servicio oculto sin mostrar tu IP.",
    concept:
      "Dos caras del mismo oficio. OSINT: cuánto se puede averiguar de alguien con datos PÚBLICOS (una foto ya delata dónde vive). OPSEC: cómo NO dejar vos esa huella. La secuencia: (1) extraer metadatos de una foto, (2) leer lo que delatan, (3) aprender a limpiarlos, (4) revisar tu propia exposición, (5) anonimizarte y (6) alcanzar un servicio oculto sin mostrar tu IP real. Todo con fines de privacidad y ética.",
    reward: { xp: 300, coins: 240 },
    steps: [
      {
        explain:
          "Paso 1 — OSINT. Las fotos guardan METADATOS invisibles (cámara, fecha y, peor, GPS). Extraé los de una foto con exiftool.",
        task: "Leé los metadatos: exiftool foto.jpg",
        hints: ["Escribí: exiftool foto.jpg"],
        hint: "Escribí: exiftool foto.jpg",
        check: (cmd, out) =>
          usedTool(cmd, "exiftool") && /GPS/i.test(out) && /-25\.2985|Kamba/i.test(out),
        debrief:
          "La foto delata al autor (Kamba Ríos), el equipo y —lo grave— las coordenadas GPS exactas donde se tomó. Con eso, cualquiera sabe dónde vive esa persona. Eso es OSINT: armar el perfil con lo que la gente sube sin darse cuenta.",
      },
      {
        explain: "Mirá los metadatos y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "El dato más peligroso son las coordenadas: el ___ de la foto.",
        question: "¿Qué dato de la foto revela DÓNDE se tomó?",
        answers: ["gps", "coordenadas", "ubicacion", "ubicación", "el gps", "las coordenadas", "-25.2985"],
        answerContains: true,
        debrief: "El GPS. Una sola foto puede poner tu casa en un mapa. Por eso importa saber limpiar eso.",
      },
      {
        explain:
          "Paso 2 — DEFENSA (limpiar tu huella). Antes de publicar una foto se le quitan los metadatos. exiftool -all= los borra.",
        task: "Limpiá la foto: exiftool -all= foto.jpg",
        hints: ["Escribí: exiftool -all= foto.jpg"],
        hint: "Escribí: exiftool -all= foto.jpg",
        check: (cmd, out) =>
          usedTool(cmd, "exiftool") && /(eliminad|removid)/i.test(out),
        debrief:
          "Metadatos eliminados: ahora la foto no delata autor, GPS ni equipo. Regla OPSEC de oro: limpiá SIEMPRE los metadatos antes de subir algo.",
      },
      {
        explain: "Pensá en la defensa que acabás de aplicar y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "Lo invisible que borraste con exiftool -all=.",
        question: "¿Qué hay que borrar SIEMPRE de una foto antes de publicarla?",
        answers: ["metadatos", "los metadatos", "metadata"],
        answerContains: true,
        debrief: "Los metadatos. Ahora pasemos a tu propia exposición en la red.",
      },
      {
        explain:
          "Paso 3 — TU EXPOSICIÓN. Antes de tocar nada sensible, mirá qué IP mostrás. 'anon status' te dice cómo salís a la red.",
        task: "Revisá tu estado: anon status",
        hints: ["Escribí: anon status"],
        hint: "Escribí: anon status",
        check: (cmd, out) =>
          usedTool(cmd, "anon") && /(10\.10\.0\.10|real)/i.test(out),
        debrief:
          "El anonimato está apagado: el destino ve tu IP REAL (10.10.0.10). Cualquier cosa que hagas queda atada a vos. Hay que taparlo antes de seguir.",
      },
      {
        explain: "Leé tu estado y respondé.",
        task: "Respondé con 'responder ...'",
        hint: "Con el anonimato apagado, el destino ve tu IP real: 10.10.0.10.",
        question: "Con el anonimato apagado, ¿qué IP ve el destino?",
        answers: ["10.10.0.10", "mi ip real", "la mia", "la mía", "la tuya"],
        answerContains: true,
        debrief: "Tu IP real. Es como firmar todo con tu nombre. Vamos a cambiarlo.",
      },
      {
        explain:
          "Paso 4 — ANONIMIZARSE. Encendé la red de anonimato: tu tráfico va a salir por un nodo intermedio, así el destino ve OTRA IP, no la tuya.",
        task: "Encendé el anonimato: anon on",
        hints: ["Escribí: anon on"],
        hint: "Escribí: anon on",
        check: (cmd, out) =>
          usedTool(cmd, "anon") && /activ/i.test(out),
        debrief:
          "Circuito activo: ahora salís por un nodo (Suiza, 51.0.44.19). El destino ve esa IP. Recién ahora conviene alcanzar servicios sensibles.",
      },
      {
        explain:
          "Paso 5 — SERVICIO OCULTO. Los .onion no se resuelven por DNS normal: solo se alcanzan por el circuito. Conectate a uno (una biblioteca libre).",
        task: "Alcanzá el servicio: onion biblioteca7k2fx.onion",
        hints: ["Escribí: onion biblioteca7k2fx.onion"],
        hint: "Escribí: onion biblioteca7k2fx.onion",
        check: (_cmd, out) => out.includes("ND{onion_alcanzada_con_circuito}"),
        debrief:
          "Llegaste al servicio oculto por el circuito, sin mostrar tu IP (bandera ND{onion_alcanzada_con_circuito}). Muchos .onion son legítimos: privacidad, prensa, esquivar censura.",
      },
      {
        explain:
          "Cierre — ÉTICA. El anonimato es una herramienta neutral: la usan periodistas y también delincuentes. Una última.",
        task: "Respondé con 'responder ...'",
        hint: "Con el circuito activo, el destino ve la IP del nodo, NO la tuya.",
        question: "Con el anonimato activo, ¿el destino ve tu IP real? (sí/no)",
        answers: ["no"],
        answerContains: true,
        debrief:
          "No: ve la del nodo de salida. Cerraste una investigación OSINT y una operación OPSEC completas. Lo importante: usá esto para PROTEGER tu privacidad y la de otros, no para dañar. Investigar a alguien sin motivo legítimo, o esconderte para hacer daño, no es hacking ético — es delito.",
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
