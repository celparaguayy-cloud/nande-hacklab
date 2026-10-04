import type { Curso } from "../courseTypes";

/**
 * Módulo "Anonimato y OSINT avanzado". Reemplaza el nivel introductorio por
 * cursos LARGOS, profesionales y PRÁCTICOS, ligados a las herramientas reales de
 * ÑANDE: la red de anonimato (anon on/new/status), la identidad de red
 * (identidad/whoami-net), el MAC spoofing (macchanger), los servicios ocultos
 * (onion), el rastreador de OPSEC (opsec) y los metadatos (exiftool). Contenido
 * basado en técnicas y casos REALES (Tor, obfs4/meek/Snowflake, Tails/Whonix/
 * Qubes, y desanonimizaciones históricas). 100% offline, con fines de defensa.
 */

const ANON_TOR: Curso = {
  id: "c-anon-tor",
  title: "Tor en profundidad",
  subtitle: "Curso completo: el modelo de confianza, el circuito de 3 saltos, celdas y streams, el consenso, los guards, el exit, los servicios .onion v3, rendimiento, mitos y ética.",
  level: "avanzado",
  skill: "osint",
  hue: 265,
  glyph: "mask",
  reward: { xp: 460, coins: 360 },
  slides: [
    {
      kind: "concept",
      title: "El problema que Tor resuelve",
      body:
        "Una VPN te obliga a confiar en UN servidor que ve las dos puntas (quién sos y a dónde vas). Tor (The Onion Router) elimina ese punto único de confianza distribuyéndolo: tu tráfico pasa por TRES relays operados por gente distinta, elegidos de una red de miles de voluntarios, y ninguno conoce la historia completa. No es 'una VPN mejor': es un modelo de confianza diferente. Con la VPN confiás en una empresa; con Tor confiás en que los tres relays de tu circuito no estén coludidos — y como los elegís de miles al azar, esa colusión es estadísticamente difícil.",
      diagram: "tor",
      bullets: [
        "VPN = un solo punto que ve las dos puntas (confianza única).",
        "Tor = 3 relays de operadores distintos; nadie ve todo.",
        "Cambia el MODELO de confianza, no es 'una VPN más'.",
      ],
    },
    {
      kind: "concept",
      title: "De dónde viene Tor, y qué protege (y qué no)",
      body:
        "Tor nació a principios de los 2000 en un laboratorio de investigación naval de EE.UU. (The Onion Routing) y hoy lo mantiene una ONG sin fines de lucro con financiamiento diverso. Paradoja clave de su diseño: para que TE proteja a VOS, tiene que proteger a MUCHA gente distinta — anonimato ama la compañía. Qué protege: tu UBICACIÓN/identidad de red frente al destino, tu ISP y observadores locales. Qué NO protege: lo que vos mismo revelás (logins, nombres, metadatos), el contenido si la app no cifra (el exit lo ve), ni te salva de malware en tu equipo. Entender ese límite es la mitad del uso correcto.",
      diagram: "tor",
      bullets: [
        "Origen: 'onion routing' en investigación naval (EE.UU.), años 2000.",
        "Protege: ubicación/identidad de red frente a destino, ISP y locales.",
        "NO protege: lo que vos revelás, el contenido en claro, ni tu endpoint.",
      ],
    },
    {
      kind: "concept",
      title: "Los tres saltos: guard, medio y salida",
      body:
        "El circuito tiene tres relays con roles claros. El GUARD (entrada) sabe tu IP real, pero no a dónde vas (solo ve tráfico cifrado hacia el siguiente). El RELAY DEL MEDIO solo conecta entrada con salida: no sabe ni quién sos ni a dónde vas (es un 'puente ciego'). El de SALIDA (exit) sabe a dónde va el tráfico, pero no quién lo originó. La propiedad que lo hace funcionar: NINGÚN nodo tiene las dos puntas a la vez. Para deanonimizarte por la red haría falta que el MISMO adversario controle o vea tu guard Y tu exit al mismo tiempo.",
      diagram: "tor",
      bullets: [
        "Guard: sabe tu IP, no el destino.",
        "Medio: solo une entrada y salida; no sabe nada útil.",
        "Salida: sabe el destino, no tu identidad.",
      ],
    },
    {
      kind: "concept",
      title: "El cifrado en capas (la cebolla)",
      body:
        "Antes de enviar, tu cliente negocia una clave con CADA relay y envuelve el paquete en TRES capas de cifrado, una por relay, en orden inverso. El guard pela la primera capa y ve 'mandáselo al relay medio'; el medio pela la segunda y ve 'mandáselo a la salida'; la salida pela la última y recién ahí aparece el pedido real. Por eso se llama 'cebolla': cada salto quita una capa. Cada relay solo puede descifrar SU capa con SU clave, así que conoce solo al anterior y al siguiente, nunca la ruta entera ni el contenido final (salvo el exit).",
      diagram: "tor",
      bullets: [
        "3 capas de cifrado, una por relay (orden inverso).",
        "Cada salto pela una capa y ve solo el próximo tramo.",
        "Claves distintas por relay: nadie lee más allá de su capa.",
      ],
    },
    {
      kind: "concept",
      title: "Celdas y streams: cómo viaja de verdad",
      body:
        "Dentro del circuito, Tor no manda 'paquetes de cualquier tamaño': manda CELDAS de tamaño FIJO (512 bytes). Ese tamaño uniforme es a propósito — evita que el largo de los paquetes delate qué hacés. Sobre UN mismo circuito pueden viajar varios STREAMS (varias conexiones: dos pestañas, una descarga) multiplexados. Y entre relay y relay todo va por TLS, así que ni siquiera se ve 'que adentro hay celdas de Tor' a simple vista. Un circuito se arma de a poco (se 'extiende' un salto a la vez) y se reusa unos minutos antes de rotar.",
      diagram: "capas",
      bullets: [
        "Celdas de tamaño FIJO (512 B): el largo no te delata.",
        "Varios streams multiplexados sobre un mismo circuito.",
        "TLS entre relays; el circuito se extiende salto a salto.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Qué sabe exactamente el nodo de SALIDA de tu circuito Tor?",
      options: [
        "A dónde va el tráfico, pero no quién lo originó",
        "Quién sos y a dónde vas: las dos cosas",
        "Nada en absoluto",
        "Tu contraseña del destino",
      ],
      correct: 0,
      explain:
        "La salida descifra la última capa y ve el pedido real (el destino), pero recibe el tráfico del relay del medio, no de vos: no conoce tu IP. Por eso un exit malicioso puede espiar tráfico SIN cifrar (de ahí la importancia de HTTPS), pero no sabe a quién pertenece.",
      diagram: "tor",
    },
    {
      kind: "lab",
      title: "Levantá un circuito y leé los 3 saltos",
      body: "Encendé la red de anonimato. Fijate en el circuito completo que se dibuja: los tres relays, de qué país es cada uno y qué sabe cada uno.",
      command: "anon on",
      explain:
        "Se construye un circuito REAL de 3 saltos: vas a ver el guard (sabe quién sos, no a dónde), el relay del medio (no sabe nada útil) y el exit (sabe a dónde, no quién), con sus apodos, países, IPs, huellas y ancho de banda. El destino verá la IP del exit, no la tuya. Mirá que ningún relay tiene las dos puntas: ahí vive tu anonimato.",
      diagram: "tor",
    },
    {
      kind: "concept",
      title: "¿Cómo conoce tu cliente los relays? El consenso",
      body:
        "Tu cliente no 'adivina' los relays: los obtiene de un documento firmado llamado CONSENSO, publicado por un puñado de servidores de confianza (las directory authorities, ~9 repartidas por el mundo) que votan cada hora qué relays existen, cuáles son estables, su ancho de banda y qué rol pueden cumplir (Guard, Exit, HSDir…). Ese consenso es la lista maestra de la red, firmada para que no la puedan falsificar. Tiene un costo: como los relays públicos están todos ahí, un censor puede descargar la lista y bloquearlos — por eso existen los bridges (lo ves en el curso de censura).",
      diagram: "tor",
      bullets: [
        "~9 directory authorities votan el 'consenso' cada hora.",
        "Es la lista firmada de todos los relays (y sus flags/bw).",
        "Al ser pública, habilita el bloqueo por IP (→ bridges).",
      ],
    },
    {
      kind: "concept",
      title: "Los guards y el 'guard discovery'",
      body:
        "¿Por qué el guard es casi siempre el MISMO por meses, en vez de rotar como los otros? Por seguridad. Si eligieras un guard nuevo cada rato, tarde o temprano te tocaría uno malicioso que, combinado con un exit observado, podría deanonimizarte. Al fijar un guard estable por mucho tiempo, reducís la probabilidad de 'toparte' con un relay hostil en la entrada. El ataque que esto mitiga se llama 'guard discovery' / correlación en la entrada. Es un ejemplo hermoso de diseño: la estabilidad del guard es una DEFENSA, no una comodidad.",
      diagram: "tor",
      bullets: [
        "El guard se mantiene estable ~meses a propósito.",
        "Rotarlo seguido aumentaría la chance de un guard malicioso.",
        "Mitiga el 'guard discovery' / correlación en la entrada.",
      ],
    },
    {
      kind: "lab",
      title: "Rotá el circuito (NEWNYM)",
      body: "Pedí un circuito nuevo y comparalo con el anterior: cambian el medio y la salida. Separar actividades en circuitos distintos es parte de operar con cabeza.",
      command: "anon new",
      explain:
        "Obtuviste un circuito nuevo (la señal se llama NEWNYM). En la práctica, un circuito nuevo por 'actividad' evita que dos cosas que hacés queden ligadas por el mismo punto de salida. Ojo: el guard tiende a mantenerse (por lo que vimos); lo que rota es el resto. El anonimato se administra, no se enciende y se olvida.",
      diagram: "tor",
    },
    {
      kind: "concept",
      title: "El riesgo del nodo de salida",
      body:
        "El tramo entre el nodo de salida e internet NO lo cifra Tor: viaja como salga de la aplicación. Si entrás a un sitio por HTTP plano, un exit malicioso puede leer y hasta modificar ese tráfico (contraseñas incluidas); hubo casos reales de exits que hacían 'sslstrip' para degradar HTTPS. Tor te da anonimato de ORIGEN, no confidencialidad de extremo a extremo. Además, cada exit publica una 'exit policy' (qué puertos/destinos permite), y el proyecto marca como 'BadExit' a los que detectan abusando. La regla de oro: HTTPS SIEMPRE sobre Tor, y desconfiar de descargas y logins en claro.",
      diagram: "tor",
      bullets: [
        "Salida → internet NO lo cifra Tor: depende de la app.",
        "Exit malicioso: espía/modifica HTTP, intenta sslstrip.",
        "Exit policies + marca 'BadExit'; vos, HTTPS siempre.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Vas a loguearte a un sitio por Tor. ¿Por qué es crítico que sea HTTPS y no HTTP?",
      options: [
        "Porque el nodo de salida ve el tráfico en claro: con HTTP leería tu usuario y contraseña",
        "Porque HTTP no funciona sobre Tor",
        "Porque HTTPS te hace más anónimo ante tu ISP",
        "Porque el guard vería la contraseña",
      ],
      correct: 0,
      explain:
        "Tor cifra hasta el exit, pero el tramo exit→destino viaja como lo mande la app. Con HTTP plano, un exit hostil lee (y puede alterar) todo, credenciales incluidas. Con HTTPS, ese tramo va cifrado de punta a punta y el exit solo ve a QUÉ dominio te conectás, no el contenido.",
      diagram: "tor",
    },
    {
      kind: "concept",
      title: "Servicios ocultos .onion (v3)",
      body:
        "Un servicio .onion vive DENTRO de Tor: no usa nodo de salida (no toca internet público) y su dirección ES su clave pública (en v3, 56 caracteres). Eso trae dos regalos: el servidor también es anónimo (nadie sabe dónde está alojado) y la dirección se AUTOVALIDA — si te conectás a esa .onion, criptográficamente es la correcta, sin autoridades de certificación que puedan fallar. No hay 'certificado falso' posible: la dirección y la clave son la misma cosa. Muchos .onion son legítimos: espejos anti-censura de medios, el buzón SecureDrop de diarios para recibir filtraciones, versiones .onion de redes sociales.",
      diagram: "tor",
      bullets: [
        "La .onion no usa exit: cliente y servicio quedan ocultos.",
        "La dirección v3 (56 chars) ES la clave pública: se autovalida.",
        "Usos legítimos: anti-censura, SecureDrop, espejos de prensa.",
      ],
    },
    {
      kind: "concept",
      title: "Cómo se encuentran cliente y servicio oculto",
      body:
        "El baile de un .onion es ingenioso. El servicio elige unos 'introduction points' (relays que lo representan) y publica un DESCRIPTOR firmado en los HSDir (una parte del anillo de directorios), indexado por su clave. Cuando querés entrar, bajás ese descriptor, elegís un 'rendezvous point' (un relay cualquiera), y le pedís al servicio —vía sus introduction points— que se encuentre con vos AHÍ. Resultado: ni vos ni el servicio revelan su ubicación real, y ambos hablan a través del rendezvous. Todo con circuitos Tor de por medio en cada tramo.",
      diagram: "tor",
      bullets: [
        "El servicio publica un descriptor firmado en los HSDir.",
        "Se encuentran en un 'rendezvous point' neutral.",
        "Ni cliente ni servicio revelan su ubicación real.",
      ],
    },
    {
      kind: "build",
      goal: "Abrir un servicio oculto .onion usando el circuito de anonimato",
      pieces: ["onion", "biblioteca7k2fx.onion", "curl", "--tor"],
      answer: ["onion", "biblioteca7k2fx.onion"],
      hint: "El comando para alcanzar un servicio oculto es onion, seguido de la dirección .onion. curl no sirve: los .onion no se resuelven por la red normal.",
      explain:
        "`onion biblioteca7k2fx.onion` alcanza el servicio oculto, pero SOLO con el circuito activo (anon on): fuera de Tor, esa dirección no existe (no hay DNS que la resuelva). La reachability depende del estado real de tu anonimato, no de un truco.",
    },
    {
      kind: "lab",
      title: "Leé el estado de tu circuito",
      body: "Revisá el estado del anonimato: la ruta completa del circuito y la IP que ve el destino. Es tu tablero antes de operar.",
      command: "anon status",
      explain:
        "Ves si el circuito está activo, la ruta guard→medio→salida y la IP visible (la del exit). Es el reflejo de confirmar tu salida antes de hacer algo sensible. Si estuviera apagado, te avisa que tu IP real queda expuesta. Combinalo con `identidad` para ver además tu MAC y nivel de anonimato, y con `opsec` para tu rastro.",
      diagram: "radar",
    },
    {
      kind: "concept",
      title: "Rendimiento, latencia y aislamiento de streams",
      body:
        "Tor es más LENTO que una conexión directa, y es inevitable: tu tráfico da la vuelta por 3 relays voluntarios repartidos por el mundo, con cifrado en cada salto. No es para streaming 4K; es para privacidad. Dato clave de OPSEC: el navegador Tor usa 'stream isolation' — distintos sitios salen por circuitos distintos, para que dos pestañas no queden ligadas por un mismo exit. Y por diseño evita cosas que arruinan el anonimato o la latencia (como UDP, que Tor no transporta: por eso no sirve para cualquier cosa, solo TCP).",
      diagram: "capas",
      bullets: [
        "Más lento por diseño: 3 saltos globales + cifrado por capa.",
        "Stream isolation: sitios distintos → circuitos distintos.",
        "Transporta TCP, no UDP: no es para todo tipo de tráfico.",
      ],
    },
    {
      kind: "concept",
      title: "Mitos y malentendidos",
      body:
        "Aclaremos lo que la gente cree mal. (1) 'Tor ES la dark web': no — Tor es una red de anonimato; los .onion son una parte chica, y la mayoría del uso de Tor es navegar la web normal con privacidad. (2) 'Tor te hace invisible/intrazable': no — te da anonimato de red, pero tus errores (identidades reutilizadas, metadatos, malware) te delatan igual. (3) 'Tor es ilegal': no — es legal en casi todo el mundo y lo usan periodistas, activistas, fuerzas de seguridad y gente común. (4) 'La NSA controla todos los relays': no hay evidencia de eso; el riesgo real es el adversario que ve ambas puntas, no un dueño secreto de la red.",
      diagram: "radar",
      bullets: [
        "Tor ≠ dark web: los .onion son una fracción del uso.",
        "No te vuelve invisible: tus errores te delatan.",
        "Es legal y de uso amplio; el riesgo real es ver ambas puntas.",
      ],
    },
    {
      kind: "concept",
      title: "Usos legítimos, ética y cómo no caer",
      body:
        "La privacidad fuerte es infraestructura de libertad: periodistas que protegen fuentes, activistas bajo regímenes represivos, víctimas que escapan de un acosador, gente común que no quiere ser perfilada. La herramienta es neutral; el uso define la ética, y acá todo es educativo y defensivo. Para cerrar: Tor es UNA capa. No operes desde una red que te identifica, no reutilices identidades, limpiá metadatos, usá Tor Browser (no tu navegador 'con Tor'), y recordá que casi nadie cae por romper Tor, sino por OPSEC. Lo profundizan los cursos de compartimentación y desanonimización de este mismo itinerario.",
      diagram: "escudo",
      bullets: [
        "Privacidad fuerte = infraestructura de libertad (uso neutral).",
        "Tor es UNA capa: sumá OPSEC (identidades, metadatos, red).",
        "Usá Tor Browser; no operes desde redes que te identifican.",
      ],
    },
    {
      kind: "lab",
      title: "Cerrá midiendo tu rastro",
      body: "Ya entendés el circuito. Mirá tu panel de OPSEC: ¿tus acciones quedan enmascaradas por el circuito o exponés tu origen? ¿Cuál es tu 'calor'?",
      command: "opsec",
      explain:
        "El tracer te muestra, sobre el estado real, si operás enmascarado (por el circuito) o exponés tu IP, tu 'calor' acumulado y la regla de oro: detección ≠ atribución. Tor te vuelve no-atribuible, no invisible. Ese es el cierre correcto de un curso de Tor: la red es media historia; la otra media es tu disciplina.",
      diagram: "radar",
    },
  ],
};

const ANON_CENSURA: Curso = {
  id: "c-anon-censura",
  title: "Evadir la censura: puentes y transportes",
  subtitle: "Cuando un país bloquea Tor: bridges no listados, obfs4, meek y Snowflake para que tu tráfico no parezca Tor.",
  level: "avanzado",
  skill: "osint",
  hue: 190,
  glyph: "eye",
  reward: { xp: 290, coins: 230 },
  slides: [
    {
      kind: "concept",
      title: "Cómo un país bloquea Tor",
      body:
        "La lista de relays de Tor es pública (está en el consenso). Un censor nacional la descarga y bloquea todas esas IPs: listo, nadie entra a Tor… por la puerta conocida. Además usa DPI (inspección profunda de paquetes) para reconocer el 'handshake' característico de Tor y cortarlo aunque no conozca la IP. Resultado: en países con censura fuerte, conectarse directo a Tor no funciona, y encima USAR Tor te vuelve visible ante el censor. Hay que esconder dos cosas: la ENTRADA y la FORMA del tráfico.",
      diagram: "firewall",
      bullets: [
        "Los relays públicos se bloquean por IP (están en el consenso).",
        "El DPI reconoce la 'forma' del tráfico Tor y lo corta.",
        "Hay que ocultar la entrada Y disfrazar el tráfico.",
      ],
    },
    {
      kind: "concept",
      title: "Bridges: entradas no listadas",
      body:
        "Un BRIDGE es un relay de entrada que NO está en el consenso público: el censor no lo tiene en su lista negra. Los conseguís por canales fuera de banda (una web, un correo automático, un contacto) justamente para que no sean fáciles de enumerar y bloquear en masa. Un bridge resuelve la mitad del problema (la IP de entrada desconocida), pero no la otra: si el DPI reconoce que el tráfico 'parece Tor', igual te corta. Para eso están los transportes enchufables.",
      diagram: "firewall",
      bullets: [
        "Bridge = relay de entrada fuera del consenso público.",
        "Se distribuye con cuentagotas para que no lo enumeren.",
        "Oculta la IP de entrada, pero no la forma del tráfico.",
      ],
    },
    {
      kind: "concept",
      title: "Transportes enchufables: obfs4, meek, Snowflake",
      body:
        "Un pluggable transport DISFRAZA el tráfico para que no parezca Tor. Los tres que importan: OBFS4 vuelve el tráfico un flujo ALEATORIO sin patrones reconocibles (y resiste el escaneo que busca bridges). MEEK lo hace parecer una visita HTTPS a un sitio grande y legítimo (técnica de 'domain fronting'): el censor no puede bloquearlo sin bloquear ese sitio enorme. SNOWFLAKE lo enruta por proxies de voluntarios y lo hace parecer una videollamada WebRTC, efímera y difícil de distinguir. Cada uno cambia la 'firma' que el DPI busca.",
      diagram: "vpn",
      bullets: [
        "obfs4: tráfico aleatorio, sin patrón; resiste el escaneo de bridges.",
        "meek: parece HTTPS a un sitio enorme (domain fronting).",
        "Snowflake: parece una videollamada WebRTC vía voluntarios.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué un bridge con obfs4 es mucho más difícil de bloquear que un relay normal?",
      options: [
        "Porque su IP no está en la lista pública y su tráfico no tiene la 'forma' reconocible de Tor",
        "Porque usa una contraseña más larga",
        "Porque va más rápido",
        "Porque no usa cifrado",
      ],
      correct: 0,
      explain:
        "El bloqueo se hace por dos vías: la IP (lista pública) y la forma del tráfico (DPI). Un bridge esconde la IP (no está listado) y obfs4 esconde la forma (lo vuelve aleatorio). Al tapar ambas, el censor ya no tiene de dónde agarrarse sin bloquear medio internet.",
      diagram: "firewall",
    },
    {
      kind: "concept",
      title: "Elegir según el adversario",
      body:
        "No hay una opción 'mejor': depende de contra quién. ISP que bloquea de forma básica → un bridge obfs4 público alcanza. Firewall NACIONAL agresivo (China, Irán) → conviene meek o Snowflake, y bridges PRIVADOS (que compartís con poca gente) en vez de públicos, porque los públicos se enumeran y caen. El adversario más peligroso es el que quiere DETECTAR que usás Tor (no solo bloquearlo): ahí, parecer 'otra cosa' importa más que la velocidad. Modelá tu amenaza antes de elegir la herramienta.",
      diagram: "firewall",
      bullets: [
        "ISP básico: bridge obfs4 público suele alcanzar.",
        "Firewall nacional: meek/Snowflake + bridges privados.",
        "Si el adversario quiere DETECTAR el uso de Tor, parecer 'otra cosa' manda.",
      ],
    },
    {
      kind: "lab",
      title: "Verificá que salís enmascarado",
      body: "Encendé el anonimato y revisá tu estado: qué IP ve el destino y por dónde salís.",
      command: "anon on",
      explain:
        "Con el circuito activo, el destino ve la IP del nodo de salida, no la tuya. En un escenario de censura, encima disfrazarías la ENTRADA con un bridge y un transporte (obfs4/meek/Snowflake) para que tu proveedor ni siquiera note que usás Tor. Comprobá tu estado con `anon status`.",
      diagram: "vpn",
    },
    {
      kind: "lab",
      title: "Mirá tu identidad de red",
      body: "Revisá tu identidad: IP real vs. IP visible y tu nivel de anonimato. Es el tablero que te dice cuán expuesto estás.",
      command: "identidad",
      explain:
        "El panel compara tu IP real con la visible y te da un 'nivel de anonimato' con consejos concretos para subirlo. En censura, además de la salida, lo que importa es que tu entrada no sea identificable como Tor. Lo que no se mide, no se mejora: por eso se revisa el estado.",
      diagram: "radar",
    },
    {
      kind: "concept",
      title: "La censura y por qué evadirla protege derechos",
      body:
        "Evadir la censura no es un deporte de nicho: es cómo periodistas, activistas y gente común accede a información y se comunica bajo regímenes que vigilan y reprimen. Las mismas herramientas que un criminal podría abusar son las que permiten denunciar corrupción sin terminar preso. Por eso el proyecto Tor, financiado en parte por fundaciones de derechos digitales, invierte tanto en circumvención. La privacidad fuerte es infraestructura de libertad, no un escondite para delincuentes. (Todo acá es ficticio y con fines educativos y defensivos.)",
      diagram: "escudo",
      bullets: [
        "Circumvención = acceso a información y comunicación bajo represión.",
        "La herramienta es neutral; el uso define la ética.",
        "Privacidad fuerte = infraestructura de libertad.",
      ],
    },
  ],
};

const ANON_OPSEC_PRO: Curso = {
  id: "c-anon-opsec-pro",
  title: "OPSEC operacional: compartimentar identidades",
  subtitle: "El anonimato no es una herramienta, es una disciplina: personas separadas, sistemas amnésicos y los datos que te unen.",
  level: "avanzado",
  skill: "osint",
  hue: 230,
  glyph: "person",
  reward: { xp: 440, coins: 350 },
  slides: [
    {
      kind: "concept",
      title: "OPSEC es un proceso, no un botón",
      body:
        "OPSEC (seguridad operacional) viene del ámbito militar y es un PROCESO de cinco pasos: (1) identificar qué información crítica te delataría, (2) analizar las amenazas (quién te busca y con qué capacidad), (3) analizar tus vulnerabilidades (por dónde se filtra esa info), (4) evaluar el riesgo y (5) aplicar contramedidas. Aplicado a vos: tu información crítica es lo que une tu actividad anónima con tu identidad real. El anonimato técnico (Tor) es solo UNA contramedida; sin el proceso, una sola fuga lo tira abajo.",
      diagram: "radar",
      bullets: [
        "OPSEC = proceso de 5 pasos (info crítica → amenaza → vuln → riesgo → contramedida).",
        "Tu info crítica: lo que une tu yo anónimo con tu yo real.",
        "Tor es una contramedida, no el proceso entero.",
      ],
    },
    {
      kind: "concept",
      title: "Compartimentación: identidades que no se tocan",
      body:
        "La técnica central del OPSEC serio es COMPARTIMENTAR: mantener cada 'persona' (identidad) en su propio compartimento estanco, sin que compartan NADA. Persona A tiene su alias, su correo, su sistema/VM, sus horarios; persona B tiene los suyos; tu identidad real es un tercer compartimento. La regla de hierro: un dato no cruza de un compartimento a otro, nunca. El momento en que reusás un email, un alias, una frase o incluso un patrón de horario entre dos personas, tendiste un puente que alguien puede cruzar.",
      diagram: "persona",
      bullets: [
        "Cada identidad en su compartimento estanco: alias, correo, sistema, horarios.",
        "Regla de hierro: ningún dato cruza entre compartimentos.",
        "Un dato reutilizado = un puente entre dos 'vos'.",
      ],
    },
    {
      kind: "concept",
      title: "Niveles de persona: desechable, seudónima, real",
      body:
        "No todas las identidades necesitan el mismo blindaje. Una persona DESECHABLE (burner) se usa una vez y se quema: alias nuevo, sistema amnésico, cero reutilización — ideal para un acto puntual. Una persona SEUDÓNIMA sostenida (un alias que mantenés meses) necesita más disciplina: su propio 'personaje', horarios, estilo y una historia coherente, porque cuanto más vive, más rastro deja. Y está tu identidad REAL, que jamás toca las otras. Elegí el nivel según el riesgo: sobre-blindar una cuenta trivial es desgaste; sub-blindar una sensible es una filtración esperando pasar.",
      diagram: "persona",
      bullets: [
        "Desechable (burner): un uso, se quema, cero reutilización.",
        "Seudónima sostenida: más disciplina cuanto más vive.",
        "Real: nunca toca las otras. El nivel se elige por riesgo.",
      ],
    },
    {
      kind: "concept",
      title: "Lo que cruza los muros sin que lo notes",
      body:
        "Los puentes no siempre son obvios. El email o alias reutilizado es el clásico. Pero también te unen: el HORARIO (siempre activo a la misma hora delata tu zona y rutina), el ESTILO DE ESCRITURA (la 'stylometry' puede atribuir textos por vocabulario y puntuación), los METADATOS de un archivo que subís (GPS, autor), una foto con un reflejo o un paisaje reconocible, y hasta pagar dos cosas con la misma billetera. La compartimentación falla por el detalle más humano, no por la criptografía.",
      diagram: "persona",
      bullets: [
        "Horario y rutina: tu zona y tus hábitos son una huella.",
        "Stylometry: cómo escribís puede atribuir tus textos.",
        "Metadatos, reflejos en fotos y pagos cruzados también unen.",
      ],
    },
    {
      kind: "concept",
      title: "Stylometry: tu forma de escribir te delata",
      body:
        "Vale detenerse acá porque casi nadie lo considera. La STYLOMETRY mide CÓMO escribís —largo de frases, vocabulario, puntuación, muletillas, errores típicos— y puede atribuir un texto anónimo a su autor con sorprendente precisión. Casos reales: a la autora J.K. Rowling la 'desenmascararon' como el seudónimo Robert Galbraith en parte por análisis estilístico; y hay herramientas abiertas (como las del Drexel 'Anonymouth') que atacan y defienden la autoría. Mitigarla cuesta: escribir deliberadamente distinto, frases cortas y neutras, o pasar el texto por traducción ida y vuelta para 'lavar' el estilo. Para OPSEC es una amenaza seria en identidades que escriben mucho.",
      diagram: "osint",
      bullets: [
        "Atribuye textos por estilo (frases, vocabulario, puntuación).",
        "Caso real: Rowling/Galbraith desenmascarada en parte así.",
        "Mitigar cuesta: estilo neutro, frases cortas, traducción ida/vuelta.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Mantenés dos identidades anónimas separadas. ¿Cuál de estos errores las CONECTA?",
      options: [
        "Usar el mismo correo de recuperación (o el mismo alias) en ambas",
        "Conectarte por Tor en las dos",
        "Usar HTTPS en las dos",
        "Tener contraseñas distintas en cada una",
      ],
      correct: 0,
      explain:
        "Reutilizar un correo, un alias o cualquier dato entre dos personas tiende un puente directo: quien lo encuentre une las identidades. Usar Tor y HTTPS en ambas es correcto; tener claves distintas también. El error de OPSEC es el dato compartido, no las buenas prácticas repetidas.",
      diagram: "persona",
    },
    {
      kind: "concept",
      title: "El endpoint: tu equipo es el eslabón",
      body:
        "Podés tener Tor impecable y caer igual si TU EQUIPO está comprometido: un malware ve todo DESDE ADENTRO, con el anonimato de red andando perfecto. Por eso el OPSEC serio cuida el endpoint: sistemas amnésicos que no persisten infecciones (Tails), aislamiento por VM (Qubes/Whonix) para que una app comprometida no alcance tu IP real, no abrir archivos de origen dudoso, deshabilitar macros/scripts, y en casos extremos un equipo DEDICADO y hasta air-gapped para la actividad más sensible. La cadena de anonimato es tan fuerte como el dispositivo donde empieza.",
      diagram: "escudo",
      bullets: [
        "Un malware te delata desde adentro, con Tor andando.",
        "Amnesia (Tails) + aislamiento por VM (Qubes/Whonix).",
        "Casos extremos: equipo dedicado, incluso air-gapped.",
      ],
    },
    {
      kind: "concept",
      title: "Sistemas para compartimentar: Tails, Whonix, Qubes",
      body:
        "La compartimentación se apoya en sistemas pensados para eso. TAILS: un sistema 'amnésico' que arranca desde un USB, enruta TODO por Tor y no deja rastro al apagarse (ideal para una persona desechable). WHONIX: separa en dos máquinas — un 'gateway' que fuerza todo por Tor y una 'workstation' aislada que NUNCA conoce tu IP real, así una app comprometida no puede filtrarla. QUBES OS: lleva la compartimentación al extremo, cada actividad en su propia VM desechable ('seguridad por aislamiento'), y se integra con Whonix. La elección depende de tu modelo de amenaza.",
      diagram: "persona",
      bullets: [
        "Tails: amnésico, todo por Tor, cero rastro (persona desechable).",
        "Whonix: gateway + workstation; la app nunca ve tu IP real.",
        "Qubes: cada actividad en su VM; seguridad por aislamiento.",
      ],
    },
    {
      kind: "concept",
      title: "Whonix por dentro: por qué 'falla cerrado'",
      body:
        "Vale entender la joya de Whonix. Son DOS máquinas virtuales: el GATEWAY, cuya única salida a internet es por Tor, y la WORKSTATION, que SOLO puede hablar con el gateway (no tiene otra ruta de red). ¿La consecuencia hermosa? Si una app de la workstation se compromete o intenta 'llamar a casa', no tiene forma de alcanzar internet salvo por Tor, y NUNCA ve tu IP real porque ni siquiera la conoce. Se dice que 'falla cerrado' (fail-closed): ante un error o un exploit, por defecto NO se filtra la identidad. Ese diseño vence a un montón de fugas (DNS, WebRTC, exploits) sin que vos tengas que acordarte de nada.",
      diagram: "persona",
      bullets: [
        "Gateway (solo-Tor) + Workstation (solo-gateway).",
        "La workstation no conoce tu IP real: no puede filtrarla.",
        "Fail-closed: ante un error, por defecto NO se expone.",
      ],
    },
    {
      kind: "lab",
      title: "Medí tu nivel de anonimato",
      body: "Antes de 'mejorar', medí. Mirá tu identidad de red: IP real vs. visible, tus MAC y tu nivel de anonimato con consejos.",
      command: "identidad",
      explain:
        "El panel te da un nivel (0 a 3) y tips concretos para subirlo. Es tu punto de partida: no se mejora lo que no se mide. Fijate qué te falta (quizás la red de anonimato apagada, o la MAC sin cambiar) y atacá eso.",
      diagram: "radar",
    },
    {
      kind: "lab",
      title: "Cambiá tu identidad local (MAC)",
      body: "Tu placa de red se presenta con una MAC que te identifica en la red local. Cambiála por una aleatoria para no dejar esa huella fija.",
      command: "macchanger wlan0 random",
      explain:
        "Cambiaste la MAC de tu placa: en la red local (ese WiFi del campus o del café) ya no te presentás con tu identificador de fábrica. Es la contramedida que faltó en varios casos reales de gente rastreada por conectarse desde la misma red. Es UNA capa; combinala con el anonimato de red.",
      diagram: "persona",
    },
    {
      kind: "lab",
      title: "Volvé a medir: ¿subió tu nivel?",
      body: "Después de endurecer, volvé a mirar tu identidad. Idealmente, el nivel de anonimato subió. Encendé también `anon on` si todavía no lo hiciste.",
      command: "identidad",
      explain:
        "Comparar el 'antes' y el 'después' es el hábito que convierte el OPSEC en disciplina medible. Cada contramedida (MAC cambiada, anonimato activo) sube tu nivel. El objetivo no es un número: es cerrar, una por una, las vías por las que te filtrás.",
      diagram: "radar",
    },
    {
      kind: "concept",
      title: "Fugas técnicas: DNS, WebRTC y fingerprint",
      body:
        "Aun con Tor, el equipo puede filtrarte por 'fugas': una consulta DNS que sale por fuera del túnel (DNS leak) revela qué sitios visitás; WebRTC en el navegador puede exponer tu IP real; y el FINGERPRINT (fuentes, resolución, idioma) te identifica aunque cambies de IP. Tor Browser las tapa a propósito: enruta el DNS por Tor, desactiva WebRTC y hace que TODOS los usuarios se vean IGUAL (misma huella, ventana en tamaños estándar con 'letterboxing'). Moraleja: no uses tu navegador de siempre 'con Tor'; usá el navegador pensado para Tor.",
      diagram: "osint",
      bullets: [
        "DNS leak y WebRTC pueden filtrar tu IP/actividad real.",
        "El fingerprint te identifica aunque cambies de IP.",
        "Tor Browser uniforma a todos y tapa esas fugas: usalo, no improvises.",
      ],
    },
    {
      kind: "concept",
      title: "Rutina y horarios: la huella que nadie cuida",
      body:
        "Un patrón sutil y potente: CUÁNDO actuás. Si tu persona anónima publica siempre entre las 20 y las 23, y descansa fines de semana, estás revelando tu zona horaria y tu rutina — a veces hasta tu profesión. Correlacionar 'cuándo está activo' con husos horarios achica el mapa enormemente. Operadores serios rompen el patrón a propósito: publican en horarios variados, a veces simulando otra zona horaria, y evitan la regularidad que delata. El tiempo es un metadato más, y de los más difíciles de 'apagar' porque es tu propia vida.",
      diagram: "radar",
      bullets: [
        "Tus horarios revelan zona horaria, rutina y a veces profesión.",
        "Correlacionar 'cuándo está activo' achica el mapa muchísimo.",
        "Rompé el patrón: horarios variados, evitá la regularidad.",
      ],
    },
    {
      kind: "concept",
      title: "OPSEC sostenible: la disciplina que podés mantener",
      body:
        "El peor enemigo del OPSEC no es la falta de herramientas: es la INSOSTENIBILIDAD. Si tu plan es tan estricto que no lo podés mantener un día cansado, vas a hacer un atajo — y el atajo es justo por donde se filtra todo. Más capas no siempre es más seguro: suman complejidad, errores y falsa sensación de invulnerabilidad. El mejor plan es el MÍNIMO que cubre tu modelo de amenaza y que sostenés SIEMPRE, sin excepción. Consistencia > intensidad: una regla simple cumplida el 100% de las veces le gana a una compleja cumplida el 90%. Diseñá un OPSEC que quepa en tu vida real.",
      diagram: "escudo",
      bullets: [
        "El atajo (por cansancio) es por donde se filtra todo.",
        "Más capas pueden sumar errores y falsa seguridad.",
        "Consistencia > intensidad: el mínimo que sostenés al 100%.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Cuál es el mejor plan de OPSEC para una identidad que vas a mantener meses?",
      options: [
        "El mínimo que cubre tu modelo de amenaza y que podés sostener SIEMPRE, sin excepción",
        "El más complejo posible, con todas las herramientas que existan",
        "Uno distinto cada día para confundir al adversario",
        "Ninguno: con Tor alcanza",
      ],
      correct: 0,
      explain:
        "La seguridad real sale de la CONSISTENCIA. Un plan insostenible genera atajos, y el atajo es la fuga. El mínimo que cubre tu amenaza y cumplís el 100% de las veces vence a uno elaborado que abandonás a la semana. Tor solo no alcanza: es una pieza del proceso.",
      diagram: "escudo",
    },
    {
      kind: "concept",
      title: "Tu matriz: activo → amenaza → fuga → contramedida",
      body:
        "Cerremos con el entregable concreto del OPSEC. Armá una matriz simple: por cada ACTIVO que protegés (tu ubicación, tu identidad, tus fuentes), listá la AMENAZA (quién y con qué capacidad), la FUGA posible (por dónde se filtra: red, metadatos, estilo, horario, endpoint, dinero) y la CONTRAMEDIDA concreta y SOSTENIBLE. Revisá la matriz cuando cambie el contexto (nuevo adversario, herramienta comprometida, cambio en lo que hacés). El anonimato no es un estado que alcanzás una vez: es un proceso que mantenés, y la matriz es cómo lo hacés auditable para vos mismo.",
      diagram: "radar",
      bullets: [
        "Matriz: activo → amenaza → fuga → contramedida sostenible.",
        "Cubrí todas las vías: red, metadatos, estilo, horario, endpoint, dinero.",
        "Revisala cuando cambie el contexto: es un proceso, no un estado.",
      ],
    },
    {
      kind: "lab",
      title: "Cerrá midiendo tu rastro operacional",
      body: "Juntá todo lo medible: abrí el panel de OPSEC y leé tu exposición real — enmascarado vs. expuesto, tu 'calor' y la regla de atribución.",
      command: "opsec",
      explain:
        "El tracer te muestra si operás enmascarado (por el circuito) o exponés tu origen, y tu 'calor'. Leelo a la luz de tu matriz: lo técnico (red) es solo una fila. Las otras —identidades, metadatos, estilo, horarios, endpoint, dinero— no las mide un panel: las sostenés vos. Esa es la diferencia entre encender Tor y hacer OPSEC.",
      diagram: "radar",
    },
  ],
};

const ANON_DEANON: Curso = {
  id: "c-anon-deanon",
  title: "Cómo caen: desanonimización real",
  subtitle: "Casi nadie cae por romper Tor, sino por un error humano. Casos reales y qué nos enseñan para no repetirlos.",
  level: "avanzado",
  skill: "osint",
  hue: 10,
  glyph: "search",
  reward: { xp: 300, coins: 240 },
  slides: [
    {
      kind: "concept",
      title: "La verdad incómoda",
      body:
        "Cuando alguien 'anónimo' cae, el titular dice 'rompieron Tor'. Casi nunca es así. Revisando casos judiciales reales de servicios ocultos, la enorme mayoría de las desanonimizaciones vinieron de ERRORES DEL OPERADOR, malware en el endpoint, rastros financieros y trabajo policial clásico — no de atacar el protocolo. La herramienta anda; la gente falla. Estudiar cómo cayeron otros es la mejor clase de OPSEC, porque los errores se repiten.",
      diagram: "radar",
      bullets: [
        "El titular dice 'rompieron Tor'; la realidad, casi nunca.",
        "Caen por errores humanos, malware y rastros financieros.",
        "Estudiar caídas ajenas = la mejor clase de OPSEC.",
      ],
    },
    {
      kind: "concept",
      title: "Caso Silk Road: la identidad reutilizada",
      body:
        "Ross Ulbricht manejaba el mercado Silk Road como 'Dread Pirate Roberts', sobre un servicio oculto. No lo atraparon rompiendo Tor: lo delató reutilizar identidades. En 2011, un usuario 'altoid' promocionó Silk Road en foros y, meses después, con el MISMO alias, pidió contratar un dev y dejó su correo personal: rossulbricht@gmail.com. Además, en StackOverflow preguntó —con su nombre real— cómo conectarse a un servicio oculto Tor por PHP; cambió el nombre un minuto después, pero el registro ya había quedado. Migas reutilizadas, juntadas por investigadores: su propio OPSEC lo hundió.",
      diagram: "osint",
      bullets: [
        "No rompieron Tor: reutilizó alias e identidad.",
        "'altoid' promocionó Silk Road y luego filtró su gmail real.",
        "Una pregunta en StackOverflow con su nombre selló el caso.",
      ],
    },
    {
      kind: "concept",
      title: "Caso AlphaBay (2017): el email de bienvenida",
      body:
        "AlphaBay fue el sucesor gigante de Silk Road. Su administrador, Alexandre Cazes, cayó por un detalle de OPSEC tan chico como mortal: los correos de BIENVENIDA y de recuperación de contraseña del mercado salían con su email PERSONAL en los encabezados ('pimp_alex_91@hotmail.com'), un alias que ya estaba ligado a su identidad real en otros lados. Sumado a reutilización de infraestructura, eso bastó para atribuirle el mercado. Fue arrestado en Tailandia en 2017. Moraleja: una fuga en un rincón que 'nadie mira' (una cabecera de email automática) puede deshacer años de anonimato. Revisá TODO lo que tu sistema emite, no solo lo que vos escribís.",
      diagram: "osint",
      bullets: [
        "El email automático del mercado llevaba su correo personal real.",
        "Un alias reutilizado lo ligó a su identidad; + reúso de infra.",
        "Revisá lo que tu sistema EMITE, no solo lo que escribís.",
      ],
    },
    {
      kind: "concept",
      title: "Caso Freedom Hosting (2013): el exploit del navegador",
      body:
        "Acá sí hubo ataque técnico, pero NO a Tor: al NAVEGADOR. El FBI usó una 'NIT' (Network Investigative Technique): un exploit de la versión de Firefox que venía en el Tor Browser, que ejecutaba JavaScript para hacer que la máquina de la víctima 'llamara a casa' REVELANDO su IP real por fuera de Tor. Afectó a usuarios de servicios alojados en Freedom Hosting. Lecciones durísimas: mantené el Tor Browser SIEMPRE actualizado, usá el nivel de seguridad 'Safest' (JavaScript desactivado) para lo sensible, y recordá que el eslabón atacado fue el endpoint/navegador, no la red. Tor te anonimiza; un navegador vulnerable te desanonimiza.",
      diagram: "escudo",
      bullets: [
        "NIT = exploit del Firefox del Tor Browser, no de Tor.",
        "JavaScript hizo 'llamar a casa' revelando la IP real.",
        "Defensa: Tor Browser al día + modo 'Safest' (JS off).",
      ],
    },
    {
      kind: "concept",
      title: "Caso Harvard (2013): la herramienta rara te señala",
      body:
        "Eldo Kim, un estudiante, mandó una amenaza de bomba falsa para suspender un examen, usando Tor + un correo temporal. ¿Cómo lo encontraron en horas, sin tocar Tor? Simple: envió el correo desde el WiFi de Harvard, y la universidad pudo ver QUIÉN estaba usando Tor en su red en esa ventana de tiempo. Como casi nadie usaba Tor ahí a esa hora, la correlación fue trivial. Bruce Schneier lo resumió: usar una herramienta RARA te vuelve el principal sospechoso. No rompieron el anonimato; lo volvieron irrelevante por el contexto, y él confesó.",
      diagram: "radar",
      bullets: [
        "Mandó la amenaza por Tor… desde el WiFi del campus.",
        "La red reveló quién usaba Tor en esa ventana: correlación trivial.",
        "Lección (Schneier): la herramienta rara te convierte en sospechoso.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Qué delató a Eldo Kim, si usó Tor correctamente para enviar el correo?",
      options: [
        "Que era de los poquísimos usando Tor en la red de Harvard en esa franja horaria: la correlación lo señaló",
        "Que Tor tiene una puerta trasera",
        "Que su contraseña era débil",
        "Que publicó su gmail",
      ],
      correct: 0,
      explain:
        "No hubo fallo de Tor. La universidad vio quién usaba Tor en su propia red justo cuando llegó la amenaza; siendo casi el único, quedó señalado. Defensa real: usar un bridge (que no se note que usás Tor) y, sobre todo, no operar desde una red que te identifica. El contexto delata más que el protocolo.",
      diagram: "radar",
    },
    {
      kind: "concept",
      title: "Ataques de correlación de tráfico",
      body:
        "El ataque técnico más temido a Tor NO rompe el cifrado: observa el TIMING y el VOLUMEN. Un adversario que vea el tráfico que ENTRA a la red (tu guard) y el que SALE (hacia el destino) puede correlacionar los patrones —ráfagas, tamaños, tiempos— y deducir que son el mismo flujo, uniendo origen y destino estadísticamente. Requiere ver ambas puntas (un adversario 'global' o con suerte de posición), por eso no es trivial, pero existe. Mitigaciones: padding, evitar patrones predecibles, y asumir que un adversario a escala de internet es una amenaza real para objetivos de alto valor.",
      diagram: "tor",
      bullets: [
        "No rompe cripto: correlaciona timing y volumen de entrada y salida.",
        "Necesita ver ambas puntas (adversario global o bien ubicado).",
        "Mitigar: padding, evitar patrones; asumir la amenaza en alto valor.",
      ],
    },
    {
      kind: "concept",
      title: "Honeypots: cuando la ley opera el servicio",
      body:
        "Un frente que no es técnico ni de OPSEC personal: a veces el servicio oculto al que te conectás ESTÁ controlado por la policía. Hubo operaciones donde las fuerzas de seguridad incautaron un servicio oculto y lo SIGUIERON OPERANDO un tiempo para observar y desplegar NITs contra sus usuarios. Contra esto no hay 'truco Tor' que valga: si el servidor del otro lado te quiere identificar y vos le das una superficie (JavaScript activo, un navegador viejo, datos personales), te agarra. La defensa es la misma disciplina de siempre: minimizar la superficie del endpoint, no entregar datos, y asumir que el otro lado puede ser hostil.",
      diagram: "radar",
      bullets: [
        "A veces el servicio oculto lo opera la propia policía.",
        "Lo mantienen vivo para observar y desplegar NITs.",
        "Defensa: minimizar superficie del endpoint; el otro lado puede ser hostil.",
      ],
    },
    {
      kind: "concept",
      title: "El endpoint y el dinero: los otros dos frentes",
      body:
        "Dos vías más que no tocan Tor. EL ENDPOINT: si tu equipo se infecta (un PDF o un exploit del navegador), el malware te delata desde adentro, con Tor andando perfecto; por eso importan los sistemas amnésicos/aislados (Tails/Whonix/Qubes) y no abrir cualquier cosa. EL DINERO: la cadena de Bitcoin es pública y permanente; si en algún punto convertiste a dinero real por un exchange con KYC, ese rastro financiero une tu actividad 'anónima' con tu identidad legal. Muchos casos se resolvieron siguiendo la plata, no la red.",
      diagram: "osint",
      bullets: [
        "Endpoint comprometido = te delata desde adentro (Tor igual anda).",
        "La cadena de Bitcoin es pública: el KYC une el rastro con tu DNI.",
        "Seguir la plata resolvió más casos que atacar Tor.",
      ],
    },
    {
      kind: "concept",
      title: "Chain analysis: cómo se sigue la plata",
      body:
        "Vale profundizar en el frente financiero porque resolvió casos enormes. Como el libro mayor de Bitcoin es PÚBLICO y PERMANENTE, empresas de 'chain analysis' (Chainalysis, Elliptic) arman el grafo de quién pagó a quién y agrupan direcciones que probablemente son del mismo dueño (heurística: las que se usan juntas como entradas de una transacción). Etiquetan direcciones de exchanges, mercados y servicios conocidos. Cuando una cadena de pagos toca un exchange con KYC, se une a una identidad legal — y como la blockchain NO OLVIDA, ese análisis se puede hacer AÑOS después. Por eso 'me pagaron en cripto' no es anonimato: es un rastro permanente esperando ser etiquetado.",
      diagram: "radar",
      bullets: [
        "Grafo público de pagos + clustering de direcciones del mismo dueño.",
        "El KYC de un exchange ata la cadena a una identidad legal.",
        "La blockchain no olvida: el análisis se hace años después.",
      ],
    },
    {
      kind: "lab",
      title: "Mirá tu propio rastro",
      body: "Llevá la lección a vos: abrí el panel de OPSEC y mirá qué estás dejando. ¿Tus acciones quedan enmascaradas o expuestas? ¿Cuál es tu 'calor'?",
      command: "opsec",
      explain:
        "El tracer te muestra, sobre el estado real, si operás enmascarado o exponés tu origen, y tu 'calor' acumulado. Los casos de arriba cayeron por detalles así: una red que identifica, una identidad reutilizada, un rastro que nadie midió. El espejo es incómodo a propósito.",
      diagram: "radar",
    },
    {
      kind: "quiz",
      prompt: "Mirando todos los casos, ¿cuál es el patrón de POR QUÉ cae la gente 'anónima'?",
      options: [
        "Errores humanos y de endpoint/dinero (identidad reutilizada, navegador vulnerable, rastro financiero), casi nunca romper Tor",
        "Porque Tor tiene una puerta trasera conocida",
        "Porque el cifrado de Tor es débil",
        "Por mala suerte, sin un patrón",
      ],
      correct: 0,
      explain:
        "Silk Road (alias reutilizado), AlphaBay (email automático), Harvard (red que identifica), Freedom Hosting (exploit del navegador), el dinero (chain analysis): NINGUNO fue romper el cifrado de Tor. El patrón es siempre el mismo: el eslabón humano, el endpoint y el dinero. Por eso la disciplina —no la herramienta— es lo que no falla.",
      diagram: "radar",
    },
    {
      kind: "concept",
      title: "El checklist que separa a quien cae de quien no",
      body:
        "Juntando todo: no operes desde una red que te identifica (campus, trabajo, tu casa sin bridge). Compartimentá y NUNCA reutilices alias, correos ni frases entre personas. Limpiá metadatos antes de publicar nada. Usá el sistema correcto (Tails/Whonix), no tu equipo de siempre. Asumí que el dinero deja rastro permanente. Y recordá la regla de Schneier: cuanto más rara sea tu herramienta en tu contexto, más sospechoso sos — a veces lo más anónimo es NO destacar. La disciplina, no la herramienta, es lo que no falla.",
      diagram: "escudo",
      bullets: [
        "No operes desde redes que te identifican; compartimentá siempre.",
        "Limpiá metadatos; usá el sistema pensado para esto; cuidá el dinero.",
        "La disciplina sostenida vale más que cualquier herramienta.",
      ],
    },
  ],
};

const OSINT_AVANZADO: Curso = {
  id: "c-osint-avanzado",
  title: "OSINT avanzado: de la foto al perfil",
  subtitle: "Geolocalización, SOCMINT, enumeración de alias y datos filtrados: cómo se arma un perfil y cómo se audita el propio.",
  level: "avanzado",
  skill: "osint",
  hue: 300,
  glyph: "search",
  reward: { xp: 280, coins: 220 },
  slides: [
    {
      kind: "concept",
      title: "OSINT es un proceso dirigido",
      body:
        "OSINT profesional no es 'googlear a alguien': es un ciclo de inteligencia. (1) DIRECCIÓN: definís qué querés responder y por qué (con un marco ético/legal claro). (2) RECOLECCIÓN: juntás datos de fuentes abiertas sin tocar nada privado. (3) PROCESAMIENTO: ordenás y verificás (una fuente no es un hecho). (4) ANÁLISIS: conectás piezas para responder la pregunta. (5) DIFUSIÓN: comunicás con cuidado. La diferencia entre un investigador y un curioso es ese método, y la trazabilidad de cada dato.",
      diagram: "osint",
      bullets: [
        "Ciclo: dirección → recolección → procesamiento → análisis → difusión.",
        "Una fuente no es un hecho: verificá y cruzá.",
        "El método (y la ética) separan al investigador del curioso.",
      ],
    },
    {
      kind: "concept",
      title: "Geolocalización y chronolocation",
      body:
        "Ubicar DÓNDE y CUÁNDO se tomó una imagen, sin metadatos, es una especialidad entera. Geolocalización: carteles, idioma, patentes, arquitectura, tipo de enchufes, montañas de fondo, y comparación con imágenes satelitales/Street View. Chronolocation: la posición del sol y las SOMBRAS dan la hora; el clima de ese día, el estado de una obra en construcción o la vegetación acotan la fecha. Equipos como Bellingcat resolvieron investigaciones de alto impacto así, solo con imágenes públicas y paciencia. Una 'búsqueda inversa de imagen' suele ser el primer paso.",
      diagram: "osint",
      bullets: [
        "Geoloc: carteles, idioma, arquitectura, satélite/Street View.",
        "Chronoloc: sombras (hora), clima y cambios en el paisaje (fecha).",
        "La búsqueda inversa de imagen es el primer movimiento.",
      ],
    },
    {
      kind: "concept",
      title: "SOCMINT y enumeración de alias",
      body:
        "SOCMINT es inteligencia de redes sociales. La técnica más productiva: la ENUMERACIÓN DE NOMBRES DE USUARIO. La gente reutiliza el mismo alias en decenas de plataformas; encontrarlo en una te da hilos en todas. Se cruza con fotos de perfil (búsqueda inversa), listas de seguidos, horarios de actividad y 'me gusta'. Dos cuentas que parecen separadas se unen por un alias compartido, una misma foto, o un patrón de publicación idéntico. Es exactamente lo que el OPSEC de compartimentación busca evitar.",
      diagram: "osint",
      bullets: [
        "Username enumeration: el mismo alias en N plataformas conecta todo.",
        "Se cruza con foto de perfil, seguidos y horarios.",
        "Es el reverso del OPSEC: lo que une personas 'separadas'.",
      ],
    },
    {
      kind: "concept",
      title: "Datos filtrados (breach data)",
      body:
        "Cuando un sitio sufre una brecha, correos y contraseñas terminan en bases que circulan. En OSINT DEFENSIVO se consulta si un correo propio apareció en filtraciones conocidas (servicios tipo 'have I been pwned') para saber qué contraseñas rotar. Del lado ofensivo, un atacante cruza esas filtraciones con sus otros hallazgos para 'credential stuffing' (probar la misma clave en otros sitios) o para enriquecer un perfil. Lección doble: no reutilices contraseñas, y auditá tu propia exposición periódicamente.",
      diagram: "hash",
      bullets: [
        "Las brechas publican correos y claves que después circulan.",
        "Defensivo: chequeá si tu correo salió y rotá claves.",
        "Ofensivo: credential stuffing y enriquecer perfiles.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Encontrás dos cuentas 'anónimas' que sospechás que son la misma persona. ¿Qué las CONECTA de forma más sólida?",
      options: [
        "El mismo nombre de usuario (o la misma foto de perfil) reutilizado en ambas",
        "Que las dos usan la letra 'a'",
        "Que postean sobre temas populares",
        "Que ambas existen en internet",
      ],
      correct: 0,
      explain:
        "Un alias o una foto de perfil reutilizados son un vínculo fuerte y verificable entre dos cuentas. Los temas populares o detalles genéricos no prueban nada. Por eso, del lado de la privacidad, cada persona necesita alias y fotos ÚNICOS: el dato compartido es el que delata.",
      diagram: "osint",
    },
    {
      kind: "lab",
      title: "Geoint real: extraé la ubicación de una foto",
      body: "Practicá la cara más directa del OSINT de imágenes: leé los metadatos de una foto y buscá sus coordenadas GPS. Una imagen 'inocente' puede traer la dirección adentro.",
      command: "exiftool foto.jpg",
      explain:
        "La foto delató autor, cámara, fecha y GPS (-25.2985, -57.6350: un punto real en Asunción). Eso es geolocalización servida en bandeja. Cuando NO hay GPS, se recurre a la geo/chronolocation por el contenido. Y la defensa es la misma de siempre: limpiá metadatos con `exiftool -all= foto.jpg` antes de publicar.",
      diagram: "archivo",
    },
    {
      kind: "concept",
      title: "Stylometry: tu forma de escribir te delata",
      body:
        "La STYLOMETRY analiza CÓMO escribís —vocabulario, largo de frases, puntuación, errores típicos, muletillas— para atribuir textos a un autor, incluso entre identidades 'anónimas'. Es poderosa: puede unir un post anónimo con tu cuenta real por el estilo. Mitigarla es difícil y costoso: escribir distinto a propósito, usar frases cortas y neutras, o pasar el texto por traducción ida y vuelta. Para OSINT es una herramienta de atribución; para OPSEC, una amenaza real que casi nadie considera.",
      diagram: "osint",
      bullets: [
        "Analiza vocabulario, puntuación y muletillas para atribuir autoría.",
        "Puede unir un texto 'anónimo' con tu identidad real.",
        "Mitigar cuesta: estilo neutro, frases cortas, traducción ida y vuelta.",
      ],
    },
    {
      kind: "concept",
      title: "Ética y legalidad: la línea que no se cruza",
      body:
        "OSINT es legal porque usa fuentes abiertas, pero poderoso no es lo mismo que correcto. Principios profesionales: MINIMIZACIÓN (recolectá solo lo necesario para tu pregunta), PROPORCIONALIDAD (el fin justifica el alcance, no más), trazabilidad (de dónde salió cada dato), y jamás acosar, doxear ni exponer a una persona. La misma técnica que audita tu exposición alimenta el stalking si se usa mal. Regla: investigá sistemas, organizaciones con interés público y TU PROPIA huella; nunca conviertas a una persona en objetivo.",
      diagram: "phishing",
      bullets: [
        "Minimización + proporcionalidad + trazabilidad.",
        "Nunca acosar, doxear ni exponer a una persona.",
        "Investigá sistemas y tu propia huella, no gente.",
      ],
    },
  ],
};

const ANON_METADATA: Curso = {
  id: "c-anon-metadata",
  title: "Metadatos: la limpieza que nadie hace",
  subtitle: "No solo las fotos: documentos, PDF y capturas filtran autor, GPS e historial. Y 'tachar' casi nunca alcanza.",
  level: "avanzado",
  skill: "osint",
  hue: 275,
  glyph: "search",
  reward: { xp: 270, coins: 210 },
  slides: [
    {
      kind: "concept",
      title: "Metadatos están en TODO, no solo en fotos",
      body:
        "Ya viste el GPS escondido en una foto. Pero los metadatos viven en casi todo archivo: un documento de Word o un PDF guardan autor, organización, usuario del sistema, software y hasta el historial de ediciones y comentarios borrados. Un audio o un video traen fecha, dispositivo y a veces ubicación. Hasta la impresora deja micro-puntos amarillos en las hojas. Publicás 'un archivo' y, sin querer, publicás quién lo hizo, con qué y desde dónde.",
      diagram: "archivo",
      bullets: [
        "Office/PDF: autor, organización, usuario del SO, software.",
        "Audio/video: fecha, dispositivo, a veces ubicación.",
        "El archivo dice más de vos que su contenido.",
      ],
    },
    {
      kind: "concept",
      title: "Casos reales: cuando el metadato delató",
      body:
        "No es teórico. En 2003, un dossier del gobierno británico sobre Irak reveló, por los metadatos de Word, los nombres de quienes lo editaron (y que partes eran copiadas). El creador del malware Melissa cayó en parte por el GUID que Word incrustaba en los documentos. Y en empresas, publicar PDFs sin limpiar expuso nombres internos, rutas de red y versiones de software — oro para un atacante que arma su recon. El metadato es la fuga silenciosa más subestimada.",
      diagram: "archivo",
      bullets: [
        "Dossier de Irak (2003): Word delató a los editores.",
        "Melissa: el GUID de Word ayudó a identificar al autor.",
        "PDFs corporativos filtran nombres, rutas y versiones.",
      ],
    },
    {
      kind: "concept",
      title: "Redaction fail: 'tachar' no borra",
      body:
        "El error más común y más grave: creer que ocultar es borrar. Un rectángulo negro encima de texto en un PDF deja el texto SELECCIONABLE debajo: se copia y se lee. Recortar una imagen a veces guarda el original completo: en 2023, 'aCropalypse' (CVE-2023-21036) mostró que capturas recortadas con la herramienta de los Pixel y el Snipping Tool de Windows podían RECUPERARSE casi enteras, porque el archivo conservaba los datos 'recortados'. Ocultar en la capa visual no toca los bytes de abajo.",
      diagram: "archivo",
      bullets: [
        "Barra negra en PDF = texto seleccionable debajo: se lee igual.",
        "aCropalypse 2023 (CVE-2023-21036): capturas recortadas, recuperables.",
        "Ocultar ≠ borrar: lo que importa son los bytes, no lo que se ve.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Tachás un párrafo secreto de un PDF con un rectángulo negro y lo publicás. ¿Qué pasa?",
      options: [
        "El texto sigue debajo y se puede seleccionar/copiar: la redacción falló",
        "El texto se borra para siempre, es seguro",
        "El PDF se corrompe",
        "Solo se ve en impresoras viejas",
      ],
      correct: 0,
      explain:
        "El rectángulo es una capa visual encima; el texto original sigue en el archivo. Cualquiera lo selecciona, lo copia o lo extrae con una herramienta. La redacción real elimina el contenido del archivo (o se aplana a imagen y se re-exporta), no lo tapa.",
      diagram: "archivo",
    },
    {
      kind: "lab",
      title: "Revelá lo que esconde un archivo",
      body: "Leé los metadatos de una foto y mirá todo lo que trae: autor, cámara, software y GPS. Es el mismo principio para documentos.",
      command: "exiftool foto.jpg",
      explain:
        "exiftool vuelca los metadatos: autor, cámara, fecha y GPS (-25.2985, -57.6350, un punto real). Para documentos la idea es idéntica. Antes de publicar CUALQUIER archivo, mirá qué lleva adentro: casi siempre hay algo que no querías compartir.",
      diagram: "archivo",
    },
    {
      kind: "concept",
      title: "La limpieza correcta",
      body:
        "Limpiar bien no es 'tachar': es ELIMINAR. Strippear todos los metadatos (exiftool -all=), re-exportar el archivo desde cero, APLANAR (convertir a imagen o 'imprimir a PDF' para destruir capas y texto oculto), y usar herramientas pensadas para esto (el 'Metadata Anonymisation Toolkit' que trae Tails). Para capturas sensibles, recortá y después re-exportá/aplaná, no confíes en el recorte de la app. Regla: tratá cada archivo que sale como evidencia que alguien va a analizar.",
      diagram: "escudo",
      bullets: [
        "exiftool -all= strippea; re-exportar y APLANAR destruye capas.",
        "Herramientas dedicadas (MAT2 en Tails) para hacerlo bien.",
        "Capturas: recortá y re-exportá; no confíes en el 'crop' de la app.",
      ],
    },
    {
      kind: "lab",
      title: "Limpiá antes de publicar",
      body: "Ponete del lado defensivo: borrale los metadatos a la foto. Compará con lo que viste antes.",
      command: "exiftool -all= foto.jpg",
      explain:
        "Le quitaste GPS, autor y software: ahora se puede compartir sin regalar tu ubicación. Dominás las dos caras del mismo comando: `exiftool foto.jpg` REVELA (OSINT) y `exiftool -all= foto.jpg` LIMPIA (OPSEC). Esa higiene, hecha SIEMPRE, cierra una de las fugas más comunes.",
      diagram: "escudo",
    },
    {
      kind: "concept",
      title: "Metadatos en la operación real",
      body:
        "A escala, los metadatos arman un mapa de una organización: subí 20 PDFs públicos de una empresa a una herramienta como FOCA y sale el software que usan, nombres de empleados, rutas internas y convenciones de usuario — recon sin tocar un servidor. Del lado defensivo, toda org seria limpia metadatos antes de publicar, por política. Para vos: incorporá 'revisar y limpiar metadatos' a tu checklist de publicación, igual que revisás que no se filtre una contraseña. La disciplina gana.",
      diagram: "osint",
      bullets: [
        "20 PDFs públicos → software, empleados y rutas de una org (FOCA).",
        "Las orgs serias limpian metadatos por política.",
        "Sumá 'limpiar metadatos' a tu checklist de publicación.",
      ],
    },
  ],
};

const ANON_THREAT: Curso = {
  id: "c-anon-threat",
  title: "Modelado de amenazas: contra quién te escondés",
  subtitle: "No existe 'anónimo' en abstracto: siempre es anónimo respecto a ALGUIEN. Definí ese alguien antes de elegir herramientas.",
  level: "avanzado",
  skill: "osint",
  hue: 220,
  glyph: "eye",
  reward: { xp: 280, coins: 220 },
  slides: [
    {
      kind: "concept",
      title: "'Anónimo' no significa nada sin un adversario",
      body:
        "La pregunta '¿esto es anónimo?' está mal planteada. Lo correcto es '¿anónimo RESPECTO A QUIÉN?'. Esconderte de un vecino curioso, de una empresa de publicidad, de tu ISP, de la policía local o de una agencia nacional son problemas RADICALMENTE distintos, con contramedidas distintas. Sin definir el adversario, no podés saber si tus medidas alcanzan o si estás perdiendo el tiempo blindándote contra la amenaza equivocada. El modelado de amenazas es el paso cero, antes de tocar una herramienta.",
      diagram: "radar",
      bullets: [
        "La pregunta útil: ¿anónimo respecto a QUIÉN?",
        "Cada adversario = problema y contramedidas distintas.",
        "Modelar la amenaza es el paso CERO del anonimato.",
      ],
    },
    {
      kind: "concept",
      title: "Las cinco preguntas (modelo de la EFF)",
      body:
        "Un modelo de amenazas práctico responde cinco preguntas: (1) ¿Qué quiero proteger? (mis activos: mi identidad, mi ubicación, mis fuentes). (2) ¿De quién? (el adversario). (3) ¿Qué capacidad tiene? (un vecino vs. una agencia con presupuesto). (4) ¿Qué tan grave es si falla? (la consecuencia). (5) ¿Cuánto esfuerzo estoy dispuesto a invertir? (el costo que acepto). Las respuestas definen tu plan. Sin la 5, caés en el extremo: o no hacés nada, o te aislás tanto que no podés operar.",
      diagram: "radar",
      bullets: [
        "Activos, adversario, capacidad, consecuencia, esfuerzo aceptable.",
        "Las respuestas definen las contramedidas, no al revés.",
        "La pregunta 5 evita tanto la vagancia como la paranoia inútil.",
      ],
    },
    {
      kind: "concept",
      title: "El espectro de adversarios",
      body:
        "Ordenados por capacidad: el vecino/curioso (lo frena una buena contraseña y no sobrecompartir); el anunciante/plataforma (bloqueadores, cuentas separadas); tu ISP o el WiFi (cifrado, VPN/Tor); un atacante dirigido (compartimentación, higiene de endpoint); la policía local (todo lo anterior + no operar desde redes que te identifican); una agencia nacional con capacidad de ver mucho tráfico (acá entran correlación global, bridges, y asumir que el error humano te mata). Subir un escalón cambia TODO el plan. La mayoría de la gente se defiende del escalón equivocado.",
      diagram: "radar",
      bullets: [
        "Vecino → anunciante → ISP → atacante dirigido → policía → agencia.",
        "Cada escalón exige contramedidas cualitativamente distintas.",
        "El error típico: blindarse contra el adversario equivocado.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿De qué depende, antes que nada, qué contramedidas de anonimato necesitás?",
      options: [
        "Del adversario concreto del que te querés proteger y su capacidad",
        "De cuántas herramientas instales, cuantas más mejor",
        "De la marca de tu teléfono",
        "De nada: hay una solución única para todos",
      ],
      correct: 0,
      explain:
        "Las contramedidas se derivan del adversario y su capacidad, no de acumular herramientas. Protegerte de un anunciante y de una agencia nacional son planes distintos. 'Más herramientas' sin un modelo detrás suele agregar complejidad (y errores) sin cerrar la amenaza real.",
      diagram: "radar",
    },
    {
      kind: "concept",
      title: "El anonimato ama la compañía",
      body:
        "Un principio contraintuitivo de Tor: 'anonymity loves company'. Tu anonimato NO sale solo de la tecnología, sino de parecerte a muchos otros. Si sos el único usando una herramienta exótica, destacás y te volvés el sospechoso (recordá a Eldo Kim). Por eso conviene usar herramientas estándar y bien pobladas (Tor con su configuración por defecto, Tor Browser que hace a todos iguales) en vez de inventar tu propia solución 'más segura': una config única es, en sí misma, una huella. Esconderse en la multitud le gana a esconderse solo.",
      diagram: "tor",
      bullets: [
        "Tu anonimato crece con la cantidad de gente igual a vos.",
        "Herramienta/config exótica = huella que te destaca.",
        "Usá lo estándar y poblado; no inventes tu 'solución especial'.",
      ],
    },
    {
      kind: "lab",
      title: "Mirá tu postura actual",
      body: "Antes de planificar, medí dónde estás parado: tu identidad de red y tu nivel de anonimato con sus consejos.",
      command: "identidad",
      explain:
        "El panel te da tu nivel (0-3) y tips. Leelo a la luz de TU modelo de amenazas: si solo te escondés de un sitio web, quizás alcanza; si tu adversario es serio, cada tip que falta es una vía abierta. La medición cobra sentido recién cuando sabés de quién te escondés.",
      diagram: "radar",
    },
    {
      kind: "concept",
      title: "Sobre-ingeniería y burnout de OPSEC",
      body:
        "Un peligro real: el OPSEC insostenible. Si tu plan es tan estricto que no podés mantenerlo, vas a hacer atajos, y el atajo es justo donde se filtra la info. Más capas no siempre es más seguro: a veces agregan complejidad, errores y una falsa sensación de invulnerabilidad. El mejor plan es el MÍNIMO que cubre tu modelo de amenazas y que podés sostener SIEMPRE, sin excepción. Consistencia > intensidad: una regla simple cumplida el 100% de las veces vence a una compleja cumplida el 90%.",
      diagram: "escudo",
      bullets: [
        "OPSEC insostenible = atajos = fugas.",
        "Más capas pueden sumar errores y falsa seguridad.",
        "El mejor plan: el mínimo que cubre tu amenaza y sostenés al 100%.",
      ],
    },
    {
      kind: "concept",
      title: "Armá tu plan (y revisalo)",
      body:
        "Juntá todo en una matriz simple: por cada activo que protegés, listá el adversario, la vía por la que podría llegar, y la contramedida concreta y SOSTENIBLE. Revisá el plan cuando cambie el contexto: un nuevo adversario, una herramienta comprometida, un cambio en lo que hacés. El anonimato no es un estado que alcanzás una vez: es un proceso que mantenés. Y el eslabón más débil, siempre, sos vos en un día de apuro — por eso el plan tiene que caber en tu vida real.",
      diagram: "escudo",
      bullets: [
        "Matriz: activo → adversario → vía → contramedida sostenible.",
        "Revisá el plan cuando cambia el contexto.",
        "El anonimato es un proceso que se mantiene, no un estado.",
      ],
    },
  ],
};

const ANON_CRIPTO: Curso = {
  id: "c-anon-cripto",
  title: "Rastro financiero: cripto y anonimato",
  subtitle: "Bitcoin no es anónimo, es seudónimo: el libro mayor es público y permanente. Cómo se sigue la plata y dónde se corta.",
  level: "avanzado",
  skill: "osint",
  hue: 40,
  glyph: "search",
  reward: { xp: 280, coins: 220 },
  slides: [
    {
      kind: "concept",
      title: "Bitcoin no es anónimo: es seudónimo",
      body:
        "El gran malentendido: 'cripto = anónimo'. Falso. Bitcoin es SEUDÓNIMO: cada transacción queda en un libro mayor PÚBLICO y PERMANENTE (la blockchain), visible para cualquiera, para siempre. No aparece tu nombre, aparece tu dirección (un seudónimo). Pero si en algún momento alguien conecta una dirección con tu identidad, puede ver TODA tu historia hacia atrás y hacia adelante. Es lo opuesto al efectivo: no hay forma de 'olvidar' una transacción.",
      diagram: "hash",
      bullets: [
        "La blockchain es un libro mayor público y permanente.",
        "Tu dirección es un seudónimo, no un anónimo.",
        "Conectar una dirección con vos revela TODA tu historia.",
      ],
    },
    {
      kind: "concept",
      title: "Chain analysis: seguir el grafo",
      body:
        "Como todas las transacciones son públicas, se pueden ANALIZAR. Empresas de 'chain analysis' (Chainalysis, Elliptic) arman el grafo de quién le pagó a quién y aplican heurísticas para agrupar direcciones que probablemente pertenecen a la misma persona (por ejemplo, las que se usan juntas como entradas de una transacción). Etiquetan direcciones de exchanges, mercados y servicios conocidos. El resultado: un mapa enorme donde una sola etiqueta puede desenrollar toda una red. La transparencia de la blockchain es un arma de doble filo.",
      diagram: "radar",
      bullets: [
        "Todo es público → se arma el grafo de pagos.",
        "Heurísticas agrupan direcciones de un mismo dueño (clustering).",
        "Una etiqueta conocida desenrolla una red entera.",
      ],
    },
    {
      kind: "concept",
      title: "El punto de quiebre: el KYC",
      body:
        "La cadena de seudónimos se rompe donde el cripto toca el mundo real: los exchanges con KYC ('conocé a tu cliente'). Para pasar de pesos a cripto o al revés (on/off-ramp), casi siempre das tu documento. Desde ese momento, el exchange —y quien lo subpoene— puede unir tus direcciones con tu identidad legal. Por eso 'seguir la plata' resolvió tantos casos: no hace falta romper Tor si el sospechoso cobró en un exchange que pide DNI. El rastro financiero suele ser el eslabón más débil de una operación 'anónima'.",
      diagram: "radar",
      bullets: [
        "El KYC del exchange une tus direcciones con tu DNI.",
        "El on/off-ramp (pesos ↔ cripto) es el punto de quiebre.",
        "Seguir la plata resolvió casos sin tocar Tor.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Qué suele conectar una dirección de Bitcoin 'anónima' con una identidad real?",
      options: [
        "El paso por un exchange con KYC (donde diste tu documento)",
        "El color de la billetera",
        "La hora del día",
        "Nada: Bitcoin es imposible de rastrear",
      ],
      correct: 0,
      explain:
        "El libro mayor es público pero seudónimo; lo que lo ata a una persona es el punto donde el cripto toca el mundo regulado: el exchange con KYC. Ahí queda tu documento ligado a tus direcciones. Creer que 'Bitcoin es intrazable' es justo el error que hundió a muchos.",
      diagram: "hash",
    },
    {
      kind: "concept",
      title: "Ofuscación y sus límites",
      body:
        "Existen técnicas para dificultar el análisis, con límites claros. Los MIXERS y CoinJoin (Wasabi, Samourai) juntan monedas de muchos para romper el vínculo entrada-salida; ayudan, pero el análisis moderno a veces los desarma, y usarlos puede marcarte. REUTILIZAR direcciones es un error clásico que facilita el clustering: usá una nueva por transacción. Y están las PRIVACY COINS como Monero, diseñadas para ser privadas por defecto (firmas de anillo que ocultan el emisor, direcciones ocultas para el receptor, montos cifrados). Ninguna técnica es magia: el eslabón humano (un KYC, una reutilización, un descuido) sigue mandando.",
      diagram: "hash",
      bullets: [
        "Mixers/CoinJoin rompen el vínculo entrada-salida (con límites).",
        "No reutilizar direcciones; una nueva por transacción.",
        "Monero: privado por defecto (ring signatures + stealth addresses).",
      ],
    },
    {
      kind: "lab",
      title: "Conectá el rastro con tu OPSEC",
      body: "El dinero es una dimensión más de tu rastro. Abrí el panel de OPSEC y pensá el rastro financiero como una capa de exposición que no se borra.",
      command: "opsec",
      explain:
        "El tracer te muestra tu exposición de red; sumale mentalmente la financiera, que es PERMANENTE (la blockchain no olvida). Si una operación 'anónima' toca dinero real, asumí que ese rastro puede unirte con tu identidad en cualquier momento futuro. El tiempo juega en contra: lo que hoy es seudónimo, mañana puede etiquetarse.",
      diagram: "radar",
    },
    {
      kind: "concept",
      title: "La lección operacional",
      body:
        "De los casos reales sale una moraleja dura: en una operación anónima, el dinero es muchas veces el frente más débil, no la red. Podés tener un Tor impecable y caer porque cobraste en una dirección reutilizada que un exchange con KYC terminó ligando a tu nombre, meses después. Si hay dinero real de por medio, tratá cada transacción como permanente y potencialmente atribuible. La privacidad financiera existe y es legítima, pero exige la misma disciplina que el resto del OPSEC: compartimentar, no reutilizar, y entender el modelo de amenazas.",
      diagram: "escudo",
      bullets: [
        "El dinero suele ser el frente más débil de una operación anónima.",
        "La blockchain es permanente: lo seudónimo puede volverse atribuible.",
        "Misma disciplina que el OPSEC: compartimentar y no reutilizar.",
      ],
    },
  ],
};

export const ANONIMATO_AVANZADO_COURSES: Curso[] = [
  ANON_TOR,
  ANON_CENSURA,
  ANON_OPSEC_PRO,
  ANON_DEANON,
  ANON_METADATA,
  ANON_THREAT,
  ANON_CRIPTO,
  OSINT_AVANZADO,
];
