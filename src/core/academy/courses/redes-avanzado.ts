import type { Curso } from "../courseTypes";

/**
 * Módulo "Redes avanzadas". Profundiza el reconocimiento y el análisis de red
 * más allá del nivel introductorio, ligado a herramientas reales del motor:
 * el sniffer (sniff/nandeshark/tcpdump/tshark con credenciales y streams
 * reales), el escaneo (nmap con sus tipos), el ruteo (traceroute) y la tabla
 * ARP (arp). Enseña a LEER la red por dentro, no solo a correr un comando.
 */

const REDES_TRAFICO: Curso = {
  id: "c-redes-trafico",
  title: "Análisis de tráfico: leer la red por dentro",
  subtitle: "Capturar, filtrar y reconstruir conversaciones: de un volcado de paquetes a credenciales, streams y patrones de malware.",
  level: "avanzado",
  skill: "redes",
  hue: 150,
  glyph: "search",
  reward: { xp: 290, coins: 230 },
  slides: [
    {
      kind: "concept",
      title: "El paquete es la unidad de la verdad",
      body:
        "Cuando algo 'anda raro' en una red, la respuesta está en los PAQUETES. Capturar tráfico (con tcpdump en consola o Wireshark/NandeShark con interfaz) te deja ver la conversación real byte a byte, sin intermediarios que la interpreten por vos. Un volcado se guarda en un archivo .pcap que podés analizar después. Saber leer una captura es una de las habilidades más transferibles de la seguridad: sirve para atacar (interceptar), para defender (detectar) y para depurar (entender qué pasó de verdad).",
      diagram: "sniffer",
      bullets: [
        "Capturar = ver la conversación real, paquete por paquete.",
        "Se guarda en .pcap para analizar con calma.",
        "Leer tráfico sirve para atacar, defender y depurar.",
      ],
    },
    {
      kind: "concept",
      title: "Filtros: encontrar la aguja",
      body:
        "Una captura de un minuto trae miles de paquetes. El arte es FILTRAR. Hay dos niveles: los filtros de CAPTURA (BPF, deciden qué se graba: 'port 80', 'host 10.0.0.5') y los de VISUALIZACIÓN (de Wireshark, deciden qué se muestra de lo ya grabado: 'http.request', 'tcp.flags.syn==1'). Dominar los filtros convierte un mar de ruido en la conversación exacta que te importa. Sin filtros, una captura es inmanejable; con ellos, es un bisturí.",
      diagram: "sniffer",
      bullets: [
        "Filtros de captura (BPF): qué se GRABA (port 80, host X).",
        "Filtros de visualización: qué se MUESTRA de lo grabado.",
        "Sin filtros no hay análisis: son el bisturí.",
      ],
    },
    {
      kind: "concept",
      title: "Seguir el stream y cosechar lo que viaja en claro",
      body:
        "TCP parte los datos en muchos paquetes; 'seguir el stream' los vuelve a unir en la conversación completa (la petición HTTP entera, el intercambio de un login). Si el protocolo va EN CLARO (HTTP, FTP, Telnet, SMTP sin TLS), ahí aparecen usuarios y contraseñas tal cual se escribieron. Por eso el sniffing fue históricamente tan potente: en una red sin cifrar, quien captura, cosecha. Y por eso HTTPS/TLS en todos lados cambió el juego: ahora el contenido viaja cifrado y el sniffer solo ve metadatos.",
      diagram: "sniffer",
      bullets: [
        "Reensamblar el stream = ver la conversación completa.",
        "Protocolos en claro (HTTP/FTP/Telnet) regalan credenciales.",
        "TLS en todos lados: el sniffer ya solo ve metadatos.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Capturás tráfico de una víctima que se loguea por HTTP (sin S). ¿Qué podés ver?",
      options: [
        "El usuario y la contraseña en claro, tal como viajaron",
        "Nada, siempre está cifrado",
        "Solo el color de la página",
        "La huella digital del navegador y nada más",
      ],
      correct: 0,
      explain:
        "HTTP sin TLS viaja en texto plano: usuario y contraseña se leen directamente en la captura. Con HTTPS, ese mismo login va cifrado y el sniffer solo ve con quién se habla (por el SNI) y cuánto, no el contenido. Esa diferencia es exactamente por qué se empujó HTTPS a todas partes.",
      diagram: "sniffer",
    },
    {
      kind: "lab",
      title: "Capturá tráfico de la red",
      body: "Poné a escuchar el sniffer y mirá qué pasa por el segmento. Es tu ventana a la conversación real de la red.",
      command: "nandeshark",
      explain:
        "NandeShark captura el tráfico del segmento. Si alguien manda algo en claro, va a aparecer. Revisá específicamente las credenciales cosechadas con `sniff creds` y reconstruí una conversación con `sniff follow <host>`. Es análisis de tráfico real sobre el estado del mundo, no un volcado inventado.",
      diagram: "sniffer",
    },
    {
      kind: "lab",
      title: "Cosechá credenciales en claro",
      body: "Pedile al sniffer las credenciales que vio viajar sin cifrar. Es la demostración directa de por qué el texto plano es peligroso.",
      command: "sniff creds",
      explain:
        "El sniffer lista las credenciales que capturó en claro (si alguna viajó). La lección es contundente: lo que no va por TLS, cualquiera en el camino lo lee. Del lado defensor, esto es exactamente lo que buscás evitar forzando HTTPS y segmentando la red para que no cualquiera pueda capturar.",
      diagram: "sniffer",
    },
    {
      kind: "concept",
      title: "Cuando todo está cifrado: metadatos y patrones",
      body:
        "Con TLS no ves el contenido, pero el ANÁLISIS no termina: los metadatos hablan. El SNI del handshake TLS suele revelar a qué dominio te conectás; los tamaños y tiempos de los paquetes delatan qué tipo de actividad es (un video vs. un chat). En defensa, esto permite cazar malware: un implante que 'llama a casa' genera BEACONING — conexiones pequeñas y regulares a un mismo destino, como un latido. Detectar ese patrón rítmico en el tráfico, aunque esté cifrado, es una técnica central de la caza de amenazas.",
      diagram: "sniffer",
      bullets: [
        "El SNI del TLS suele revelar el dominio destino.",
        "Tamaños y tiempos delatan el tipo de actividad.",
        "Beaconing: conexiones chicas y regulares = posible malware.",
      ],
    },
    {
      kind: "concept",
      title: "Del paquete a la decisión",
      body:
        "Analizar tráfico no es un fin: es para DECIDIR. ¿Esa conexión rara es un backup legítimo o una exfiltración? ¿Ese pico es un usuario o un escaneo? Un buen analista construye una línea base de lo 'normal' para que lo anómalo salte. Herramientas: tcpdump para captura rápida en servidores sin interfaz, tshark para automatizar y extraer campos, Wireshark para el análisis visual profundo, y Zeek/Suricata para convertir tráfico en registros y alertas a escala. La captura es el dato crudo; el valor está en la pregunta que le hacés.",
      diagram: "siem",
      bullets: [
        "Construí una línea base: lo anómalo se detecta contra lo normal.",
        "tcpdump (rápido), tshark (automatizar), Wireshark (visual), Zeek/Suricata (escala).",
        "El tráfico es el dato; el valor está en la pregunta.",
      ],
    },
  ],
};

const REDES_PROTOCOLOS: Curso = {
  id: "c-redes-protocolos",
  title: "TCP/IP por dentro: del handshake al escaneo sigiloso",
  subtitle: "Cómo funciona de verdad una conexión y por qué eso define cada tipo de escaneo, la detección de SO y la evasión de firewalls.",
  level: "avanzado",
  skill: "redes",
  hue: 170,
  glyph: "search",
  reward: { xp: 290, coins: 230 },
  slides: [
    {
      kind: "concept",
      title: "El saludo de tres vías",
      body:
        "Toda conexión TCP empieza con un apretón de manos de tres pasos: el cliente manda SYN ('¿hablamos?'), el servidor responde SYN-ACK ('dale, ¿hablamos?') y el cliente cierra con ACK ('hecho'). Recién ahí fluyen los datos. Esos mensajes llevan FLAGS (banderas: SYN, ACK, FIN, RST, PSH, URG) que son el vocabulario de TCP. Entender el handshake no es trivia: es la base para entender por qué los escaneos funcionan como funcionan y cómo un firewall decide qué pasa.",
      diagram: "handshake",
      bullets: [
        "SYN → SYN-ACK → ACK: el saludo de tres vías.",
        "Las flags (SYN/ACK/FIN/RST…) son el vocabulario de TCP.",
        "El handshake explica cómo funcionan escaneos y firewalls.",
      ],
    },
    {
      kind: "concept",
      title: "Por qué un SYN scan es sigiloso",
      body:
        "El escaneo SYN (-sS en nmap) aprovecha el handshake: manda el SYN y, si el puerto está abierto, el objetivo responde SYN-ACK… pero el escáner NO completa con ACK, sino que corta con RST. La conexión nunca se establece del todo, así que muchas aplicaciones ni la registran: por eso se lo llamó 'half-open' o sigiloso. Si el puerto está cerrado, la respuesta es un RST directo. Leer la respuesta (SYN-ACK = abierto, RST = cerrado, silencio = filtrado) es, literalmente, interpretar las flags del handshake.",
      diagram: "handshake",
      bullets: [
        "SYN scan: manda SYN, ve la respuesta, corta con RST (no completa).",
        "SYN-ACK = abierto; RST = cerrado; silencio = filtrado.",
        "'Half-open': muchas apps ni lo registran.",
      ],
    },
    {
      kind: "concept",
      title: "Escaneos exóticos: FIN, NULL y Xmas",
      body:
        "De las reglas de TCP salen escaneos ingeniosos. Los escaneos FIN, NULL y XMAS mandan paquetes 'ilegales' (un FIN suelto, ningún flag, o FIN+PSH+URG encendidos como un arbolito). Según el estándar, un puerto CERRADO debe responder RST y uno ABIERTO debe ignorarlos. Eso permite inferir el estado SIN hacer un SYN, evadiendo firewalls o IDS que solo vigilan SYN. ¿El truco? Depende de que el sistema respete el estándar: Windows no lo hace igual que Linux, y esa diferencia de comportamiento también sirve para ADIVINAR el sistema operativo.",
      diagram: "escaneo",
      bullets: [
        "FIN/NULL/Xmas: paquetes raros que explotan el estándar TCP.",
        "Cerrado responde RST; abierto los ignora → inferís el estado.",
        "La respuesta varía por SO: sirve para fingerprinting.",
      ],
    },
    {
      kind: "quiz",
      prompt: "En un SYN scan, el objetivo responde SYN-ACK a tu SYN. ¿Qué significa y qué hace el escáner?",
      options: [
        "El puerto está abierto; el escáner corta con RST sin completar la conexión",
        "El puerto está cerrado; el escáner reintenta",
        "El host está apagado",
        "Significa que ya te detectaron y bloquearon",
      ],
      correct: 0,
      explain:
        "SYN-ACK es el servidor diciendo 'puerto abierto, sigamos'. El escáner sigiloso no completa el handshake (no manda el ACK final): manda un RST para abortar. Así confirma que está abierto sin establecer la conexión completa, dejando menos rastro que un escaneo connect.",
      diagram: "handshake",
    },
    {
      kind: "lab",
      title: "Escaneá viendo el protocolo",
      body: "Corré un escaneo de versión sobre un host y pensá cada línea como el resultado de un handshake: cada puerto 'abierto' respondió SYN-ACK.",
      command: "nmap -sV server.nande",
      explain:
        "Cada puerto abierto que ves respondió al saludo; para cada uno, nmap además dialogó un poco más para sacar la versión del servicio (-sV). Ahora entendés qué pasa por debajo: no es magia, es TCP. Con privilegios, `-sS` haría ese mismo escaneo en modo sigiloso (half-open).",
      diagram: "escaneo",
    },
    {
      kind: "concept",
      title: "Fragmentación y evasión de firewalls",
      body:
        "Los firewalls e IDS inspeccionan paquetes, así que los atacantes juegan con cómo se arman. La FRAGMENTACIÓN parte el paquete en pedazos chiquitos para que una regla que busca una firma no la vea completa (nmap -f). Otros trucos: paquetes señuelo (-D) para esconder tu IP real entre varias falsas, cambiar el puerto de origen a uno 'confiable' (53, 80), o ajustar el timing (-T0/-T1) para pasar bajo el radar de un IDS que detecta ráfagas. No son magia: explotan que el defensor inspecciona de cierta forma. Y el defensor, a su vez, reensambla y correlaciona para no caer.",
      diagram: "firewall",
      bullets: [
        "Fragmentar (-f): partir el paquete para evadir firmas.",
        "Señuelos (-D), puerto de origen 'confiable', timing lento.",
        "Es un juego de gato y ratón: el IDS reensambla y correlaciona.",
      ],
    },
    {
      kind: "concept",
      title: "Traceroute y el TTL",
      body:
        "¿Cómo sabés el CAMINO hasta un host? Con traceroute, que explota un campo del paquete IP: el TTL (time to live), un contador que baja en uno por cada router que cruza. Traceroute manda paquetes con TTL=1, 2, 3… Cada router donde el TTL llega a cero devuelve un error ICMP revelando su IP. Así se dibuja la ruta salto por salto. Para un atacante, eso mapea la topología (dónde están los firewalls, por dónde se enruta); para un operador, diagnostica dónde se corta una conexión. Un campo pensado para evitar loops terminó siendo una herramienta de reconocimiento.",
      diagram: "capas",
      bullets: [
        "TTL baja en 1 por cada router: traceroute lo explota.",
        "Cada salto devuelve ICMP y revela su IP: ruta salto por salto.",
        "Mapea topología (ataque) y diagnostica cortes (operación).",
      ],
    },
    {
      kind: "lab",
      title: "Trazá el camino a un host",
      body: "Seguí la ruta hasta un host y mirá los saltos. Cada línea es un router que delató su IP cuando su TTL llegó a cero.",
      command: "traceroute server.nande",
      explain:
        "Ves los saltos hasta el destino: así se mapea por dónde va tu tráfico. Cada salto apareció porque le venció el TTL y devolvió un ICMP. Entender el TTL te explica también técnicas de evasión y por qué algunos hosts 'no responden' al traceroute (filtran ICMP a propósito).",
      diagram: "capas",
    },
  ],
};

export const REDES_AVANZADO_COURSES: Curso[] = [
  REDES_TRAFICO,
  REDES_PROTOCOLOS,
];
