import type { Curso } from "../courseTypes";

/**
 * Cursos del módulo "osint". Investigar con datos PÚBLICOS y cuidar tu propio
 * rastro. Los labs están ligados a herramientas reales de ÑANDE: `exiftool`
 * (metadatos de fotos: revelar y limpiar), la red de anonimato (`anon`), los
 * servicios ocultos (`onion`) y el rastreador de OPSEC (`opsec`). Ética y
 * privacidad en primer plano: OSINT es para proteger, no para acosar.
 */

/* ------------------------------------------------------------------ *
 *  CURSO 1 — OSINT: investigar con datos públicos (intermedio)        *
 * ------------------------------------------------------------------ */

const OSINT_BASICO: Curso = {
  id: "c-osint-basico",
  title: "OSINT: investigar con datos públicos",
  subtitle: "Huella digital, metadatos de fotos, dorking y ética.",
  level: "intermedio",
  skill: "osint",
  hue: 288,
  glyph: "search",
  reward: { xp: 180, coins: 140 },
  slides: [
    {
      kind: "concept",
      title: "¿Qué es OSINT?",
      body:
        "OSINT quiere decir 'inteligencia de fuentes abiertas': investigar usando SOLO información pública, sin hackear nada. Redes sociales, fotos, páginas web, registros abiertos. No hace falta entrar a ningún sistema: la gente publica una barbaridad de datos sin darse cuenta, y con paciencia se arma un perfil sorprendentemente completo. Es una herramienta poderosa… y por eso hay que usarla con responsabilidad.",
      diagram: "osint",
      bullets: [
        "OSINT = investigar con datos PÚBLICOS, sin romper nada.",
        "Fuentes: redes, fotos, buscadores, registros abiertos.",
        "El poder está en JUNTAR piezas sueltas hasta ver el todo.",
      ],
    },
    {
      kind: "concept",
      title: "Tu huella digital",
      body:
        "Cada cosa que publicás deja una miga: una foto con la escuela de fondo, un comentario con tu barrio, la hora en que subís cosas, la cuenta que usás en varios lados con el mismo nombre. Por separado no dicen nada. Pero un investigador las junta y arma tu 'huella digital': quién sos, dónde estudiás, a qué hora salís de tu casa. Entender esto sirve para dos cosas: investigar mejor y protegerte mejor.",
      diagram: "osint",
      bullets: [
        "Huella digital = todo el rastro que dejás publicado.",
        "Migas sueltas → juntadas, revelan mucho más de lo que creés.",
        "Reutilizar el mismo apodo en todos lados conecta tus cuentas.",
      ],
    },
    {
      kind: "quiz",
      prompt:
        "¿Cuál de estos es un dato que OSINT usaría, sin hackear nada?",
      options: [
        "Una foto pública tuya donde se ve el cartel de tu escuela",
        "El contenido de tus mensajes privados cifrados",
        "Tu contraseña guardada en el servidor",
        "Los archivos borrados de tu disco",
      ],
      correct: 0,
      explain:
        "OSINT trabaja con lo que YA es público: la foto con el cartel de la escuela la publicaste vos. Los mensajes privados, las contraseñas y los archivos borrados no son fuentes abiertas: acceder a eso ya sería hackeo, no OSINT.",
    },
    {
      kind: "concept",
      title: "Metadatos: los datos ocultos de una foto",
      body:
        "Cuando sacás una foto, el celular guarda datos EXTRA adentro del archivo que no se ven en la imagen: la marca del teléfono, la fecha y hora exactas, el programa que la editó y —lo más delicado— las coordenadas GPS de dónde la sacaste. A esos datos escondidos se les llama metadatos (o EXIF). Publicás una foto pensando que solo se ve la imagen… pero va con la dirección de tu casa adentro.",
      diagram: "archivo",
      bullets: [
        "Metadatos = datos ocultos DENTRO del archivo de la foto.",
        "Pueden incluir GPS, fecha, cámara y software.",
        "La imagen se ve inocente; los metadatos te delatan.",
      ],
    },
    {
      kind: "build",
      goal: "Leer los metadatos ocultos de una foto llamada foto.jpg (sin abrir la imagen)",
      pieces: ["exiftool", "foto.jpg", "-all=", "cat"],
      answer: ["exiftool", "foto.jpg"],
      hint: "La herramienta para leer metadatos se llama exiftool. Después va el archivo. Ojo: -all= NO es para leer, es para borrar (eso viene después).",
      explain:
        "exiftool foto.jpg lee y muestra los metadatos escondidos del archivo. Es la herramienta estándar para esto. cat solo mostraría bytes ilegibles, y -all= sirve para LIMPIAR (lo vas a usar más adelante para defenderte).",
    },
    {
      kind: "lab",
      title: "Practicá: mirá lo que revela una foto",
      body:
        "Corré exiftool sobre foto.jpg y leé con atención lo que aparece. Vas a ver el autor, la cámara, la fecha… y unas coordenadas GPS. Buscá esas coordenadas: apuntan a un lugar real. Una sola foto 'inocente' acaba de decir quién la sacó y dónde estaba.",
      command: "exiftool foto.jpg",
      explain:
        "La foto delató autor, cámara, fecha y GPS (-25.2985, -57.6350: una ubicación real en Asunción). Nadie pidió esos datos: viajaban escondidos dentro del archivo. Esto es OSINT en acción, y también la razón por la que hay que limpiar las fotos antes de publicarlas.",
      diagram: "terminal",
    },
    {
      kind: "quiz",
      prompt:
        "Una foto publicada trae GPS -25.2985, -57.6350 en sus metadatos. ¿Qué acaba de revelar sin querer quien la subió?",
      options: [
        "El lugar exacto desde donde se sacó la foto (posiblemente su casa)",
        "Su contraseña de la red social",
        "El modelo del router de su casa",
        "Nada, el GPS no dice nada útil",
      ],
      correct: 0,
      explain:
        "Las coordenadas GPS marcan el punto exacto en un mapa. Si la foto se sacó en casa, acabás de publicar tu dirección. Por eso es tan importante: metadatos + una foto cotidiana = tu ubicación regalada a cualquiera que sepa mirar.",
    },
    {
      kind: "concept",
      title: "La defensa: limpiar los metadatos",
      body:
        "Saber que la foto te delata sirve para protegerte. La defensa es simple: BORRÁ los metadatos antes de publicar. Con la misma herramienta, exiftool, la opción -all= elimina autor, GPS y software de un archivo. La imagen queda igual de linda, pero ya no lleva tu ubicación adentro. Regla de oro: limpiá siempre las fotos antes de subirlas a cualquier lado.",
      diagram: "escudo",
      bullets: [
        "-all= borra TODOS los metadatos del archivo.",
        "La imagen no cambia; solo desaparece lo que te delataba.",
        "Limpiar antes de publicar = higiene digital básica.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: limpiá la foto antes de compartir",
      body:
        "Ahora ponete del lado de la defensa. Corré exiftool con la opción -all= sobre foto.jpg para borrarle los metadatos. Compará con lo que viste antes: los mismos datos que te delataban ahora ya no están.",
      command: "exiftool -all= foto.jpg",
      explain:
        "Le quitaste el GPS, el autor y el software a la foto: ahora se puede compartir sin regalar tu ubicación. Aprendiste las dos caras del mismo comando: exiftool foto.jpg REVELA (investigar) y exiftool -all= foto.jpg LIMPIA (proteger). Eso es pensar en seguridad completa.",
      diagram: "escudo",
    },
    {
      kind: "concept",
      title: "Google dorking: buscar como investigador",
      body:
        "Un buscador es más potente de lo que parece si usás operadores. A eso se le llama 'dorking': buscar con precisión de investigador.\n\n• site:escuela.edu → solo resultados de ese sitio.\n• filetype:pdf → solo archivos PDF.\n• intitle:\"index of\" → carpetas abiertas por descuido.\n\nMuchas filtraciones no son hackeos: son cosas que alguien dejó públicas por error, y el dorking las encuentra. Sirve para investigar… y para revisar que TU información no esté expuesta.",
      diagram: "osint",
      bullets: [
        "Operadores: site:, filetype:, intitle: afinan la búsqueda.",
        "Dorking encuentra lo que se publicó sin querer.",
        "Se usa para investigar y para auditar tu propia exposición.",
      ],
    },
    {
      kind: "quiz",
      prompt:
        "Querés encontrar documentos PDF publicados por error en el sitio banco.nande. ¿Qué búsqueda es la más precisa?",
      options: [
        "site:banco.nande filetype:pdf",
        "banco pdf por favor",
        "descargar todo de banco.nande",
        "banco.nande contraseña admin",
      ],
      correct: 0,
      explain:
        "Con site: limitás la búsqueda a ese sitio y con filetype:pdf pedís solo PDFs. Es una consulta de dorking precisa. Las otras son búsquedas vagas o directamente pedirle al buscador algo que no hace. La precisión es lo que separa a un investigador de alguien que 'googlea'.",
    },
    {
      kind: "concept",
      title: "Ética y privacidad: la línea que no se cruza",
      body:
        "OSINT es legal porque usa datos públicos, pero PODEROSO no es lo mismo que CORRECTO. Con estas técnicas se arma el perfil de una persona en minutos, y esa misma info alimenta el phishing y el acoso: un atacante que sabe tu escuela y tu barrio te escribe un engaño a medida. La regla: investigá sistemas y tu propia exposición, nunca acoses ni expongas a una persona. El conocimiento es para proteger, no para lastimar.",
      diagram: "phishing",
      bullets: [
        "Legal ≠ ético: tener el poder no te da el permiso.",
        "OSINT alimenta el phishing dirigido y el acoso: cuidado.",
        "Usalo para defenderte y auditar; nunca contra una persona.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 2 — Anonimato y OPSEC (avanzado): cómo te rastrean y cómo no *
 * ------------------------------------------------------------------ */

const OPSEC_ANON: Curso = {
  id: "c-opsec-anon",
  title: "Anonimato y OPSEC",
  subtitle: "Cómo te rastrean, VPN vs Tor, el circuito y los errores que delatan.",
  level: "avanzado",
  skill: "osint",
  hue: 250,
  glyph: "mask",
  reward: { xp: 220, coins: 180 },
  slides: [
    {
      kind: "concept",
      title: "Cómo te rastrean: tu IP",
      body:
        "Cada vez que te conectás, el destino ve tu dirección IP: es como el remitente de una carta. Con esa IP se sabe tu proveedor de internet y, más o menos, tu zona. Y del lado del servidor queda registrada en los logs (justo lo que aprendiste a leer como defensor). Tu IP no es un secreto: es lo primero que te ubica. El anonimato empieza por controlar qué IP ve el otro lado.",
      diagram: "ip",
      bullets: [
        "IP = tu 'remitente': te ubica y queda en los logs del destino.",
        "Revela tu proveedor y tu región aproximada.",
        "Ocultar la IP real es el primer paso del anonimato.",
      ],
    },
    {
      kind: "concept",
      title: "La huella del navegador (fingerprint)",
      body:
        "Aunque escondas la IP, tu navegador te delata de otra forma: la combinación de tu idioma, resolución de pantalla, fuentes instaladas, versión del sistema… arma una 'huella' casi única, como tu forma de caminar. A eso se le llama fingerprint. Por eso el anonimato NO es un solo botón: la IP es una pieza, pero la huella del navegador, los horarios y tus costumbres también cuentan.",
      diagram: "osint",
      bullets: [
        "Fingerprint = la huella única de tu navegador y equipo.",
        "Te identifica aunque cambies de IP.",
        "Anonimato real = cuidar varias cosas a la vez, no una sola.",
      ],
    },
    {
      kind: "quiz",
      prompt:
        "¿Qué combinación te identifica mejor en internet?",
      options: [
        "Tu IP + la huella del navegador + tus horarios y costumbres, todo junto",
        "Solo el color de fondo de tu pantalla",
        "Únicamente tu nombre de usuario, nada más importa",
        "Nada: en internet nadie puede saber quién sos",
      ],
      correct: 0,
      explain:
        "No hay un solo dato que te delate: es la SUMA. IP, fingerprint, a qué hora te conectás, qué apodos reutilizás… cada pieza sola dice poco, pero juntas te señalan. Creer que 'nadie puede saber quién sos' es justo el error que te termina delatando.",
    },
    {
      kind: "concept",
      title: "VPN: el túnel cifrado",
      body:
        "Una VPN mete todo tu tráfico dentro de un túnel cifrado hasta un servidor, y desde ahí sale a internet. Dos efectos: nadie en el camino (tu proveedor, el WiFi del café) ve QUÉ hacés, y el destino ve la IP del servidor VPN, no la tuya. Pero ojo con el detalle importante: el que maneja la VPN SÍ ve tu tráfico. Cambiás de 'quién te vigila': confiás en la empresa de la VPN.",
      diagram: "vpn",
      bullets: [
        "VPN = túnel cifrado + cambia la IP que ve el destino.",
        "Tu proveedor y el WiFi dejan de ver qué hacés.",
        "Pero la empresa de la VPN sí puede ver tu tráfico: es cuestión de confianza.",
      ],
    },
    {
      kind: "quiz",
      prompt:
        "Con una VPN, ¿en quién estás confiando tu privacidad?",
      options: [
        "En la empresa que maneja la VPN: ella puede ver tu tráfico",
        "En nadie: la VPN te hace 100% anónimo para siempre",
        "En el destino web, que ahora te protege",
        "En tu proveedor de internet, que ahora te cuida",
      ],
      correct: 0,
      explain:
        "La VPN esconde tu tráfico de todos… menos de sí misma. Movés la confianza de tu proveedor a la empresa de la VPN. Por eso una VPN no es anonimato total: es un cambio de a quién le creés. Tor resuelve esto de otra forma, con el circuito.",
      diagram: "vpn",
    },
    {
      kind: "concept",
      title: "El circuito de cebolla (Tor)",
      body:
        "Tor evita tener que confiar en un solo servidor. Tu tráfico rebota por VARIOS nodos en cadena (el 'circuito'), con capas de cifrado como una cebolla. La clave: ningún nodo ve la historia completa. El primero sabe quién sos pero no a dónde vas; el último sabe a dónde vas pero no quién sos. Ninguno tiene las dos puntas. Por eso es más difícil de rastrear que una sola VPN.",
      diagram: "vpn",
      bullets: [
        "Circuito = tu tráfico salta por varios nodos, no uno solo.",
        "Cada nodo conoce solo una parte: nadie ve las dos puntas.",
        "El destino ve la IP del nodo de SALIDA, en otro país.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: activá el circuito de anonimato",
      body:
        "Encendé la red de anonimato con el comando anon on. Fijate qué te dice: ahora salís por un nodo en otro país, y el destino verá ESA IP en lugar de la tuya. Después podés probar 'anon status' para ver tu IP visible, o 'anon new' para cambiar de circuito.",
      command: "anon on",
      explain:
        "Activaste el circuito: tu tráfico ahora sale por un nodo en otro país y tu IP real queda oculta al destino. Con 'anon new' rotás a otro nodo. Esto no te hace invisible (la huella y tus costumbres siguen ahí), pero sube mucho tu anonimato de red.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Servicios ocultos (.onion)",
      body:
        "Algunos sitios solo existen DENTRO de la red de anonimato: sus direcciones terminan en .onion y no se abren por internet normal. Suena misterioso, pero muchos son legítimos: bibliotecas espejadas para saltar la censura, buzones seguros para que periodistas reciban denuncias, foros de privacidad. La privacidad fuerte también protege a quien denuncia al poder. (Todo acá es ficticio y educativo.)",
      bullets: [
        "Un .onion solo se alcanza con el circuito activo.",
        "Muchos son legítimos: anti-censura, buzones de denuncia.",
        "Privacidad fuerte = herramienta, no sinónimo de delito.",
      ],
    },
    {
      kind: "build",
      goal: "Abrir un servicio oculto .onion (la Biblioteca) usando el circuito de anonimato",
      pieces: ["onion", "biblioteca7k2fx.onion", "curl", "google.com"],
      answer: ["onion", "biblioteca7k2fx.onion"],
      hint: "En ÑANDE, el comando para abrir un servicio oculto es onion, seguido de la dirección .onion. curl no sirve acá: los .onion no se resuelven por la red normal.",
      explain:
        "onion biblioteca7k2fx.onion intenta abrir ese servicio oculto. Solo funciona si el circuito está activo (anon on), porque los .onion no existen fuera de la red de anonimato. Por eso curl google.com no tendría nada que ver acá.",
    },
    {
      kind: "lab",
      title: "Practicá: alcanzá un servicio oculto",
      body:
        "Hacé las dos cosas juntas: activá el circuito y después abrí la Biblioteca .onion. Si intentaras abrirla SIN el circuito, fallaría (los .onion no se resuelven por la red normal). Con el circuito activo, el servicio responde y captura la bandera ND{onion_alcanzada_con_circuito}.",
      command: "anon on && onion biblioteca7k2fx.onion",
      explain:
        "Llegaste al servicio oculto y capturaste ND{onion_alcanzada_con_circuito}. La lección es real: sin el circuito, ese .onion es inalcanzable; con él, responde. La reachability depende del ESTADO real de tu anonimato, no de un truco. Así funciona de verdad la red de servicios ocultos.",
      diagram: "vpn",
    },
    {
      kind: "lab",
      title: "Practicá: mirá tu propio rastro (OPSEC)",
      body:
        "OPSEC es 'seguridad operacional': cuidar que tus acciones no te delaten. Corré el comando opsec para ver tu rastro: si estás enrutando por el circuito o expuesto con tu IP real, y tu 'nivel de calor'. Es el espejo que te muestra qué tan visible estás siendo.",
      command: "opsec",
      explain:
        "El panel de OPSEC te muestra si tus acciones quedan enmascaradas o expuestas. La lección central: el anonimato no es cosmético. Si atacás o investigás sin el circuito, tu IP real queda en los logs del otro lado, y eso te delata por más VPN que digas tener.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Errores de OPSEC: lo que te delata igual",
      body:
        "El anonimato perfecto no existe, y casi siempre cae por errores humanos, no por fallas técnicas:\n\n• Publicar una foto sin limpiar los metadatos (GPS incluido).\n• Reutilizar el mismo apodo o correo dentro y fuera del circuito.\n• Conectarte siempre a la misma hora (tu horario es una huella).\n• Atacar sin anonimato 'una sola vez'.\n\nHasta la MAC de tu placa te identifica (se cambia con macchanger wlan0 random). Herramientas potentes + un descuido = identidad revelada. La disciplina importa más que la herramienta.",
      diagram: "osint",
      bullets: [
        "El eslabón débil casi siempre es humano, no técnico.",
        "Metadatos, horarios e identidades reutilizadas te delatan.",
        "macchanger wlan0 random cambia tu MAC; aun así, cuidá tus costumbres.",
      ],
    },
    {
      kind: "lab",
      title: "Capstone: investigá y operá sin rastro",
      body:
        "Uní las dos caras en una operación guiada: sacá quién y DÓNDE de una foto (OSINT), aprendé a limpiar tu propia huella, revisá tu exposición y anonimizate para alcanzar un servicio oculto sin mostrar tu IP. Tocá para arrancar en la terminal.",
      command: "learn l-eng-osint",
      explain:
        "OSINT (metadatos/GPS con exiftool) + OPSEC (limpiar huella, anon on, circuito → ND{onion_alcanzada_con_circuito}). Todo para PROTEGER privacidad: la herramienta es neutral, el uso es tu responsabilidad.",
      diagram: "vpn",
    },
  ],
};

/**
 * Cursos del módulo "osint". Se completa con cursos interactivos completos
 * (concept + quiz + build + lab) ligados a las herramientas reales de ÑANDE.
 */
export const OSINT_COURSES: Curso[] = [OSINT_BASICO, OPSEC_ANON];
