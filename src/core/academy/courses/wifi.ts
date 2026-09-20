import type { Curso } from "../courseTypes";

/**
 * Cursos del módulo "wifi". Cursos interactivos completos (concept + quiz +
 * build + lab) ligados a la radio 802.11 REAL de ÑANDE (WirelessRadio) y a la
 * suite aircrack-ng:
 *   airmon-ng start wlan0 → airodump-ng → aireplay-ng --deauth → aircrack-ng.
 * El objetivo del laboratorio es Vecino-2G (WPA2, canal 6, BSSID
 * E8:94:F6:77:88:04), cuya clave débil 'invitado' está en rockyou.txt; al
 * romperla se captura la bandera ND{wifi_wpa_crackeada}. Los dibujos son ids de
 * ConceptArt (SVG inline): 100% offline.
 */

/* ------------------------------------------------------------------ *
 *  CURSO 1 — WiFi: cómo viaja tu internet por el aire (intermedio)    *
 * ------------------------------------------------------------------ */

const WIFI_COMO_FUNCIONA: Curso = {
  id: "c-wifi-como-funciona",
  title: "WiFi: cómo viaja tu internet por el aire",
  subtitle: "SSID, BSSID, canal, WPA2, el 4-way handshake y por qué el WiFi abierto es peligroso.",
  level: "intermedio",
  skill: "redes",
  hue: 192,
  glyph: "trend",
  reward: { xp: 185, coins: 145 },
  slides: [
    {
      kind: "concept",
      title: "Tu internet viaja por el aire",
      body:
        "Cuando usás WiFi, tus datos no van por un cable: viajan como ondas de radio entre tu teléfono y el router. Eso tiene una consecuencia enorme: cualquiera cerca, con la antena adecuada, puede ESCUCHAR esas ondas. El WiFi no se puede 'tapar' físicamente como un cable. Por eso la seguridad del WiFi se juega en el cifrado, no en las paredes.",
      diagram: "wifi",
      bullets: [
        "WiFi = tus datos convertidos en ondas de radio.",
        "El aire es un medio COMPARTIDO: lo que emitís, otros lo reciben.",
        "La defensa no es esconder la señal, es cifrarla.",
      ],
    },
    {
      kind: "concept",
      title: "SSID, BSSID y canal",
      body:
        "Toda red WiFi se describe con tres datos:\n\n• SSID: el NOMBRE que ves y elegís ('ÑANDE-Home', 'Vecino-2G').\n• BSSID: la dirección MAC del router, un identificador único como E8:94:F6:77:88:04. El nombre se puede repetir; el BSSID no.\n• CANAL: la 'frecuencia' concreta donde emite (canal 1, 6, 11…). Dos redes en el mismo canal se estorban.",
      diagram: "wifi",
      bullets: [
        "SSID = nombre para humanos (se puede copiar/repetir).",
        "BSSID = MAC única del router (identifica al AP de verdad).",
        "Canal = la frecuencia donde escuchar; hay que sintonizarlo para capturar.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Ves dos redes llamadas 'WiFi_Gratis'. ¿Cómo sabés si son el MISMO router o dos distintos?",
      options: [
        "Por el BSSID: el nombre (SSID) se puede repetir, la MAC no",
        "Por el nombre: si se llaman igual, son la misma",
        "Es imposible saberlo",
        "Por el color del ícono",
      ],
      correct: 0,
      explain:
        "El SSID (nombre) lo elige quien configura el router y se puede copiar; por eso un atacante puede clonar el nombre de una red conocida. El BSSID (la MAC) identifica al aparato real. Dos 'WiFi_Gratis' con distinto BSSID son dos routers diferentes: uno podría ser una trampa.",
      diagram: "wifi",
    },
    {
      kind: "concept",
      title: "WPA2: el candado que cifra el aire",
      body:
        "Como el aire se escucha, el WiFi moderno CIFRA lo que viaja. WPA2 es el estándar más común: pide una clave y, con ella, todo tu tráfico va revuelto para quien no la tenga. Una red ABIERTA (OPN), en cambio, no cifra nada: cualquiera al lado lee tu tráfico en claro. WPA3 es la versión más nueva y más fuerte.",
      diagram: "escudo",
      bullets: [
        "Abierta (OPN) = sin candado: todo viaja en claro, cualquiera lo lee.",
        "WPA2 = candado con clave compartida: lo estándar hoy.",
        "WPA3 = candado más nuevo, resiste ataques que a WPA2 lo tumban.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Te conectás al WiFi abierto y gratis de un café. ¿Cuál es el riesgo real?",
      options: [
        "Como no hay cifrado, alguien cerca puede leer tu tráfico en claro",
        "Ninguno, el WiFi gratis siempre es seguro",
        "Solo que va más lento",
        "Que te cobran sin avisar",
      ],
      correct: 0,
      explain:
        "En una red abierta nada se cifra a nivel WiFi: quien escuche el aire ve tus datos tal cual. Además, cualquiera puede montar una red con el mismo nombre para engañarte. En WiFi público, usá siempre HTTPS y, mejor, una VPN que cifre todo tu tráfico.",
      diagram: "wifi",
    },
    {
      kind: "concept",
      title: "El 4-way handshake: el saludo secreto de WPA",
      body:
        "Cuando un dispositivo se conecta a una red WPA2, hace un 'saludo' de cuatro mensajes con el router: el 4-way handshake. En ese saludo NO viaja la clave, pero sí viaja una PRUEBA matemática derivada de la clave. Ese handshake es la pieza clave: quien lo captura puede después, sin conexión, probar claves contra él hasta encontrar la correcta.",
      diagram: "handshake",
      bullets: [
        "El handshake ocurre al CONECTARSE un cliente a la red.",
        "No lleva la clave, pero sí una prueba derivada de ella.",
        "Capturar el handshake es el objetivo número uno de un ataque WPA2.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué un atacante quiere capturar el 4-way handshake de una red WPA2?",
      options: [
        "Porque le permite probar claves contra él sin conexión, hasta romper la débil",
        "Porque el handshake contiene la clave escrita",
        "Porque apaga el router",
        "Porque cambia el nombre de la red",
      ],
      correct: 0,
      explain:
        "El handshake no trae la clave, pero es la 'prueba' que necesita para atacar offline: prueba millones de claves de un diccionario contra él, en su propia máquina, sin tocar más la red. Si la clave es débil, cae. Si es larga y aleatoria, ni con el handshake la saca.",
      diagram: "handshake",
    },
    {
      kind: "concept",
      title: "Modo monitor: escuchar TODO el aire",
      body:
        "Normalmente tu placa WiFi solo escucha SU red. Para auditar hay que ponerla en 'modo monitor': así capta TODAS las ondas del aire, de todas las redes cercanas, sin conectarse a ninguna. Es escucha pasiva. La herramienta que activa ese modo se llama airmon-ng, y deja la interfaz lista como wlan0mon. Es el paso 1 de cualquier auditoría WiFi.",
      diagram: "wifi",
      bullets: [
        "Modo normal (managed): solo tu red. Modo monitor: todo el aire.",
        "airmon-ng start wlan0 → activa el modo monitor (crea wlan0mon).",
        "Es pasivo: escuchás, no emitís (todavía).",
      ],
    },
    {
      kind: "build",
      goal: "Armar el comando que pone la placa WiFi en modo monitor (el primer paso de toda auditoría)",
      pieces: ["airmon-ng", "start", "wlan0", "stop", "aircrack-ng"],
      answer: ["airmon-ng", "start", "wlan0"],
      hint: "La herramienta es airmon-ng. Le pedís 'start' (arrancar el modo monitor) sobre la interfaz wlan0.",
      explain:
        "airmon-ng start wlan0 pone la placa en modo monitor y crea la interfaz wlan0mon, con la que vas a escuchar el aire. Sin este paso, las demás herramientas (airodump-ng, aireplay-ng) se niegan a correr: no pueden capturar en modo normal.",
    },
    {
      kind: "lab",
      title: "Practicá: activá el modo monitor",
      body:
        "Abrí la terminal y poné tu placa WiFi en modo monitor. Fijate cómo la interfaz pasa de wlan0 (normal) a wlan0mon (escucha).",
      command: "airmon-ng start wlan0",
      explain:
        "Tu placa ahora está en modo monitor (wlan0mon): lista para captar todas las redes del aire, no solo la tuya. Con esto habilitado, en el próximo paso vas a escuchar quién hay alrededor. Defensa: no hay defensa contra 'escuchar' el aire; por eso todo se cifra.",
      diagram: "wifi",
    },
    {
      kind: "lab",
      title: "Practicá: escuchá las redes del aire",
      body:
        "Con el modo monitor activo, corré airodump-ng para listar todas las redes cercanas. Mirá la tabla: cada fila trae el BSSID, el canal (CH), el cifrado (ENC) y el nombre (ESSID). Ahí está todo lo que aprendiste, en vivo.",
      command: "airodump-ng wlan0mon",
      explain:
        "airodump-ng te muestra el mapa del aire: BSSID (MAC), canal, cifrado y nombre de cada red, más los clientes conectados. Vas a ver redes WPA2, alguna WPA3 y quizás una abierta (OPN). Esta foto es el punto de partida de una auditoría: elegís un objetivo autorizado y anotás su canal y BSSID.",
      diagram: "wifi",
    },
    {
      kind: "concept",
      title: "Repaso y defensa",
      body:
        "Ya tenés el mapa mental del WiFi:\n\n1. Tus datos viajan por el aire (compartido) como ondas.\n2. Cada red es SSID (nombre) + BSSID (MAC) + canal.\n3. WPA2/WPA3 cifran el aire; una red abierta no.\n4. Al conectarte ocurre el 4-way handshake, la pieza que un atacante querría capturar.\n\nPara protegerte: clave WPA2/WPA3 larga y aleatoria, preferí WPA3, y en WiFi público usá una VPN y no confíes en redes abiertas.",
      diagram: "escudo",
      bullets: [
        "Ondas + medio compartido = todo se cifra o todo se expone.",
        "Clave larga + WPA3 = handshake capturado pero clave irrompible.",
        "En redes ajenas o abiertas: VPN y HTTPS, siempre.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 2 — Romper WPA con aircrack (con permiso) — cadena real       *
 * ------------------------------------------------------------------ */

const WIFI_AIRCRACK: Curso = {
  id: "c-wifi-aircrack",
  title: "Romper WPA con aircrack (con permiso)",
  subtitle: "La cadena real: airmon-ng → airodump-ng → aireplay-ng → aircrack-ng contra un WPA2 débil.",
  level: "avanzado",
  skill: "pentesting",
  hue: 305,
  glyph: "crown",
  reward: { xp: 240, coins: 200 },
  slides: [
    {
      kind: "concept",
      title: "Con permiso, siempre",
      body:
        "Vas a aprender a romper una clave WPA2. Esto se hace SOLO sobre tu propia red o un laboratorio autorizado. Auditar el WiFi del vecino, del café o de la escuela sin permiso es un delito, sin importar que 'solo estabas probando'. En ÑANDE, el objetivo autorizado es la red Vecino-2G del laboratorio. Todo pasa dentro del sandbox: ninguna radio real se toca.",
      diagram: "escudo",
      bullets: [
        "Solo tu red o un laboratorio con permiso explícito.",
        "Objetivo autorizado del lab: Vecino-2G (WPA2).",
        "El objetivo es aprender a DEFENDER, entendiendo el ataque.",
      ],
    },
    {
      kind: "concept",
      title: "La cadena de aircrack: 4 pasos encadenados",
      body:
        "Romper WPA2 no es un botón mágico: es una cadena de cuatro pasos, y cada uno necesita al anterior:\n\n1. airmon-ng → modo monitor (escuchar el aire).\n2. airodump-ng → encontrar el objetivo y grabar la captura.\n3. aireplay-ng --deauth → expulsar a un cliente para forzar el handshake.\n4. aircrack-ng → probar el diccionario contra ese handshake.\n\nSin modo monitor no hay captura; sin cliente no hay handshake; sin handshake no hay nada que crackear.",
      diagram: "fuerzabruta",
      bullets: [
        "monitor → escuchar → forzar handshake → crackear.",
        "Cada paso depende del anterior: es una cadena, no un atajo.",
        "El crackeo final es OFFLINE: contra el handshake capturado.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Sobre qué red podés practicar legalmente este ataque?",
      options: [
        "Sobre tu propia red, o una de un laboratorio autorizado (Vecino-2G en ÑANDE)",
        "Sobre cualquier WiFi que tu antena alcance",
        "Sobre la del vecino, si es débil se lo merece",
        "Sobre la del café, porque es pública",
      ],
      correct: 0,
      explain:
        "Capturar handshakes y crackear claves de una red ajena sin permiso es ilegal aunque no 'uses' la red. Solo es legítimo sobre tu propia red o un entorno autorizado para practicar, como el laboratorio de ÑANDE. La técnica es la misma; lo que cambia es el permiso.",
      diagram: "escudo",
    },
    {
      kind: "concept",
      title: "Paso 1: modo monitor",
      body:
        "Como en la auditoría, arrancamos poniendo la placa en modo monitor con airmon-ng. Eso crea la interfaz wlan0mon, capaz de escuchar todo el aire. Es obligatorio: airodump-ng y aireplay-ng no funcionan sin modo monitor.",
      diagram: "wifi",
      bullets: [
        "airmon-ng start wlan0 → wlan0mon.",
        "Sin esto, los demás comandos se niegan a correr.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: paso 1, modo monitor",
      body:
        "Poné la placa en modo monitor. Vas a usar wlan0mon en todos los pasos siguientes.",
      command: "airmon-ng start wlan0",
      explain:
        "Modo monitor activo (wlan0mon). Ya podés escuchar el aire. Si más adelante un comando te dice 'no está en modo monitor', volvé a correr esto: es la base de toda la cadena.",
      diagram: "wifi",
    },
    {
      kind: "concept",
      title: "Paso 2: escuchar y elegir el objetivo",
      body:
        "Con airodump-ng escuchás el aire y ves todas las redes. Buscás el objetivo autorizado: Vecino-2G. Anotá dos datos suyos que vas a necesitar: su BSSID (E8:94:F6:77:88:04) y su canal (6). También fijate que tenga al menos un CLIENTE conectado: sin cliente no hay handshake que forzar.",
      diagram: "wifi",
      bullets: [
        "Objetivo: Vecino-2G · WPA2 · canal 6 · BSSID E8:94:F6:77:88:04.",
        "Necesitás un cliente asociado para el paso del handshake.",
        "airodump-ng wlan0mon lista todo; después enfocás uno.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: paso 2, mirá el aire",
      body:
        "Corré airodump-ng para ver todas las redes. Ubicá a Vecino-2G y confirmá su canal (6), su cifrado (WPA2) y que tenga un cliente.",
      command: "airodump-ng wlan0mon",
      explain:
        "Ahí está Vecino-2G en canal 6, cifrado WPA2, con un cliente asociado: candidato perfecto. También ves una red WPA3 (Corp-Secure) y una abierta. Con el objetivo elegido, el próximo paso es enfocarte solo en él y empezar a grabar.",
      diagram: "wifi",
    },
    {
      kind: "build",
      goal: "Enfocar airodump-ng SOLO en Vecino-2G, en su canal, y grabar la captura en un archivo llamado 'captura'",
      pieces: ["airodump-ng", "--bssid", "E8:94:F6:77:88:04", "-c", "6", "-w", "captura", "wlan0mon", "-p"],
      answer: ["airodump-ng", "--bssid", "E8:94:F6:77:88:04", "-c", "6", "-w", "captura", "wlan0mon"],
      hint: "airodump-ng, después --bssid con la MAC del objetivo, -c con el canal (6), -w con el nombre del archivo (captura) y al final la interfaz wlan0mon.",
      explain:
        "airodump-ng --bssid E8:94:F6:77:88:04 -c 6 -w captura wlan0mon escucha SOLO a Vecino-2G en el canal 6 y guarda todo en captura-01.cap. Ese archivo .cap es donde va a quedar grabado el handshake cuando lo fuerces, y es lo que después leerá aircrack-ng.",
    },
    {
      kind: "lab",
      title: "Practicá: paso 2 (enfocado), empezá a grabar",
      body:
        "Enfocá airodump-ng en Vecino-2G y grabá en el archivo 'captura'. Dejá este 'oído' puesto: acá va a caer el handshake.",
      command: "airodump-ng --bssid E8:94:F6:77:88:04 -c 6 -w captura wlan0mon",
      explain:
        "airodump-ng ahora escucha solo a Vecino-2G y escribe captura-01.cap. Todavía no tenés el handshake (nadie se reconectó). Para no esperar a que un cliente se reconecte solo, en el próximo paso lo vas a forzar con un deauth.",
      diagram: "wifi",
    },
    {
      kind: "concept",
      title: "Paso 3: el deauth fuerza el handshake",
      body:
        "El handshake solo viaja cuando un cliente SE CONECTA. Para no esperar, aireplay-ng manda paquetes de 'deautenticación' que echan por un instante al cliente. Al reconectarse automáticamente, su 4-way handshake vuela por el aire… y tu airodump lo captura. Esto SÍ es detectable: una lluvia de deauth es una firma clásica de ataque WiFi.",
      diagram: "handshake",
      bullets: [
        "aireplay-ng --deauth expulsa al cliente; al volver, hace el handshake.",
        "Necesita un cliente asociado (sin cliente, nada que expulsar).",
        "Es RUIDOSO: los deauth se detectan; WPA3 (802.11w) los bloquea.",
      ],
    },
    {
      kind: "quiz",
      prompt: "En la red ABIERTA del café intentás capturar un handshake con deauth. ¿Qué pasa?",
      options: [
        "No hay handshake WPA que capturar: una red abierta no cifra, se espía en claro directamente",
        "Se captura igual y se crackea la clave",
        "El deauth revela la clave al instante",
        "La red se vuelve WPA2 automáticamente",
      ],
      correct: 0,
      explain:
        "El 4-way handshake existe porque hay una clave WPA que negociar. Una red abierta no tiene clave ni cifrado, así que no hay handshake que capturar ni clave que romper: su tráfico ya viaja en claro y se lee directamente. El ataque de handshake es solo para redes WPA2/WPA.",
      diagram: "handshake",
    },
    {
      kind: "build",
      goal: "Armar el deauth de aireplay-ng: 5 paquetes contra el BSSID de Vecino-2G, por la interfaz de monitor",
      pieces: ["aireplay-ng", "--deauth", "5", "-a", "E8:94:F6:77:88:04", "wlan0mon", "-c"],
      answer: ["aireplay-ng", "--deauth", "5", "-a", "E8:94:F6:77:88:04", "wlan0mon"],
      hint: "aireplay-ng, después --deauth con la cantidad (5), luego -a con el BSSID del objetivo, y al final la interfaz wlan0mon.",
      explain:
        "aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon envía 5 tandas de deautenticación al objetivo (-a marca el BSSID del AP). El cliente se reconecta y su handshake queda capturado en tu .cap. Con eso ya tenés lo único que aircrack necesita.",
    },
    {
      kind: "lab",
      title: "Practicá: paso 3, forzá el handshake",
      body:
        "Lanzá el deauth contra Vecino-2G para forzar la reconexión del cliente y capturar el handshake.",
      command: "aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon",
      explain:
        "aireplay-ng expulsó al cliente y, al reconectarse, se capturó el 4-way handshake de Vecino-2G. Ya tenés la 'prueba' guardada. Recordá: esto dejó rastro (deauth = ruido detectable). Ahora viene el único paso que se hace sin tocar la red: crackear offline.",
      diagram: "handshake",
    },
    {
      kind: "concept",
      title: "Paso 4: aircrack contra el handshake",
      body:
        "Con el handshake capturado, aircrack-ng prueba un diccionario (rockyou.txt) contra él, offline, en tu máquina. Si la clave está en la lista, la encuentra. Dos lecciones que vas a ver en vivo:\n\n• Una clave DÉBIL como 'invitado' (la de Vecino-2G) cae enseguida: está en rockyou.\n• WPA3 NO cae a este ataque: usa SAE, que no permite el diccionario offline. Y una clave larga y aleatoria aguanta aunque captures su handshake.",
      diagram: "fuerzabruta",
      bullets: [
        "aircrack-ng -w rockyou.txt <captura.cap> → prueba el diccionario offline.",
        "Clave en el diccionario → cae. Clave larga fuera del diccionario → resiste.",
        "WPA3 (SAE) no se ataca así: por eso es el consejo.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: la cadena completa, de una",
      body:
        "Ahora encadenás los cuatro pasos en un solo comando (unidos con &&): modo monitor, captura enfocada, deauth para forzar el handshake y, al final, aircrack sobre el captura-01.cap que quedó grabado. Así ves la cadena entera funcionando de punta a punta.",
      command:
        "airmon-ng start wlan0 && airodump-ng --bssid E8:94:F6:77:88:04 -c 6 -w captura wlan0mon && aireplay-ng --deauth 5 -a E8:94:F6:77:88:04 wlan0mon && aircrack-ng -w rockyou.txt captura-01.cap",
      explain:
        "KEY FOUND! [ invitado ]: la cadena completa (airmon → airodump → aireplay → aircrack) rompió la clave de Vecino-2G y capturaste ND{wifi_wpa_crackeada}. Cayó porque 'invitado' es una palabra común que está en rockyou.txt. Con una clave larga y aleatoria, aircrack habría probado todo el diccionario sin encontrarla. Fijate que aircrack necesita el handshake que grabaron los pasos anteriores: por eso van encadenados con &&.",
      diagram: "fuerzabruta",
    },
    {
      kind: "concept",
      title: "Cómo se defiende una red WiFi",
      body:
        "Rompiste un WPA2 débil; ahora sabés exactamente cómo blindarlo:\n\n• Clave LARGA y aleatoria (12+ caracteres, fuera de todo diccionario): aunque capturen el handshake, no la sacan.\n• Usá WPA3 si podés: su handshake (SAE) no se ataca con diccionario offline.\n• Activá 802.11w (Protected Management Frames): bloquea el deauth, así no te fuerzan el handshake.\n• Y lo más importante: reportá lo que encontrás. Un hacker ético avisa y explica el arreglo; no abusa.",
      diagram: "escudo",
      bullets: [
        "Clave larga + aleatoria = handshake inútil para el atacante.",
        "WPA3 + 802.11w = ni deauth ni diccionario offline.",
        "Encontraste una red débil (con permiso): reportala y ayudá a arreglarla.",
      ],
    },
    {
      kind: "lab",
      title: "Capstone: operación WiFi completa",
      body:
        "Uní toda la cadena en una sola operación guiada contra una red autorizada (Vecino-2G): modo monitor → escuchar el aire → capturar el handshake con un deauth → crackearlo con diccionario. Te va a preguntar qué ves en cada etapa. Tocá para arrancar en la terminal. (Solo en tu red o con permiso escrito.)",
      command: "learn l-eng-wifi",
      explain:
        "Cadena real de aircrack-ng: airmon-ng → airodump-ng → aireplay-ng (deauth) → aircrack-ng, culminando en ND{wifi_wpa_crackeada}. Entenderla te muestra por qué WPA3 y una frase larga cambian todo.",
      diagram: "wifi",
    },
  ],
};

/**
 * Cursos del módulo "wifi".
 */
export const WIFI_COURSES: Curso[] = [
  WIFI_COMO_FUNCIONA,
  WIFI_AIRCRACK,
];
