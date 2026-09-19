import type { Curso } from "../courseTypes";

/**
 * Cursos del módulo "blue" (Blue Team / defensa). Del otro lado del mostrador:
 * no atacás, DEFENDÉS. Cada lab está ligado a herramientas REALES del mundo
 * ÑANDE: el SOC vivo (comando `soc`), la fuerza bruta de hydra que deja
 * evidencia, y el laboratorio web soc.nande (triage, SIEM, DFIR) con banderas
 * reales. Defender enseña tanto como atacar.
 */

/* ------------------------------------------------------------------ *
 *  CURSO 1 — Blue Team: el que defiende (de cero, para principiantes) *
 * ------------------------------------------------------------------ */

const BLUE_INTRO: Curso = {
  id: "c-blue-intro",
  title: "Blue Team: el que defiende",
  subtitle: "Del otro lado: logs, alertas, el SOC y la defensa en capas.",
  level: "principiante",
  skill: "blue-team",
  hue: 205,
  glyph: "eye",
  reward: { xp: 130, coins: 90 },
  slides: [
    {
      kind: "concept",
      title: "Dos lados de la misma moneda",
      body:
        "Hasta ahora jugaste al ATACANTE: escaneás, entrás, capturás banderas. Pero por cada atacante hay alguien del otro lado cuidando la casa: el Blue Team, el equipo azul. Su trabajo no es romper, es MIRAR, darse cuenta y frenar. La buena noticia: como ya sabés atacar, entendés qué mira el defensor mejor que nadie.",
      diagram: "escudo",
      bullets: [
        "Red Team = ataca (lo que venís practicando).",
        "Blue Team = defiende: detecta, investiga y contiene.",
        "El mejor defensor es el que sabe cómo piensa el atacante.",
      ],
    },
    {
      kind: "concept",
      title: "Todo ataque deja huellas",
      body:
        "Esto es lo más importante del curso: en una computadora, NADA es invisible. Cada vez que alguien pide una página, prueba una contraseña o entra a un panel, el servidor lo anota en un registro (un log). El atacante hace ruido sin querer, y ese ruido queda escrito. El defensor vive de leer esas huellas.",
      diagram: "terminal",
      bullets: [
        "Log = una línea de texto que anota QUÉ pasó, CUÁNDO y DESDE DÓNDE.",
        "El atacante deja rastro aunque no quiera: intentos, horarios, su IP.",
        "Defender empieza por una idea simple: leer lo que quedó escrito.",
      ],
    },
    {
      kind: "concept",
      title: "Cómo se ve un log de verdad",
      body:
        "Un log de servidor web se lee así:\n\n   10.10.66.13 - [09:14:06] POST /login 401  usuario=admin\n\n• 10.10.66.13 → la IP que hizo el pedido (quién).\n• [09:14:06] → la hora exacta (cuándo).\n• POST /login → qué pidió (intentar entrar).\n• 401 → cómo salió (401 = credencial rechazada).\n\nUna línea sola no dice mucho. La magia está en LEER MUCHAS JUNTAS y ver el patrón.",
      diagram: "archivo",
      bullets: [
        "200 = salió bien · 401 = login rechazado · 404 = no existe.",
        "Una IP repitiendo 401 muchas veces = alguien probando claves.",
      ],
    },
    {
      kind: "quiz",
      prompt:
        "Mirá estas cuatro líneas de log. ¿Cuál te haría sospechar de un ataque?",
      options: [
        "10.10.66.13 repite POST /login 401 tres veces y después entra a /admin",
        "10.10.4.7 abre la página de inicio y mira productos",
        "10.10.0.5 hace un chequeo /healthz a las 03:00 (monitor interno)",
        "10.10.9.2 lee la página 'nosotros' una vez",
      ],
      correct: 0,
      explain:
        "Varios 401 seguidos (login rechazado) desde la misma IP y JUSTO después un acceso a /admin es el patrón clásico: probó claves, encontró una y entró. Las otras líneas son tráfico normal. Detectar es reconocer patrones raros en medio del ruido normal.",
      diagram: "archivo",
    },
    {
      kind: "concept",
      title: "De log a alerta: alguien tiene que avisar",
      body:
        "Un servidor genera miles de líneas por hora. Nadie las lee a mano. Por eso existe un sistema que las junta todas y AVISA cuando ve algo raro: cuando una IP falla 20 logins seguidos, salta una alerta. Ese sistema se llama SIEM (lo vemos en detalle en el próximo curso). El log es la materia prima; la alerta es el SIEM diciendo 'mirá esto'.",
      diagram: "capas",
      bullets: [
        "El SIEM junta los logs de todos los equipos en un solo lugar.",
        "Aplica reglas: si pasa X, generá una alerta.",
        "Alerta = 'humano, vení a mirar esto ya'.",
      ],
    },
    {
      kind: "concept",
      title: "El SOC: la sala de guardia",
      body:
        "El SOC (Security Operations Center) es la sala donde trabaja el Blue Team. Es como la guardia de un hospital: llegan alertas todo el tiempo y el analista tiene que decidir cuál es una emergencia real y cuál es una falsa alarma. Su trabajo diario tiene tres pasos: MIRAR (triage), CORRELACIONAR (juntar las piezas) y CONCLUIR (qué pasó y cómo frenarlo).",
      bullets: [
        "SOC = el centro de operaciones donde se defiende, 24/7.",
        "Triage = separar la emergencia real del ruido.",
        "El analista no adivina: se apoya en la evidencia (los logs).",
      ],
    },
    {
      kind: "quiz",
      prompt:
        "En el SOC llega una alerta: 'Pico de CPU por el backup de las 03:00'. Resulta que el backup corre todas las noches a esa hora. ¿Qué es?",
      options: [
        "Un falso positivo: parece raro pero es una tarea normal y esperada",
        "Un ataque grave que hay que reportar a la policía",
        "Una bandera para capturar",
        "Un virus nuevo",
      ],
      correct: 0,
      explain:
        "Un FALSO POSITIVO es una alerta que parece sospechosa pero tiene una explicación normal. Gran parte del trabajo del analista es cerrar falsos positivos rápido para no perder de vista el incidente REAL. Si te asustás con todo, no ves lo que importa.",
    },
    {
      kind: "concept",
      title: "Defensa en capas",
      body:
        "Ningún muro solo es perfecto. Por eso se defiende en CAPAS: si el atacante pasa una, se choca con la siguiente. El firewall bloquea puertas que no deberían estar abiertas; las contraseñas fuertes frenan la fuerza bruta; el SIEM detecta lo que igual pasó; y el backup te salva si todo lo demás falla. A esto se le dice 'defensa en profundidad'.",
      diagram: "firewall",
      bullets: [
        "Firewall: deja pasar solo lo permitido, bloquea el resto.",
        "Cada capa asume que la anterior puede fallar.",
        "Detección + respuesta importan tanto como la prevención.",
      ],
    },
    {
      kind: "build",
      goal: "Pedirle al laboratorio del SOC (soc.nande) los registros crudos del servidor atacado, para leerlos vos mismo",
      pieces: ["curl", "http://soc.nande/logs", "nmap", "ping"],
      answer: ["curl", "http://soc.nande/logs"],
      hint: "curl es la herramienta para pedirle una página a un servidor. Después va la dirección de los registros: http://soc.nande/logs",
      explain:
        "curl http://soc.nande/logs le pide al servidor del SOC sus registros de acceso y te los muestra en la terminal. Es exactamente lo que hace un analista al empezar: traer los logs crudos para leerlos con sus propios ojos.",
    },
    {
      kind: "lab",
      title: "Practicá: leé los registros y ubicá al intruso",
      body:
        "Abrí la terminal y traé los registros del servidor atacado desde el laboratorio del SOC. Vas a ver tráfico normal mezclado con el del atacante. Buscá la IP 10.10.66.13: fijate cómo prueba el login (varios 401), después hace una búsqueda rara con UNION SELECT y termina entrando a /admin. Esa es la historia del ataque, escrita en los logs.",
      command: "curl http://soc.nande/logs",
      explain:
        "Leíste registros reales y reconstruiste mentalmente el ataque solo con los logs. Eso es lo primero que hace un defensor. La IP 10.10.66.13 es tu sospechoso: en los próximos cursos vas a correlacionar toda su cadena en el SIEM y a reconstruir el incidente paso a paso.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Repaso: el defensor piensa como atacante",
      body:
        "Ya tenés el mapa mental del Blue Team:\n\n1. Todo ataque deja HUELLAS en los logs.\n2. El SIEM junta esos logs y dispara ALERTAS.\n3. En el SOC, el analista hace TRIAGE: separa el incidente real del ruido.\n4. La defensa es en CAPAS: si una falla, la siguiente aguanta.\n\nComo ya sabés atacar, sabés qué huella deja cada ataque. Esa es tu ventaja como defensor. En el próximo curso cazás al atacante con el SIEM.",
      diagram: "escudo",
      bullets: [
        "Huellas → Alertas → Triage → Contención.",
        "Saber atacar te hace mejor defensor, no peor persona.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 2 — Cazar al atacante con el SIEM (correlación + triage)     *
 * ------------------------------------------------------------------ */

const BLUE_SIEM: Curso = {
  id: "c-blue-siem",
  title: "Cazar al atacante con el SIEM",
  subtitle: "Correlacionar eventos, detectar la fuerza bruta y hacer triage.",
  level: "intermedio",
  skill: "blue-team",
  hue: 22,
  glyph: "bell",
  reward: { xp: 190, coins: 150 },
  slides: [
    {
      kind: "concept",
      title: "¿Qué es un SIEM?",
      body:
        "SIEM se lee 'si-em' y significa, más o menos, 'gestor de eventos de seguridad'. Es el cerebro del SOC: un solo lugar donde caen los logs de TODOS los equipos (servidores, firewalls, routers) al mismo tiempo. En vez de entrar equipo por equipo, el analista busca en el SIEM y ve todo junto. Es el Google de los registros de tu red.",
      diagram: "capas",
      bullets: [
        "SIEM = junta los logs de toda la red en un solo buscador.",
        "Sin SIEM, tendrías que revisar cada equipo a mano.",
        "En ÑANDE, el comando `soc` y el laboratorio soc.nande son tu SIEM.",
      ],
    },
    {
      kind: "quiz",
      prompt:
        "Un ataque salta desde el router al servidor web y de ahí a la base de datos. ¿Por qué conviene tener TODOS los logs juntos en el SIEM?",
      options: [
        "Porque así seguís al atacante saltando de equipo en equipo, sin perderlo",
        "Porque ocupa menos espacio en disco",
        "Porque hace la red más rápida",
        "Porque borra los logs viejos automáticamente",
      ],
      correct: 0,
      explain:
        "Un ataque real cruza varios equipos. Si mirás cada log por separado, ves pedacitos sueltos. Juntándolos en el SIEM podés SEGUIR la cadena completa: el mismo atacante en el router, en la web y en la base. Eso es correlacionar.",
    },
    {
      kind: "concept",
      title: "Correlación: el superpoder del SIEM",
      body:
        "Cuando alguien lanza fuerza bruta contra un login, genera cientos de líneas '401 rechazado'. Un SIEM malo te tira 200 alertas (una por intento) y te vuelve loco. Un SIEM bueno CORRELACIONA: se da cuenta de que son la misma ráfaga y las junta en UNA sola alerta crítica: 'posible fuerza bruta, 200 intentos desde 10.10.66.13'. De 200 líneas de ruido a 1 alerta clara.",
      diagram: "fuerzabruta",
      bullets: [
        "Correlacionar = juntar muchos eventos relacionados en uno.",
        "200 intentos fallidos → 1 alerta crítica, no 200 alertas.",
        "Así el analista ve el bosque, no cada árbol.",
      ],
    },
    {
      kind: "concept",
      title: "Acordate de tu ataque con hydra",
      body:
        "En el curso de contraseñas usaste hydra para probar miles de claves contra un SSH. Cada intento golpeó de verdad la autenticación del servidor… y cada rechazo quedó registrado. Ahora vas a verlo DESDE EL OTRO LADO: vas a lanzar esa misma fuerza bruta y a mirar cómo el SOC la detecta en tiempo real. El ruido que hiciste como atacante es lo que te delata como defensor.",
      diagram: "fuerzabruta",
      bullets: [
        "hydra prueba usuario × clave hasta que una entra.",
        "Cada intento fallido = un evento login.failure que el SOC ve.",
        "Atacar hace ruido; el SIEM está escuchando.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: generá la ráfaga y miralá caer en el SOC",
      body:
        "Vas a hacer dos cosas de un tirón: lanzar la fuerza bruta contra server.nande y después pedirle al SOC sus alertas. Mirá cómo TODOS esos intentos fallidos NO generan mil alertas: el SIEM los correlaciona en una sola alerta crítica de 'Posible fuerza bruta'. Eso es correlación funcionando en vivo.",
      command: "hydra ssh://server.nande && soc alerts",
      explain:
        "Acabás de ver el ciclo completo: tu ataque (hydra) produjo eventos reales, y el SOC los correlacionó en una alerta crítica en lugar de ahogarte en ruido. Fijate la regla que la disparó (ND-005, técnica MITRE T1110 · Brute Force). El SIEM no inventa: reacciona a lo que de verdad pasó en la red.",
      diagram: "terminal",
    },
    {
      kind: "quiz",
      prompt:
        "Un atacante hace 200 intentos de login fallidos en 10 segundos. ¿Qué debería mostrar un buen SIEM?",
      options: [
        "1 alerta crítica correlacionada ('fuerza bruta, 200 intentos')",
        "200 alertas separadas, una por intento",
        "Ninguna alerta, 200 es poco",
        "Un correo de felicitaciones al atacante",
      ],
      correct: 0,
      explain:
        "Correlación: los 200 intentos son la MISMA ráfaga, así que se juntan en una sola alerta que va subiendo su contador. 200 alertas sueltas serían ruido inútil. Una alerta crítica clara es lo que deja actuar rápido al analista.",
      diagram: "fuerzabruta",
    },
    {
      kind: "concept",
      title: "Buscar por la IP del atacante",
      body:
        "Ya tenés un sospechoso de los logs: 10.10.66.13. El siguiente paso es buscar TODO lo que hizo esa IP en el SIEM. Al buscar por su dirección, el SIEM te trae su cadena completa: los login fallidos, la inyección SQL, el acceso a /admin y la exfiltración de datos. Buscar por el indicador correcto (la IP) es lo que junta la historia en una sola vista.",
      diagram: "terminal",
      bullets: [
        "El laboratorio soc.nande tiene un buscador SIEM en /siem.",
        "Buscás por la IP del atacante y aparece toda su actividad.",
        "Buscar por una IP inocente (10.10.4.7) no correlaciona nada raro.",
      ],
    },
    {
      kind: "build",
      goal: "Buscar en el SIEM del laboratorio soc.nande TODOS los eventos de la IP del atacante (10.10.66.13) para correlacionar su cadena",
      pieces: [
        "curl",
        "http://soc.nande/siem?q=10.10.66.13",
        "http://soc.nande/siem?q=10.10.4.7",
        "nmap",
      ],
      answer: ["curl", "http://soc.nande/siem?q=10.10.66.13"],
      hint: "curl pide la página. La consulta del SIEM va en la URL: /siem?q= seguido de la IP del ATACANTE, 10.10.66.13 (no la del usuario inocente).",
      explain:
        "curl http://soc.nande/siem?q=10.10.66.13 le pide al SIEM todos los eventos que mencionan esa IP. Como es la del atacante, trae su cadena entera y logra la correlación. Buscar por 10.10.4.7 (un usuario normal) no muestra nada sospechoso: por eso importa elegir bien el indicador.",
    },
    {
      kind: "lab",
      title: "Practicá: correlacioná al atacante en el SIEM",
      body:
        "Enviá la búsqueda del SIEM por la IP del atacante. Vas a ver todos sus eventos juntos en una sola vista: los 401, el UNION SELECT y el acceso a /admin. Cuando el SIEM confirma que juntó la cadena completa, captura la bandera ND{siem_correlacion}.",
      command: "curl http://soc.nande/siem?q=10.10.66.13",
      explain:
        "Correlacionaste toda la actividad del atacante en una sola búsqueda: eso captura ND{siem_correlacion}. Un evento suelto no dice nada; los eventos JUNTOS cuentan la historia. Ese es el corazón del trabajo en un SIEM.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Triage: separar lo real del ruido",
      body:
        "Triage es la palabra que usan en las guardias médicas: decidir a quién atender primero. En el SOC es igual: llegan varias alertas y tenés que clasificar cuál es un INCIDENTE real y cuáles son FALSOS POSITIVOS. Cerrás los falsos positivos rápido y escalás el real. Equivocarte para el lado del miedo (todo es grave) te tapa el incidente que importa.",
      diagram: "escudo",
      bullets: [
        "Triage = clasificar alertas: real vs falso positivo.",
        "Falso positivo → cerrar. Incidente real → escalar.",
        "El objetivo es no perder de vista lo importante.",
      ],
    },
    {
      kind: "quiz",
      prompt:
        "En la cola hay 4 alertas. ¿Cuál es el INCIDENTE real que hay que escalar?",
      options: [
        "10.10.66.13: varios 401 y luego un 200 en /admin tras un UNION SELECT",
        "Pico de CPU por el backup programado de las 03:00",
        "Un usuario real (10.10.4.7) que navegó varias páginas seguidas",
        "Chequeo de salud /healthz desde el monitor interno",
      ],
      correct: 0,
      explain:
        "La opción 1 encaja con la cadena de un ataque real: fuerza bruta, inyección SQL y acceso al panel de administración. Las otras tres tienen explicación normal (backup, navegación de un usuario, monitor interno): son falsos positivos que se cierran.",
    },
    {
      kind: "lab",
      title: "Practicá: hacé el triage de la alerta real",
      body:
        "En el laboratorio soc.nande, la alerta A3 es la del atacante 10.10.66.13. Clasificala como incidente real haciendo el triage sobre ella. Si elegís bien (no un falso positivo), el SOC la escala y captura la bandera ND{soc_triage}.",
      command: "curl http://soc.nande/triage?id=A3",
      explain:
        "Clasificaste correctamente el incidente real y lo escalaste: eso captura ND{soc_triage}. Si hubieras abierto A1 (el backup), te habría dicho 'falso positivo'. Triage bien hecho = tiempo del analista puesto donde de verdad importa.",
      diagram: "escudo",
    },
    {
      kind: "concept",
      title: "Repaso: el ciclo del analista",
      body:
        "Cazaste a un atacante como un analista de verdad:\n\n1. DETECTÁS: el SIEM correlaciona la ráfaga en una alerta.\n2. TRIAGE: separás el incidente real de los falsos positivos.\n3. CORRELACIONÁS: buscás por la IP y juntás toda su cadena.\n4. ESCALÁS: mandás el incidente confirmado al siguiente nivel.\n\nEse ciclo se repite todo el día en un SOC. En el último curso vas a reconstruir el ataque completo con técnicas de DFIR (forense).",
      diagram: "firewall",
      bullets: [
        "Detectar → Triage → Correlacionar → Escalar.",
        "El SIEM te da las piezas; vos armás la historia.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 3 — DFIR: reconstruir el ataque (forense e IR, avanzado)     *
 * ------------------------------------------------------------------ */

const BLUE_DFIR: Curso = {
  id: "c-blue-dfir",
  title: "DFIR: reconstruir el ataque",
  subtitle: "Respuesta a incidentes: timeline, IOCs y cadena de custodia.",
  level: "avanzado",
  skill: "forense",
  hue: 158,
  glyph: "gem",
  reward: { xp: 230, coins: 190 },
  slides: [
    {
      kind: "concept",
      title: "¿Qué es DFIR?",
      body:
        "DFIR junta dos ideas: 'Digital Forensics' (forense digital) e 'Incident Response' (respuesta a incidentes). Es lo que pasa DESPUÉS de que salta la alarma: llega el equipo forense a investigar como en la escena de un crimen. ¿Cómo entró el atacante? ¿Qué tocó? ¿Qué se llevó? ¿Cómo lo echamos y evitamos que vuelva? No adivinan: reconstruyen todo con la evidencia.",
      diagram: "escudo",
      bullets: [
        "Forense = investigar la evidencia digital como un detective.",
        "Respuesta a incidentes = contener, echar al atacante y recuperar.",
        "La pregunta clave: ¿qué pasó, exactamente y en qué orden?",
      ],
    },
    {
      kind: "concept",
      title: "La línea de tiempo (timeline)",
      body:
        "El forense ordena todos los hechos por hora, como una tira de cómic. Esa línea de tiempo cuenta la historia del ataque de principio a fin. Con los logs que ya conocés, la del incidente de web-prod-01 quedó así:\n\n 1. Fuerza bruta de login (varios 401)\n 2. Inyección SQL (UNION SELECT) → roba credenciales\n 3. Acceso a /admin\n 4. Exfiltración: exporta la tabla de clientes\n\nEsa secuencia (de la entrada al robo) también se llama 'kill chain'.",
      diagram: "capas",
      bullets: [
        "Timeline = los hechos ordenados por hora.",
        "Muestra la cadena: cómo entró → qué hizo → qué se llevó.",
        "Reconstruir el orden es reconstruir el ataque.",
      ],
    },
    {
      kind: "quiz",
      prompt:
        "En el incidente, el atacante primero hizo fuerza bruta y después una inyección SQL en el buscador. ¿Cuál es la CAUSA RAÍZ (lo que hay que arreglar)?",
      options: [
        "El buscador vulnerable a inyección SQL y la falta de bloqueo por intentos fallidos",
        "Que el atacante era muy inteligente",
        "Que el servidor estaba encendido",
        "Que había usuarios usando la web ese día",
      ],
      correct: 0,
      explain:
        "La causa raíz es la FALLA que hizo posible el ataque, no la persona ni la casualidad. Acá fueron dos: un buscador que aceptaba inyección SQL y un login sin límite de intentos. Arreglás la causa raíz y el mismo ataque deja de funcionar.",
    },
    {
      kind: "concept",
      title: "IOCs: indicadores de compromiso",
      body:
        "Un IOC (Indicator Of Compromise) es una pista concreta de que hubo un ataque: la IP del atacante (10.10.66.13), un hash de un archivo malicioso, un dominio que contacta el virus, un nombre de proceso raro. Los IOCs son oro: los compartís con otros equipos para que, si ven el MISMO indicador, sepan al toque que están comprometidos.",
      diagram: "hash",
      bullets: [
        "IOC = una huella verificable del ataque (IP, hash, dominio…).",
        "Un hash identifica un archivo exacto: si coincide, es EL archivo.",
        "Compartir IOCs ayuda a todos a detectar al mismo atacante.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: sacá IOCs de una muestra sospechosa",
      body:
        "Te llegó un adjunto sospechoso: factura.exe. NUNCA lo abrís en tu máquina: lo detonás en un sandbox, una caja aislada que mira qué hace sin contagiar nada. Corré el análisis y anotá los IOCs que salen (el dominio que contacta, el hash, el mutex). Todo es ficticio y seguro: se analiza el comportamiento, no se ejecuta nada real.",
      command: "cuckoo factura.exe",
      explain:
        "El sandbox observó que factura.exe crea persistencia, contacta un C2 y cifra archivos (ransomware): veredicto MALICIOSO, y captura ND{malware_iocs}. Los IOCs que sacaste (dominio, hash, mutex) sirven para bloquear ESE ataque en toda la red. Regla de oro: lo sospechoso se abre en sandbox, jamás en tu equipo.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Cadena de custodia",
      body:
        "En una investigación, la evidencia tiene que ser confiable: si la tocás o la cambiás, ya no sirve como prueba. Por eso el forense calcula un hash (una huella digital) de la evidencia apenas la recolecta. Si el hash sigue igual después, se PRUEBA que nadie la modificó. A ese cuidado —quién tuvo la evidencia y que nadie la alteró— se le llama cadena de custodia.",
      diagram: "hash",
      bullets: [
        "Cadena de custodia = registro de que la evidencia no se tocó.",
        "El hash es el sello: si cambia un solo byte, cambia el hash.",
        "Evidencia alterada = evidencia que no vale.",
      ],
    },
    {
      kind: "quiz",
      prompt:
        "¿Por qué el forense calcula un hash de la evidencia apenas la recolecta?",
      options: [
        "Para poder demostrar después que nadie la modificó (integridad)",
        "Para que ocupe menos espacio",
        "Para cifrarla y que nadie la lea",
        "Para borrarla más rápido",
      ],
      correct: 0,
      explain:
        "El hash es una huella: la misma evidencia da siempre el mismo hash, y cualquier cambio (aunque sea un byte) lo altera. Guardando el hash del momento de la recolección, el forense demuestra que la prueba que presenta es idéntica a la original. Eso es integridad.",
      diagram: "hash",
    },
    {
      kind: "concept",
      title: "Reconstruir el incidente",
      body:
        "Con todo lo que juntaste, el forense escribe la conclusión: cuál fue el PRIMER paso del ataque y cuál la CAUSA RAÍZ. El laboratorio soc.nande te deja confirmar tu reconstrucción. Primer paso: la fuerza bruta del login. Causa raíz: la inyección SQL en el buscador (más la falta de bloqueo por intentos). Cuando las dos coinciden con la evidencia, el caso queda cerrado.",
      diagram: "capas",
      bullets: [
        "Primer paso = por dónde arrancó todo (la fuerza bruta).",
        "Causa raíz = la falla que lo hizo posible (la inyección SQL).",
        "Confirmar ambas cierra la reconstrucción del incidente.",
      ],
    },
    {
      kind: "build",
      goal: "Confirmar en soc.nande la reconstrucción del incidente: primer paso = fuerza bruta, causa raíz = inyección SQL",
      pieces: [
        "curl",
        "\"http://soc.nande/incidente?primero=fuerza+bruta&causa=inyeccion+sql\"",
        "nmap",
      ],
      answer: [
        "curl",
        "\"http://soc.nande/incidente?primero=fuerza+bruta&causa=inyeccion+sql\"",
      ],
      hint: "curl y la URL entre comillas (por el símbolo &). En la URL van tus dos conclusiones: primero=fuerza+bruta y causa=inyeccion+sql.",
      explain:
        "curl \"http://soc.nande/incidente?primero=fuerza+bruta&causa=inyeccion+sql\" le manda al laboratorio tus dos conclusiones. Las comillas protegen el & (que en la terminal significaría otra cosa) y el + representa el espacio. Si primer paso y causa raíz coinciden con la evidencia, el caso se cierra.",
    },
    {
      kind: "lab",
      title: "Practicá: cerrá el caso con la timeline",
      body:
        "Enviá tu reconstrucción al laboratorio soc.nande. Si acertás el primer paso (fuerza bruta) y la causa raíz (inyección SQL), el sistema te devuelve la línea de tiempo completa del incidente y captura la bandera ND{dfir_timeline}.",
      command:
        "curl \"http://soc.nande/incidente?primero=fuerza+bruta&causa=inyeccion+sql\"",
      explain:
        "Reconstruiste la cadena completa y cerraste el caso: eso captura ND{dfir_timeline}. Mirá la timeline que devolvió: fuerza bruta → SQLi → /admin → exfiltración. Ese relato ordenado, apoyado en evidencia, es el entregable estrella del forense.",
      diagram: "capas",
    },
    {
      kind: "lab",
      title: "Practicá: el informe forense final",
      body:
        "El último paso de la respuesta a incidentes es el informe: quién atacó y con qué técnica. Reportá al atacante (IP 10.10.66.13) y la técnica principal (inyección SQL). Es el documento que se entrega a los jefes y, si hace falta, a la justicia.",
      command: "curl \"http://soc.nande/reportar?ip=10.10.66.13&tecnica=sql\"",
      explain:
        "El informe confirma el incidente y captura ND{forense_intrusion}. Un buen informe forense es claro, ordenado y se apoya SOLO en la evidencia: nada de suposiciones. Con eso la organización arregla la causa raíz y queda mejor preparada para el próximo intento.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Repaso: el trabajo del forense",
      body:
        "Cerraste un incidente de punta a punta como un equipo de DFIR:\n\n1. TIMELINE: ordenaste los hechos por hora.\n2. IOCs: sacaste indicadores verificables (de la muestra y de los logs).\n3. CADENA DE CUSTODIA: cuidaste que la evidencia no se altere (el hash).\n4. RECONSTRUCCIÓN E INFORME: primer paso, causa raíz y reporte final.\n\nAtacar te enseñó cómo entra el enemigo; defender e investigar te enseñan a echarlo y a que no vuelva. Las dos mitades hacen al profesional completo.",
      diagram: "escudo",
      bullets: [
        "Timeline → IOCs → Custodia → Reconstrucción → Informe.",
        "El hacker ético reporta, documenta y ayuda a arreglar; no roba.",
      ],
    },
    {
      kind: "lab",
      title: "Capstone: investigación completa en el SOC",
      body:
        "Ponete el sombrero de analista y resolvé un incidente real de punta a punta en el SOC: leé los logs, hacé triage, correlacioná en el SIEM, reconstruí el timeline (DFIR) y reportá. Vas a reconocer las técnicas — son la fuerza bruta y la SQLi que aprendiste a atacar, ahora vistas desde la defensa. Tocá para arrancar en la terminal.",
      command: "learn l-eng-blue",
      explain:
        "Metodología azul completa: logs → triage → SIEM → DFIR → informe (ND{soc_triage}, ND{siem_correlacion}, ND{dfir_timeline}, ND{forense_intrusion}). El atacante y el defensor estudian lo mismo: por eso saber atacar te hace mejor defensor.",
      diagram: "capas",
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  Reconocé el engaño — phishing e ingeniería social (defensa personal) *
 * ------------------------------------------------------------------ */

const PHISHING: Curso = {
  id: "c-phishing",
  title: "Reconocé el engaño (phishing)",
  subtitle: "El ataque más común no rompe la máquina: te engaña a vos.",
  level: "principiante",
  skill: "blue-team",
  hue: 15,
  glyph: "mask",
  reward: { xp: 110, coins: 80 },
  slides: [
    {
      kind: "concept",
      title: "El eslabón más fácil sos vos",
      body:
        "La mayoría de los hackeos reales no empiezan rompiendo un servidor: empiezan con un mensaje que te convence de entregar tu contraseña o hacer clic donde no debías. Eso es INGENIERÍA SOCIAL, y su forma más común es el PHISHING: un mensaje que se disfraza de algo confiable (tu banco, un premio, tu escuela, un amigo) para robarte.",
      diagram: "phishing",
      bullets: [
        "No te atacan a la máquina: te atacan a la confianza.",
        "Ningún antivirus te salva si vos mismo entregás la clave.",
      ],
    },
    {
      kind: "concept",
      title: "Las 4 señales de un anzuelo",
      body:
        "Casi todo phishing tiene al menos una de estas señales:\n\n1. URGENCIA: '¡tu cuenta se cierra en 24h!' (te apuran para que no pienses).\n2. REMITENTE RARO: el nombre dice 'Banco' pero el correo es banco-seguro@correo-raro.com.\n3. LINK QUE NO COINCIDE: el texto dice banco.nande pero el link real va a otro lado.\n4. TE PIDE DATOS: contraseña, código, número de tarjeta. Nadie serio los pide por mensaje.",
      diagram: "phishing",
      bullets: [
        "Urgencia + remitente raro + link tramposo + pide datos = anzuelo.",
        "Con una sola señal ya conviene desconfiar.",
      ],
    },
    {
      kind: "quiz",
      prompt:
        "Te llega: 'BANCO: detectamos un acceso raro. Confirmá tu clave en este link en 1 hora o bloqueamos tu cuenta.' ¿Qué es?",
      options: [
        "Phishing: usa urgencia y te pide la clave por un link",
        "Un aviso normal del banco, hay que apurarse",
        "Spam inofensivo, nada que ver con seguridad",
        "Un antivirus avisando de un virus",
      ],
      correct: 0,
      explain:
        "Urgencia ('1 hora'), pide la clave, y manda a un link. Un banco de verdad NUNCA te pide la contraseña por mensaje. Ante la duda, entrá vos escribiendo la dirección a mano, no por el link.",
      diagram: "phishing",
    },
    {
      kind: "concept",
      title: "Mirá el link ANTES de tocar",
      body:
        "El texto de un link y su destino real pueden ser distintos. En la compu, pasá el mouse por encima (sin hacer clic) y mirá abajo a dónde va. En el celu, mantené apretado para ver la URL. Fijate SIEMPRE en el dominio real: en http://banco.nande.premios-gratis.com el dominio de verdad es premios-gratis.com, NO banco.nande. Lo que manda es lo que está justo antes de la primera barra.",
      diagram: "url",
      bullets: [
        "El dominio real es lo que está pegado antes de la primera '/'.",
        "banco.nande.otracosa.com NO es banco.nande.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Cuál de estas direcciones es realmente del banco banco.nande?",
      options: [
        "https://banco.nande/login",
        "http://banco.nande.seguro-cuenta.com/login",
        "http://banco-nande.com/login",
        "https://login.banco.nande.premios.net/",
      ],
      correct: 0,
      explain:
        "Solo la primera tiene a banco.nande como dominio real (antes de la primera barra). Las otras usan el nombre 'banco.nande' como carnada dentro de otro dominio (seguro-cuenta.com, premios.net) o lo cambian (banco-nande.com con guion).",
      diagram: "url",
    },
    {
      kind: "build",
      goal: "Armá la dirección VERDADERA y segura del banco (protocolo con candado + dominio real)",
      pieces: ["https://", "banco.nande", "http://", "banco.nande.premios.com", "/login"],
      answer: ["https://", "banco.nande", "/login"],
      hint: "Querés el candado (https://), el dominio REAL (banco.nande, no uno que lo use de carnada) y la ruta del login.",
      explain:
        "https://banco.nande/login: https por el candado (cifrado), banco.nande como dominio real, y /login la página. Aprender a leer una URL parte por parte es tu mejor defensa contra el phishing.",
    },
    {
      kind: "concept",
      title: "Si ya picaste (y cómo blindarte)",
      body:
        "Si diste tu clave en un sitio falso: cambiala YA en el sitio real, y en todo otro lado donde la repetías. Para blindarte antes de que pase:\n\n• 2FA (segundo factor): aunque roben tu clave, sin el código de tu celu no entran.\n• Contraseñas distintas por sitio (un gestor las recuerda).\n• Desconfiá de la urgencia: parar y pensar es la defensa.\n• Verificá por otro canal: llamá al banco al número oficial, no al del mensaje.",
      diagram: "escudo",
      bullets: [
        "2FA es tu mejor escudo: convierte una clave robada en algo inútil.",
        "Reportá el intento (a la escuela, al banco): ayudás a los demás.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué el 2FA (segundo factor) te protege aunque te roben la contraseña?",
      options: [
        "Porque hace falta también un código de tu celular, que el atacante no tiene",
        "Porque cambia tu contraseña sola cada día",
        "Porque borra los correos de phishing",
        "Porque esconde tu dirección IP",
      ],
      correct: 0,
      explain:
        "El 2FA pide algo que TENÉS (tu celu) además de algo que SABÉS (la clave). Con la clave robada no alcanza: falta el código. Por eso activarlo en tus cuentas importantes es la defensa más grande por el menor esfuerzo.",
      diagram: "escudo",
    },
    {
      kind: "concept",
      title: "Repaso: pensá antes de tocar",
      body:
        "El phishing no le gana a tu máquina, le gana a tu apuro. Ya sabés detectarlo:\n\n1. ¿Me apuran o me asustan? (urgencia)\n2. ¿El remitente y el link son los reales? (mirá el dominio)\n3. ¿Me piden datos que nadie debería pedir? (clave, código)\n4. Ante la duda: entrá vos a mano y verificá por otro canal.\n\nY blindate con 2FA y claves distintas. Un buen hacker ético también enseña esto a su familia: es la defensa que más gente necesita.",
      diagram: "phishing",
      bullets: [
        "Urgencia → dominio → datos pedidos → verificá aparte.",
        "2FA + claves únicas + desconfiar del apuro.",
      ],
    },
  ],
};

/**
 * Cursos del módulo "blue". Se completa con cursos interactivos completos
 * (concept + quiz + build + lab) ligados a las herramientas reales de ÑANDE.
 */
export const BLUE_COURSES: Curso[] = [BLUE_INTRO, BLUE_SIEM, BLUE_DFIR, PHISHING];
