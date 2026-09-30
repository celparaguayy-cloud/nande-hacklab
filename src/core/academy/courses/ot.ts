import type { Curso } from "../courseTypes";

/**
 * Módulo "Sistemas industriales (OT/ICS)". Cursos ligados al motor OT REAL de
 * ÑANDE: PLCs con Modbus/TCP (kernel.plc), el salto IT→OT por hosts doble-homed,
 * la campaña de adversario OT (apt start karai-ot) y su contención por
 * segmentación (contain host). Enseñan por qué un incidente OT es el peor caso:
 * el daño deja de ser digital y se vuelve físico. 100% offline, dentro del sandbox.
 */

const OT_INTRO: Curso = {
  id: "c-ot-intro",
  title: "Redes industriales (OT): del dato al proceso físico",
  subtitle: "Qué es OT/ICS, el modelo de Purdue, y por qué el salto IT→OT convierte un hackeo en daño físico.",
  level: "avanzado",
  skill: "redes",
  hue: 35,
  glyph: "flame",
  reward: { xp: 250, coins: 200 },
  slides: [
    {
      kind: "concept",
      title: "IT no es OT",
      body:
        "La informática de oficina (IT) mueve DATOS: correos, bases, webs. La tecnología de operación (OT) mueve el MUNDO FÍSICO: bombas, válvulas, cintas, hornos. En el medio están los PLCs (controladores lógicos programables), que leen sensores y accionan motores, y las HMI (consolas de operador). Cuando un ataque cruza de IT a OT, deja de robar información y empieza a poder abrir una válvula o parar una turbina. Ese cambio de consecuencia es todo.",
      diagram: "ics",
      bullets: [
        "IT = datos.  OT = proceso físico (bombas, válvulas, PLCs).",
        "PLC: lee sensores y acciona; HMI: la consola del operador.",
        "Cruzar IT→OT = el daño se vuelve físico.",
      ],
    },
    {
      kind: "concept",
      title: "El modelo de Purdue y la zona desmilitarizada industrial",
      body:
        "Las plantas se diseñan en NIVELES (modelo de Purdue): arriba la IT corporativa (nivel 4/5), abajo el proceso físico (nivel 0/1), y en el medio una DMZ industrial que debería separarlos. En teoría, nada de IT habla directo con un PLC. En la práctica, aparecen hosts DOBLE-HOMED (un historian, un servidor de datos) con un pie en cada red, y esos puentes son el camino del atacante. Segmentar bien esos niveles es la defensa número uno de OT.",
      diagram: "ics",
      bullets: [
        "Purdue: niveles de IT (arriba) a proceso (abajo).",
        "Debería haber una DMZ industrial separando ambos mundos.",
        "Los hosts doble-homed (historian) son el puente peligroso.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué un incidente en OT suele ser más grave que uno en IT?",
      options: [
        "Porque el daño puede ser físico: parar una planta, dañar equipos, poner en riesgo a personas",
        "Porque las computadoras OT son más caras",
        "Porque OT no tiene logs",
        "No es más grave, es igual",
      ],
      correct: 0,
      explain:
        "En IT el peor caso típico es fuga o cifrado de datos. En OT el peor caso es físico: una bomba que se sobrepresiona, una línea que se detiene, seguridad de personas comprometida. Por eso OT prioriza la DISPONIBILIDAD y la SEGURIDAD (safety) por encima de todo.",
      diagram: "ics",
    },
    {
      kind: "concept",
      title: "Casos reales que cambiaron la historia",
      body:
        "OT no es teoría de laboratorio. Stuxnet (2010) saboteó centrifugadoras manipulando sus PLCs mientras mostraba valores normales a los operadores. El ataque a la red eléctrica de Ucrania (2015) dejó a cientos de miles sin luz abriendo interruptores desde HMIs comprometidas. TRITON/TRISIS (2017) fue más lejos: apuntó al Sistema Instrumentado de Seguridad (SIS) de una planta — la última barrera contra un accidente físico. El patrón se repite: entran por IT, cruzan a OT por un puente, y actúan sobre el proceso.",
      diagram: "ics",
      bullets: [
        "Stuxnet: sabotaje de PLCs ocultando el estado real.",
        "Ucrania 2015: apagón operando HMIs comprometidas.",
        "TRITON: ataque al SIS (la barrera de seguridad).",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Cuál es el punto de entrada típico de un ataque que termina en la planta (OT)?",
      options: [
        "La red IT corporativa, cruzando luego a OT por un host puente (doble-homed)",
        "Directamente el PLC desde Internet, siempre",
        "El WiFi de la cafetería",
        "Un ataque de fuerza bruta al SIS",
      ],
      correct: 0,
      explain:
        "Casi ningún PLC está expuesto directo a Internet. El camino real es: comprometer IT (phishing, un servidor expuesto), moverse hasta un host que puentea IT y OT (un historian doble-homed), y desde ahí bajar al proceso. Por eso la segmentación de ese puente es la defensa clave.",
      diagram: "ics",
    },
    {
      kind: "lab",
      title: "Mirá tu vecindario de red",
      body: "Antes de soñar con la planta, mirá qué alcanzás realmente desde donde estás parado.",
      command: "netmap",
      explain:
        "El mapa te muestra tu segmento actual y los hosts que ves. Fijate que la red industrial NO aparece: está segmentada, aislada de donde estás. Ése es el punto de OT: para tocar un PLC primero hay que atravesar varios saltos (IT → historian → HMI → PLC). El próximo curso te muestra qué encontrás cuando por fin llegás: Modbus.",
      diagram: "ics",
    },
  ],
};

const OT_MODBUS: Curso = {
  id: "c-ot-modbus",
  title: "Modbus: el protocolo sin contraseña",
  subtitle: "Alcanzar el puerto 502 de un PLC es controlarlo: Modbus no autentica. Leer y escribir el proceso.",
  level: "avanzado",
  skill: "pentesting",
  hue: 15,
  glyph: "crown",
  reward: { xp: 280, coins: 220 },
  slides: [
    {
      kind: "concept",
      title: "Modbus: diseñado en los 70, sin seguridad",
      body:
        "Modbus es el protocolo industrial más común. Es simple y robusto… y de una época sin ciberseguridad: NO autentica, NO cifra, NO valida quién habla. Un PLC con Modbus/TCP escucha en el puerto 502, y quien llegue a ese puerto puede LEER el estado del proceso (coils, holding registers) y ESCRIBIR sobre él. No hay contraseña que crackear: el control es de quien alcance el 502. Por eso la única defensa real es la SEGMENTACIÓN de red.",
      diagram: "ics",
      bullets: [
        "Modbus/TCP escucha en el 502: sin auth, sin cifrado.",
        "Leés coils/registros y ESCRIBÍS sobre el proceso.",
        "No hay clave: la defensa es que no lleguen al 502.",
      ],
    },
    {
      kind: "concept",
      title: "Fingerprint y sabotaje del proceso",
      body:
        "Primero se identifica el equipo (Read Device Identification, función 43): marca, modelo, revisión, unidades activas. Eso dice qué soporta el PLC. Después se lee el proceso (holding registers = parámetros; coils = salidas on/off) y, en el peor caso, se ESCRIBE: cambiar un setpoint, forzar una salida, o —lo más grave— manipular el Sistema Instrumentado de Seguridad (SIS), la última barrera que evita un accidente. Manipular el SIS es cruzar la línea del daño físico.",
      diagram: "ics",
      bullets: [
        "fn 43 (Device ID): marca/modelo/unidades del PLC.",
        "holding registers = parámetros; coils = salidas.",
        "Escribir el proceso (o el SIS) = impacto físico real.",
      ],
    },
    {
      kind: "build",
      goal: "Escribir un valor en un registro (holding) del PLC de la planta",
      pieces: ["modbus", "write", "plc.planta.nande", "reg", "40001", "0", "--brute"],
      answer: ["modbus", "write", "plc.planta.nande", "reg", "40001", "0"],
      hint: "modbus write <host> reg <addr> <valor>. El registro es 40001 y querés forzarlo a 0.",
      explain:
        "`modbus write plc.planta.nande reg 40001 0` fuerza un registro del PLC. En un proceso real eso puede parar una bomba o cambiar un setpoint. Recordá: para que funcione, primero tenés que ALCANZAR el 502 del PLC, y eso exige pivotar IT→OT.",
    },
    {
      kind: "concept",
      title: "Coils, registros y el Sistema de Seguridad",
      body:
        "El modelo de datos de Modbus es simple y por eso peligroso. COILS: salidas booleanas (on/off) — un relé, un motor. DISCRETE INPUTS: entradas booleanas de solo lectura. INPUT REGISTERS: lecturas de 16 bits (un sensor). HOLDING REGISTERS: parámetros de 16 bits de lectura/escritura (un setpoint). Escribir un coil o un holding register cambia el proceso físico directamente. Y aparte está el SIS: la lógica de seguridad que debería frenar todo si algo sale mal. Tocar el SIS es quitar la red de contención de un trapecista.",
      diagram: "ics",
      bullets: [
        "Coils = salidas on/off; holding registers = parámetros escribibles.",
        "Escribir esos valores = actuar sobre el mundo físico.",
        "El SIS es la última barrera: manipularlo es lo más grave.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Si Modbus no tiene contraseña, ¿por qué no cae cualquier PLC de Internet todo el tiempo?",
      options: [
        "Porque la defensa real es la SEGMENTACIÓN: el 502 no debería ser alcanzable desde afuera",
        "Porque Modbus sí tiene contraseña fuerte",
        "Porque los PLCs se apagan solos de noche",
        "Porque nadie sabe usar Modbus",
      ],
      correct: 0,
      explain:
        "Como el protocolo no autentica, la única defensa efectiva es que NADIE no autorizado llegue al puerto 502: segmentación estricta, DMZ industrial y firewalls. Cuando un PLC queda expuesto a Internet por error, efectivamente cualquiera puede controlarlo — por eso buscadores como Shodan los encuentran.",
      diagram: "ics",
    },
    {
      kind: "lab",
      title: "Tocá el PLC (si podés llegar)",
      body: "Intentá hablar Modbus con el PLC de la planta y observá qué te responde el ruteo real.",
      command: "modbus plc.planta.nande",
      explain:
        "En un mundo limpio el motor te dice que NO hay ruta hasta el PLC: la red industrial es interna y hay que pivotar hasta la OT primero. Eso no es un límite artificial: es el ruteo L4 real de ÑANDE (el 502 tiene que estar abierto Y alcanzable). Cuando llegues —tras el salto IT→OT— el mismo comando te muestra el proceso, y `modbus id plc.planta.nande` el fingerprint del equipo.",
      diagram: "ics",
    },
  ],
};

const OT_DEFENSA: Curso = {
  id: "c-ot-defensa",
  title: "Defender la planta (OT)",
  subtitle: "La segmentación es la defensa número uno: aislar un choke point corta la campaña antes del impacto físico.",
  level: "avanzado",
  skill: "blue-team",
  hue: 165,
  glyph: "gem",
  reward: { xp: 290, coins: 230 },
  slides: [
    {
      kind: "concept",
      title: "En OT, segmentar es la defensa",
      body:
        "Como Modbus no autentica y los PLCs no se 'parchean' como un servidor, la defensa de OT no es poner contraseñas: es CONTROLAR QUIÉN LLEGA. Segmentación estricta entre IT y OT, una DMZ industrial real, y monitoreo de los puentes doble-homed. Si el atacante no puede alcanzar el 502, no importa que Modbus sea inseguro. La contención en OT se hace aislando hosts de la ruta, y cuanto más temprano, mejor.",
      diagram: "escudo",
      bullets: [
        "No hay auth que agregar: controlás el ACCESO, no la clave.",
        "Segmentación IT/OT + DMZ industrial + vigilar los puentes.",
        "Aislar un choke point corta la cadena antes del impacto.",
      ],
    },
    {
      kind: "concept",
      title: "Cortar temprano en la ruta IT→OT",
      body:
        "La campaña OT es una cadena: IT → servidor/jump host → historian doble-homed → HMI → PLC. Cada eslabón es una oportunidad de corte. Aislar el jump host (server.nande) frena todo, aunque el objetivo final sea el PLC tres saltos más allá. Aislar el historian (db-core) corta la ruta al segmento industrial profundo. La defensa en profundidad te da varias chances: usá la más temprana que puedas.",
      diagram: "pivot",
      bullets: [
        "La cadena OT pasa por varios choke points.",
        "Aislar el jump host o el historian corta ramas enteras.",
        "Más temprano el corte = más margen antes del daño.",
      ],
    },
    {
      kind: "quiz",
      prompt: "El adversario OT quiere sabotear el PLC. Aislás el jump host (server.nande), que está en la ruta pero lejos del PLC. ¿Qué pasa?",
      options: [
        "La campaña se bloquea: sin ese salto no llega al segmento OT, aunque el objetivo esté más adelante",
        "Nada, porque el PLC sigue encendido",
        "El PLC se daña igual",
        "El adversario gana automáticamente",
      ],
      correct: 0,
      explain:
        "Si el host aislado está en el CAMINO hacia el objetivo, cortás toda la rama que dependía de él. No hace falta defender el PLC en sí: defendés la ruta. Es la esencia de la segmentación y la defensa en profundidad en OT.",
      diagram: "ics",
    },
    {
      kind: "concept",
      title: "Monitoreo pasivo: mirar sin tocar",
      body:
        "En IT reiniciás un servidor y no pasa nada grave. En OT un escaneo agresivo puede COLGAR un PLC viejo y parar una línea de producción. Por eso la defensa OT prioriza el monitoreo PASIVO: escuchar el tráfico (una copia por SPAN/TAP) para detectar comandos Modbus anómalos —una escritura a un registro crítico, un origen que no debería hablar con el PLC— sin inyectar un solo paquete a la red industrial. Detectás la anomalía y contenés en el puente IT/OT, nunca sondeando el proceso en vivo.",
      diagram: "sniffer",
      bullets: [
        "En OT, hasta un escaneo puede tumbar un equipo: cuidado.",
        "Monitoreo pasivo (SPAN/TAP): detectás sin tocar el proceso.",
        "Una escritura Modbus inesperada = alerta; contené en el puente.",
      ],
    },
    {
      kind: "build",
      goal: "Aislar el historian doble-homed para cortar la ruta IT→OT del adversario",
      pieces: ["contain", "host", "db-core.interna.nande", "release", "apt"],
      answer: ["contain", "host", "db-core.interna.nande"],
      hint: "Aislás con 'contain host' seguido del host puente que conecta con el segmento industrial.",
      explain:
        "`contain host db-core.interna.nande` saca de la red al historian que puentea IT y OT. Como toda la ruta al segmento industrial pasa por él, la campaña del adversario queda bloqueada antes del sabotaje, aunque su objetivo esté más adentro. Defensa en profundidad en acción.",
    },
    {
      kind: "lab",
      title: "Armá la campaña OT y preparate a cortarla",
      body: "Poné en marcha al adversario que apunta a la planta. Después vas a defenderla con segmentación.",
      command: "apt start karai-ot",
      explain:
        "Armás a 'Karai OT', que intentará cruzar IT→OT y sabotear el proceso. Mirá de qué activo depende su avance con `apt status`, y cortalo aislando un choke point: `contain host server.nande` (el jump host) o `contain host db-core.interna.nande` (el historian). Después `apt run`: si aislaste bien, la campaña termina BLOQUEADA antes del sabotaje (técnicas OT como T0858/T0879 no llegan a ejecutarse).",
      diagram: "ics",
    },
  ],
};

export const OT_COURSES: Curso[] = [
  OT_INTRO,
  OT_MODBUS,
  OT_DEFENSA,
];
