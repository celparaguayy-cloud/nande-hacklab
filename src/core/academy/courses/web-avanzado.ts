import type { Curso } from "../courseTypes";

/**
 * Módulo "Web avanzado". Vulnerabilidades del lado servidor y de lógica, todas
 * ligadas a apps REALES del motor HTTP (labs3.ts/labs4.ts): LFI y XXE (leer el
 * disco del servidor), SSTI y NoSQL (inyección), deserialización insegura y
 * subida sin restringir (confiar en el cliente), CSRF y race conditions (lógica).
 * Cada lab golpea el mundo del jugador y captura una bandera REAL. Offline.
 */

const WEBADV_LFI: Curso = {
  id: "c-webadv-lfi",
  title: "Leer el disco del servidor: LFI y XXE",
  subtitle: "Cuando una app incluye archivos por su nombre o parsea XML sin cuidado, podés hacer que lea sus propios secretos.",
  level: "avanzado",
  skill: "web",
  hue: 285,
  glyph: "code",
  reward: { xp: 280, coins: 220 },
  slides: [
    {
      kind: "concept",
      title: "Local File Inclusion (LFI)",
      body:
        "Muchas webs arman páginas 'incluyendo' un archivo según un parámetro: ?pg=inicio carga la vista 'inicio'. Si el servidor toma ese nombre y lo incluye SIN confinarlo a una carpeta, podés pedir OTROS archivos con `../` (path traversal): salís del directorio de vistas y llegás a archivos del sistema o a la config con secretos. LFI convierte 'elegí qué página ver' en 'leé cualquier archivo que el servidor pueda leer'. El clásico objetivo es la config (.env, credenciales) o /etc/passwd para confirmar el acceso.",
      diagram: "traversal",
      bullets: [
        "La app incluye un archivo según tu parámetro (?pg=…).",
        "Con ../ salís de la carpeta permitida (path traversal).",
        "Objetivo: config con secretos (.env), /etc/passwd.",
      ],
    },
    {
      kind: "concept",
      title: "De LFI a ejecución (y RFI)",
      body:
        "LFI no siempre se queda en 'leer'. Si podés incluir un archivo que vos controlás con código adentro (una subida, un log donde inyectaste código, un wrapper como php://), el include lo EJECUTA: LFI escala a ejecución remota. La variante RFI (Remote File Inclusion) incluye directamente una URL externa con tu código — más rara hoy, porque las configs suelen bloquear incluir URLs remotas. La lección: 'incluir' es más poderoso que 'leer', y por eso un LFI nunca es 'solo' una fuga de archivos.",
      diagram: "traversal",
      bullets: [
        "Incluir un archivo con código (subida, log, wrapper) = ejecución.",
        "RFI: incluir una URL externa (hoy casi siempre bloqueado).",
        "Un LFI puede escalar a RCE: nunca es 'solo leer'.",
      ],
    },
    {
      kind: "concept",
      title: "XXE: entidades externas en XML",
      body:
        "Si una app recibe XML y su parser resuelve ENTIDADES EXTERNAS, tenés XXE. Definís una entidad que apunta a un archivo del servidor (<!ENTITY x SYSTEM \"file:///etc/secret\">) y la referenciás (&x;): el parser lee ese archivo y lo mete en la respuesta. Es otra vía para leer el disco del servidor, y también sirve para SSRF (file:// → http://interno) o para denegación de servicio (la 'billion laughs'). La defensa es simple y tajante: DESHABILITAR las entidades externas en el parser XML. Casi ningún uso legítimo las necesita.",
      diagram: "archivo",
      bullets: [
        "XML + entidades externas = leer archivos del servidor (file://).",
        "También habilita SSRF y DoS (billion laughs).",
        "Defensa: deshabilitar entidades externas en el parser.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Un portal carga páginas con ?pg=inicio. ¿Qué probás primero para detectar un LFI?",
      options: [
        "Pedir un archivo fuera de la carpeta con ../, por ejemplo ?pg=../config/secretos.env o ?pg=../../etc/passwd",
        "Mandar la contraseña del admin",
        "Apagar el servidor",
        "Cambiar el color de la página",
      ],
      correct: 0,
      explain:
        "La prueba de LFI es intentar salir de la carpeta de vistas con ../ y pedir un archivo que no debería ser accesible. Si el contenido de /etc/passwd o de la config aparece, el include no está confinado: es LFI. A partir de ahí buscás secretos o una vía a ejecución.",
      diagram: "traversal",
    },
    {
      kind: "build",
      goal: "Armar un payload XXE que lea el secreto del servidor /etc/nova/secret",
      pieces: ['<!ENTITY', 'x', 'SYSTEM', '"file:///etc/nova/secret">', '<nota>&x;</nota>', "OR 1=1"],
      answer: ['<!ENTITY', 'x', 'SYSTEM', '"file:///etc/nova/secret">', '<nota>&x;</nota>'],
      hint: "Definís una entidad externa (ENTITY ... SYSTEM file://...) y la referenciás con &x; dentro de la nota.",
      explain:
        "El XML completo sería: <!DOCTYPE r [<!ENTITY x SYSTEM \"file:///etc/nova/secret\">]><nota>&x;</nota>. El parser resuelve &x; leyendo el archivo y lo devuelve en la nota. La defensa: deshabilitar entidades externas. (En ÑANDE el importador de Nova es vulnerable a esto.)",
    },
    {
      kind: "lab",
      title: "Robá la config con un LFI",
      body: "El Portal Nova incluye páginas por nombre sin confinarlas. Salí de la carpeta de vistas con ../ y pedí la config con secretos.",
      command: "curl \"http://portal.nova.nande/?pg=../config/secretos.env\"",
      explain:
        "El portal incluyó la config fuera de su carpeta: capturás ND{lfi_config_incluida} (un ADMIN_TOKEN que no debería leerse). La defensa es confinar el include a una lista blanca de vistas y nunca construir rutas con entrada del usuario.",
      diagram: "traversal",
    },
    {
      kind: "concept",
      title: "Defensa: confinar y deshabilitar",
      body:
        "LFI: nunca construir una ruta de archivo con entrada del usuario; usar una LISTA BLANCA (un mapa de 'inicio' → vista real), y si hay que aceptar nombres, canonicalizar y verificar que la ruta final siga DENTRO de la carpeta permitida. XXE: deshabilitar entidades externas y DTDs en el parser (casi todas las librerías tienen una opción 'secure processing'). Regla común a ambos: el servidor no debe dejar que el usuario elija QUÉ recurso del backend se toca. 'Incluir' y 'parsear' entrada externa son operaciones peligrosas que se blindan por diseño.",
      diagram: "escudo",
      bullets: [
        "LFI: lista blanca de vistas; verificar que la ruta final quede confinada.",
        "XXE: deshabilitar entidades externas y DTDs ('secure processing').",
        "El usuario nunca elige qué recurso del backend se toca.",
      ],
    },
  ],
};

const WEBADV_INYECCION: Curso = {
  id: "c-webadv-ssti-nosql",
  title: "Inyección del lado servidor: SSTI y NoSQL",
  subtitle: "Cuando tu entrada cae en una plantilla del servidor o en una consulta NoSQL, podés ejecutar o saltarte el login.",
  level: "avanzado",
  skill: "web",
  hue: 300,
  glyph: "code",
  reward: { xp: 290, coins: 230 },
  slides: [
    {
      kind: "concept",
      title: "SSTI: inyección en la plantilla",
      body:
        "Las webs arman HTML con PLANTILLAS: texto con huecos que se rellenan ('Hola {{nombre}}'). Si el servidor mete tu entrada DENTRO de la plantilla y después la evalúa (en vez de tratarla como dato), podés inyectar expresiones que el motor ejecuta: es SSTI (Server-Side Template Injection). La prueba clásica es {{7*7}}: si la página devuelve 49, tu texto se está EVALUANDO, no mostrando. Desde ahí se llega al contexto del servidor (variables, config, secretos) y, en muchos motores, a ejecución de comandos.",
      diagram: "cmdi",
      bullets: [
        "Tu entrada cae DENTRO de la plantilla y se evalúa.",
        "Prueba: {{7*7}} → 49 significa que se ejecuta.",
        "Escala a leer el contexto del servidor y a RCE.",
      ],
    },
    {
      kind: "concept",
      title: "NoSQL injection: operadores en vez de datos",
      body:
        "Las bases NoSQL (tipo MongoDB) consultan con OBJETOS, no con texto SQL. Un login arma algo como {usuario:'X', password:'Y'}. Si el servidor acepta que 'Y' sea un OBJETO en vez de un string, le podés mandar un OPERADOR: {\"$ne\": null} significa 'cualquier valor distinto de null', o sea, matchea CUALQUIER contraseña. Resultado: entrás como admin sin saber la clave. No es el ' OR '1'='1 de SQL, pero la idea es la misma: colar lógica donde el programa esperaba un dato.",
      diagram: "inyeccion",
      bullets: [
        "NoSQL consulta con objetos, no con texto SQL.",
        "Mandás un operador ({\"$ne\":null}) en vez de una clave.",
        "Matchea cualquier contraseña → bypass de login.",
      ],
    },
    {
      kind: "quiz",
      prompt: "En una web, escribís {{7*7}} en un campo y la página muestra '49'. ¿Qué descubriste?",
      options: [
        "Un SSTI: tu entrada se evalúa en el servidor, no se trata como texto",
        "Que la web es rápida",
        "Un error de ortografía",
        "Que el campo acepta números",
      ],
      correct: 0,
      explain:
        "Si {{7*7}} devuelve 49, el servidor EVALUÓ tu expresión dentro de la plantilla: eso es SSTI. Un campo seguro mostraría el texto '{{7*7}}' tal cual. A partir de esa prueba, se explora qué motor es y cómo llegar al contexto del servidor o a ejecutar comandos.",
      diagram: "cmdi",
    },
    {
      kind: "lab",
      title: "SSTI: llegá al contexto del servidor",
      body: "El generador de saludos de Codeá mete tu nombre dentro de la plantilla. Pedile el contexto del servidor con una expresión.",
      command: "curl \"http://saludos.codea.nande/?nombre={{config}}\"",
      explain:
        "La plantilla evaluó {{config}} y devolvió el contexto del servidor, con su secreto: capturás ND{ssti_contexto_expuesto}. Primero habrías confirmado con {{7*7}}=49. La defensa: nunca meter entrada del usuario en la plantilla; pasarla como DATO (contexto), no como parte del template.",
      diagram: "cmdi",
    },
    {
      kind: "lab",
      title: "NoSQL: entrá sin la contraseña",
      body: "El login de Redix arma una consulta tipo Mongo con lo que mandás. En vez de una contraseña, mandá un operador. (La clave va URL-encodeada: %7B%22%24ne%22%3Anull%7D es {\"$ne\":null}.)",
      command: "curl \"http://login.redix.nande/entrar?usuario=admin&password=%7B%22%24ne%22%3Anull%7D\"",
      explain:
        "Mandaste el operador {\"$ne\":null} como contraseña: matchea cualquier valor y entrás como admin, capturando ND{nosql_auth_bypass}. La defensa es tratar la contraseña SIEMPRE como string (no parsear objetos del cliente) y validar tipos en el servidor.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "Defensa: separar código de datos (otra vez)",
      body:
        "SSTI y NoSQLi son primos de la SQLi: todos nacen de MEZCLAR código/consulta con datos del usuario. SSTI: renderizá las plantillas con la entrada como CONTEXTO (datos), nunca concatenándola al template; usá sandboxing del motor si evaluás algo. NoSQL: forzá tipos (la contraseña es un string, punto), validá el esquema de entrada, y no aceptes objetos arbitrarios del cliente en una consulta. El patrón universal de defensa contra inyecciones: el dato del usuario es DATO, jamás se convierte en instrucción.",
      diagram: "escudo",
      bullets: [
        "SSTI/NoSQLi/SQLi: todas mezclan código con datos del usuario.",
        "SSTI: entrada como contexto, no concatenada al template.",
        "NoSQL: forzar tipos; el dato del usuario nunca es instrucción.",
      ],
    },
  ],
};

const WEBADV_CONFIANZA: Curso = {
  id: "c-webadv-confianza",
  title: "No confíes en el cliente: deserialización y upload",
  subtitle: "Dos clásicos de confiar en lo que manda el usuario: un objeto de sesión falsificado y una subida que se vuelve webshell.",
  level: "avanzado",
  skill: "web",
  hue: 330,
  glyph: "code",
  reward: { xp: 290, coins: 230 },
  slides: [
    {
      kind: "concept",
      title: "Deserialización insegura",
      body:
        "Muchas apps mandan el estado al cliente serializado (un objeto convertido a texto: base64 de JSON, o formatos binarios) y confían en que vuelva intacto. El error: DESERIALIZAR eso sin validar. Si la sesión es un objeto {rol:'user'} serializado, vos lo decodificás, cambiás a {rol:'admin'}, lo re-serializás y lo mandás: el servidor te trata como admin. En lenguajes con serialización de OBJETOS reales (Java, Python pickle, PHP), es aún peor: un objeto malicioso puede ejecutar código al deserializarse (RCE). Nunca deserialices datos del cliente sin validarlos.",
      diagram: "cookie",
      bullets: [
        "La sesión viaja serializada y el server confía en lo que vuelve.",
        "Cambiás rol:user → rol:admin y re-serializás: sos admin.",
        "En Java/Python/PHP, deserializar objetos puede dar RCE.",
      ],
    },
    {
      kind: "concept",
      title: "Subida de archivos sin restringir",
      body:
        "Un formulario de 'subí tu foto de perfil' que acepta CUALQUIER archivo, sin validar extensión ni contenido, es una puerta a ejecución. Si subís un archivo con código del servidor (.php, .jsp, .py…) y después lográs que el servidor lo EJECUTE (abriéndolo en su ruta), tu código corre en el servidor: es una WEBSHELL. De 'cargá una imagen' pasás a 'ejecuto comandos en el servidor'. Es uno de los caminos más directos a comprometer una web mal configurada.",
      diagram: "payload",
      bullets: [
        "Aceptar cualquier extensión/contenido = riesgo de webshell.",
        "Subís un .php/.jsp y lográs que el server lo ejecute.",
        "'Subí una foto' → ejecución de comandos en el servidor.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Tu sesión es 'eyJyb2wiOiJ1c2VyIn0' (base64 de {\"rol\":\"user\"}). ¿Cómo te volvés admin si el server confía en ella?",
      options: [
        "Decodificás, cambiás rol a 'admin', re-codificás a base64 y mandás esa sesión",
        "Probás contraseñas al azar",
        "Esperás a que te asciendan",
        "No se puede, base64 es cifrado",
      ],
      correct: 0,
      explain:
        "base64 NO es cifrado: es solo una codificación reversible. Decodificás el objeto, editás rol a 'admin', volvés a codificar y lo mandás. Si el servidor deserializa y confía sin verificar una firma, te trata como admin. La cura es firmar el estado (o guardarlo en el servidor), no confiar en lo que vuelve del cliente.",
      diagram: "cookie",
    },
    {
      kind: "lab",
      title: "Falsificá la sesión (deserialización)",
      body: "Redix Sesiones confía en el objeto de sesión que le mandás (base64 de JSON). Mandale una sesión de admin ya armada.",
      command: "curl \"http://cuenta.redix.nande/?sesion=eyJyb2wiOiJhZG1pbiIsInVzdWFyaW8iOiJoYWNrZXIifQ==\"",
      explain:
        "Esa sesión es el base64 de {\"rol\":\"admin\",\"usuario\":\"hacker\"}: el servidor la deserializó y te dio el panel de admin, capturando ND{deserializacion_insegura}. La defensa: firmar el estado (HMAC) o, mejor, guardar la sesión en el servidor y mandar solo un identificador opaco.",
      diagram: "cookie",
    },
    {
      kind: "lab",
      title: "De la subida a la webshell",
      body: "Bytebox acepta cualquier archivo. Subí un 'shell' con extensión ejecutable y después abrilo para que el servidor lo corra. (Dos pasos encadenados.)",
      command: "curl \"http://files.bytebox.nande/subir?nombre=shell.php&contenido=cmd\" && curl \"http://files.bytebox.nande/subidas/shell.php\"",
      explain:
        "Subiste shell.php (sin validación) y al abrirlo el servidor lo EJECUTÓ en vez de servirlo como texto: tu código corrió como www-data y capturaste ND{upload_webshell}. La defensa: lista blanca de extensiones, validar el contenido real (no el nombre), guardar fuera de la raíz web y servir como descarga, nunca ejecutar lo subido.",
      diagram: "payload",
    },
    {
      kind: "concept",
      title: "Defensa: desconfiar por diseño",
      body:
        "El hilo común: TODO lo que viene del cliente es hostil hasta probar lo contrario. Deserialización: no deserialices tipos arbitrarios del cliente; firmá el estado con HMAC o guardalo en el servidor con un id opaco; en Java/Python/PHP, evitá los deserializadores peligrosos o usá listas blancas de clases. Uploads: validá extensión (lista blanca) Y contenido real (magic bytes), renombrá el archivo, guardalo fuera de la raíz web y servilo como adjunto, nunca lo ejecutes. La confianza en el input es la raíz de media web rota.",
      diagram: "escudo",
      bullets: [
        "Deserialización: firmá el estado (HMAC) o guardalo en el servidor.",
        "Uploads: lista blanca de extensión + magic bytes, fuera de la raíz, sin ejecutar.",
        "Todo input del cliente es hostil hasta validarlo.",
      ],
    },
  ],
};

const WEBADV_LOGICA: Curso = {
  id: "c-webadv-logica",
  title: "Fallos de lógica: CSRF y race conditions",
  subtitle: "No toda vuln es una inyección: a veces el bug está en la lógica — una acción sin verificar origen, o una ventana de tiempo.",
  level: "avanzado",
  skill: "web",
  hue: 15,
  glyph: "code",
  reward: { xp: 290, coins: 230 },
  slides: [
    {
      kind: "concept",
      title: "CSRF: te hacen hacer algo sin querer",
      body:
        "Si una acción sensible (transferir plata, cambiar el email) se ejecuta con SOLO la cookie de sesión —sin verificar que la pedí a propósito—, es vulnerable a CSRF (Cross-Site Request Forgery). El navegador manda tu cookie automáticamente a ese sitio, así que una página MALICIOSA puede disparar la petición en tu nombre mientras estás logueado: un formulario oculto, una imagen que apunta a /transferir. Vos ni te enterás. El ataque no roba tu sesión: la USA, aprovechando que el navegador adjunta la cookie solo.",
      diagram: "cookie",
      bullets: [
        "Acción sensible ejecutada con solo la cookie = CSRF.",
        "El navegador manda tu cookie solo: otro sitio dispara la acción.",
        "No roba la sesión: la usa mientras estás logueado.",
      ],
    },
    {
      kind: "concept",
      title: "La defensa del CSRF: probar intención",
      body:
        "La cura del CSRF es exigir una prueba de que la petición vino de TU app, no de un sitio ajeno. El token anti-CSRF: un valor secreto e impredecible que tu página incluye en cada formulario y el servidor verifica; un sitio atacante no lo conoce. Reforzado por las cookies SameSite (que el navegador no mande la cookie en peticiones de otro sitio) y por verificar el origen/referer. Sin alguna de estas, cualquier acción que dependa solo de la cookie está expuesta. Es un bug de diseño, no de código: falta el chequeo de intención.",
      diagram: "cookie",
      bullets: [
        "Token anti-CSRF: secreto impredecible que el atacante no tiene.",
        "Cookies SameSite + verificar origen/referer.",
        "Es un fallo de diseño: falta probar que la acción fue intencional.",
      ],
    },
    {
      kind: "concept",
      title: "Race conditions (TOCTOU)",
      body:
        "Un race condition (condición de carrera) aparece cuando el resultado depende del TIMING de operaciones concurrentes. El patrón clásico es TOCTOU (Time-Of-Check / Time-Of-Use): el servidor CHEQUEA algo ('¿queda saldo del cupón?') y después ACTÚA ('descontalo'), pero entre el chequeo y la acción hay una ventana. Si mandás muchas peticiones A LA VEZ, todas pasan el chequeo (todas ven 'sí hay') antes de que alguna descuente, y todas actúan: canjeás un cupón de un uso muchas veces, retirás plata de más, duplicás un descuento. No se rompe nada técnico: se explota que 'chequear y actuar' no fue ATÓMICO.",
      diagram: "carrera",
      bullets: [
        "TOCTOU: entre chequear y actuar hay una ventana de tiempo.",
        "Muchas peticiones a la vez pasan todas el chequeo antes de descontar.",
        "Resultado: canjear/retirar/duplicar de más.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Un cupón permite 1 uso, pero mandás 10 canjes SIMULTÁNEOS y se canjean los 10. ¿Qué pasó?",
      options: [
        "Una race condition (TOCTOU): las 10 vieron el cupón disponible antes de que alguna lo descontara",
        "El cupón tenía 10 usos de verdad",
        "Se adivinó la contraseña",
        "El servidor es muy rápido",
      ],
      correct: 0,
      explain:
        "Las 10 peticiones leyeron 'queda 1' en paralelo (Time Of Check) y todas canjearon (Time Of Use) antes de que el saldo se actualizara. Es el clásico TOCTOU. La defensa es hacer la operación ATÓMICA: un lock, una transacción, o un decremento condicional en la base que falle si ya no hay saldo.",
      diagram: "carrera",
    },
    {
      kind: "lab",
      title: "Explotá el CSRF del banco",
      body: "La banca móvil de Banco Justicia transfiere con solo la cookie de sesión, sin token. Primero 'logueate' (tomás la cookie) y después disparás la transferencia. (Dos pasos encadenados.)",
      command: "curl \"http://m.banco-justicia.nande/\" && curl \"http://m.banco-justicia.nande/transferir?para=atacante&monto=1000\"",
      explain:
        "La transferencia se ejecutó con solo la cookie, sin token anti-CSRF: capturás ND{csrf_transferencia}. Eso es justo lo que un sitio malicioso podría forzar en tu nombre. La defensa: token anti-CSRF por formulario + cookies SameSite.",
      diagram: "cookie",
    },
    {
      kind: "lab",
      title: "Ganale a la ventana de carrera",
      body: "El cupón de Gulu permite 1 uso, pero el canje no es atómico. Mandá varias peticiones simultáneas y canjeá de más.",
      command: "curl \"http://cupones.gulu.nande/canjear?paralelo=10\"",
      explain:
        "Con 10 peticiones a la vez, todas vieron el cupón disponible y lo canjearon antes de que el saldo bajara: capturás ND{race_condition_toctou} y el saldo queda negativo (se sobregiró). La defensa es atomicidad: locks, transacciones o un decremento condicional que falle si ya no hay stock.",
      diagram: "carrera",
    },
    {
      kind: "concept",
      title: "Los bugs de lógica no los caza un escáner",
      body:
        "CSRF y race conditions enseñan algo clave: las peores vulnerabilidades no siempre son inyecciones que un escáner automático marca. Son fallos de LÓGICA: una acción sin verificar intención, una operación que asume que nadie actúa en paralelo, un flujo de negocio que se puede saltar pasos. Encontrarlos exige entender QUÉ hace la app y preguntarse '¿qué pasa si hago esto dos veces? ¿fuera de orden? ¿desde otro sitio? ¿sin el paso previo?'. Por eso el pentesting manual sigue siendo irremplazable: el criterio humano ve lo que la herramienta no.",
      diagram: "escudo",
      bullets: [
        "Los bugs de lógica no los marca un escáner automático.",
        "Preguntá: ¿y si lo hago 2 veces? ¿fuera de orden? ¿sin el paso previo?",
        "El pentesting manual ve lo que la herramienta no.",
      ],
    },
  ],
};

export const WEB_AVANZADO_COURSES: Curso[] = [
  WEBADV_LFI,
  WEBADV_INYECCION,
  WEBADV_CONFIANZA,
  WEBADV_LOGICA,
];
