import type { Curso } from "../courseTypes";

/**
 * Módulo "Operaciones de red (Red Team avanzado)". Cursos ligados a los motores
 * de red REALES de ÑANDE: ruteo L3/L4 con estado (HostRuntime), pivoting/túneles
 * (chisel/socks/route), DNS real con transferencia de zona (dig axfr), MITM en
 * la LAN (arpspoof/dnsspoof) y el OpsecTracer (opsec). Profundizan la metodología
 * del pentester dentro del sandbox: moverse por la red sin salir del dispositivo.
 */

const OP_PIVOTING: Curso = {
  id: "c-op-pivoting",
  title: "Pivoting y túneles",
  subtitle: "La red interna no se ve desde afuera: usá un host comprometido como trampolín y tunelizá tus herramientas.",
  level: "avanzado",
  skill: "pentesting",
  hue: 260,
  glyph: "target",
  reward: { xp: 280, coins: 220 },
  slides: [
    {
      kind: "concept",
      title: "Lo valioso está en la red interna",
      body:
        "Las máquinas expuestas a Internet casi nunca son el premio: son la PUERTA. Detrás hay segmentos internos que no se ven desde afuera (bases de datos, backups, controladores de dominio, la planta industrial). Para llegar ahí necesitás PIVOTAR: usar una máquina que ya comprometiste —que tiene un pie en tu red y otro en la interna— como trampolín. El pivote enruta tu tráfico hacia donde vos no llegás directo.",
      diagram: "pivot",
      bullets: [
        "Lo expuesto es la puerta; el premio está adentro.",
        "Un pivote tiene un pie en cada red (doble-homed).",
        "Sin pivote, el segmento interno es invisible e inalcanzable.",
      ],
    },
    {
      kind: "concept",
      title: "Túnel SOCKS + proxychains",
      body:
        "El pivoteo moderno se hace con un TÚNEL: abrís un proxy SOCKS a través del host comprometido y hacés que TODAS tus herramientas (nmap, connect, curl) salgan por ahí. Así, desde tu máquina, alcanzás el segmento de atrás del pivote como si estuvieras ahí. En ÑANDE el ruteo es REAL con estado: un puerto interno sólo responde si hay una ruta abierta hasta él. Abrir el túnel cambia de verdad qué hosts alcanzás.",
      diagram: "tunnel",
      bullets: [
        "SOCKS + proxychains = tus tools viajan por el pivote.",
        "El ruteo es real: sin túnel, no hay respuesta del interno.",
        "route <host> te dice si hay camino y por dónde.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Comprometiste server.nande (doble-homed). ¿Qué te habilita abrir un túnel por él?",
      options: [
        "Alcanzar los hosts de su red interna con tus propias herramientas",
        "Apagar server.nande",
        "Cambiar tu contraseña local",
        "Nada: el túnel es decorativo",
      ],
      correct: 0,
      explain:
        "El pivote tiene visibilidad de su segmento interno. Al tunelizar por él, tus nmap/connect/curl heredan esa visibilidad y llegan a máquinas que desde afuera no respondían. Es la diferencia entre 'tengo un host' y 'tengo la red'.",
      diagram: "tunnel",
    },
    {
      kind: "concept",
      title: "Pivoteo en cadena: saltos anidados",
      body:
        "Las redes serias tienen varias capas: la LAN corporativa, un segmento restringido detrás, y a veces la OT más adentro. No se llega de un salto: se ENCADENAN pivotes. Comprometés el jump host y tunelizás; desde ahí alcanzás y comprometés un host del segmento restringido; tunelizás DE NUEVO por ese segundo host para llegar al tercero. Cada pivote hereda la visibilidad del anterior. En ÑANDE `chisel auto` monta túneles por toda tu infraestructura tomada de una, y `route <host>` te dice si un objetivo ya es alcanzable.",
      diagram: "tunnel",
      bullets: [
        "Redes por capas = pivoteo en cadena (saltos anidados).",
        "Cada túnel nuevo parte del host recién comprometido.",
        "chisel auto tuneliza por toda tu infraestructura tomada.",
      ],
    },
    {
      kind: "build",
      goal: "Consultar la ruta real hacia un host del segmento profundo",
      pieces: ["route", "db-core.interna.nande", "chisel", "stop"],
      answer: ["route", "db-core.interna.nande"],
      hint: "El comando que te muestra el camino a un host es 'route', seguido del objetivo.",
      explain:
        "`route db-core.interna.nande` te dice si hay camino hasta ese host y por qué pivotes pasa. Si no hay ruta, sabés que te falta comprometer un eslabón intermedio. Es tu brújula para el pivoteo en cadena.",
    },
    {
      kind: "lab",
      title: "El tablero de túneles",
      body: "Mirá el estado del pivoting: qué túneles hay activos y cómo se abren.",
      command: "chisel",
      explain:
        "Ves el tablero de túneles (proxychains). Abrís uno con `chisel <host-pivote-comprometido>` y a partir de ahí tus herramientas llegan a su red interna; `chisel auto` tuneliza por TODOS tus hosts comprometidos de una; `route <host>` te muestra el camino. En un mundo limpio no hay pivotes todavía: primero comprometé un host doble-homed (seguí la operación con `op`).",
      diagram: "tunnel",
    },
  ],
};

const OP_DNS: Curso = {
  id: "c-op-dns-recon",
  title: "Reconocimiento DNS y transferencia de zona",
  subtitle: "El DNS es un mapa de la empresa: registros, subdominios y el clásico regalo mal configurado, la zona completa.",
  level: "intermedio",
  skill: "pentesting",
  hue: 155,
  glyph: "search",
  reward: { xp: 230, coins: 180 },
  slides: [
    {
      kind: "concept",
      title: "El DNS filtra el mapa",
      body:
        "El DNS no sólo traduce nombres a IPs: guarda TIPOS de registro que cuentan mucho de una organización. A (host→IP), MX (correo), NS (servidores de nombres), TXT (a veces con secretos), CNAME (alias), PTR (IP→nombre). Enumerar registros y subdominios te dibuja la superficie de la empresa antes de tocar un solo puerto. Es recon puro: barato, silencioso y muy revelador.",
      diagram: "dns",
      bullets: [
        "A, MX, NS, TXT, CNAME, PTR: cada tipo cuenta algo.",
        "Los subdominios revelan servicios ocultos (dev, vpn, admin…).",
        "Recon DNS = mapa de la empresa sin hacer ruido.",
      ],
    },
    {
      kind: "concept",
      title: "AXFR: cuando el servidor te entrega TODO",
      body:
        "La transferencia de zona (AXFR) es un mecanismo legítimo: un servidor DNS secundario le pide al primario la zona ENTERA para replicarla. El problema es cuando el primario se la entrega a CUALQUIERA. Un AXFR mal restringido te vuelca todos los registros de un saque: cada host, cada subdominio, cada alias. Es uno de los hallazgos de recon más jugosos y más comunes en redes internas mal configuradas.",
      diagram: "subdominios",
      bullets: [
        "AXFR = copia de la zona DNS completa.",
        "Mal restringido = se la da a cualquiera (fuga total del mapa).",
        "Defensa: permitir AXFR sólo a los secundarios autorizados.",
      ],
    },
    {
      kind: "build",
      goal: "Pedir la transferencia de zona completa del dominio interno interna.nande",
      pieces: ["dig", "axfr", "interna.nande", "-p-", "MX"],
      answer: ["dig", "axfr", "interna.nande"],
      hint: "La herramienta es dig; el tipo de consulta es axfr; al final, el dominio a volcar.",
      explain:
        "`dig axfr interna.nande` pide la zona entera al servidor DNS del dominio interno. Si está mal restringida (lo está), te devuelve todos los registros: hosts internos que no conocías, listos para el próximo paso del recon.",
    },
    {
      kind: "concept",
      title: "Qué hacés con la zona una vez que la tenés",
      body:
        "Volcar la zona no es el objetivo: es el comienzo. Con la lista de registros clasificás blancos — un 'vpn.' o 'admin.' grita 'entrá por acá'; un 'dev.' o 'test.' suele estar peor cuidado; un 'backup.' o 'nas.' guarda oro. Los PTR y los rangos te dibujan la topología interna. El recon DNS bien hecho te da un plan de ataque priorizado ANTES de escanear un solo puerto, y eso ahorra ruido (menos escaneo = menos detección).",
      diagram: "subdominios",
      bullets: [
        "Cada subdominio sugiere un tipo de blanco (vpn/dev/backup…).",
        "PTR y rangos = topología interna dibujada.",
        "Priorizar por DNS = menos escaneo ciego = menos ruido.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Cuál es la defensa correcta contra una transferencia de zona (AXFR) abusiva?",
      options: [
        "Permitir AXFR sólo a los servidores secundarios autorizados",
        "Apagar el DNS por completo",
        "Usar contraseñas más largas en el correo",
        "Poner el sitio en HTTPS",
      ],
      correct: 0,
      explain:
        "El AXFR es legítimo entre el primario y sus secundarios: la defensa no es prohibirlo, sino RESTRINGIRLO a esos servidores (por IP/TSIG). Así la réplica sigue funcionando para quien debe, y un extraño ya no puede volcar la zona entera.",
      diagram: "dns",
    },
    {
      kind: "lab",
      title: "Volcá la zona interna",
      body: "Pedí la transferencia de zona del dominio interno y leé todo lo que el servidor DNS te entrega.",
      command: "dig axfr interna.nande",
      explain:
        "El servidor te vuelca la zona completa de interna.nande: cada host y subdominio del segmento, de un tiro. Ese listado es tu mapa para pivotar: los nombres que aparecen son los próximos objetivos. En la vida real, esto mismo es lo primero que se prueba contra un DNS interno.",
      diagram: "subdominios",
    },
  ],
};

const OP_MITM: Curso = {
  id: "c-op-mitm",
  title: "Man in the Middle en la LAN",
  subtitle: "Envenenar ARP para meterte en el medio del tráfico, y falsear DNS para redirigir a la víctima.",
  level: "avanzado",
  skill: "redes",
  hue: 20,
  glyph: "mask",
  reward: { xp: 260, coins: 210 },
  slides: [
    {
      kind: "concept",
      title: "ARP: el protocolo confiado",
      body:
        "En una LAN, las máquinas se ubican por MAC, y ARP es quien traduce 'IP → MAC'. El problema: ARP no verifica nada. Si le gritás a la víctima 'la IP del router soy yo' (ARP spoofing), te cree, y empieza a mandarte a VOS el tráfico que iba al router. Te pusiste en el MEDIO: podés leer, modificar o redirigir todo lo que pasa. Es el ataque clásico de red interna.",
      diagram: "mitm",
      bullets: [
        "ARP traduce IP→MAC y confía sin verificar.",
        "ARP spoofing: te hacés pasar por el router (o por otra máquina).",
        "Resultado: el tráfico de la víctima pasa por vos.",
      ],
    },
    {
      kind: "concept",
      title: "Del MITM al DNS spoofing",
      body:
        "Una vez en el medio, podés falsear respuestas DNS: cuando la víctima pregunta '¿dónde está banco.nande?', vos le contestás con TU IP en vez de la real. La mandás a un servidor que controlás sin que note nada. ARP spoofing abre la puerta; DNS spoofing dirige a la víctima a donde vos querés. Defensa: ARP estático/inspección (DAI), segmentación, y HTTPS con validación estricta para que el redirigido no pase desapercibido.",
      diagram: "mitm",
      bullets: [
        "En el medio → podés reescribir respuestas DNS.",
        "Redirigís a la víctima a infraestructura tuya.",
        "Defensa: DAI, segmentación, HTTPS bien validado.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué el ARP spoofing funciona tan fácil en una LAN?",
      options: [
        "Porque ARP no autentica: cualquiera puede afirmar ser una IP y le creen",
        "Porque rompe el cifrado del WiFi",
        "Porque adivina la contraseña del router",
        "Porque apaga el switch",
      ],
      correct: 0,
      explain:
        "ARP fue diseñado sin autenticación: una máquina anuncia 'esta IP es mi MAC' y las demás lo aceptan. Envenenar esa tabla es trivial y te pone en el medio. Por eso las defensas viven en el switch (inspección dinámica de ARP) y en la segmentación, no en ARP mismo.",
      diagram: "mitm",
    },
    {
      kind: "concept",
      title: "Lo que se ve desde el medio",
      body:
        "Estar en el medio no es magia: ves lo que la víctima manda. Tráfico en claro (HTTP, DNS, FTP, Telnet) lo leés y modificás a gusto. Tráfico cifrado bien hecho (HTTPS con validación estricta, HSTS) lo ves pasar pero no lo leés — y si intentás degradarlo, el navegador avisa. Por eso el MITM moderno ataca el ESLABÓN débil: protocolos en claro, redirecciones antes del cifrado, o usuarios que ignoran la advertencia del candado. El cifrado extremo a extremo es justamente la defensa.",
      diagram: "mitm",
      bullets: [
        "En claro (HTTP/DNS/Telnet): lo leés y lo cambiás.",
        "HTTPS bien validado: lo ves pasar, no lo leés.",
        "El MITM apunta al eslabón sin cifrar; E2E lo frustra.",
      ],
    },
    {
      kind: "build",
      goal: "Falsear la resolución DNS de la víctima una vez que estás en el medio",
      pieces: ["dnsspoof", "banco.nande", "arpspoof", "--brute"],
      answer: ["dnsspoof", "banco.nande"],
      hint: "La herramienta para falsear respuestas DNS es dnsspoof; le indicás el dominio a secuestrar.",
      explain:
        "`dnsspoof banco.nande` hace que, cuando la víctima pregunte por ese dominio, le contestes con TU IP. Requiere estar ya en el medio (arpspoof primero). Encadenás ARP spoofing → DNS spoofing para redirigirla a infraestructura que controlás.",
    },
    {
      kind: "lab",
      title: "Ponete en el medio",
      body: "Mirá la herramienta de ARP spoofing / MITM y cómo se arma la interposición en la LAN.",
      command: "mitm",
      explain:
        "El comando te muestra cómo interponerte entre dos hosts de la LAN (típicamente la víctima y el router). Necesitás estar en el mismo segmento L2 para envenenar su tabla ARP; desde ahí, el tráfico de la víctima pasa por vos y podés encadenar un `dnsspoof` para redirigirla. Es el arranque del kit de red interna.",
      diagram: "mitm",
    },
  ],
};

const OP_OPSEC: Curso = {
  id: "c-op-opsec",
  title: "OPSEC operacional: medí tu rastro",
  subtitle: "Cada técnica ruidosa deja huella. Aprendé a ver tu exposición y a bajarla antes de que te delate.",
  level: "avanzado",
  skill: "pentesting",
  hue: 310,
  glyph: "mask",
  reward: { xp: 250, coins: 200 },
  slides: [
    {
      kind: "concept",
      title: "El ataque también deja logs",
      body:
        "Todo lo que hacés genera evidencia: escaneos ruidosos, ráfagas de logins fallidos, técnicas de dominio escandalosas. Del otro lado, el SOC junta esas migas y arma tu perfil. OPSEC (seguridad operacional) es administrar cuánto de vos queda expuesto: qué se ve, desde qué origen, y con cuánto 'calor'. Un operador maduro no sólo logra el objetivo: lo logra dejando el mínimo rastro atribuible.",
      diagram: "radar",
      bullets: [
        "Cada técnica ruidosa = evidencia para el defensor.",
        "'Calor' = cuánta atención acumulaste.",
        "OPSEC = objetivo cumplido con rastro mínimo.",
      ],
    },
    {
      kind: "concept",
      title: "El anonimato corta la atribución",
      body:
        "La clave: el SOC contiene lo que puede ATRIBUIR. Si enrutás por Tor (anon on), tus técnicas se ven pero con un origen enmascarado: el defensor no sabe a quién cortar, así que no puede contenerte automáticamente. No te vuelve invisible —te siguen detectando— pero te vuelve no-atribuible, y eso, contra una respuesta automática, es defensa. Sin anonimato, tu IP real queda pegada a cada técnica.",
      diagram: "radar",
      bullets: [
        "Detección ≠ atribución: te ven, pero ¿saben quién sos?",
        "anon on → origen enmascarado → no te contienen solos.",
        "Sin anon, tu IP real queda en cada evento.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Estás por lanzar una técnica ruidosa contra el dominio. ¿Qué hacés primero para reducir la atribución?",
      options: [
        "Encender el anonimato (anon on) para enmascarar el origen",
        "Gritar más fuerte en la red",
        "Apagar tu propia máquina",
        "Nada: la atribución no importa",
      ],
      correct: 0,
      explain:
        "Encender Tor antes de la técnica enmascara tu origen: el SOC la detecta pero no puede atribuirla, y la respuesta automática no tiene a quién cortar. El orden importa: primero el anonimato, después el ruido.",
      diagram: "radar",
    },
    {
      kind: "concept",
      title: "El orden de las operaciones importa",
      body:
        "OPSEC no es sólo 'encender Tor': es SECUENCIA. Encendé el anonimato ANTES de la técnica ruidosa, no después (el evento ya salió con tu IP). Cambiá de identidad de red (MAC, IP de salida) entre fases sensibles. Hacé lo ruidoso cuando el costo de ser detectado sea menor. Y medí: si el panel muestra técnicas 'expuestas', ya dejaste rastro atribuible. El operador maduro planifica su huella igual que planifica el exploit — porque una operación detectada y atribuida a tiempo, simplemente, fracasa.",
      diagram: "radar",
      bullets: [
        "Anonimato ANTES del ruido, no después.",
        "Rotá identidad de red entre fases sensibles.",
        "'Expuesto' en el panel = rastro atribuible ya dejado.",
      ],
    },
    {
      kind: "quiz",
      prompt: "El panel de OPSEC muestra una técnica como 'expuesta'. ¿Qué significa?",
      options: [
        "Que se ejecutó sin anonimato: quedó ligada a tu origen real y es atribuible",
        "Que fue un éxito rotundo",
        "Que el objetivo no la notó",
        "Que ganaste puntos extra",
      ],
      correct: 0,
      explain:
        "'Expuesta' quiere decir que la técnica salió con tu origen real a la vista: el defensor puede atribuírtela y, en ACTIVO, contenerte. 'Enmascarada' sería lo contrario (salió por Tor). El panel es tu termómetro de cuánto te delataste.",
      diagram: "radar",
    },
    {
      kind: "lab",
      title: "Leé tu propio rastro",
      body: "Abrí el panel de OPSEC y mirá tu exposición: qué técnicas quedaron expuestas, cuáles enmascaradas y tu calor actual.",
      command: "opsec",
      explain:
        "El tracer te muestra si el anonimato está activo, cuántos ataques quedaron expuestos vs. enmascarados, tu 'calor' y una línea de tiempo de tus técnicas ruidosas con el origen que se vio de cada una. En un mundo limpio todavía no ejecutaste nada ruidoso, así que la línea está vacía: es tu tablero para operar con sigilo a medida que avanzás.",
      diagram: "radar",
    },
  ],
};

export const OPERACIONES_RED_COURSES: Curso[] = [
  OP_PIVOTING,
  OP_DNS,
  OP_MITM,
  OP_OPSEC,
];
