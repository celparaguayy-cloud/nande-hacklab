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
