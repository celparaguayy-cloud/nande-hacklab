import type { Curso } from "../courseTypes";

/**
 * Cursos del módulo "passwords". Cursos interactivos completos (concept + quiz +
 * build + lab) ligados a las herramientas REALES de ÑANDE:
 *   - hydra ataca el SSH real de server.nande (credencial soporte/Verano2024,
 *     bandera ND{ssh_fuerza_bruta}).
 *   - john/hashid trabajan sobre hashes de laboratorio.
 * Los dibujos son ids de ConceptArt (SVG inline): 100% offline.
 */

/* ------------------------------------------------------------------ *
 *  CURSO 1 — Contraseñas: por qué caen (de cero, principiante)        *
 * ------------------------------------------------------------------ */

const PASS_BASICO: Curso = {
  id: "c-pass-basico",
  title: "Contraseñas: por qué caen",
  subtitle: "Qué hace débil a una clave, los diccionarios, rockyou y cómo protegerte.",
  level: "principiante",
  skill: "pentesting",
  hue: 28,
  glyph: "flame",
  reward: { xp: 130, coins: 95 },
  slides: [
    {
      kind: "concept",
      title: "La contraseña: la primera puerta",
      body:
        "Casi todo lo que hacés online está protegido por una contraseña: tu correo, tus redes, tu juego. Es la primera puerta. El problema es simple: si esa clave es fácil de adivinar, la puerta no protege nada. En este curso vas a entender POR QUÉ tantas claves caen en segundos… y cómo hacer una que aguante.",
      diagram: "fuerzabruta",
      bullets: [
        "Una contraseña es lo único que separa tu cuenta del mundo.",
        "Los atacantes no 'adivinan a mano': prueban millones automáticamente.",
        "Entender el ataque es el primer paso para defenderte.",
      ],
    },
    {
      kind: "concept",
      title: "¿Qué hace débil a una clave?",
      body:
        "Una clave débil tiene una o varias de estas señales. Cuantas más tenga, más rápido cae:\n\n• Es corta (menos de 12 caracteres).\n• Es una palabra común: 'futbol', 'paraguay', 'password'.\n• Es un dato tuyo: tu nombre, tu cumpleaños, tu equipo.\n• La usás en varios lados (si roban una, entran a todas).",
      diagram: "fuerzabruta",
      bullets: [
        "Corta + común + personal = clave de vidrio.",
        "Reutilizar una clave es como usar la misma llave para la casa, el auto y la escuela.",
      ],
    },
    {
      kind: "quiz",
      prompt: "De estas cuatro, ¿cuál es la MÁS débil?",
      options: [
        "paraguay2010",
        "Kx9$mve!qL2patio",
        "una frase larga que solo yo entiendo y tiene 30 letras",
        "un gestor generó: 7hT#pZ0!bV",
      ],
      correct: 0,
      explain:
        "'paraguay2010' junta una palabra común (paraguay) con un año: está en cualquier diccionario de ataque y se prueba de las primeras. Las otras tres son largas o aleatorias, fuera de los diccionarios comunes.",
      diagram: "fuerzabruta",
    },
    {
      kind: "concept",
      title: "El diccionario: la lista de claves comunes",
      body:
        "Los atacantes no empiezan probando 'aaaa, aaab, aaac…'. Eso tardaría siglos. Empiezan por una LISTA de las claves que la gente usa de verdad, ordenadas de más común a menos. Prueban esa lista una por una, muy rápido. A eso se le llama ataque de diccionario.",
      diagram: "fuerzabruta",
      bullets: [
        "Diccionario = lista de claves reales que la gente ya usó.",
        "Si tu clave está en la lista, cae en segundos, no en años.",
        "Por eso una clave 'rara' pero corta puede caer, y una frase larga no.",
      ],
    },
    {
      kind: "concept",
      title: "rockyou.txt: el diccionario más famoso",
      body:
        "Hace años se filtró la base de datos de un sitio llamado RockYou: 32 millones de contraseñas REALES de personas reales. Esa lista, rockyou.txt, es hoy la primera que prueba casi cualquier atacante. Si tu clave apareció alguna vez en una filtración, ya está en rockyou. En ÑANDE usamos una versión chica de rockyou.txt para que veas el ataque funcionar.",
      diagram: "fuerzabruta",
      bullets: [
        "rockyou.txt = 32 millones de claves reales filtradas.",
        "'123456', 'password', 'iloveyou', 'paraguay' están todas ahí.",
        "Regla de oro: si es una palabra que existe, asumí que ya está en la lista.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Tu clave es 'guarani'. Un atacante corre un ataque de diccionario con rockyou.txt. ¿Qué pasa?",
      options: [
        "Cae casi al instante: es una palabra común y está en la lista",
        "Aguanta: nadie usaría esa palabra",
        "No pasa nada porque está en guaraní",
        "El atacante necesita tu permiso primero",
      ],
      correct: 0,
      explain:
        "'guarani' es una palabra que existe y aparece en las filtraciones, así que está en el diccionario. El idioma no la protege: la máquina prueba la palabra igual. Una palabra suelta, en cualquier idioma, es una clave débil.",
      diagram: "fuerzabruta",
    },
    {
      kind: "concept",
      title: "Entropía: cuántas combinaciones hay",
      body:
        "La fuerza real de una clave se mide por cuántas combinaciones tendría que probar el atacante. A eso se le llama entropía. Dos cosas la suben MUCHO:\n\n1. La LONGITUD: cada carácter extra multiplica las combinaciones.\n2. La VARIEDAD: mezclar minúsculas, mayúsculas, números y símbolos.\n\nDe las dos, la longitud es la que más pesa. Una frase larga y sencilla gana a un batido corto de símbolos.",
      diagram: "fuerzabruta",
      bullets: [
        "Más largo = muchísimas más combinaciones = más tiempo para el atacante.",
        "'caballo-verde-toca-la-luna' es más fuerte que 'X4$k!' aunque parezca menos 'hacker'.",
        "Objetivo: que probar tu clave tarde tanto que no valga la pena.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Cuál de estas dos resiste mejor un ataque?",
      options: [
        "Una frase de 5 palabras al azar: 'mate-rio-nube-perro-tuerca'",
        "Ocho caracteres con símbolos: 'P@ss123!'",
        "Las dos son igual de fuertes",
        "La corta, porque tiene símbolos",
      ],
      correct: 0,
      explain:
        "La frase larga tiene muchísimas más combinaciones por su longitud, y 'P@ss123!' es en realidad un patrón previsible (palabra + símbolos típicos) que los diccionarios modernos ya prueban. Largo le gana a corto-con-símbolos casi siempre.",
      diagram: "fuerzabruta",
    },
    {
      kind: "build",
      goal: "Armar el comando de hydra que prueba un diccionario de claves contra el SSH de server.nande (el servidor autorizado del laboratorio)",
      pieces: ["hydra", "ssh://server.nande", "nmap", "https://google.com"],
      answer: ["hydra", "ssh://server.nande"],
      hint: "La herramienta de fuerza bruta se llama hydra. Después va el servicio y el objetivo, juntos: ssh://server.nande.",
      explain:
        "hydra ssh://server.nande le dice a hydra: probá el diccionario contra el servicio SSH de server.nande. Así se ve, de verdad, un ataque de diccionario. En el próximo curso vas a afinar este comando; acá primero conocés su forma.",
    },
    {
      kind: "lab",
      title: "Practicá: mirá caer claves débiles",
      body:
        "Cuando roban la base de datos de un sitio, las claves débiles se recuperan en segundos con herramientas como john. Abrí la terminal y corré john sobre un archivo de claves robadas del laboratorio. Fijate CUÁLES caen y por qué.",
      command: "john hashes.txt",
      explain:
        "Mirá el resultado: john recuperó 'hola123' y '123456' al instante, porque son claves debilísimas y estaban en su lista. Las claves largas y raras no aparecen: esas aguantan. Esa es toda la lección del curso, en vivo. Defensa: usá claves largas y únicas para que tu fila nunca sea una de las que caen.",
      diagram: "fuerzabruta",
    },
    {
      kind: "concept",
      title: "La solución real: gestor + frase + 2FA",
      body:
        "No tenés que memorizar 40 claves imposibles. Los profesionales hacen esto:\n\n1. Un GESTOR de contraseñas (como KeePass o Bitwarden) genera y guarda una clave larga y distinta para cada sitio. Vos solo recordás UNA clave maestra: una frase larga.\n2. Activás el SEGUNDO FACTOR (2FA): aunque adivinen la clave, les falta el código de tu teléfono.\n3. Nunca reutilizás una clave.",
      diagram: "escudo",
      bullets: [
        "Gestor = una sola frase maestra fuerte, el resto lo maneja el programa.",
        "2FA = una segunda llave que el atacante no tiene.",
        "Saber cómo se rompen las claves es justo lo que te hace elegir claves que no se rompen.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 2 — Fuerza bruta con hydra (lab real: SSH de server.nande)   *
 * ------------------------------------------------------------------ */

const PASS_HYDRA: Curso = {
  id: "c-pass-hydra",
  title: "Fuerza bruta con hydra",
  subtitle: "Atacá el SSH de server.nande con un diccionario, leé el resultado y entrá.",
  level: "intermedio",
  skill: "pentesting",
  hue: 352,
  glyph: "target",
  reward: { xp: 190, coins: 150 },
  slides: [
    {
      kind: "concept",
      title: "Fuerza bruta, en serio",
      body:
        "Fuerza bruta es probar muchas combinaciones de usuario y clave hasta que una funciona. hydra es la herramienta que automatiza eso contra un servicio real (SSH, FTP, web…). Antes de nada: esto se hace SOLO con permiso, sobre tu propia red o un laboratorio autorizado. En ÑANDE, server.nande es ese objetivo autorizado. Fuera del sandbox, hydra se niega a correr.",
      diagram: "fuerzabruta",
      bullets: [
        "hydra prueba usuario × clave a gran velocidad contra un servicio.",
        "Solo con permiso: red propia o laboratorio autorizado (server.nande).",
        "Hacerlo sobre un sistema ajeno sin permiso es un delito, no un juego.",
      ],
    },
    {
      kind: "concept",
      title: "El objetivo: el SSH de server.nande",
      body:
        "SSH es el servicio para entrar a una máquina por consola, y escucha en el puerto 22. Si primero escaneás con nmap, vas a ver '22/tcp open ssh' en server.nande. Ese puerto abierto es la invitación: hay un login esperando usuario y clave. Ahí apuntamos hydra.",
      diagram: "puerto",
      bullets: [
        "SSH = consola remota, puerto 22.",
        "Primero se reconoce (nmap), después se ataca (hydra).",
        "server.nande tiene el 22 abierto: es nuestro campo de práctica.",
      ],
    },
    {
      kind: "build",
      goal: "Armar el comando más simple de hydra: probar el diccionario de laboratorio contra el SSH de server.nande",
      pieces: ["hydra", "ssh://server.nande", "ftp://server.nande", "nmap"],
      answer: ["hydra", "ssh://server.nande"],
      hint: "La herramienta es hydra. El objetivo se escribe servicio://host, o sea ssh://server.nande.",
      explain:
        "hydra ssh://server.nande usa las listas de usuarios y claves incorporadas del laboratorio y las prueba contra el SSH. Es la forma más corta: sin -l ni -P, hydra usa sus diccionarios por defecto. Corto para empezar; ahora aprendé a afinarlo.",
    },
    {
      kind: "quiz",
      prompt: "En 'hydra ssh://server.nande', ¿qué significa la parte 'ssh://'?",
      options: [
        "El servicio que se va a atacar (SSH, en el puerto 22)",
        "La contraseña que se va a probar",
        "El nombre del atacante",
        "Que el ataque es seguro y anónimo",
      ],
      correct: 0,
      explain:
        "'ssh://' le dice a hydra CONTRA QUÉ servicio probar las claves. Podría ser ftp:// u otro. hydra necesita saber el idioma del login para hablarlo bien. El objetivo (server.nande) va justo después.",
      diagram: "fuerzabruta",
    },
    {
      kind: "concept",
      title: "Las listas: usuarios (-l/-L) y claves (-p/-P)",
      body:
        "Para afinar el ataque, hydra toma dos listas:\n\n• Usuarios: -l pone UN usuario ('-l soporte'). -L usa una LISTA de usuarios de un archivo.\n• Claves: -p prueba UNA clave. -P usa una LISTA (un diccionario, como '-P rockyou.txt').\n\nLa 'l' chica es una sola cosa; la 'L' o 'P' grande es una lista. Elegir bien reduce el ruido y el tiempo.",
      diagram: "fuerzabruta",
      bullets: [
        "-l usuario  → un solo usuario.    -L lista.txt → muchos usuarios.",
        "-p clave    → una sola clave.     -P rockyou.txt → diccionario entero.",
        "Si ya sabés el usuario, usá -l y ahorrás miles de intentos.",
      ],
    },
    {
      kind: "build",
      goal: "Armar un hydra afinado: usuario 'soporte' y el diccionario rockyou.txt contra server.nande",
      pieces: ["hydra", "-l", "soporte", "-P", "rockyou.txt", "server.nande", "-p", "-L"],
      answer: ["hydra", "-l", "soporte", "-P", "rockyou.txt", "server.nande"],
      hint: "hydra, después -l con el usuario (soporte), después -P con el diccionario (rockyou.txt), y al final el objetivo (server.nande).",
      explain:
        "hydra -l soporte -P rockyou.txt server.nande prueba TODAS las claves de rockyou.txt para el usuario soporte. Ojo: -l (chica) es un usuario, -P (grande) es una lista de claves. Si te hubieras confundido con -p (una sola clave), habrías probado una sola combinación.",
    },
    {
      kind: "quiz",
      prompt: "¿Cuál es la diferencia entre -p y -P en hydra?",
      options: [
        "-p prueba UNA clave; -P usa una LISTA de claves (un diccionario)",
        "Son lo mismo, solo cambia el color",
        "-p es para puertos y -P para páginas",
        "-P es más lento porque está en mayúscula",
      ],
      correct: 0,
      explain:
        "La minúscula es 'una sola' y la mayúscula es 'una lista'. -p clave prueba esa única clave; -P archivo prueba todas las del archivo. Lo mismo pasa con -l (un usuario) y -L (lista de usuarios). Confundirlas cambia por completo el ataque.",
      diagram: "fuerzabruta",
    },
    {
      kind: "concept",
      title: "Cuando el puerto no es el 22 (-s)",
      body:
        "A veces el admin mueve el SSH a otro puerto para esconderlo (por ejemplo el 2222). No lo protege de verdad, pero hay que apuntarle bien. Con -s le decís a hydra el puerto: 'hydra -s 2222 -l soporte -P rockyou.txt ssh://server.nande'. Si no ponés -s, hydra asume el puerto estándar del servicio (22 para SSH).",
      diagram: "puerto",
      bullets: [
        "-s <puerto> → apuntar a un puerto no estándar.",
        "Mover el puerto es 'seguridad por oscuridad': ayuda poco, un escaneo lo encuentra.",
        "Sin -s, hydra usa el puerto por defecto del servicio.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: rompé el SSH de server.nande",
      body:
        "Llegó el momento. Abrí la terminal y corré hydra contra el SSH de server.nande. Leé con calma la salida: cuántos intentos hizo, y sobre todo la línea que dice 'login:' y 'password:'. Esa es la credencial real que abre la máquina.",
      command: "hydra ssh://server.nande",
      explain:
        "hydra encontró: login: soporte / password: Verano2024, y capturaste la bandera ND{ssh_fuerza_bruta}. Esa clave es débil (una palabra + un año: está en el diccionario) por eso cayó. Fijate también el total de intentos: cada intento fallido quedó registrado. La fuerza bruta es RUIDOSA.",
      diagram: "fuerzabruta",
    },
    {
      kind: "concept",
      title: "La clave es real: ahora entrá",
      body:
        "hydra no 'entra' por vos: te da la credencial. El paso siguiente es usarla para conectarte de verdad con el comando connect. Como la credencial es la REAL del sistema, la sesión se abre y ya estás dentro de server.nande. Desde adentro verías su red interna: así se 'pivota' hacia lo que no se ve desde afuera.",
      diagram: "terminal",
      bullets: [
        "hydra descubre la clave; connect la usa para entrar.",
        "connect server.nande soporte Verano2024 → sesión abierta.",
        "Una credencial débil no solo abre una cuenta: abre toda la máquina.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: entrá con la credencial encontrada",
      body:
        "Usá la credencial que te dio hydra para conectarte de verdad a server.nande. Si la clave es correcta (lo es), vas a quedar dentro de la máquina.",
      command: "connect server.nande soporte Verano2024",
      explain:
        "Estás dentro de server.nande: la credencial débil te dio el control de la máquina, no solo de una cuenta. Ahí se ve por qué una clave floja es tan grave. Defensa: nunca uses palabras+año, y el admin debería exigir claves fuertes y bloquear tras varios fallos.",
      diagram: "terminal",
    },
    {
      kind: "quiz",
      prompt: "La fuerza bruta hizo decenas de intentos fallidos antes de acertar. ¿Qué significa eso para un defensor?",
      options: [
        "Deja un rastro ruidoso en los logs que el equipo azul puede detectar",
        "Es imposible de notar, hydra es invisible",
        "Los intentos fallidos no se registran nunca",
        "Solo importa el intento que acierta",
      ],
      correct: 0,
      explain:
        "Cada intento fallido queda en los registros de autenticación. Muchos fallos seguidos desde un mismo origen son la firma clásica de un ataque de fuerza bruta, y el SOC (equipo azul) lo correlaciona en una alerta. Atacar es ruidoso; por eso los defensores lo cazan.",
      diagram: "escudo",
    },
    {
      kind: "concept",
      title: "Cómo se tapa (la otra mitad del oficio)",
      body:
        "Saber romperlo obliga a saber frenarlo. Contra la fuerza bruta:\n\n• Claves largas y fuera de todo diccionario (que el ataque no las tenga).\n• Bloqueo por intentos: tras N fallos, la cuenta o la IP se frenan (fail2ban).\n• MFA / segundo factor: aunque adivinen la clave, falta el código.\n• Mejor aún: SSH con clave criptográfica en vez de contraseña.",
      diagram: "escudo",
      bullets: [
        "Clave fuerte + bloqueo por intentos + MFA = fuerza bruta inútil.",
        "fail2ban corta al atacante después de unos pocos fallos.",
        "Un hacker ético reporta la credencial débil y explica el arreglo; no roba.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 3 — Hashes: cómo se guardan y cómo se rompen (avanzado)       *
 * ------------------------------------------------------------------ */

const PASS_HASHES: Curso = {
  id: "c-pass-hashes",
  title: "Hashes: cómo se guardan y cómo se rompen",
  subtitle: "Hash vs cifrado, la sal, por qué guardar claves en texto plano es un crimen.",
  level: "avanzado",
  skill: "cripto",
  hue: 285,
  glyph: "gem",
  reward: { xp: 230, coins: 190 },
  slides: [
    {
      kind: "concept",
      title: "¿Qué es un hash?",
      body:
        "Un hash es una 'huella digital' de un texto. Una función como SHA-256 toma tu clave y devuelve siempre la misma huella fija, pero es de UNA sola dirección: de la clave sacás la huella, pero de la huella NO podés volver a la clave. Cambiá una sola letra de la entrada y la huella cambia por completo.",
      diagram: "hash",
      bullets: [
        "Misma entrada → siempre la misma huella.",
        "Ida sí (clave → huella); vuelta no (huella → clave).",
        "'hola' y 'holA' dan huellas totalmente distintas.",
      ],
    },
    {
      kind: "concept",
      title: "Hash NO es lo mismo que cifrado",
      body:
        "Es la confusión más común. Mirá la diferencia:\n\n• CIFRAR es reversible: con la clave correcta, el texto cifrado vuelve al original. Sirve para GUARDAR secretos que después necesitás leer (un mensaje, un archivo).\n• HASHEAR no es reversible: la huella no vuelve al original ni con clave. Sirve para VERIFICAR sin guardar el secreto (comparar contraseñas).",
      diagram: "hash",
      bullets: [
        "Cifrado = caja con llave: se abre y se cierra.",
        "Hash = trituradora: entra el papel, sale confeti; no se rearma.",
        "Las contraseñas se guardan HASHEADAS, no cifradas.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Tenés el hash SHA-256 de una clave. ¿Podés 'descifrarlo' para recuperar la clave?",
      options: [
        "No: el hash es de una vía. Solo podés ADIVINAR claves y ver si dan el mismo hash",
        "Sí, con la clave de descifrado correcta",
        "Sí, hay una función que lo revierte al instante",
        "No, y tampoco se puede adivinar de ninguna forma",
      ],
      correct: 0,
      explain:
        "El hash no se revierte: no existe 'des-hashear'. La única forma de romperlo es probar candidatos (diccionario), hashear cada uno y ver cuál da la misma huella. Por eso una clave débil cae: su candidato aparece rápido; una fuerte, no.",
      diagram: "hash",
    },
    {
      kind: "concept",
      title: "Por qué el sitio guarda el hash, no tu clave",
      body:
        "Un sitio bien hecho NUNCA guarda tu contraseña tal cual. Guarda su hash. Cuando entrás, hashea lo que escribiste y compara las dos huellas: si coinciden, sos vos. Así, si roban la base de datos, el ladrón se lleva huellas, no claves. Guardar claves en texto plano es un crimen de seguridad: una sola filtración las regala todas.",
      diagram: "hash",
      bullets: [
        "Login = comparar tu huella con la huella guardada.",
        "Base robada con hashes = el ladrón todavía tiene que romperlos.",
        "Base robada en texto plano = todas las cuentas, regaladas al instante.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Un sitio te manda un correo con tu propia contraseña escrita tal cual. ¿Qué te dice eso?",
      options: [
        "Que la guardan en texto plano: una práctica peligrosa, mala señal",
        "Que son muy seguros porque la recuerdan",
        "Que usan SHA-256, perfecto",
        "Que te tienen mucha confianza",
      ],
      correct: 0,
      explain:
        "Si pueden mostrarte tu clave exacta, es porque la tienen guardada sin hashear. Un sitio serio NO conoce tu contraseña: solo su huella. Si te la pueden enviar, cualquiera que robe su base también la lee. Es una alarma roja.",
      diagram: "hash",
    },
    {
      kind: "concept",
      title: "El ataque: adiviná y comparás huellas",
      body:
        "Como el hash no se revierte, el atacante que roba una lista de hashes hace esto: toma un diccionario (rockyou), hashea cada palabra y compara con los hashes robados. Cuando dos huellas coinciden, encontró la clave. Herramientas como john y hashcat hacen esto a millones de intentos por segundo. hashcat usa la placa de video (GPU) para ir aún más rápido.",
      diagram: "fuerzabruta",
      bullets: [
        "No se rompe el hash: se adivina la entrada que lo produce.",
        "Hash rápido (MD5/SHA1) = millones de intentos por segundo = malo para el defensor.",
        "Tablas precalculadas ('rainbow tables') guardan huellas ya hechas para ir más rápido.",
      ],
    },
    {
      kind: "concept",
      title: "La sal (salt): el ingrediente que arruina el ataque",
      body:
        "La sal es un texto aleatorio y ÚNICO que el sitio agrega a cada clave ANTES de hashearla, y lo guarda al lado. Efectos enormes:\n\n1. Dos personas con la MISMA clave tienen hashes DISTINTOS (cada una con su sal).\n2. Las tablas precalculadas dejan de servir: habría que rehacerlas para cada sal.\n\nLa sal no es secreta; su magia es ser distinta para cada usuario.",
      diagram: "hash",
      bullets: [
        "Sal = texto aleatorio y único por usuario, sumado antes de hashear.",
        "Misma clave, distinta sal → hashes diferentes.",
        "Mata las rainbow tables: el atacante ya no puede precalcular.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Ana y Beto eligieron la misma clave, 'futbol'. El sitio usa sal. ¿Cómo se ven sus hashes guardados?",
      options: [
        "Distintos, porque cada uno tiene una sal única",
        "Idénticos, la sal no cambia nada",
        "Vacíos, la sal borra el hash",
        "Iguales pero al revés",
      ],
      correct: 0,
      explain:
        "Con sal única, aunque la clave sea la misma, la entrada que se hashea es 'futbol'+sal_de_Ana vs 'futbol'+sal_de_Beto: dos entradas distintas, dos hashes distintos. Así el atacante no puede notar que comparten clave, ni reusar trabajo entre ellos.",
      diagram: "hash",
    },
    {
      kind: "build",
      goal: "Antes de crackear un hash hay que saber QUÉ tipo es. Armar el comando que identifica el algoritmo de este hash",
      pieces: ["hashid", "5f4dcc3b5aa765d61d8327deb882cf99", "john", "aircrack-ng"],
      answer: ["hashid", "5f4dcc3b5aa765d61d8327deb882cf99"],
      hint: "La herramienta para identificar el tipo de hash es hashid. Después va el hash que querés analizar.",
      explain:
        "hashid mira la FORMA del hash (largo, caracteres) y adivina el algoritmo. Este tiene 32 caracteres hexadecimales: es MD5. Saber el tipo es el paso 0 del crackeo, porque john/hashcat necesitan saber cómo rehacer la huella.",
    },
    {
      kind: "lab",
      title: "Practicá: identificá el tipo de hash",
      body:
        "Abrí la terminal y pasale a hashid este hash: 5f4dcc3b5aa765d61d8327deb882cf99. Fijate qué algoritmo te dice que es. (Pista de historia: es el MD5 de una clave famosísima.)",
      command: "hashid 5f4dcc3b5aa765d61d8327deb882cf99",
      explain:
        "hashid respondió 'Posible tipo: MD5' porque el hash tiene 32 caracteres hexadecimales, la firma de MD5. MD5 es viejo y rapidísimo de calcular: pésimo para guardar contraseñas, porque el atacante prueba millones por segundo. (Ese hash es el MD5 de 'password'.)",
      diagram: "hash",
    },
    {
      kind: "lab",
      title: "Practicá: crackeá los hashes débiles",
      body:
        "Ya sabés el tipo. Ahora corré john sobre un archivo de hashes robados del laboratorio y mirá cuáles cede. Observá que solo caen los débiles.",
      command: "john hashes.txt",
      explain:
        "john recuperó las claves débiles ('hola123', '123456') comparando huellas del diccionario con las robadas. Cayeron por débiles + hash rápido + (probablemente) sin sal. hashcat haría lo mismo usando la GPU, aún más rápido. Las claves largas y saladas no aparecen: esas resisten.",
      diagram: "fuerzabruta",
    },
    {
      kind: "concept",
      title: "Cómo se guarda BIEN una contraseña",
      body:
        "Ya viste el ataque completo. La defensa, hoy, es clara:\n\n• Usar un hash LENTO y con sal pensado para claves: bcrypt, scrypt o argon2. Son adrede lentos, así el atacante prueba miles por segundo, no millones.\n• Sal única por usuario (siempre).\n• Nunca MD5 ni SHA1 'pelados' para contraseñas, y jamás texto plano ni claves en los logs.\n• Del lado del usuario: frases largas, que ni el mejor diccionario tenga.",
      diagram: "escudo",
      bullets: [
        "bcrypt / scrypt / argon2 = lentos a propósito + salados = pesadilla del atacante.",
        "MD5/SHA1 para claves = error grave; texto plano = crimen.",
        "Defensa en dos frentes: buen hashing (el sitio) + clave larga (vos).",
      ],
    },
  ],
};

/**
 * Cursos del módulo "passwords".
 */
export const PASSWORDS_COURSES: Curso[] = [
  PASS_BASICO,
  PASS_HYDRA,
  PASS_HASHES,
];
