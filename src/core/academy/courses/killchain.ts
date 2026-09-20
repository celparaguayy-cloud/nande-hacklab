import type { Curso } from "../courseTypes";

/**
 * Módulo "operaciones" (capstone / red team) de ÑANDE.
 *
 * Enseña la METODOLOGÍA de una operación ofensiva real —el kill chain— en vez
 * de trucos sueltos: reconocer, enumerar, ganar acceso, escalar, moverse
 * lateral, y reportar. Cada lab golpea el mundo REAL de ÑANDE (server.nande y
 * la red interna que sólo se ve pivotando) con herramientas que funcionan.
 *
 * Público: avanzado. Es lo que separa "sé correr una herramienta" de "sé hacer
 * una auditoría". Culmina en la operación guiada l-eng-host (de recon a root).
 */

const OP_KILLCHAIN: Curso = {
  id: "c-op-killchain",
  title: "Operación completa: de reconocimiento a root",
  subtitle: "La metodología real de un pentest, fase por fase, hasta pivotar a la red interna.",
  level: "avanzado",
  skill: "pentesting",
  hue: 0,
  glyph: "target",
  reward: { xp: 400, coins: 320 },
  slides: [
    {
      kind: "concept",
      title: "La herramienta no es el hacker: la metodología sí",
      body:
        "Ya sabés correr nmap, hydra, sqlmap, gobuster. Pero una operación real no es tirar comandos sueltos: es un PROCESO ordenado donde cada paso alimenta al siguiente. A ese proceso se lo llama kill chain (cadena de ataque). Un profesional no 'prueba cosas': ejecuta una metodología. Este curso te da esa cabeza — la que te deja entrar a una máquina que nunca viste y saber exactamente qué hacer primero, segundo y tercero.",
      diagram: "capas",
      bullets: [
        "Comandos = herramientas. Metodología = saber cuándo y por qué usarlas.",
        "Cada fase produce la información que la siguiente necesita.",
      ],
    },
    {
      kind: "concept",
      title: "Las fases del kill chain (y MITRE ATT&CK)",
      body:
        "Una operación se ordena en fases. La industria las mapea en MITRE ATT&CK (el diccionario común de tácticas):\n\n1. Reconnaissance — juntar información del objetivo.\n2. Initial Access — el primer pie adentro (foothold).\n3. Execution / Discovery — mirar dónde caíste.\n4. Privilege Escalation — de usuario común a root/admin.\n5. Lateral Movement — saltar a otras máquinas (pivoting).\n6. Collection / Exfiltration / Impact — el objetivo real.\n7. Reporting — lo que de verdad le sirve al cliente.\n\nCada acción ofensiva que hagas cae en una de estas tácticas. Pensar en fases es lo que te ordena.",
      diagram: "capas",
      bullets: [
        "Recon → Acceso → Descubrimiento → Escalada → Lateral → Impacto → Informe.",
        "MITRE ATT&CK es el lenguaje común: cada técnica tiene su casillero.",
      ],
    },
    {
      kind: "concept",
      title: "Fase 0: alcance y permiso (lo que nadie te cuenta)",
      body:
        "Antes de tocar una tecla, un pentester define el ALCANCE (scope): qué IPs/dominios están autorizados, qué NO se toca, en qué horario, y qué pasa si algo se rompe. Eso es el 'Rules of Engagement'. Sin autorización por escrito, lo mismo que acá es práctica, afuera es delito. En ÑANDE el alcance ya está fijo: sólo 10.10.x.y y *.nande. Esa disciplina —atacar sólo lo autorizado— es lo primero que te vuelve profesional.",
      diagram: "escudo",
      bullets: [
        "Scope + autorización por escrito ANTES de empezar. Siempre.",
        "La misma técnica: con permiso es un trabajo; sin permiso, un delito.",
      ],
    },
    {
      kind: "concept",
      title: "Fase 1: Reconocimiento",
      body:
        "El recon mapea la superficie: qué máquinas hay, qué puertos abiertos, qué servicios y qué versiones. Hay recon pasivo (sin tocar el objetivo: OSINT, DNS) y activo (le mandás paquetes: nmap). Regla de oro del escaneo: primero AMPLIO (todos los puertos), después PROFUNDO (versión y scripts sobre lo que encontraste). Un -p- te da el mapa; un -sV te dice contra qué peleás.",
      diagram: "escaneo",
      bullets: [
        "Pasivo (no te delata) primero; activo (nmap) después.",
        "Amplio (-p-) para el mapa, profundo (-sV) para el detalle.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: recon del objetivo",
      body:
        "Arrancá la operación contra server.nande: escaneá TODOS los puertos y pedí versión de cada servicio. Ese es el primer movimiento de cualquier auditoría.",
      command: "nmap -p- -sV server.nande",
      explain:
        "nmap te muestra los puertos abiertos y la versión de cada servicio (SSH en 22, web en 80…). Con eso ya tenés el árbol de ataque: cada puerto abierto es una puerta candidata. El SSH abierto + una versión conocida es lo que vas a atacar en la fase siguiente.",
      diagram: "escaneo",
    },
    {
      kind: "quiz",
      prompt: "¿Por qué conviene correr -p- (todos los puertos) antes que confiar en el escaneo por defecto?",
      options: [
        "nmap por defecto sólo mira los 1000 puertos comunes; un servicio jugoso puede estar en un puerto alto y te lo perderías",
        "Porque -p- es más rápido",
        "Porque -p- oculta el escaneo del SOC",
        "Porque sin -p- nmap no da versiones",
      ],
      correct: 0,
      explain:
        "El escaneo por defecto cubre los 1000 puertos más comunes. Los administradores esconden servicios en puertos altos (2222, 8080, 50000). -p- los prueba TODOS: más lento y más ruidoso, pero no dejás nada afuera. En una operación real, lo que no escaneás no existe para vos.",
      diagram: "puerto",
    },
    {
      kind: "concept",
      title: "Fase 2: Acceso inicial (foothold)",
      body:
        "El foothold es el primer pie adentro. Se busca el eslabón más débil de lo que encontraste: un servicio con credencial floja, una web inyectable, una versión vulnerable. No hace falta romper lo más fuerte: alcanza con UNA puerta. Un SSH con una contraseña débil (la que 'el soporte dejó puesta') es el clásico. La fuerza bruta acotada con un buen diccionario la encuentra.",
      diagram: "fuerzabruta",
      bullets: [
        "Buscás el eslabón MÁS débil, no el más fuerte.",
        "Una sola credencial válida ya te mete adentro.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: conseguí la credencial",
      body:
        "El escaneo mostró SSH abierto. Probá fuerza bruta con hydra para encontrar la credencial floja del soporte. Fijate qué usuario y clave caen.",
      command: "hydra ssh://server.nande",
      explain:
        "hydra prueba el diccionario contra el SSH real y encuentra soporte / Verano2024. Esa credencial ES la que abre la sesión de verdad (no está hardcodeada). Ojo: cada intento fallido deja rastro; el SOC correlaciona la ráfaga en una alerta. En una operación sigilosa, esto se hace despacio o se busca otra vía.",
      diagram: "fuerzabruta",
    },
    {
      kind: "lab",
      title: "Practicá: entrá (foothold real)",
      body:
        "Con la credencial en mano, conectate al servidor. Ya no estás mirando desde afuera: ahora tenés una shell adentro. Mirá qué comandos te ofrece la máquina.",
      command: "connect server.nande soporte Verano2024",
      explain:
        "Estás DENTRO de server.nande como 'soporte'. Cambió todo: ahora ves su filesystem, sus procesos, sus servicios y —lo más importante— su red interna, que desde afuera no se veía. El foothold no es el final: es la puerta a todo lo demás.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Fase 3: Descubrimiento (¿dónde caí?)",
      body:
        "Recién adentro, un profesional NO ataca a lo loco: primero se ubica (situational awareness). Tres preguntas: ¿Quién soy? (whoami, mis permisos). ¿Qué hay acá? (archivos, notas, configs, credenciales guardadas). ¿A dónde llego desde acá? (otras máquinas, la red interna). Las respuestas dibujan el próximo salto. Muchas veces la clave del siguiente host está en un archivo de texto que alguien dejó 'para acordarse'.",
      diagram: "archivo",
      bullets: [
        "Quién soy · qué hay · a dónde llego: el mapa desde adentro.",
        "Credenciales en archivos = el regalo más común en post-explotación.",
      ],
    },
    {
      kind: "concept",
      title: "Fase 4: Escalada de privilegios",
      body:
        "Entrar como usuario común es el principio; el control total es root/admin. La escalada (privesc) aprovecha descuidos: un binario con SUID mal puesto, un sudo demasiado permisivo, una tarea programada que corre como root, credenciales reusadas. Herramientas como linpeas automatizan la búsqueda de estos caminos. La idea: convertir un acceso limitado en control absoluto de la máquina.",
      diagram: "privesc",
      bullets: [
        "De usuario a root: SUID, sudo, tareas cron, credenciales reusadas.",
        "linpeas enumera automáticamente las vías de escalada.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Ya estás dentro de server.nande. ¿Cuál es el mejor primer movimiento para encontrar el próximo objetivo?",
      options: [
        "Leer los archivos y notas de la máquina buscando credenciales o referencias a otras máquinas internas",
        "Apagar el servidor",
        "Volver a correr hydra contra el mismo SSH",
        "Borrar los logs y salir",
      ],
      correct: 0,
      explain:
        "En post-explotación, la información manda. Una nota del admin, un config con credenciales o un historial de comandos suele revelar OTRA máquina (una interna) y su clave. Ese es el hilo del que tirar para el movimiento lateral. Apagar o borrar no te acerca al objetivo y hace ruido.",
      diagram: "archivo",
    },
    {
      kind: "concept",
      title: "Fase 5: Movimiento lateral (pivoting)",
      body:
        "Las redes bien hechas se segmentan: lo valioso (bases de datos, caja, RRHH) vive en una red interna que NO se alcanza desde internet. Sólo se ve desde una máquina ya comprometida que tenga un pie en las dos redes. Saltar a través de ella se llama pivoting. Es el corazón de las operaciones reales: el primer host casi nunca es el objetivo; es el trampolín hacia lo que sí importa.",
      diagram: "ip",
      bullets: [
        "La red interna sólo se ve desde adentro (por eso pivoteás).",
        "El primer host es el puente, no el premio.",
      ],
    },
    {
      kind: "build",
      goal: "Armar el salto pivote a la máquina interna (ya tenés su usuario y clave desde la nota)",
      pieces: ["connect", "caja.interna.nande", "admin", "GiraSol#2024", "server.nande", "rm", "-rf"],
      answer: ["connect", "caja.interna.nande", "admin", "GiraSol#2024"],
      hint: "El mismo connect que usaste para el server, pero apuntando al host interno con SU credencial (admin / GiraSol#2024).",
      explain:
        "connect caja.interna.nande admin GiraSol#2024 te salta al host interno. Sólo funciona porque estás pivoteando DESDE server.nande (que sí alcanza la red 10.10.66.x). Desde tu máquina directa, caja.interna ni existe. Eso es movimiento lateral real.",
    },
    {
      kind: "quiz",
      prompt: "¿Por qué caja.interna.nande sólo se alcanza desde server.nande y no desde tu máquina?",
      options: [
        "Porque la red interna está segmentada: server.nande tiene un pie en las dos redes y hace de puente; tu máquina no llega ahí",
        "Porque caja.interna.nande está apagada",
        "Porque tu máquina es más lenta",
        "Porque el DNS está roto",
      ],
      correct: 0,
      explain:
        "La segmentación de red es una defensa: lo crítico va en una subred que no se rutea a internet. Sólo un host con acceso a ambas (server.nande) puede alcanzarla. Por eso el atacante primero toma ese host y desde ahí pivotea. Bien hecha, la segmentación obliga a comprometer varios saltos — y le da al defensor más chances de detectarte.",
      diagram: "firewall",
    },
    {
      kind: "lab",
      title: "Capstone: la operación completa, en cadena",
      body:
        "Ponés todo junto en un solo comando encadenado con &&: foothold en el server, pivote a la máquina interna, y lees la bandera de root. Es la operación entera, de punta a punta.",
      command:
        "connect server.nande soporte Verano2024 && connect caja.interna.nande admin GiraSol#2024 && cat /root/flag.txt",
      explain:
        "Foothold → pivoting → loot. Al leer /root/flag.txt en la máquina interna capturás ND{pivoting_red_interna}: comprometiste algo que desde afuera era invisible. Eso es una operación real: el primer host fue sólo el puente hacia el objetivo de verdad.",
      diagram: "capas",
    },
    {
      kind: "concept",
      title: "Impacto y OPSEC: el ruido que dejás",
      body:
        "Cada acción deja rastro: la ráfaga de hydra, los logins, los comandos. Un SOC con buena visibilidad correlaciona eso y te caza. OPSEC (seguridad operacional) es controlar tu ruido: ir despacio, usar credenciales válidas en vez de fuerza bruta, limpiar sólo lo que corresponde al alcance. En un pentest a veces querés ser detectado (para probar la defensa); en un red team real, el sigilo ES el objetivo. Saber cuánto ruido hacés es parte del oficio.",
      diagram: "firewall",
      bullets: [
        "Todo deja rastro; el SOC correlaciona ráfagas y logins raros.",
        "OPSEC = medir y controlar tu ruido según el objetivo de la operación.",
      ],
    },
    {
      kind: "concept",
      title: "Fase 7: El informe (lo que te pagan de verdad)",
      body:
        "Comprometer la máquina es la mitad del trabajo; la otra mitad es el INFORME. Un pentester documenta cada hallazgo con: qué encontró, cómo reproducirlo paso a paso, qué impacto tiene y CÓMO arreglarlo. Sin informe, el cliente no puede defenderse y tu trabajo no sirvió. Además, jamás se usan datos reales de personas ni se guarda nada fuera del alcance. Esa disciplina —demostrar sin dañar y enseñar a defender— es exactamente la línea que separa a un profesional de un delincuente.",
      diagram: "escudo",
      bullets: [
        "Hallazgo + reproducción + impacto + remediación: eso es el entregable.",
        "Demostrar sin dañar. Reportar para que se arregle. Nunca datos reales ajenos.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: la operación guiada, vos solo",
      body:
        "Ahora hacé la operación completa de forma guiada, que te va preguntando qué encontraste en cada fase. De recon a root, con la metodología de este curso. Tocá para arrancar en la terminal.",
      command: "learn l-eng-host",
      explain:
        "Es la operación de punta a punta —recon, foothold, descubrimiento, pivoting y loot— pero guiada y con preguntas que te obligan a ENTENDER cada fase, no sólo copiar. Terminarla demuestra que sabés HACER una operación, que es lo que buscan HackTheBox y un empleador de verdad.",
      diagram: "terminal",
    },
  ],
};

export const KILLCHAIN_COURSES: Curso[] = [OP_KILLCHAIN];
