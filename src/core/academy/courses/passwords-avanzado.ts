import type { Curso } from "../courseTypes";

/**
 * Módulo "Cracking y autenticación avanzada". Profundiza el ataque a
 * contraseñas más allá del nivel introductorio, ligado a herramientas reales:
 * hashid (identificar), hashcat/john (crackear) e hydra (ataque online). Enseña
 * la teoría real (hashing, sal, hashes lentos) y las técnicas modernas
 * (reglas, máscaras, spraying, credential stuffing) y defensas (passkeys/MFA).
 */

const PASS_CRACKING: Curso = {
  id: "c-pass-cracking",
  title: "Cracking moderno: diccionario, reglas y máscaras",
  subtitle: "Un hash no se 'descifra': se adivina rápido. Diccionario, fuerza bruta, máscaras y reglas, y por qué la GPU lo cambió todo.",
  level: "avanzado",
  skill: "pentesting",
  hue: 30,
  glyph: "flame",
  reward: { xp: 290, coins: 230 },
  slides: [
    {
      kind: "concept",
      title: "Crackear es adivinar, no descifrar",
      body:
        "Un hash es una función de UNA sola vía: de la contraseña sale el hash, pero del hash NO se puede volver a la contraseña. Entonces, ¿cómo se 'crackea'? Adivinando: probás una candidata, la hasheás con el mismo algoritmo y comparás. Si el hash coincide, esa era la contraseña. 'Crackear' no es revertir matemáticamente nada: es probar MUCHAS candidatas por segundo hasta pegarle. Por eso todo depende de dos cosas: cuántas pruebas por segundo podés hacer, y qué tan inteligente es tu lista de candidatas.",
      diagram: "crackhash",
      bullets: [
        "El hash es de una vía: no se revierte, se ADIVINA.",
        "Probás candidata → hasheás → comparás.",
        "Todo depende de velocidad × calidad de las candidatas.",
      ],
    },
    {
      kind: "concept",
      title: "Los cinco ataques que importan",
      body:
        "No se adivina 'al azar'. (1) DICCIONARIO: probás una lista de claves conocidas (rockyou.txt, 14 millones de contraseñas reales filtradas). (2) FUERZA BRUTA: todas las combinaciones posibles (solo sirve para claves cortas). (3) MÁSCARA: fuerza bruta DIRIGIDA por un patrón (ej. una mayúscula, cuatro minúsculas, dos dígitos: así escribe la gente). (4) REGLAS: tomás el diccionario y lo MUTÁS (girasol → Girasol, Gir4sol, girasol2024, girasol!). (5) HÍBRIDO: diccionario + máscara pegados. Las reglas y las máscaras son lo que separa a un pro de alguien que 'prueba rockyou y se rinde'.",
      diagram: "fuerzabruta",
      bullets: [
        "Diccionario (rockyou), fuerza bruta, máscara, reglas, híbrido.",
        "Máscara = fuerza bruta guiada por cómo escribe la gente.",
        "Reglas = mutar el diccionario (mayúsculas, leet, años, símbolos).",
      ],
    },
    {
      kind: "concept",
      title: "Por qué la GPU lo cambió todo",
      body:
        "Crackear es paralelizable: cada candidata es independiente. Una GPU tiene miles de núcleos, así que prueba MILES DE MILLONES de hashes por segundo para algoritmos rápidos como MD5 o SHA1. Lo que en CPU tardaría años, en una buena GPU (o una granja en la nube) tarda horas. Por eso un MD5 'sin sal' de una contraseña humana se considera roto de entrada: no importa cuán 'complicada' parezca, la velocidad la alcanza. La defensa no es una clave más rara: es usar un hash LENTO (lo vemos en el curso de almacenamiento).",
      diagram: "crackhash",
      bullets: [
        "El cracking es paralelo: la GPU prueba miles de millones/seg.",
        "MD5/SHA1 son rápidos → caen rápido, por 'complicada' que sea la clave.",
        "La defensa real es un hash LENTO, no una clave más exótica.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Sospechás que la clave es una palabra común con una mayúscula al inicio y un año al final (tipo 'Verano2024'). ¿Qué ataque es el más eficiente?",
      options: [
        "Diccionario + reglas (o un ataque híbrido con máscara de año al final)",
        "Fuerza bruta pura de todas las combinaciones",
        "Probar una sola clave al azar",
        "Ninguno: eso es imposible de crackear",
      ],
      correct: 0,
      explain:
        "'Verano2024' es una palabra del diccionario mutada con una regla (mayúscula) y una máscara (cuatro dígitos de año). Un ataque híbrido o de reglas la encuentra en segundos. La fuerza bruta pura sería un desperdicio enorme. Pensar cómo escribe la gente es el 90% del cracking eficiente.",
      diagram: "fuerzabruta",
    },
    {
      kind: "build",
      goal: "Armar un ataque de diccionario con hashcat sobre un hash MD5 usando rockyou",
      pieces: ["hashcat", "-m", "0", "<hash>", "-w", "rockyou.txt", "--brute"],
      answer: ["hashcat", "-m", "0", "<hash>", "-w", "rockyou.txt"],
      hint: "hashcat necesita el MODO del hash (-m 0 es MD5), el hash objetivo y el diccionario (-w rockyou.txt).",
      explain:
        "`hashcat -m 0 <hash> -w rockyou.txt` prueba cada clave de rockyou contra el hash MD5 (-m 0). El modo (-m) le dice a hashcat QUÉ algoritmo es; por eso primero se identifica el hash con hashid. Un modo equivocado no crackea nada aunque la clave esté en la lista.",
    },
    {
      kind: "lab",
      title: "Paso 1: identificá el tipo de hash",
      body: "Antes de crackear, hay que saber QUÉ es. Identificá este hash filtrado y fijate qué algoritmo propone.",
      command: "hashid 2ab96390c7dbe3439de74d0c9b0b1767",
      explain:
        "hashid analiza la longitud y la forma (32 caracteres hex → MD5) y te sugiere el tipo. Esto define el `-m` de hashcat: sin el modo correcto, el ataque no sirve. Identificar primero es el paso que los principiantes se saltan y por eso 'no les funciona'.",
      diagram: "hash",
    },
    {
      kind: "lab",
      title: "Paso 2: crackealo con diccionario",
      body: "Ya sabés que es MD5. Lanzá hashcat con rockyou y recuperá la contraseña original.",
      command: "hashcat -m 0 2ab96390c7dbe3439de74d0c9b0b1767 -w rockyou.txt",
      explain:
        "hashcat probó rockyou contra el hash y lo rompió: eso captura ND{hash_crackeado}. La clave estaba en la lista de claves filtradas reales. La lección doble: identificá el tipo primero (hashid), y entendé que una clave que ya apareció en una brecha NO es secreta, aunque te parezca original.",
      diagram: "crackhash",
    },
    {
      kind: "concept",
      title: "Reglas y máscaras en detalle",
      body:
        "Para subir de nivel: las REGLAS son transformaciones que hashcat aplica a cada palabra del diccionario (capitalizar, invertir, leet-speak, agregar años/símbolos). El set 'best64' es un clásico que cubre las mutaciones más comunes de un saque. Las MÁSCARAS describen un patrón con placeholders: ?u = mayúscula, ?l = minúscula, ?d = dígito, ?s = símbolo. '?u?l?l?l?l?d?d?d?d' prueba exactamente 'Xxxxx9999' (una mayúscula, cuatro minúsculas, cuatro dígitos). Combinar diccionario + reglas + máscaras dirigidas es cómo se crackean en la práctica las claves que 'parecen fuertes' pero siguen un patrón humano.",
      diagram: "crackhash",
      bullets: [
        "Reglas: mutan el diccionario (best64 cubre lo común).",
        "Máscaras: ?u mayúscula · ?l minúscula · ?d dígito · ?s símbolo.",
        "Diccionario + reglas + máscara = el cracking real, dirigido.",
      ],
    },
  ],
};

const PASS_ALMACENAMIENTO: Curso = {
  id: "c-pass-almacenamiento",
  title: "Cómo se guardan (y por qué se rompen)",
  subtitle: "Hashing vs cifrado, la sal, los hashes lentos (bcrypt/argon2) y por qué un MD5 sin sal es una invitación abierta.",
  level: "avanzado",
  skill: "pentesting",
  hue: 200,
  glyph: "gem",
  reward: { xp: 280, coins: 220 },
  slides: [
    {
      kind: "concept",
      title: "Hashing no es cifrado",
      body:
        "Error conceptual gravísimo y común: 'las contraseñas se guardan cifradas'. NO. Se guardan HASHEADAS, y es una diferencia enorme. El cifrado es REVERSIBLE: con la clave, recuperás el original (sirve para datos que necesitás leer después). El hashing es de UNA VÍA: no hay forma de volver atrás. Las contraseñas se hashean justamente para que, si roban la base, el atacante NO tenga las claves en claro, solo hashes que debe crackear. Si un sistema puede MOSTRARTE tu contraseña actual, la está guardando mal (reversible): huí.",
      diagram: "hash",
      bullets: [
        "Cifrado = reversible (con clave recuperás el original).",
        "Hashing = una vía (no se vuelve atrás).",
        "Si una app te muestra tu clave actual, la guarda mal.",
      ],
    },
    {
      kind: "concept",
      title: "La sal: muerte a las rainbow tables",
      body:
        "Si todos hashean 'girasol' igual, un atacante precalcula una tabla gigante (rainbow table) de hash→clave y rompe millones de cuentas de una. La SAL lo evita: es un valor aleatorio ÚNICO por usuario que se mezcla con la contraseña antes de hashear. Así, dos personas con la misma clave tienen hashes DISTINTOS, las tablas precalculadas no sirven, y el atacante debe crackear cada hash por separado. La sal no se oculta (se guarda al lado del hash); su trabajo no es ser secreta, sino hacer único cada hash.",
      diagram: "hash",
      bullets: [
        "Sin sal: misma clave = mismo hash → rainbow tables rompen todo.",
        "Sal = valor aleatorio único por usuario, mezclado antes de hashear.",
        "No es secreta: su trabajo es volver único cada hash.",
      ],
    },
    {
      kind: "concept",
      title: "Hashes LENTOS a propósito",
      body:
        "Acá está la clave moderna. MD5 y SHA son RÁPIDOS (se diseñaron para serlo), y eso los vuelve pésimos para contraseñas: la GPU prueba miles de millones por segundo. Los algoritmos para contraseñas son LENTOS A PROPÓSITO: bcrypt, scrypt y Argon2 tienen un 'factor de trabajo' ajustable que los hace costosos de calcular. Para vos, loguearte, tardar 0,2s no se nota; para un atacante que debe probar miles de millones, lo vuelve inviable. Argon2id (ganador de la competencia de hashing de contraseñas, 2015) es el recomendado hoy; también usa memoria para frustrar a las GPU.",
      diagram: "hash",
      bullets: [
        "MD5/SHA son rápidos → malos para contraseñas.",
        "bcrypt/scrypt/Argon2: lentos a propósito (factor de trabajo).",
        "Argon2id es el recomendado hoy (y usa memoria contra GPU).",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué guardar contraseñas como MD5 sin sal es tan peligroso?",
      options: [
        "Porque MD5 es rapidísimo (crackeo masivo por GPU) y sin sal las rainbow tables rompen todo de una",
        "Porque MD5 ocupa mucho espacio",
        "Porque MD5 es ilegal",
        "No es peligroso, MD5 está bien para contraseñas",
      ],
      correct: 0,
      explain:
        "Dos fallas sumadas: MD5 es rápido (la GPU prueba miles de millones/seg) y sin sal permite rainbow tables precalculadas que rompen muchas cuentas a la vez. La combinación es letal. La cura es sal única + un hash LENTO como Argon2id o bcrypt.",
      diagram: "hash",
    },
    {
      kind: "lab",
      title: "Identificá cómo está guardado",
      body: "Lo primero ante un hash filtrado es saber qué algoritmo es: eso te dice qué tan difícil será y cómo atacarlo.",
      command: "hashid 2ab96390c7dbe3439de74d0c9b0b1767",
      explain:
        "hashid reconoce la forma (32 hex → MD5). Que sea MD5 ya te anticipa que va a caer rápido. Si en cambio vieras un hash con prefijo '$2b$' (bcrypt) o '$argon2id$', sabrías que estás ante un hash LENTO: mucho más caro de crackear, justamente lo que buscás como defensor.",
      diagram: "hash",
    },
    {
      kind: "concept",
      title: "Brechas y credential stuffing",
      body:
        "Cuando se filtra una base, los hashes crackeados (y las claves que ya venían en claro) se suman a listas que circulan. El ataque que sigue es el CREDENTIAL STUFFING: probar esos pares usuario/clave en OTROS sitios, porque la gente reutiliza contraseñas. No hace falta crackear nada: se reusan credenciales reales. Por eso dos reglas de oro para el usuario: NO reutilizar contraseñas (un gestor genera una única por sitio) y revisar si tu correo apareció en filtraciones conocidas (servicios tipo 'have I been pwned') para rotar lo expuesto.",
      diagram: "crackhash",
      bullets: [
        "Las brechas alimentan listas de usuario/clave reales.",
        "Credential stuffing: reusar esas credenciales en otros sitios.",
        "Defensa del usuario: gestor de contraseñas + no reutilizar + revisar HIBP.",
      ],
    },
    {
      kind: "concept",
      title: "Guardar contraseñas bien (y qué NO hacer)",
      body:
        "La receta correcta: Argon2id (o bcrypt/scrypt) + sal única por usuario + opcionalmente un 'pepper' (un secreto global guardado aparte de la base), con rate limiting en el login y MFA encima. Lo que NUNCA: guardar en claro, 'cifrar' de forma reversible, usar MD5/SHA1, inventar tu propio algoritmo de hash ('security through obscurity' casero), o reutilizar la misma sal para todos. La seguridad de las contraseñas de millones de usuarios depende de estas decisiones de almacenamiento: es una de las responsabilidades más serias de quien programa autenticación.",
      diagram: "escudo",
      bullets: [
        "Bien: Argon2id/bcrypt + sal única + pepper + rate limit + MFA.",
        "Nunca: claro, cifrado reversible, MD5/SHA1, tu propio hash, sal compartida.",
        "Es una de las responsabilidades más serias al programar login.",
      ],
    },
  ],
};

const PASS_ONLINE: Curso = {
  id: "c-pass-online",
  title: "Ataques online y el futuro sin contraseña",
  subtitle: "Offline vs online, fuerza bruta vs spraying vs stuffing, y por qué passkeys y MFA bien hecho cambian el juego.",
  level: "avanzado",
  skill: "pentesting",
  hue: 15,
  glyph: "flame",
  reward: { xp: 280, coins: 220 },
  slides: [
    {
      kind: "concept",
      title: "Offline vs online: dos mundos",
      body:
        "Atacar una contraseña tiene dos escenarios muy distintos. OFFLINE: ya robaste los hashes (una base filtrada) y los crackeás en TU equipo, sin límites, a millones por segundo — ahí reina hashcat. ONLINE: no tenés el hash, así que probás credenciales CONTRA el servicio en vivo (un login SSH, un panel web). Acá hay límites reales: lentitud de la red, bloqueos por intentos fallidos, captchas, alertas. Son juegos totalmente diferentes: el offline es de velocidad; el online es de SIGILO y de no disparar defensas.",
      diagram: "fuerzabruta",
      bullets: [
        "Offline: tenés el hash, crackeás sin límite (hashcat).",
        "Online: probás contra el servicio vivo, con límites y alertas.",
        "Offline = velocidad; online = sigilo y no disparar defensas.",
      ],
    },
    {
      kind: "concept",
      title: "Fuerza bruta vs spraying vs stuffing",
      body:
        "Tres ataques online, tres lógicas. FUERZA BRUTA: muchas claves contra UN usuario — ruidoso, y dispara el bloqueo de cuenta enseguida. PASSWORD SPRAYING: le da vuelta la tortilla: UNA clave muy común (ej. 'Verano2024!') contra MUCHOS usuarios. Como cada cuenta recibe un solo intento, NO se bloquea, y en una empresa grande siempre hay alguien con esa clave. CREDENTIAL STUFFING: pares usuario/clave de brechas, probados masivamente (la gente reutiliza). Spraying y stuffing son mucho más efectivos y sigilosos que la fuerza bruta clásica, justamente porque esquivan el bloqueo por cuenta.",
      diagram: "spray",
      bullets: [
        "Fuerza bruta: muchas claves × 1 usuario (ruidoso, dispara lockout).",
        "Spraying: 1 clave común × muchos usuarios (evita el bloqueo).",
        "Stuffing: credenciales de brechas reusadas en masa.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué el password spraying evita el bloqueo de cuenta que sí dispara la fuerza bruta?",
      options: [
        "Porque prueba UNA sola clave por cuenta: ningún usuario acumula intentos fallidos suficientes para bloquearse",
        "Porque usa una VPN",
        "Porque las claves comunes no se bloquean",
        "Porque el servidor no tiene logs",
      ],
      correct: 0,
      explain:
        "El bloqueo cuenta intentos fallidos POR cuenta. La fuerza bruta golpea una cuenta muchas veces y la bloquea. El spraying reparte: una clave común contra miles de cuentas, un intento cada una. Nadie acumula fallos, nadie se bloquea, y estadísticamente alguien usa esa clave. Por eso se detecta mirando el patrón a nivel ORGANIZACIÓN (muchas cuentas, misma clave), no por cuenta.",
      diagram: "spray",
    },
    {
      kind: "lab",
      title: "Ataque online contra SSH",
      body: "Probá un ataque de contraseñas contra el SSH de un servidor que dejó una clave floja. Mirá cómo se automatiza.",
      command: "hydra ssh://server.nande",
      explain:
        "hydra prueba usuarios y claves contra el SSH vivo y encuentra la credencial débil: eso captura ND{ssh_fuerza_bruta}. En una operación real, en vez de martillar una cuenta (y bloquearla), harías SPRAYING: una clave común contra toda la lista de usuarios. La defensa: claves fuertes, rate limiting, bloqueos inteligentes y MFA.",
      diagram: "fuerzabruta",
    },
    {
      kind: "concept",
      title: "Las credenciales de red: NTLM y Kerberos",
      body:
        "En redes Windows, las contraseñas rara vez se adivinan de a una: se atacan los protocolos de autenticación. Con NTLM, basta el HASH para autenticarte (Pass-the-Hash) o se puede CAPTURAR y RELAYear ese hash. Con Kerberos, el Kerberoasting te deja pedir el ticket de una cuenta de servicio y crackearlo OFFLINE (vuelve el mundo del hashcat). Por eso, en entornos corporativos, 'romper contraseñas' es muchas veces capturar material de autenticación de la red y crackearlo tranquilo en casa. (Lo profundiza el itinerario de Active Directory.)",
      diagram: "hash",
      bullets: [
        "NTLM: el hash alcanza para autenticar (PtH) o se relaya.",
        "Kerberos: roasting → hash crackeable offline.",
        "En empresas, se captura material de red y se crackea offline.",
      ],
    },
    {
      kind: "concept",
      title: "MFA y sus bypass",
      body:
        "La autenticación multifactor (MFA) sube muchísimo el listón, pero no es inmune. MFA FATIGUE / push bombing: el atacante, con la clave ya robada, bombardea al usuario con notificaciones push hasta que una acepta 'para que pare' (así cayó Uber en 2022). PHISHING EN TIEMPO REAL: un proxy inverso (estilo evilginx) se pone entre vos y el sitio real, roba la clave Y el código MFA Y la cookie de sesión. SIM SWAP: se quedan con tu número para interceptar el SMS. Lección: el MFA por SMS o push aprobable es vulnerable; no todo 'segundo factor' es igual de fuerte.",
      diagram: "phishing",
      bullets: [
        "MFA fatigue: push bombing hasta que el usuario acepta (Uber 2022).",
        "Proxy inverso (evilginx): roba clave + código + cookie de sesión.",
        "SIM swap: interceptan el SMS. El SMS/push aprobable es débil.",
      ],
    },
    {
      kind: "concept",
      title: "Passkeys: el fin del phishing de credenciales",
      body:
        "La respuesta moderna son las PASSKEYS (FIDO2/WebAuthn). En vez de un secreto compartido que se puede robar, usan criptografía de clave pública: tu dispositivo guarda una clave privada que NUNCA sale, y el sitio solo tiene la pública. La magia anti-phishing: la credencial está LIGADA AL DOMINIO real. Si un sitio falso te pide autenticarte, el navegador simplemente no firma para ese dominio: no hay código que 'entregar' ni cookie que robar a un proxy. No hay secreto que crackear, filtrar ni reusar. Por eso passkeys + FIDO2 son 'resistentes al phishing' de verdad, no solo 'más seguras'.",
      diagram: "escudo",
      bullets: [
        "Passkeys = clave pública/privada; la privada nunca sale del dispositivo.",
        "Ligadas al dominio: un sitio falso no puede obtener la firma.",
        "Nada que crackear, filtrar ni reusar: phishing-resistant de verdad.",
      ],
    },
    {
      kind: "concept",
      title: "Defensa en capas",
      body:
        "Juntando todo, del lado defensor: empujá passwordless/passkeys donde puedas; si usás MFA, preferí factores resistentes al phishing (FIDO2) sobre SMS; poné rate limiting y bloqueos INTELIGENTES (que detecten spraying a nivel organización, no solo por cuenta); monitoreá en el SIEM el patrón de 'muchas cuentas, misma clave, misma IP'; forzá claves largas y únicas (mejor passphrases que complejidad obligatoria); y asumí que cualquier contraseña puede filtrarse, así que nunca sea el único muro. La meta: que robar una credencial no alcance para entrar.",
      diagram: "escudo",
      bullets: [
        "Passkeys/FIDO2 > SMS; rate limit y bloqueo inteligente.",
        "Cazá el spraying en el SIEM (muchas cuentas, misma clave).",
        "Passphrases largas y únicas; la clave nunca es el único muro.",
      ],
    },
  ],
};

export const PASSWORDS_AVANZADO_COURSES: Curso[] = [
  PASS_CRACKING,
  PASS_ALMACENAMIENTO,
  PASS_ONLINE,
];
