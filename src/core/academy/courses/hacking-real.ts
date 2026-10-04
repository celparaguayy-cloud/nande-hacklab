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

const HACK_WEB: Curso = {
  id: "c-hack-web",
  title: "Pentest web completo: de recon a la base de datos",
  subtitle: "Walkthrough real: mapeás un sitio, lo escaneás, burlás el login con SQLi, robás la base entera con UNION, y después barrés IDOR, traversal, command injection y XSS. Una bandera por falla.",
  level: "avanzado",
  skill: "web",
  hue: 275,
  glyph: "code",
  reward: { xp: 540, coins: 430 },
  slides: [
    {
      kind: "concept",
      title: "La mentalidad del pentest web",
      body:
        "Una web es una conversación entre tu navegador y un servidor, y casi toda vulnerabilidad web nace de lo mismo: el servidor CONFÍA en datos que vos controlás (la URL, un parámetro, un formulario, una cookie). El método del pentester web: (1) MAPEAR la superficie (qué rutas, qué parámetros, qué tecnología), (2) IDENTIFICAR dónde tu input toca algo sensible (una consulta SQL, un archivo, un comando, el HTML de otro usuario), (3) EXPLOTAR, (4) medir el IMPACTO, (5) REPORTAR con el arreglo. En este curso vas a recorrer el OWASP de verdad: entrás sin contraseña, robás la base, y seguís abriendo fallas, cada una con su bandera.",
      diagram: "inyeccion",
      bullets: [
        "Casi toda vuln web = el servidor confía en input que vos controlás.",
        "Mapear → identificar dónde tu input toca algo sensible → explotar.",
        "Vas a recorrer el OWASP Top 10 con labs reales.",
      ],
    },
    {
      kind: "concept",
      title: "Fase 1 — Mapear la superficie",
      body:
        "Antes de atacar, MAPEÁS el sitio: qué páginas existen, qué parámetros aceptan, qué tecnología corre. Muchas rutas no están enlazadas (un /admin, un /backup, un /api) pero existen: se descubren por FUERZA BRUTA de directorios con herramientas como gobuster o ffuf, que prueban miles de nombres comunes contra el servidor. Cada ruta nueva es superficie de ataque nueva. El mapeo paciente es lo que separa 'probé el login' de 'encontré el panel de admin olvidado'.",
      diagram: "directorios",
      bullets: [
        "Descubrí rutas no enlazadas (/admin, /backup, /api).",
        "gobuster/ffuf: fuerza bruta de directorios con diccionarios.",
        "Cada ruta nueva = superficie de ataque nueva.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 1 — Descubrí rutas ocultas",
      body: "Corré un descubrimiento de directorios contra banco.nande. Mirá qué rutas aparecen más allá de la portada.",
      command: "gobuster dir banco.nande",
      explain:
        "gobuster probó cientos de nombres y te devolvió las rutas que existen (login, movimientos, etc.). Ese es el mapa del sitio: cada ruta es un lugar donde probar. El /movimientos y el /login van a ser nuestros objetivos. Ahora, ¿cuáles son vulnerables? Pasemos al escaneo.",
      diagram: "directorios",
    },
    {
      kind: "lab",
      title: "Fase 2 — Escaneá vulnerabilidades",
      body: "Apuntá los scripts de vulnerabilidades de nmap contra el banco. Dejá que te señale dónde está el problema antes de tocar nada.",
      command: "nmap --script vuln banco.nande",
      explain:
        "El script http-sql-injection marca /login y /movimientos como posibles inyecciones SQL: reconocimiento que se convierte directo en plan de ataque. No explotó nada —te dio el mapa de dónde atacar—. Vamos por el login primero.",
      diagram: "escaneo",
    },
    {
      kind: "concept",
      title: "Fase 3 — SQL Injection: entrar sin la clave",
      body:
        "Cuando entrás tu usuario, el programa arma una consulta pegando tu texto: SELECT * FROM usuarios WHERE user='LO_QUE_ESCRIBAS' AND pass='...'. Si no separa tu texto de la orden, podés ROMPER la consulta y escribir una nueva: eso es SQL Injection. El payload clásico de bypass de login: admin' OR '1'='1 --. Cerrás la comilla, agregás una condición SIEMPRE verdadera (OR '1'='1'), y comentás el resto (--) para anular el chequeo de la contraseña. La base encuentra una fila y te deja pasar sin saber ninguna clave.",
      diagram: "inyeccion",
      bullets: [
        "Tu texto termina DENTRO de una consulta SQL.",
        "' OR '1'='1 = condición siempre verdadera; -- comenta el resto.",
        "Entrás sin conocer ninguna contraseña real.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 3 — Burlá el login con SQLi",
      body: "Mandá el payload de bypass al login del banco. Entrás al panel sin conocer la contraseña real.",
      command: "curl -X POST http://banco.nande/login -d \"usuario=admin' OR '1'='1 --&password=x\"",
      explain:
        "¡Adentro! Capturaste ND{sqli_login_bypass}. La condición '1'='1' hizo que la consulta encontrara una fila, y el -- anuló el chequeo de la clave. Entraste como admin sin saber nada. Pero entrar es solo el principio: la misma falla permite ROBAR la base entera.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "Fase 4 — UNION: robar la base entera",
      body:
        "El bypass te deja entrar; UNION te deja EXTRAER. Si una consulta devuelve resultados en la página (como un buscador), podés agregar 'UNION SELECT ...' para pegar los resultados de OTRA consulta tuya a los del sitio. Así traés datos de cualquier tabla: UNION SELECT id,usuario,password,rol FROM usuarios te vuelca TODOS los usuarios y sus contraseñas en la misma lista de resultados. La clave técnica: tu UNION tiene que tener la MISMA cantidad de columnas que la consulta original (acá, 4). SQLi de bypass abre la puerta; SQLi UNION se lleva el botín.",
      diagram: "inyeccion",
      bullets: [
        "UNION SELECT pega TU consulta a la del sitio.",
        "Traés datos de cualquier tabla (usuarios, contraseñas).",
        "Tu UNION debe tener la misma cantidad de columnas (acá, 4).",
      ],
    },
    {
      kind: "build",
      goal: "Volcar la tabla de usuarios del banco con una inyección UNION de 4 columnas",
      pieces: ["UNION", "SELECT", "id,usuario,password,rol", "FROM", "usuarios--", "DROP TABLE"],
      answer: ["UNION", "SELECT", "id,usuario,password,rol", "FROM", "usuarios--"],
      hint: "UNION SELECT <columnas> FROM <tabla>--. La cantidad de columnas (4) tiene que coincidir con la consulta original.",
      explain:
        "`' UNION SELECT id,usuario,password,rol FROM usuarios--` pega a los resultados del buscador una fila por cada usuario de la tabla, con su contraseña. El -- comenta lo que sigue. Nada de DROP TABLE: un pentester extrae y reporta, no destruye.",
    },
    {
      kind: "lab",
      title: "Fase 4 — Volcá la base con UNION",
      body: "Logueate con el bypass y después inyectá el UNION en el buscador de movimientos para traer todos los usuarios y contraseñas. Dos pasos encadenados.",
      command: "curl -X POST http://banco.nande/login -d \"usuario=admin' -- &password=x\" && curl \"http://banco.nande/movimientos?q=a%' UNION SELECT id,usuario,password,rol FROM usuarios--\"",
      explain:
        "¡Base volcada! Capturaste ND{sqli_union_dump}: todos los usuarios y sus contraseñas aparecieron en la lista de movimientos. Eso es una brecha total de datos con una sola consulta. En la vida real, esas contraseñas (si están hasheadas débiles) caen después en hashcat.",
      diagram: "inyeccion",
    },
    {
      kind: "lab",
      title: "Fase 4 — Automatizá con sqlmap",
      body: "Lo mismo que hiciste a mano, sqlmap lo automatiza: detecta la inyección y vuelca la base. Útil para confirmar y acelerar.",
      command: "sqlmap -u \"http://banco.nande/movimientos?q=a\" --dump",
      explain:
        "sqlmap detectó la inyección en el parámetro q y volcó la tabla automáticamente (otra vez ND{sqli_union_dump}). En un pentest real, sqlmap confirma y acelera, pero entender el UNION a mano es lo que te deja explotar casos raros que la herramienta no resuelve sola. Herramienta + criterio.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "Fase 5 — No todo es SQLi: ampliar la superficie",
      body:
        "Una web mal hecha rara vez tiene UNA sola falla. El OWASP Top 10 lista las categorías más comunes, y un buen pentester las barre todas: control de acceso roto (IDOR), lectura de archivos (traversal/LFI), inyección de comandos del sistema, XSS (código en el navegador de otros), SSRF, deserialización, mala config… En las próximas fases vas a abrir cuatro fallas MÁS, cada una en una app distinta del mundo ÑANDE, cada una con su bandera. La idea: un pentest no termina en la primera vuln; termina cuando mapeaste TODA la superficie.",
      diagram: "escudo",
      bullets: [
        "Una web mal hecha tiene varias fallas, no una.",
        "Barré el OWASP Top 10: acceso, archivos, comandos, XSS, SSRF…",
        "El pentest termina al mapear TODA la superficie, no en la primera vuln.",
      ],
    },
    {
      kind: "concept",
      title: "IDOR: control de acceso roto",
      body:
        "IDOR (Insecure Direct Object Reference) es el rey del 'control de acceso roto'. Pasa cuando un recurso se pide por un identificador que vos controlás (?id=7) y el servidor NO verifica que ese recurso sea TUYO. Cambiás el número y ves lo ajeno: el álbum de otra persona, la factura de otro cliente, el pedido de otro usuario. No hay 'exploit' sofisticado: cambiás un dígito. Es una de las fallas más comunes y más dañinas, justamente porque parece inofensiva.",
      diagram: "idor",
      bullets: [
        "?id=7 → el recurso se pide por un número que controlás.",
        "El servidor no chequea que el recurso sea TUYO.",
        "Cambiás el número y ves datos ajenos. Simple y grave.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 5a — Accedé a lo ajeno (IDOR)",
      body: "En fotos.arandu.nande cada álbum se pide con ?id=. Pedí un álbum que no es tuyo cambiando el número.",
      command: "curl http://fotos.arandu.nande/album?id=7",
      explain:
        "Capturaste ND{idor_album_ajeno}: accediste a un álbum privado que no es tuyo, solo cambiando el id. El servidor nunca verificó de quién era. La defensa es trivial de decir y común de olvidar: comprobá SIEMPRE que el recurso pedido pertenezca al usuario autenticado.",
      diagram: "idor",
    },
    {
      kind: "concept",
      title: "Path traversal: escapar de la carpeta",
      body:
        "Cuando una app sirve archivos por nombre (?archivo=reporte.pdf), si no confina la ruta, podés usar ../ para SUBIR de carpeta y leer archivos del servidor que no deberías: configs con credenciales, /etc/passwd, código fuente. Es el primo del LFI. '../' sube un nivel; encadenás varios para llegar a donde quieras. La causa raíz es la misma de siempre: el servidor construye una ruta de archivo con input del usuario sin validarlo.",
      diagram: "traversal",
      bullets: [
        "../ sube de carpeta; encadenás para salir de lo permitido.",
        "Objetivo: configs con secretos, /etc/passwd, código.",
        "Causa: ruta de archivo construida con input sin validar.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 5b — Leé archivos del servidor (traversal)",
      body: "El visor de docs.tape.nande recibe un nombre de archivo. Escapá de su carpeta con ../ y leé un secreto del servidor.",
      command: "curl \"http://docs.tape.nande/ver?archivo=../config/secrets.env\"",
      explain:
        "Capturaste ND{path_traversal_secreto}: leíste la config con secretos saliendo de la carpeta permitida con ../. La defensa: canonicalizar la ruta y verificar que quede DENTRO del directorio permitido, o servir por una lista blanca de archivos, nunca por nombre libre.",
      diagram: "traversal",
    },
    {
      kind: "concept",
      title: "Command injection: tu texto se ejecuta",
      body:
        "A veces una web pasa tu input a un COMANDO del sistema (una herramienta de ping, un conversor, un backup). Si no lo sanitiza, colás tu propio comando: el ';' separa comandos en Linux, así que 'x; cat flag' ejecuta el ping Y tu cat. Es de las fallas más graves porque te da ejecución de código en el servidor directamente. Variantes del separador: ; | && `` $(). La defensa real: no armar comandos con input del usuario; usar APIs que reciban argumentos por separado, nunca una cadena de shell.",
      diagram: "cmdi",
      bullets: [
        "Tu input se mete en un comando del sistema.",
        "; | && $() separan/encadenan comandos: colás el tuyo.",
        "Da ejecución en el servidor: de las más graves.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 5c — Ejecutá un comando en el servidor (cmdi)",
      body: "La herramienta de ping de tools.pyta.nande arma un comando con lo que escribís. Colá tu propio comando con ';'.",
      command: "curl \"http://tools.pyta.nande/ping?host=x; cat flag\"",
      explain:
        "Capturaste ND{cmd_injection_pwned}: el ';' encadenó tu 'cat flag' al ping, y el servidor lo ejecutó. Eso es ejecución de comandos en el servidor — el peor caso de una web. La defensa: jamás construir comandos con input del usuario; usar llamadas con argumentos parametrizados.",
      diagram: "cmdi",
    },
    {
      kind: "concept",
      title: "XSS: código en el navegador de la víctima",
      body:
        "A diferencia de las anteriores, el XSS ataca a OTROS USUARIOS, no al servidor. Si una web refleja tu input en la página sin limpiarlo, podés inyectar <script>…</script> y ese código se ejecuta en el navegador de quien vea la página: robar su cookie de sesión, hacer acciones en su nombre, redirigirlo. Hay reflejado (en la respuesta inmediata), almacenado (guardado y servido a todos) y basado en DOM. La defensa: codificar la salida (output encoding) según el contexto y una CSP (Content-Security-Policy) que limite qué scripts corren.",
      diagram: "xss",
      bullets: [
        "XSS ataca a otros usuarios, no al servidor.",
        "Tu <script> corre en el navegador de la víctima (roba cookies…).",
        "Reflejado / almacenado / DOM. Defensa: output encoding + CSP.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 5d — Inyectá un script (XSS)",
      body: "El buscador de blog.yvoty.nande refleja lo que escribís sin limpiarlo. Hacé que ejecute tu script.",
      command: "curl \"http://blog.yvoty.nande/buscar?q=<script>alert(1)</script>\"",
      explain:
        "Capturaste ND{xss_reflejado}: tu <script> se reflejó sin escapar y se ejecutaría en el navegador de cualquiera que abriera ese enlace. Con un payload real, en vez de alert(1) robarías la cookie de sesión. La defensa: codificar la salida y una CSP estricta.",
      diagram: "xss",
    },
    {
      kind: "quiz",
      prompt: "¿Cuál es la causa raíz COMÚN de SQLi, command injection y XSS?",
      options: [
        "El servidor mezcla datos del usuario con código/consultas/HTML sin separarlos ni sanitizarlos",
        "Contraseñas débiles",
        "Falta de HTTPS",
        "Servidores desactualizados",
      ],
      correct: 0,
      explain:
        "Las tres son INYECCIONES: el input del usuario termina interpretado como código (SQL, comando de shell, HTML/JS) porque no se separó el dato de la instrucción. La cura es la misma familia: consultas parametrizadas (SQLi), APIs con argumentos (cmdi), output encoding + CSP (XSS). El dato del usuario nunca debe volverse instrucción.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "El reporte y la defensa",
      body:
        "Cerrás el pentest con el REPORTE: cada hallazgo, su severidad y su arreglo. Para este sitio: SQLi (crítico) → consultas preparadas (parametrizadas), que separan el dato de la orden. IDOR (alto) → verificar ownership en cada acceso. Traversal (alto) → confinar rutas / lista blanca. Command injection (crítico) → no armar comandos con input; APIs parametrizadas. XSS (medio/alto) → output encoding + CSP. Y transversal: validación de entrada, mínimo privilegio de la cuenta de la base, y un WAF como capa extra (no como única defensa). El valor del pentest es esta lista de arreglos, priorizada.",
      diagram: "escudo",
      bullets: [
        "SQLi/cmdi → separar dato de instrucción (parametrizar).",
        "IDOR → verificar ownership; traversal → confinar/lista blanca.",
        "XSS → output encoding + CSP; WAF como capa extra, no única.",
      ],
    },
  ],
};

const HACK_CLOUD: Curso = {
  id: "c-hack-cloud",
  title: "Cloud y CI/CD: hackeo del pipeline de despliegue",
  subtitle: "Walkthrough real contra Yvytu Cloud: entrás al runner de CI, escalás a root por sudo GTFOBins, saqueás los secretos del pipeline y pivotás al repositorio de artefactos interno. Con casos reales (SolarWinds, Codecov, CircleCI).",
  level: "avanzado",
  skill: "pentesting",
  hue: 205,
  glyph: "target",
  reward: { xp: 560, coins: 450 },
  slides: [
    {
      kind: "concept",
      title: "El pipeline de CI/CD es la joya de la corona",
      body:
        "Un pipeline de CI/CD construye tu código y lo despliega a producción. Para eso, el RUNNER (la máquina que corre los jobs) tiene credenciales potentísimas: claves de la nube, tokens del registry, acceso a producción, secretos de firma. Comprometer el runner no es 'hackear una máquina más': es conseguir las llaves de TODO lo que ese pipeline toca, y —peor— la capacidad de inyectar código en lo que se distribuye. Por eso el CI/CD es uno de los objetivos más codiciados del atacante moderno: es un MULTIPLICADOR. En este curso vas a comprometer el runner de Yvytu Cloud de punta a punta.",
      diagram: "supplychain",
      bullets: [
        "El runner guarda credenciales a la nube y a producción.",
        "Comprometerlo = las llaves de todo + inyectar en lo que se distribuye.",
        "El CI/CD es un multiplicador: un host, acceso a todo.",
      ],
    },
    {
      kind: "concept",
      title: "Casos reales: por qué esto importa tanto",
      body:
        "No es teoría. SOLARWINDS (2020): atacantes comprometieron el BUILD de Orion e inyectaron el backdoor SUNBURST en actualizaciones FIRMADAS; se distribuyó a ~18.000 organizaciones. CODECOV (2021): por un error en la creación de su imagen Docker se filtró una clave; los atacantes modificaron el 'Bash Uploader' para que EXFILTRARA las variables de entorno (tokens, claves, credenciales) de los pipelines de sus clientes a un servidor externo — meses sin detectar. CIRCLECI (enero 2023): un malware en la laptop de un ingeniero robó una cookie de sesión SSO (¡saltándose el 2FA!), con la que accedieron a los secretos de clientes; CircleCI tuvo que rotar TODOS los tokens. Patrón: el CI es objetivo de alto valor, y su compromiso se propaga.",
      diagram: "supplychain",
      bullets: [
        "SolarWinds (2020): backdoor en el build firmado → ~18.000 orgs.",
        "Codecov (2021): el uploader modificado exfiltró env vars de los CI.",
        "CircleCI (2023): cookie de sesión robada (bypass 2FA) → secretos.",
      ],
    },
    {
      kind: "concept",
      title: "La cadena: del runner expuesto al repo interno",
      body:
        "El plan contra Yvytu: (1) RECON del runner expuesto (deploy.yvytu.nande). (2) FOOTHOLD por un usuario de servicio 'ci' con clave débil. (3) PRIVESC a root abusando un sudo mal puesto (GTFOBins). (4) LOOT: los secretos del pipeline (credenciales a prod y al repositorio de artefactos). (5) PIVOT al repositorio de artefactos interno, que SOLO se alcanza desde el runner. Es la cadena clásica de un ataque a CI/CD: la máquina de build es el pie adentro, y desde sus secretos saltás a todo lo que el pipeline toca. Vamos paso a paso, con bandera en cada hito.",
      diagram: "cloud",
      bullets: [
        "Recon → foothold (ci) → root (GTFOBins) → loot → pivot al repo.",
        "El runner es el pie adentro; sus secretos, el salto a todo.",
        "Una bandera real por cada fase.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 1 — Recon del runner",
      body: "Escaneá el runner de despliegue de Yvytu. Mirá qué servicios expone antes de intentar entrar.",
      command: "nmap -sV deploy.yvytu.nande",
      explain:
        "Ves los servicios del runner (SSH abierto, entre otros). Un runner de CI expuesto a Internet con SSH es ya un hallazgo: no debería ser alcanzable así. El vector: un usuario de servicio con clave débil. El usuario 'ci' es el sospechoso natural.",
      diagram: "escaneo",
    },
    {
      kind: "concept",
      title: "Fase 2 — Foothold: el usuario de servicio",
      body:
        "Los pipelines corren con USUARIOS DE SERVICIO (ci, deploy, runner, jenkins…). Son cuentas automáticas, y por eso a menudo tienen claves débiles 'temporales' que nadie rotó, o la misma clave en muchos lados. El usuario 'ci' de Yvytu dejó una clave de temporada (Deploy2024). Entrar como ese usuario te pone DENTRO del runner, con acceso a todo lo que el pipeline usa en ejecución — exactamente la superficie que Codecov expuso al mundo cuando su uploader filtró las env vars.",
      diagram: "terminal",
      bullets: [
        "Pipelines corren con usuarios de servicio (ci/deploy/runner).",
        "Cuentas automáticas → claves débiles o reutilizadas sin rotar.",
        "Dentro del runner, accedés a lo que el pipeline usa en ejecución.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 2 — Entrá como el usuario ci (bandera de usuario)",
      body: "Logueate al runner como ci con su clave débil y llevate la bandera de usuario.",
      command: "connect deploy.yvytu.nande ci Deploy2024 && cat /home/ci/user.txt",
      explain:
        "¡Adentro del runner! Capturaste ND{yvytu_foothold}. Sos el usuario ci: ya podés ver scripts del pipeline, variables de entorno y configs. Pero ci no es root. Para los secretos más jugosos (y el salto al repo interno), hay que escalar.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Fase 3 — Privesc: sudo awk (GTFOBins)",
      body:
        "Corrés `sudo -l` y encontrás que ci puede ejecutar `awk` como root SIN contraseña (NOPASSWD) — una mala config típica, puesta para un script viejo de parseo de logs. ¿Por qué awk escala? Porque awk puede EJECUTAR comandos del sistema con BEGIN{system(...)}. Si lo corrés con sudo, ese comando corre como ROOT: `sudo awk 'BEGIN{system(\"/bin/sh\")}'` te deja caer en una shell de root. Es GTFOBins en acción (awk es uno de los clásicos). Lección de defensa: nada de sudo NOPASSWD sobre binarios que ejecutan comandos (awk, find, vim, tar, python…).",
      diagram: "privesc",
      bullets: [
        "sudo -l revela: ci puede correr awk como root sin clave.",
        "awk BEGIN{system(...)} ejecuta comandos → con sudo, como root.",
        "GTFOBins: awk/find/vim/tar/python escapan a shell con sudo.",
      ],
    },
    {
      kind: "build",
      goal: "Abrir una shell de root abusando el sudo NOPASSWD sobre awk",
      pieces: ["sudo", "awk", "'BEGIN{system(\"/bin/sh\")}'", "cat", "--version"],
      answer: ["sudo", "awk", "'BEGIN{system(\"/bin/sh\")}'"],
      hint: "awk ejecuta comandos con BEGIN{system(\"...\")}. Con sudo, ese system corre como root.",
      explain:
        "`sudo awk 'BEGIN{system(\"/bin/sh\")}'` hace que awk, corriendo como root, lance una shell /bin/sh — que hereda el privilegio de root. Una línea, y pasaste de ci a root. Así de fino es el borde entre 'un sudo de conveniencia' y 'comprometieron el runner entero'.",
    },
    {
      kind: "lab",
      title: "Fase 3 — Escalá a root",
      body: "Abusá el sudo awk para abrir una shell de root y leé la bandera de root del runner.",
      command: "connect deploy.yvytu.nande ci Deploy2024 && sudo awk 'BEGIN{system(\"/bin/sh\")}' && cat /root/flag.txt",
      explain:
        "¡ROOT en el runner! Capturaste ND{yvytu_root}. Ahora controlás la máquina de build por completo: todos los secretos del pipeline, las claves de despliegue, los tokens. Este es el punto donde un atacante real podría inyectar código en lo que se compila y distribuye (como SUNBURST en SolarWinds). Nosotros vamos por el loot y el pivot.",
      diagram: "privesc",
    },
    {
      kind: "concept",
      title: "Fase 4 — Loot: los secretos del pipeline",
      body:
        "Ser root en un runner es tener su cofre de secretos. Un pipeline guarda credenciales en variables de entorno, en archivos .env, en el config del propio CI. Acá, /root/deploy.env tiene el host y la credencial del REPOSITORIO DE ARTEFACTOS interno. Esto es EXACTAMENTE lo que el ataque a Codecov cosechó a escala: las env vars con tokens y claves que los pipelines usan en ejecución. Regla del atacante en CI: el loot no son archivos cualquiera, son las LLAVES a los otros sistemas que el pipeline toca.",
      diagram: "cloud",
      bullets: [
        "Root en el runner = su cofre de secretos (env, .env, config del CI).",
        "/root/deploy.env tiene la credencial del repo de artefactos interno.",
        "Es lo que Codecov expuso: las env vars con tokens/claves del CI.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 4 — Saqueá las credenciales del despliegue",
      body: "Ya root, leé el archivo de entorno del pipeline. Ahí está la llave al repositorio de artefactos interno.",
      command: "connect deploy.yvytu.nande ci Deploy2024 && sudo awk 'BEGIN{system(\"/bin/sh\")}' && cat /root/deploy.env",
      explain:
        "Leíste /root/deploy.env: aparece el host (artefactos.yvytu.nande) y la credencial del deployer (Art3f@cts!2024). Ese repo interno NO se ve desde Internet — solo desde el runner. El loot de una máquina es el foothold de la siguiente: tenemos la llave y el pivote.",
      diagram: "archivo",
    },
    {
      kind: "concept",
      title: "Fase 5 — Pivot: el repositorio de artefactos interno",
      body:
        "El botín de producción —los artefactos que se despliegan, las imágenes, los paquetes firmados— vive en un repositorio INTERNO que solo se alcanza desde la infraestructura de CI. Con la credencial robada del deploy.env, pivotás desde el runner comprometido hasta ese repo. Comprometerlo es el impacto máximo de un ataque a la cadena de suministro: quien controla el repo de artefactos puede reemplazar lo que se distribuye a TODOS los que confían en él. Es el paso que, en el mundo real, convierte 'hackeé un runner' en 'infecté a miles' (SolarWinds).",
      diagram: "pivot",
      bullets: [
        "El repo de artefactos interno solo se alcanza desde el CI.",
        "Con la credencial robada, pivotás del runner al repo.",
        "Controlar el repo = reemplazar lo que se distribuye a todos.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 5 — Exfiltrá del repositorio interno (cadena completa)",
      body: "Encadená todo: entrás al runner, escalás a root, robás la credencial del deploy.env, pivotás al repo de artefactos y te llevás su bandera.",
      command: "connect deploy.yvytu.nande ci Deploy2024 && sudo awk 'BEGIN{system(\"/bin/sh\")}' && cat /root/deploy.env && connect artefactos.yvytu.nande deployer Art3f@cts!2024 && cat /root/flag.txt",
      explain:
        "🏆 ¡Cadena cloud completa! Capturaste ND{yvytu_exfil}. Recorriste: runner expuesto → foothold (ci) → root (sudo awk) → secretos del pipeline → pivot al repo de artefactos interno. Un solo usuario de servicio con clave débil terminó en control de la cadena de distribución. Así se ve, paso a paso, un ataque a la supply chain.",
      diagram: "pivot",
    },
    {
      kind: "concept",
      title: "Las técnicas que amplían esto: PPE y dependency confusion",
      body:
        "Dos técnicas modernas que todo pentester de CI/CD conoce. POISONED PIPELINE EXECUTION (PPE): metés comandos en algo que el pipeline EJECUTA (un script del repo, un paso que corre código de un pull request), y el runner los corre con SUS privilegios — sin necesitar credenciales. DEPENDENCY CONFUSION (Alex Birsan, 2021): publicás en un registry PÚBLICO un paquete con el MISMO nombre que uno interno y una versión más alta; el gestor de dependencias se traga el público por error y ejecutás código en el build. Birsan entró así a Apple, Microsoft y decenas más. El denominador común con lo que hiciste: el pipeline confía en entradas que no controla.",
      diagram: "supplychain",
      bullets: [
        "PPE: colás comandos en algo que el pipeline ejecuta (sin credenciales).",
        "Dependency confusion: un paquete público pisa al interno (Birsan 2021).",
        "Raíz: el pipeline confía en entradas que no controla.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué comprometer el runner de CI/CD es tan grave comparado con hackear un servidor cualquiera?",
      options: [
        "Porque tiene credenciales a producción y distribuye artefactos: su compromiso se propaga a todos los que confían en el pipeline",
        "Porque los runners no tienen logs",
        "Porque siempre corren como invitado",
        "No es más grave, es un servidor más",
      ],
      correct: 0,
      explain:
        "El CI/CD concentra confianza y privilegios: firma y reparte software, y guarda las llaves de producción. Comprometerlo convierte un solo acceso en acceso a TODO lo aguas abajo (clientes, otros equipos), justo como SolarWinds y Codecov. Es el apalancamiento que lo vuelve tan codiciado.",
      diagram: "supplychain",
    },
    {
      kind: "concept",
      title: "Cómo se rompe cada eslabón (defensa)",
      body:
        "Atacar el pipeline enseña a blindarlo. (1) Foothold ← usuario de servicio con clave débil → credenciales EFÍMERAS por OIDC en vez de secretos de larga vida, y nada de usuarios con SSH expuesto. (2) Privesc ← sudo NOPASSWD sobre awk → mínimo privilegio, auditar sudoers, runners sin sudo. (3) Loot ← secretos en el runner → gestor de secretos (Vault) con acceso efímero, no .env en disco. (4) Supply chain ← confianza ciega → firmar y verificar artefactos (Sigstore/cosign), SLSA para procedencia, runners EFÍMEROS (uno limpio por job), pin de dependencias por hash. Y la lección de CircleCI: los tokens de sesión se roban y saltan el 2FA — rotá secretos, acortá su vida, monitoreá el uso.",
      diagram: "escudo",
      bullets: [
        "OIDC efímero + nada de SSH expuesto; mínimo privilegio (sin sudo awk).",
        "Secretos en Vault (efímeros), no .env en el runner.",
        "Firmar artefactos (cosign) + SLSA + runners efímeros + pin por hash.",
      ],
    },
    {
      kind: "lab",
      title: "Mirá tu cadena de ataque (kill chain)",
      body: "Cerrá viendo tu ataque al CI/CD como lo ve el defensor: las técnicas en orden de kill chain.",
      command: "killchain",
      explain:
        "El tablero ordena tus técnicas por fase (acceso inicial, escalada, colección de credenciales, movimiento lateral, impacto). Cada una salió de una acción real. Ver tu ataque a la supply chain así te muestra el patrón que comparten SolarWinds, Codecov y CircleCI — y dónde cada defensa lo habría cortado.",
      diagram: "matrix",
    },
  ],
};

const HACK_OT: Curso = {
  id: "c-hack-ot",
  title: "Hackeo de una planta industrial (OT): de IT al daño físico",
  subtitle: "Walkthrough completo y real: saltás de la red corporativa (IT) a la industrial (OT) por el historian puenteado, tomás la HMI y el PLC, y manipulás Modbus hasta deshabilitar la seguridad y provocar una rotura catastrófica — el ataque estilo TRITON, paso a paso, 100% dentro del sandbox.",
  level: "avanzado",
  skill: "pentesting",
  hue: 25,
  glyph: "flame",
  reward: { xp: 650, coins: 520 },
  slides: [
    {
      kind: "concept",
      title: "IT no es OT: acá los bits mueven cosas físicas",
      body:
        "En IT (tu red de oficina) un ataque roba datos, cifra discos, tira servicios. En OT (Operational Technology: la red que gobierna una PLANTA — bombas, válvulas, turbinas, hornos) un ataque mueve el mundo físico: abre un interruptor y una ciudad se queda sin luz; sube una presión y una vasija revienta. Por eso la OT es el nivel más profundo y más peligroso de una red. Las prioridades se INVIERTEN: en IT la tríada es Confidencialidad → Integridad → Disponibilidad; en OT es al revés — SEGURIDAD y DISPONIBILIDAD mandan, porque un paro de planta cuesta millones y un accidente cuesta vidas. En este curso vas a recorrer, de punta a punta, cómo un atacante salta de IT a OT y llega al proceso físico de una planta real del sandbox (plc.planta.nande), capturando una bandera en cada hito.",
      diagram: "ics",
      bullets: [
        "IT: roba datos. OT: mueve el mundo físico (bombas, válvulas, red eléctrica).",
        "La tríada se invierte: en OT mandan SEGURIDAD y disponibilidad, no confidencialidad.",
        "Equipos legados, protocolos de los 70 sin autenticar, parches casi imposibles.",
      ],
    },
    {
      kind: "concept",
      title: "El modelo de Purdue y el puente que todos odian: el historian",
      body:
        "Las plantas se diseñan en CAPAS (modelo de Purdue): Nivel 4/5 es IT corporativo; Nivel 3 es operaciones de sitio (donde vive el HISTORIAN, que levanta datos de proceso); Niveles 2-0 son el control real (HMI, PLC, sensores y actuadores). Entre IT y OT va una DMZ industrial. La regla sagrada: IT y OT NO deben tocarse. Pero SIEMPRE hay un puente — y casi siempre es el historian, porque el negocio quiere ver la producción en sus tableros. Ese historian doble-homed (una pata en IT, otra en OT) es el agujero por el que entra el atacante. En ÑANDE, el historian es `db-core.interna.nande`: lo alcanzás pivotando por la red corporativa, y desde él llegás a la red de planta (10.10.77.0/24). La red completa: Internet → DMZ (server) → Corporativa (10.10.66) → BD restringida (10.10.99 / historian) → OT (10.10.77).",
      diagram: "ics",
      bullets: [
        "Purdue: IT (N4/5) · DMZ industrial · operaciones+historian (N3) · control HMI/PLC (N2-0).",
        "La regla: IT y OT no se tocan. La realidad: el historian las puentea.",
        "db-core = historian doble-homed: tu puerta de IT a OT.",
      ],
    },
    {
      kind: "concept",
      title: "Fase 1 — Reconocer el camino: de IT a la planta",
      body:
        "No se llega al PLC de un salto: hay que ATRAVESAR la red, host por host, como en una máquina real segmentada. El reconocimiento acá es de RUTA: ¿qué host puentea a qué segmento? La herramienta `netmap` (correla desde adentro de cada host) y `route <destino>` te dibujan la cadena de pivotes y te dicen qué falta comprometer para alcanzar el objetivo. El camino a la planta: entrás a la DMZ (`server.nande`, credencial de soporte), saltás a la corporativa (`nas.interna.nande`), y de ahí al segmento restringido donde vive el historian (`db-core.interna.nande`). Recién desde el historian ves la red de planta. Correr `route plc.planta.nande` desde tu equipo te lo confirma: 'no hay ruta — pivoteá hasta la OT primero'.",
      diagram: "pivot",
      bullets: [
        "El recon OT es de RUTA: qué host puentea qué segmento.",
        "netmap (desde cada host) y route <destino> dibujan la cadena de pivotes.",
        "Camino: server (DMZ) → nas (corp) → db-core (historian/OT).",
      ],
    },
    {
      kind: "build",
      goal: "Encadenar el pivote IT→OT: de la DMZ (server) a la corporativa (nas) y hasta el historian (db-core), que puentea a la red de planta",
      pieces: [
        "connect", "server.nande", "soporte", "Verano2024", "&&",
        "connect", "nas.interna.nande", "respaldo", "NasÑande#2024", "&&",
        "connect", "db-core.interna.nande", "dbadmin", "Core-DB!2024", "nmap",
      ],
      answer: [
        "connect", "server.nande", "soporte", "Verano2024", "&&",
        "connect", "nas.interna.nande", "respaldo", "NasÑande#2024", "&&",
        "connect", "db-core.interna.nande", "dbadmin", "Core-DB!2024",
      ],
      hint: "Tres saltos encadenados con &&: server (DMZ) → nas (corporativa) → db-core (historian). Cada connect mantiene la sesión para el siguiente.",
      explain:
        "Cada `connect <host> <user> <pass>` abre una sesión y, encadenado con &&, el siguiente salta DESDE ese host (así alcanzás segmentos que no ves desde tu equipo). Al llegar a db-core estás parado en el historian: el único host puenteado a la red de planta. Desde acá, la OT es alcanzable.",
    },
    {
      kind: "lab",
      title: "Fase 2 — Pivotá hasta el historian (el puente IT→OT)",
      body: "Atravesá los tres saltos hasta db-core.interna.nande. Es el historian doble-homed: tu cabeza de playa en la frontera IT/OT.",
      command: "connect server.nande soporte Verano2024 && connect nas.interna.nande respaldo NasÑande#2024 && connect db-core.interna.nande dbadmin Core-DB!2024",
      explain:
        "Estás parado en el historian (db-core), en el segmento restringido 10.10.99.0/24. Desde acá —y SÓLO desde acá— la red de planta (10.10.77.0/24) es alcanzable. Fijate que no entraste 'hackeando el PLC': llegaste caminando la red, que es como pasa de verdad. Próximo paso: leer la config del puente para encontrar las credenciales de la planta.",
      diagram: "pivot",
    },
    {
      kind: "lab",
      title: "Saqueo del puente: la config filtra las credenciales de la planta",
      body: "Ya en el historian, leé la configuración del enlace OT. Un historian doble-homed guarda cómo habla con la planta — y ahí suelen quedar credenciales en texto plano.",
      command: "connect server.nande soporte Verano2024 && connect nas.interna.nande respaldo NasÑande#2024 && connect db-core.interna.nande dbadmin Core-DB!2024 && cat /etc/historian/ot-uplink.conf",
      explain:
        "El `ot-uplink.conf` canta: el segmento de planta (10.10.77.0/24), el host de la HMI (hmi.planta.nande) y la credencial del operador (operador / Planta#2024) en texto plano. Esto es movimiento lateral REAL: no adivinaste la clave, la leíste de una config mal protegida. Una auditoría marcaría exactamente esto: 'IT y OT no deberían compartir host — esto es un puente'.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Fase 3 — Modbus: el protocolo que nació sin contraseña",
      body:
        "Modbus (1979, Modicon) es el idioma industrial más usado del planeta. Se diseñó para una red serie confiable y cerrada, así que NO autentica, NO cifra, NO firma nada: quien alcanza el puerto 502/TCP de un PLC lo lee y lo ESCRIBE. No hay 'login'. Las funciones que importan: fn 01 lee coils (salidas booleanas: bomba ON/OFF, modo AUTO); fn 05 las escribe. fn 03 lee holding registers (parámetros analógicos R/W: apertura de válvula, setpoint de presión); fn 06 los escribe. fn 04 lee input registers (variables de proceso que el PLC CALCULA: nivel del tanque, presión real — sólo lectura: son la física). Y fn 43/MEI 14 es Read Device Identification: la huella (marca/modelo/revisión) que un pentester OT lee ANTES de tocar nada, para saber qué soporta el equipo.",
      diagram: "ics",
      bullets: [
        "Modbus no autentica: alcanzar :502 = control total de lectura y escritura.",
        "fn 01/05 coils (ON/OFF) · fn 03/06 holding (parámetros) · fn 04 inputs (física, read-only).",
        "fn 43 / MEI 14: Read Device ID — el fingerprint OT antes de atacar.",
      ],
    },
    {
      kind: "lab",
      title: "Fingerprint del PLC (Modbus fn 43)",
      body: "Desde el historian, pedile al PLC su identificación de dispositivo. Modbus no pide credenciales: sólo tenés que alcanzar el 502.",
      command: "connect server.nande soporte Verano2024 && connect nas.interna.nande respaldo NasÑande#2024 && connect db-core.interna.nande dbadmin Core-DB!2024 && modbus id plc.planta.nande",
      explain:
        "El PLC te canta su huella sin pedir nada: VendorName ÑANDE Industrial, ProductCode NPLC-3000, revisión 3.11, Unit ID 1 activo. Eso es Read Device Identification (fn 43 / MEI 14), el equivalente OT de un banner grab. Con la marca y modelo ya sabés qué registros y comandos soporta. Y confirmaste lo peor: Modbus NO autentica — cualquiera que llegue al 502 escribe el control.",
      diagram: "ics",
    },
    {
      kind: "lab",
      title: "Leé el proceso físico (holding + input registers)",
      body: "Leé los parámetros R/W del PLC (fn 03): válvula y setpoint. Son los puntos que, si escribís, cambian la física de la planta.",
      command: "connect server.nande soporte Verano2024 && connect nas.interna.nande respaldo NasÑande#2024 && connect db-core.interna.nande dbadmin Core-DB!2024 && modbus read plc.planta.nande holding",
      explain:
        "Ves los holding registers: [0] Válvula-3 apertura = 40%, [1] Setpoint presión = 42 (4.2 bar). Son escribibles (fn 06). El setpoint es el blanco clave: con la bomba encendida y el lazo en AUTO, la presión real SIGUE al setpoint. Si subís ese número, subís la presión física del tanque. Leé también `modbus read plc.planta.nande input`: ahí está la física que el PLC calcula (nivel y presión reales) — esos no se escriben, son la consecuencia.",
      diagram: "ics",
    },
    {
      kind: "concept",
      title: "Fase 4 — Tomar la consola: qué significa comprometer una HMI",
      body:
        "La HMI (Human-Machine Interface) es la pantalla del operador: ve el proceso y manda órdenes. Comprometerla es oro doble — ves TODO lo que ve el operador (y podés MENTIRLE, como hizo Stuxnet mostrando valores normales mientras destruía centrífugas), y desde ella alcanzás el PLC por la red de control. En ÑANDE la HMI (hmi.planta.nande) se alcanza desde el historian con la credencial que leíste. Su archivo /var/scada/proceso.status muestra el estado en vivo del proceso — derivado del MISMO motor que gobierna el PLC, no un texto inventado. Y su config /etc/scada/plc-links.conf filtra la credencial de INGENIERÍA del PLC (el acceso privilegiado que reprograma el controlador).",
      diagram: "terminal",
      bullets: [
        "La HMI: ves lo que ve el operador y podés mentirle (técnica Stuxnet).",
        "Desde la HMI se alcanza el PLC por la red de control.",
        "Su config filtra la credencial de ingeniería del PLC.",
      ],
    },
    {
      kind: "lab",
      title: "Fase 4 — Tomá la consola de operador (HMI)",
      body: "Saltá del historian a la HMI con la credencial del operador y llevate su bandera. Es tu primer pie DENTRO de la red de planta.",
      command: "connect server.nande soporte Verano2024 && connect nas.interna.nande respaldo NasÑande#2024 && connect db-core.interna.nande dbadmin Core-DB!2024 && connect hmi.planta.nande operador Planta#2024 && cat /root/flag.txt",
      explain:
        "¡Adentro de la planta! Capturaste ND{ot_hmi_tomado}: tomaste la consola de operador. Desde acá ves el proceso en vivo (cat /var/scada/proceso.status) y tenés línea directa al PLC. Fijate que cruzaste la frontera IT→OT: ya no estás robando datos, estás parado frente al control físico. Leé /etc/scada/plc-links.conf: filtra la credencial de ingeniería (ingenieria / PlcÑande!2024) para el acceso privilegiado al PLC.",
      diagram: "terminal",
    },
    {
      kind: "lab",
      title: "Fase 5 — Tomá el PLC (el que gobierna el proceso)",
      body: "Desde la HMI, saltá al PLC con la credencial de ingeniería y capturá su bandera. Es el corazón del control físico.",
      command: "connect server.nande soporte Verano2024 && connect nas.interna.nande respaldo NasÑande#2024 && connect db-core.interna.nande dbadmin Core-DB!2024 && connect hmi.planta.nande operador Planta#2024 && connect plc.planta.nande ingenieria PlcÑande!2024 && cat /root/flag.txt",
      explain:
        "Capturaste ND{ot_plc_control}: llegaste al controlador lógico. En /cfg/ladder.txt está el programa LADDER que maneja bombas y válvulas. Ahora tenés acceso de ingeniería (SSH de mantenimiento) Y Modbus/TCP: el control total del proceso físico. Ojo: el PLC tiene DOS entradas (regla de red real) — se alcanza desde la HMI y también directo desde el historian. Dos atacantes, dos caminos, mismo objetivo.",
      diagram: "ics",
    },
    {
      kind: "concept",
      title: "El proceso físico: coils, registros y los tres peligros",
      body:
        "El PLC de la planta modela un lazo real: un tanque con una bomba que lo llena y una válvula que lo drena, y una presión que el lazo sostiene. El estado de control: Bomba-A (coil 0), Modo AUTO (coil 1), Válvula-3 (holding 0, %), Setpoint (holding 1, bar×10). La física es DETERMINISTA: con bomba ON y AUTO, presión = setpoint; nivel = 100 − apertura de válvula. Escribir un punto cambia DE VERDAD el proceso, y puede cruzarlo a un estado peligroso: SOBREPRESIÓN (presión ≥ 8.0 bar), DESBORDE (nivel ≥ 95%, válvula muy cerrada con bomba on) o MARCHA EN SECO (bomba on con tanque casi vacío → cavitación). Cada escritura enciende su técnica MITRE ATT&CK for ICS: Modify Parameter (T0836) para un registro, Unauthorized Command Message (T0855) para un coil.",
      diagram: "ics",
      bullets: [
        "Bomba (coil 0) · AUTO (coil 1) · Válvula (hold 0) · Setpoint (hold 1).",
        "En AUTO: presión = setpoint. Subir el setpoint sube la presión real.",
        "Tres peligros físicos: sobrepresión, desborde, marcha en seco.",
      ],
    },
    {
      kind: "concept",
      title: "El SIS y el ataque TRITON: cómo se destruye una planta",
      body:
        "Entre vos y la catástrofe hay una última red: el SIS (Safety Instrumented System / Sistema Instrumentado de Seguridad). Es una capa INDEPENDIENTE del control, hecha para una sola cosa: si la presión cruza un umbral crítico (acá 10.0 bar), DISPARA la planta a paro seguro (la detiene, intacta). Mientras el SIS vigila, lo peor que lográs es un paro de producción. El ataque avanzado —el que hizo TRITON/TRISIS en 2017 contra un SIS Triconex de Schneider en una petroquímica— es DESHABILITAR el SIS primero. Sin esa red, la misma sobrepresión que antes paraba la planta, ahora la DESTRUYE: rotura de vasija, daño físico irreversible, posible pérdida de vidas. En ÑANDE eso enciende T0858 (Change Operating Mode) al tocar el SIS, y T0879 (Damage to Property) + T0880 (Loss of Safety) en la rotura. Además, muchos PLC legados traen una defensa física: la llave en modo RUN (write-protect) que rechaza toda escritura remota. El atacante tiene que sacarla primero (también T0858).",
      diagram: "escudo",
      bullets: [
        "SIS: capa independiente que lleva la planta a paro seguro ante sobrepresión.",
        "Con SIS puesto: lo peor es un paro. Sin SIS: la sobrepresión DESTRUYE (TRITON, 2017).",
        "Defensa física extra: la llave RUN (write-protect) rechaza escrituras remotas.",
      ],
    },
    {
      kind: "lab",
      title: "Paso previo del atacante: sacar la protección de escritura",
      body: "Si el PLC estuviera en modo protegido, Modbus rechazaría toda escritura. Sacá la protección de forma remota (cambiar el modo de operación del controlador) para habilitar el sabotaje.",
      command: "connect server.nande soporte Verano2024 && connect nas.interna.nande respaldo NasÑande#2024 && connect db-core.interna.nande dbadmin Core-DB!2024 && modbus protect plc.planta.nande off",
      explain:
        "Capturaste ND{ot_proteccion_deshabilitada}. Deshabilitar la protección de escritura es cambiar el modo de operación del controlador (MITRE ATT&CK for ICS T0858): el PLC vuelve a aceptar escrituras remotas. En una planta real esto equivale a un operador que dejó la llave en REMOTO/PROGRAM en vez de RUN — exactamente el estado que hace explotable un PLC. El SOC lo ve: tocar el modo de un controlador es una señal roja.",
      diagram: "ics",
    },
    {
      kind: "lab",
      title: "El paso TRITON: deshabilitá el sistema de seguridad (SIS)",
      body: "Quitá la red de seguridad del proceso. No cambia nada al instante — pero desarma la contención, igual que hizo TRITON antes de intentar el daño físico.",
      command: "connect server.nande soporte Verano2024 && connect nas.interna.nande respaldo NasÑande#2024 && connect db-core.interna.nande dbadmin Core-DB!2024 && modbus sis plc.planta.nande off",
      explain:
        "Capturaste ND{ot_seguridad_deshabilitada} (MITRE T0858 — Inhibit Response Function). El SIS ya no vigila: la próxima sobrepresión NO disparará a paro seguro, DESTRUIRÁ la planta. El mundo reacciona ('deshabilitaron el sistema de seguridad de una planta') porque este es el momento más grave de todo el ataque: no es robo de datos, es poner vidas en riesgo. Es, literalmente, el paso central del incidente TRITON de 2017.",
      diagram: "escudo",
    },
    {
      kind: "quiz",
      prompt: "Con la bomba encendida y el lazo en AUTO, subís el setpoint de presión muy por encima del umbral crítico (10.0 bar). ¿Qué pasa según si el SIS está puesto o deshabilitado?",
      options: [
        "Con SIS: la planta dispara a PARO SEGURO (se detiene, intacta). Sin SIS: la sobrepresión DESTRUYE la vasija (daño irreversible).",
        "Pasa lo mismo en ambos casos: el PLC ignora los setpoints peligrosos.",
        "Con SIS puesto la planta se destruye; deshabilitarlo la protege.",
        "Nada: Modbus no permite escribir el setpoint sin autenticación.",
      ],
      correct: 0,
      explain:
        "El SIS es la diferencia entre un susto y una catástrofe. Puesto, convierte la sobrepresión en un paro seguro (perdés producción, no la planta). Deshabilitado, la misma sobrepresión rompe la vasija: daño físico irreversible. Por eso el paso clave del atacante avanzado es apagar el SIS ANTES de forzar el proceso — y por eso la integridad del SIS es la joya a defender.",
      diagram: "escudo",
    },
    {
      kind: "lab",
      title: "Sabotaje con el SIS puesto: observá el paro seguro",
      body: "Con el SIS todavía vigilando, forzá una sobrepresión subiendo el setpoint. Mirá cómo la seguridad hace su trabajo y detiene la planta sin destruirla.",
      command: "connect server.nande soporte Verano2024 && connect nas.interna.nande respaldo NasÑande#2024 && connect db-core.interna.nande dbadmin Core-DB!2024 && modbus write plc.planta.nande reg 1 150",
      explain:
        "Escribiste el setpoint a 15.0 bar (Modify Parameter, T0836). La presión cruzó el umbral y el SIS DISPARÓ: la planta quedó en PARO SEGURO (ND{ot_planta_en_paro}, MITRE T0828 — Loss of Productivity and Revenue). Perdiste producción, pero la planta sobrevivió: la seguridad hizo exactamente lo que debía. Ese es el resultado 'bueno dentro de lo malo'. Un atacante que quiere DESTRUIR tiene que apagar el SIS primero — lo ves en el próximo lab.",
      diagram: "ics",
    },
    {
      kind: "lab",
      title: "El ataque completo (TRISIS): SIS off + sobrepresión = rotura",
      body: "La cadena completa de destrucción física: deshabilitá el SIS y, acto seguido, forzá la sobrepresión. Sin la red de seguridad, el resultado es irreversible.",
      command: "connect server.nande soporte Verano2024 && connect nas.interna.nande respaldo NasÑande#2024 && connect db-core.interna.nande dbadmin Core-DB!2024 && modbus sis plc.planta.nande off && modbus write plc.planta.nande reg 1 150",
      explain:
        "Capturaste ND{ot_planta_destruida}: ROTURA CATASTRÓFICA. Sin SIS, la sobrepresión destruyó la vasija — daño físico IRREVERSIBLE (MITRE T0879 Damage to Property + T0880 Loss of Safety). El Blue Team te detectó y el mundo reacciona con una alerta de catástrofe industrial. Esta es, exactamente, la secuencia del ataque TRITON/TRISIS de 2017: primero desarmar la seguridad, después empujar el proceso al límite. En una planta real, esto son equipos destruidos y potencialmente vidas. Por eso la OT se aísla con tanta obsesión.",
      diagram: "matrix",
    },
    {
      kind: "concept",
      title: "Casos reales: Stuxnet, Ucrania y TRITON",
      body:
        "Esto no es teoría: pasó. STUXNET (2010) saboteó los PLC Siemens S7 de la planta de enriquecimiento de Natanz (Irán): variaba la velocidad de las centrífugas para romperlas mientras mostraba valores NORMALES a los operadores (un 'man-in-the-PLC'). Fue el primer arma cibernética que causó destrucción física; se propagó por USB con cuatro 0-days. UCRANIA 2015: el grupo Sandworm, con BlackEnergy3 + KillDisk, abrió remotamente los interruptores de tres distribuidoras y dejó a ~230.000 personas sin luz; después borró sistemas y firmware de conversores serie para alargar el apagón. UCRANIA 2016: Industroyer/CRASHOVERRIDE, el primer malware diseñado a medida para hablar los protocolos de red eléctrica (IEC 60870-5-104, IEC 61850), golpeó una subestación de transmisión en Kyiv. TRITON/TRISIS (2017): malware que reprogramó los controladores de SEGURIDAD Triconex (Schneider) de una petroquímica saudí — el primero en atacar un SIS. Se descubrió porque un bug hizo DISPARAR el SIS a paro seguro; el objetivo real era deshabilitarlo para permitir una catástrofe. El ataque que acabás de recorrer.",
      diagram: "ics",
      bullets: [
        "Stuxnet (2010): rompió centrífugas y mintió a los operadores. Primer daño físico por malware.",
        "Ucrania 2015/2016: Sandworm apagó la luz (BlackEnergy) e Industroyer atacó la red eléctrica.",
        "TRITON (2017): primer malware contra un SIS — la secuencia exacta de este curso.",
      ],
    },
    {
      kind: "concept",
      title: "Defensa OT: segmentar, bloquear la escritura y vigilar el SIS",
      body:
        "La defensa número uno es la SEGMENTACIÓN: si IT y OT no se tocan, la cadena que recorriste se corta en el primer salto. Nada de historians doble-homed sin una DMZ industrial real y un diodo de datos (gateway UNIDIRECCIONAL: los datos salen de OT hacia IT, pero NADA entra). Segundo: WRITE-PROTECT físico — la llave del PLC en RUN rechaza toda escritura remota; es la defensa #1 contra Modbus sin autenticación. Tercero: la INTEGRIDAD DEL SIS es sagrada — debe estar en una red aparte, con su llave física, y cualquier cambio de su modo de operación tiene que gritar en el SOC (TRITON se descubrió justamente por un disparo anómalo). Cuarto: monitoreo pasivo de OT (un IDS industrial que entiende Modbus/DNP3) para ver escrituras no autorizadas. En el próximo lab activás la defensa real: proteger el PLC bloquea el sabotaje siguiente de verdad.",
      diagram: "escudo",
      bullets: [
        "Segmentación + diodo de datos (gateway unidireccional): corta la cadena IT→OT.",
        "Write-protect (llave RUN): el PLC rechaza escrituras remotas. Defensa #1.",
        "Integridad del SIS en red aparte + IDS industrial que entiende Modbus.",
      ],
    },
    {
      kind: "lab",
      title: "Defensa en acción: blindá el PLC",
      body: "Ponete el sombrero azul. Activá la protección de escritura del PLC y comprobá que el sabotaje siguiente REBOTA: la defensa funciona de verdad, no es un cartel.",
      command: "connect server.nande soporte Verano2024 && connect nas.interna.nande respaldo NasÑande#2024 && connect db-core.interna.nande dbadmin Core-DB!2024 && modbus protect plc.planta.nande on",
      explain:
        "Activaste la protección (llave en RUN): el PLC ahora RECHAZA toda escritura Modbus remota. Probá tras esto `modbus write plc.planta.nande reg 1 130` — rebota ('rechazada'), y la planta no se toca. Esta es la defensa #1 contra Modbus sin autenticación, y acá ocurre de verdad en el motor: el estado cambió y el ataque siguiente falla. Combinalo con segmentación IT/OT y verás que la cadena entera que recorriste se vuelve inviable.",
      diagram: "escudo",
    },
    {
      kind: "quiz",
      prompt: "Sos el defensor de una planta y sólo podés aplicar UNA medida esta semana. ¿Cuál corta de raíz el ataque que recorriste?",
      options: [
        "Segmentar IT/OT con un gateway unidireccional (diodo de datos): sin el puente del historian, el atacante nunca alcanza la red de planta.",
        "Cambiar las contraseñas de los PLC por unas más largas.",
        "Instalar un antivirus en la HMI.",
        "Subir el umbral de disparo del SIS para que no moleste la producción.",
      ],
      correct: 0,
      explain:
        "Todo el ataque dependió de UN puente: el historian doble-homed que une IT y OT. Cortá ese puente (segmentación real + diodo de datos que sólo deja salir datos de OT) y el atacante se queda en IT, sin ruta a la planta. Las contraseñas ayudan, pero Modbus igual no autentica; subir el umbral del SIS es justo lo contrario de defender. La arquitectura vence al parche: en OT, segmentar es la madre de todas las defensas.",
      diagram: "escudo",
    },
  ],
};

export const HACKING_REAL_COURSES: Curso[] = [
  HACK_MAQUINA,
  HACK_AD,
  HACK_WEB,
  HACK_CLOUD,
  HACK_OT,
];
