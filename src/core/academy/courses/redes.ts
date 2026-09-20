import type { Curso } from "../courseTypes";

/**
 * Cursos del módulo "redes". De cómo viaja un paquete al arte de espiarlo y de
 * mapear qué servicios expone una máquina. Todo ligado a comandos REALES del
 * mundo ÑANDE: ip/ifconfig, ping, curl, nmap, services y el sniffer NandeShark
 * (sniff creds / sniff follow), contra hosts que existen de verdad.
 */

/* ------------------------------------------------------------------ *
 *  CURSO 1 — Redes por dentro: TCP/IP                                *
 * ------------------------------------------------------------------ */

const TCPIP: Curso = {
  id: "c-redes-tcpip",
  title: "Redes por dentro: TCP/IP",
  subtitle: "Paquetes, el saludo de 3 pasos, IP vs MAC y subredes básicas.",
  level: "intermedio",
  skill: "redes",
  hue: 210,
  glyph: "trend",
  reward: { xp: 170, coins: 125 },
  slides: [
    {
      kind: "concept",
      title: "Todo viaja en paquetes",
      body:
        "Cuando mandás algo por la red —un mensaje, una foto, una página— no viaja de una sola pieza. Se corta en pedacitos chiquitos llamados paquetes, y cada paquete viaja por su cuenta hasta el destino, donde se vuelven a armar en orden. Cada paquete lleva una etiqueta con de dónde sale y a dónde va. Toda la red, e Internet entera, es esto: millones de paquetitos yendo y viniendo.",
      diagram: "capas",
      bullets: [
        "Un mensaje grande se parte en muchos paquetes.",
        "Cada paquete lleva su origen y su destino.",
        "Llegan y se rearman en orden del otro lado.",
      ],
    },
    {
      kind: "concept",
      title: "TCP: el saludo de 3 pasos",
      body:
        "Antes de mandarse datos, dos máquinas se saludan para asegurarse de que la otra está y escucha. Ese saludo (el 'three-way handshake' de TCP) son tres pasos:\n\n1. El cliente dice SYN ('¿estás?').\n2. El servidor contesta SYN-ACK ('sí, ¿y vos?').\n3. El cliente cierra con ACK ('dale, listo').\n\nRecién ahí empieza a viajar la información. Es como llamar por teléfono: '¿hola?' / '¿hola, me escuchás?' / 'sí, te escucho'.",
      diagram: "handshake",
      bullets: [
        "SYN → SYN-ACK → ACK, siempre en ese orden.",
        "Sirve para confirmar que ambos están y se escuchan.",
        "Sin handshake completo, no hay conexión TCP.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Cuál es el orden correcto del saludo de 3 pasos (handshake) que abre una conexión TCP?",
      options: [
        "SYN → SYN-ACK → ACK",
        "ACK → SYN → FIN",
        "SYN-ACK → SYN → ACK",
        "PING → PONG → OK",
      ],
      correct: 0,
      explain:
        "El cliente manda SYN ('quiero conectar'), el servidor responde SYN-ACK ('recibido, y yo también quiero') y el cliente confirma con ACK ('hecho'). Esos tres pasos abren el canal. Los escáneres de puertos, como nmap, empiezan justo este saludo para ver si del otro lado hay alguien que conteste.",
      diagram: "handshake",
    },
    {
      kind: "concept",
      title: "IP vs MAC: dos direcciones distintas",
      body:
        "Cada equipo tiene DOS direcciones y conviene no confundirlas. La IP (ej. 10.10.0.5) es la dirección dentro de UNA red: te la asigna la red a la que te conectás, y cambia si te mudás a otra. La MAC (ej. 02:00:00:00:00:10) viene grabada de fábrica en la placa de red y viaja pegada al equipo. Regla simple: la IP dice DÓNDE estás; la MAC dice QUIÉN sos físicamente.",
      diagram: "ip",
      bullets: [
        "IP = dirección en la red actual (cambia según la red).",
        "MAC = número de fábrica de la placa (viaja con el equipo).",
        "IP = dónde estás · MAC = quién sos.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: mirá tus dos direcciones",
      body:
        "El comando 'ip addr' te muestra tus interfaces de red con sus datos. Corrélo y buscá dos cosas en la salida: 'inet' (tu IP) y 'ether' (tu MAC).",
      command: "ip addr",
      explain:
        "Ahí están las dos: inet 10.10.0.5 es tu IP (tu lugar en ESTA red), y ether 02:00:00:00:00:10 es tu MAC (grabada en la placa). También ves el 'netmask', que define el tamaño de tu red. Un atacante que ya está adentro corre esto para entender en qué red cayó y quiénes son sus vecinos.",
      diagram: "ip",
    },
    {
      kind: "quiz",
      prompt: "Llevás tu notebook de casa a la escuela y te conectás a otro WiFi. ¿Qué dirección cambia y cuál no?",
      options: [
        "Cambia la IP; la MAC sigue igual",
        "Cambia la MAC; la IP sigue igual",
        "Cambian las dos",
        "No cambia ninguna",
      ],
      correct: 0,
      explain:
        "La IP te la da CADA red a la que te conectás, así que en la escuela tenés una IP distinta que en casa. La MAC está grabada en la placa de red de fábrica y viaja con el equipo, así que sigue igual. Por eso la MAC identifica a un dispositivo puntual… y por eso los atacantes a veces la falsean (macchanger) para no dejar rastro.",
      diagram: "ip",
    },
    {
      kind: "concept",
      title: "Subredes: la máscara /24",
      body:
        "Una IP como 10.10.0.5 tiene dos partes: cuál es la RED y cuál es el EQUIPO dentro de esa red. Eso lo decide la máscara. La más común es /24 (o 255.255.255.0): dice que los primeros tres números (10.10.0) son la red, y el último (5) identifica al equipo. O sea, 10.10.0.1 hasta 10.10.0.254 son vecinos de la misma red. Entender esto te dice a quiénes tenés al lado para escanear.",
      diagram: "ip",
      bullets: [
        "/24 = los 3 primeros números son la red; el último, el equipo.",
        "10.10.0.x → todos vecinos de la misma subred.",
        "La máscara define quién es 'del barrio' y quién no.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: mirá tu red con ifconfig",
      body:
        "ifconfig es el comando clásico para ver tus interfaces. Corrélo y fijate el 'netmask': ese número te dice el tamaño de tu subred.",
      command: "ifconfig",
      explain:
        "Ves tu IP, tu MAC (ether) y el netmask. Con la IP y la máscara ya podés calcular el rango de tu subred, o sea qué otras máquinas están 'en tu barrio' y podrías descubrir. Reconocer tu propia red es el paso previo a escanear a los vecinos con nmap.",
      diagram: "ip",
    },
    {
      kind: "concept",
      title: "¿Está viva? ping y el eco",
      body:
        "ping le manda a otra máquina un paquetito de '¿estás ahí?' y espera el eco de vuelta, como tocar el timbre y escuchar si contestan. Si vuelve respuesta, la máquina está encendida y alcanzable desde donde estás. Si no vuelve nada, o está apagada, o un firewall te tapa, o no hay ruta hasta ella. Es la primera pregunta de todo reconocimiento: ¿esta IP responde?",
      diagram: "capas",
      bullets: [
        "ping <host> → '¿estás?' y espera el eco.",
        "Responde → viva y alcanzable.",
        "No responde → apagada, filtrada por firewall, o sin ruta.",
      ],
    },
    {
      kind: "build",
      goal: "Comprobar si la máquina server.nande está viva y responde",
      pieces: ["ping", "server.nande", "nmap", "10.10.0.42"],
      answer: ["ping", "server.nande"],
      hint: "El comando que 'toca el timbre' es ping, seguido del nombre (o la IP) de la máquina que querés probar.",
      explain:
        "ping server.nande le manda ecos a esa máquina. nmap era un señuelo: escanea PUERTOS (un paso más avanzado), no solo pregunta si está viva. Y 10.10.0.42 es justamente la IP de server.nande, así que 'ping 10.10.0.42' también funcionaría: ping acepta tanto el nombre como la IP.",
    },
    {
      kind: "lab",
      title: "Practicá: tocá el timbre de server.nande",
      body:
        "Hacele ping a server.nande y mirá si contesta. Vas a ver los paquetes de ida y el resumen de cuántos volvieron.",
      command: "ping server.nande",
      explain:
        "server.nande contestó: '3 packets transmitted, 3 received, 0% packet loss'. Está viva y alcanzable. Ese '0% de pérdida' es la luz verde para seguir: ahora que sabés que responde, el próximo paso natural es escanearle los puertos para ver qué servicios ofrece. Reconocer siempre va de menos a más: ¿está viva? → ¿qué puertas tiene? → ¿qué corre detrás?",
      diagram: "capas",
    },
    {
      kind: "concept",
      title: "Repaso: el viaje de un paquete",
      body:
        "Ya tenés el mapa mental de cómo funciona una red por dentro:\n\n1. Los datos viajan cortados en PAQUETES, cada uno con origen y destino.\n2. TCP abre la conexión con el saludo de 3 pasos (SYN, SYN-ACK, ACK).\n3. Cada equipo tiene una IP (dónde está) y una MAC (quién es).\n4. La máscara (/24) define quiénes son vecinos de la misma subred.\n5. ping confirma si una máquina está viva antes de tocar nada.\n\nCon esto entendido, el próximo paso es el más jugoso: aprender a ESPIAR esos paquetes en el cable.",
      diagram: "capas",
      bullets: [
        "Paquetes → handshake → IP/MAC → subred → ping.",
        "Reconocer la red es la mitad del trabajo de seguridad.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 2 — Espiar el tráfico (sniffing)                            *
 * ------------------------------------------------------------------ */

const CAPTURA: Curso = {
  id: "c-redes-captura",
  title: "Espiar el tráfico (sniffing)",
  subtitle: "Capturá paquetes con NandeShark y mirá por qué HTTP filtra y HTTPS no.",
  level: "intermedio",
  skill: "redes",
  hue: 280,
  glyph: "eye",
  reward: { xp: 185, coins: 140 },
  slides: [
    {
      kind: "concept",
      title: "¿Qué es sniffing?",
      body:
        "Sniffing (de 'sniff', olfatear) es escuchar el tráfico que pasa por una red y leerlo. Cuando muchos equipos comparten una red, sus paquetes andan dando vueltas por el mismo cable o el mismo aire. Un sniffer es un programa que los agarra al vuelo y te los muestra: quién habló con quién, qué protocolo usaron y —a veces— qué dijeron exactamente. Es la herramienta que hace VISIBLE lo que normalmente no ves.",
      diagram: "sniffer",
      bullets: [
        "Sniffing = capturar y leer el tráfico de la red.",
        "Sirve para diagnosticar problemas… y para espiar.",
        "Hace visible lo que viaja por el cable.",
      ],
    },
    {
      kind: "concept",
      title: "NandeShark: solo ve tráfico REAL",
      body:
        "En ÑANDE el sniffer se llama NandeShark, y se usa con el comando 'sniff'. No inventa nada: captura el tráfico que DE VERDAD generás vos y el mundo. Si no hay tráfico, no muestra nada. Los comandos clave son:\n\n• sniff → los últimos paquetes capturados.\n• sniff creds → las credenciales que viajaron en claro.\n• sniff follow <ip> → toda la charla con una máquina.\n\nPrimero se genera tráfico (navegando, con curl, con un login), y después se mira lo capturado.",
      diagram: "protocolo",
      bullets: [
        "El comando es 'sniff' (NandeShark).",
        "Solo captura tráfico real: primero generalo, después miralo.",
        "sniff creds muestra contraseñas vistas en claro.",
      ],
    },
    {
      kind: "concept",
      title: "HTTP se lee, HTTPS no",
      body:
        "Acá está el corazón del asunto. HTTP manda TODO en texto plano: si un formulario envía tu contraseña por HTTP, viaja tal cual, y cualquier sniffer en el camino la lee. HTTPS, en cambio, cifra el contenido antes de mandarlo: el sniffer ve que hay tráfico, pero solo un revoltijo ilegible. Ese candado del navegador (HTTPS) es literalmente lo que impide que te espíen la clave. Sin él, estás en bolas en la red.",
      diagram: "protocolo",
      bullets: [
        "HTTP = texto plano: el sniffer lee todo, incluida la clave.",
        "HTTPS = cifrado: el sniffer solo ve un revoltijo.",
        "El candado del navegador = tu tráfico va cifrado.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué un sniffer puede LEER una contraseña que viaja por HTTP, pero NO una que viaja por HTTPS?",
      options: [
        "Porque HTTP manda todo en texto plano y HTTPS lo manda cifrado",
        "Porque HTTP es más rápido que HTTPS",
        "Porque HTTPS no usa la red para nada",
        "Porque el sniffer se rompe con HTTPS",
      ],
      correct: 0,
      explain:
        "HTTP escribe todo 'en claro': quien mire el cable lee la contraseña tal cual se escribió. HTTPS cifra el contenido antes de que salga, así que el sniffer solo ve caracteres sin sentido. Por eso el candado (HTTPS) importa tanto: sin él, cualquiera en la misma red —una escuela, un café— podría estar leyéndote.",
      diagram: "protocolo",
    },
    {
      kind: "lab",
      title: "Practicá: pescá una clave en claro",
      body:
        "Vamos a hacer dos cosas encadenadas con ';' : primero mandar un login por HTTP al banco (curl), y después preguntarle a NandeShark qué credenciales vio pasar (sniff creds). Mirá bien la salida final.",
      command: "curl -X POST http://banco.nande/login -d \"usuario=admin&password=girasol77\" ; sniff creds",
      explain:
        "NandeShark te muestra 'password=girasol77': la contraseña que mandaste viajó en claro porque el login usa HTTP, y el sniffer la pescó del cable tal cual. Esto no es un truco de magia: es lo que pasa de verdad en cualquier sitio sin HTTPS. La defensa es directa: si ese login usara HTTPS, el sniffer no habría visto más que basura cifrada.",
      diagram: "sniffer",
    },
    {
      kind: "concept",
      title: "Seguir el stream: rearmar la charla",
      body:
        "Un solo paquete cuenta poco. Lo potente es reconstruir toda la conversación entre dos máquinas, en orden: quién dijo qué y cuándo. Eso se llama seguir el stream, y en ÑANDE se hace con 'sniff follow <ip>'. Ojo: se sigue por IP, no por nombre. Recordá del reconocimiento que banco.nande vive en la IP 10.10.7.10 (el DNS traduce el nombre a ese número). Así que para seguir su charla, usás la IP.",
      diagram: "capas",
      bullets: [
        "sniff follow <ip> → rearma toda la conversación con esa máquina.",
        "Se sigue por IP: banco.nande = 10.10.7.10.",
        "Ves ida y vuelta, en orden, como leer un chat.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: seguí la conversación con el banco",
      body:
        "Generá tráfico visitando el banco (curl) y después seguí toda la charla con su IP. Vas a ver los paquetes que fueron y volvieron entre vos y el servidor.",
      command: "curl http://banco.nande/ ; sniff follow 10.10.7.10",
      explain:
        "NandeShark rearmó el 'stream': ves tu pedido saliendo de tu IP (10.10.0.5) hacia el banco (10.10.7.10) y su respuesta volviendo. Seguir un stream así es lo que hace un analista para entender un ataque completo, o lo que hace un atacante para reconstruir qué mandó una víctima. Todo lo capturado antes (como el login del paso anterior) también aparece en esta charla.",
      diagram: "sniffer",
    },
    {
      kind: "build",
      goal: "Seguir toda la conversación capturada con la máquina del banco (IP 10.10.7.10)",
      pieces: ["sniff", "follow", "10.10.7.10", "banco.nande", "creds"],
      answer: ["sniff", "follow", "10.10.7.10"],
      hint: "El comando es sniff, después la palabra follow (seguir), y al final la IP de la máquina (no el nombre).",
      explain:
        "sniff follow 10.10.7.10 rearma la conversación con esa máquina. 'banco.nande' era la trampa: el follow se hace por IP, no por nombre, porque en el cable los paquetes van etiquetados con números. Y 'creds' es otro subcomando (muestra solo las claves), no parte de este. Detalle fino que separa a quien entendió de quien copió.",
    },
    {
      kind: "quiz",
      prompt: "El banco arregla su login y ahora lo sirve por HTTPS. Corrés el sniffer de nuevo. ¿Qué ves de la contraseña?",
      options: [
        "Nada útil: viaja cifrada, solo se ve un revoltijo",
        "La contraseña igual, en claro",
        "La contraseña escrita al revés",
        "El sniffer deja de funcionar por completo",
      ],
      correct: 0,
      explain:
        "Con HTTPS el contenido va cifrado de punta a punta. El sniffer sigue viendo que HAY tráfico hacia el banco y a qué IP, pero NO puede leer qué mandaste: solo ve caracteres sin sentido. Esa es exactamente la defensa: cifrar para que espiar el cable ya no alcance para robar nada.",
      diagram: "protocolo",
    },
    {
      kind: "concept",
      title: "tcpdump: sniffing sin interfaz gráfica",
      body:
        "NandeShark es la vista visual; pero en un pentest real casi siempre estás en una consola remota (SSH), sin ventanas. Ahí se usa tcpdump: el sniffer de línea de comandos, el que hay en TODO Linux. Sus filtros se llaman BPF (Berkeley Packet Filter) y deciden QUÉ capturar:\n\n   tcpdump host banco.nande      solo tráfico de/hacia ese host\n   tcpdump src host 10.10.0.5    solo lo que SALE de esa IP\n   tcpdump port 80               solo el puerto 80 (HTTP)\n   tcpdump -A host banco.nande   -A muestra el payload en TEXTO\n   tcpdump -X ...                -X lo muestra en hexadecimal\n\nBPF es acotado a propósito: capturás sólo lo que te importa, no todo el diluvio.",
      diagram: "terminal",
      bullets: [
        "tcpdump = el sniffer universal de línea de comandos (siempre está).",
        "Filtros BPF: host / src host / dst host / port N / tcp — QUÉ capturar.",
        "-A = payload en texto (ves la clave en claro) · -X = hexadecimal.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: tcpdump con filtro BPF",
      body:
        "Encadenado con ';' : mandá un login por HTTP y capturá SOLO el tráfico del banco con tcpdump, mostrando el payload en texto (-A). Vas a ver la petición cruda, tal cual viajó.",
      command: "curl -X POST http://banco.nande/login -d \"usuario=admin&password=girasol77\" ; tcpdump -A host banco.nande",
      explain:
        "tcpdump filtró con BPF (host banco.nande) y con -A imprimió el pedido HTTP entero: la línea POST /login, los headers y el cuerpo usuario=admin&password=girasol77 en texto plano. Marcado con 🔓 porque lleva una credencial en claro. Eso es exactamente lo que ve un atacante en la misma red si el sitio no usa HTTPS.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "BPF vs display: dos filtros distintos",
      body:
        "Una confusión clásica que separa al que sabe: hay DOS lenguajes de filtro y NO son iguales.\n\n• Filtro de CAPTURA (BPF, el de tcpdump): decide qué paquetes se GUARDAN. Se aplica al capturar; lo que no matchea, se pierde para siempre.\n• Filtro de DISPLAY (el de Wireshark y tshark, con -Y): decide qué se MUESTRA de lo ya capturado. No borra nada; podés cambiarlo mil veces sobre la misma captura.\n\nEjemplos de display: http, dns, ip.addr==10.10.7.10, tcp.port==80, http.request.method==POST. Son mucho más ricos que BPF porque operan sobre paquetes ya disecados.",
      diagram: "capas",
      bullets: [
        "BPF (captura, tcpdump): qué se guarda — se decide ANTES.",
        "Display (-Y, Wireshark/tshark): qué se ve — se decide DESPUÉS, sin perder nada.",
        "Regla: capturá amplio (BPF laxo), analizá fino (display).",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: tshark, el Wireshark de consola",
      body:
        "tshark analiza la captura con filtros de DISPLAY. Generá tráfico y quedate solo con los POST (donde viajan los logins) usando -Y. Es el filtro de display, no BPF.",
      command: "curl -X POST http://banco.nande/login -d \"usuario=admin&password=girasol77\" ; tshark -Y \"http.request.method==POST\"",
      explain:
        "tshark mostró solo el paquete POST /login (el login), filtrando con el lenguaje de display de Wireshark. Probá también 'tshark -z io,phs' (jerarquía de protocolos) y 'tshark -z conv' (conversaciones): son las estadísticas que un analista mira primero para entender una captura grande de un vistazo.",
      diagram: "terminal",
    },
    {
      kind: "quiz",
      prompt: "Capturaste una hora de tráfico con 'tcpdump -w captura.pcap' sin filtro. Ahora querés ver SOLO los logins POST. ¿Qué usás?",
      options: [
        "Un filtro de DISPLAY en tshark/Wireshark (-Y http.request.method==POST): la captura ya está, ahora la filtrás para verla",
        "Un filtro BPF, pero ya es tarde: lo no capturado se perdió",
        "Volver a capturar todo de nuevo",
        "No se puede filtrar una captura ya guardada",
      ],
      correct: 0,
      explain:
        "Sobre una captura YA hecha, el filtro de display (-Y) es el que manda: reordenás y filtrás lo guardado cuantas veces quieras sin perder nada. El BPF sólo servía en el momento de capturar. Por eso la buena práctica es capturar amplio y después analizar fino con filtros de display.",
      diagram: "capas",
    },
    {
      kind: "concept",
      title: "Defensa: por eso hoy TODO va con HTTPS",
      body:
        "Lo que acabás de hacer explica por qué Internet migró casi entero a HTTPS. Un login, un mensaje o una cookie por HTTP es un regalo para cualquiera que esté sniffeando la red. Las defensas: usar siempre HTTPS (mirá el candado), desconfiar de WiFi públicos abiertos, y cuando la red no es confiable, meter todo en una VPN (un túnel cifrado). Un hacker ético que descubre tráfico en claro lo reporta para que lo cifren; no lo aprovecha.",
      diagram: "escudo",
      bullets: [
        "HTTPS por defecto: el candado no es decoración.",
        "WiFi público abierto = terreno de sniffers; usá VPN.",
        "Cifrar es la cura: convierte lo espiado en basura ilegible.",
      ],
    },
    {
      kind: "concept",
      title: "Repaso: aprendiste a ver lo invisible",
      body:
        "Ya sabés espiar (y por lo tanto defender) el tráfico:\n\n1. Sniffing es capturar y leer lo que viaja por la red.\n2. NandeShark (sniff) captura tráfico REAL: primero lo generás, después lo mirás.\n3. HTTP viaja en claro (sniff creds pesca las contraseñas); HTTPS va cifrado.\n4. sniff follow <ip> rearma la conversación completa con una máquina.\n5. La defensa es cifrar: HTTPS y VPN vuelven inútil al espía.\n\nVer lo invisible cambia todo: ahora entendés por qué tu profe insiste con el candadito.",
      diagram: "protocolo",
      bullets: [
        "Sniffear enseña a defender: cifrá lo que no querés que lean.",
        "Espiar sin permiso una red ajena es delito; acá practicás en el simulador.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 3 — Puertos y servicios en profundidad                      *
 * ------------------------------------------------------------------ */

const SERVICIOS: Curso = {
  id: "c-redes-servicios",
  title: "Puertos y servicios en profundidad",
  subtitle: "Puertos conocidos, banners y versiones: leé qué expone una máquina.",
  level: "intermedio",
  skill: "redes",
  hue: 130,
  glyph: "target",
  reward: { xp: 180, coins: 135 },
  slides: [
    {
      kind: "concept",
      title: "Los puertos conocidos (0–1023)",
      body:
        "Una IP es un edificio; cada puerto, una puerta numerada. Pero no son puertas al azar: hay un acuerdo mundial sobre qué servicio vive detrás de cada número bajo. A los del 0 al 1023 se los llama 'well-known' (bien conocidos), y todo el planeta los respeta: el 22 es SSH, el 80 es HTTP (web), el 443 es HTTPS (web segura), el 25 es correo, el 53 es DNS. Ver un puerto abierto ya te dice qué esperar detrás.",
      diagram: "puerto",
      bullets: [
        "22 = SSH · 80 = HTTP · 443 = HTTPS.",
        "25 = correo (SMTP) · 53 = DNS.",
        "Los 0–1023 son un estándar que todos respetan.",
      ],
    },
    {
      kind: "concept",
      title: "Cada servicio expone algo",
      body:
        "Un puerto abierto no es solo un número: detrás hay un programa (un servicio) escuchando y ofreciendo algo. El 80 expone páginas web; el 22, una consola para entrar a la máquina; el 5432, una base de datos. Cada servicio, además, tiene una VERSIÓN (por ejemplo 'nginx 1.24' u 'OpenSSH 9.6'). Mapear qué servicios y qué versiones expone una máquina es dibujar su superficie de ataque: todo por donde se le puede hablar.",
      diagram: "puerto",
      bullets: [
        "Puerto abierto = un servicio escuchando detrás.",
        "Cada servicio tiene nombre Y versión.",
        "La lista de servicios abiertos = la superficie de ataque.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: mirá qué ofrece server.nande",
      body:
        "El comando 'services <host>' lista los servicios de una máquina del mundo, con su puerto, estado y versión. Pedíselo a server.nande.",
      command: "services server.nande",
      explain:
        "Ves una tabla con PUERTO, SERVICIO, ESTADO y VERSIÓN: server.nande expone SSH en el 22 y una web (nginx) en el 80, con sus versiones. Esa tabla es el mapa de puertas de la máquina. Un defensor la mira para preguntarse '¿de verdad necesito todas estas puertas abiertas?'; un atacante, para elegir por cuál probar.",
      diagram: "puerto",
    },
    {
      kind: "quiz",
      prompt: "En un escaneo ves abiertos el 22, el 80 y el 443. ¿Qué servicio es cada uno?",
      options: [
        "22 = SSH, 80 = web (HTTP), 443 = web segura (HTTPS)",
        "22 = web, 80 = correo, 443 = juegos",
        "Los tres son impresoras",
        "Ninguno hace nada, son puertos vacíos",
      ],
      correct: 0,
      explain:
        "Son puertos 'well-known': 22 es SSH (consola remota), 80 es HTTP (web sin cifrar) y 443 es HTTPS (web cifrada). Ver un puerto abierto te dice qué probar: un 22 abierto invita a intentar SSH; un 80 abierto, a mirar la web. Por eso lo primero de todo pentest es descubrir qué puertos están abiertos.",
      diagram: "puerto",
    },
    {
      kind: "concept",
      title: "Banners: el servicio se presenta",
      body:
        "Cuando te conectás a un servicio, muchas veces él mismo se presenta con un cartelito: su nombre y su versión. Eso es el banner. Suena inofensivo, pero es oro para un atacante: si el banner dice 'OpenSSH 7.2', va y busca 'vulnerabilidades de OpenSSH 7.2' y prueba las que existan. nmap, con la opción -sV (Version), justamente lee esos banners y te arma la lista de versiones de cada puerto abierto.",
      diagram: "escaneo",
      bullets: [
        "Banner = el servicio anuncia su nombre y versión.",
        "nmap -sV lee los banners y detecta versiones.",
        "Saber la versión exacta = poder buscar sus fallas conocidas.",
      ],
    },
    {
      kind: "build",
      goal: "Escanear server.nande detectando la VERSIÓN de cada servicio abierto",
      pieces: ["nmap", "-sV", "server.nande", "-sZ", "reset"],
      answer: ["nmap", "-sV", "server.nande"],
      hint: "La herramienta es nmap; la opción -sV pide detectar la versión de cada servicio; al final va el objetivo.",
      explain:
        "nmap -sV server.nande revisa los puertos abiertos y, para cada uno, lee el banner para averiguar qué programa y qué versión corre. '-sZ' no existe (era un señuelo) y 'reset' no es una opción de nmap. Esa V de -sV (Version) es la que convierte una lista de puertos en una lista de blancos con nombre y apellido.",
    },
    {
      kind: "lab",
      title: "Practicá: escaneá versiones con nmap",
      body:
        "Corré nmap con detección de versión contra server.nande. Fijate, para cada puerto abierto, qué servicio y qué versión reporta.",
      command: "nmap -sV server.nande",
      explain:
        "nmap consultó el estado real de cada servicio y te devolvió los puertos abiertos con su versión (por ejemplo 22/ssh OpenSSH y 80/http nginx). Con esa lista en mano, el siguiente paso de un pentester es buscar vulnerabilidades conocidas de esas versiones exactas. Del lado defensivo, la conclusión es clara: cada versión vieja es una invitación.",
      diagram: "escaneo",
    },
    {
      kind: "concept",
      title: "netstat: los puertos de TU máquina",
      body:
        "Hasta acá miraste puertos AJENOS (con services y nmap, desde afuera). Pero también importa saber qué puertos tiene abiertos TU propia máquina, por si un programa dejó una puerta que no debía. En un Linux de verdad eso se ve con 'netstat -tuln' (o 'ss -tuln'), que lista los puertos que tu equipo está escuchando. La idea es la misma: menos puertos abiertos escuchando, menos formas de que te entren.",
      diagram: "capas",
      bullets: [
        "services / nmap → puertos de OTRA máquina (desde afuera).",
        "netstat / ss → puertos de TU propia máquina (desde adentro).",
        "Regla: si un puerto no lo usás, que esté cerrado.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: exprimí un servicio puntual",
      body:
        "El comando 'service-info <servicio> <host>' te da el detalle fino de un servicio. Pedí la ficha del SSH de server.nande.",
      command: "service-info sshd server.nande",
      explain:
        "Ves la ficha completa del servicio SSH: su puerto (22), su tipo, su versión y si arranca solo al encender la máquina. Este nivel de detalle es lo que separa un escaneo apurado de un reconocimiento serio: cuanto mejor entendés CADA servicio, más precisa es tu evaluación —tanto para atacar con permiso como para endurecer la defensa.",
      diagram: "puerto",
    },
    {
      kind: "quiz",
      prompt: "¿Por qué un atacante quiere saber la VERSIÓN exacta de un servicio (nmap -sV) y no solo que el puerto está abierto?",
      options: [
        "Porque con la versión busca vulnerabilidades conocidas de justo ESA versión",
        "Porque las versiones más altas son más lindas",
        "Porque sin la versión no se puede hacer ping",
        "Porque la versión cambia su propia dirección IP",
      ],
      correct: 0,
      explain:
        "Cada versión de un programa tiene fallas conocidas y publicadas. Si nmap dice 'nginx 1.18', el atacante busca las vulnerabilidades de esa versión puntual y prueba las que sirvan. Por eso la mejor defensa es simple pero incómoda: mantener TODO actualizado, para no quedarse corriendo versiones viejas con agujeros ya conocidos.",
      diagram: "escaneo",
    },
    {
      kind: "concept",
      title: "Defensa: cerrá lo que no usás",
      body:
        "Todo este curso, del lado defensivo, cabe en una frase: cada puerto abierto es una puerta que hay que cuidar, así que cerrá las que no usás. Las buenas prácticas: apagar los servicios que no necesitás, mantener actualizados los que sí (para no exponer versiones con fallas), y poner un firewall que solo deje pasar lo indispensable. Un atacante trabaja con la lista de puertas abiertas; cuantas menos le des, menos tiene con qué jugar.",
      diagram: "firewall",
      bullets: [
        "Menos servicios abiertos = menor superficie de ataque.",
        "Actualizá versiones · apagá lo que no usés · firewall al frente.",
        "El reconocimiento es la mitad del ataque… y de la defensa.",
      ],
    },
  ],
};

export const REDES_COURSES: Curso[] = [TCPIP, CAPTURA, SERVICIOS];
