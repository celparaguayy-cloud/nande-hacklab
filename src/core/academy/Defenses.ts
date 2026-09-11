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
];

/** Busca una defensa por su id. */
export function defenseById(id: string): Defense | undefined {
  return DEFENSES.find((d) => d.id === id);
}
