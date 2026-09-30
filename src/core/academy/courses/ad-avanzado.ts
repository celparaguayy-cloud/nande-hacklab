import type { Curso } from "../courseTypes";

/**
 * Módulo "Active Directory avanzado". Cursos ligados al motor de AD REAL de
 * ÑANDE (Directory / NandeBlood) y sus herramientas de terminal: enum4linux,
 * nandeblood, kerberoast, asreproast, crack-tgs, certipy (ADCS ESC1), mimikatz
 * (sekurlsa/dcsync/golden). Todo ocurre contra el dominio NANDE.LOCAL y su DC
 * (dc01.nande.local, 10.10.0.6). 100% offline: técnicas reales, sandbox real.
 */

const AD_ENUM: Curso = {
  id: "c-ad-enum",
  title: "AD: enumerar el dominio",
  subtitle: "Del primer foothold a un mapa del Directorio Activo: usuarios, grupos, SPN y la ruta a Domain Admins.",
  level: "avanzado",
  skill: "pentesting",
  hue: 210,
  glyph: "search",
  reward: { xp: 220, coins: 170 },
  slides: [
    {
      kind: "concept",
      title: "El Directorio Activo es un grafo",
      body:
        "Una empresa Windows no es una pila de PCs sueltas: es un DOMINIO gobernado por un Controlador de Dominio (DC). Usuarios, grupos, equipos y sus permisos forman un GRAFO de relaciones (MemberOf, AdminTo, HasSession, GenericAll…). Atacar AD no es 'adivinar una contraseña': es leer ese grafo y encontrar el camino más corto desde lo poco que controlás hasta 'Domain Admins' (el control total).",
      diagram: "adgrafo",
      bullets: [
        "El DC manda: autentica y guarda el grafo de identidad.",
        "Los permisos son aristas: quién puede sobre quién.",
        "El objetivo casi siempre es el grupo Domain Admins.",
      ],
    },
    {
      kind: "concept",
      title: "Enumerar primero, disparar después",
      body:
        "Antes de explotar, enumerás. `enum4linux` vuelca usuarios, grupos y equipos del dominio y marca las cuentas interesantes: las que tienen SPN (kerberoasteables) y las que no piden pre-autenticación (AS-REP roasteables). Con eso armás el grafo en `nandeblood`, que además te calcula la RUTA de ataque desde lo que ya poseés.",
      diagram: "adgrafo",
      bullets: [
        "enum4linux <dominio> → inventario real del dominio.",
        "[SPN] = kerberoasteable · [AS-REP] = roasteable sin credenciales.",
        "nandeblood = el grafo + la ruta más corta a Domain Admins.",
      ],
    },
    {
      kind: "quiz",
      prompt: "En el grafo, ¿qué buscás para llegar a Domain Admins?",
      options: [
        "La cadena de aristas abusables desde un nodo que ya poseés hasta el grupo objetivo",
        "La contraseña del administrador, sí o sí",
        "Apagar el DC",
        "Reiniciar todas las PCs",
      ],
      correct: 0,
      explain:
        "AD se compromete siguiendo CAMINOS: cada arista (GenericAll, AdminTo, HasSession…) es un abuso concreto. NandeBlood te muestra la cadena más corta desde lo que controlás. No hace falta la clave del admin: alcanza con encadenar permisos mal puestos.",
      diagram: "adgrafo",
    },
    {
      kind: "concept",
      title: "Del inventario al grafo: NandeBlood",
      body:
        "Con el volcado de enum4linux ya sabés QUIÉNES hay; NandeBlood te dice CÓMO se conectan. Toma usuarios, grupos, sesiones y permisos y los arma como grafo dirigido; después calcula la ruta más corta desde lo que controlás hasta 'Domain Admins'. Es el mismo concepto que BloodHound en el mundo real: dejás de mirar cuentas sueltas y empezás a ver CAMINOS de ataque, con cada arista etiquetada por el abuso que la habilita.",
      diagram: "adgrafo",
      bullets: [
        "enum4linux = inventario; NandeBlood = relaciones + rutas.",
        "El grafo es dirigido: cada arista es un abuso concreto.",
        "La ruta más corta a DA es tu plan de ataque.",
      ],
    },
    {
      kind: "quiz",
      prompt: "enum4linux marca una cuenta como [AS-REP]. ¿Qué implica para vos?",
      options: [
        "Podés pedir su AS-REP y crackearlo offline sin tener credenciales del dominio",
        "Que la cuenta está bloqueada",
        "Que es un Domain Admin seguro",
        "Que no sirve para nada",
      ],
      correct: 0,
      explain:
        "La marca [AS-REP] significa pre-autenticación deshabilitada: se le puede pedir el AS-REP sin credenciales y crackearlo offline. Es de las primeras cosas que se buscan porque no exige foothold previo.",
      diagram: "kerberos",
    },
    {
      kind: "lab",
      title: "Enumerá NANDE.LOCAL",
      body: "Apuntá al controlador de dominio y volcá el dominio entero. Fijate qué cuentas quedan marcadas.",
      command: "enum4linux nande.local",
      explain:
        "Vas a ver los usuarios, grupos y equipos REALES del dominio, con las cuentas SPN y AS-REP marcadas. Ese inventario es el punto de partida: elegís a quién apuntar antes de disparar. Después, `nandeblood` te dibuja la ruta.",
      diagram: "adgrafo",
    },
  ],
};

const AD_KERBEROAST: Curso = {
  id: "c-ad-kerberoast",
  title: "AD: Kerberoasting",
  subtitle: "Pedile al DC el ticket de una cuenta de servicio y crackeá su clave offline, sin tocar la cuenta.",
  level: "avanzado",
  skill: "pentesting",
  hue: 40,
  glyph: "flame",
  reward: { xp: 240, coins: 190 },
  slides: [
    {
      kind: "concept",
      title: "Las cuentas de servicio y su SPN",
      body:
        "En AD, los servicios (SQL, web, etc.) corren con CUENTAS DE SERVICIO que tienen un SPN (Service Principal Name). Kerberos permite que cualquier usuario del dominio PIDA un ticket (TGS) para ese servicio. Y ese ticket viene cifrado con el hash de la clave de la cuenta de servicio. ¿La consecuencia? Podés pedir el ticket y CRACKEARLO offline, sin tocar la cuenta ni disparar bloqueos.",
      diagram: "kerberos",
      bullets: [
        "Cuenta de servicio = tiene SPN = kerberoasteable.",
        "El TGS viaja cifrado con la clave de esa cuenta.",
        "Se crackea OFFLINE: sin ruido de logins fallidos.",
      ],
    },
    {
      kind: "concept",
      title: "Por qué funciona (y cómo se defiende)",
      body:
        "Funciona porque muchas cuentas de servicio tienen claves DÉBILES y humanas ('Verano2024!'). Kerberos te entrega el material para romperlas a tu ritmo. Defensa: usar cuentas de servicio administradas (gMSA) con claves largas y aleatorias, y monitorear el evento 4769 (muchas solicitudes de TGS = alguien roasteando).",
      diagram: "kerberos",
      bullets: [
        "El problema real es la clave débil, no Kerberos.",
        "Defensa: gMSA (claves de 120+ caracteres, rotadas solas).",
        "Detección: pico de eventos 4769 en el DC.",
      ],
    },
    {
      kind: "build",
      goal: "Crackear el hash de una cuenta de servicio ya roasteada",
      pieces: ["crack-tgs", "SVC-SQL@NANDE.LOCAL", "Verano2024!", "nmap", "--brute"],
      answer: ["crack-tgs", "SVC-SQL@NANDE.LOCAL", "Verano2024!"],
      hint: "Primero roasteás (kerberoast), después crackeás el hash con la clave candidata.",
      explain:
        "`crack-tgs <cuenta> <clave>` prueba una clave contra el hash del TGS. Si acierta, poseés la cuenta de servicio de verdad (el grafo lo recalcula). Verano2024! es la clave débil de SVC-SQL.",
    },
    {
      kind: "concept",
      title: "El ciclo completo: roast → crack → poseer",
      body:
        "Kerberoasting es una cadena de tres pasos verificables: (1) pedís el TGS de la cuenta de servicio (roast); (2) crackeás su hash offline con una lista de claves (crack); (3) al acertar, POSEÉS la cuenta de servicio de verdad — el grafo lo recalcula y aparecen los permisos que esa cuenta tiene (AdminTo a un servidor, por ejemplo). No es decorativo: cada acierto cambia el estado del dominio y abre la ruta al siguiente salto.",
      diagram: "kerberos",
      bullets: [
        "roast → crack → poseer: tres pasos con consecuencia real.",
        "Poseer SVC-SQL puede darte AdminTo a un servidor (lateral).",
        "El grafo se recalcula: la ruta a DA se acorta.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué Kerberoasting es tan sigiloso comparado con un ataque de fuerza bruta de login?",
      options: [
        "Porque el crackeo es OFFLINE: no genera logins fallidos ni bloqueos en el DC",
        "Porque apaga el SIEM",
        "Porque usa una VPN",
        "Porque Kerberos no deja logs nunca",
      ],
      correct: 0,
      explain:
        "Pedir un TGS es una operación legítima de Kerberos; el crackeo ocurre en tu máquina, sin volver a tocar el DC. No hay ráfaga de logins fallidos que dispare alertas. La señal defensiva es el pico de eventos 4769, no un bloqueo de cuenta.",
      diagram: "kerberos",
    },
    {
      kind: "lab",
      title: "Roasteá SVC-SQL",
      body: "Pedí el ticket de la cuenta de servicio SVC-SQL. Vas a recibir un hash crackeable offline.",
      command: "kerberoast SVC-SQL@NANDE.LOCAL",
      explain:
        "Recibís el hash $krb5tgs$ de SVC-SQL, sin tocar su cuenta. El siguiente paso es crackearlo: `crack-tgs SVC-SQL@NANDE.LOCAL Verano2024!`. Pedir el TGS pasa por el DC (Kerberos 88): si no hay ruta al DC, no hay roasting.",
      diagram: "kerberos",
    },
  ],
};

const AD_ASREP: Curso = {
  id: "c-ad-asrep",
  title: "AD: AS-REP Roasting",
  subtitle: "Cuentas sin pre-autenticación: un hash crackeable SIN tener credenciales previas.",
  level: "avanzado",
  skill: "pentesting",
  hue: 25,
  glyph: "flame",
  reward: { xp: 230, coins: 180 },
  slides: [
    {
      kind: "concept",
      title: "Pre-autenticación de Kerberos",
      body:
        "Normalmente, para pedir el primer ticket (AS-REP) tenés que PROBAR que sabés la clave (pre-autenticación). Pero algunas cuentas tienen la pre-auth DESHABILITADA (una mala config vieja). A esas, cualquiera puede pedirles el AS-REP SIN credenciales — y ese AS-REP viene cifrado con la clave de la cuenta. Otra vez: material para crackear offline, y esta vez ni siquiera necesitás un usuario del dominio.",
      diagram: "kerberos",
      bullets: [
        "Pre-auth OFF = se puede pedir el AS-REP sin credenciales.",
        "El AS-REP se crackea offline como el TGS.",
        "Aún más peligroso: no requiere foothold previo.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Cuál es la diferencia clave entre Kerberoasting y AS-REP Roasting?",
      options: [
        "AS-REP no necesita credenciales previas; Kerberoasting sí (una cuenta de dominio)",
        "Son exactamente lo mismo",
        "AS-REP ataca el WiFi",
        "Kerberoasting no usa Kerberos",
      ],
      correct: 0,
      explain:
        "Kerberoasting pide TGS de cuentas con SPN (necesitás ser usuario del dominio). AS-REP Roasting ataca cuentas con pre-auth deshabilitada y NO requiere credenciales: por eso se busca temprano en el ataque.",
      diagram: "kerberos",
    },
    {
      kind: "concept",
      title: "Por qué existe una cuenta sin pre-auth",
      body:
        "La pre-autenticación se deshabilita casi siempre por COMPATIBILIDAD: un sistema viejo, un dispositivo que no la soporta, una integración legada que alguien configuró 'para que funcione' y nunca revirtió. Ese atajo operativo se convierte en una puerta: la cuenta queda AS-REP roasteable para siempre. Es un recordatorio de que la deuda técnica es deuda de seguridad. Defensa: encontrar y corregir cuentas con 'DONT_REQUIRE_PREAUTH' y usar claves fuertes mientras tanto.",
      diagram: "kerberos",
      bullets: [
        "Pre-auth off = atajo de compatibilidad que quedó abierto.",
        "La deuda técnica legada se vuelve superficie de ataque.",
        "Defensa: auditar el flag DONT_REQUIRE_PREAUTH.",
      ],
    },
    {
      kind: "build",
      goal: "Crackear offline el AS-REP de la cuenta legada con su clave candidata",
      pieces: ["crack-tgs", "LEGACY-SVC@NANDE.LOCAL", "Legacy2019!", "hydra", "-l"],
      answer: ["crack-tgs", "LEGACY-SVC@NANDE.LOCAL", "Legacy2019!"],
      hint: "Es el mismo crack-tgs que para el TGS: cuenta y clave candidata. La clave legada huele a año viejo.",
      explain:
        "`crack-tgs LEGACY-SVC@NANDE.LOCAL Legacy2019!` prueba la clave contra el hash $krb5asrep$. Si acierta, poseés la cuenta legada — una ruta a Domain Admins que ni siquiera necesitó un foothold previo.",
    },
    {
      kind: "quiz",
      prompt: "¿Cuándo conviene buscar cuentas AS-REP roasteables en una operación?",
      options: [
        "Lo antes posible: no requieren credenciales, así que sirven incluso sin foothold",
        "Sólo al final, cuando ya sos Domain Admin",
        "Nunca, es ilegal dentro del sandbox",
        "Sólo si el WiFi está caído",
      ],
      correct: 0,
      explain:
        "Como el AS-REP roasting no necesita credenciales previas, es un candidato temprano: si hay una cuenta sin pre-auth con clave débil, podés tener un hash crackeable antes de conseguir tu primer usuario válido.",
      diagram: "kerberos",
    },
    {
      kind: "lab",
      title: "Roasteá la cuenta legada",
      body: "La cuenta LEGACY-SVC tiene la pre-auth deshabilitada. Pedile el AS-REP.",
      command: "asreproast LEGACY-SVC@NANDE.LOCAL",
      explain:
        "Recibís un hash $krb5asrep$ sin haber puesto ninguna credencial. Crackealo con `crack-tgs LEGACY-SVC@NANDE.LOCAL Legacy2019!`. Es una ruta alternativa a Domain Admins que no pasa por SVC-SQL.",
      diagram: "kerberos",
    },
  ],
};

const AD_ADCS: Curso = {
  id: "c-ad-adcs",
  title: "AD: abuso de certificados (ADCS ESC1)",
  subtitle: "Una plantilla de certificado mal configurada te convierte en Domain Admin sin tocar una contraseña.",
  level: "avanzado",
  skill: "pentesting",
  hue: 275,
  glyph: "crown",
  reward: { xp: 280, coins: 220 },
  slides: [
    {
      kind: "concept",
      title: "AD CS: la autoridad de certificados del dominio",
      body:
        "Muchos dominios corren AD CS (Active Directory Certificate Services): una CA que emite certificados. Los certificados de 'autenticación de cliente' sirven para loguearte por PKINIT. Si una PLANTILLA está mal configurada, un usuario común puede pedir un certificado ELIGIENDO a nombre de quién (el SAN) — incluso a nombre de un Domain Admin. Eso es ESC1.",
      diagram: "adcs",
      bullets: [
        "AD CS emite certificados; algunos sirven para autenticar.",
        "ESC1 = plantilla que deja elegir el SAN (a nombre de quién).",
        "Pedís un cert 'como el DA' y te autenticás como el DA.",
      ],
    },
    {
      kind: "concept",
      title: "Las cuatro condiciones de ESC1",
      body:
        "Una plantilla es ESC1-vulnerable cuando se cumplen las CUATRO: (1) usuarios de bajo privilegio pueden inscribirse; (2) el solicitante elige el sujeto/SAN; (3) tiene EKU de autenticación de cliente; (4) NO exige aprobación de un manager. Falta una y no explota. El ataque es en dos pasos, como la herramienta real: `certipy req` emite el .pfx, `certipy auth` hace PKINIT con él y recupera el hash NT.",
      diagram: "adcs",
      bullets: [
        "4 condiciones a la vez = ESC1.",
        "req = emitís el certificado (el .pfx).",
        "auth = PKINIT: te autenticás y sacás el hash NT.",
      ],
    },
    {
      kind: "quiz",
      prompt: "En ESC1, ¿qué condición de la plantilla es la que te deja impersonar a un Domain Admin?",
      options: [
        "Que el solicitante puede elegir el sujeto/SAN del certificado",
        "Que la CA está encendida",
        "Que el dominio tiene DNS",
        "Que existe un grupo Domain Admins",
      ],
      correct: 0,
      explain:
        "El corazón de ESC1 es que la plantilla deja que VOS elijas a nombre de quién se emite el certificado (el SAN). Si además autentica clientes y no exige aprobación, pedís un cert 'como el DA' y te volvés el DA. Las otras condiciones habilitan; ésta es la que te da la impersonación.",
      diagram: "adcs",
    },
    {
      kind: "build",
      goal: "Pedir un certificado de la plantilla vulnerable a nombre de una cuenta administrativa",
      pieces: ["certipy", "req", "-template", "NandeUser", "-upn", "ADMIN-SQL@NANDE.LOCAL", "--brute"],
      answer: ["certipy", "req", "-template", "NandeUser", "-upn", "ADMIN-SQL@NANDE.LOCAL"],
      hint: "certipy req emite el .pfx; -template elige la plantilla vulnerable; -upn dice a nombre de quién (el SAN).",
      explain:
        "`certipy req -template NandeUser -upn ADMIN-SQL@NANDE.LOCAL` emite un certificado a nombre de la cuenta administrativa. El paso gemelo es `certipy auth -pfx ADMIN-SQL@NANDE.LOCAL`, que hace PKINIT y te devuelve el hash NT: dos pasos, como la herramienta real.",
    },
    {
      kind: "concept",
      title: "La defensa: harden-adcs",
      body:
        "ESC1 no se arregla apagando la CA: se arregla ENDURECIENDO la plantilla. Le quitás 'el solicitante elige el SAN', exigís aprobación de un manager, y listás quién puede inscribirse. En ÑANDE eso es `harden-adcs`, y su efecto es verificable: después, `certipy req` ya no puede impersonar. Es la contraparte azul exacta de la técnica, igual que rotate-krbtgt lo es del Golden Ticket.",
      diagram: "escudo",
      bullets: [
        "Se arregla en la plantilla, no apagando la CA.",
        "Quitar 'elige el SAN' + exigir aprobación = ESC1 muerto.",
        "harden-adcs cierra la ruta de forma verificable.",
      ],
    },
    {
      kind: "lab",
      title: "Encontrá la plantilla vulnerable",
      body: "Enumerá la CA del dominio y mirá qué plantillas son explotables.",
      command: "certipy find -vulnerable",
      explain:
        "Vas a ver la plantilla 'NandeUser' marcada [ESC1 — VULNERABLE], con las cuatro condiciones en verde. El siguiente paso: `certipy req -template NandeUser -upn ADMIN-SQL@NANDE.LOCAL` y luego `certipy auth -pfx ADMIN-SQL@NANDE.LOCAL`. La defensa es `harden-adcs`.",
      diagram: "adcs",
    },
  ],
};

const AD_DCSYNC_GOLDEN: Curso = {
  id: "c-ad-dcsync-golden",
  title: "AD: DCSync y Golden Ticket",
  subtitle: "Ser Domain Admin no alcanza: replicar krbtgt y forjar tickets es persistencia total.",
  level: "avanzado",
  skill: "pentesting",
  hue: 300,
  glyph: "crown",
  reward: { xp: 300, coins: 240 },
  slides: [
    {
      kind: "concept",
      title: "DCSync: robar TODOS los secretos del dominio",
      body:
        "Con privilegios de Domain Admin (derecho de replicación) podés pedirle al DC que te 'replique' los secretos del dominio, como si fueras otro DC. Eso te da el hash NT de cada cuenta — incluido el de KRBTGT, la cuenta más importante de Kerberos. No hace falta tocar cada equipo: un solo DCSync y tenés las llaves del reino.",
      diagram: "dcsync",
      bullets: [
        "DCSync abusa la replicación del DC (MITRE T1003.006).",
        "Devuelve el hash NT de todas las cuentas, incluido krbtgt.",
        "Es el 'game over' de un dominio.",
      ],
    },
    {
      kind: "concept",
      title: "Golden Ticket: persistencia que sobrevive resets",
      body:
        "Con el hash de KRBTGT forjás un TGT válido para CUALQUIER cuenta, sin pasar por el DC para autenticarte: un Golden Ticket. Sobrevive aunque reseteen las contraseñas de los usuarios. La ÚNICA cura real es rotar la clave de krbtgt DOS veces (el KDC honra la anterior por compatibilidad, por eso una sola no alcanza). En ÑANDE eso es `rotate-krbtgt` (x2).",
      diagram: "kerberos",
      bullets: [
        "Golden Ticket = TGT forjado con la clave de krbtgt.",
        "Persistencia: sobrevive al reseteo de cuentas.",
        "Cura: rotar krbtgt DOS veces (rotate-krbtgt).",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué hay que rotar la clave de krbtgt DOS veces para matar un Golden Ticket?",
      options: [
        "Porque el KDC acepta la clave anterior por compatibilidad; una sola rotación no invalida los tickets vigentes",
        "Porque así lo pide la ley",
        "Para que sea más rápido",
        "No hace falta, con una alcanza",
      ],
      correct: 0,
      explain:
        "El KDC mantiene la clave actual y la anterior de krbtgt para no romper tickets legítimos en tránsito. Si rotás una vez, el Golden Ticket todavía valida contra la 'anterior'. Recién la segunda rotación lo invalida.",
      diagram: "kerberos",
    },
    {
      kind: "concept",
      title: "Detección: la replicación anómala",
      body:
        "DCSync es ruidoso para quien sabe mirar. Una réplica (DRSGetNCChanges) sólo debería venir de OTRO Controlador de Dominio. Si una workstation o un servidor común pide replicar, es una señal clarísima. Detección: eventos 4662 con los GUIDs de replicación desde orígenes que no son DCs, y monitorear quién tiene el derecho 'Replicating Directory Changes'. La defensa preventiva es minimizar quién tiene ese derecho.",
      diagram: "dcsync",
      bullets: [
        "La réplica legítima viene sólo de otro DC.",
        "Un DCSync desde un host común = alerta roja (4662).",
        "Prevención: pocos con 'Replicating Directory Changes'.",
      ],
    },
    {
      kind: "build",
      goal: "Replicar los secretos del dominio desde el DC (DCSync) para obtener el hash de krbtgt",
      pieces: ["mimikatz", "lsadump::dcsync", "/user:krbtgt", "sekurlsa::logonpasswords", "--brute"],
      answer: ["mimikatz", "lsadump::dcsync", "/user:krbtgt"],
      hint: "El módulo de mimikatz para replicar es lsadump::dcsync; pedís el usuario krbtgt.",
      explain:
        "`mimikatz lsadump::dcsync /user:krbtgt` le pide al DC el secreto de krbtgt como si fueras otro DC. Con ese hash forjás un Golden Ticket. Requiere ya tener el derecho de replicación (ser Domain Admin): es el paso post-dominio, no el primero.",
    },
    {
      kind: "lab",
      title: "Mirá la ruta a Domain Admins",
      body: "Antes de DCSync hay que SER Domain Admin. Mirá el grafo y la ruta más corta desde tu foothold.",
      command: "nandeblood",
      explain:
        "NandeBlood te muestra el dominio como grafo y la cadena de abusos hasta Domain Admins. Una vez que controlás el dominio (siguiendo esa ruta), `mimikatz lsadump::dcsync` replica krbtgt y podés forjar el Golden Ticket.",
      diagram: "adgrafo",
    },
  ],
};

const AD_PTH: Curso = {
  id: "c-ad-pth",
  title: "AD: Pass-the-Hash y movimiento lateral",
  subtitle: "No necesitás la contraseña: con el hash NT te autenticás y saltás de máquina en máquina.",
  level: "avanzado",
  skill: "pentesting",
  hue: 330,
  glyph: "target",
  reward: { xp: 260, coins: 210 },
  slides: [
    {
      kind: "concept",
      title: "El hash ES la credencial",
      body:
        "Windows autentica con el hash NT de la contraseña, no con la contraseña en texto. Si volcás el hash NT de una cuenta (por ejemplo de la memoria de un equipo que ya controlás, con sekurlsa::logonpasswords), podés autenticarte COMO esa cuenta pasando el hash — sin conocer la clave. Eso es Pass-the-Hash, la base del movimiento lateral en Windows.",
      diagram: "pth",
      bullets: [
        "NTLM autentica con el hash, no con la clave en claro.",
        "sekurlsa::logonpasswords vuelca hashes de sesiones cacheadas.",
        "Con el hash de un Domain Admin, caés el dominio.",
      ],
    },
    {
      kind: "concept",
      title: "El puente 'admin de esta máquina' → 'dueño del dominio'",
      body:
        "El patrón clásico: sos admin local de un equipo (DB01) donde un Domain Admin dejó una SESIÓN abierta. Volcás su hash de la memoria y lo reusás (pth) para autenticarte como él en el DC. Ahí ya sos dueño del dominio. Defensa: Credential Guard, no dejar sesiones de DA en equipos comunes, y LAPS para las claves de admin local.",
      diagram: "pth",
      bullets: [
        "Sesión de DA en un equipo tomado = su hash es volcable.",
        "pth reusa ese hash contra el DC.",
        "Defensa: Credential Guard + no exponer sesiones de DA.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Tenés el hash NT de un Domain Admin (no la contraseña). ¿Podés usarlo?",
      options: [
        "Sí: con Pass-the-Hash te autenticás como esa cuenta sin conocer la clave en claro",
        "No: sin la contraseña en texto el hash no sirve",
        "Sólo si el DA está conectado en ese momento",
        "Sólo los domingos",
      ],
      correct: 0,
      explain:
        "NTLM autentica con el hash, no con la clave en texto. Pasar el hash (pth) te deja autenticarte como la cuenta directamente. Por eso robar un hash equivale a robar la cuenta: el hash ES la credencial.",
      diagram: "pth",
    },
    {
      kind: "build",
      goal: "Reusar el hash NT de una cuenta para autenticarte como ella (Pass-the-Hash)",
      pieces: ["mimikatz", "sekurlsa::pth", "/user:ADMIN-SQL@NANDE.LOCAL", "/ntlm:<hash>", "hydra"],
      answer: ["mimikatz", "sekurlsa::pth", "/user:ADMIN-SQL@NANDE.LOCAL", "/ntlm:<hash>"],
      hint: "El módulo es sekurlsa::pth; le pasás el usuario y su hash NTLM.",
      explain:
        "`mimikatz sekurlsa::pth /user:ADMIN-SQL@NANDE.LOCAL /ntlm:<hash>` abre una sesión que se autentica con el hash. Si ese hash es de un Domain Admin, acabás de caer el dominio sin haber crackeado ninguna contraseña.",
    },
    {
      kind: "concept",
      title: "La defensa: cortar la cadena de robo",
      body:
        "Pass-the-Hash vive de dos cosas: sesiones privilegiadas expuestas y hashes volcables de memoria. Defensa en capas: Credential Guard (aísla los secretos de LSASS), no dejar que un Domain Admin inicie sesión en equipos comunes (tiering), LAPS para que cada máquina tenga una clave de admin local única, y detección de volcado de LSASS. Ninguna sola alcanza; juntas rompen la cadena que hace posible el movimiento lateral.",
      diagram: "escudo",
      bullets: [
        "Credential Guard: protege los secretos en memoria.",
        "Tiering: el DA no toca equipos comunes.",
        "LAPS: clave de admin local única por máquina.",
      ],
    },
    {
      kind: "lab",
      title: "Volcá credenciales cacheadas",
      body: "Mirá qué hashes hay en los equipos que controlás (en un mundo limpio todavía no controlás ninguno).",
      command: "mimikatz sekurlsa::logonpasswords",
      explain:
        "El comando vuelca el hash NT de las cuentas con sesión en los EQUIPOS que ya poseés. En un mundo nuevo no poseés ninguno, así que no hay nada que volcar todavía: primero hay que tomar un equipo (seguí la ruta de nandeblood). Cuando aparezca el hash de un Domain Admin, reusalo con `mimikatz \"sekurlsa::pth /user:<cuenta> /ntlm:<hash>\"`.",
      diagram: "pth",
    },
  ],
};

export const AD_AVANZADO_COURSES: Curso[] = [
  AD_ENUM,
  AD_KERBEROAST,
  AD_ASREP,
  AD_ADCS,
  AD_DCSYNC_GOLDEN,
  AD_PTH,
];
