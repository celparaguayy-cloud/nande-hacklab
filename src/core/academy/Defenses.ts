/**
 * Defensa (Blue Team) de ÑANDE.
 *
 * Por cada ataque que el juego enseña a EXPLOTAR, acá está su contraparte:
 * cómo se TAPA. Cada ficha muestra el código vulnerable (el mismo tipo de
 * fallo que hay en los laboratorios), el código corregido, por qué el fix
 * funciona y el principio general. Es el complemento indispensable: no se
 * aprende seguridad de verdad solo rompiendo, sino sabiendo defender.
 *
 * El contenido es fijo y declarativo; la app Learn lo muestra en su pestaña
 * "Defensa". Es material de referencia, no un laboratorio ejecutable.
 */

export interface Defense {
  id: string;
  /** Ataque que neutraliza (nombre corto). */
  attack: string;
  /** Emoji para la tarjeta. */
  icon: string;
  /** Referencia OWASP u estándar, si aplica. */
  standard: string;
  /** Riesgo en una línea: qué pierde la víctima si no se defiende. */
  risk: string;
  /** Código con el fallo (como en los labs del juego). */
  vulnerable: string;
  /** Código ya corregido. */
  fixed: string;
  /** Por qué el fix corta el ataque. */
  why: string;
  /** El principio general, para llevarse a cualquier lado. */
  principle: string;
}

export const DEFENSES: Defense[] = [
  {
    id: "d-sqli",
    attack: "Inyección SQL",
    icon: "💉",
    standard: "OWASP A03: Injection",
    risk: "Con un UNION te llevan la tabla de usuarios entera, hashes incluidos.",
    vulnerable:
      "const sql =\n  \"SELECT * FROM usuarios WHERE usuario LIKE '%\" + q + \"%'\";\ndb.query(sql);",
    fixed:
      "const sql =\n  \"SELECT * FROM usuarios WHERE usuario LIKE ?\";\ndb.query(sql, ['%' + q + '%']); // parámetro, no concatenación",
    why:
      "Con consultas parametrizadas, el texto del usuario viaja como DATO, nunca como parte del código SQL. Aunque escriba \"' UNION SELECT ...\", el motor lo trata como un valor a buscar, no como una instrucción.",
    principle:
      "Nunca armes una consulta pegando texto del usuario. Usá siempre prepared statements / parámetros.",
  },
  {
    id: "d-hash",
    attack: "Hashes débiles",
    icon: "🧂",
    standard: "OWASP A02: Cryptographic Failures",
    risk: "Un MD5 sin sal cae con un diccionario en milisegundos.",
    vulnerable:
      "// guardar contraseña\nuser.password = md5(plaintext); // rápido y sin sal = crackeable",
    fixed:
      "// guardar contraseña\nuser.password = await bcrypt.hash(plaintext, 12);\n// lento + sal única por usuario = inviable de crackear en masa",
    why:
      "bcrypt (o scrypt/argon2) es LENTO a propósito y agrega una SAL única a cada contraseña. Eso rompe las tablas rainbow y hace que probar diccionario cueste años, no segundos. MD5/SHA-1 fueron diseñados para ser rápidos: pésimos para contraseñas.",
    principle:
      "Contraseñas: algoritmo lento y con sal (bcrypt/argon2/scrypt). Nunca MD5, SHA-1 ni SHA-256 pelado.",
  },
  {
    id: "d-jwt",
    attack: "Forjado de JWT",
    icon: "🎫",
    standard: "OWASP A07: Identification & Auth Failures",
    risk: "Cambian el payload a rol admin y firman el token ellos mismos.",
    vulnerable:
      "// verificar token\nconst payload = jwt.decode(token); // ¡solo DECODIFICA, no verifica!\nif (payload.rol === 'admin') { /* acceso */ }",
    fixed:
      "const payload = jwt.verify(token, SECRETO, {\n  algorithms: ['HS256'] // fijá el algoritmo: no aceptes 'none'\n});\nif (payload.rol === 'admin') { /* acceso */ }",
    why:
      "decode() solo lee el token; no comprueba la firma, así que cualquiera puede inventar uno. verify() recalcula la firma con tu secreto y la compara. Fijar el algoritmo evita el clásico truco de mandar alg:none o cambiar HS256 por RS256.",
    principle:
      "Un JWT sin verificar la firma no vale nada. Verificá siempre, y fijá el algoritmo permitido.",
  },
  {
    id: "d-idor",
    attack: "IDOR",
    icon: "🔢",
    standard: "OWASP A01: Broken Access Control",
    risk: "Cambian un id en la URL y ven la factura, el álbum o el perfil de otro.",
    vulnerable:
      "app.get('/factura/:id', (req) => {\n  return db.factura(req.params.id); // ¿es tuya? nadie lo chequea\n});",
    fixed:
      "app.get('/factura/:id', (req) => {\n  const f = db.factura(req.params.id);\n  if (f.dueño !== req.usuario.id) return http403();\n  return f;\n});",
    why:
      "El fallo no es mostrar el dato: es no comprobar que el que lo pide tenga derecho a verlo. Se valida la AUTORIZACIÓN en el servidor por cada recurso, comparando el dueño del objeto contra el usuario de la sesión.",
    principle:
      "Autenticar dice quién sos; autorizar dice qué podés ver. Chequeá el dueño de cada objeto en el servidor.",
  },
  {
    id: "d-xss",
    attack: "XSS",
    icon: "📜",
    standard: "OWASP A03: Injection",
    risk: "Inyectan <script> y roban la sesión de quien mire la página.",
    vulnerable:
      "el.innerHTML = 'Hola ' + nombre; // si nombre trae <script>, se ejecuta",
    fixed:
      "el.textContent = 'Hola ' + nombre; // texto, nunca HTML\n// + cabecera: Content-Security-Policy: default-src 'self'",
    why:
      "textContent inserta el valor como TEXTO plano, así que un <script> se muestra en vez de ejecutarse. La CSP es la segunda barrera: aunque se cuele algo, el navegador se niega a correr scripts que no sean del propio sitio.",
    principle:
      "Escapá/encodeá toda salida según el contexto (HTML, atributo, JS). Sumá una CSP como red de seguridad.",
  },
  {
    id: "d-traversal",
    attack: "Path traversal",
    icon: "📂",
    standard: "OWASP A01: Broken Access Control",
    risk: "Con ../../ se salen de la carpeta pública y leen /etc/passwd o tus secretos.",
    vulnerable:
      "const file = './publico/' + req.query.f;\nreturn read(file); // f = '../../config/secreto' se escapa",
    fixed:
      "const base = resolve('./publico');\nconst file = resolve(base, req.query.f);\nif (!file.startsWith(base + sep)) return http403();\nreturn read(file);",
    why:
      "Se resuelve la ruta final a su forma absoluta (colapsando los ../) y se verifica que siga DENTRO de la carpeta permitida. Si el resultado se sale de la base, se rechaza. Mejor aún: no aceptar nombres de archivo del usuario y usar un id de un listado.",
    principle:
      "Normalizá la ruta y confiná el acceso a un directorio base. No confíes en nombres de archivo del usuario.",
  },
  {
    id: "d-cmdi",
    attack: "Inyección de comandos",
    icon: "⚙️",
    standard: "OWASP A03: Injection",
    risk: "Un ; rm -rf en un campo y corren lo que quieran en tu servidor.",
    vulnerable:
      "exec('ping -c1 ' + host); // host = '8.8.8.8; whoami' corre whoami",
    fixed:
      "execFile('ping', ['-c1', host]); // sin shell: host es UN argumento\n// + validar: /^[a-z0-9.-]+$/.test(host)",
    why:
      "El problema es pasar por una SHELL, que interpreta ; | && $(). Con execFile (o spawn) sin shell, el input es un único argumento literal del programa, no una orden nueva. Sumá una lista blanca de caracteres válidos.",
    principle:
      "Evitá la shell: pasá argumentos como lista. Si no hay más remedio, validá con lista blanca estricta.",
  },
  {
    id: "d-authz-panel",
    attack: "Toma de cuenta / panel sin control",
    icon: "🔐",
    standard: "OWASP A01: Broken Access Control",
    risk: "Adivinan/roban la clave del dueño y entran a su panel privado.",
    vulnerable:
      "if (req.body.password === user.password) abrirPanel();\n// clave reusada + sin límite de intentos = entran solos",
    fixed:
      "if (await bcrypt.compare(req.body.password, user.hash)\n    && rateLimit.ok(req.ip)) abrirPanel();\n// + MFA (segundo factor) para paneles sensibles",
    why:
      "Tres capas: hash lento (no texto plano), límite de intentos (frena el diccionario en vivo) y un segundo factor (aunque sepan la clave, no alcanza). Cada una sola ayuda; juntas, cierran la puerta.",
    principle:
      "Defensa en profundidad: hash fuerte + rate limiting + MFA. Nunca una sola barrera.",
  },
  {
    id: "d-bruteforce",
    attack: "Fuerza bruta / credential stuffing",
    icon: "🔁",
    standard: "OWASP A07: Identification & Auth Failures",
    risk: "Prueban miles de claves (o filtradas de otro lado) hasta pegar una.",
    vulnerable:
      "function login(u, p) { return check(u, p); } // intentos infinitos",
    fixed:
      "if (fails(u) > 5) return demora(); // backoff / captcha\nawait sleep(200); // costo por intento\nlog(intento); // para detectar el patrón",
    why:
      "Cada intento debe COSTAR: demora creciente, captcha tras N fallos, bloqueo temporal. Y hay que registrar los intentos para que el Blue Team detecte el patrón. La reutilización de contraseñas es por qué el stuffing funciona: educá a usar claves únicas.",
    principle:
      "Hacé caro cada intento (rate limit, backoff, captcha) y alertá por patrones anómalos.",
  },
  {
    id: "d-osint",
    attack: "Ingeniería social / OSINT",
    icon: "🕵️",
    standard: "Factor humano",
    risk: "La gente filtra su mascota, su cumple o su clave en redes, y con eso entran.",
    vulnerable:
      "// pregunta de seguridad: '¿nombre de tu mascota?'\n// respuesta pública en el perfil de la persona",
    fixed:
      "// no usar datos adivinables como factor\n// MFA por app/hardware · concientización · menos exposición pública",
    why:
      "La tecnología no tapa lo que la persona regala. Las 'preguntas de seguridad' basadas en datos públicos son un colador. La defensa es humana + MFA real: educar qué no publicar y no depender de secretos que se pueden googlear.",
    principle:
      "El eslabón más débil suele ser humano. Concientización + MFA que no dependa de datos públicos.",
  },
  {
    id: "d-ssrf",
    attack: "SSRF",
    icon: "🌐",
    standard: "OWASP A10: Server-Side Request Forgery",
    risk: "El servidor trae URLs internas por vos: metadata de la nube, panels de localhost.",
    vulnerable:
      "const r = await httpGet(req.query.url); // trae CUALQUIER destino",
    fixed:
      "const u = new URL(req.query.url);\n" +
      "if (!listaBlanca.includes(u.hostname)) return http400();\n" +
      "if (esIPPrivada(u.hostname)) return http400(); // bloquear 169.254/10/127",
    why:
      "Se valida el destino contra una lista blanca y se bloquean rangos internos (link-local 169.254, privados 10/172/192.168, loopback 127). Así el servidor no puede ser usado para alcanzar lo que vos no ves.",
    principle:
      "No dejes que el server pida URLs arbitrarias. Lista blanca de destinos y bloqueo de IPs internas.",
  },
  {
    id: "d-csrf",
    attack: "CSRF",
    icon: "🎭",
    standard: "OWASP A01: Broken Access Control",
    risk: "Otro sitio fuerza acciones en tu nombre usando tu cookie de sesión.",
    vulnerable:
      "app.post('/transferir', (req) => hacer(req.body)); // solo la cookie",
    fixed:
      "if (req.body.csrf !== sesion.csrfToken) return http403();\n" +
      "// + cookies SameSite=Strict/Lax  + verificar Origin",
    why:
      "Un token anti-CSRF impredecible, atado a la sesión, que un sitio ajeno no puede conocer. Sumá cookies SameSite (no se envían en peticiones de otro sitio) y verificá la cabecera Origin.",
    principle:
      "Toda acción que cambie estado necesita token anti-CSRF + cookies SameSite.",
  },
  {
    id: "d-lfi",
    attack: "LFI / inclusión de archivos",
    icon: "🗂️",
    standard: "OWASP A03: Injection",
    risk: "Con ?pg=../../ el sitio incluye archivos del sistema y su config.",
    vulnerable:
      "include('./vistas/' + req.query.pg); // ../ escapa la carpeta",
    fixed:
      "const vistas = { inicio, contacto }; // mapa fijo\n" +
      "return vistas[req.query.pg] ?? http404(); // sin nombres del usuario",
    why:
      "En vez de construir la ruta con texto del usuario, se elige de un conjunto CERRADO de vistas permitidas. Si el nombre no está en el mapa, no hay inclusión posible. Nunca pases input del usuario a include/require.",
    principle:
      "No incluyas archivos por un nombre que venga del usuario. Usá un mapa fijo de vistas válidas.",
  },
  {
    id: "d-upload",
    attack: "Subida sin restringir",
    icon: "📤",
    standard: "OWASP A05: Security Misconfiguration",
    risk: "Suben un shell.php y lo ejecutan: control total del servidor.",
    vulnerable:
      "guardar(req.file.name, req.file.data); // cualquier extensión, en la web root",
    fixed:
      "if (!['png','jpg','pdf'].includes(ext)) return http400();\n" +
      "const nombre = uuid() + '.' + ext; // renombrar\n" +
      "guardarFuera De La WebRoot(nombre); // y servir sin ejecutar",
    why:
      "Lista blanca de extensiones, renombrar el archivo (que el atacante no elija el nombre/ruta), guardarlo fuera de la carpeta pública y servirlo como descarga, nunca ejecutable. Validar el contenido real, no solo la extensión.",
    principle:
      "Lista blanca de tipos, renombrar, guardar fuera de la web root y servir sin ejecutar.",
  },
  {
    id: "d-deserial",
    attack: "Deserialización insegura",
    icon: "📦",
    standard: "OWASP A08: Software & Data Integrity Failures",
    risk: "Un objeto de sesión manipulado te convierte en admin (o ejecuta código).",
    vulnerable:
      "const sesion = deserializar(cookie); // confía en el objeto del cliente",
    fixed:
      "// no guardes estado sensible del lado del cliente;\n" +
      "// si hace falta, firmá el token (HMAC) y verificá antes de usar\n" +
      "if (!hmacOk(cookie, SECRETO)) return http401();",
    why:
      "El rol y los permisos se resuelven en el SERVIDOR, no se confían a un objeto que manda el cliente. Si algo tiene que viajar, se firma (HMAC) y se verifica la firma antes de deserializar. Nunca deserialices formatos que permitan instanciar clases arbitrarias con datos no confiables.",
    principle:
      "No confíes en datos serializados del cliente. Estado sensible en el servidor; si viaja, firmalo.",
  },
  {
    id: "d-redirect",
    attack: "Open redirect",
    icon: "↪️",
    standard: "OWASP A01: Broken Access Control",
    risk: "Un enlace de tu dominio manda a la víctima a un sitio de phishing.",
    vulnerable:
      "res.redirect(req.query.next); // a cualquier lado",
    fixed:
      "const destinos = { inicio: '/', perfil: '/perfil' };\n" +
      "res.redirect(destinos[req.query.next] ?? '/'); // solo rutas internas",
    why:
      "Se redirige solo a destinos de una lista conocida (o a rutas relativas del propio sitio), nunca a una URL absoluta que venga del usuario. Así tu dominio no se puede usar para disfrazar un enlace malicioso.",
    principle:
      "Redirigí solo a destinos de una lista propia. Nunca a una URL que venga del usuario.",
  },
  {
    id: "d-ssti",
    attack: "SSTI (Server-Side Template Injection)",
    icon: "🧩",
    standard: "OWASP A03: Injection",
    risk: "Meter {{7*7}} y que devuelva 49 significa que ejecutan código en el server.",
    vulnerable:
      "render('Hola ' + nombre + '!'); // el nombre entra a la plantilla",
    fixed:
      "render('Hola {{ nombre }}!', { nombre }); // datos por contexto, no en el template",
    why:
      "El input del usuario va como DATO que la plantilla interpola, nunca como parte del codigo de la plantilla. Asi {{7*7}} se muestra tal cual en vez de evaluarse. Usa auto-escape y no construyas plantillas concatenando input.",
    principle:
      "Nunca metas input del usuario en el CODIGO de la plantilla. Pasalo como variable de contexto.",
  },
  {
    id: "d-xxe",
    attack: "XXE (XML External Entity)",
    icon: "📰",
    standard: "OWASP A05: Security Misconfiguration",
    risk: "Un XML con entidades externas hace que el server lea sus propios archivos.",
    vulnerable:
      "parseXML(body); // parser con entidades externas habilitadas",
    fixed:
      "parseXML(body, {\n" +
      "  resolveExternalEntities: false, // desactivar entidades\n" +
      "  dtd: false                       // y el DOCTYPE\n" +
      "});",
    why:
      "El fallo es que el parser resuelve <!ENTITY ... SYSTEM 'file://'>. Se desactivan las entidades externas y la carga de DTD (o se usa un formato como JSON que no las tiene). La mayoria de las librerias traen esa opcion; hay que apagarla explicitamente.",
    principle:
      "Desactiva entidades externas y DTD en el parser XML. Mejor aun: usa JSON.",
  },
  {
    id: "d-nosql",
    attack: "Inyeccion NoSQL",
    icon: "🍃",
    standard: "OWASP A03: Injection",
    risk: "Un operador $ne:null en el login matchea cualquier usuario y entra.",
    vulnerable:
      "db.users.findOne({ usuario, password }); // password puede ser un objeto",
    fixed:
      "if (typeof password !== 'string') return http400();\n" +
      "db.users.findOne({ usuario, password }); // forzar tipos string",
    why:
      "El problema es aceptar un OBJETO donde esperabas un string: {$ne:null} se convierte en un operador de consulta. Se valida que cada campo sea del tipo esperado (string), y no se pasan objetos crudos del usuario a la query.",
    principle:
      "Valida el TIPO de cada campo antes de la consulta. No pases objetos del usuario al motor.",
  },
  {
    id: "d-race",
    attack: "Condicion de carrera (TOCTOU)",
    icon: "⏱️",
    standard: "OWASP A04: Insecure Design",
    risk: "Peticiones simultaneas explotan la ventana entre chequear y usar (canjear de mas).",
    vulnerable:
      "if (cupon.usos > 0) { hacer(); cupon.usos--; } // check y act separados",
    fixed:
      "const r = db.update({ id, usos: { $gt: 0 } }, { $inc: { usos: -1 } });\n" +
      "if (r.modified === 0) return sinSaldo(); // operacion atomica: solo uno gana",
    why:
      "Se hace el chequeo y el descuento en UNA sola operacion atomica (un update condicional en la base, o un lock/transaccion). Asi dos peticiones no pueden ver ambas el cupon disponible: solo una gana.",
    principle:
      "Chequear-y-usar debe ser atomico: update condicional, transaccion o lock. Nunca en dos pasos.",
  },
  {
    id: "d-sniffing",
    attack: "Sniffing de trafico",
    icon: "👂",
    standard: "OWASP A02: Cryptographic Failures",
    risk: "En la misma red, alguien lee tus usuarios y contrasenas si viajan sin cifrar.",
    vulnerable:
      "POST http://api.interno/login  (HTTP plano: user y pass visibles)",
    fixed:
      "POST https://api.interno/login  // TLS en TODO, incluida la red interna\n" +
      "// + HSTS para forzar https",
    why:
      "Cifrando el trafico (TLS/HTTPS, SSH), capturarlo no sirve: el sniffer solo ve datos ilegibles. El error clasico es confiar en que la red interna es segura y dejar HTTP plano ahi.",
    principle:
      "Cifra TODO el trafico, tambien el interno. Un sniffer no debe poder leer nada util.",
  },
  {
    id: "d-mitm",
    attack: "Man-in-the-middle (ARP spoofing)",
    icon: "🕴️",
    standard: "OWASP A02: Cryptographic Failures",
    risk: "Un atacante se pone entre vos y el router y ve/altera todo tu trafico.",
    vulnerable:
      "// confiar en la red local + sesiones sin cifrar",
    fixed:
      "// TLS extremo a extremo (el MITM ve solo cifrado)\n" +
      "// + ARP estatico en equipos criticos + Dynamic ARP Inspection en el switch",
    why:
      "Aunque el atacante intercepte el trafico, con TLS no puede leerlo ni modificarlo sin romper la validacion del certificado. En la red, ARP estatico y DAI evitan el envenenamiento de la tabla ARP.",
    principle:
      "Cifrado extremo a extremo + defensas de red (ARP estatico, DAI). No confies en la LAN.",
  },
  {
    id: "d-wifi",
    attack: "Crackeo de WiFi (WPA)",
    icon: "📶",
    standard: "Seguridad inalambrica",
    risk: "Una clave WiFi comun o corta cae con diccionario en segundos.",
    vulnerable:
      "SSID: Casa   clave: invitado   (palabra de diccionario)",
    fixed:
      "clave larga y aleatoria (16+ chars) + WPA3\n" +
      "// en empresa: WPA2/3-Enterprise (802.1X) con credenciales por usuario",
    why:
      "El crackeo del handshake es offline: no se detecta y se puede probar millones de claves. La unica defensa es que la clave NO este en ningun diccionario: larga, aleatoria y unica. WPA3 y 802.1X suben mucho la vara.",
    principle:
      "Clave WiFi larga, aleatoria y unica. WPA3, y en empresa 802.1X por usuario.",
  },
  {
    id: "d-pivot",
    attack: "Movimiento lateral / pivoting",
    icon: "🔀",
    standard: "OWASP A04: Insecure Design",
    risk: "Tomar UNA maquina expuesta les abre toda la red interna detras.",
    vulnerable:
      "// red plana: si entran a un host, alcanzan todos los demas",
    fixed:
      "// segmentacion: VLANs + firewalls internos entre segmentos\n" +
      "// + minimo privilegio y monitoreo lateral (EDR/NDR)",
    why:
      "Con la red segmentada, comprometer un host no da acceso al resto: hay firewalls internos que cortan el pivote. Sumado a monitoreo del trafico lateral, el movimiento se detecta y se frena. Una red plana convierte una brecha chica en total.",
    principle:
      "Segmenta la red y monitorea el trafico lateral. Una brecha no debe volverse total.",
  },
];

/** Busca una defensa por su id. */
export function defenseById(id: string): Defense | undefined {
  return DEFENSES.find((d) => d.id === id);
}
