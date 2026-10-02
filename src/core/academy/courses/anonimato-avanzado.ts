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
  subtitle: "Cómo funciona de verdad el enrutamiento cebolla: guard, relay medio, salida, el consenso y los servicios .onion v3.",
  level: "avanzado",
  skill: "osint",
  hue: 265,
  glyph: "mask",
  reward: { xp: 300, coins: 240 },
  slides: [
    {
      kind: "concept",
      title: "El problema que Tor resuelve",
      body:
        "Una VPN te obliga a confiar en UN servidor que ve las dos puntas (quién sos y a dónde vas). Tor (The Onion Router) elimina ese punto único de confianza distribuyéndolo: tu tráfico pasa por TRES relays operados por gente distinta, elegidos de una red de miles de voluntarios, y ninguno conoce la historia completa. No es 'una VPN mejor': es un modelo de confianza diferente. La red la mantienen voluntarios y el proyecto Tor; vos no confiás en una empresa, confiás en que los tres relays no estén coludidos.",
      diagram: "tor",
      bullets: [
        "VPN = un solo punto que ve las dos puntas (confianza única).",
        "Tor = 3 relays de operadores distintos; nadie ve todo.",
        "Cambia el MODELO de confianza, no es 'una VPN más'.",
      ],
    },
    {
      kind: "concept",
      title: "Los tres saltos: guard, medio y salida",
      body:
        "El circuito tiene tres relays con roles claros. El GUARD (entrada) sabe tu IP real, pero no a dónde vas (solo ve tráfico cifrado hacia el siguiente). El RELAY DEL MEDIO solo conecta entrada con salida: no sabe ni quién sos ni a dónde vas. El de SALIDA (exit) sabe a dónde va el tráfico, pero no quién lo originó. La propiedad clave: NINGÚN nodo tiene las dos puntas a la vez. El guard se mantiene estable un tiempo (meses) a propósito, para reducir la chance de toparte con uno malicioso.",
      diagram: "tor",
      bullets: [
        "Guard: sabe tu IP, no el destino (es estable por meses).",
        "Medio: solo une entrada y salida; no sabe nada útil.",
        "Salida: sabe el destino, no tu identidad.",
      ],
    },
    {
      kind: "concept",
      title: "El cifrado en capas (la cebolla)",
      body:
        "Antes de enviar, tu cliente envuelve el paquete en TRES capas de cifrado, una por relay, en orden inverso. El guard pela la primera capa y ve 'mandáselo al relay medio'; el medio pela la segunda y ve 'mandáselo a la salida'; la salida pela la última y recién ahí aparece el pedido real. Por eso se llama 'cebolla': cada salto quita una capa. Cada relay solo puede descifrar SU capa, así que solo conoce al anterior y al siguiente, nunca la ruta entera.",
      diagram: "tor",
      bullets: [
        "3 capas de cifrado, una por relay (orden inverso).",
        "Cada salto pela una capa y ve solo el próximo tramo.",
        "Ningún relay puede leer más allá de su capa.",
      ],
    },
    {
      kind: "concept",
      title: "¿Cómo conoce tu cliente los relays? El consenso",
      body:
        "Tu cliente no 'adivina' los relays: los obtiene de un documento firmado llamado CONSENSO, publicado por un puñado de servidores de confianza (las directory authorities) que votan cada hora qué relays existen, cuáles son estables y cuáles pueden ser guard o salida. Ese consenso es la lista maestra de la red. Por eso los relays públicos son conocidos — un dato clave cuando veamos cómo un país intenta bloquear Tor y por qué existen los 'bridges'.",
      diagram: "tor",
      bullets: [
        "Directory authorities votan el 'consenso' cada hora.",
        "El consenso es la lista firmada de todos los relays.",
        "Los relays públicos son conocidos: eso habilita el bloqueo (→ bridges).",
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
      title: "Levantá un circuito y mirá tu salida",
      body: "Encendé la red de anonimato y observá por qué país y con qué IP salís. Ese es tu nodo de salida real para esta sesión.",
      command: "anon on",
      explain:
        "Activaste el circuito: el destino verá la IP del nodo de salida (en otro país), no la tuya. Comprobá tu estado con `anon status`. Rotá a otro circuito con `anon new` cuando quieras separar actividades. Esto es enrutamiento cebolla real sobre el estado del mundo, no un cartel decorativo.",
      diagram: "tor",
    },
    {
      kind: "concept",
      title: "El riesgo del nodo de salida",
      body:
        "El tramo entre el nodo de salida e internet NO lo cifra Tor: viaja como salga de la aplicación. Si entrás a un sitio por HTTP plano, un exit malicioso puede leer y hasta modificar ese tráfico (contraseñas incluidas). Tor te da anonimato de ORIGEN, no confidencialidad de extremo a extremo. Por eso la regla de oro es HTTPS SIEMPRE sobre Tor, y desconfiar de descargas y logins en claro. El anonimato de red no reemplaza al cifrado de la aplicación.",
      diagram: "tor",
      bullets: [
        "Salida → internet NO lo cifra Tor: depende de la app.",
        "HTTP plano sobre Tor = un exit malicioso te lee/modifica.",
        "Tor da anonimato de origen, no confidencialidad E2E: usá HTTPS.",
      ],
    },
    {
      kind: "lab",
      title: "Rotá el circuito",
      body: "Pedí un circuito nuevo y fijate que cambia el nodo de salida. Separar actividades en circuitos distintos es parte de operar con cabeza.",
      command: "anon new",
      explain:
        "Obtuviste un circuito nuevo con otra salida. En la práctica, un circuito nuevo por 'actividad' evita que dos cosas que hacés queden ligadas por el mismo punto de salida. El anonimato se administra, no se enciende y se olvida.",
      diagram: "tor",
    },
    {
      kind: "concept",
      title: "Servicios ocultos .onion (v3)",
      body:
        "Un servicio .onion vive DENTRO de Tor: no usa nodo de salida (no toca internet público) y su dirección ES su clave pública (en v3, 56 caracteres). Eso trae dos regalos: el servidor también es anónimo (nadie sabe dónde está alojado) y la dirección se AUTOVALIDA (si te conectás a esa .onion, criptográficamente es la correcta, sin autoridades de certificación). Cliente y servicio se encuentran en un 'punto de rendezvous' sin que ninguno revele su ubicación. Muchos son legítimos: espejos anti-censura, buzones de filtraciones para prensa.",
      diagram: "tor",
      bullets: [
        "La .onion no usa exit: cliente y servicio quedan ocultos.",
        "La dirección v3 es la clave pública: se autovalida sin CA.",
        "Usos legítimos: anti-censura, buzones seguros de denuncia.",
      ],
    },
    {
      kind: "build",
      goal: "Abrir un servicio oculto .onion usando el circuito de anonimato",
      pieces: ["onion", "biblioteca7k2fx.onion", "curl", "--tor"],
      answer: ["onion", "biblioteca7k2fx.onion"],
      hint: "El comando para alcanzar un servicio oculto es onion, seguido de la dirección .onion. curl no sirve: los .onion no se resuelven por la red normal.",
      explain:
        "`onion biblioteca7k2fx.onion` alcanza el servicio oculto, pero SOLO con el circuito activo (anon on): fuera de Tor, esa dirección no existe. La reachability depende del estado real de tu anonimato, no de un truco.",
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
  reward: { xp: 310, coins: 250 },
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
      kind: "lab",
      title: "Mirá tu propio rastro",
      body: "Llevá la lección a vos: abrí el panel de OPSEC y mirá qué estás dejando. ¿Tus acciones quedan enmascaradas o expuestas? ¿Cuál es tu 'calor'?",
      command: "opsec",
      explain:
        "El tracer te muestra, sobre el estado real, si operás enmascarado o exponés tu origen, y tu 'calor' acumulado. Los casos de arriba cayeron por detalles así: una red que identifica, una identidad reutilizada, un rastro que nadie midió. El espejo es incómodo a propósito.",
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

export const ANONIMATO_AVANZADO_COURSES: Curso[] = [
  ANON_TOR,
  ANON_CENSURA,
  ANON_OPSEC_PRO,
  ANON_DEANON,
  OSINT_AVANZADO,
];
