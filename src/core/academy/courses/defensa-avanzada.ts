import type { Curso } from "../courseTypes";

/**
 * Módulo "Defensa avanzada (Blue Team)". Cursos ligados a los motores REALES de
 * defensa de ÑANDE: SOC/SIEM (BlueTeam), DFIR (Investigator), ContainmentEngine
 * (contain), BlueTeamResponder (blueteam autónomo) y la remediación de AD
 * (harden-adcs, rotate-krbtgt). Enseñan el otro lado de los ataques del módulo
 * de Active Directory: detectar, contener y cerrar la ruta. 100% offline.
 */

const DEF_IR: Curso = {
  id: "c-def-ir-contencion",
  title: "Respuesta a incidentes: contener",
  subtitle: "Cuando el ataque ya está adentro: aislar hosts y deshabilitar cuentas para cortar la cadena en marcha.",
  level: "avanzado",
  skill: "blue-team",
  hue: 200,
  glyph: "medal",
  reward: { xp: 240, coins: 190 },
  slides: [
    {
      kind: "concept",
      title: "Detectar no alcanza: hay que contener",
      body:
        "Un SOC que sólo mira no sirve: cuando confirmás una intrusión, el reloj corre. CONTENER es cortar el acceso del atacante AHORA, antes de que profundice. Las dos palancas clásicas de respuesta a incidentes (IR) son: AISLAR un host (lo sacás de la red, se vuelve inalcanzable) y DESHABILITAR una cuenta (deja de poder autenticarse). Bien elegidas, rompen la cadena del ataque en el punto justo.",
      diagram: "purple",
      bullets: [
        "Contención = frenar el acceso ya, no investigar despacio.",
        "Aislar host: lo desconectás de la red (deja de ser alcanzable).",
        "Deshabilitar cuenta: no puede volver a autenticarse.",
      ],
    },
    {
      kind: "concept",
      title: "Contener el ESLABÓN correcto",
      body:
        "El ataque es una CADENA de pasos, y cada paso depende de un activo concreto. Si el próximo paso del atacante necesita la cuenta SVC-SQL, deshabilitarla lo frena en seco. Si necesita saltar por server.nande (jump host), aislarlo corta todo lo que venga después — aunque el objetivo final sea otra máquina. Contener bien es entender la ruta y cortar el eslabón del que depende lo que viene.",
      diagram: "pivot",
      bullets: [
        "Cada paso del atacante depende de un activo real.",
        "Contené un choke point y cortás toda la rama que sigue.",
        "Contención temprana > contención tardía: frena antes del daño.",
      ],
    },
    {
      kind: "quiz",
      prompt: "El adversario va a kerberoastear SVC-SQL para saltar al servidor. ¿Cuál es la contención más directa?",
      options: [
        "Deshabilitar la cuenta SVC-SQL antes de que la use",
        "Apagar todas las computadoras de la empresa",
        "Cambiar el fondo de pantalla del DC",
        "Esperar a ver qué pasa",
      ],
      correct: 0,
      explain:
        "Si el próximo paso depende de SVC-SQL, deshabilitar esa cuenta corta la cadena sin tirar abajo toda la red. La contención quirúrgica frena al atacante y molesta lo mínimo al negocio. Rehabilitarla después es un comando; recuperarse de un dominio comprometido, no.",
      diagram: "purple",
    },
    {
      kind: "concept",
      title: "Contener no es erradicar",
      body:
        "La respuesta a incidentes tiene fases (identificación → contención → erradicación → recuperación → lecciones). Contener es frenar la hemorragia; erradicar es sacar al atacante y sus rastros (persistencia, cuentas creadas, Golden Tickets); recuperar es volver a operar sano. Aislar un host y deshabilitar una cuenta son contención: compran tiempo. Pero si el adversario dejó persistencia (p. ej. un Golden Ticket), hasta que no rotes krbtgt no erradicaste nada. Contener sin erradicar es una tregua, no una victoria.",
      diagram: "purple",
      bullets: [
        "Fases IR: identificar → contener → erradicar → recuperar → aprender.",
        "Contener compra tiempo; erradicar saca al atacante y su persistencia.",
        "Sin erradicar la persistencia, el atacante vuelve.",
      ],
    },
    {
      kind: "build",
      goal: "Aislar de la red un host comprometido para cortar el pivoteo",
      pieces: ["contain", "host", "server.nande", "release", "nmap"],
      answer: ["contain", "host", "server.nande"],
      hint: "El verbo para aislar es 'host'; después el nombre del equipo a sacar de la red.",
      explain:
        "`contain host server.nande` aísla ese equipo: deja de ser alcanzable y se corta cualquier pivoteo que pasara por él. Se revierte con `contain release server.nande`. Es contención quirúrgica con efecto real sobre el ruteo del mundo.",
    },
    {
      kind: "lab",
      title: "El tablero de contención",
      body: "Mirá el estado de contención y el plan recomendado que el motor deriva del estado real del mundo.",
      command: "contain",
      explain:
        "El tablero (IR) te muestra qué hosts están aislados, qué cuentas deshabilitadas, y un PLAN priorizado (🔴/🟠) derivado de lo que está comprometido AHORA. Aplicás todo con `contain auto`, o quirúrgicamente con `contain host <host>` y `contain account <cuenta>`. Revertís con `contain release` / `contain enable`. En un mundo limpio no hay nada comprometido: el plan está vacío, como debe ser.",
      diagram: "purple",
    },
  ],
};

const DEF_SOC: Curso = {
  id: "c-def-soc-autonomo",
  title: "SOC: el defensor autónomo",
  subtitle: "Un equipo azul que detecta y responde solo. Si hacés algo grave y rastreable, te contiene.",
  level: "avanzado",
  skill: "blue-team",
  hue: 190,
  glyph: "eye",
  reward: { xp: 250, coins: 200 },
  slides: [
    {
      kind: "concept",
      title: "El SOC nunca duerme",
      body:
        "En una empresa real hay un SOC (Security Operations Center): gente y automatismos que vigilan los eventos 24/7. En ÑANDE el equipo azul es AUTÓNOMO y simétrico al red team: tiene tres posturas. OFF (inerte), MONITOR (detecta actividad grave y avisa, pero no toca nada) y ACTIVO (detecta Y contiene solo). En ACTIVO, si hacés algo grave y atribuible —DCSync, ESC1, sabotaje OT, kerberoasting ruidoso— responde y te aísla el pivote o deshabilita tu cuenta más peligrosa.",
      diagram: "siem",
      bullets: [
        "OFF / MONITOR / ACTIVO: tres posturas del defensor.",
        "ACTIVO = detecta y contiene automáticamente.",
        "Lo 'grave y detectable' es lo que dispara la respuesta.",
      ],
    },
    {
      kind: "concept",
      title: "OPSEC: el anonimato es tu defensa",
      body:
        "Acá está la lección de oro para el rojo: el SOC contiene lo que puede ATRIBUIR. Si enrutás por Tor (anon on), el SOC detecta la actividad pero NO puede atribuir su origen, así que no contiene. No es magia: es que la respuesta automática necesita saber A QUIÉN cortar. El sigilo y el anonimato no son 'trucos': son control de tu superficie de detección. Del lado azul, esto enseña por qué la atribución es tan valiosa.",
      diagram: "radar",
      bullets: [
        "El SOC contiene lo que puede atribuir a un origen.",
        "Tor/anon: te detectan, pero no saben a quién cortar.",
        "OPSEC = administrar cuánto de vos es rastreable.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Con el equipo azul en ACTIVO, hacés un DCSync ruidoso y atribuible. ¿Qué pasa?",
      options: [
        "El defensor responde solo: contiene (aísla el pivote o deshabilita tu cuenta)",
        "Nada, el SOC sólo mira",
        "Te felicita por el hallazgo",
        "Se apaga el dominio entero automáticamente",
      ],
      correct: 0,
      explain:
        "En ACTIVO el equipo azul no sólo observa: responde. Un DCSync es grave y, si es atribuible, dispara contención automática. Por eso el rojo maduro mide su ruido y su atribución ANTES de lanzar la técnica más escandalosa.",
      diagram: "siem",
    },
    {
      kind: "concept",
      title: "Tres posturas, tres compromisos",
      body:
        "Elegir la postura del SOC es un trade-off real. OFF no molesta pero no protege. MONITOR detecta y avisa sin tocar nada: útil cuando un corte automático puede tirar un servicio crítico (falsos positivos que interrumpen el negocio). ACTIVO contiene solo: máxima protección, pero una detección errónea puede aislar un host legítimo. En producción, muchos equipos corren en MONITOR sobre lo dudoso y ACTIVO sólo sobre lo inequívocamente grave (DCSync, sabotaje OT). La madurez es saber qué automatizar.",
      diagram: "siem",
      bullets: [
        "OFF: cero fricción, cero protección.",
        "MONITOR: detecta y avisa, no interrumpe (bueno ante falsos positivos).",
        "ACTIVO: contiene solo; reservalo para lo inequívocamente grave.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Un atacante hábil enruta por Tor antes de hacer ruido. ¿Por qué el SOC en ACTIVO no lo contiene?",
      options: [
        "Porque la respuesta automática necesita atribuir el origen, y Tor lo enmascara",
        "Porque Tor apaga el SIEM",
        "Porque el SOC sólo funciona de día",
        "Porque el atacante pagó una licencia",
      ],
      correct: 0,
      explain:
        "Detectar y atribuir son cosas distintas. El SOC ve la actividad, pero para CORTAR necesita saber a quién. Con el origen enmascarado por Tor, la contención automática no tiene un blanco. Enseña las dos caras: OPSEC para el rojo, y por qué la atribución vale oro para el azul.",
      diagram: "radar",
    },
    {
      kind: "lab",
      title: "Poné el defensor en ACTIVO",
      body: "Cambiá la postura del equipo azul a ACTIVO y leé qué implica para tu operación.",
      command: "blueteam active",
      explain:
        "El defensor queda ACTIVO: a partir de ahora, una técnica grave y atribuible dispara contención automática. Consultá su estado y sus últimas respuestas con `blueteam` a secas; bajalo a observación con `blueteam monitor` o apagalo con `blueteam off`. Es el motor que convierte tu ruido en consecuencias.",
      diagram: "siem",
    },
  ],
};

const DEF_HARDENING: Curso = {
  id: "c-def-hardening-ad",
  title: "Endurecer Active Directory",
  subtitle: "La contraparte azul de ESC1 y el Golden Ticket: cerrar la plantilla de la CA y rotar krbtgt.",
  level: "avanzado",
  skill: "blue-team",
  hue: 175,
  glyph: "gem",
  reward: { xp: 270, coins: 210 },
  slides: [
    {
      kind: "concept",
      title: "Cada técnica ofensiva tiene su remediación",
      body:
        "Saber romper AD obliga a saber cerrarlo. Dos remediaciones de alto impacto: (1) ENDURECER las plantillas de la CA, para matar ESC1 (le quitás 'el solicitante elige el SAN' y exigís aprobación de un manager); (2) ROTAR la clave de krbtgt, para invalidar Golden Tickets. No son texto: son cambios de estado verificables. Después de endurecer, `certipy req` deja de poder impersonar. Después de rotar (dos veces), el Golden Ticket forjado deja de validar.",
      diagram: "escudo",
      bullets: [
        "harden-adcs → cierra la plantilla vulnerable a ESC1.",
        "rotate-krbtgt → invalida Golden Tickets (hay que hacerlo DOS veces).",
        "La defensa se VERIFICA: después, el ataque ya no funciona.",
      ],
    },
    {
      kind: "concept",
      title: "Por qué krbtgt se rota dos veces",
      body:
        "El KDC guarda la clave ACTUAL y la ANTERIOR de krbtgt, para no romper tickets legítimos en tránsito. Si rotás una sola vez, un Golden Ticket forjado todavía valida contra la clave 'anterior'. Recién la SEGUNDA rotación lo invalida del todo. Es el patrón estándar de respuesta post-DCSync: dos rotaciones, con un margen entre ellas. Rotar krbtgt es, además, buena higiene aunque no sepas si hubo Golden Ticket.",
      diagram: "dcsync",
      bullets: [
        "El KDC honra clave actual + anterior (compatibilidad).",
        "Una rotación no alcanza; hacen falta dos.",
        "Post-DCSync: rotar krbtgt es obligatorio.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Endureciste la plantilla de la CA (harden-adcs). ¿Qué cambió para el atacante?",
      options: [
        "certipy req ya no puede pedir un cert eligiendo el SAN: la ruta ESC1 quedó cerrada",
        "El atacante gana privilegios automáticamente",
        "Se borran todos los usuarios del dominio",
        "Nada, es sólo cosmético",
      ],
      correct: 0,
      explain:
        "harden-adcs le quita a la plantilla la condición que hacía ESC1 explotable (elegir el SAN) y exige aprobación. Con eso, pedir un certificado 'como el Domain Admin' deja de ser posible. La ruta de abuso queda cerrada de verdad, y se puede comprobar volviendo a intentar el ataque.",
      diagram: "adcs",
    },
    {
      kind: "build",
      goal: "Rotar la clave de krbtgt para invalidar Golden Tickets (primera de dos rotaciones)",
      pieces: ["rotate-krbtgt", "harden-adcs", "--force", "krbtgt"],
      answer: ["rotate-krbtgt"],
      hint: "El comando es directo, sin argumentos: rota la clave de krbtgt del dominio.",
      explain:
        "`rotate-krbtgt` cambia la clave de la cuenta krbtgt. Recordá el patrón: hacen falta DOS rotaciones (con un margen entre ellas) porque el KDC honra la clave anterior. Una sola no invalida los Golden Tickets vigentes.",
    },
    {
      kind: "concept",
      title: "Verificar que la defensa funcionó",
      body:
        "La regla de oro del blue team (y de este proyecto): no declares 'arreglado' porque corriste el comando. VERIFICALO. Después de harden-adcs, volvé a intentar el ataque: `certipy req` debería fallar al impersonar. Después de rotar krbtgt dos veces, un Golden Ticket forjado debería dejar de validar. La remediación real deja evidencia observable: el ataque que antes funcionaba, ahora no. Esa comprobación es lo que separa 'creo que lo cerré' de 'confirmé que está cerrado'.",
      diagram: "escudo",
      bullets: [
        "No alcanza con correr el comando: hay que comprobarlo.",
        "Reintentá el ataque: si ya no funciona, la defensa es real.",
        "IMPLEMENTADO ≠ VERIFICADO: la evidencia manda.",
      ],
    },
    {
      kind: "lab",
      title: "Cerrá la plantilla vulnerable",
      body: "Aplicá la remediación de ESC1 sobre la CA del dominio. Sin argumentos, endurece TODAS las plantillas vulnerables que encuentre.",
      command: "harden-adcs",
      explain:
        "El motor endurece la(s) plantilla(s) ESC1 y te confirma cuáles quedaron sanas. Como AD CS vive en el DC, hay que poder alcanzarlo (445): en un mundo limpio sin ruta al DC, el comando te lo dice — ése es el mismo gate real que enfrenta un defensor remoto. El paso gemelo contra la persistencia es `rotate-krbtgt` (recordá: dos veces).",
      diagram: "escudo",
    },
  ],
};

const DEF_PURPLE: Curso = {
  id: "c-def-purple",
  title: "Purple team: atacá y defendé a la vez",
  subtitle: "Un adversario vivo corre su campaña; vos lo detectás y lo contenés antes de que cumpla el objetivo.",
  level: "avanzado",
  skill: "blue-team",
  hue: 285,
  glyph: "target",
  reward: { xp: 300, coins: 240 },
  slides: [
    {
      kind: "concept",
      title: "Rojo + azul = morado",
      body:
        "El purple team no es un tercer equipo: es el LOOP donde el rojo y el azul trabajan juntos. El rojo emula a un adversario real (una campaña APT, paso a paso); el azul detecta cada técnica y responde. En ÑANDE eso es literal: `apt` corre un adversario VIVO que ejecuta técnicas reales (las ve el SOC, el DFIR y la matriz ATT&CK), y vos, defensor, tenés que cortarlo con `contain` ANTES de que cumpla su objetivo. No es un guion: si contenés el activo del próximo paso, el adversario no avanza.",
      diagram: "purple",
      bullets: [
        "El rojo emula; el azul detecta y responde; juntos = morado.",
        "El adversario de ÑANDE es real: cada paso enciende ATT&CK.",
        "Contené el activo del próximo paso y la campaña se BLOQUEA.",
      ],
    },
    {
      kind: "concept",
      title: "Defensa en profundidad",
      body:
        "Un buen defensor no corta en el último segundo: corta TEMPRANO, en un choke point. Si el adversario tiene que pasar por el jump host para llegar a la planta, aislar ese jump host frena toda la campaña, aunque el objetivo final sea un PLC tres saltos más allá. Esa es la defensa en profundidad: varias oportunidades de corte a lo largo de la ruta, no una sola línea Maginot. El motor lo respeta: aislar un eslabón intermedio bloquea todo lo que dependía de él.",
      diagram: "pivot",
      bullets: [
        "Cortá temprano, en un choke point de la ruta.",
        "Aislar un eslabón bloquea toda la rama que sigue.",
        "Varias capas de corte > una sola barrera.",
      ],
    },
    {
      kind: "quiz",
      prompt: "El adversario apunta al PLC de la planta, tres saltos adentro. ¿Dónde conviene contener?",
      options: [
        "En un choke point temprano de la ruta (ej. el jump host), para cortar toda la rama",
        "Sólo en el PLC, cuando ya casi lo tiene",
        "En ningún lado: es inevitable",
        "En una máquina que no está en la ruta",
      ],
      correct: 0,
      explain:
        "Si aislás un host que está en el CAMINO hacia el objetivo, cortás la cadena aunque la meta esté más adelante. Contener temprano da margen; contener sobre la bocina, a veces, ya es tarde. La ruta manda: por eso mapearla (op, netmap) es parte de la defensa.",
      diagram: "purple",
    },
    {
      kind: "concept",
      title: "Medir la defensa, no sólo 'ganar'",
      body:
        "El purple team no es un juego de suma cero: es una MÉTRICA. Al terminar el duelo, `op defense` te da una nota basada en qué tan pronto cortaste: cuántos pasos logró el adversario antes del corte, si lo detectaste, si lo contuviste. Detenerlo en el paso 2 vale más que en el 6. Esa nota convierte 'lo paré' en 'lo paré así de bien', y te dice dónde mejorar tu detección. Es el loop de aprendizaje del purple: atacar, defender, medir, ajustar.",
      diagram: "purple",
      bullets: [
        "op defense = nota de tu defensa (no un simple sí/no).",
        "Cortar temprano puntúa más que cortar sobre la bocina.",
        "La métrica dice dónde mejorar la detección.",
      ],
    },
    {
      kind: "quiz",
      prompt: "En el duelo purple, ¿qué demuestra que el motor NO es un guion scripteado?",
      options: [
        "Que si contenés el activo del próximo paso, el adversario realmente se bloquea y no avanza",
        "Que siempre gana el adversario pase lo que pase",
        "Que el resultado está escrito de antemano",
        "Que no importa lo que hagas",
      ],
      correct: 0,
      explain:
        "Un guion daría el mismo final siempre. Acá el adversario depende de activos reales: deshabilitás la cuenta de la que depende su próximo paso, o aislás el host de la ruta, y la campaña termina BLOQUEADA. El resultado sale del estado, no de un libreto.",
      diagram: "purple",
    },
    {
      kind: "lab",
      title: "Armá al adversario",
      body: "Poné en marcha una campaña de adversario vivo. Después vas a defenderla.",
      command: "apt start ana-reta",
      explain:
        "Armás a 'Aña Retã', un adversario que va a intentar dominar el dominio paso a paso. Mirá de qué activo depende su próximo paso con `apt status`, defendé con `contain account SVC-SQL@NANDE.LOCAL` (o aislando un host), y dejá que avance con `apt run`: si cortaste el eslabón correcto, la campaña termina BLOQUEADA. Medí tu defensa con `op defense`. Ése es el duelo purple completo.",
      diagram: "purple",
    },
  ],
};

export const DEFENSA_AVANZADA_COURSES: Curso[] = [
  DEF_IR,
  DEF_SOC,
  DEF_HARDENING,
  DEF_PURPLE,
];
