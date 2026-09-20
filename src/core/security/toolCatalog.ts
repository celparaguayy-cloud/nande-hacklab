/**
 * Catálogo de herramientas de la academia de ÑANDE.
 *
 * Cada herramienta es una VERSIÓN EDUCATIVA Y SIMULADA. Ninguna ejecuta
 * la herramienta real ni toca Internet: las que corren (runnable) solo
 * consultan la red de laboratorio virtual (10.10.x.y). Las demás son
 * fichas de aprendizaje con salida de ejemplo.
 *
 * Cada ficha explica lo mismo para todos los niveles, empezando por una
 * frase para alguien que recién arranca ("para un niño de 5 años").
 */

export type ToolCategory =
  | "reconocimiento"
  | "escaneo"
  | "web"
  | "explotacion"
  | "passwords"
  | "redes"
  | "forense"
  | "cripto"
  | "blue-team"
  | "phishing"
  | "pagos"
  | "osint";

export type ToolLevel =
  | "principiante"
  | "intermedio"
  | "avanzado"
  | "experto";

export interface ToolDef {
  id: string;
  name: string;
  category: ToolCategory;
  level: ToolLevel;
  /** Explicación sencilla, como a alguien que nunca vio una terminal. */
  simple: string;
  /** Qué hace la herramienta. */
  whatItDoes: string;
  /** Por qué existe / qué problema resuelve. */
  whyExists: string;
  /** Cuándo se usa en la práctica. */
  whenToUse: string;
  /** Qué significa lo que devuelve. */
  resultMeaning: string;
  /** Cómo se detecta su uso (defensa). */
  howToDetect: string;
  /** Cómo se defiende uno. */
  howToDefend: string;
  /** Ejemplo de uso en la terminal de ÑANDE. */
  usage: string;
  /** Si se puede ejecutar contra el laboratorio virtual. */
  runnable: boolean;
}

function t(def: ToolDef): ToolDef {
  return def;
}

/**
 * Las herramientas están inspiradas en utilidades reales conocidas, pero
 * acá son reimplementaciones educativas que operan solo sobre el mundo
 * virtual de ÑANDE.
 */
export const TOOL_CATALOG: ToolDef[] = [
  // ---------------- RECONOCIMIENTO ----------------
  t({
    id: "ping",
    name: "ping",
    category: "reconocimiento",
    level: "principiante",
    simple:
      "Es como gritar '¿estás ahí?' a otra computadora y esperar que conteste '¡sí!'.",
    whatItDoes:
      "Envía un pequeño mensaje a una máquina y mide cuánto tarda en responder.",
    whyExists:
      "Para saber si una computadora está encendida y conectada a la red.",
    whenToUse:
      "Al principio de todo: antes de investigar una máquina, confirmás que existe y responde.",
    resultMeaning:
      "Si contesta, está viva y sabés cuánto tarda (latencia). Si no, está apagada, no existe o algo la bloquea.",
    howToDetect:
      "Un firewall o IDS puede ver muchos pings seguidos y marcar un barrido de red.",
    howToDefend:
      "Se puede configurar la máquina para no responder pings, o limitar cuántos acepta.",
    usage: "ping 10.10.5.10",
    runnable: true,
  }),
  t({
    id: "traceroute",
    name: "traceroute",
    category: "reconocimiento",
    level: "principiante",
    simple:
      "Muestra el camino que hace tu mensaje para llegar a otra computadora, como las paradas de un colectivo.",
    whatItDoes:
      "Lista cada equipo intermedio (salto) entre vos y el destino.",
    whyExists:
      "Para entender por dónde viaja el tráfico y dónde se traba.",
    whenToUse:
      "Cuando algo no conecta y querés saber en qué punto se corta el camino.",
    resultMeaning:
      "Cada línea es un salto. Si se corta en un punto, ahí está el problema o un filtro.",
    howToDetect:
      "Genera paquetes con tiempos de vida crecientes, un patrón reconocible en los logs de red.",
    howToDefend:
      "Los routers pueden no responder a estos paquetes para ocultar la topología.",
    usage: "traceroute 10.10.5.20",
    runnable: true,
  }),
  t({
    id: "nslookup",
    name: "nslookup",
    category: "reconocimiento",
    level: "principiante",
    simple:
      "Pregunta la 'dirección' de un nombre, como buscar el número de una casa en la guía.",
    whatItDoes:
      "Traduce un nombre (www.nande) a su dirección IP y viceversa.",
    whyExists:
      "Las personas usan nombres; las máquinas usan números. Esto traduce entre ambos.",
    whenToUse:
      "Cuando tenés un nombre de sitio y querés saber a qué servidor apunta.",
    resultMeaning:
      "Te devuelve la IP asociada al nombre, o un error si el nombre no existe.",
    howToDetect:
      "Consultas DNS masivas o raras pueden verse en el servidor DNS.",
    howToDefend:
      "Registrar y vigilar las consultas DNS; limitar qué información se publica.",
    usage: "nslookup www.nande",
    runnable: true,
  }),
  t({
    id: "dig",
    name: "dig",
    category: "reconocimiento",
    level: "intermedio",
    simple:
      "Como nslookup pero con lupa: te muestra muchos más detalles del nombre.",
    whatItDoes:
      "Consulta registros DNS (A, MX, TXT, etc.) con detalle.",
    whyExists:
      "Para investigar a fondo cómo está configurado un dominio.",
    whenToUse:
      "En reconocimiento, para mapear los servicios de un dominio.",
    resultMeaning:
      "Cada registro cuenta algo: A es la IP, MX el correo, TXT notas de configuración.",
    howToDetect:
      "Transferencias de zona o consultas inusuales quedan en el log del DNS.",
    howToDefend:
      "Deshabilitar transferencias de zona públicas; exponer lo mínimo.",
    usage: "dig www.nande",
    runnable: true,
  }),
  t({
    id: "whois",
    name: "whois",
    category: "reconocimiento",
    level: "principiante",
    simple:
      "Pregunta '¿de quién es este sitio?' y te da los datos del dueño (acá, ficticios).",
    whatItDoes:
      "Muestra información de registro de un dominio: dueño, fechas, servidores.",
    whyExists:
      "Para saber quién está detrás de un dominio.",
    whenToUse:
      "En reconocimiento pasivo, antes de tocar nada.",
    resultMeaning:
      "Datos administrativos del dominio. En ÑANDE son inventados.",
    howToDetect:
      "Es consulta pública; casi no deja rastro en el objetivo.",
    howToDefend:
      "Usar protección de privacidad de dominio para ocultar datos personales.",
    usage: "whois startup.nande",
    runnable: true,
  }),
  t({
    id: "theharvester",
    name: "harvester",
    category: "osint",
    level: "intermedio",
    simple:
      "Junta correos y nombres públicos de un dominio, como recortar un diario.",
    whatItDoes:
      "Recolecta correos, subdominios y nombres asociados a un dominio (aquí, sintéticos).",
    whyExists:
      "El primer paso de muchos ataques es saber a quién apuntar.",
    whenToUse:
      "En OSINT, para armar el mapa de personas y sistemas de una organización.",
    resultMeaning:
      "Una lista de datos públicos. En ÑANDE, todo es ficticio.",
    howToDetect:
      "Usa fuentes públicas: apenas deja rastro en el objetivo.",
    howToDefend:
      "Reducir la huella pública; no publicar correos completos.",
    usage: "harvester startup.nande",
    runnable: true,
  }),

  // ---------------- ESCANEO ----------------
  t({
    id: "nmap",
    name: "nmap",
    category: "escaneo",
    level: "principiante",
    simple:
      "Golpea todas las puertas de una casa para ver cuáles están abiertas.",
    whatItDoes:
      "Escanea los puertos de una máquina y dice qué servicios corren y en qué versión.",
    whyExists:
      "Para saber qué ofrece una máquina antes de decidir cómo revisarla.",
    whenToUse:
      "Después de confirmar que la máquina está viva. Es la herramienta estrella del reconocimiento.",
    resultMeaning:
      "OPEN: la puerta está abierta y hay un servicio. CLOSED: nadie atiende. FILTERED: un firewall la tapa.",
    howToDetect:
      "Muchas conexiones a puertos distintos en poco tiempo: patrón típico de escaneo.",
    howToDefend:
      "Cerrar puertos que no se usan, usar firewall y detectar escaneos.",
    usage: "nmap 10.10.5.20",
    runnable: true,
  }),
  t({
    id: "masscan",
    name: "masscan",
    category: "escaneo",
    level: "intermedio",
    simple:
      "Como nmap pero muy rápido, para tocar muchísimas puertas a la vez.",
    whatItDoes:
      "Escanea puertos a gran velocidad sobre rangos grandes de direcciones.",
    whyExists:
      "Cuando hay que revisar redes enteras en poco tiempo.",
    whenToUse:
      "En redes grandes, para un primer barrido veloz antes de afinar con nmap.",
    resultMeaning:
      "Lista rápida de puertos abiertos; luego se confirma con herramientas más detalladas.",
    howToDetect:
      "Volumen enorme de paquetes en segundos: muy visible para defensas.",
    howToDefend:
      "Limitar tasa de conexiones (rate limiting) y alertar por picos.",
    usage: "masscan 10.10.5.0/24",
    runnable: true,
  }),
  t({
    id: "netdiscover",
    name: "netdiscover",
    category: "escaneo",
    level: "principiante",
    simple:
      "Pregunta '¿quién anda por acá?' en tu propia red y anota quién contesta.",
    whatItDoes:
      "Descubre qué máquinas están vivas en la red local.",
    whyExists:
      "Antes de atacar hay que saber qué hay en la red.",
    whenToUse:
      "Al conectarse a una red nueva, para mapear los equipos vivos.",
    resultMeaning:
      "Una lista de direcciones activas y sus identificadores de hardware.",
    howToDetect:
      "Muchas preguntas de descubrimiento seguidas son visibles en la red.",
    howToDefend:
      "Segmentar la red y vigilar apariciones de equipos nuevos.",
    usage: "netdiscover",
    runnable: true,
  }),

  // ---------------- WEB ----------------
  t({
    id: "curl",
    name: "curl",
    category: "web",
    level: "principiante",
    simple:
      "Pide una página web sin dibujarla: te muestra el texto crudo que manda el servidor.",
    whatItDoes:
      "Hace pedidos HTTP a un servidor y muestra la respuesta tal cual.",
    whyExists:
      "Para hablar directo con un servidor sin un navegador de por medio.",
    whenToUse:
      "Para ver cabeceras, probar rutas o entender qué contesta una web.",
    resultMeaning:
      "El código (200 ok, 404 no está) y el contenido devuelto.",
    howToDetect:
      "Pedidos sin navegador real pueden notarse por sus cabeceras.",
    howToDefend:
      "Validar entradas del lado servidor sin importar el cliente.",
    usage: "curl http://10.10.5.10/",
    runnable: true,
  }),
  t({
    id: "gobuster",
    name: "gobuster",
    category: "web",
    level: "intermedio",
    simple:
      "Prueba muchos nombres de carpeta para encontrar páginas escondidas de un sitio.",
    whatItDoes:
      "Enumera por diccionario: rutas y archivos ocultos (dir), subdominios (dns) o vhosts. Filtra por estado con -s/-b, prueba extensiones con -x y sigue redirects con -r.",
    whyExists:
      "Muchas webs tienen páginas sin enlazar (paneles, backups) y dominios tienen subdominios olvidados que amplían la superficie de ataque.",
    whenToUse:
      "Tras mapear una web (dir), o para descubrir subdominios de un dominio (dns/vhost).",
    resultMeaning:
      "Cada acierto es una ruta que existe (200/301/401/403) o un subdominio que resuelve.",
    howToDetect:
      "Cientos de pedidos a rutas inexistentes: muy visible en los logs web.",
    howToDefend:
      "No dejar paneles sin proteger; monitorear 404 masivos; cuidar los subdominios olvidados.",
    usage: "gobuster dir -u http://banco.nande -x php,bak  ·  gobuster dns -d vortex.nande",
    runnable: true,
  }),
  t({
    id: "ffuf",
    name: "ffuf",
    category: "web",
    level: "intermedio",
    simple:
      "Como gobuster pero más veloz y flexible para 'probar y probar' en una web.",
    whatItDoes:
      "Fuzzing web: reemplaza una parte de la petición por muchos valores para ver qué cambia.",
    whyExists:
      "Para descubrir rutas, parámetros y valores válidos de forma automática.",
    whenToUse:
      "Cuando querés descubrir parámetros o rutas ocultas rápido.",
    resultMeaning:
      "Filtrás por tamaño o código de respuesta para separar lo interesante del ruido.",
    howToDetect:
      "Gran volumen de peticiones con un parámetro que varía.",
    howToDefend:
      "Rate limiting y validación estricta de parámetros.",
    usage: "ffuf -u http://banco.nande/FUZZ -w list -mc 200,401 -fs 572",
    runnable: true,
  }),
  t({
    id: "nikto",
    name: "nikto",
    category: "web",
    level: "intermedio",
    simple:
      "Revisa una web buscando fallos conocidos, como un chequeo médico rápido.",
    whatItDoes:
      "Escanea un servidor web buscando problemas comunes y configuraciones inseguras.",
    whyExists:
      "Para detectar rápido fallos típicos sin revisarlos a mano.",
    whenToUse:
      "En una evaluación web, como primer barrido de problemas conocidos.",
    resultMeaning:
      "Una lista de hallazgos: cabeceras faltantes, archivos peligrosos, versiones viejas.",
    howToDetect:
      "Firmas de peticiones muy reconocibles en los logs.",
    howToDefend:
      "Mantener actualizado, ocultar versiones y cerrar archivos sensibles.",
    usage: "nikto 10.10.5.10",
    runnable: true,
  }),
  t({
    id: "sqlmap",
    name: "sqlmap",
    category: "explotacion",
    level: "intermedio",
    simple:
      "Prueba engañar a la base de datos de una web escribiendo trampas en los formularios.",
    whatItDoes:
      "Detecta y aprovecha inyección SQL de forma automática (aquí, en labs ficticios).",
    whyExists:
      "La inyección SQL es uno de los fallos web más graves y comunes.",
    whenToUse:
      "Cuando sospechás que un parámetro llega sin filtrar a la base de datos.",
    resultMeaning:
      "Si es vulnerable, muestra que se puede leer o alterar datos que no deberían.",
    howToDetect:
      "Peticiones con comillas y palabras SQL raras en los parámetros.",
    howToDefend:
      "Usar consultas parametrizadas y validar toda entrada. Nunca armar SQL con texto del usuario.",
    usage: "sqlmap http://10.10.5.10/login user",
    runnable: true,
  }),
  t({
    id: "wpscan",
    name: "wpscan",
    category: "web",
    level: "intermedio",
    simple:
      "Revisa sitios hechos con WordPress buscando complementos viejos y débiles.",
    whatItDoes:
      "Enumera temas, plugins y usuarios de un WordPress buscando versiones vulnerables.",
    whyExists:
      "WordPress es muy usado y sus plugins son un blanco frecuente.",
    whenToUse:
      "Cuando el objetivo corre WordPress.",
    resultMeaning:
      "Lista de componentes y cuáles tienen fallos conocidos.",
    howToDetect:
      "Peticiones a rutas típicas de WordPress en masa.",
    howToDefend:
      "Actualizar núcleo y plugins, quitar los que no se usan.",
    usage: "wpscan 10.10.5.30",
    runnable: true,
  }),
  t({
    id: "burpsuite",
    name: "burp",
    category: "web",
    level: "avanzado",
    simple:
      "Se sienta entre vos y la web para que puedas mirar y cambiar cada mensaje que va y viene.",
    whatItDoes:
      "Intercepta, inspecciona y modifica el tráfico HTTP entre navegador y servidor.",
    whyExists:
      "Para entender y manipular con precisión lo que una web envía y recibe.",
    whenToUse:
      "En pruebas web serias, para probar cada parámetro a mano.",
    resultMeaning:
      "Ves cada petición y respuesta y podés repetirlas cambiando cosas.",
    howToDetect:
      "Peticiones modificadas o repetidas con variaciones sutiles.",
    howToDefend:
      "Validar del lado servidor; nunca confiar en controles del navegador.",
    usage: "burp http://10.10.5.30/",
    runnable: false,
  }),
  t({
    id: "zap",
    name: "zap",
    category: "web",
    level: "intermedio",
    simple:
      "Un ayudante que recorre una web solo y avisa si encuentra agujeros.",
    whatItDoes:
      "Escáner web automático que rastrea el sitio y busca vulnerabilidades.",
    whyExists:
      "Alternativa abierta para pruebas web automatizadas.",
    whenToUse:
      "Para un primer análisis automatizado de una aplicación web.",
    resultMeaning:
      "Reporte de hallazgos ordenados por gravedad.",
    howToDetect:
      "Rastreo intensivo y peticiones de prueba en los logs.",
    howToDefend:
      "Corregir lo que reporta y repetir hasta quedar limpio.",
    usage: "zap http://10.10.5.30/",
    runnable: true,
  }),

  // ---------------- PASSWORDS ----------------
  t({
    id: "hydra",
    name: "hydra",
    category: "passwords",
    level: "intermedio",
    simple:
      "Prueba muchísimas contraseñas una tras otra hasta que alguna abra la puerta.",
    whatItDoes:
      "Automatiza intentos de login probando listas de usuarios y contraseñas.",
    whyExists:
      "Muchas cuentas usan contraseñas débiles o repetidas.",
    whenToUse:
      "Contra servicios de login, en labs, para mostrar por qué las contraseñas fuertes importan.",
    resultMeaning:
      "Si acierta, muestra el par usuario/contraseña que funcionó.",
    howToDetect:
      "Muchos intentos fallidos seguidos: patrón clásico de fuerza bruta.",
    howToDefend:
      "Bloqueo tras varios fallos, segundo factor y contraseñas largas.",
    usage: "hydra 10.10.5.20 ssh",
    runnable: true,
  }),
  t({
    id: "johntheripper",
    name: "john",
    category: "passwords",
    level: "intermedio",
    simple:
      "Toma contraseñas 'revueltas' y trata de adivinar la original probando muchas.",
    whatItDoes:
      "Crackea hashes offline: diccionario, reglas (--rules) y máscara (--mask). Elegí el tipo con --format (raw-md5, raw-sha256).",
    whyExists:
      "Para demostrar cuán fácil se rompe una contraseña débil ya robada.",
    whenToUse:
      "Cuando tenés un hash (no la contraseña) y querés recuperarla, en labs.",
    resultMeaning:
      "Si el hash era débil, muestra la contraseña original. 'john --show' relista lo roto.",
    howToDetect:
      "Es offline: no se ve en el objetivo. La defensa es previa.",
    howToDefend:
      "Usar hashing lento con sal (bcrypt/argon2) y contraseñas largas.",
    usage: "john --format=raw-md5 --wordlist=rockyou.txt --rules 5f4dcc3b5aa765d61d8327deb882cf99",
    runnable: true,
  }),
  t({
    id: "hashcat",
    name: "hashcat",
    category: "passwords",
    level: "avanzado",
    simple:
      "Como john pero usando la placa de video para probar aún más rápido.",
    whatItDoes:
      "Crackea hashes con la GPU. Con -m elegís el tipo: -m 0 (MD5), -m 22000 (WPA-PMKID/EAPOL, el modo WiFi moderno que reemplazó al -m 2500).",
    whyExists:
      "Para romper hashes a gran escala y medir la fortaleza real (incluidas claves WiFi por PMKID).",
    whenToUse:
      "Cuando hay muchos hashes, o para crackear un PMKID/handshake WiFi capturado con hcxdumptool.",
    resultMeaning:
      "Contraseñas recuperadas de los hashes que cedieron.",
    howToDetect:
      "Offline: no deja rastro en el objetivo.",
    howToDefend:
      "Algoritmos resistentes a GPU y sal única por contraseña; para WiFi, claves largas y WPA3.",
    usage: "hashcat -m 22000 pmkid.pcapng -w rockyou.txt Oficina-5G",
    runnable: true,
  }),
  t({
    id: "hashid",
    name: "hashid",
    category: "cripto",
    level: "principiante",
    simple:
      "Mira una contraseña revuelta y adivina de qué tipo es.",
    whatItDoes:
      "Identifica el algoritmo probable de un hash por su forma.",
    whyExists:
      "Antes de crackear hay que saber qué tipo de hash es.",
    whenToUse:
      "Al recibir un hash desconocido.",
    resultMeaning:
      "Una lista de algoritmos posibles (MD5, SHA1, bcrypt...).",
    howToDetect: "No aplica: es análisis offline.",
    howToDefend: "Usar algoritmos modernos y no exponer hashes.",
    usage: "hashid 5f4dcc3b5aa765d61d8327deb882cf99",
    runnable: true,
  }),

  // ---------------- REDES / SNIFFING ----------------
  t({
    id: "netstat",
    name: "netstat",
    category: "redes",
    level: "principiante",
    simple:
      "Muestra todas las 'llamadas telefónicas' que tu computadora tiene abiertas.",
    whatItDoes:
      "Lista conexiones de red y puertos en escucha de tu propia máquina.",
    whyExists:
      "Para saber con quién habla tu equipo y qué servicios ofrece.",
    whenToUse:
      "Al revisar una máquina, para ver conexiones sospechosas.",
    resultMeaning:
      "Cada línea es una conexión o puerto abierto, con su estado.",
    howToDetect: "Es local; sirve justamente para detectar cosas raras.",
    howToDefend: "Cerrar servicios que no se usan; investigar conexiones raras.",
    usage: "netstat",
    runnable: true,
  }),
  t({
    id: "ss",
    name: "ss",
    category: "redes",
    level: "principiante",
    simple:
      "Como netstat pero más moderno y rápido para ver conexiones.",
    whatItDoes: "Muestra sockets y conexiones de red del sistema.",
    whyExists: "Reemplazo moderno de netstat.",
    whenToUse: "Para inspeccionar conexiones actuales de forma ágil.",
    resultMeaning: "Estados de conexión y puertos en escucha.",
    howToDetect: "Local: herramienta de diagnóstico.",
    howToDefend: "Auditar puertos abiertos regularmente.",
    usage: "ss",
    runnable: true,
  }),
  t({
    id: "tcpdump",
    name: "tcpdump",
    category: "redes",
    level: "avanzado",
    simple:
      "Escucha y anota los mensajes que pasan por la red, como grabar una conversación.",
    whatItDoes: "Captura paquetes de red en la línea de comandos.",
    whyExists: "Para ver exactamente qué viaja por la red.",
    whenToUse: "Al diagnosticar red o analizar tráfico sospechoso.",
    resultMeaning: "Cada línea es un paquete: origen, destino y datos.",
    howToDetect: "Difícil de detectar; es escucha pasiva.",
    howToDefend: "Cifrar todo el tráfico (HTTPS, SSH) para que capturarlo no sirva.",
    usage: "tcpdump 10.10.5.20",
    runnable: true,
  }),
  t({
    id: "wireshark",
    name: "wireshark",
    category: "redes",
    level: "avanzado",
    simple:
      "Como tcpdump pero con dibujos: te muestra el tráfico de red ordenado y coloreado.",
    whatItDoes: "Analiza tráfico de red capturado con una interfaz visual.",
    whyExists: "Para entender protocolos y encontrar problemas o ataques.",
    whenToUse: "Al analizar una captura en profundidad.",
    resultMeaning: "Cada paquete desarmado en sus partes, protocolo por protocolo.",
    howToDetect: "Escucha pasiva: no toca el objetivo.",
    howToDefend: "Cifrado extremo a extremo.",
    usage: "wireshark captura.pcap",
    runnable: false,
  }),
  t({
    id: "arpspoof",
    name: "arpspoof",
    category: "redes",
    level: "avanzado",
    simple:
      "Engaña a la red diciendo 'yo soy el router' para que los mensajes pasen por vos.",
    whatItDoes:
      "Envenena la tabla ARP para ponerse en medio de dos equipos (man-in-the-middle).",
    whyExists: "Para demostrar por qué el tráfico sin cifrar es peligroso.",
    whenToUse: "En labs, para enseñar ataques man-in-the-middle y sus defensas.",
    resultMeaning: "El tráfico de la víctima empieza a pasar por el atacante.",
    howToDetect: "Cambios raros en las tablas ARP; equipos con la misma dirección.",
    howToDefend: "ARP estático, segmentación y detección de MITM.",
    usage: "arpspoof 10.10.5.20 10.10.0.1",
    runnable: true,
  }),
  t({
    id: "airmon-ng",
    name: "airmon-ng",
    category: "redes",
    level: "avanzado",
    simple: "Pone la placa WiFi en 'modo espía' para poder escuchar todo el aire.",
    whatItDoes: "Activa el modo monitor de la tarjeta inalámbrica (wlan0 → wlan0mon).",
    whyExists: "Sin modo monitor la placa solo ve su propia red; en monitor ve todo el aire.",
    whenToUse: "Es el PRIMER paso de una auditoría WiFi, antes de airodump-ng.",
    resultMeaning: "Aparece wlan0mon: la interfaz lista para capturar.",
    howToDetect: "El modo monitor es pasivo; no emite (hasta que llega aireplay-ng).",
    howToDefend: "No aplica: es una capacidad del atacante, no una vulnerabilidad del AP.",
    usage: "airmon-ng start wlan0",
    runnable: true,
  }),
  t({
    id: "airodump-ng",
    name: "airodump-ng",
    category: "redes",
    level: "avanzado",
    simple: "Escucha el aire y lista las redes WiFi, sus canales y quién está conectado.",
    whatItDoes: "Captura tráfico 802.11: descubre APs, canales, cifrado y estaciones (clientes).",
    whyExists: "Para mapear el objetivo y capturar el handshake WPA cuando alguien se conecta.",
    whenToUse: "Después de airmon-ng, para elegir objetivo y esperar/forzar el handshake.",
    resultMeaning: "Ves BSSID, canal, cifrado y clientes; y si ya capturaste el handshake.",
    howToDetect: "Es escucha pasiva: casi indetectable salvo por el deauth que suele acompañarlo.",
    howToDefend: "Asumir que el aire se escucha: WPA2/WPA3 con clave fuerte, y WPA3 mejor.",
    usage: "airodump-ng wlan0mon",
    runnable: true,
  }),
  t({
    id: "aireplay-ng",
    name: "aireplay-ng",
    category: "redes",
    level: "avanzado",
    simple: "Echa un momento a alguien del WiFi para que, al volver, se capture su 'saludo'.",
    whatItDoes: "Inyecta paquetes de deautenticación para forzar la recaptura del handshake WPA.",
    whyExists: "El handshake solo viaja cuando un cliente se conecta; el deauth provoca esa reconexión.",
    whenToUse: "Con airodump-ng escuchando el AP, para no esperar a que alguien se conecte solo.",
    resultMeaning: "El cliente se reconecta y su 4-way handshake queda capturado.",
    howToDetect: "SÍ es detectable: una lluvia de tramas deauth es una firma clásica de ataque WiFi.",
    howToDefend: "802.11w (Protected Management Frames) impide el deauth; WPA3 lo exige.",
    usage: "aireplay-ng --deauth 5 -a <BSSID> wlan0mon",
    runnable: true,
  }),
  t({
    id: "aircrack-ng",
    name: "aircrack-ng",
    category: "redes",
    level: "avanzado",
    simple:
      "Adivina la clave del WiFi probando muchas palabras contra el saludo que capturó.",
    whatItDoes: "Crackea claves WPA/WPA2 a partir de un handshake capturado, con diccionario.",
    whyExists: "Para demostrar por qué una clave WiFi débil se rompe rápido.",
    whenToUse: "Auditoría de redes inalámbricas propias, con permiso.",
    resultMeaning: "Si la clave está en el diccionario, la encuentra; si es fuerte, no.",
    howToDetect: "El crackeo del handshake es offline: no se detecta en la red.",
    howToDefend: "Claves largas y aleatorias, WPA3, y no reutilizar contraseñas.",
    usage: "aircrack-ng -w rockyou.txt Vecino-2G",
    runnable: true,
  }),
  t({
    id: "hcxdumptool",
    name: "hcxdumptool",
    category: "redes",
    level: "avanzado",
    simple:
      "Le pide la 'huella' (PMKID) al router directamente, sin esperar a que se conecte nadie.",
    whatItDoes: "Ataque CLIENTLESS de PMKID: captura material crackeable sin cliente ni deauth.",
    whyExists: "Muchos APs WPA2 filtran el PMKID: se ataca aunque no haya ni un cliente conectado.",
    whenToUse: "Cuando el AP no tiene clientes (el deauth no sirve) o querés ser más sigiloso.",
    resultMeaning: "Un hash 22000 listo para hashcat; si el AP no filtra PMKID, no da material.",
    howToDetect: "Pedidos de asociación anómalos; algunos WIDS lo marcan, pero es más silencioso que el deauth.",
    howToDefend: "WPA3 (SAE no expone PMKID), claves largas y firmware que no filtre el PMKID.",
    usage: "hcxdumptool Oficina-5G   (antes: airmon-ng start wlan0)",
    runnable: true,
  }),
  t({
    id: "hcxpcapngtool",
    name: "hcxpcapngtool",
    category: "redes",
    level: "avanzado",
    simple: "Convierte lo que capturaste al formato que entiende hashcat.",
    whatItDoes: "Transforma una captura .pcapng en un hash 22000 para hashcat.",
    whyExists: "hashcat no lee la captura cruda: necesita el hash en formato 22000.",
    whenToUse: "Entre capturar (hcxdumptool) y crackear (hashcat -m 22000).",
    resultMeaning: "Un archivo .22000 con el/los hash(es) listos para el diccionario.",
    howToDetect: "Es offline, en tu máquina: no toca la red.",
    howToDefend: "No aplica (paso local del atacante); la defensa está en el AP.",
    usage: "hcxpcapngtool Oficina-5G",
    runnable: true,
  }),
  t({
    id: "proxychains",
    name: "proxychains",
    category: "redes",
    level: "experto",
    simple:
      "Usa una máquina ya hackeada como puente para llegar a otras que no ves directo.",
    whatItDoes: "Encadena tu tráfico a través de un host comprometido (pivoting).",
    whyExists: "Para alcanzar segmentos internos que no son accesibles desde afuera.",
    whenToUse: "Tras comprometer un host con pata en dos redes, para moverse lateralmente.",
    resultMeaning: "Ves y alcanzás máquinas de la red interna a través del pivote.",
    howToDetect: "Tráfico lateral inusual entre segmentos; conexiones desde un host pivote.",
    howToDefend: "Segmentación estricta, firewalls internos y monitoreo lateral (EDR).",
    usage: "proxychains 10.10.9.10",
    runnable: true,
  }),

  // ---------------- EXPLOTACIÓN ----------------
  t({
    id: "metasploit",
    name: "msfconsole",
    category: "explotacion",
    level: "avanzado",
    simple:
      "Una consola con 'llaves' listas para puertas conocidas: elegís el módulo, apuntás y disparás.",
    whatItDoes:
      "Consola stateful de explotación (search/use/set/check/exploit) contra los labs. El exploit SÓLO funciona si el objetivo es de verdad vulnerable.",
    whyExists: "Para estandarizar la explotación: mismo flujo para cada fallo.",
    whenToUse: "Cuando el reconocimiento (nmap) reveló un servicio con un fallo conocido.",
    resultMeaning: "Si el objetivo es vulnerable, abrís una sesión (shell/meterpreter) y tomás el sistema de laboratorio.",
    howToDetect: "Firmas de exploits y payloads conocidas por antivirus/IDS; conexiones inversas raras.",
    howToDefend: "Parchear a tiempo: si el fallo no existe, el exploit no crea sesión.",
    usage: 'msfconsole   →   use exploit/nande/http/cmd_injection ; set RHOSTS 10.10.5.50 ; exploit',
    runnable: true,
  }),
  t({
    id: "searchsploit",
    name: "searchsploit",
    category: "explotacion",
    level: "intermedio",
    simple:
      "Un buscador de 'trucos conocidos' para un programa y su versión.",
    whatItDoes:
      "Busca exploits públicos conocidos para un software y versión (catálogo educativo).",
    whyExists: "Para relacionar una versión vulnerable con su fallo documentado.",
    whenToUse: "Tras identificar versiones con nmap.",
    resultMeaning: "Una lista de fallos conocidos para esa versión.",
    howToDetect: "Es búsqueda local: no toca el objetivo.",
    howToDefend: "Mantener el software actualizado.",
    usage: "searchsploit ÑandeHTTPd 1.2",
    runnable: true,
  }),
  t({
    id: "msfvenom",
    name: "msfvenom",
    category: "explotacion",
    level: "avanzado",
    simple:
      "Fabrica un 'mensajito' especial que, si la máquina lo abre, te deja entrar (en labs).",
    whatItDoes: "Genera cargas útiles (payloads) para pruebas de explotación.",
    whyExists: "Para crear el código que aprovecha un fallo, de forma controlada.",
    whenToUse: "En labs de explotación, junto con un framework.",
    resultMeaning: "Un archivo o cadena que representa la carga (aquí, simbólico).",
    howToDetect: "Antivirus reconoce firmas de payloads comunes.",
    howToDefend: "Defensa en capas, listas blancas de aplicaciones.",
    usage: "msfvenom linux/x86",
    runnable: false,
  }),
  t({
    id: "mimikatz",
    name: "mimikatz",
    category: "explotacion",
    level: "avanzado",
    simple:
      "Una vez adentro de una máquina, saca las 'llaves' (contraseñas y hashes) que quedaron guardadas en memoria.",
    whatItDoes:
      "Post-explotación de credenciales: vuelca hashes NT de las cuentas con sesión en los equipos que ya poseés, y permite Pass-the-Hash contra el Directorio real.",
    whyExists: "Para moverse lateralmente en Windows sin conocer las contraseñas: alcanza con el hash.",
    whenToUse: "Después de ser admin local de una máquina: dumpeás lo que hay y reusás esos hashes.",
    resultMeaning: "Si volcás el hash de un Domain Admin y lo reusás (PtH), caés el dominio entero.",
    howToDetect: "Acceso a LSASS, eventos de logon anómalos (4624 tipo 9), EDR sobre la memoria.",
    howToDefend: "Credential Guard, LSA protegido, no dejar sesiones de admin en máquinas comunes, tier 0.",
    usage: 'mimikatz sekurlsa::logonpasswords   →   mimikatz "sekurlsa::pth /user:ADMIN-SQL /ntlm:<hash>"',
    runnable: true,
  }),

  // ---------------- FORENSE ----------------
  t({
    id: "strings",
    name: "strings",
    category: "forense",
    level: "principiante",
    simple:
      "Saca todas las palabras legibles de un archivo, como buscar letras en una sopa.",
    whatItDoes: "Extrae texto legible de un archivo binario.",
    whyExists: "Muchos secretos y pistas quedan como texto dentro de programas.",
    whenToUse: "Al analizar un archivo desconocido o un binario.",
    resultMeaning: "Fragmentos de texto: rutas, mensajes, a veces contraseñas.",
    howToDetect: "Análisis offline: no toca sistemas.",
    howToDefend: "No dejar secretos en texto dentro de programas.",
    usage: "strings /opt/backup.sh",
    runnable: true,
  }),
  t({
    id: "file",
    name: "file",
    category: "forense",
    level: "principiante",
    simple:
      "Mira un archivo y te dice qué es, aunque no tenga extensión.",
    whatItDoes: "Identifica el tipo de un archivo por su contenido.",
    whyExists: "Las extensiones mienten; el contenido no.",
    whenToUse: "Al toparte con un archivo sin saber qué es.",
    resultMeaning: "El tipo real: imagen, ejecutable, texto, etc.",
    howToDetect: "Offline.",
    howToDefend: "No confiar en extensiones para decidir seguridad.",
    usage: "file /var/www/config.php",
    runnable: true,
  }),
  t({
    id: "exiftool",
    name: "exiftool",
    category: "forense",
    level: "intermedio",
    simple:
      "Lee la 'etiqueta oculta' de una foto: cuándo y con qué se hizo.",
    whatItDoes: "Lee metadatos de archivos (fotos, documentos).",
    whyExists: "Los metadatos revelan mucho sin querer.",
    whenToUse: "En OSINT y forense, para sacar datos ocultos de archivos.",
    resultMeaning: "Fecha, dispositivo, a veces ubicación (aquí, ficticios).",
    howToDetect: "Offline.",
    howToDefend: "Limpiar metadatos antes de publicar archivos.",
    usage: "exiftool foto.jpg",
    runnable: true,
  }),
  t({
    id: "binwalk",
    name: "binwalk",
    category: "forense",
    level: "avanzado",
    simple:
      "Abre un archivo grande y busca otros archivos escondidos adentro.",
    whatItDoes: "Analiza binarios en busca de archivos y datos embebidos.",
    whyExists: "A veces se esconden cosas dentro de otros archivos.",
    whenToUse: "En forense y análisis de firmware.",
    resultMeaning: "Mapa de lo que hay dentro del archivo.",
    howToDetect: "Offline.",
    howToDefend: "No asumir que un archivo tiene una sola cosa.",
    usage: "binwalk firmware.bin",
    runnable: true,
  }),
  t({
    id: "cuckoo",
    name: "cuckoo",
    category: "forense",
    level: "avanzado",
    simple:
      "Mete un archivo sospechoso en una jaula y mira qué intenta hacer, sin riesgo.",
    whatItDoes: "Sandbox de análisis de malware: detona la muestra y registra su comportamiento.",
    whyExists: "Para estudiar qué hace un programa malicioso sin infectarse.",
    whenToUse: "Analizar una muestra ficticia: persistencia, red, cambios de archivos, IOCs.",
    resultMeaning: "Un informe de comportamiento y los indicadores (IOCs) para detectarlo.",
    howToDetect: "El análisis es en un entorno aislado; el malware real intenta evadirlo.",
    howToDefend: "EDR, listas de bloqueo por IOC, y no ejecutar adjuntos no confiables.",
    usage: "cuckoo factura.exe",
    runnable: true,
  }),
  t({
    id: "volatility",
    name: "volatility",
    category: "forense",
    level: "experto",
    simple:
      "Mira una 'foto' de la memoria de una computadora para ver qué estaba haciendo.",
    whatItDoes: "Analiza volcados de memoria RAM en busca de procesos y artefactos.",
    whyExists: "La memoria guarda evidencia que el disco no tiene.",
    whenToUse: "En respuesta a incidentes, tras capturar la RAM.",
    resultMeaning: "Procesos, conexiones y secretos que estaban en memoria.",
    howToDetect: "Análisis offline sobre una captura.",
    howToDefend: "Cifrado de memoria y respuesta rápida a incidentes.",
    usage: "volatility mem.raw",
    runnable: false,
  }),

  // ---------------- CRIPTO ----------------
  t({
    id: "base64",
    name: "base64",
    category: "cripto",
    level: "principiante",
    simple:
      "Convierte texto a un 'código' de letras y números, y de vuelta. No es secreto, solo disfrazado.",
    whatItDoes: "Codifica y decodifica en Base64.",
    whyExists: "Para transportar datos como texto simple.",
    whenToUse: "Cuando ves texto raro terminado en '=' probablemente es esto.",
    resultMeaning: "El texto original oculto detrás del código.",
    howToDetect: "No es cifrado: cualquiera lo revierte.",
    howToDefend: "No usarlo para esconder secretos: no protege nada.",
    usage: "base64 -d aG9sYQ==",
    runnable: true,
  }),
  t({
    id: "hashcalc",
    name: "hash",
    category: "cripto",
    level: "principiante",
    simple:
      "Convierte cualquier texto en una 'huella' única de tamaño fijo.",
    whatItDoes: "Calcula hashes (MD5, SHA256) de un texto.",
    whyExists: "Para verificar integridad y guardar contraseñas de forma segura.",
    whenToUse: "Al comparar archivos o entender cómo se guardan contraseñas.",
    resultMeaning: "Una huella: el mismo texto da siempre la misma, distinto texto da otra.",
    howToDetect: "Cálculo local.",
    howToDefend: "Para contraseñas, hash lento con sal, no MD5.",
    usage: "hash sha256 hola",
    runnable: true,
  }),
  t({
    id: "openssl",
    name: "openssl",
    category: "cripto",
    level: "avanzado",
    simple:
      "Una navaja suiza para cifrar, firmar y crear candados digitales.",
    whatItDoes: "Herramienta de criptografía: cifrado, certificados, hashes.",
    whyExists: "La criptografía protege datos y comunicaciones.",
    whenToUse: "Para cifrar archivos, inspeccionar certificados o generar claves.",
    resultMeaning: "Datos cifrados, certificados o claves según la operación.",
    howToDetect: "Uso local.",
    howToDefend: "Usar algoritmos actuales y proteger las claves privadas.",
    usage: "openssl s_client news.nande",
    runnable: true,
  }),
  t({
    id: "cyberchef",
    name: "cyberchef",
    category: "cripto",
    level: "intermedio",
    simple:
      "Una cocina para 'recetas' de datos: pegás algo raro y probás transformaciones hasta entenderlo.",
    whatItDoes: "Encadena codificaciones y cifrados simples para analizar datos.",
    whyExists: "Muchos retos combinan varias capas de codificación.",
    whenToUse: "En CTF de cripto, para desarmar datos paso a paso.",
    resultMeaning: "El dato transformado tras aplicar cada paso.",
    howToDetect: "Uso local.",
    howToDefend: "No confundir codificar con cifrar.",
    usage: "cyberchef",
    runnable: false,
  }),

  // ---------------- PHISHING (concienciación) ----------------
  t({
    id: "phish-analyzer",
    name: "phish-analyzer",
    category: "phishing",
    level: "principiante",
    simple:
      "Revisa un correo sospechoso y te dice por qué podría ser una trampa.",
    whatItDoes:
      "Analiza un correo de laboratorio buscando señales de phishing: remitente falso, enlaces engañosos, urgencia.",
    whyExists:
      "El phishing es la puerta de entrada más común. Aprender a reconocerlo es clave.",
    whenToUse:
      "Al recibir un correo dudoso, para practicar detectar la estafa.",
    resultMeaning:
      "Una lista de señales de alarma y un veredicto educativo.",
    howToDetect:
      "Filtros de correo y usuarios entrenados detectan phishing.",
    howToDefend:
      "Desconfiar de urgencias, verificar remitentes y no hacer clic apurado. Usar segundo factor.",
    usage: "phish-analyzer correo-01",
    runnable: true,
  }),
  t({
    id: "phish-lab",
    name: "phish-lab",
    category: "phishing",
    level: "intermedio",
    simple:
      "Un simulador para entender cómo se arma una trampa... para aprender a NO caer.",
    whatItDoes:
      "Muestra, de forma controlada y ficticia, la anatomía de una campaña de phishing para reconocerla.",
    whyExists:
      "Entender cómo funciona el engaño ayuda a defenderse mejor.",
    whenToUse:
      "En formación de concienciación de seguridad.",
    resultMeaning:
      "Las partes de un phishing y cómo cada una intenta engañarte.",
    howToDetect:
      "Dominios parecidos pero distintos, enlaces que no coinciden con el texto.",
    howToDefend:
      "Capacitación, verificación de dominios y reporte de correos sospechosos.",
    usage: "phish-lab",
    runnable: true,
  }),

  // ---------------- PAGOS / DETECCIÓN DE FRAUDE (reemplazo defensivo de carding) ----------------
  t({
    id: "fraud-detector",
    name: "fraud-detector",
    category: "pagos",
    level: "intermedio",
    simple:
      "Revisa compras de una tienda ficticia y marca las que parecen fraude, como un guardia atento.",
    whatItDoes:
      "Analiza transacciones de laboratorio y detecta patrones de fraude: muchos intentos, montos raros, geografía imposible.",
    whyExists:
      "Las tiendas necesitan distinguir compras legítimas de fraudulentas. Este es el lado que protege.",
    whenToUse:
      "En un equipo de seguridad de pagos o antifraude.",
    resultMeaning:
      "Una lista de transacciones marcadas con el motivo de sospecha.",
    howToDetect:
      "Reglas y modelos que ven patrones anómalos en tiempo real.",
    howToDefend:
      "Segundo factor en pagos, límites, tokenización y monitoreo. Nunca guardar datos de tarjeta en claro (PCI-DSS).",
    usage: "fraud-detector shop.nande",
    runnable: true,
  }),
  t({
    id: "pci-checker",
    name: "pci-checker",
    category: "pagos",
    level: "intermedio",
    simple:
      "Revisa si una tienda guarda los datos de las tarjetas como corresponde (o mal).",
    whatItDoes:
      "Comprueba, en labs, si un sistema de pagos sigue buenas prácticas de protección de datos de tarjeta.",
    whyExists:
      "Proteger datos de pago es obligatorio (PCI-DSS). Aprender a auditarlo es un trabajo real.",
    whenToUse:
      "Al auditar la seguridad de un comercio virtual.",
    resultMeaning:
      "Hallazgos: datos sin cifrar, retención indebida, falta de tokenización.",
    howToDetect:
      "Auditorías y escaneos de cumplimiento.",
    howToDefend:
      "Tokenizar, cifrar, no almacenar el número completo y limitar el acceso.",
    usage: "pci-checker shop.nande",
    runnable: true,
  }),

  // ---------------- BLUE TEAM ----------------
  t({
    id: "logview",
    name: "logview",
    category: "blue-team",
    level: "principiante",
    simple:
      "Lee el 'diario' de una máquina donde queda anotado todo lo que pasó.",
    whatItDoes: "Muestra y filtra registros (logs) de un sistema de laboratorio.",
    whyExists: "Los logs son la memoria de lo que ocurrió: base de toda investigación.",
    whenToUse: "Al investigar un incidente o buscar actividad rara.",
    resultMeaning: "Eventos con fecha, origen y acción. Ahí se ven los ataques.",
    howToDetect: "Es la herramienta de detección en sí.",
    howToDefend: "Centralizar y proteger los logs para que no se borren.",
    usage: "logview weblab01.lab",
    runnable: true,
  }),
  t({
    id: "siem",
    name: "siem",
    category: "blue-team",
    level: "avanzado",
    simple:
      "Junta los diarios de muchas máquinas y avisa cuando algo raro pasa en el conjunto.",
    whatItDoes: "Correlaciona eventos de todo el mundo virtual y genera alertas.",
    whyExists: "Un ataque se ve claro solo al unir señales de varias fuentes.",
    whenToUse: "En un SOC, para vigilancia continua.",
    resultMeaning: "Alertas priorizadas con el contexto de qué las disparó.",
    howToDetect: "Es la pieza central de detección.",
    howToDefend: "Ajustar reglas para no ahogarse en falsos positivos.",
    usage: "siem alerts",
    runnable: true,
  }),
  t({
    id: "ids",
    name: "ids",
    category: "blue-team",
    level: "avanzado",
    simple:
      "Un perro guardián de la red que ladra cuando ve algo que parece un ataque.",
    whatItDoes: "Detecta tráfico o comportamientos sospechosos y alerta.",
    whyExists: "Para notar ataques mientras ocurren.",
    whenToUse: "En defensa de red permanente.",
    resultMeaning: "Alertas cuando el tráfico coincide con patrones de ataque.",
    howToDetect: "Es el detector.",
    howToDefend: "Combinar firmas y análisis de comportamiento.",
    usage: "ids status",
    runnable: true,
  }),
  t({
    id: "yara",
    name: "yara",
    category: "blue-team",
    level: "avanzado",
    simple:
      "Busca 'huellas' de programas malos dentro de archivos, como un identikit.",
    whatItDoes: "Aplica reglas para reconocer familias de malware por sus patrones.",
    whyExists: "Para clasificar y detectar archivos maliciosos conocidos.",
    whenToUse: "En análisis de malware y threat hunting.",
    resultMeaning: "Qué reglas coincidieron y por qué.",
    howToDetect: "Herramienta de detección.",
    howToDefend: "Mantener reglas actualizadas.",
    usage: "yara reglas.yar muestra",
    runnable: true,
  }),
  t({
    id: "clamav",
    name: "clamav",
    category: "blue-team",
    level: "principiante",
    simple:
      "Un antivirus que revisa archivos buscando cosas malas conocidas.",
    whatItDoes: "Escanea archivos en busca de malware conocido.",
    whyExists: "Primera línea de defensa contra amenazas comunes.",
    whenToUse: "Al recibir archivos o revisar un sistema.",
    resultMeaning: "Archivos limpios o infectados según firmas.",
    howToDetect: "Herramienta de defensa.",
    howToDefend: "Actualizar firmas y combinar con otras capas.",
    usage: "clamav /home/student",
    runnable: true,
  }),

  // ---------------- ENUMERACIÓN / SISTEMA ----------------
  t({
    id: "enum4linux",
    name: "enum4linux",
    category: "escaneo",
    level: "intermedio",
    simple:
      "Le hace muchas preguntas a un servidor Windows para sacarle usuarios y carpetas compartidas.",
    whatItDoes: "Enumera información de sistemas con recursos compartidos.",
    whyExists: "Los recursos compartidos filtran usuarios y datos útiles.",
    whenToUse: "Cuando el objetivo expone servicios de compartición.",
    resultMeaning: "Usuarios, grupos y carpetas compartidas descubiertos.",
    howToDetect: "Muchas consultas de enumeración seguidas.",
    howToDefend: "Restringir acceso anónimo a recursos compartidos.",
    usage: "enum4linux 10.10.5.20",
    runnable: true,
  }),
  t({
    id: "linpeas",
    name: "linpeas",
    category: "explotacion",
    level: "avanzado",
    simple:
      "Revisa una máquina Linux por dentro buscando descuidos que te dejen subir a jefe (root).",
    whatItDoes: "Busca vías de escalada de privilegios en un sistema Linux (lab).",
    whyExists: "La escalada de privilegios convierte un acceso chico en control total.",
    whenToUse: "Tras entrar a una máquina, para buscar cómo ser root.",
    resultMeaning: "Configuraciones peligrosas: SUID, cron escribibles, credenciales sueltas.",
    howToDetect: "Muchos comandos de enumeración en poco tiempo.",
    howToDefend: "Permisos mínimos, sin SUID de más, sin credenciales en archivos.",
    usage: "linpeas 10.10.5.40",
    runnable: true,
  }),
  t({
    id: "smbclient",
    name: "smbclient",
    category: "redes",
    level: "intermedio",
    simple:
      "Se conecta a carpetas compartidas de otra máquina, como abrir un cajón ajeno.",
    whatItDoes: "Accede a recursos compartidos de red (SMB).",
    whyExists: "Muchas redes comparten archivos con SMB, a veces sin proteger.",
    whenToUse: "Cuando hay comparticiones abiertas en el objetivo.",
    resultMeaning: "Lista y contenido de carpetas compartidas accesibles.",
    howToDetect: "Conexiones SMB desde equipos no habituales.",
    howToDefend: "Autenticación fuerte y permisos estrictos en comparticiones.",
    usage: "smbclient 10.10.5.20",
    runnable: true,
  }),
  t({
    id: "crackmapexec",
    name: "cme",
    category: "explotacion",
    level: "experto",
    simple:
      "Prueba una llave en muchas puertas de una red a la vez para ver dónde entra.",
    whatItDoes: "Valida credenciales en muchos equipos de una red (lab).",
    whyExists: "Una contraseña reutilizada abre media red.",
    whenToUse: "En pruebas de red interna, tras conseguir una credencial.",
    resultMeaning: "En qué equipos funcionó la credencial.",
    howToDetect: "Muchos intentos de login en varios equipos a la vez.",
    howToDefend: "Contraseñas únicas por equipo y segmentación.",
    usage: "cme 10.10.5.0/24 user pass",
    runnable: true,
  }),

  // ---------------- OSINT ----------------
  t({
    id: "sherlock",
    name: "sherlock",
    category: "osint",
    level: "principiante",
    simple:
      "Busca un mismo apodo en muchos sitios para ver dónde tiene cuenta esa persona (ficticia).",
    whatItDoes: "Rastrea un nombre de usuario a través de plataformas.",
    whyExists: "La gente repite apodos: eso conecta perfiles.",
    whenToUse: "En investigaciones OSINT sobre identidades ficticias.",
    resultMeaning: "Dónde existe ese usuario. En ÑANDE, todo inventado.",
    howToDetect: "Consultas a servicios públicos.",
    howToDefend: "Usar apodos distintos y no reutilizar identidades.",
    usage: "sherlock yvoty",
    runnable: true,
  }),
  t({
    id: "maltego",
    name: "maltego",
    category: "osint",
    level: "avanzado",
    simple:
      "Dibuja un mapa de cómo se conectan personas, correos y sitios.",
    whatItDoes: "Relaciona entidades (personas, dominios, correos) en un grafo.",
    whyExists: "Ver las conexiones revela más que los datos sueltos.",
    whenToUse: "En OSINT avanzado, para mapear una organización ficticia.",
    resultMeaning: "Un grafo de relaciones entre entidades.",
    howToDetect: "Consultas públicas.",
    howToDefend: "Minimizar la huella digital pública.",
    usage: "maltego startup.nande",
    runnable: false,
  }),
  t({
    id: "shodan",
    name: "shodan",
    category: "osint",
    level: "intermedio",
    simple:
      "Un buscador de máquinas conectadas, en vez de páginas (acá, del mundo virtual).",
    whatItDoes: "Busca servicios y dispositivos expuestos por sus características.",
    whyExists: "Para ver qué hay expuesto sin escanear uno mismo.",
    whenToUse: "En reconocimiento pasivo del catálogo virtual.",
    resultMeaning: "Servicios expuestos con sus banners y versiones.",
    howToDetect: "No toca el objetivo: usa datos ya recolectados.",
    howToDefend: "No exponer servicios innecesarios a la red.",
    usage: "shodan http",
    runnable: true,
  }),

  // ---------------- WEB EXTRA ----------------
  t({
    id: "whatweb",
    name: "whatweb",
    category: "web",
    level: "principiante",
    simple:
      "Mira una web y adivina con qué está hecha (el 'motor' que usa).",
    whatItDoes: "Identifica tecnologías de un sitio web.",
    whyExists: "Saber qué corre una web guía el resto del análisis.",
    whenToUse: "Al empezar a estudiar una aplicación web.",
    resultMeaning: "Servidor, framework y librerías detectadas.",
    howToDetect: "Peticiones de reconocimiento comunes.",
    howToDefend: "Ocultar versiones y cabeceras que revelan tecnología.",
    usage: "whatweb 10.10.5.30",
    runnable: true,
  }),
  t({
    id: "sslscan",
    name: "sslscan",
    category: "web",
    level: "intermedio",
    simple:
      "Revisa el candado de una web para ver si es fuerte o está flojo.",
    whatItDoes: "Analiza la configuración TLS/SSL de un servicio.",
    whyExists: "Un cifrado mal configurado deja el tráfico vulnerable.",
    whenToUse: "Al auditar servicios con HTTPS.",
    resultMeaning: "Protocolos y cifrados soportados, y cuáles son inseguros.",
    howToDetect: "Conexiones de sondeo TLS.",
    howToDefend: "Desactivar protocolos viejos y cifrados débiles.",
    usage: "sslscan news.nande",
    runnable: true,
  }),
  t({
    id: "jwt-tool",
    name: "jwt-tool",
    category: "web",
    level: "avanzado",
    simple:
      "Revisa las 'pulseras de acceso' (tokens) de una web por si se pueden falsificar.",
    whatItDoes: "Analiza y prueba la seguridad de tokens JWT.",
    whyExists: "Los JWT mal hechos permiten hacerse pasar por otro usuario.",
    whenToUse: "Cuando la app usa JWT para autenticar.",
    resultMeaning: "Si el token es débil o falsificable.",
    howToDetect: "Tokens manipulados que el servidor debería rechazar.",
    howToDefend: "Firmar bien, validar siempre y no aceptar 'alg: none'.",
    usage: "jwt-tool token.txt",
    runnable: false,
  }),
  t({
    id: "commix",
    name: "commix",
    category: "explotacion",
    level: "avanzado",
    simple:
      "Prueba si una web deja colar órdenes al sistema por un formulario.",
    whatItDoes: "Detecta y aprovecha inyección de comandos (labs).",
    whyExists: "Si una web pasa tu texto al sistema, se lo puede controlar.",
    whenToUse: "Cuando un parámetro parece ejecutar comandos.",
    resultMeaning: "Si es vulnerable, se pueden correr órdenes en el servidor.",
    howToDetect: "Parámetros con caracteres de comando (; | &).",
    howToDefend: "Nunca pasar entrada del usuario a comandos del sistema.",
    usage: "commix http://10.10.5.50/ping",
    runnable: true,
  }),
  t({
    id: "ssrf",
    name: "ssrf",
    category: "web",
    level: "avanzado",
    simple:
      "Prueba si podés hacer que el servidor pida cosas por vos a lugares que no debería.",
    whatItDoes:
      "Detecta SSRF: cuando una web trae URLs que le pedís, incluso internas (labs).",
    whyExists:
      "Un servidor que busca cualquier URL puede ser usado para llegar a servicios internos.",
    whenToUse:
      "Cuando una web acepta una URL para ir a buscarla (importadores, previews).",
    resultMeaning:
      "Si es vulnerable, el servidor alcanza destinos que vos no podrías directamente.",
    howToDetect:
      "Peticiones salientes del servidor hacia destinos raros o internos.",
    howToDefend:
      "Validar y limitar a dónde puede conectarse el servidor (lista blanca).",
    usage: "ssrf http://10.10.5.50/import",
    runnable: true,
  }),
  t({
    id: "dalfox",
    name: "dalfox",
    category: "web",
    level: "intermedio",
    simple:
      "Busca lugares en una web donde puedas colar un mensajito que se ejecute (XSS).",
    whatItDoes: "Detecta vulnerabilidades XSS de forma automática (labs).",
    whyExists: "El XSS permite robar sesiones y engañar usuarios.",
    whenToUse: "Al probar entradas que se reflejan en la página.",
    resultMeaning: "Puntos donde el sitio no limpia lo que muestra.",
    howToDetect: "Payloads de prueba con etiquetas y scripts.",
    howToDefend: "Escapar toda salida y usar Content-Security-Policy.",
    usage: "dalfox http://10.10.5.30/search",
    runnable: true,
  }),

  // ---------------- WIRELESS (conceptual) ----------------
  t({
    id: "aircrack",
    name: "aircrack",
    category: "redes",
    level: "avanzado",
    simple:
      "Estudia cómo se protegen las redes wifi para entender por qué unas son seguras y otras no.",
    whatItDoes: "Analiza la seguridad de redes inalámbricas (conceptual en ÑANDE).",
    whyExists: "El wifi mal protegido deja entrar a cualquiera.",
    whenToUse: "En labs conceptuales de seguridad inalámbrica.",
    resultMeaning: "Si el método de protección del wifi es débil.",
    howToDetect: "Captura de tráfico inalámbrico cercano.",
    howToDefend: "Usar WPA3, contraseñas largas y redes separadas.",
    usage: "aircrack captura.cap",
    runnable: false,
  }),
  t({
    id: "kismet",
    name: "kismet",
    category: "redes",
    level: "avanzado",
    simple:
      "Escucha qué redes wifi hay alrededor y quién se conecta (conceptual).",
    whatItDoes: "Detecta redes y dispositivos inalámbricos.",
    whyExists: "Para mapear el entorno inalámbrico.",
    whenToUse: "En reconocimiento inalámbrico conceptual.",
    resultMeaning: "Lista de redes y dispositivos detectados.",
    howToDetect: "Escucha pasiva.",
    howToDefend: "Ocultar y proteger las redes propias.",
    usage: "kismet",
    runnable: false,
  }),

  // ---------------- REVERSING (conceptual) ----------------
  t({
    id: "ghidra",
    name: "ghidra",
    category: "forense",
    level: "experto",
    simple:
      "Toma un programa y trata de mostrar cómo está hecho por dentro.",
    whatItDoes: "Desensambla y analiza programas para entender su lógica.",
    whyExists: "Para estudiar malware o programas sin su código fuente.",
    whenToUse: "En ingeniería inversa de binarios de laboratorio.",
    resultMeaning: "Una versión legible de la lógica del programa.",
    howToDetect: "Análisis offline.",
    howToDefend: "Ofuscación y protección de código (defensa parcial).",
    usage: "ghidra programa.bin",
    runnable: false,
  }),
  t({
    id: "gdb",
    name: "gdb",
    category: "forense",
    level: "experto",
    simple:
      "Frena un programa en el medio para ver qué está pensando paso a paso.",
    whatItDoes: "Depura programas ejecutándolos de forma controlada.",
    whyExists: "Para entender fallos y comportamiento interno.",
    whenToUse: "En reversing y desarrollo de exploits de laboratorio.",
    resultMeaning: "El estado del programa en cada instante.",
    howToDetect: "Análisis local.",
    howToDefend: "Anti-debugging (defensa parcial).",
    usage: "gdb programa.bin",
    runnable: false,
  }),
  t({
    id: "radare2",
    name: "r2",
    category: "forense",
    level: "experto",
    simple:
      "Otra lupa poderosa para mirar un programa por dentro, desde la terminal.",
    whatItDoes: "Framework de análisis y reversing de binarios.",
    whyExists: "Alternativa abierta y potente para reversing.",
    whenToUse: "En análisis de binarios de laboratorio.",
    resultMeaning: "Desensamblado y estructura del binario.",
    howToDetect: "Offline.",
    howToDefend: "Protección de código.",
    usage: "r2 programa.bin",
    runnable: true,
  }),
];
