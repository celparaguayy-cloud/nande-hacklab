import type { Curso } from "../courseTypes";

/**
 * Módulo "Hacking real". Cursos-walkthrough que caminan una cadena de ataque
 * ENTERA contra objetivos reales del motor, con labs que capturan banderas de
 * verdad en cada fase (recon → foothold → user → root → pivoting). No es teoría:
 * es la metodología del pentest aplicada, paso a paso, como un box de HTB/THM.
 * Todo dentro del sandbox: 0% daño real, 100% técnica real.
 */

const HACK_MAQUINA: Curso = {
  id: "c-hack-maquina",
  title: "Hackeo de una máquina: de recon a root",
  subtitle: "Walkthrough completo y práctico: escaneás, entrás, conseguís la bandera de usuario, escalás a root, saqueás y pivotás a la red interna. Cada paso, un comando real.",
  level: "avanzado",
  skill: "pentesting",
  hue: 0,
  glyph: "target",
  reward: { xp: 500, coins: 400 },
  slides: [
    {
      kind: "concept",
      title: "La metodología: cómo se hackea de verdad",
      body:
        "Hackear no es 'probar cosas al azar': es un MÉTODO con fases, y el que lo sigue encuentra el camino. Las fases de un pentest real: RECONOCIMIENTO (qué hay), ENUMERACIÓN (en detalle: servicios, versiones, usuarios), EXPLOTACIÓN (entrar por una falla), FOOTHOLD (tu primer acceso, la bandera de usuario), POST-EXPLOTACIÓN (dónde estoy, qué puedo), ESCALADA DE PRIVILEGIOS (de usuario a root/admin), PIVOTING (saltar a la red interna), PERSISTENCIA, y REPORTE. En este curso vas a RECORRER todas esas fases contra una máquina real del sandbox (web01.nande) y capturar una bandera en cada hito.",
      diagram: "exploit",
      bullets: [
        "Recon → Enum → Explotar → Foothold → Post → Privesc → Pivot → Reporte.",
        "El método encuentra el camino; el azar, no.",
        "Vas a recorrer TODAS las fases con comandos reales.",
      ],
    },
    {
      kind: "concept",
      title: "Fase 1 — Reconocimiento",
      body:
        "Todo arranca MIRANDO, no atacando. El recon responde: ¿qué máquina es?, ¿qué puertas (puertos) tiene abiertas?, ¿qué servicio y qué VERSIÓN corre en cada una? Hay recon PASIVO (sin tocar el objetivo: DNS, buscadores, OSINT) y ACTIVO (lo tocás: escaneo de puertos). La herramienta rey del recon activo es nmap. La regla de oro del pentest: el 80% del éxito es reconocer bien. Un puerto que no mapeaste es una puerta que no probaste.",
      diagram: "escaneo",
      bullets: [
        "Primero mirar, después atacar.",
        "Pasivo (DNS/OSINT) vs activo (escaneo de puertos).",
        "El 80% del éxito es reconocer bien.",
      ],
    },
    {
      kind: "lab",
      title: "Escaneá el objetivo",
      body: "Corré un escaneo con detección de versión contra web01.nande. Anotá qué puertos están abiertos y qué servicio hay en cada uno: esa lista es tu mapa de ataque.",
      command: "nmap -sV web01.nande",
      explain:
        "Ves los puertos abiertos y la versión de cada servicio (por ejemplo, SSH en el 22). Cada línea es un handshake TCP real que respondió. La versión exacta es oro: con ella se buscan vulnerabilidades conocidas. Acá, el SSH abierto nos marca el primer vector: credenciales.",
      diagram: "escaneo",
    },
    {
      kind: "concept",
      title: "Fase 2 — Enumeración: convertir puertos en vectores",
      body:
        "Un puerto abierto no es una entrada todavía: hay que ENUMERAR qué podés hacer con él. SSH abierto → ¿hay usuarios con claves débiles? Web abierta → ¿qué rutas, qué tecnología, qué parámetros? La enumeración es paciente y detallista: cada servicio se interroga a fondo. Para SSH, el vector clásico es el acceso por credenciales: usuarios de sistema (devops, admin, soporte) que dejaron una contraseña floja de temporada. Eso se automatiza con hydra, o —si ya sospechás la credencial— se prueba directo.",
      diagram: "puerto",
      bullets: [
        "Un puerto abierto todavía no es una entrada: enumerá qué ofrece.",
        "SSH → usuarios con claves débiles (hydra o credencial sospechada).",
        "Web → rutas, tecnología, parámetros que controlás.",
      ],
    },
    {
      kind: "build",
      goal: "Entrar por SSH a web01.nande como el usuario devops (clave de temporada) y leer su bandera de usuario",
      pieces: ["connect", "web01.nande", "devops", "Delfin2024", "&&", "cat", "/home/devops/user.txt", "sudo"],
      answer: ["connect", "web01.nande", "devops", "Delfin2024", "&&", "cat", "/home/devops/user.txt"],
      hint: "connect <host> <usuario> <clave> te loguea; con && encadenás el cat de la bandera de usuario.",
      explain:
        "`connect web01.nande devops Delfin2024` abre una sesión como devops; con `&& cat /home/devops/user.txt` leés la bandera de usuario en el mismo paso. 'Delfin2024' es el típico nombre+año: una clave humana y débil, el pan de cada día de un pentester.",
    },
    {
      kind: "lab",
      title: "Fase 3 — Foothold: tu primer acceso (bandera de usuario)",
      body: "Entrá a web01.nande como devops con su clave débil y llevate la bandera de usuario. Es tu primer pie adentro de la máquina.",
      command: "connect web01.nande devops Delfin2024 && cat /home/devops/user.txt",
      explain:
        "¡Adentro! Capturaste ND{foothold_devops}: la bandera de USUARIO. Entraste con una credencial débil (nombre+año), que es como cae la mayoría de los accesos iniciales reales. Ahora sos devops en la máquina — pero devops no es root. El próximo objetivo: escalar.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Fase 4 — Ya adentro: ¿dónde estoy y qué puedo?",
      body:
        "Lo primero al conseguir un shell es ORIENTARSE (situational awareness). ¿Quién soy? (`whoami`, `id`). ¿En qué máquina estoy? (`hostname`, el /etc/os). ¿Qué puedo hacer con más privilegio? (`sudo -l` lista qué comandos podés correr como root). ¿Qué procesos corren, qué hay en mi home, qué configs puedo leer? Esta recolección define el camino a root: la escalada casi siempre sale de algo que el sistema te deja ver o hacer y no debería. El `sudo -l` es, muchas veces, el que canta la victoria.",
      diagram: "terminal",
      bullets: [
        "whoami / id / hostname: quién y dónde sos.",
        "sudo -l: qué podés correr como root (clave de la escalada).",
        "La privesc sale de algo que el sistema te deja ver/hacer de más.",
      ],
    },
    {
      kind: "lab",
      title: "Reconocé tu privilegio: sudo -l",
      body: "Ya como devops, preguntá qué podés ejecutar como root sin contraseña. Ahí suele estar el boleto a root.",
      command: "connect web01.nande devops Delfin2024 && sudo -l",
      explain:
        "`sudo -l` te muestra que devops puede correr un binario como root SIN contraseña (NOPASSWD). Eso es una mala configuración clásica: si ese binario puede ejecutar otros comandos, lo abusás para abrir una shell de root. El binario acá es `find`, y find tiene -exec: juego terminado.",
      diagram: "privesc",
    },
    {
      kind: "concept",
      title: "Fase 5 — Escalada de privilegios: GTFOBins",
      body:
        "GTFOBins es un catálogo legendario: lista binarios de Unix que, cuando corren con privilegio (sudo, SUID), pueden ser ABUSADOS para escapar a una shell o leer archivos protegidos. ¿Por qué `find` escala? Porque tiene `-exec`, que ejecuta un comando por cada archivo encontrado; si lo corrés con sudo, ese comando corre como ROOT. `sudo find . -exec /bin/sh \\;` te deja caer en una shell de root. La lección de defensa: NUNCA des sudo NOPASSWD sobre binarios que pueden ejecutar otros comandos (find, vim, awk, tar, python…). El mínimo privilegio no es opcional.",
      diagram: "privesc",
      bullets: [
        "GTFOBins: binarios que, con sudo/SUID, escapan a shell.",
        "find -exec corre un comando por archivo → con sudo, como root.",
        "Defensa: nada de sudo NOPASSWD sobre find/vim/awk/tar/python.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 5 — Root: escalá y llevate la bandera de root",
      body: "Abusá el sudo NOPASSWD sobre find para abrir una shell de root, y leé la bandera de root. Es el objetivo de toda máquina.",
      command: "connect web01.nande devops Delfin2024 && sudo find . -exec /bin/sh \\; && cat /root/flag.txt",
      explain:
        "¡ROOT! Capturaste ND{privesc_sudo_root}. Pasaste de un usuario común a dueño total de la máquina abusando una sola línea de sudo mal puesta (GTFOBins en acción). Esto es exactamente cómo se compromete un box en la vida real: una credencial débil para entrar, una mala config para escalar.",
      diagram: "privesc",
    },
    {
      kind: "concept",
      title: "Fase 6 — Post-explotación: el saqueo (loot)",
      body:
        "Ser root no es el final: es el permiso para BUSCAR. Un pentester ya root saquea de forma ordenada: credenciales en archivos de config (.env, scripts, historiales de bash), claves SSH privadas (que abren OTRAS máquinas), bases de datos locales, tokens, y —clave para lo que sigue— notas o configs que revelen la RED INTERNA (otros hosts, segmentos que desde afuera no se ven). Cada secreto encontrado es una llave a un lado nuevo. El loot de una máquina es, muchas veces, el foothold de la próxima.",
      diagram: "archivo",
      bullets: [
        "Root = permiso para buscar: credenciales, claves SSH, configs.",
        "Buscá lo que revele la RED INTERNA (otros hosts/segmentos).",
        "El loot de una máquina es el foothold de la siguiente.",
      ],
    },
    {
      kind: "concept",
      title: "Fase 7 — Pivoting: saltar a lo que no se ve",
      body:
        "Lo valioso casi nunca es la máquina expuesta: es lo que hay DETRÁS. Las bases, los backups, los controladores de dominio viven en segmentos internos que no se alcanzan desde afuera. PIVOTING es usar la máquina que ya comprometiste —que tiene un pie en tu red y otro en la interna— como trampolín para llegar ahí. En ÑANDE el ruteo es real: un host interno solo responde si hay una ruta hasta él, y esa ruta la abre el pivote. Comprometés server.nande (expuesto), y desde su visibilidad alcanzás caja.interna.nande, que desde Internet no existía.",
      diagram: "pivot",
      bullets: [
        "Lo valioso está detrás, en segmentos internos invisibles.",
        "El host comprometido (doble-homed) es tu trampolín.",
        "El ruteo es real: sin pivote, el interno no responde.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 7 — Pivotá a la red interna",
      body: "Comprometé el jump host server.nande y, desde su visibilidad, saltá a la caja interna para leer su bandera de root. Dos saltos encadenados.",
      command: "connect server.nande soporte Verano2024 && connect caja.interna.nande admin GiraSol#2024 && cat /root/flag.txt",
      explain:
        "Pivoteaste: capturaste ND{pivoting_red_interna}. Primero tomaste el jump host (server.nande) y desde ahí alcanzaste caja.interna.nande, que NO se veía desde afuera. Eso es moverse por la red: de un host tenés 'un host'; con el pivote, tenés 'la red'. (La credencial de la caja suele estar en el loot del jump host.)",
      diagram: "pivot",
    },
    {
      kind: "concept",
      title: "Fase 8 — Persistencia (y por qué es detectable)",
      body:
        "Un atacante que quiere volver instala PERSISTENCIA: una clave SSH suya en authorized_keys, una tarea cron que le reabre una shell, una cuenta nueva, un servicio. Es poderoso… y RUIDOSO: cada mecanismo de persistencia deja un artefacto que un defensor (o un DFIR) puede encontrar. En un pentest ético, la persistencia se documenta y se limpia; no se deja. Entender cómo se pone es entender qué busca el Blue Team: una clave que no debería estar, un cron raro, un usuario nuevo a medianoche.",
      diagram: "terminal",
      bullets: [
        "Persistencia: clave SSH, cron, cuenta o servicio para volver.",
        "Es poderosa pero deja artefactos: el DFIR los caza.",
        "En un pentest ético se documenta y se limpia, no se deja.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Conseguiste un shell como usuario común. ¿Cuál es el primer comando más útil para buscar el camino a root?",
      options: [
        "sudo -l (ver qué podés ejecutar como root sin contraseña)",
        "rm -rf / (borrar todo)",
        "shutdown now (apagar la máquina)",
        "ping google.com (probar internet)",
      ],
      correct: 0,
      explain:
        "`sudo -l` es lo primero que corre un pentester tras un foothold: lista qué comandos podés ejecutar como root. Una entrada NOPASSWD sobre un binario de GTFOBins (find, vim, awk…) suele ser el camino directo a root. Las otras opciones son destructivas, inútiles o irrelevantes para escalar.",
      diagram: "privesc",
    },
    {
      kind: "concept",
      title: "El entregable real: el reporte",
      body:
        "Esto es lo que separa un hacker ético de un vándalo: el REPORTE. Un pentest no termina en 'entré a root', termina en un informe que explica CÓMO entraste, QUÉ encontraste, qué tan GRAVE es cada hallazgo (severidad) y —lo más importante— CÓMO SE ARREGLA. Para esta máquina: credencial débil de devops (→ claves fuertes + MFA), sudo NOPASSWD sobre find (→ quitar ese sudo, mínimo privilegio), y segmentación floja que permitió el pivot (→ aislar la red interna). El valor de un pentest no es el acceso: es la lista de arreglos que deja.",
      diagram: "escudo",
      bullets: [
        "El pentest termina en un REPORTE, no en 'entré a root'.",
        "Cada hallazgo: cómo se explotó, severidad y cómo se arregla.",
        "El valor es la lista de remediaciones, no el acceso.",
      ],
    },
    {
      kind: "concept",
      title: "Cómo se rompe cada eslabón (defensa)",
      body:
        "Repasá la cadena desde el lado defensor, porque atacar enseña a defender: (1) el foothold cayó por una CLAVE DÉBIL → claves largas/únicas, MFA, bloqueo de fuerza bruta. (2) la escalada, por un SUDO MAL PUESTO → mínimo privilegio, nada de NOPASSWD sobre binarios peligrosos, auditar sudoers. (3) el pivot, por SEGMENTACIÓN FLOJA → aislar redes internas, firewall entre segmentos, monitoreo de movimiento lateral. Si CUALQUIERA de esos tres eslabones estuviera bien, la cadena se corta. La seguridad es una cadena: se rompe por el eslabón más débil.",
      diagram: "escudo",
      bullets: [
        "Foothold ← clave débil → claves fuertes + MFA + anti-bruteforce.",
        "Privesc ← sudo mal puesto → mínimo privilegio, auditar sudoers.",
        "Pivot ← segmentación floja → aislar redes + monitorear lateral.",
      ],
    },
    {
      kind: "lab",
      title: "Mirá la cadena que armaste (kill chain)",
      body: "Cerrá viendo tu ataque como lo ve un analista: la cadena de técnicas, en orden de kill chain. Es el mismo ataque, traducido al idioma del defensor.",
      command: "killchain",
      explain:
        "El tablero ordena tus técnicas por las fases del ciclo de vida de un ataque (acceso, escalada, movimiento lateral, impacto). Cada fase se encendió con una acción REAL que hiciste. Ver tu propio ataque así es lo que te vuelve mejor atacante Y mejor defensor: sabés qué huella dejás y dónde se te podría cortar.",
      diagram: "matrix",
    },
  ],
};

export const HACKING_REAL_COURSES: Curso[] = [
  HACK_MAQUINA,
];
