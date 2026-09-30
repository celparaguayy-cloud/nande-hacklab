import type { Curso } from "../courseTypes";

/**
 * Módulo "Forense y análisis de amenazas". Cursos ligados a los motores REALES
 * de ÑANDE: DFIR (Investigator: reconstruye incidentes desde la evidencia del
 * mundo), la matriz MITRE ATT&CK (correlador stateful), el motor de reversing
 * (crackme desensamblable/ejecutable) y la inteligencia de amenazas (IOCs y
 * atribución de la campaña del adversario). Todo se deriva de estado real, offline.
 */

const FOR_DFIR: Curso = {
  id: "c-for-dfir",
  title: "DFIR: reconstruir el incidente",
  subtitle: "De evidencia dispersa a una línea de tiempo con veredicto: qué pasó, dónde, cuándo y con qué técnicas.",
  level: "avanzado",
  skill: "forense",
  hue: 210,
  glyph: "search",
  reward: { xp: 260, coins: 210 },
  slides: [
    {
      kind: "concept",
      title: "Forense digital y respuesta a incidentes",
      body:
        "DFIR (Digital Forensics & Incident Response) es el trabajo de reconstruir QUÉ pasó después de un ataque. No se adivina: se junta evidencia real (procesos, servicios, cuentas, archivos, logs de cada host), se ordena en una LÍNEA DE TIEMPO y se emite un veredicto. El objetivo es entender el alcance (qué hosts, qué cuentas), la ventana temporal y las técnicas usadas — para contener, erradicar y aprender.",
      diagram: "siem",
      bullets: [
        "DFIR = reconstruir el incidente desde la evidencia real.",
        "Timeline: ordenar los hechos por cuándo pasaron.",
        "Veredicto: alcance + ventana + técnicas + causa.",
      ],
    },
    {
      kind: "concept",
      title: "Severidad y alcance: no todo es crítico",
      body:
        "Un buen analista PRIORIZA. La severidad (info → low → medium → high → critical) sale de qué se tocó: un escaneo es bajo; un DCSync o un sabotaje OT es crítico. El alcance dice cuántos hosts y cuentas cayeron. Con eso el equipo decide dónde poner las horas. En ÑANDE el DFIR deriva todo del estado real del mundo: si el red team (que ataca solo) hizo algo, la reconstrucción lo muestra con su severidad calculada.",
      diagram: "matrix",
      bullets: [
        "Severidad = gravedad de lo que se tocó (no el ruido).",
        "Alcance = hosts y cuentas afectados.",
        "Priorizar: las horas van a lo crítico primero.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Qué es lo primero que produce una buena reconstrucción DFIR?",
      options: [
        "Una línea de tiempo ordenada de la evidencia, con alcance, ventana y técnicas",
        "La contraseña del atacante",
        "Un antivirus nuevo",
        "El nombre real del hacker y su dirección",
      ],
      correct: 0,
      explain:
        "DFIR no 'atrapa al hacker': ordena la evidencia en una historia verificable (qué, dónde, cuándo, cómo). Esa línea de tiempo es la base para contener bien y para el informe. La atribución, cuando se puede, viene después y con cuidado.",
      diagram: "siem",
    },
    {
      kind: "concept",
      title: "Orden de volatilidad: recolectar bien",
      body:
        "La evidencia se desvanece a ritmos distintos. El ORDEN DE VOLATILIDAD manda recolectar primero lo más efímero: memoria y procesos en ejecución, conexiones de red, sesiones activas; y recién después lo persistente: archivos, logs, discos. Si apagás la máquina 'para asegurarla' antes de capturar la RAM, perdés para siempre los procesos del atacante y sus claves en memoria. Cada recolección deja una HUELLA verificable (un digest) para probar que la evidencia no se alteró: eso es cadena de custodia.",
      diagram: "archivo",
      bullets: [
        "Recolectá de lo más volátil (RAM, red) a lo más persistente (disco).",
        "Apagar antes de capturar memoria destruye evidencia.",
        "Digest de la evidencia = integridad / cadena de custodia.",
      ],
    },
    {
      kind: "build",
      goal: "Recolectar la evidencia forense de un host afectado",
      pieces: ["dfir", "collect", "server.nande", "pivot", "--brute"],
      answer: ["dfir", "collect", "server.nande"],
      hint: "El sub-comando para recolectar es 'collect', seguido del host del que querés la evidencia.",
      explain:
        "`dfir collect server.nande` captura el estado forense del host: procesos, servicios, cuentas, archivos y puertos bloqueados, con una huella verificable. Es la materia prima de la reconstrucción: sin recolectar, no hay timeline.",
    },
    {
      kind: "lab",
      title: "Reconstruí el incidente",
      body: "Pedile al DFIR que arme la reconstrucción a partir de la evidencia del mundo.",
      command: "dfir",
      explain:
        "Si hubo actividad anómala, ves la reconstrucción: severidad, hosts afectados, ventana temporal, técnicas MITRE y un veredicto, con la línea de tiempo de evidencia real. En un mundo recién arrancado quizás no haya nada que investigar todavía: dejá correr el mundo (el red team NPC ataca solo) o generá eventos, y volvé. Profundizá con `dfir collect <host>`, `dfir iocs` y `dfir pivot <valor>`.",
      diagram: "siem",
    },
  ],
};

const FOR_MITRE: Curso = {
  id: "c-for-mitre",
  title: "MITRE ATT&CK: el idioma común",
  subtitle: "Tácticas, técnicas y sub-técnicas: cómo el mundo entero nombra lo que hace un adversario.",
  level: "intermedio",
  skill: "forense",
  hue: 285,
  glyph: "book",
  reward: { xp: 240, coins: 190 },
  slides: [
    {
      kind: "concept",
      title: "Un mapa para nombrar al adversario",
      body:
        "MITRE ATT&CK es una matriz que cataloga cómo atacan los adversarios reales, organizada en TÁCTICAS (el porqué: acceso inicial, persistencia, movimiento lateral, impacto…) y TÉCNICAS (el cómo, con un id tipo T1558.003 = Kerberoasting). Es el idioma común de la industria: en vez de decir 'hicieron algo con Kerberos', decís 'T1558.003', y todo el mundo sabe exactamente qué. Sirve para describir ataques, medir cobertura defensiva y planificar detecciones.",
      diagram: "matrix",
      bullets: [
        "Tácticas = el porqué (columnas). Técnicas = el cómo (celdas).",
        "Cada técnica tiene un id (T1558.003 = Kerberoasting).",
        "Es el idioma común: rojo y azul hablan ATT&CK.",
      ],
    },
    {
      kind: "concept",
      title: "De la acción a la técnica (correlación real)",
      body:
        "En ÑANDE la matriz NO es decorado: es un correlador con estado. Cada acción ofensiva real —un kerberoast, un login por fuerza bruta, enviar una clave por HTTP, un DCSync, un sabotaje Modbus— se MAPEA a su técnica y enciende su celda, con host, tick y confianza. Así ves tu propia campaña como la vería un defensor, y el azul mide qué tácticas cubrió. Encender la celda es consecuencia de una acción, no un texto suelto.",
      diagram: "matrix",
      bullets: [
        "Cada técnica ejecutada enciende su celda (con host y tick).",
        "El correlador es stateful: refleja lo que pasó de verdad.",
        "Sirve para ver tu campaña con los ojos del defensor.",
      ],
    },
    {
      kind: "quiz",
      prompt: "En ATT&CK, ¿qué diferencia hay entre una TÁCTICA y una TÉCNICA?",
      options: [
        "La táctica es el objetivo (el porqué); la técnica es el método concreto (el cómo)",
        "Son sinónimos",
        "La táctica es de Windows y la técnica de Linux",
        "La técnica es más vieja que la táctica",
      ],
      correct: 0,
      explain:
        "La táctica responde '¿qué buscaba el adversario?' (p. ej. Movimiento Lateral); la técnica, '¿cómo lo hizo?' (p. ej. Pass-the-Hash, T1550.002). Una misma táctica se logra con muchas técnicas: por eso la matriz es una grilla de tácticas × técnicas.",
      diagram: "matrix",
    },
    {
      kind: "concept",
      title: "Cobertura y brechas de detección",
      body:
        "El uso más poderoso de ATT&CK es defensivo: mapear TUS detecciones contra la matriz para ver qué técnicas cazarías y cuáles se te escaparían (tus 'brechas'). Un equipo maduro no pregunta '¿tengo antivirus?' sino '¿detectaría un Kerberoasting? ¿un DCSync? ¿un Pass-the-Hash?'. Cada celda sin cobertura es un hueco por donde un adversario pasa sin ruido. La matriz convierte 'creo que estamos protegidos' en un mapa concreto de qué cubrís y qué no.",
      diagram: "matrix",
      bullets: [
        "Mapeá tus detecciones sobre la matriz = ves tus brechas.",
        "Cada celda sin cobertura es un hueco explotable.",
        "De 'creo que estamos bien' a un mapa medible de cobertura.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Un mismo id de técnica (p. ej. T1550.002, Pass-the-Hash) aparece en informes de grupos muy distintos. ¿Por qué es útil ese id compartido?",
      options: [
        "Porque estandariza el lenguaje: distintos equipos describen y comparan ataques sin ambigüedad",
        "Porque significa que es el mismo atacante siempre",
        "Porque el id revela la identidad del hacker",
        "Porque obliga a usar Windows",
      ],
      correct: 0,
      explain:
        "El id es un vocabulario común: permite que un informe de threat intel, una regla de detección y un ejercicio de red team hablen de lo mismo sin confusión. No dice quién fue —muchos grupos usan las mismas técnicas— pero hace comparables los análisis de todo el mundo.",
      diagram: "matrix",
    },
    {
      kind: "lab",
      title: "Mirá la matriz",
      body: "Abrí la matriz ATT&CK y mirá qué técnicas se detectaron, agrupadas por táctica.",
      command: "mitre",
      explain:
        "Ves las técnicas detectadas ordenadas por táctica, más las detecciones recientes con id, host, tick y confianza. En un mundo limpio está vacía: hacé algo ofensivo (un kerberoast, un login por fuerza bruta) y el correlador lo mapea acá al instante. Es tu campaña traducida al idioma de la industria.",
      diagram: "matrix",
    },
  ],
};

const FOR_REVERSING: Curso = {
  id: "c-for-reversing",
  title: "Reversing: de bytes a la lógica",
  subtitle: "Abrir un binario, leer su ensamblador, encontrar la comparación que decide, y recuperar (o parchear) la clave.",
  level: "avanzado",
  skill: "forense",
  hue: 130,
  glyph: "code",
  reward: { xp: 290, coins: 230 },
  slides: [
    {
      kind: "concept",
      title: "Un programa es datos que se pueden leer",
      body:
        "Un ejecutable es una tira de bytes que la CPU interpreta como instrucciones. La ingeniería inversa (reversing) es volver de esos bytes a algo legible: desensamblar (bytes → ensamblador), leer las cadenas, seguir las referencias cruzadas y entender qué decide el programa. Se usa para analizar malware, encontrar vulnerabilidades y entender software sin su código fuente. La herramienta no adivina: te muestra exactamente qué hace el binario.",
      diagram: "reversing",
      bullets: [
        "Binario = bytes que la CPU ejecuta como instrucciones.",
        "Desensamblar: bytes → ensamblador legible.",
        "strings y xrefs: pistas de qué toca y desde dónde.",
      ],
    },
    {
      kind: "concept",
      title: "La comparación que decide todo",
      body:
        "Casi todo crackme tiene un punto clave: una COMPARACIÓN (cmp) que decide si tu entrada es correcta. Encontrarla en el desensamblado es medio trabajo. Desde ahí hay dos caminos: recuperar el valor esperado (entender la lógica y calcular la clave correcta) o PARCHEAR el salto (cambiar el 'si no coincide, rechazá' por 'aceptá igual'). Ojo: parchear te deja ENTRAR, pero si el binario usa la clave para descifrar algo, con la clave mal, el dato sale en basura.",
      diagram: "reversing",
      bullets: [
        "Buscá el cmp que valida la entrada.",
        "Recuperar la clave (lógica) vs. parchear el salto (fuerza).",
        "Parchear entra, pero no descifra datos con la clave correcta.",
      ],
    },
    {
      kind: "build",
      goal: "Desensamblar el binario para leer su lógica en ensamblador",
      pieces: ["reverse", "disasm", "run", "hexdump", "--brute"],
      answer: ["reverse", "disasm"],
      hint: "La herramienta es reverse; el sub-comando para ver el ensamblador es disasm.",
      explain:
        "`reverse disasm` te muestra el ensamblador del crackme. Ahí buscás la comparación clave. Después: `reverse strings` (cadenas), `reverse xrefs` (referencias) y `reverse run <serial>` para probar una clave candidata de verdad.",
    },
    {
      kind: "concept",
      title: "Estático vs. dinámico",
      body:
        "Hay dos formas de analizar un binario. ESTÁTICO: lo leés sin ejecutarlo (desensamblar, strings, referencias cruzadas). Es seguro y completo, pero podés perderte en la maraña. DINÁMICO: lo CORRÉS con una entrada y observás qué hace (registros, saltos, salida). Es rápido para confirmar una hipótesis, pero sólo ves el camino que ejecutaste. Los profesionales combinan: leen el cmp en estático para formar la hipótesis, y la prueban en dinámico con `reverse run <serial>`.",
      diagram: "reversing",
      bullets: [
        "Estático: leer sin ejecutar (disasm, strings, xrefs).",
        "Dinámico: ejecutar y observar (reverse run).",
        "Los dos juntos: leés la lógica y confirmás corriendo.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Parcheaste el salto para que el binario 'acepte' cualquier serial, pero la bandera sale en basura. ¿Por qué?",
      options: [
        "Porque la clave correcta también DESCIFRA el dato: parchear entra, pero no recupera el secreto",
        "Porque el binario está roto",
        "Porque faltó reiniciar la computadora",
        "Porque el parche borró la bandera",
      ],
      correct: 0,
      explain:
        "Cuando el serial correcto no sólo valida sino que además es la CLAVE que descifra la bandera, saltarte la validación te deja 'entrar' pero descifra con una clave equivocada: sale basura. Ahí no hay atajo: tenés que RECUPERAR el serial real, no parchear el salto.",
      diagram: "reversing",
    },
    {
      kind: "lab",
      title: "Desensamblá el crackme",
      body: "Abrí el binario de práctica y leé su ensamblador: buscá la instrucción que compara tu entrada.",
      command: "reverse disasm",
      explain:
        "Ves el desensamblado real del crackme. Fijate en el `cmp`: ahí se decide si la clave es correcta. Con eso podés calcular el serial (y probarlo con `reverse run <serial>`) o parchear el salto. Es reversing de verdad: la herramienta te da las instrucciones exactas, no una pista inventada.",
      diagram: "reversing",
    },
  ],
};

const FOR_CTI: Curso = {
  id: "c-for-cti",
  title: "Inteligencia de amenazas: IOCs y atribución",
  subtitle: "De la evidencia a los indicadores de compromiso, y de los IOCs al actor detrás de la campaña.",
  level: "avanzado",
  skill: "forense",
  hue: 340,
  glyph: "eye",
  reward: { xp: 270, coins: 210 },
  slides: [
    {
      kind: "concept",
      title: "Qué es un IOC",
      body:
        "Un Indicador de Compromiso (IOC) es una pista concreta de que hubo actividad maliciosa: una IP, un hash de archivo, un dominio, un nombre de herramienta, un patrón. Los IOCs son el producto más tangible del análisis: se comparten, se buscan en otros sistemas y se usan para detectar si el mismo adversario tocó otro lado. En ÑANDE los IOCs se derivan de la evidencia real del mundo, con cuántas veces aparecieron y en qué ventana temporal.",
      diagram: "radar",
      bullets: [
        "IOC = pista concreta (IP, hash, dominio, herramienta…).",
        "Se derivan de la evidencia, se comparten y se buscan.",
        "Un IOC en otro host = el mismo adversario estuvo ahí.",
      ],
    },
    {
      kind: "concept",
      title: "Pivotar sobre un IOC, y atribuir",
      body:
        "La inteligencia de amenazas (CTI) une puntos: tomás un IOC y PIVOTÁS —buscás toda la evidencia que lo menciona— para ver el alcance real de la campaña. Cuando un IOC coincide con el registro de un actor conocido (su infraestructura, sus herramientas, su forma de operar), podés ATRIBUIR la campaña a ese actor. La atribución se hace con cuidado y con evidencia: es una hipótesis sostenida por indicadores, no una certeza mágica.",
      diagram: "matrix",
      bullets: [
        "Pivotar sobre un IOC = seguir el hilo por toda la evidencia.",
        "IOC + perfil de actor conocido → hipótesis de atribución.",
        "Atribuir es sostener con evidencia, no adivinar.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Encontrás el mismo hash de herramienta en tres hosts distintos. ¿Qué te dice ese IOC?",
      options: [
        "Que la misma actividad/adversario tocó los tres: sirve para medir el alcance y pivotar",
        "Que los tres hosts son idénticos",
        "Que no pasó nada",
        "Que hay que apagar internet",
      ],
      correct: 0,
      explain:
        "Un IOC repetido en varios hosts marca el rastro del mismo adversario: te da el alcance real y te deja pivotar para encontrar más evidencia. Es exactamente cómo un equipo de CTI reconstruye una campaña que tocó muchos lugares.",
      diagram: "radar",
    },
    {
      kind: "concept",
      title: "La pirámide del dolor",
      body:
        "No todos los IOCs valen lo mismo. La 'pirámide del dolor' (David Bianco) los ordena por cuánto le cuesta al atacante cambiarlos: un hash de archivo o una IP son triviales de rotar (poco dolor); un dominio o una herramienta cuestan más; sus TTPs —su forma de operar, mapeada a ATT&CK— son lo más difícil de cambiar (máximo dolor). Detectar por hash frena al atacante cinco minutos; detectar por comportamiento lo obliga a reinventar su operación. Por eso la CTI madura apunta a los TTPs, no sólo a los indicadores atómicos.",
      diagram: "matrix",
      bullets: [
        "Hash/IP: fáciles de cambiar (poco dolor para el atacante).",
        "Dominios/herramientas: cuestan más.",
        "TTPs (comportamiento/ATT&CK): lo más caro de cambiar.",
      ],
    },
    {
      kind: "build",
      goal: "Pivotar sobre un IOC para ver toda la evidencia que lo menciona",
      pieces: ["dfir", "pivot", "10.10.66.13", "collect", "--brute"],
      answer: ["dfir", "pivot", "10.10.66.13"],
      hint: "El sub-comando para seguir el hilo de un indicador es 'pivot', seguido del valor (una IP, un hash…).",
      explain:
        "`dfir pivot 10.10.66.13` busca toda la evidencia que menciona ese indicador: en qué hosts apareció, cuándo y con qué técnica. Así medís el alcance real de la campaña y, si el IOC coincide con el perfil de un actor conocido, sostenés la atribución con evidencia.",
    },
    {
      kind: "lab",
      title: "Listá los indicadores",
      body: "Pedile al DFIR los indicadores de compromiso que pudo derivar de la evidencia.",
      command: "dfir iocs",
      explain:
        "Ves los IOCs con su tipo, valor, cuántas veces aparecieron y su ventana temporal. En un mundo limpio todavía no hay evidencia, así que la lista está vacía: cuando el adversario actúe (probá `apt start ana-reta` y dejalo correr), aparecen sus indicadores, y con `dfir pivot <ioc>` seguís el hilo hasta atribuir la campaña a su actor.",
      diagram: "radar",
    },
  ],
};

export const FORENSE_COURSES: Curso[] = [
  FOR_DFIR,
  FOR_MITRE,
  FOR_REVERSING,
  FOR_CTI,
];
