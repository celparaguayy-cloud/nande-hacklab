import type { Curso } from "../courseTypes";

/**
 * Cursos del módulo "web" de la super academia de ÑANDE.
 *
 * Todos son cursos interactivos completos (concept + quiz + build + lab) y sus
 * laboratorios golpean las apps web REALES del mundo, con su motor SQL/HTTP de
 * verdad. Nada está guionado: si el payload que arma el alumno funciona contra
 * la app, se ve el resultado real (y a veces cae una bandera ND{...}).
 *
 * Hosts reales usados acá (ver VirtualKernel.dns.register y http/apps/*):
 *   - banco.nande            login SQLi + buscador /movimientos inyectable (UNION)
 *   - blog.yvoty.nande       /buscar?q=  XSS reflejado
 *   - fotos.arandu.nande     /album?id=  IDOR
 *   - docs.tape.nande        /ver?archivo=  path traversal
 *   - tools.pyta.nande       /ping?host=  inyección de comandos
 *   - api.vortex.nande       /panel?token=  JWT alg:none
 *
 * Curso hermano ya existente: c-web-sqli (bypass de login por SQLi). Acá NO se
 * duplica: se lo referencia y se sigue desde ahí.
 */

/* ------------------------------------------------------------------ *
 *  CURSO 1 — Cómo funciona una web por dentro (de cero)              *
 * ------------------------------------------------------------------ */

const WEB_COMO_FUNCIONA: Curso = {
  id: "c-web-como-funciona",
  title: "Cómo funciona una web por dentro",
  subtitle: "Cliente, servidor, HTML/JS, parámetros GET/POST y cookies, con dibujos.",
  level: "principiante",
  skill: "web",
  hue: 190,
  glyph: "eye",
  reward: { xp: 130, coins: 95 },
  slides: [
    {
      kind: "concept",
      title: "Cliente y servidor: una charla de dos compus",
      body:
        "Cuando abrís una página, tu computadora (el cliente) le MANDA un pedido a otra computadora (el servidor), y el servidor le RESPONDE con la página. Ese ida y vuelta se llama petición y respuesta (request/response). Toda la seguridad web se juega en esa charla: qué le pedís, qué te contesta, y qué pasa cuando le pedís algo que no debías.",
      diagram: "internet",
      bullets: [
        "Cliente = tu navegador, el que pide.",
        "Servidor = la compu que guarda el sitio y responde.",
        "Hackear (ético) es entender esa charla mejor que quien la programó.",
      ],
    },
    {
      kind: "concept",
      title: "De qué está hecha una página",
      body:
        "Una página web tiene tres partes:\n\n• HTML → la estructura (los textos, los botones, los formularios).\n• CSS → el estilo (colores, tamaños, cómo se ve).\n• JavaScript → el código que corre en TU navegador (mueve cosas, valida formularios).\n\nOjo con esto: el HTML, CSS y JS te los MANDA el servidor, pero corren en tu compu. La lógica importante y los datos (usuarios, contraseñas) se quedan en el servidor. Por eso lo que se ataca casi siempre está del lado del servidor.",
      bullets: [
        "HTML = estructura · CSS = estilo · JS = corre en tu navegador.",
        "Los datos valiosos viven en el SERVIDOR, no en tu pantalla.",
      ],
    },
    {
      kind: "concept",
      title: "El servidor: código + base de datos",
      body:
        "Del lado del servidor pasan las cosas importantes. Cuando le mandás un pedido, el servidor corre su código, muchas veces consulta una base de datos (una planilla gigante con usuarios, contraseñas, movimientos) y con eso arma la respuesta. Por eso casi todos los ataques web buscan engañar a ESE código o a ESA base de datos: es donde están los datos y las decisiones (¿sos admin?, ¿este dato es tuyo?).",
      diagram: "internet",
      bullets: [
        "El servidor: corre código y guarda los datos en una base de datos.",
        "Ahí se decide quién sos y qué podés ver: por eso es el blanco.",
      ],
    },
    {
      kind: "quiz",
      prompt: "El JavaScript de una página, ¿dónde se ejecuta?",
      options: [
        "En tu navegador (en tu compu, del lado del cliente)",
        "En el servidor, siempre",
        "En el router de tu casa",
        "En el DNS",
      ],
      correct: 0,
      explain:
        "El JS que ves en una página corre en TU navegador. Por eso una validación hecha solo en JavaScript no protege nada: cualquiera la puede saltar y mandarle al servidor lo que quiera. La seguridad de verdad se controla en el servidor.",
    },
    {
      kind: "concept",
      title: "GET y POST: dos formas de pedir",
      body:
        "Hay dos maneras principales de hablarle al servidor:\n\n• GET → 'traeme esto'. Los datos van en la URL, a la vista: http://sitio/buscar?q=hola\n• POST → 'tomá estos datos'. Los datos van escondidos en el cuerpo del pedido (formularios, contraseñas, subir cosas).\n\nUsás GET para pedir páginas y buscar; POST para enviar formularios como el login.",
      diagram: "url",
      bullets: [
        "GET → datos en la URL (?q=hola). Se ve en la barra.",
        "POST → datos en el cuerpo (el login manda usuario y clave por POST).",
      ],
    },
    {
      kind: "concept",
      title: "Los parámetros: los datos que MANDÁS vos",
      body:
        "Mirá bien esta URL:\n\n   http://banco.nande/movimientos?id=7\n\nEse ?id=7 es un parámetro: un dato que vos le mandás al servidor. Vos escribís la URL, así que vos controlás ese valor. Podés cambiarlo por ?id=8 y ver qué pasa. En los formularios, cada casillero es también un parámetro. Todo ataque web empieza igual: cambiar un dato que vos controlás y observar cómo reacciona el servidor.",
      diagram: "url",
      bullets: [
        "protocolo :// dominio / ruta ? parámetro",
        "Los parámetros (?id=7, ?q=hola, campos de un form) los controlás VOS.",
        "Ahí está el peligro: si el servidor confía en ese dato sin controlarlo, se rompe.",
      ],
    },
    {
      kind: "build",
      goal: "Pedirle al blog que busque la palabra 'hola' usando un parámetro GET (?q=)",
      pieces: [
        "curl",
        "http://blog.yvoty.nande/buscar?q=hola",
        "nmap",
        "-p-",
      ],
      answer: ["curl", "http://blog.yvoty.nande/buscar?q=hola"],
      hint: "curl es la herramienta para pedir una página desde la terminal. Después va la URL con el parámetro ?q=hola.",
      explain:
        "curl http://blog.yvoty.nande/buscar?q=hola hace un pedido GET: le manda al servidor el parámetro q=hola en la URL. El servidor lo lee y arma la respuesta con ese dato. Acabás de mandarle un dato que VOS controlás: ese es el primer gesto de todo hacker web.",
    },
    {
      kind: "quiz",
      prompt: "En http://banco.nande/movimientos?id=7, ¿qué parte es un parámetro que podrías cambiar a mano?",
      options: [
        "?id=7 (el dato que le mandás al servidor)",
        "banco.nande (el dominio)",
        "/movimientos (la ruta)",
        "http:// (el protocolo)",
      ],
      correct: 0,
      explain:
        "El ?id=7 es el parámetro, y vos escribís la URL, así que podés cambiarlo por ?id=8. Si el servidor no controla que ese id sea TUYO, verías datos de otra persona: eso es un IDOR (lo vas a explotar en otro curso).",
      diagram: "url",
    },
    {
      kind: "concept",
      title: "Cookies: tu pulsera de 'ya entré'",
      body:
        "El servidor atiende a miles de personas y no tiene memoria entre pedidos. Entonces, ¿cómo sabe que sos vos después del login? Con una cookie. Al entrar bien, el servidor te da una cookie de sesión (un código tipo sesion=a9f3b1). Tu navegador la guarda y la manda en CADA pedido siguiente. Es tu pulsera de 'ya entré': mientras la tengas, el servidor te reconoce sin pedirte la clave otra vez.",
      diagram: "cookie",
      bullets: [
        "Login correcto → el servidor te da una cookie de sesión.",
        "El navegador la reenvía sola en cada pedido.",
        "Si alguien te la roba, entra como vos SIN tu contraseña.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Para qué sirve la cookie de sesión?",
      options: [
        "Para que el servidor te reconozca sin pedirte la clave en cada pedido",
        "Para guardar tus fotos en el servidor",
        "Para que internet ande más rápido",
        "Para cambiar el color de la página",
      ],
      correct: 0,
      explain:
        "La cookie de sesión es la prueba de que ya iniciaste sesión. Por eso es tan valiosa: quien la consiga puede hacerse pasar por vos sin saber tu contraseña. Por eso más adelante vas a ver cómo el XSS intenta robar cookies… y cómo se defienden (HttpOnly).",
      diagram: "cookie",
    },
    {
      kind: "lab",
      title: "Practicá: entrá al banco y mirá tu cookie de sesión",
      body:
        "Vamos a iniciar sesión de verdad en el banco con una cuenta real (rocio / girasol77) usando un POST. Mirá qué pasa: el servidor revisa la clave, te crea una sesión y te lleva a tu panel. Ahí ya sos vos, gracias a la cookie que te dio.",
      command: "curl -X POST http://banco.nande/login -d \"usuario=rocio&password=girasol77\"",
      explain:
        "Fijate que la respuesta te muestra el panel: 'Sesión iniciada como rocio' y tu saldo. Mandaste usuario y clave por POST, el servidor los validó contra su base de datos y te dio una cookie de sesión que curl guardó solo (como un navegador). Eso es una sesión web funcionando. En los próximos cursos vas a ver qué pasa cuando el servidor confía de más en lo que le mandás.",
      diagram: "cookie",
    },
    {
      kind: "concept",
      title: "Repaso: el viaje de un click",
      body:
        "Ya tenés el mapa mental de toda web:\n\n1. Escribís una URL (protocolo, dominio, ruta y parámetros).\n2. Tu navegador manda una petición (GET para pedir, POST para enviar datos).\n3. El servidor corre su código, consulta su base de datos y arma una respuesta.\n4. Si iniciaste sesión, viaja tu cookie para que te reconozca.\n\nCada uno de estos pasos se puede atacar cuando alguien lo programó con demasiada confianza. Eso es exactamente lo que vas a hacer, con permiso y para aprender, en los cursos que siguen (SQLi UNION, XSS, IDOR, traversal, comandos, JWT).",
      diagram: "capas",
      bullets: [
        "URL → petición → servidor + base de datos → respuesta → cookie.",
        "Entender la charla es el 80% del trabajo. Ya la entendés.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 1b — Enumeración web: gobuster/ffuf a fondo                  *
 * ------------------------------------------------------------------ */

const WEB_ENUM: Curso = {
  id: "c-web-enum",
  title: "Enumeración web: gobuster y ffuf a fondo",
  subtitle: "Encontrar lo que NO está enlazado: rutas, archivos y subdominios ocultos.",
  level: "intermedio",
  skill: "web",
  hue: 160,
  glyph: "search",
  reward: { xp: 220, coins: 170 },
  slides: [
    {
      kind: "concept",
      title: "Lo que no ves también existe",
      body:
        "Una web te muestra sus links, pero atrás casi siempre hay más: paneles de admin, backups, /api, archivos .env con contraseñas, rutas viejas que nadie borró. No están enlazadas, así que no las 'ves' navegando. La enumeración de contenido es probar una lista enorme de nombres comunes y ver cuáles responden. Es de las primeras cosas de una auditoría web: primero mapeás TODA la superficie, después atacás.",
      diagram: "escaneo",
      bullets: [
        "Enumerar = probar miles de nombres y quedarte con los que existen.",
        "'Oculto' (sin enlace) no es 'protegido': se encuentra igual.",
      ],
    },
    {
      kind: "concept",
      title: "El diccionario (wordlist) es todo",
      body:
        "gobuster y ffuf no adivinan: prueban una LISTA de palabras (wordlist). La calidad del ataque depende de la lista. Las famosas vienen en SecLists: common.txt (rutas típicas), directory-list-2.3 (enorme), subdomains-top1million (subdominios). Vos elegís con -w. Una lista más grande encuentra más… pero hace más ruido y tarda más. En ÑANDE va incorporada una lista base para que practiques el flujo real.",
      diagram: "archivo",
      bullets: [
        "-w <wordlist>: la lista de nombres a probar (SecLists es el estándar).",
        "Más grande = más hallazgos, más ruido, más tiempo. Se elige con criterio.",
      ],
    },
    {
      kind: "concept",
      title: "Leer los códigos de estado como un atacante",
      body:
        "Cada nombre que probás devuelve un código HTTP, y cada código te dice algo:\n\n• 200 OK — existe y te la muestra. Entrá a mirar.\n• 301/302 — redirige a otro lado (seguí el destino con -r).\n• 401/403 — EXISTE pero está protegida. ¡Oro! Algo hay que valga la pena esconder.\n• 404 — no existe (se descarta, es el ruido).\n\nLo más jugoso no siempre es el 200: un 403 en /admin-backup grita 'acá hay algo'.",
      diagram: "protocolo",
      bullets: [
        "200 = entrá · 301/302 = seguí · 401/403 = existe y protegida (oro) · 404 = ruido.",
        "Un 403 revela una ruta sensible aunque no puedas verla todavía.",
      ],
    },
    {
      kind: "quiz",
      prompt: "gobuster te devuelve /backup con código 403. ¿Qué significa para vos?",
      options: [
        "La ruta EXISTE pero está protegida: hay algo que alguien quiso esconder, vale la pena investigarla",
        "La ruta no existe, es ruido que se descarta",
        "El servidor se cayó",
        "Ya entraste al backup",
      ],
      correct: 0,
      explain:
        "403 (Forbidden) significa que la ruta existe pero el servidor te niega el acceso. Eso confirma que /backup está ahí: ahora el trabajo es ver si esa protección se puede saltar (permisos mal puestos, otra ruta, credenciales). Un 404 sí sería 'no existe'.",
      diagram: "protocolo",
    },
    {
      kind: "concept",
      title: "gobuster dir: el modo de rutas",
      body:
        "El modo estrella es 'dir': prueba rutas contra una URL.\n\n   gobuster dir -u http://banco.nande\n\nAgregale -x para probar EXTENSIONES sobre cada palabra (config → config.php, config.bak, config.txt):\n\n   gobuster dir -u http://banco.nande -x php,bak,txt,zip\n\nEso encuentra backups (.bak, .zip) y archivos de config que nunca deberían estar accesibles. -x es de lo más rentable del recon web.",
      diagram: "url",
      bullets: [
        "gobuster dir -u <url>: prueba rutas.",
        "-x php,bak,zip: prueba esas extensiones sobre cada palabra (caza backups).",
      ],
    },
    {
      kind: "build",
      goal: "Armar un gobuster que busque rutas Y backups (.php y .bak) en el banco",
      pieces: ["gobuster", "dir", "-u", "http://banco.nande", "-x", "php,bak", "--force", "rm"],
      answer: ["gobuster", "dir", "-u", "http://banco.nande", "-x", "php,bak"],
      hint: "Modo dir, -u con la URL, y -x con las extensiones separadas por coma (sin espacios).",
      explain:
        "gobuster dir -u http://banco.nande -x php,bak prueba cada palabra tal cual y también con .php y .bak. Así, si existe un config.bak o un panel.php olvidado, aparece. Los backups accesibles por web son una fuente clásica de credenciales.",
    },
    {
      kind: "lab",
      title: "Practicá: enumerá las rutas del banco",
      body:
        "Corré gobuster en modo dir contra banco.nande, probando además extensiones. Mirá el código de cada hallazgo: fijate cuál es 200 y cuál 401.",
      command: "gobuster dir -u http://banco.nande -x php,bak",
      explain:
        "Aparece /login (200, la puerta) y /panel y /movimientos (401, protegidas: existen pero piden sesión). Ya sabés la superficie: dónde entrar y qué está cerrado con llave. El 401 te marca el próximo objetivo (romper esa autenticación).",
      diagram: "escaneo",
    },
    {
      kind: "concept",
      title: "Filtrar el ruido: -s, -b y -fs",
      body:
        "Una wordlist grande escupe cientos de líneas. Para no ahogarte, filtrás:\n\n• gobuster -b 404,403 → OCULTA esos códigos (blacklist).\n• gobuster -s 200,401 → muestra SÓLO esos (whitelist).\n• ffuf -fs 572 → filtra por TAMAÑO: si todas las 'no existe' pesan 572 bytes, las descartás por tamaño.\n\nFiltrar por tamaño es clave cuando un sitio devuelve 200 para todo (una página '404 bonita'): el código no ayuda, pero el tamaño sí.",
      diagram: "capas",
      bullets: [
        "-s (sólo estos) / -b (oculta estos) filtran por código.",
        "-fs (ffuf) filtra por tamaño: vence a las webs que dan 200 a todo.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Querés ver SÓLO las rutas protegidas (401) del banco, sin el ruido. ¿Qué comando?",
      options: [
        "gobuster dir -u http://banco.nande -s 401",
        "gobuster dir -u http://banco.nande -x 401",
        "gobuster dns -d banco.nande",
        "gobuster dir -u http://banco.nande -b 401",
      ],
      correct: 0,
      explain:
        "-s 401 es la whitelist: muestra sólo lo que responde 401. -b 401 haría lo contrario (ocultarlas). -x es para extensiones y dns es para subdominios. Filtrar por estado te deja ver de una las rutas que valen (las protegidas).",
      diagram: "capas",
    },
    {
      kind: "lab",
      title: "Practicá: mostrá sólo las protegidas",
      body:
        "Filtrá la salida para quedarte únicamente con las rutas que devuelven 401. Es la forma de ir directo a lo interesante en una web grande.",
      command: "gobuster dir -u http://banco.nande -s 401",
      explain:
        "Sólo quedan /panel y /movimientos (401). Filtrar te ahorra leer cientos de líneas: en una auditoría real, -s/-b/-fs es lo que hace usable a gobuster contra un sitio grande.",
      diagram: "capas",
    },
    {
      kind: "concept",
      title: "Subdominios: la superficie que nadie mira",
      body:
        "Un dominio no es un solo sitio: banco.nande, api.vortex.nande, preview.vortex.nande… cada subdominio es OTRO servidor, con su propio código y sus propios agujeros. Los subdominios olvidados (un 'preview', un 'old', un 'test') suelen estar peor protegidos que el principal. gobuster los encuentra en modo dns, probando nombres contra el DNS:\n\n   gobuster dns -d vortex.nande",
      diagram: "dns",
      bullets: [
        "Cada subdominio = otra app para auditar (más superficie de ataque).",
        "gobuster dns -d <dominio> prueba nombres y reporta los que resuelven.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué un subdominio olvidado como 'preview.vortex.nande' suele ser un buen objetivo?",
      options: [
        "Porque al estar olvidado suele tener menos mantenimiento y protección que el sitio principal, pero llega a los mismos datos",
        "Porque los subdominios no se pueden hackear",
        "Porque siempre son más lentos",
        "Porque no aparecen en el DNS",
      ],
      correct: 0,
      explain:
        "Un 'preview', 'staging' u 'old' se crea y se olvida: versiones viejas, sin parches, con credenciales de prueba, a veces conectado a la misma base que producción. Es una puerta lateral. Por eso enumerar subdominios amplía tanto la superficie de ataque.",
      diagram: "dns",
    },
    {
      kind: "lab",
      title: "Practicá: descubrí subdominios",
      body:
        "Enumerá los subdominios de vortex.nande con gobuster en modo dns. Cada uno que resuelva es otro sitio que podrías auditar.",
      command: "gobuster dns -d vortex.nande",
      explain:
        "Aparecen api.vortex.nande y preview.vortex.nande, con sus IPs. No estaban enlazados en ningún lado: los sacaste probando el DNS. Ahora tenés dos objetivos nuevos (la API y el preview). Probá también: gobuster dns -d nande para ver todo el mundo.",
      diagram: "dns",
    },
    {
      kind: "concept",
      title: "ffuf y la palabra mágica FUZZ",
      body:
        "ffuf es el primo veloz y flexible. Su truco: ponés la palabra FUZZ donde querés probar valores, y ffuf la reemplaza por cada línea de la lista.\n\n   ffuf -u http://banco.nande/FUZZ -w lista       (rutas)\n   ffuf -u http://banco.nande/api?id=FUZZ -w nums  (valores de un parámetro)\n\nY filtrás con -mc (match codes, quedate con estos), -fc (filter codes, sacá estos) o -fs (filter size). FUZZ puede ir en la ruta, en un parámetro, en un header… por eso ffuf sirve para mucho más que rutas.",
      diagram: "terminal",
      bullets: [
        "FUZZ = el lugar que ffuf reemplaza por cada palabra de la lista.",
        "-mc / -fc / -fs: matchear o filtrar por código o tamaño.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: fuzzing de rutas con ffuf",
      body:
        "Usá ffuf con FUZZ en la ruta y quedate sólo con lo que responde 200 o 401. Compará la salida con la de gobuster: mismo objetivo, otra herramienta.",
      command: "ffuf -u http://banco.nande/FUZZ -w list -mc 200,401",
      explain:
        "ffuf reemplaza FUZZ por cada palabra y, con -mc 200,401, sólo te muestra login (200) y panel/movimientos (401). El resto (404) lo descarta solo. Mismo resultado que gobuster, con una sintaxis que además sirve para fuzzear parámetros y headers.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Enumerar es el paso 1, no el final",
      body:
        "Encontrar las rutas no es entrar: es el mapa. Con lo que sacaste, el flujo real sigue:\n\n1. /login (200) → probás SQLi / fuerza bruta.\n2. /panel, /movimientos (401) → conseguís sesión y volvés.\n3. subdominios → auditás cada uno de cero.\n4. un config.bak → lo abrís buscando credenciales.\n\nLa enumeración prende las luces; el ataque viene después, ya sabiendo a dónde apuntar.",
      diagram: "capas",
      bullets: [
        "Enumerás → priorizás (200 para entrar, 401/403 para romper auth) → atacás.",
        "Cada hallazgo abre el siguiente curso: SQLi, fuerza bruta, IDOR…",
      ],
    },
    {
      kind: "concept",
      title: "Defensa: cómo se corta esto",
      body:
        "Del lado azul, la enumeración es RUIDOSA y se puede frenar:\n\n• No dejes nada sensible sin autenticación (ni /backup, ni /api interna, ni config accesible por web).\n• No subas backups (.bak, .zip, .sql) al webroot.\n• Monitoreá los 404 masivos: cientos de rutas inexistentes en segundos = alguien enumerando. Alertá o bloqueá esa IP (rate limiting / WAF).\n• Cuidá los subdominios olvidados: apagá 'preview', 'old', 'test' cuando no se usan.",
      diagram: "escudo",
      bullets: [
        "Autenticá todo lo sensible y sacá backups del webroot.",
        "404 masivos = enumeración: rate limiting, WAF y apagar subdominios muertos.",
      ],
    },
    {
      kind: "lab",
      title: "Capstone: encontrá la ruta oculta en el lab",
      body:
        "Poné todo junto en una lección guiada: enumerás una máquina del laboratorio, abrís la ruta oculta que encuentres y leés lo que el sitio 'regala' en robots.txt. Tocá para arrancar en la terminal.",
      command: "learn l-gobuster",
      explain:
        "El flujo completo de recon: gobuster para descubrir /admin y /robots.txt, curl para abrirlas, y leer lo que el propio sitio filtra. Es la metodología que vas a repetir en cada auditoría web: primero el mapa, después el ataque.",
      diagram: "escaneo",
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 2 — SQLi avanzado: robá toda la base con UNION              *
 * ------------------------------------------------------------------ */

const WEB_SQLI_UNION: Curso = {
  id: "c-web-sqli-union",
  title: "SQLi avanzado: robá toda la base (UNION)",
  subtitle: "De entrar sin clave a llevarte usuarios y contraseñas con UNION SELECT.",
  level: "avanzado",
  skill: "web",
  hue: 300,
  glyph: "gem",
  reward: { xp: 240, coins: 190 },
  slides: [
    {
      kind: "concept",
      title: "Ya entraste… ahora llevate TODO",
      body:
        "En el curso 'Inyección SQL: entrá sin la clave' (c-web-sqli) burlaste el login del banco con ' OR '1'='1' --. Eso fue entrar. Pero la inyección SQL da para mucho más: si podés meter tus propias órdenes en una consulta, podés pedirle a la base de datos que te devuelva OTRAS tablas enteras. Acá vas a robar la tabla de usuarios completa, con sus contraseñas, usando una técnica que se llama UNION.",
      diagram: "inyeccion",
      bullets: [
        "Login bypass = entrar. UNION = llevarte los datos.",
        "El objetivo real: el buscador de movimientos de banco.nande.",
      ],
    },
    {
      kind: "concept",
      title: "UNION: pegar una segunda consulta a la primera",
      body:
        "UNION es una palabra de SQL que junta los resultados de dos consultas en una sola lista. Por ejemplo:\n\n   SELECT id, detalle, monto FROM movimientos\n   UNION\n   SELECT usuario, password, rol FROM usuarios\n\nDevuelve las filas de la primera Y las de la segunda, apiladas. Si el buscador de un sitio arma su consulta pegando tu texto, podés colar un UNION y hacer que además te traiga filas de otra tabla que no deberías ver.",
      diagram: "inyeccion",
      bullets: [
        "UNION = apilar los resultados de dos SELECT en una sola tabla.",
        "La segunda consulta puede leer OTRA tabla (usuarios, con contraseñas).",
      ],
    },
    {
      kind: "concept",
      title: "Regla de oro del UNION: mismo número de columnas",
      body:
        "Para apilar dos consultas, las dos tienen que devolver la MISMA cantidad de columnas. Si la primera trae 4 columnas y tu UNION trae 3, la base de datos se queja:\n\n   'Las consultas de un UNION deben tener el mismo número de columnas'\n\nEse error no es un problema: es una PISTA. Nos dice que todavía no acertamos el número. Entonces, ¿cómo averiguamos cuántas columnas tiene la consulta original? Con ORDER BY.",
      diagram: "inyeccion",
      bullets: [
        "Las dos consultas del UNION deben tener igual número de columnas.",
        "Si fallás, el error te guía: ajustás y probás de nuevo.",
      ],
    },
    {
      kind: "concept",
      title: "Contar columnas con ORDER BY",
      body:
        "ORDER BY sirve para ordenar por una columna. Y podés ordenar por NÚMERO de columna: ORDER BY 1, ORDER BY 2, etc. El truco: vas subiendo el número hasta que la base se queja de que esa columna no existe.\n\n   ORDER BY 1  → ok\n   ORDER BY 4  → ok\n   ORDER BY 5  → error: fuera de rango\n\nEl último número que funcionó es la cantidad de columnas. Acá el buscador tiene 4. Con eso ya sabés que tu UNION también necesita 4 columnas.",
      diagram: "inyeccion",
      bullets: [
        "ORDER BY <n> hasta que dé error = contar columnas.",
        "El buscador de banco.nande tiene 4 columnas.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Probás ORDER BY 4 y anda, pero ORDER BY 5 tira 'columna fuera de rango'. ¿Cuántas columnas tiene la consulta?",
      options: [
        "4 (el último número que funcionó)",
        "5 (el que dio error)",
        "9 (la suma de los dos)",
        "No se puede saber",
      ],
      correct: 0,
      explain:
        "El error en ORDER BY 5 dice que no existe una quinta columna, así que hay 4. El último número que funcionó es la cantidad de columnas. Con eso ya sabés que tu UNION SELECT tiene que traer exactamente 4 columnas.",
      diagram: "inyeccion",
    },
    {
      kind: "quiz",
      prompt: "¿Por qué un UNION necesita el mismo número de columnas en las dos consultas?",
      options: [
        "Porque las filas de las dos se apilan en la misma tabla de resultado y tienen que calzar columna con columna",
        "Porque así la consulta corre más rápido",
        "Porque el servidor lo exige por seguridad",
        "Porque las contraseñas ocupan varias columnas",
      ],
      correct: 0,
      explain:
        "UNION apila filas en una sola tabla de salida. Si una consulta trae 4 valores por fila y la otra 3, no calzan y la base tira error. Por eso primero contás las columnas (con ORDER BY) y recién ahí armás el UNION con esa misma cantidad.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "El objetivo: el buscador de banco.nande",
      body:
        "En banco.nande, la página /movimientos tiene un buscador (?q=). Por dentro arma esta consulta pegando tu texto sin limpiarlo:\n\n   SELECT id, detalle, monto, usuario FROM movimientos\n   WHERE usuario = 'TU_USUARIO' AND detalle LIKE '%LO_QUE_BUSCÁS%'\n\nLa tabla que ves en pantalla muestra 3 columnas por fila: #, Detalle y Monto. Vos vas a cerrar ese LIKE con una comilla, colar un UNION que lea la tabla usuarios, y comentar el resto con --. Las contraseñas van a aparecer en la tabla, a la vista.",
      diagram: "inyeccion",
      bullets: [
        "El buscador arma la consulta con tu texto → inyectable.",
        "Necesitás una sesión (una cookie) para entrar a /movimientos.",
        "4 columnas: id, detalle, monto, usuario.",
      ],
    },
    {
      kind: "quiz",
      prompt: "El buscador muestra id, Detalle y Monto. Si inyectás UNION SELECT id, usuario, password, rol FROM usuarios, ¿dónde vas a ver las contraseñas?",
      options: [
        "En la columna que dice 'Monto' (ahí cae password, la tercera que se muestra)",
        "En la barra de direcciones",
        "En la cookie de sesión",
        "En ningún lado, no se pueden ver",
      ],
      correct: 0,
      explain:
        "La pantalla muestra los 3 primeros valores de cada fila. En tu UNION el orden es id, usuario, password, rol, así que el 1º cae en '#', el 2º (usuario) en 'Detalle' y el 3º (password) en 'Monto'. Las contraseñas reales del banco quedan a la vista bajo la columna 'Monto'.",
      diagram: "inyeccion",
    },
    {
      kind: "build",
      goal: "Armar el payload del buscador (?q=) que cuela un UNION para volcar la tabla usuarios con sus contraseñas",
      pieces: [
        "a%'",
        "UNION",
        "SELECT",
        "id,usuario,password,rol",
        "FROM",
        "usuarios--",
        "DROP",
        "OR '1'='1",
      ],
      answer: ["a%'", "UNION", "SELECT", "id,usuario,password,rol", "FROM", "usuarios--"],
      hint: "Cerrá el patrón del LIKE con a%'  para salir de la cadena. Después UNION SELECT con las 4 columnas (id,usuario,password,rol) FROM usuarios, y comentá el resto con --",
      explain:
        "Queda a%' UNION SELECT id,usuario,password,rol FROM usuarios--  . El a%' cierra el LIKE '%…', el UNION pega una segunda consulta con 4 columnas (igual que la original) que lee la tabla usuarios, y el -- comenta el %' que el servidor agrega al final. Resultado: la tabla te devuelve los usuarios reales con sus contraseñas.",
    },
    {
      kind: "lab",
      title: "Practicá: robá la tabla de usuarios del banco",
      body:
        "Dos pasos, un solo comando encadenado con &&. Primero entrás con un bypass de login (admin' -- ) para tener una sesión; el navegador guarda tu cookie. Después mandás el buscador con tu payload UNION. Mirá bien la tabla de resultados.",
      command:
        "curl -X POST http://banco.nande/login -d \"usuario=admin' -- &password=x\" && curl \"http://banco.nande/movimientos?q=a%' UNION SELECT id,usuario,password,rol FROM usuarios--\"",
      explain:
        "En la tabla vas a ver las 4 cuentas del banco con sus contraseñas REALES, sacadas en vivo del motor SQL: admin/M8arete-2024!, rocio/girasol77, dario/boca123, sofia/qwerty. No estaban escritas en ningún lado: tu UNION las trajo de la tabla usuarios, y al lograrlo capturás la bandera ND{sqli_union_dump}. La herramienta sqlmap automatiza justo esto (sqlmap -u \"http://banco.nande/movimientos?q=a\" --dump). Defensa: consultas preparadas (parametrizadas), que separan la orden del dato para que tu texto NUNCA se vuelva SQL.",
      diagram: "inyeccion",
    },
    {
      kind: "quiz",
      prompt: "Ya tenés las contraseñas de todas las cuentas del banco. Como hacker ÉTICO, ¿qué hacés?",
      options: [
        "Reporto la falla al dueño con el detalle y cómo arreglarla, y no toco las cuentas ajenas",
        "Transfiero plata de la cuenta con más saldo",
        "Publico las contraseñas en un grupo",
        "Entro a la cuenta de sofia porque tiene más plata",
      ],
      correct: 0,
      explain:
        "Encontrar el agujero es el trabajo; aprovecharlo para robar es un delito. Un hacker ético demuestra la falla con lo mínimo necesario, la reporta con la solución (consultas preparadas) y jamás usa datos de personas reales. Esa línea es lo que separa a un profesional de un delincuente.",
      diagram: "escudo",
    },
    {
      kind: "concept",
      title: "El agravante: contraseñas en texto plano",
      body:
        "Fijate en algo grave del banco: sus contraseñas estaban guardadas TAL CUAL (M8arete-2024!, girasol77…). Apenas salieron por el UNION, ya sirven para entrar. Un sitio bien hecho NUNCA guarda la contraseña como texto: guarda su hash (una huella con SHA-256 y una 'sal' única). Así, aunque roben la tabla, no tienen las claves; solo huellas difíciles de revertir. Por eso una SQLi duele mucho más cuando encima había malas prácticas atrás.",
      diagram: "hash",
      bullets: [
        "Guardar la contraseña en texto plano = regalo servido si roban la base.",
        "Lo correcto: guardar el HASH con sal, nunca la contraseña real.",
      ],
    },
    {
      kind: "concept",
      title: "La cura: consultas preparadas",
      body:
        "Todo esto pasa por un solo error: pegar el texto del usuario DENTRO de la orden SQL. La cura se llama consulta preparada (prepared statement): el programa manda la orden y los datos por caminos SEPARADOS, así tu texto se trata siempre como dato, nunca como orden. Con eso, ni el bypass de login ni el UNION funcionan. Sumale: mínimos privilegios en la base, no mostrar errores SQL al usuario, y validar entradas.",
      diagram: "escudo",
      bullets: [
        "Consultas preparadas: la orden y el dato viajan separados (la cura real).",
        "Si sabés romperlo, sabés arreglarlo. Reportá y explicá el arreglo.",
      ],
    },
    {
      kind: "lab",
      title: "Capstone: la auditoría COMPLETA, vos solo",
      body:
        "Viste las piezas por separado. Ahora unilas como un pentester de verdad: una auditoría de punta a punta a banco.nande — reconocer, enumerar, explotar, saquear e interpretar lo que sacás. Es guiada y te va a preguntar qué encontraste en cada etapa. Tocá el botón para arrancar el engagement en la terminal.",
      command: "learn l-eng-web",
      explain:
        "Esto es la metodología real, no un truco suelto: nmap → gobuster → SQLi de login → volcado por UNION → lectura de los datos → informe. Terminarla demuestra que sabés HACER una auditoría web, no solo repetir un comando.",
      diagram: "capas",
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 2b — sqlmap a fondo: automatizá la inyección SQL            *
 * ------------------------------------------------------------------ */

const WEB_SQLMAP: Curso = {
  id: "c-web-sqlmap",
  title: "sqlmap a fondo: la inyección, automatizada",
  subtitle: "De la comilla a mano a la herramienta que detecta, enumera y vuelca la base sola.",
  level: "avanzado",
  skill: "web",
  hue: 190,
  glyph: "drop",
  reward: { xp: 280, coins: 220 },
  slides: [
    {
      kind: "concept",
      title: "¿Por qué sqlmap?",
      body:
        "En los cursos anteriores rompiste el login a mano (' OR '1'='1' -- ) y robaste la tabla usuarios contando columnas con ORDER BY y armando un UNION SELECT. Funciona, pero es lento y hay que probar mil variantes de la comilla. sqlmap es la herramienta que hace TODO eso sola: prueba decenas de payloads, detecta si el parámetro es inyectable, adivina el motor de base de datos, cuenta las columnas, encuentra las tablas y te vuelca los datos. Es la herramienta de SQLi más usada del mundo. No reemplaza entender la inyección: la potencia.",
      diagram: "inyeccion",
      bullets: [
        "sqlmap automatiza detección + explotación + volcado de SQLi.",
        "Entender la inyección a mano es lo que te deja leer y confiar en lo que sqlmap hace.",
      ],
    },
    {
      kind: "concept",
      title: "Las 5 técnicas que prueba sqlmap (BEUST)",
      body:
        "sqlmap no tiene una sola forma de inyectar: prueba cinco familias de técnicas, y las elige según cómo responde la app.\n\n• B — Boolean-based blind: manda una condición verdadera y una falsa y mira si la página CAMBIA (aunque no muestre datos).\n• E — Error-based: provoca un error SQL y lee el dato dentro del mensaje de error.\n• U — UNION query-based: pega un UNION SELECT (lo que hiciste a mano) y trae filas de otras tablas. La más rápida cuando la app refleja datos.\n• S — Stacked queries: encadena una segunda orden con ';' (puede INSERT/UPDATE/DROP).\n• T — Time-based blind: cuando NADA cambia en pantalla, hace que la base 'duerma' X segundos si la condición es verdadera, y mide el tiempo.",
      diagram: "inyeccion",
      bullets: [
        "B(oolean) E(rror) U(nion) S(tacked) T(ime) — las 5 técnicas.",
        "Ciega = la app no muestra el dato: se deduce por cambios (B) o por tiempo (T).",
      ],
    },
    {
      kind: "quiz",
      prompt: "Un endpoint es vulnerable pero NUNCA muestra el resultado ni cambia el texto de la página. ¿Qué técnica te queda para extraer datos?",
      options: [
        "Time-based blind (T): hacés que la base tarde X segundos si la condición es verdadera y medís el tiempo",
        "UNION-based (U): pegás un UNION SELECT y leés las filas",
        "Error-based (E): leés el dato en el mensaje de error",
        "Ninguna: si no muestra nada, no se puede",
      ],
      correct: 0,
      explain:
        "Si la página no refleja datos, no cambia y no filtra errores, todavía queda el TIEMPO. Con time-based hacés 'si la 1ra letra es A, dormí 5s'. Si tarda, era A. Es lentísimo (letra por letra) pero funciona en inyecciones totalmente ciegas. sqlmap lo automatiza con --technique=T.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "Lo primero: un parámetro para atacar",
      body:
        "sqlmap ataca UN parámetro. Se lo das de dos formas:\n\n• GET: en la URL, con -u y el ?param=valor\n   sqlmap -u \"http://banco.nande/movimientos?q=a\"\n\n• POST: con --data y los campos del cuerpo\n   sqlmap -u http://banco.nande/login --data \"usuario=admin&password=x\"\n\nSin un parámetro no hay nada que inyectar: sqlmap te va a decir 'no hay parámetros que probar'. Siempre las comillas alrededor de la URL: si no, la shell parte el ?q= en pedazos.",
      diagram: "url",
      bullets: [
        "GET → -u \"...?param=valor\"   ·   POST → --data \"campo=valor\"",
        "Comillas SIEMPRE alrededor de la URL (por el ? y el &).",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Cuál de estos comandos tiene sentido para sqlmap?",
      options: [
        "sqlmap -u \"http://banco.nande/movimientos?q=a\"  (tiene un parámetro q para probar)",
        "sqlmap -u http://banco.nande/  (la home, sin parámetros)",
        "sqlmap banco.nande  (falta -u y el http)",
        "sqlmap --dump  (sin objetivo)",
      ],
      correct: 0,
      explain:
        "sqlmap necesita una URL (con http) y un parámetro donde inyectar. /movimientos?q=a tiene el parámetro q. La home sin ?param= no le da nada que probar, y sin -u ni URL no sabe a dónde apuntar.",
      diagram: "url",
    },
    {
      kind: "concept",
      title: "Endpoints con sesión: la cookie",
      body:
        "El buscador /movimientos del banco exige estar logueado: sin sesión devuelve 401 y sqlmap no vería la inyección. Dos caminos:\n\n1) Le pasás una cookie que ya tengas:\n   sqlmap -u \"http://banco.nande/movimientos?q=a\" --cookie \"sesion=abc123\"\n\n2) En este mundo, si el endpoint pide sesión y no diste cookie, sqlmap se autentica solo con el bypass de login (usuario=admin' -- ) y sigue. Vas a ver en la salida: 'el endpoint exige sesión → sqlmap se autentica solo'. En sqlmap real esto se logra con --auth o guardando la cookie primero; la idea es la misma: primero entrás, después inyectás.",
      diagram: "cookie",
      bullets: [
        "--cookie \"sesion=...\" manda tu sesión en cada petición.",
        "Regla de oro: primero conseguí sesión, después inyectás el endpoint privado.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: primera detección (el login)",
      body:
        "Arranquemos por el login, que es POST. Le damos los dos campos con --data. sqlmap va a probar la comilla en cada uno y decirte si son inyectables.",
      command: 'sqlmap -u http://banco.nande/login --data "usuario=admin&password=x"',
      explain:
        "sqlmap detecta que 'usuario' es inyectable (error-based y/o boolean), hace el bypass de autenticación y entra sin contraseña: cae ND{sqli_login_bypass}. Fijate cómo te explica POR QUÉ lo marcó inyectable (el error SQL con la comilla, o la diferencia entre 1=1 y 1=2). Eso es lo mismo que hiciste a mano, pero en segundos.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "La escalera de enumeración: --dbs → --tables → --columns → --dump",
      body:
        "Una vez que sqlmap confirma la inyección, no vas directo a robar todo: enumerás de a poco, como abrir cajones.\n\n• --dbs      → qué bases de datos hay (acá el motor ÑandeSQL, base 'main').\n• --tables   → qué tablas tiene (usuarios, movimientos…).\n• --columns  → qué columnas tiene una tabla (-T usuarios → id, usuario, password, rol…).\n• --dump     → volcá los DATOS de la tabla (las filas reales).\n\nPodés saltar directo a --dump si ya sabés qué querés, pero enumerar primero te dice DÓNDE están las contraseñas sin volcar toda la base (más silencioso y más prolijo).",
      diagram: "capas",
      bullets: [
        "--dbs → --tables → --columns → --dump: de lo general al dato.",
        "-T <tabla> enfoca en una tabla; -C <columna> en columnas puntuales.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Querés saber QUÉ columnas tiene la tabla usuarios, pero todavía NO volcar las contraseñas. ¿Qué comando usás?",
      options: [
        "sqlmap -u \"...movimientos?q=a\" -T usuarios --columns",
        "sqlmap -u \"...movimientos?q=a\" --dump",
        "sqlmap -u \"...movimientos?q=a\" --dbs",
        "sqlmap -u \"...movimientos?q=a\" --tables",
      ],
      correct: 0,
      explain:
        "--columns enumera los NOMBRES de las columnas (con -T para elegir la tabla) sin traer los valores. --dump ya volcaría las filas (las contraseñas). --dbs lista bases y --tables lista tablas: ninguno baja al nivel de columna.",
      diagram: "capas",
    },
    {
      kind: "lab",
      title: "Practicá: enumerá bases y tablas",
      body:
        "Sobre el buscador (que exige sesión: sqlmap se autentica solo). Primero preguntá qué motor y qué bases hay, después qué tablas. Sin volcar nada todavía.",
      command: 'sqlmap -u "http://banco.nande/movimientos?q=a" --dbs',
      explain:
        "sqlmap te dice el DBMS (ÑandeSQL) y la base 'main'. Cambiá --dbs por --tables y vas a ver las tablas (usuarios, movimientos). Fijate que NO aparece ninguna contraseña: enumerar no es volcar. Recién sabiendo que existe la tabla 'usuarios' tiene sentido ir por ella.",
      diagram: "capas",
    },
    {
      kind: "lab",
      title: "Practicá: columnas de usuarios (sin volcar)",
      body:
        "Ya sabés que existe la tabla usuarios. Preguntá qué columnas tiene, enfocando con -T. Todavía sin traer los datos.",
      command: 'sqlmap -u "http://banco.nande/movimientos?q=a" -T usuarios --columns',
      explain:
        "Aparecen las columnas reales: id, usuario, password, rol (y alguna más). Ahí ya ves DÓNDE está el oro: la columna 'password'. Un pentester prolijo llega hasta acá antes de volcar, para saber exactamente qué pedir y no arrastrar toda la base (menos ruido, menos datos sensibles tocados).",
      diagram: "capas",
    },
    {
      kind: "build",
      goal: "Armar el comando sqlmap que vuelca la tabla usuarios del buscador, sin que pregunte nada",
      pieces: [
        "sqlmap",
        "-u",
        "\"http://banco.nande/movimientos?q=a\"",
        "--batch",
        "--dump",
        "--data",
        "DROP TABLE",
        "rm -rf",
      ],
      answer: ["sqlmap", "-u", "\"http://banco.nande/movimientos?q=a\"", "--batch", "--dump"],
      hint: "sqlmap -u con la URL entre comillas (tiene ?q=). --batch para que no pregunte nada, --dump para volcar. Nada de --data acá: el parámetro va en la URL (es GET).",
      explain:
        "Queda: sqlmap -u \"http://banco.nande/movimientos?q=a\" --batch --dump . El -u apunta al buscador (GET, el parámetro q va en la URL). --batch corre sin preguntar (asume las respuestas por defecto). --dump vuelca la tabla. sqlmap se autentica solo, cuenta columnas, arma el UNION y trae las filas.",
    },
    {
      kind: "lab",
      title: "Practicá: el volcado completo",
      body:
        "El momento de la verdad: dejá que sqlmap haga todo el trabajo pesado y te devuelva la tabla usuarios con las contraseñas. Mirá la tabla que imprime.",
      command: 'sqlmap -u "http://banco.nande/movimientos?q=a" --batch --dump',
      explain:
        "sqlmap se autentica, cuenta 4 columnas con ORDER BY, descubre las posiciones reflejadas, prueba tablas y columnas por diccionario y vuelca: admin/M8arete-2024!, rocio/girasol77, dario/boca123, sofia/qwerty. Cae ND{sqli_union_dump}. Todo lo del curso anterior, en un comando. Y como salen en texto plano, ya se podrían crackear con john/hashcat si fueran hashes.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "Afinar el escaneo: --level, --risk, --batch, --technique",
      body:
        "sqlmap tiene perillas para escanear más profundo o más rápido:\n\n• --batch: no pregunta nada, asume las respuestas por defecto (ideal para automatizar).\n• --level 1..5: cuántos LUGARES prueba (parámetros, headers, cookies). Más nivel = más cobertura y más ruido.\n• --risk 1..3: qué tan AGRESIVOS son los payloads (risk 3 usa hasta OR que podrían modificar datos).\n• --technique=BEUST: forzar sólo algunas técnicas (ej. --technique=U para UNION, --technique=T para time-based).\n\nRegla práctica: empezá bajo (--level 1 --risk 1). Si no encuentra nada y sospechás que hay algo, subí. Más nivel = más lento y más visible para el SOC.",
      diagram: "escaneo",
      bullets: [
        "--level = cuántos lugares prueba · --risk = qué tan agresivo.",
        "--batch para automatizar · --technique para forzar una técnica puntual.",
      ],
    },
    {
      kind: "quiz",
      prompt: "sqlmap con --level 1 no encontró nada, pero estás casi seguro de que hay inyección en una cookie. ¿Qué hacés?",
      options: [
        "Subir el --level (2..5): a más nivel, prueba más lugares como headers y cookies",
        "Subir el --risk a 3 y listo, es lo mismo",
        "Repetir el mismo comando varias veces",
        "Concluir que no hay inyección y cerrar",
      ],
      correct: 0,
      explain:
        "--level controla CUÁNTOS lugares prueba: con nivel bajo sólo mira los parámetros obvios; subiéndolo empieza a probar headers y cookies. --risk es otra cosa (qué tan agresivo es el payload). Repetir igual no cambia nada. Subí el nivel con criterio, sabiendo que hacés más ruido.",
      diagram: "escaneo",
    },
    {
      kind: "lab",
      title: "Practicá: reconocé el motor (banner)",
      body:
        "Antes de volcar, muchas veces querés saber contra qué peleás: qué motor, qué base, qué usuario corre la app. sqlmap lo extrae por la misma inyección.",
      command: 'sqlmap -u "http://banco.nande/movimientos?q=a" --banner --current-db --current-user',
      explain:
        "Salen el banner del motor (ÑandeSQL), la base actual (main) y el usuario del DBMS (app_banco). Ese usuario importa: si la app se conecta a la base como un superusuario, una SQLi es mucho más grave (podría leer archivos o ejecutar comandos). Por eso la defensa incluye 'mínimos privilegios' para la cuenta de la app.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "sqlmap es RUIDOSO: el SOC te ve",
      body:
        "sqlmap manda cientos de peticiones raras (comillas, UNION, ORDER BY, sleeps) en segundos. Eso deja un rastro clarísimo: un SOC con detección web lo ccaza al toque como 'posible SQLi automatizada'. En un pentest real esto es parte del juego (a veces querés ser detectado para probar la defensa), pero si el objetivo es sigilo, sqlmap a lo bruto te quema. Se puede bajar el ruido (--delay, --level bajo, un solo parámetro), pero nunca es invisible. Lección doble: como atacante, medí tu ruido; como defensor, este patrón es de los más fáciles de detectar y bloquear.",
      diagram: "firewall",
      bullets: [
        "Cientos de payloads/segundo → firma obvia para el SOC/WAF.",
        "Atacás: controlá el ruido. Defendés: la SQLi automatizada se detecta fácil.",
      ],
    },
    {
      kind: "concept",
      title: "La cura (otra vez): consultas preparadas",
      body:
        "Que sqlmap sea tan poderoso no cambia la defensa: sigue siendo una sola cosa. Si la app usa consultas preparadas (parametrizadas), el dato viaja separado de la orden y NINGUNA técnica de sqlmap funciona — ni B, ni E, ni U, ni T. Sumale: la cuenta de la app con mínimos privilegios (que no pueda leer otras bases ni archivos), no mostrar errores SQL al usuario, un WAF que corte los patrones típicos, y hashear las contraseñas (con sal) para que, aunque roben la tabla, no sirvan directo. sqlmap es el mejor argumento para programar bien: te muestra exactamente lo que un atacante automatiza en segundos.",
      diagram: "escudo",
      bullets: [
        "Consultas preparadas = sqlmap se queda sin nada que explotar.",
        "Defensa en capas: mínimos privilegios + sin errores visibles + WAF + hashing.",
      ],
    },
    {
      kind: "lab",
      title: "Capstone: la auditoría web completa",
      body:
        "Ya sabés manejar sqlmap de punta a punta. Ahora usalo dentro de una auditoría de verdad a banco.nande: reconocer, enumerar, explotar, saquear e informar. Es guiada y te pregunta qué encontraste en cada etapa. Tocá para arrancar el engagement en la terminal.",
      command: "learn l-eng-web",
      explain:
        "La metodología real: nmap → gobuster → SQLi de login → volcado (a mano o con sqlmap --dump) → lectura de los datos → informe. Terminarla demuestra que sabés HACER una auditoría web completa, con la herramienta y entendiendo lo que hace por dentro.",
      diagram: "capas",
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 3 — XSS: tu código en el navegador ajeno                    *
 * ------------------------------------------------------------------ */

const WEB_XSS: Curso = {
  id: "c-web-xss",
  title: "XSS: tu código en el navegador ajeno",
  subtitle: "Cuando un sitio devuelve tu texto sin limpiarlo, tu <script> corre en otras compus.",
  level: "intermedio",
  skill: "web",
  hue: 45,
  glyph: "flame",
  reward: { xp: 180, coins: 140 },
  slides: [
    {
      kind: "concept",
      title: "XSS: meter tu código en la página de otro",
      body:
        "XSS (Cross-Site Scripting) pasa cuando un sitio toma algo que vos escribiste y lo devuelve dentro de la página SIN limpiarlo. Si lo que escribiste es un <script>, el navegador de quien vea esa página lo va a ejecutar como si fuera código del sitio. O sea: lográs correr TU código en el navegador de otra persona. Eso es enorme, porque el navegador de la víctima tiene su sesión, sus cookies, lo que ve en pantalla.",
      diagram: "xss",
      bullets: [
        "El sitio devuelve tu texto sin limpiarlo → tu <script> se ejecuta.",
        "Corre en el navegador de la VÍCTIMA, con su sesión.",
      ],
    },
    {
      kind: "concept",
      title: "Reflejado vs Guardado",
      body:
        "Hay dos sabores de XSS:\n\n• Reflejado: tu código va en un parámetro de la URL y el sitio lo 'refleja' de vuelta en esa respuesta. Para que le pegue a alguien, tenés que hacerle abrir tu enlace preparado.\n\n• Guardado (stored): tu código se GUARDA en el sitio (un comentario, un perfil, un mensaje) y se le ejecuta a TODO el que abra esa página, sin que hagan clic en nada tuyo. Es más peligroso porque es automático y masivo.",
      diagram: "xss",
      bullets: [
        "Reflejado → viaja en la URL; la víctima debe abrir tu enlace.",
        "Guardado → queda en el sitio; le pega a todos los que lo visitan.",
      ],
    },
    {
      kind: "quiz",
      prompt: "El <script> que inyectás con XSS, ¿dónde se ejecuta?",
      options: [
        "En el navegador de la víctima (con su sesión y sus cookies)",
        "En el servidor del sitio",
        "En la base de datos",
        "En el DNS",
      ],
      correct: 0,
      explain:
        "XSS es un ataque del lado del cliente: tu código corre en el navegador de quien ve la página, no en el servidor. Por eso sirve para robar la cookie de sesión de la víctima, cambiar lo que ve, o hacer acciones en su nombre.",
      diagram: "xss",
    },
    {
      kind: "quiz",
      prompt: "¿Cuál es la diferencia clave entre XSS reflejado y guardado?",
      options: [
        "El reflejado necesita que la víctima abra tu enlace; el guardado queda en el sitio y le pega a todos",
        "El reflejado es más peligroso siempre",
        "El guardado solo funciona con HTTPS",
        "No hay diferencia real, es el mismo ataque",
      ],
      correct: 0,
      explain:
        "En el reflejado, el código viaja en la URL, así que dependés de que alguien haga clic en tu enlace. En el guardado, el código queda almacenado en el sitio y se ejecuta solo a cada visitante. Por eso el guardado suele ser más grave: es automático y masivo.",
      diagram: "xss",
    },
    {
      kind: "concept",
      title: "Por qué importa: robo de cookies",
      body:
        "¿Te acordás de la cookie de sesión, tu pulsera de 'ya entré'? Un script que corre en el navegador de la víctima puede leerla (document.cookie) y mandársela al atacante. Con esa cookie, el atacante entra como la víctima SIN saber su contraseña. Ese es el clásico golpe del XSS: no roba la clave, roba la sesión ya iniciada.",
      diagram: "cookie",
      bullets: [
        "Un script puede leer la cookie de sesión y enviarla afuera.",
        "Con la cookie robada, el atacante se hace pasar por la víctima.",
        "Defensa clave: cookies HttpOnly (el JavaScript no las puede leer).",
      ],
    },
    {
      kind: "concept",
      title: "Dónde se esconde el XSS",
      body:
        "El XSS puede aparecer en CUALQUIER lugar donde el sitio te muestre de vuelta lo que escribiste: un buscador que repite tu término, un comentario, tu nombre de perfil, un mensaje de chat, un campo de una encuesta. La pregunta que se hace un pentester es siempre la misma: '¿esto que escribo, el sitio lo devuelve tal cual en la página?'. Si la respuesta es sí, ahí hay que probar un <script>.",
      diagram: "xss",
      bullets: [
        "Buscadores, comentarios, perfiles, chats: cualquier eco de tu texto.",
        "La pregunta clave: ¿el sitio devuelve mi texto sin limpiarlo?",
      ],
    },
    {
      kind: "build",
      goal: "Armar el pedido que prueba un XSS reflejado en el buscador del blog",
      pieces: [
        "curl",
        "http://blog.yvoty.nande/buscar?q=<script>alert(1)</script>",
        "http://blog.yvoty.nande/buscar?q=hola",
        "nmap",
      ],
      answer: ["curl", "http://blog.yvoty.nande/buscar?q=<script>alert(1)</script>"],
      hint: "Con curl pedís la página del buscador, pero en el parámetro ?q= en vez de una palabra normal ponés un <script>. La opción con ?q=hola es inofensiva.",
      explain:
        "curl http://blog.yvoty.nande/buscar?q=<script>alert(1)</script> manda un <script> como término de búsqueda. El blog lo devuelve dentro de la página sin limpiarlo, así que se ejecuta: eso es XSS reflejado. Con ?q=hola no pasa nada, porque 'hola' no es código.",
    },
    {
      kind: "concept",
      title: "El objetivo: blog.yvoty.nande",
      body:
        "El buscador de blog.yvoty.nande toma tu ?q= y lo pega en la respuesta con un texto tipo 'Resultados para: LO_QUE_ESCRIBISTE', pero SIN escaparlo. Si escribís hola, muestra 'Resultados para: hola'. Si escribís <script>…</script>, el navegador no lo muestra como texto: lo EJECUTA. Ese es exactamente el fallo que vas a confirmar en el laboratorio.",
      diagram: "xss",
      bullets: [
        "El buscador refleja ?q= sin escapar → XSS reflejado.",
        "Texto normal se muestra; un <script> se ejecuta.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: confirmá el XSS reflejado",
      body:
        "Mandale al buscador del blog un <script> como término de búsqueda y mirá la respuesta. El 'navegador' de ÑANDE detecta que tu script se disparó y te lo confirma con una bandera.",
      command: "curl \"http://blog.yvoty.nande/buscar?q=<script>alert(1)</script>\"",
      explain:
        "La respuesta confirma que el <script> se ejecutó y cae la bandera ND{xss_reflejado}. Lo que observás: tu código llegó como parámetro y el sitio lo devolvió tal cual, listo para correr en el navegador. Defensa: escapar la salida (convertir < en &lt; para que el navegador lo muestre como texto, no como código), Content-Security-Policy, y cookies HttpOnly para que un script no las pueda leer.",
      diagram: "xss",
    },
    {
      kind: "concept",
      title: "La defensa: escapar y CSP",
      body:
        "XSS se cura tratando lo que escribe el usuario como TEXTO, nunca como código:\n\n• Escapar la salida: antes de meter tu texto en el HTML, convertir < en &lt;, > en &gt;, etc. Así el navegador lo dibuja como letras, no lo ejecuta.\n• CSP (Content-Security-Policy): una regla del sitio que dice qué scripts puede correr; bloquea los inyectados.\n• Cookies HttpOnly: el JavaScript no las puede leer, así un XSS no te roba la sesión.",
      diagram: "escudo",
      bullets: [
        "Escapar la salida = la cura principal del XSS.",
        "CSP + cookies HttpOnly = capas extra de defensa.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Qué defensa evita que un <script> inyectado se ejecute en la página?",
      options: [
        "Escapar la salida: convertir < en &lt; para que se muestre como texto",
        "Usar HTTPS en vez de HTTP",
        "Cambiar el servidor de DNS",
        "Abrir más puertos en el firewall",
      ],
      correct: 0,
      explain:
        "El XSS pasa porque el sitio inserta tu texto como HTML. Si escapás la salida (< se vuelve &lt;), el navegador lo dibuja como los caracteres '<script>' en la pantalla, no como una etiqueta que ejecuta. HTTPS cifra el tráfico pero no evita el XSS; son problemas distintos.",
      diagram: "escudo",
    },
    {
      kind: "concept",
      title: "Ética: reportá, no robes",
      body:
        "Encontrar un XSS es valioso, pero probarlo con cookies de personas reales es hacer daño. Un hacker ético confirma la falla con algo inofensivo (un alert), la reporta al dueño con la solución (escapar la salida, CSP, HttpOnly) y no toca sesiones ajenas. El objetivo siempre es que el sitio quede más seguro, no aprovecharte de la gente.",
      diagram: "escudo",
      bullets: [
        "Confirmá con algo inofensivo; nunca robes sesiones reales.",
        "Reportá con la solución. Eso es lo que hace un profesional.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 4 — IDOR y Path Traversal: pedir lo que no es tuyo          *
 * ------------------------------------------------------------------ */

const WEB_IDOR_TRAVERSAL: Curso = {
  id: "c-web-idor-traversal",
  title: "IDOR y Path Traversal: pedir lo que no es tuyo",
  subtitle: "Dos fallas que nacen de confiar en la URL: cambiar un ?id= y trepar con ../",
  level: "intermedio",
  skill: "web",
  hue: 160,
  glyph: "search",
  reward: { xp: 180, coins: 140 },
  slides: [
    {
      kind: "concept",
      title: "Pedir lo que no es tuyo",
      body:
        "Muchos sitios te muestran cosas según un dato de la URL: ?id=1 para tu álbum, ?archivo=manual.txt para un documento. El problema aparece cuando el servidor confía en ese dato SIN comprobar si de verdad tenés permiso. Dos fallas clásicas nacen de ahí: IDOR (cambiar el número del recurso) y Path Traversal (trepar de carpeta con ../). Las dos son 'pedir educadamente algo que no te corresponde'.",
      diagram: "url",
      bullets: [
        "El servidor te da cosas según la URL.",
        "Si no controla que sea TUYO, pedís lo ajeno.",
      ],
    },
    {
      kind: "concept",
      title: "IDOR: cambiar el ?id=",
      body:
        "IDOR = Referencia Directa a Objeto Insegura. Un sitio muestra tu recurso con algo como /album?id=1. Ese 1 es una referencia directa: apunta derecho al objeto en la base. Si cambiás a ?id=2, ?id=5, ?id=7… y el servidor no verifica que ese álbum sea tuyo, te muestra el de otra persona. No hackeás nada raro: solo cambiás un número que vos controlás.",
      diagram: "url",
      bullets: [
        "El id apunta directo al recurso (álbum, factura, mensaje).",
        "Cambiar el número y ver lo ajeno = IDOR.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Qué es lo que falla el servidor en un IDOR?",
      options: [
        "No comprueba que el recurso pedido sea TUYO antes de mostrarlo",
        "Usa contraseñas débiles",
        "No cifra el tráfico con HTTPS",
        "Tiene demasiados puertos abiertos",
      ],
      correct: 0,
      explain:
        "El id no es el problema; el problema es que el servidor no controla la propiedad: no pregunta '¿este álbum es de quien lo pide?'. La defensa es siempre verificar permisos en el servidor para CADA recurso, sin importar qué número te manden.",
      diagram: "url",
    },
    {
      kind: "concept",
      title: "El objetivo: fotos.arandu.nande",
      body:
        "En fotos.arandu.nande, tus álbumes son /album?id=1 y /album?id=2. Pero el servidor nunca comprueba de quién es el álbum: solo busca el número que le pidas y te lo muestra. Si probás otros ids, aparecen álbumes privados de otras personas. El álbum #7 es del administrador, y adentro hay una bandera. Cambiar un número te lleva a lo que no deberías ver.",
      diagram: "url",
      bullets: [
        "Tus álbumes: ?id=1 y ?id=2.",
        "?id=5 y ?id=7 son de otros: el servidor no lo controla.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: entrá al álbum privado del admin",
      body:
        "Pedile a fotos.arandu.nande el álbum #7, que no es tuyo. Como el servidor no comprueba el dueño, te lo va a mostrar igual.",
      command: "curl http://fotos.arandu.nande/album?id=7",
      explain:
        "Te muestra el álbum privado del admin y cae la bandera ND{idor_album_ajeno}. Lo que observás: solo cambiaste el número del id y accediste a un recurso ajeno; no hizo falta contraseña ni truco. Defensa: el servidor debe verificar, en cada pedido, que el recurso pertenezca a quien inició sesión (control de acceso del lado del servidor).",
      diagram: "url",
    },
    {
      kind: "concept",
      title: "Path Traversal: trepar con ../",
      body:
        "Ahora, en vez de un número, el dato es el nombre de un archivo: /ver?archivo=manual.txt. El servidor busca ese archivo dentro de una carpeta pública. Pero en las rutas existe .. que significa 'subí una carpeta'. Si el servidor no limpia la ruta, podés escribir ../ varias veces para SALIR de la carpeta pública y llegar a archivos del sistema que no deberías leer, como los de configuración con secretos.",
      diagram: "archivo",
      bullets: [
        ".. = subir un nivel de carpeta.",
        "../ repetido = escapar de la carpeta permitida.",
      ],
    },
    {
      kind: "concept",
      title: "Cómo se arma el salto",
      body:
        "El visor de docs.tape.nande arma la ruta pegando tu texto detrás de la carpeta pública:\n\n   public/  +  loque_pidas\n\nSi pedís archivo=manual.txt, abre public/manual.txt (bien). Pero si pedís archivo=../config/secrets.env, la ruta queda public/../config/secrets.env, y ese ../ te saca de public/ y te lleva a config/secrets.env, donde hay contraseñas y una bandera. El servidor no encerró la ruta: ese es el bug.",
      diagram: "archivo",
      bullets: [
        "public/ + ../config/secrets.env → config/secrets.env.",
        "El fallo: no normalizar ni encerrar la ruta.",
      ],
    },
    {
      kind: "quiz",
      prompt: "En una ruta de archivos, ¿qué hace '../'?",
      options: [
        "Sube un nivel de carpeta (sale hacia la carpeta de arriba)",
        "Borra el archivo",
        "Cifra la carpeta",
        "Baja a una subcarpeta nueva",
      ],
      correct: 0,
      explain:
        "'..' significa 'la carpeta de arriba'. Encadenando ../ te movés hacia afuera de donde estás. En un visor que no controla la ruta, eso te deja salir de la carpeta pública y leer archivos internos: eso es path traversal.",
      diagram: "archivo",
    },
    {
      kind: "build",
      goal: "Armar la URL que se escapa de la carpeta pública para leer el archivo de secretos",
      pieces: [
        "curl",
        "http://docs.tape.nande/ver?archivo=../config/secrets.env",
        "http://docs.tape.nande/ver?archivo=manual.txt",
        "nmap",
      ],
      answer: ["curl", "http://docs.tape.nande/ver?archivo=../config/secrets.env"],
      hint: "Con curl pedís el visor, pero en ?archivo= en vez de manual.txt ponés ../config/secrets.env para trepar fuera de public/. La opción manual.txt es el uso normal (inofensivo).",
      explain:
        "curl http://docs.tape.nande/ver?archivo=../config/secrets.env hace que el servidor arme public/../config/secrets.env, salga de la carpeta pública y sirva el archivo de configuración. Pedir manual.txt es el uso legítimo; el ../ es lo que convierte el pedido en un ataque.",
    },
    {
      kind: "lab",
      title: "Practicá: leé el archivo de configuración secreto",
      body:
        "Pedile al visor un archivo fuera de su carpeta pública, trepando con ../ hasta config/secrets.env. Como el servidor no encierra la ruta, te lo va a servir.",
      command: "curl \"http://docs.tape.nande/ver?archivo=../config/secrets.env\"",
      explain:
        "El visor te muestra el contenido de config/secrets.env, con DB_PASS=Tap3-r00t y la bandera ND{path_traversal_secreto}. Lo que observás: con ../ saliste de la carpeta pública y leíste un archivo interno. Defensa: normalizar la ruta y rechazar cualquiera que salga de la carpeta permitida (por ejemplo, comprobar que la ruta final siga empezando por public/).",
      diagram: "archivo",
    },
    {
      kind: "quiz",
      prompt: "¿Cómo se defiende un servidor del path traversal?",
      options: [
        "Normalizar la ruta y rechazar la que salga de la carpeta permitida",
        "Usar contraseñas más largas",
        "Cambiar el puerto del servidor web",
        "Mostrar los errores completos al usuario",
      ],
      correct: 0,
      explain:
        "La cura es controlar la ruta: después de resolver los ../, verificar que el archivo final siga DENTRO de la carpeta permitida; si no, rechazar. Nunca confiar en el nombre de archivo que manda el usuario. IDOR y traversal comparten la lección: validar SIEMPRE en el servidor lo que llega en la URL.",
      diagram: "escudo",
    },
    {
      kind: "concept",
      title: "Repaso y ética: la misma raíz",
      body:
        "IDOR y path traversal parecen distintos, pero nacen del mismo error: el servidor confía en un dato de la URL (un id, un nombre de archivo) sin preguntarse '¿esta persona tiene permiso para esto?'. La defensa también es una sola: controlar los permisos y la ruta EN EL SERVIDOR, en cada pedido. Y lo ético: cuando descubrís que podés ver lo ajeno, no lo espiás ni lo compartís; lo reportás con la explicación de cómo arreglarlo.",
      diagram: "escudo",
      bullets: [
        "Raíz común: confiar en un dato de la URL sin verificar permisos.",
        "Defensa común: validar propiedad y ruta en el servidor.",
        "Ético: reportar, no fisgonear ni difundir datos de otros.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 5 — Inyección de comandos y tokens falsos (JWT)             *
 * ------------------------------------------------------------------ */

const WEB_CMDI_JWT: Curso = {
  id: "c-web-cmdi-jwt",
  title: "Inyección de comandos y tokens falsos (JWT)",
  subtitle: "Cuando la web te presta la consola del servidor, y cuando confía en un token que forjaste.",
  level: "avanzado",
  skill: "web",
  hue: 15,
  glyph: "target",
  reward: { xp: 240, coins: 190 },
  slides: [
    {
      kind: "concept",
      title: "Cuando la web te presta la consola del servidor",
      body:
        "Algunas webs, por dentro, ejecutan comandos del sistema operativo. Por ejemplo, una herramienta de 'ping' que corre en el servidor:  ping -c1 <lo que pusiste>. Si el sitio pega tu texto en ese comando sin limpiarlo, podés colar TUS propios comandos. Eso es inyección de comandos, y es de las fallas más graves: te da un pedazo de la consola del servidor.",
      diagram: "inyeccion",
      bullets: [
        "Algunas webs ejecutan comandos del sistema por dentro.",
        "Si pegan tu texto sin limpiarlo, corrés TUS comandos en el servidor.",
      ],
    },
    {
      kind: "concept",
      title: "El fallo: encadenar comandos",
      body:
        "En una consola, podés poner varios comandos seguidos separándolos:\n\n   comando1 ; comando2       (corré uno y después el otro)\n   comando1 && comando2      (corré el segundo si el primero salió bien)\n\nSi el servidor arma  ping -c1 TU_TEXTO  y vos ponés como texto  x; cat flag , queda  ping -c1 x; cat flag : primero hace el ping y DESPUÉS ejecuta tu cat. Ese ; es la llave del ataque.",
      diagram: "inyeccion",
      bullets: [
        "; y && encadenan comandos.",
        "x; cat flag → hace el ping y además lee el archivo flag.",
      ],
    },
    {
      kind: "quiz",
      prompt: "En una inyección de comandos, ¿qué logra un ';' metido en el parámetro?",
      options: [
        "Termina el comando original y arranca el TUYO a continuación",
        "Borra el disco del servidor automáticamente",
        "Cifra la respuesta",
        "Acelera el ping",
      ],
      correct: 0,
      explain:
        "El ';' separa comandos: cierra el que el servidor iba a correr y pega el tuyo detrás. Así, en vez de solo un ping, el servidor ejecuta también tu comando (leer un archivo, ver quién sos con whoami, etc.). Es exactamente lo que hace un shell de verdad.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "El objetivo: tools.pyta.nande",
      body:
        "tools.pyta.nande tiene una utilidad de red en /ping?host=. Por dentro corre  ping -c1 <host>  sin limpiar el host. Adentro del servidor hay un archivo llamado flag. Vos vas a mandar como host algo que, además de pingear, ejecute  cat flag  para leerlo. Con eso demostrás que controlás la consola del servidor.",
      diagram: "inyeccion",
      bullets: [
        "/ping?host= corre ping -c1 <host> sin sanear.",
        "Objetivo: encadenar  cat flag  para leer el archivo secreto.",
      ],
    },
    {
      kind: "build",
      goal: "Armar el valor de 'host' que, además del ping, lea el archivo secreto llamado flag",
      pieces: ["x;", "cat", "flag", "ping", "sudo"],
      answer: ["x;", "cat", "flag"],
      hint: "Poné un host cualquiera (x) y cerralo con ; para encadenar. Después el comando que lee un archivo (cat) y el nombre del archivo (flag).",
      explain:
        "Queda x; cat flag . El servidor arma  ping -c1 x; cat flag : primero pingea x, y por el ; ejecuta después  cat flag , que imprime el contenido del archivo secreto. Colaste tu comando dentro del de la web: eso es inyección de comandos.",
    },
    {
      kind: "lab",
      title: "Practicá: leé el archivo secreto del servidor",
      body:
        "Mandá a la herramienta de ping un host que encadene tu propio comando con ; para leer el archivo flag. Mirá la salida del 'shell' del servidor.",
      command: "curl \"http://tools.pyta.nande/ping?host=x; cat flag\"",
      explain:
        "La salida muestra el ping y, debajo, el contenido de flag: la bandera ND{cmd_injection_pwned}. Lo que observás: tu ';' cortó el comando de la web y ejecutó el tuyo en el servidor. Defensa: NUNCA pasar entrada del usuario a un comando del sistema; usar funciones seguras que reciban el dato aparte (sin shell), y validar con listas de permitidos (solo letras y puntos de un host, por ejemplo).",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "Tokens JWT: cómo la web recuerda quién sos",
      body:
        "Muchas APIs no usan cookies clásicas sino un token JWT (JSON Web Token). Un JWT tiene tres partes separadas por puntos:\n\n   header . payload . firma\n\n• header: dice cómo está firmado (por ej. alg: HS256).\n• payload: tus datos (usuario, rol: cliente o admin).\n• firma: un sello hecho con una clave secreta, que prueba que el token no fue alterado.\n\nEl servidor lee el payload para saber quién sos y qué podés hacer.",
      diagram: "cookie",
      bullets: [
        "JWT = header . payload . firma.",
        "El payload dice tu rol; la firma prueba que nadie lo tocó.",
      ],
    },
    {
      kind: "concept",
      title: "El fallo: confiar en el token sin verificar bien",
      body:
        "El JWT es seguro solo si el servidor verifica la firma con una clave FUERTE. Falla cuando:\n\n• Acepta alg:none: un token que dice 'no tengo firma' y el servidor lo cree igual. Así cualquiera arma un token con rol:admin y entra (api.vortex.nande cae con esto).\n• Usa una clave débil: si la clave secreta es adivinable, la crackeás, re-firmás un token con rol:admin y el servidor te cree.\n\nEn los dos casos, vos forjás un token de administrador que no deberías poder crear.",
      diagram: "cookie",
      bullets: [
        "alg:none → el servidor acepta un token sin firma.",
        "Clave débil → la adivinás y firmás tu propio token de admin.",
      ],
    },
    {
      kind: "quiz",
      prompt: "En un JWT, ¿qué parte prueba que el token no fue alterado?",
      options: [
        "La firma",
        "El header",
        "El payload",
        "Los puntos que separan las partes",
      ],
      correct: 0,
      explain:
        "La firma es un sello hecho con una clave secreta sobre el header y el payload. Si alguien cambia el payload (por ejemplo, pone rol:admin), la firma ya no coincide… salvo que el servidor no la verifique (alg:none) o que la clave sea débil y se pueda re-firmar. Por eso la firma es el corazón de la seguridad del JWT.",
      diagram: "cookie",
    },
    {
      kind: "quiz",
      prompt: "¿Por qué es peligroso que un servidor acepte un JWT con alg:none?",
      options: [
        "Porque acepta el token sin verificar la firma, así cualquiera forja uno con rol:admin",
        "Porque los tokens con alg:none ocupan más memoria",
        "Porque hace la página más lenta",
        "Porque solo funciona con HTTP y no con HTTPS",
      ],
      correct: 0,
      explain:
        "alg:none significa 'este token no viene firmado'. Un servidor que lo acepta está confiando en el payload sin comprobar nada, así que cualquiera arma un token diciendo rol:admin y entra como administrador. La regla: rechazar alg:none y verificar siempre la firma con una clave fuerte.",
      diagram: "cookie",
    },
    {
      kind: "build",
      goal: "Armar el comando que forja un token JWT de administrador",
      pieces: ["jwt", "forge", "nande123", "rol=admin", "usuario=admin", "decode", "rol=cliente"],
      answer: ["jwt", "forge", "nande123", "rol=admin", "usuario=admin"],
      hint: "La herramienta es jwt, la acción para crear un token es forge, después una clave (nande123) y los datos del payload: rol=admin y usuario=admin.",
      explain:
        "jwt forge nande123 rol=admin usuario=admin crea y firma un token nuevo con rol=admin. 'decode' solo LEE un token (no sirve para forjar) y rol=cliente no te da permisos de admin. Forjar un token de admin válido es el golpe: el servidor te creería.",
    },
    {
      kind: "lab",
      title: "Practicá: forjá un token de administrador",
      body:
        "Usá la herramienta jwt para forjar un token con rol=admin. Mirá el token que sale y fijate que la herramienta confirma que es un admin válido.",
      command: "jwt forge nande123 rol=admin usuario=admin",
      explain:
        "La herramienta te devuelve un token firmado con rol=admin y confirma que un servidor le creería: cae la bandera ND{jwt_forged_admin}. Después podés probar un token contra la API real con  curl \"http://api.vortex.nande/panel?token=TU_TOKEN\"  para ver el panel de admin (esa API además acepta alg:none, ND{jwt_alg_none}). Defensa: verificar SIEMPRE la firma con una clave fuerte y secreta, rechazar alg:none, y no confiar en el rol del payload sin comprobar el sello. Ético: forjás para demostrar y reportar la falla, nunca para entrar a sistemas ajenos.",
      diagram: "cookie",
    },
  ],
};

export const WEB_COURSES: Curso[] = [
  WEB_COMO_FUNCIONA,
  WEB_ENUM,
  WEB_SQLI_UNION,
  WEB_SQLMAP,
  WEB_XSS,
  WEB_IDOR_TRAVERSAL,
  WEB_CMDI_JWT,
];
