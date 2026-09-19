/**
 * Currículo interactivo de ÑANDE: cursos completos, con imágenes y paneles
 * interactivos, no "escribí un comando y listo".
 *
 * Cada curso es una secuencia de PANTALLAS (slides) que el alumno recorre como
 * en una app de cursos. Hay cuatro tipos, y un buen curso los mezcla:
 *
 *   - concept: explicación simple + un DIBUJO (SVG inline, 100% offline) que
 *              hace visible la idea (qué es un puerto, una IP, el DNS…).
 *   - quiz:    una pregunta con opciones. Obliga a ENTENDER, no a copiar.
 *   - build:   "armá el comando" tocando las piezas en orden. Se aprende la
 *              sintaxis real de la herramienta con las manos.
 *   - lab:     practicar de verdad en la terminal contra el mundo virtual, con
 *              una herramienta REAL (nmap, curl, hydra…).
 *
 * Los dibujos NO son archivos ni URLs externas: son ids que la UI dibuja con
 * SVG, para que todo siga funcionando sin internet.
 */

import type { Curso } from "./courseTypes";
import { EXTRA_CURSOS } from "./courses";

// Los tipos viven en courseTypes.ts; se re-exportan para no romper imports.
export type {
  Curso,
  Slide,
  DiagramId,
  ConceptSlide,
  QuizSlide,
  BuildSlide,
  LabSlide,
} from "./courseTypes";

/* ------------------------------------------------------------------ *
 *  CURSO 1 — Fundamentos: cómo funciona Internet (de cero absoluto)   *
 * ------------------------------------------------------------------ */

const FUNDAMENTOS: Curso = {
  id: "c-fundamentos",
  title: "Cómo funciona Internet",
  subtitle: "De cero: dominio, IP, puertos, DNS y protocolos, con dibujos.",
  level: "principiante",
  skill: "redes",
  hue: 205,
  glyph: "book",
  reward: { xp: 120, coins: 90 },
  slides: [
    {
      kind: "concept",
      title: "¿Qué es Internet, en serio?",
      body:
        "Internet no es una nube mágica. Son millones de computadoras conectadas entre sí por cables y antenas. Cuando entrás a una página, TU computadora le pide algo a OTRA computadora (un servidor) y esa le contesta. Nada más. Todo lo que vas a aprender es cómo se hablan esas dos computadoras… y dónde se equivocan.",
      diagram: "internet",
      bullets: [
        "Cliente = tu compu, la que pide.",
        "Servidor = la compu que guarda la página y responde.",
        "Hackear (ético) es entender esa charla mejor que quien la programó.",
      ],
    },
    {
      kind: "concept",
      title: "El dominio: el nombre fácil",
      body:
        "Un dominio es el nombre de un servidor escrito para personas: banco.nande, google.com, tu-escuela.edu. Es fácil de recordar, como el nombre de un negocio. Pero las computadoras no usan nombres: usan números. Así que el nombre es solo una etiqueta cómoda para vos.",
      diagram: "dominio",
      bullets: [
        "banco.nande → un negocio con nombre lindo.",
        "El nombre no dice DÓNDE está: eso lo resuelve el DNS (ya lo vemos).",
      ],
    },
    {
      kind: "concept",
      title: "La IP: la dirección real",
      body:
        "Cada computadora en la red tiene una dirección numérica única: su IP. Por ejemplo 10.10.5.20. Es como la dirección de una casa (calle y número). Si sabés la IP, sabés a qué computadora exacta le estás hablando. Los cuatro números van de 0 a 255.",
      diagram: "ip",
      bullets: [
        "IP = dirección exacta de una máquina en la red.",
        "Dos máquinas no pueden tener la misma IP en la misma red.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Tenés el nombre 'banco.nande' pero necesitás hablarle a la máquina. ¿Qué te falta saber?",
      options: [
        "Su IP (la dirección numérica real)",
        "Su color favorito",
        "La contraseña del administrador",
        "Nada, el nombre alcanza para todo",
      ],
      correct: 0,
      explain:
        "El nombre es cómodo para vos, pero la red enruta por IP. Necesitás traducir el nombre a su número. Eso lo hace el DNS, la próxima pieza.",
      diagram: "ip",
    },
    {
      kind: "concept",
      title: "El DNS: la agenda de contactos",
      body:
        "El DNS es como la agenda del teléfono: vos guardás 'Mamá' y el teléfono sabe a qué número llamar. El DNS traduce banco.nande → 10.10.5.20. Cuando escribís un nombre, tu computadora primero le pregunta al DNS '¿qué número es este?' y recién ahí llama.",
      diagram: "dns",
      bullets: [
        "Nombre (banco.nande) → Número (10.10.5.20).",
        "Comando real para preguntarle al DNS: nslookup banco.nande",
      ],
    },
    {
      kind: "build",
      goal: "Preguntarle al DNS qué IP tiene el dominio banco.nande",
      pieces: ["nslookup", "banco.nande", "ping", "google.com"],
      answer: ["nslookup", "banco.nande"],
      hint: "La herramienta que 'busca el número' se llama nslookup. Después va el nombre que querés resolver.",
      explain:
        "nslookup banco.nande le pregunta al DNS por la IP de ese nombre. Es lo PRIMERO que hace todo hacker: convertir un nombre en una dirección real a la que apuntar.",
    },
    {
      kind: "concept",
      title: "Los puertos: las puertas del edificio",
      body:
        "Una misma computadora ofrece varios servicios a la vez: una página web, correo, acceso remoto… ¿Cómo no se mezclan? Con puertos. Imaginá que la IP es el edificio y cada puerto es una puerta numerada. La web entra por la puerta 80, la web segura por la 443, el acceso remoto SSH por la 22.",
      diagram: "puerto",
      bullets: [
        "22 = SSH (entrar a la máquina por consola).",
        "80 = web (HTTP).  443 = web segura (HTTPS).",
        "Un puerto abierto = una puerta por la que se puede entrar a hablar.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Encontrás una máquina con el puerto 22 abierto. ¿Qué significa, probablemente?",
      options: [
        "Que se le puede intentar entrar por SSH (consola remota)",
        "Que la máquina está apagada",
        "Que no tiene dueño",
        "Que es una impresora",
      ],
      correct: 0,
      explain:
        "El 22 es la puerta clásica de SSH. Verla abierta le dice al atacante: 'acá se puede intentar entrar con usuario y contraseña'. Por eso lo primero es escanear puertos.",
      diagram: "puerto",
    },
    {
      kind: "concept",
      title: "El protocolo: el idioma acordado",
      body:
        "Para entenderse, las dos computadoras hablan el mismo idioma: un protocolo. HTTP es el idioma de la web. HTTPS es HTTP pero con un candado (todo va cifrado, nadie en el medio lo puede leer). SSH es el idioma para controlar una máquina por consola de forma segura.",
      diagram: "protocolo",
      bullets: [
        "HTTP → web normal (se puede espiar en el camino).",
        "HTTPS → web con candado (cifrada).",
        "El candado del navegador = estás hablando HTTPS.",
      ],
    },
    {
      kind: "concept",
      title: "La URL: la dirección completa, pieza por pieza",
      body:
        "Una URL junta todo lo que aprendiste. Mirá http://banco.nande/movimientos?id=7 :\n\n• http:// → el protocolo (el idioma)\n• banco.nande → el dominio (el nombre del servidor)\n• /movimientos → la ruta (qué página pedís dentro del sitio)\n• ?id=7 → un parámetro (un dato que le mandás)\n\nEse ?id=7 es justamente donde después vamos a jugar: cambiar ese dato es el primer paso de muchos ataques web.",
      diagram: "url",
      bullets: [
        "protocolo :// dominio / ruta ? parámetro",
        "Los parámetros (?id=7) son datos que vos controlás… y ahí está el peligro.",
      ],
    },
    {
      kind: "quiz",
      prompt: "En http://banco.nande/movimientos?id=7, ¿qué parte controlás vos y podrías cambiar a mano?",
      options: [
        "El parámetro ?id=7",
        "El protocolo http://",
        "Nada, la URL es fija",
        "El nombre del banco",
      ],
      correct: 0,
      explain:
        "Vos escribís la URL, así que podés cambiar ?id=7 por ?id=8 y ver los movimientos de OTRA cuenta. Si el servidor no controla eso, es una falla (IDOR). Cambiar lo que controlás y ver qué pasa es la mentalidad hacker.",
      diagram: "url",
    },
    {
      kind: "lab",
      title: "Practicá: resolvé un nombre de verdad",
      body:
        "Suficiente teoría. Abrí la terminal y preguntale al DNS del mundo ÑANDE por la IP de banco.nande. Vas a ver el nombre convertirse en un número real, igual que en Internet.",
      command: "nslookup banco.nande",
      explain:
        "Acabás de traducir un dominio a su IP con una herramienta real. Con esa IP ya podrías escanearle los puertos. Ese es el orden real de un ataque: nombre → IP → puertos → servicios.",
      diagram: "dns",
    },
    {
      kind: "concept",
      title: "Repaso: el mapa completo",
      body:
        "Ya tenés el mapa mental que usa todo profesional de seguridad:\n\n1. Un DOMINIO (nombre) apunta a una IP (dirección) vía DNS (agenda).\n2. Esa IP tiene PUERTOS (puertas), y cada puerta ofrece un servicio.\n3. Con cada servicio hablás un PROTOCOLO (idioma): HTTP, SSH…\n4. En la web, todo se pide con una URL, y sus PARÁMETROS los controlás vos.\n\nTodo lo que sigue en ÑANDE es explotar cada una de estas piezas cuando alguien la programó mal.",
      diagram: "capas",
      bullets: [
        "Dominio → IP → Puerto → Servicio → Protocolo → URL.",
        "Reconocer es el 80% del trabajo. Ya sabés reconocer.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 2 — Reconocimiento con nmap (ligado a la herramienta REAL)   *
 * ------------------------------------------------------------------ */

const RECON_NMAP: Curso = {
  id: "c-recon-nmap",
  title: "Reconocimiento con nmap",
  subtitle: "Encontrá las puertas abiertas de una máquina, como los profesionales.",
  level: "intermedio",
  skill: "pentesting",
  hue: 145,
  glyph: "search",
  reward: { xp: 180, coins: 140 },
  slides: [
    {
      kind: "concept",
      title: "¿Por qué escanear?",
      body:
        "Antes de intentar entrar a ningún lado, un profesional MIRA. ¿Qué máquina es? ¿Qué puertas tiene abiertas? ¿Qué servicio hay detrás de cada una? A eso se le llama reconocimiento, y la herramienta rey se llama nmap. Escanear es tocar cada puerta de un edificio y anotar cuáles se abren.",
      diagram: "escaneo",
      bullets: [
        "Escanear = descubrir qué puertos están abiertos.",
        "Cada puerto abierto es una posible forma de entrar.",
        "nmap es la herramienta estándar en el mundo real (y acá funciona de verdad).",
      ],
    },
    {
      kind: "concept",
      title: "Puerto abierto, cerrado y filtrado",
      body:
        "Cuando nmap toca una puerta, puede pasar una de tres cosas:\n\n• ABIERTO: alguien contesta. Hay un servicio esperando. ¡Interesante!\n• CERRADO: no hay nadie en esa puerta, pero la máquina existe.\n• FILTRADO: un firewall te tapa la vista, ni sí ni no.\n\nAl atacante le importan los ABIERTOS: son las puertas por las que se puede intentar entrar.",
      diagram: "puerto",
      bullets: [
        "open = servicio escuchando (objetivo).",
        "closed = sin servicio ahí.",
        "filtered = un firewall se interpone.",
      ],
    },
    {
      kind: "build",
      goal: "Escanear TODOS los puertos de server.nande y averiguar qué versión de servicio corre en cada uno",
      pieces: ["nmap", "-p-", "-sV", "server.nande", "-oscuro", "borrar"],
      answer: ["nmap", "-p-", "-sV", "server.nande"],
      hint: "nmap es la herramienta. -p- dice 'todos los puertos'. -sV dice 'detectá la versión del servicio'. Al final, el objetivo.",
      explain:
        "nmap -p- -sV server.nande revisa los 65535 puertos (-p-) y para cada uno abierto intenta averiguar QUÉ programa y QUÉ versión corre (-sV). Saber la versión exacta es oro: con ella se buscan vulnerabilidades conocidas.",
    },
    {
      kind: "quiz",
      prompt: "¿Qué hace la opción -p- en nmap?",
      options: [
        "Escanea los 65535 puertos, no solo los más comunes",
        "Apaga la máquina objetivo",
        "Escanea un solo puerto al azar",
        "Borra los resultados anteriores",
      ],
      correct: 0,
      explain:
        "Por defecto nmap mira solo los ~1000 puertos más comunes. Con -p- los mira TODOS. Un servicio escondido en un puerto raro (ej. 8080, 31337) aparece solo si escaneás todo.",
      diagram: "escaneo",
    },
    {
      kind: "lab",
      title: "Practicá: escaneá server.nande de verdad",
      body:
        "Abrí la terminal y corré el escaneo completo con detección de versión contra server.nande. Mirá bien la lista de puertos abiertos y qué servicio dice cada uno: esa lista es tu mapa de ataque.",
      command: "nmap -p- -sV server.nande",
      explain:
        "Lo que ves es real: nmap consultó el estado real de cada servicio del host virtual. Anotá los puertos abiertos (por ejemplo 22/SSH y 80/HTTP). El SSH abierto te habilita el próximo curso: fuerza bruta con hydra.",
      diagram: "escaneo",
    },
    {
      kind: "quiz",
      prompt: "Tu escaneo muestra '22/tcp open ssh'. ¿Cuál es un siguiente paso razonable de un pentester?",
      options: [
        "Probar usuarios y contraseñas contra ese SSH (con permiso)",
        "Reiniciar tu propia computadora",
        "Ignorarlo, SSH nunca sirve",
        "Cambiar el nombre del dominio",
      ],
      correct: 0,
      explain:
        "Un SSH abierto invita a probar credenciales. Si el dueño usó una contraseña débil, se entra. Eso se automatiza con hydra, y es exactamente lo que practicás en el curso de fuerza bruta.",
      diagram: "puerto",
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 3 — Inyección SQL: entrá sin contraseña (web, ligado al lab) *
 * ------------------------------------------------------------------ */

const WEB_SQLI: Curso = {
  id: "c-web-sqli",
  title: "Inyección SQL: entrá sin la clave",
  subtitle: "Por qué un login mal hecho te deja pasar, y cómo se explota.",
  level: "intermedio",
  skill: "web",
  hue: 275,
  glyph: "code",
  reward: { xp: 220, coins: 180 },
  slides: [
    {
      kind: "concept",
      title: "¿Qué es una base de datos?",
      body:
        "Cuando un sitio guarda usuarios, contraseñas o movimientos, los pone en una base de datos: como una planilla gigante con filas y columnas. Para buscar en ella, el programa escribe una orden en un idioma llamado SQL. Por ejemplo: 'traeme la fila donde usuario = admin'.",
      diagram: "inyeccion",
      bullets: [
        "Base de datos = planilla gigante de filas y columnas.",
        "SQL = el idioma para pedirle cosas a esa planilla.",
      ],
    },
    {
      kind: "concept",
      title: "El error fatal: mezclar orden con dato",
      body:
        "Cuando entrás tu usuario, el programa arma la orden pegando lo que escribiste:\n\n   SELECT * FROM usuarios WHERE user='LO_QUE_ESCRIBAS' AND pass='...'\n\nSi el programa no separa bien tu texto de la orden, vos podés escribir texto que ROMPE la orden y escribe una nueva. Eso es inyección SQL: colar tus propias órdenes donde solo debía ir un dato.",
      diagram: "inyeccion",
      bullets: [
        "El dato que escribís termina DENTRO de una orden SQL.",
        "Si no lo limpian, tu texto pasa a ser orden. Ahí está el agujero.",
      ],
    },
    {
      kind: "build",
      goal: "Armar el usuario mágico que hace que el login siempre diga 'verdadero' y te deje entrar sin saber la clave",
      pieces: ["admin", "'", "--", "OR '1'='1", "&&", "1234"],
      answer: ["admin", "'", "OR '1'='1", "--"],
      hint: "Cerrás la comilla del usuario ('), agregás una condición SIEMPRE verdadera ( OR '1'='1) y comentás el resto (--) para que ignore la parte de la contraseña.",
      explain:
        "Queda: user='admin' OR '1'='1' --'. La condición '1'='1' siempre es verdadera, así que la orden encuentra una fila y te deja pasar. El -- comenta (anula) el chequeo de la contraseña. Ese es el bypass de login por SQLi.",
    },
    {
      kind: "quiz",
      prompt: "¿Por qué ' OR '1'='1 rompe el login?",
      options: [
        "Porque '1'='1' es SIEMPRE verdadero, y con un OR alcanza con que una parte lo sea",
        "Porque adivina la contraseña real",
        "Porque apaga la base de datos",
        "Porque cambia tu dirección IP",
      ],
      correct: 0,
      explain:
        "La orden pregunta si el usuario y la clave coinciden. Al inyectar OR '1'='1' agregás una condición imposible de fallar, y el -- borra el chequeo de la clave. La base responde 'sí, hay coincidencia' aunque no sepas nada.",
      diagram: "inyeccion",
    },
    {
      kind: "lab",
      title: "Practicá: burlá el login del banco",
      body:
        "Abrí el navegador en http://banco.nande/ y en el usuario del login probá el payload que armaste: admin' OR '1'='1 --  (con cualquier contraseña). Si el banco está mal programado (lo está), vas a entrar al panel sin la clave real.",
      command: "curl -X POST http://banco.nande/login -d \"usuario=admin' OR '1'='1 --&password=x\"",
      explain:
        "Entraste sin la contraseña: eso captura la bandera ND{sqli_login_bypass}. En la vida real esto se arregla con 'consultas preparadas', que separan el dato de la orden. Atacar enseña a defender: nunca pegues texto del usuario dentro de una orden SQL.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "Cómo se tapa (la otra mitad del oficio)",
      body:
        "Saber romperlo obliga a saber arreglarlo. La defensa se llama consulta preparada (prepared statement): el programa manda la orden y los datos por CAMINOS SEPARADOS, así tu texto NUNCA se convierte en orden. Además: validar entradas, mínimos privilegios en la base y nunca mostrar errores SQL al usuario.",
      diagram: "escudo",
      bullets: [
        "Consultas preparadas: separan orden de dato (la cura real).",
        "Un hacker ético reporta el fallo y explica el arreglo, no roba.",
      ],
    },
  ],
};

export const CURSOS: Curso[] = [
  FUNDAMENTOS,
  RECON_NMAP,
  WEB_SQLI,
  ...EXTRA_CURSOS,
];

/** Motor de acceso al currículo (mismo patrón que LessonEngine/Academy). */
export class Curriculum {
  private byId: Map<string, Curso>;

  constructor() {
    this.byId = new Map(CURSOS.map((c) => [c.id, c]));
  }

  all(): Curso[] {
    return CURSOS.map((c) => ({ ...c }));
  }

  get(id: string): Curso | undefined {
    const c = this.byId.get(id);
    return c ? { ...c } : undefined;
  }

  count(): number {
    return this.byId.size;
  }
}
