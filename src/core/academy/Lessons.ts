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
   * Verifica si el paso se cumplió. Mira el comando escrito, su salida y —cuando
   * hace falta— el estado REAL del mundo (world). Debe ser una función pura.
   */
  check: (command: string, output: string, world?: LessonWorld) => boolean;
  /** Explicación tras lograrlo: por qué funciona y cómo defenderse. */
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
