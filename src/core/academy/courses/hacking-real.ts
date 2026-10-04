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

const HACK_AD: Curso = {
  id: "c-hack-ad",
  title: "Dominio Active Directory: de cero a Domain Admin",
  subtitle: "Walkthrough completo: enumerás el dominio, roasteás una cuenta de servicio, crackeás su clave, saltás de máquina en máquina y te volvés dueño de NANDE.LOCAL. Cada paso, un comando real.",
  level: "avanzado",
  skill: "pentesting",
  hue: 275,
  glyph: "crown",
  reward: { xp: 560, coins: 450 },
  slides: [
    {
      kind: "concept",
      title: "Por qué el dominio es EL objetivo",
      body:
        "En una empresa Windows, todo gira alrededor de un DOMINIO gobernado por un Controlador de Dominio (DC). Usuarios, equipos, grupos y permisos forman un GRAFO de relaciones. Quien controla el grupo 'Domain Admins' controla TODO: cada máquina, cada cuenta, cada dato. Por eso, en un pentest interno, el objetivo casi siempre es el mismo: de un usuario cualquiera, llegar a Domain Admin. Y acá está la clave que lo hace posible: no hace falta la contraseña del administrador — alcanza con ENCADENAR permisos mal puestos a lo largo del grafo. En este curso vas a hacer exactamente eso, de punta a punta, contra NANDE.LOCAL.",
      diagram: "adgrafo",
      bullets: [
        "El DC gobierna el dominio; Domain Admins = control total.",
        "AD es un grafo de relaciones (MemberOf, AdminTo, HasSession…).",
        "No se adivina la clave del admin: se encadenan abusos.",
      ],
    },
    {
      kind: "concept",
      title: "El método: enumerar el grafo, encontrar la ruta",
      body:
        "Atacar AD es leer un mapa. Primero ENUMERÁS: volcás usuarios, grupos, equipos y marcás las cuentas interesantes (las que tienen SPN = kerberoasteables, las sin pre-auth = AS-REP roasteables). Después armás el GRAFO (con una herramienta tipo BloodHound) y le pedís la RUTA más corta desde lo que ya controlás hasta Domain Admins. Esa ruta es una secuencia de aristas abusables: 'crackeá esta cuenta de servicio → es admin de este servidor → ahí hay una sesión de un Domain Admin → robá su hash → sos dueño del dominio'. El grafo te dice el camino; vos lo caminás.",
      diagram: "adgrafo",
      bullets: [
        "Enumerar → marcar SPN y AS-REP → armar el grafo → pedir la ruta.",
        "La ruta es una cadena de aristas abusables.",
        "El grafo muestra el camino; vos lo ejecutás.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 1 — Enumerá el dominio",
      body: "Apuntá al dominio y volcá usuarios, grupos y equipos. Fijate qué cuentas quedan marcadas [SPN] (kerberoasteables) y [AS-REP].",
      command: "enum4linux NANDE.LOCAL",
      explain:
        "Ves el inventario REAL del dominio: usuarios, grupos y equipos, con las cuentas marcadas. SVC-SQL aparece con [SPN]: es una cuenta de SERVICIO, kerberoasteable. Ese es tu primer objetivo concreto. Enumerar primero, disparar después.",
      diagram: "adgrafo",
    },
    {
      kind: "lab",
      title: "Fase 1 — Mirá el grafo y la ruta a Domain Admins",
      body: "Armá el grafo del dominio y pedile la ruta más corta desde tu posición hasta Domain Admins. Ese es tu plan de ataque.",
      command: "nandeblood",
      explain:
        "NandeBlood (el BloodHound de ÑANDE) te dibuja el dominio como grafo y te marca la cadena de abusos hasta Domain Admins: SVC-SQL → DB01 → ADMIN-SQL. Cada flecha es un paso que vas a dar. Dejás de mirar cuentas sueltas y empezás a ver CAMINOS.",
      diagram: "adgrafo",
    },
    {
      kind: "concept",
      title: "Fase 2 — Kerberoasting: pedí el ticket y crackealo",
      body:
        "Las cuentas de servicio tienen un SPN, y Kerberos deja que CUALQUIER usuario del dominio pida un ticket (TGS) para ese servicio. Ese ticket viene cifrado con el hash de la clave de la cuenta de servicio. ¿La consecuencia? Pedís el ticket y te lo llevás para CRACKEARLO OFFLINE, a tu ritmo, sin tocar la cuenta ni disparar bloqueos. Funciona porque muchas cuentas de servicio tienen claves débiles y humanas ('Verano2024!'). Es sigiloso: pedir un TGS es una operación legítima; el crackeo ocurre en tu máquina.",
      diagram: "kerberos",
      bullets: [
        "Cuenta de servicio = SPN = cualquier usuario puede pedir su TGS.",
        "El TGS viaja cifrado con la clave de la cuenta → crackeable offline.",
        "Sigiloso: sin logins fallidos; la señal es el pico de eventos 4769.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 2 — Roasteá la cuenta de servicio",
      body: "Pedí el ticket (TGS) de SVC-SQL. Vas a recibir un hash $krb5tgs$ listo para crackear offline.",
      command: "kerberoast SVC-SQL@NANDE.LOCAL",
      explain:
        "Recibís el hash $krb5tgs$ de SVC-SQL, sin tocar su cuenta. Ese hash es la clave de la cuenta, cifrada: ahora hay que adivinarla offline. Pista del mundo real: las cuentas de servicio suelen tener claves de temporada (Estación+Año). Probemos 'Verano2024!'.",
      diagram: "kerberos",
    },
    {
      kind: "build",
      goal: "Crackear offline el TGS de SVC-SQL con una clave de temporada",
      pieces: ["crack-tgs", "SVC-SQL@NANDE.LOCAL", "Verano2024!", "hydra", "-l"],
      answer: ["crack-tgs", "SVC-SQL@NANDE.LOCAL", "Verano2024!"],
      hint: "crack-tgs <cuenta> <clave candidata>. La clave huele a estación + año.",
      explain:
        "`crack-tgs SVC-SQL@NANDE.LOCAL Verano2024!` prueba esa clave contra el hash del TGS. Si acierta, POSEÉS la cuenta de servicio de verdad: el grafo lo recalcula y aparecen sus permisos (AdminTo a DB01). Pasaste de 'un usuario cualquiera' a 'dueño de una cuenta de servicio'.",
    },
    {
      kind: "lab",
      title: "Fase 2 — Crackeá y poseé la cuenta",
      body: "Roasteá y crackeá en un solo tiro: pedí el TGS y probá la clave de temporada. Si acierta, la cuenta de servicio es tuya.",
      command: "kerberoast SVC-SQL@NANDE.LOCAL && crack-tgs SVC-SQL@NANDE.LOCAL Verano2024!",
      explain:
        "¡Clave crackeada! Ahora poseés SVC-SQL. El motor recalcula el grafo: SVC-SQL es AdminTo DB01, así que tu próximo salto es DB01. Esto es lo lindo de AD: cada cuenta que caés abre nuevas aristas en el grafo.",
      diagram: "kerberos",
    },
    {
      kind: "concept",
      title: "Fase 3 — Movimiento lateral: abusar AdminTo",
      body:
        "Ya tenés SVC-SQL, y el grafo dice que SVC-SQL es ADMINISTRADOR de DB01 (arista AdminTo). Movimiento lateral es usar ese permiso para 'saltar' a DB01: ahora controlás esa máquina. ¿Por qué importa DB01? Porque es donde el grafo detectó una HasSession de un Domain Admin — es decir, un administrador del dominio dejó una sesión abierta ahí, y con eso su hash está en la memoria de DB01, listo para que lo robes. El movimiento lateral no es azar: seguís las aristas que el grafo ya te marcó.",
      diagram: "adgrafo",
      bullets: [
        "SVC-SQL es AdminTo DB01 → saltás a DB01 (movimiento lateral).",
        "DB01 tiene una sesión de Domain Admin (HasSession).",
        "Seguís las aristas del grafo, no probás al azar.",
      ],
    },
    {
      kind: "concept",
      title: "Fase 4 — Pass-the-Hash: el hash ES la credencial",
      body:
        "Windows autentica con el HASH NT de la contraseña, no con la contraseña en texto. Si volcás el hash de una cuenta de la memoria de una máquina que controlás (con mimikatz, sekurlsa::logonpasswords), podés autenticarte COMO esa cuenta pasando el hash — sin conocer la clave. Eso es Pass-the-Hash. En DB01 vas a encontrar el hash de un Domain Admin (ADMIN-SQL) por esa sesión abierta. Reusás ese hash contra el DC y… caíste el dominio. Credencial robada de la RAM, nunca crackeada.",
      diagram: "pth",
      bullets: [
        "NTLM autentica con el hash, no con la clave en claro.",
        "mimikatz sekurlsa::logonpasswords vuelca hashes de sesiones.",
        "Con el hash de un DA, Pass-the-Hash = dominio comprometido.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 5 — El golpe final: de cero a Domain Admin",
      body: "Encadená TODO: enumerar → roastear → crackear → saltar a DB01 → volcar el hash del Domain Admin → Pass-the-Hash. Es el ataque completo, de un tiro.",
      command: "enum4linux NANDE.LOCAL && kerberoast SVC-SQL@NANDE.LOCAL && crack-tgs SVC-SQL@NANDE.LOCAL Verano2024! && abuse SVC-SQL@NANDE.LOCAL DB01@NANDE.LOCAL && mimikatz sekurlsa::logonpasswords && mimikatz \"sekurlsa::pth /user:ADMIN-SQL@NANDE.LOCAL\"",
      explain:
        "🏆 ¡DOMINIO COMPROMETIDO! Capturaste ND{dominio_comprometido}. Recorriste la cadena entera: un usuario cualquiera → cuenta de servicio (kerberoast+crack) → DB01 (lateral) → hash del Domain Admin (mimikatz) → Pass-the-Hash → dueño de NANDE.LOCAL. Nunca adivinaste la clave del admin: encadenaste permisos mal puestos. Así se cae un dominio real.",
      diagram: "pth",
    },
    {
      kind: "concept",
      title: "Fase 6 — Post-dominio: DCSync y Golden Ticket",
      body:
        "Ser Domain Admin no es el final: es el permiso para la PERSISTENCIA TOTAL. Con el derecho de replicación, pedís al DC que te 'replique' los secretos del dominio (DCSync) — incluido el hash de KRBTGT, la cuenta más importante de Kerberos. Con el hash de krbtgt forjás un GOLDEN TICKET: un TGT válido para cualquier cuenta, que sobrevive aunque reseteen todas las contraseñas. La ÚNICA cura real es rotar krbtgt DOS veces. Es el 'game over' definitivo de un dominio.",
      diagram: "dcsync",
      bullets: [
        "DCSync: replicás los secretos del DC (incluido krbtgt).",
        "Golden Ticket: TGT forjado que sobrevive resets de contraseña.",
        "Cura: rotar krbtgt DOS veces (el KDC honra la clave anterior).",
      ],
    },
    {
      kind: "lab",
      title: "Fase 6 — Replicá krbtgt (DCSync)",
      body: "Ya dueño del dominio, pedile al DC el secreto de la cuenta krbtgt. Es el material para forjar un Golden Ticket.",
      command: "mimikatz lsadump::dcsync /user:krbtgt",
      explain:
        "Replicaste el hash de krbtgt como si fueras otro DC (MITRE T1003.006). Con eso se forja un Golden Ticket: persistencia que sobrevive al reseteo de cuentas. Del lado defensor, un DCSync desde un host que no es DC es una alerta roja (evento 4662).",
      diagram: "dcsync",
    },
    {
      kind: "quiz",
      prompt: "En la cadena que hiciste, ¿cómo pasaste de 'usuario cualquiera' a comprometer el dominio?",
      options: [
        "Encadenando permisos mal puestos: kerberoast → crack → lateral (AdminTo) → robo de hash de un DA → Pass-the-Hash",
        "Adivinando la contraseña del administrador por fuerza bruta",
        "Apagando el controlador de dominio",
        "Reseteando todas las contraseñas del dominio",
      ],
      correct: 0,
      explain:
        "Nunca adivinaste la clave del admin. Seguiste la ruta del grafo: crackeaste una cuenta de servicio con clave débil, usaste su permiso AdminTo para saltar a DB01, robaste de la memoria el hash de un Domain Admin que había dejado sesión ahí, y lo reutilizaste (PtH). Permisos mal puestos encadenados: así se compromete AD.",
      diagram: "adgrafo",
    },
    {
      kind: "concept",
      title: "Cómo se rompe cada eslabón (defensa)",
      body:
        "Atacar AD enseña a defenderlo. (1) Kerberoasting cayó por una CLAVE DÉBIL de cuenta de servicio → usá gMSA (claves de 120+ caracteres, rotadas solas) y monitoreá el evento 4769. (2) El movimiento lateral, por una sesión de DA en un equipo común → TIERING (los Domain Admins no inician sesión en máquinas comunes) y Credential Guard (aísla los secretos de LSASS). (3) El robo de hash, por volcado de LSASS → Credential Guard + detección de volcado. (4) La persistencia (DCSync/Golden) → rotar krbtgt, minimizar quién tiene replicación, alertar el evento 4662. Cada eslabón bien puesto corta la cadena.",
      diagram: "escudo",
      bullets: [
        "Kerberoasting ← clave débil → gMSA + monitorear 4769.",
        "Lateral/robo de hash ← sesión de DA + LSASS → tiering + Credential Guard.",
        "Persistencia ← DCSync/Golden → rotar krbtgt + alertar 4662.",
      ],
    },
    {
      kind: "lab",
      title: "Mirá tu cadena de ataque (kill chain)",
      body: "Cerrá viendo tu ataque al dominio como lo ve el defensor: las técnicas ATT&CK en orden de kill chain.",
      command: "killchain",
      explain:
        "El tablero ordena tus técnicas por fase (acceso a credenciales, movimiento lateral, dominancia de dominio, persistencia). Cada una se encendió con una acción real que hiciste. Ver tu propio ataque a AD así te vuelve mejor atacante Y mejor defensor: sabés qué eventos dispara y dónde se te corta.",
      diagram: "matrix",
    },
  ],
};

export const HACKING_REAL_COURSES: Curso[] = [
  HACK_MAQUINA,
  HACK_AD,
];
