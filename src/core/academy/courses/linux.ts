import type { Curso } from "../courseTypes";

/**
 * Cursos del módulo "linux". La base de todo: quien no maneja la terminal no
 * hackea (ni defiende) nada. Tres cursos que van de cero absoluto a cazar
 * secretos con grep y pipes, todos ligados a comandos y archivos REALES del
 * mundo ÑANDE (bienvenida.txt, documentos/primeros-pasos.md, whoami, ls, chmod…).
 */

/* ------------------------------------------------------------------ *
 *  CURSO 1 — La terminal desde cero (de verdad desde cero)           *
 * ------------------------------------------------------------------ */

const TERMINAL: Curso = {
  id: "c-linux-terminal",
  title: "La terminal desde cero",
  subtitle: "Qué es, cómo hablarle: whoami, pwd, ls, cd y cat, paso a paso.",
  level: "principiante",
  skill: "linux",
  hue: 160,
  glyph: "code",
  reward: { xp: 110, coins: 80 },
  slides: [
    {
      kind: "concept",
      title: "¿Qué es una terminal?",
      body:
        "La terminal es esa pantalla donde le hablás a la computadora escribiendo palabras, en vez de tocar botones con el mouse. Cada palabra que escribís es una orden. Suena más difícil, pero en realidad es más honesto: ves EXACTAMENTE qué le pedís y qué te contesta, sin ventanitas que te escondan cosas. Programadores, administradores y hackers viven acá porque es rápido, preciso y no miente.",
      diagram: "terminal",
      bullets: [
        "Con el mouse tocás cosas; en la terminal escribís órdenes.",
        "Una orden por línea: escribís, apretás Enter, la máquina responde.",
        "Nada de magia: lo que escribís es exactamente lo que pasa.",
      ],
    },
    {
      kind: "concept",
      title: "El prompt: la máquina te espera",
      body:
        "Antes de tu texto siempre hay algo parecido a  student@nande:~$  . Eso se llama prompt, y te dice tres cosas de un vistazo: QUIÉN sos (student), en qué MÁQUINA estás (nande) y DÓNDE estás parado (~ es tu carpeta personal, tu 'casa'). El $ del final significa 'listo, escribí tu orden'. Cuando un comando termina, el prompt reaparece esperando el siguiente.",
      diagram: "terminal",
      bullets: [
        "student = tu usuario.   nande = el nombre de la máquina.",
        "~ (la virgulilla) es tu carpeta personal: /home/student.",
        "El $ te dice: 'te escucho, dale'.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: ¿quién soy?",
      body:
        "Tu primera orden real. whoami (del inglés 'who am I', ¿quién soy?) le pregunta a la máquina con qué usuario estás actuando. Escribila y apretá Enter.",
      command: "whoami",
      explain:
        "Te respondió 'student'. Esto importa MUCHÍSIMO en seguridad: no es lo mismo ser 'student' (un usuario común, con permisos limitados) que ser 'root' (el jefe que puede todo). Lo primero que hace un atacante al entrar a una máquina es, justamente, correr whoami: 'a ver, ¿quién soy acá y qué puedo hacer?'.",
      diagram: "terminal",
    },
    {
      kind: "quiz",
      prompt: "Entrás a una máquina, corrés whoami y responde 'root'. ¿Por qué es una GRAN noticia para un atacante?",
      options: [
        "Porque root puede hacer TODO en la máquina: leer, borrar, instalar, apagar",
        "Porque root es un usuario sin permisos",
        "Porque significa que la máquina está apagada",
        "Porque no significa nada, todos los usuarios son iguales",
      ],
      correct: 0,
      explain:
        "root es el superusuario, el dueño absoluto de la máquina: lee cualquier archivo, borra lo que quiera, instala, apaga. Si un atacante termina siendo root, controla el equipo entero. Por eso el objetivo final de tantos ataques se resume en una frase: 'ser root'. Ser 'student' es mucho más limitado… y por eso más seguro.",
      diagram: "privesc",
    },
    {
      kind: "concept",
      title: "El árbol de carpetas",
      body:
        "Los archivos viven dentro de carpetas, y esas carpetas dentro de otras, como cajas dentro de cajas. Arriba de todo está / (la raíz): la caja más grande, que contiene a todas. Tu casa es /home/student. La 'ruta' es el camino completo hasta algo, por ejemplo /home/student/bienvenida.txt. Entender este árbol es entender dónde está todo en la máquina.",
      diagram: "archivo",
      bullets: [
        "/ es la raíz: la caja que contiene todas las demás.",
        "/home/student es tu carpeta personal (tu casa).",
        "Una ruta es el camino de cajas hasta un archivo o carpeta.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: ¿dónde estoy parado?",
      body:
        "pwd significa 'print working directory' (mostrá la carpeta actual). Es tu GPS: cuando te confundís de dónde estás, pwd te lo dice sin dudar. Corrélo.",
      command: "pwd",
      explain:
        "Te mostró /home/student: estás en tu casa. Parece un comando tonto ahora, pero cuando saltes entre carpetas —y más adelante entre máquinas distintas— pwd es lo que te salva de mandar un comando peligroso en el lugar equivocado. Un profesional siempre sabe dónde está parado.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "ls: mirar qué hay",
      body:
        "ls (de 'list', listar) abre la carpeta donde estás y te muestra qué contiene: archivos y otras carpetas. Es como abrir un cajón y ver qué guarda adentro. En ÑANDE, ls te muestra además los permisos y el dueño de cada cosa; eso lo vamos a exprimir entero en el próximo curso.",
      diagram: "archivo",
      bullets: [
        "ls = listar lo que hay en la carpeta actual.",
        "Las carpetas aparecen con una / al final del nombre.",
        "Si ls no muestra nada, la carpeta está vacía.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: mirá tu carpeta",
      body:
        "Escribí ls y mirá qué hay en tu casa. Deberías ver un archivo (bienvenida.txt) y una carpeta (documentos/).",
      command: "ls",
      explain:
        "Ahí están tus cosas: bienvenida.txt es un archivo de texto, y documentos/ (con la barra al final) es una carpeta con más cosas adentro. Ya sabés MIRAR lo que hay; ahora falta aprender a entrar a las carpetas y a abrir los archivos.",
      diagram: "terminal",
    },
    {
      kind: "quiz",
      prompt: "Entraste a una máquina desconocida y no tenés idea de en qué carpeta caíste. ¿Qué comando te lo dice?",
      options: [
        "pwd",
        "ls",
        "whoami",
        "cat",
      ],
      correct: 0,
      explain:
        "pwd ('print working directory') muestra la ruta de la carpeta actual: tu ubicación exacta. ls te dice QUÉ hay adentro, pero no DÓNDE estás; whoami dice quién sos; cat abre archivos. En terreno desconocido, pwd es lo primero para ubicarte antes de tocar nada.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "cd: entrar y salir de carpetas",
      body:
        "cd ('change directory') te mueve de una carpeta a otra. 'cd documentos' entra a la carpeta documentos. 'cd ..' sube un nivel (los dos puntos significan 'la carpeta de arriba'). 'cd' solo, sin nada, te devuelve a tu casa. Con cd + ls + pwd ya podés recorrer TODA la máquina: entrar, mirar, ubicarte, seguir.",
      diagram: "archivo",
      bullets: [
        "cd documentos → entrar a esa carpeta.",
        "cd .. → subir a la carpeta de arriba.",
        "cd → volver directo a tu casa (/home/student).",
      ],
    },
    {
      kind: "build",
      goal: "Entrar a la carpeta 'documentos' que viste con ls",
      pieces: ["cd", "documentos", "bienvenida.txt", "ls"],
      answer: ["cd", "documentos"],
      hint: "El comando para 'entrar' a una carpeta es cd, seguido del nombre de la carpeta a la que querés ir.",
      explain:
        "cd documentos te mete adentro de esa carpeta. Si ahora hicieras pwd, verías /home/student/documentos. Para volver, 'cd ..' te sube de nuevo, o 'cd' solo te lleva directo a casa. Moverte así, seguro y a paso firme, es la base de todo lo que sigue.",
    },
    {
      kind: "lab",
      title: "Practicá: abrí y leé un archivo",
      body:
        "cat ('concatenate') escribe en pantalla el contenido de un archivo de texto: es la forma de LEER. Abrí el archivo bienvenida.txt de tu casa.",
      command: "cat bienvenida.txt",
      explain:
        "cat volcó todo el texto del archivo en la pantalla. Con esto ya podés leer notas, configuraciones y —cuando alguien las guarda mal— hasta contraseñas y secretos. Leer archivos es media hackeada: muchísima información sensible está, simplemente, en un archivo de texto que alguien dejó a la vista.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Repaso: ya sabés moverte",
      body:
        "Con cinco comanditos ya te movés por cualquier Linux del mundo:\n\n• whoami → quién soy (¿student o root?)\n• pwd → dónde estoy parado\n• ls → qué hay en esta carpeta\n• cd → entrar y salir de carpetas\n• cat → leer un archivo\n\nEsto no es poca cosa: es exactamente lo primero que hace todo profesional al aterrizar en una máquina nueva. En el próximo curso mirás de cerca los PERMISOS que ls te muestra: quién puede leer, escribir y ejecutar cada archivo… y dónde eso se rompe.",
      diagram: "terminal",
      bullets: [
        "whoami · pwd · ls · cd · cat: tu kit de orientación.",
        "Orientarse primero, tocar después: así trabaja un pro.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 2 — Archivos, permisos y usuarios                           *
 * ------------------------------------------------------------------ */

const ARCHIVOS: Curso = {
  id: "c-linux-archivos",
  title: "Archivos, permisos y usuarios",
  subtitle: "rwx, chmod, root vs usuario y el peligro del SUID, con las manos.",
  level: "principiante",
  skill: "linux",
  hue: 35,
  glyph: "book",
  reward: { xp: 130, coins: 95 },
  slides: [
    {
      kind: "concept",
      title: "En Linux, casi todo es un archivo",
      body:
        "Tus fotos, tus notas, las configuraciones del sistema, hasta los programas: todo es un archivo guardado en alguna carpeta. Y a cada archivo, Linux le pega una etiqueta invisible que dice QUIÉN puede tocarlo y CÓMO. Esa etiqueta se llama permisos, y es la primera muralla de defensa de cualquier sistema. Entenderla es entender por dónde se cuela —o se frena— un ataque.",
      diagram: "archivo",
      bullets: [
        "Cada archivo tiene un dueño y un conjunto de permisos.",
        "Los permisos deciden quién lee, escribe o ejecuta.",
        "Un permiso mal puesto = un agujero de seguridad.",
      ],
    },
    {
      kind: "concept",
      title: "ls te muestra más que nombres",
      body:
        "Cuando corrés ls en ÑANDE, cada línea trae cuatro datos: los permisos, el dueño, el grupo y el nombre. Por ejemplo:  644 student users bienvenida.txt . Ese 644 es el permiso; student es el dueño. (En un Linux de verdad esto se pide con 'ls -l'; acá ls ya te lo muestra directo.) Leer esa línea es como leer el candado de una puerta antes de tocarla.",
      diagram: "archivo",
      bullets: [
        "Formato: PERMISOS  DUEÑO  GRUPO  NOMBRE.",
        "Las carpetas terminan en / ; los archivos no.",
        "Ese primer número (644, 755…) es la clave de todo.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: leé los permisos",
      body:
        "Corré ls en tu casa y mirá con calma la primera columna de cada línea: esos números y letras son los permisos de cada cosa.",
      command: "ls",
      explain:
        "Fijate que bienvenida.txt tiene 644 y documentos/ tiene 755 (una carpeta necesita el permiso de 'entrar', que es el 'ejecutar'). Ya no ves solo nombres: ves QUIÉN puede hacer QUÉ con cada archivo. Un pentester escanea esta columna buscando lo que quedó demasiado abierto.",
      diagram: "archivo",
    },
    {
      kind: "concept",
      title: "rwx: leer, escribir, ejecutar",
      body:
        "Los permisos son tres poderes: r (read, leer), w (write, escribir/cambiar) y x (execute, ejecutar/entrar). Y se dan a tres grupos de gente: al DUEÑO, al GRUPO y a los OTROS (todos los demás). En números, r vale 4, w vale 2, x vale 1, y se suman. Así 6 = 4+2 = leer y escribir; 7 = 4+2+1 = todo. Por eso 644 significa: dueño 6 (rw), grupo 4 (r), otros 4 (r).",
      diagram: "archivo",
      bullets: [
        "r=4 (leer) · w=2 (escribir) · x=1 (ejecutar). Se suman.",
        "Tres cifras: DUEÑO · GRUPO · OTROS.",
        "644 = dueño lee y escribe; el resto solo lee.",
      ],
    },
    {
      kind: "quiz",
      prompt: "Un archivo secreto.txt tiene permisos 600 (rw-------). Vos NO sos el dueño. ¿Podés leerlo?",
      options: [
        "No: 600 solo le da acceso al dueño; grupo y otros no tienen nada",
        "Sí, todos pueden leerlo siempre",
        "Sí, si estoy en el mismo grupo",
        "Solo si lo ejecuto primero",
      ],
      correct: 0,
      explain:
        "600 = 6 para el dueño (rw) y 0 (nada) para el grupo y para 'otros'. Solo el dueño (y root) lee o escribe ese archivo. Por eso 600 es el permiso típico de algo secreto: se guarda para uno solo. Ojo: un archivo de contraseñas con 644 —que 'otros' pueden leer— sería un agujero enorme.",
      diagram: "archivo",
    },
    {
      kind: "concept",
      title: "chmod: cambiar quién puede qué",
      body:
        "chmod ('change mode') cambia los permisos de un archivo. Se usa así: chmod <número> <archivo>. Por ejemplo, 'chmod 600 secreto.txt' deja el archivo solo para su dueño. 'chmod 755 script' permite que todos lo lean y ejecuten, pero solo el dueño lo modifica. Elegir bien ese número es literalmente ajustar la cerradura.",
      diagram: "archivo",
      bullets: [
        "chmod 600 → solo el dueño (para secretos).",
        "chmod 644 → dueño escribe, el resto solo lee.",
        "chmod 777 → TODOS pueden todo (¡casi siempre un error!).",
      ],
    },
    {
      kind: "build",
      goal: "Dejar el archivo secreto.txt accesible SOLO para su dueño",
      pieces: ["chmod", "600", "secreto.txt", "777", "rm"],
      answer: ["chmod", "600", "secreto.txt"],
      hint: "El comando es chmod, después el número de permiso que deja algo solo para el dueño (600), y al final el archivo.",
      explain:
        "chmod 600 secreto.txt deja el archivo con rw solo para el dueño y nada para los demás. El 777 era la trampa: da todo a todos, justo lo contrario de proteger un secreto. Y rm no cambia permisos: ¡borra! Elegir el número correcto es la diferencia entre proteger y regalar.",
    },
    {
      kind: "lab",
      title: "Practicá: creá, cerrá y verificá",
      body:
        "Vamos a hacer tres cosas encadenadas con ';' : crear un archivo (touch), cerrarlo para vos solo (chmod 600) y comprobar el cambio (ls). El ';' ejecuta las órdenes una tras otra.",
      command: "touch secreto.txt ; chmod 600 secreto.txt ; ls",
      explain:
        "Creaste secreto.txt, le pusiste permiso 600 y en el ls final ves '600 student users secreto.txt'. Acabás de proteger un archivo con tus propias manos. Esta es la defensa más básica y más ignorada: darle a cada archivo el permiso mínimo que necesita, ni uno más.",
      diagram: "archivo",
    },
    {
      kind: "concept",
      title: "root vs usuario común",
      body:
        "En una máquina hay muchos usuarios, pero uno manda sobre todos: root, el administrador, el superusuario. root puede leer y borrar CUALQUIER archivo, instalar programas, apagar la máquina. Un usuario común como student solo puede tocar lo suyo. Para hacer una tarea de administrador sin vivir como root, se usa 'sudo' (super-user do): pedís permiso de root por un ratito, solo para esa orden.",
      diagram: "privesc",
      bullets: [
        "root = puede TODO. student = puede lo suyo.",
        "sudo = pedir poder de root por una orden puntual.",
        "El sueño de un atacante es pasar de student a root.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: ¿qué usuario soy, en detalle?",
      body:
        "id te muestra tu identidad completa: tu número de usuario (uid) y a qué grupos pertenecés. Es como whoami, pero con la cédula entera. Corrélo.",
      command: "id",
      explain:
        "Ves tu uid y tus grupos: sos student, un usuario común, NO root. Tus grupos definen a qué archivos compartidos podés llegar. Esto es lo primero que estudia un atacante después de entrar: '¿qué soy y a qué grupos pertenezco?', porque de ahí salen las ideas para escalar hasta root.",
      diagram: "privesc",
    },
    {
      kind: "quiz",
      prompt: "¿Por qué conviene trabajar como usuario común (student) y no estar siempre logueado como root?",
      options: [
        "Porque si te equivocás o te engañan, el daño queda limitado",
        "Porque root es más lento",
        "Porque root no puede leer archivos",
        "Porque student puede hacer más cosas que root",
      ],
      correct: 0,
      explain:
        "root puede TODO, así que un error tonto —o un atacante que te engaña— actuando como root puede destruir o entregar la máquina entera. Como usuario común, el daño está acotado a lo tuyo. Por eso se usa sudo solo cuando hace falta: menos poder encendido todo el tiempo = menos que perder.",
      diagram: "privesc",
    },
    {
      kind: "concept",
      title: "SUID: el permiso peligroso (la 's' roja)",
      body:
        "A veces, en la columna de permisos, en vez de una x aparece una s: por ejemplo -rwsr-xr-x. Esa 's' es el bit SUID, y hace algo peligroso: cuando un usuario común ejecuta ese archivo, el programa corre con los poderes del DUEÑO (que muchas veces es root), no con los del usuario. Si ese programa está mal hecho, un student puede aprovecharlo para terminar siendo root. Eso es escalar privilegios.",
      diagram: "archivo",
      bullets: [
        "Una 's' donde iría la x = bit SUID.",
        "El programa corre con los poderes del DUEÑO, no del que lo ejecuta.",
        "Un SUID de root mal puesto es un camino directo a root (privesc).",
      ],
    },
    {
      kind: "concept",
      title: "La otra mitad: defender con permisos",
      body:
        "Saber esto obliga a defender mejor. La regla de oro es el 'privilegio mínimo': darle a cada archivo, usuario y programa SOLO lo que necesita, nada más. En concreto: nunca chmod 777 sin pensarlo, guardar los secretos en 600, no andar como root si no hace falta, y revisar qué archivos tienen SUID. Un hacker ético que encuentra un permiso flojo lo REPORTA y explica cómo cerrarlo; no lo aprovecha para robar.",
      diagram: "escudo",
      bullets: [
        "Privilegio mínimo: solo lo justo y necesario.",
        "Secretos en 600 · nada de 777 a lo loco · SUID bajo control.",
        "Encontrar un fallo se reporta, no se explota.",
      ],
    },
  ],
};

/* ------------------------------------------------------------------ *
 *  CURSO 3 — Buscar y filtrar como un pro (grep + pipes)             *
 * ------------------------------------------------------------------ */

const BUSCAR: Curso = {
  id: "c-linux-buscar",
  title: "Buscar y filtrar como un pro",
  subtitle: "Pipes, grep y redirección: cazá el dato que importa en un mar de texto.",
  level: "intermedio",
  skill: "linux",
  hue: 190,
  glyph: "search",
  reward: { xp: 165, coins: 120 },
  slides: [
    {
      kind: "concept",
      title: "El pipe | : la cinta transportadora",
      body:
        "El pipe (la barra vertical |) toma lo que SALE de un comando y se lo pasa como ENTRADA al siguiente, como una cinta transportadora en una fábrica. Así se arman cadenas: un comando produce mucho texto, el siguiente lo filtra, el otro lo cuenta. En vez de un comando gigante, encadenás varios chiquitos, cada uno experto en una tarea. Esa es la filosofía de Linux.",
      diagram: "terminal",
      bullets: [
        "comando1 | comando2 → la salida de 1 entra a 2.",
        "Se pueden encadenar varios: c1 | c2 | c3.",
        "Cada comando hace UNA cosa bien; el pipe los combina.",
      ],
    },
    {
      kind: "concept",
      title: "grep: el buscador de líneas",
      body:
        "grep lee un montón de texto y se queda SOLO con las líneas que contienen la palabra que buscás; tira todo lo demás. Casi nunca se usa solo: se pone después de un pipe, para filtrar la salida de otro comando. 'cat archivo | grep clave' significa: mostrame el archivo, pero dejame solo las líneas que dicen 'clave'. Es tu lupa para el CONTENIDO.",
      diagram: "archivo",
      bullets: [
        "grep <palabra> deja solo las líneas que la contienen.",
        "Se usa detrás de un pipe: ... | grep <palabra>.",
        "Perfecto para hallar una aguja en un pajar de texto.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: filtrá una sola línea",
      body:
        "El archivo documentos/primeros-pasos.md tiene muchas líneas. Vamos a pedir que salga entero (cat) pero quedarnos SOLO con la que habla de 'pwd', usando un pipe hacia grep.",
      command: "cat documentos/primeros-pasos.md | grep pwd",
      explain:
        "De todo el archivo, grep te dejó únicamente la línea que menciona pwd. Imaginá que en vez de un archivito fuera un registro de 10.000 líneas: grep te ahorra leerlas todas. Así se busca un error en un log, o una contraseña olvidada en una configuración.",
      diagram: "terminal",
    },
    {
      kind: "quiz",
      prompt: "En la cadena  cat notas.txt | grep clave  , ¿qué hace exactamente el pipe (|)?",
      options: [
        "Le pasa la salida de cat como entrada a grep, para que grep la filtre",
        "Borra el archivo notas.txt",
        "Ejecuta cat y grep en máquinas distintas",
        "Ordena las líneas alfabéticamente",
      ],
      correct: 0,
      explain:
        "El pipe conecta dos comandos: la salida de cat (todo el archivo) entra directo a grep, que se queda solo con las líneas que dicen 'clave'. No borra ni ordena nada: solo transporta el texto de uno al otro. Con esa idea simple se arman herramientas potentísimas.",
      diagram: "terminal",
    },
    {
      kind: "build",
      goal: "Mostrar bienvenida.txt pero quedarte solo con las líneas que mencionan 'learn'",
      pieces: ["cat", "bienvenida.txt", "|", "grep", "learn", "find", "ls"],
      answer: ["cat", "bienvenida.txt", "|", "grep", "learn"],
      hint: "Primero mostrás el archivo (cat bienvenida.txt), después un pipe (|), y al final filtrás con grep la palabra learn.",
      explain:
        "cat bienvenida.txt | grep learn muestra el archivo y deja solo las líneas con 'learn'. find y ls eran señuelos: find busca por NOMBRE de archivo (no filtra contenido) y ls solo lista carpetas. El combo cat + pipe + grep es el pan de cada día de quien caza datos en la terminal.",
    },
    {
      kind: "concept",
      title: "find: la lupa para NOMBRES",
      body:
        "Hay dos formas de buscar. grep busca dentro del CONTENIDO de los archivos (qué dicen). find, en cambio, recorre carpetas enteras buscando por el NOMBRE del archivo: en un Linux real, 'find / -name \"*.conf\"' encuentra todos los archivos de configuración del sistema, estén donde estén. Son primos: find te dice DÓNDE está algo, grep te dice QUÉ dice adentro. Acá vamos a dominar grep, que es el que más se usa cazando secretos.",
      diagram: "archivo",
      bullets: [
        "grep = buscar por contenido (qué dice el archivo).",
        "find = buscar por nombre/ubicación (dónde está el archivo).",
        "Juntos: find localiza el archivo, grep lee lo que importa.",
      ],
    },
    {
      kind: "concept",
      title: "Redirección: > guarda, >> agrega",
      body:
        "Normalmente un comando escribe su resultado en la pantalla. Con > lo mandás a un ARCHIVO en vez de a la pantalla: 'echo hola > nota.txt' guarda 'hola' dentro de nota.txt (y pisa lo que hubiera). Con >> lo AGREGA al final, sin borrar lo anterior. Así se arman archivos, se guardan resultados de un escaneo, se van juntando pistas. La flecha manda el texto a donde vos quieras.",
      diagram: "terminal",
      bullets: [
        "comando > archivo → guarda la salida (pisa lo que había).",
        "comando >> archivo → agrega al final (no borra).",
        "Sin flecha, el resultado va a la pantalla.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: guardá y volvé a leer",
      body:
        "Vamos a crear un archivo escribiéndole una línea con > , y después leerlo con cat para comprobar que quedó guardado. Todo en una sola cadena con ';'.",
      command: "echo \"clave: girasol77\" > secreto.txt ; cat secreto.txt",
      explain:
        "Con > guardaste el texto 'clave: girasol77' dentro de secreto.txt, y cat te lo devolvió. Acabás de crear un archivo con contenido desde la terminal. Fijate el detalle de seguridad: dejaste una contraseña escrita en un archivo de texto plano… justo lo que un atacante SUEÑA con encontrar en un sistema ajeno.",
      diagram: "terminal",
    },
    {
      kind: "quiz",
      prompt: "Ya tenés notas.txt con datos importantes. Querés SUMARLE una línea sin borrar lo de antes. ¿Qué usás?",
      options: [
        ">>  (agrega al final, conserva lo anterior)",
        ">   (pisa todo lo que había)",
        "grep (no escribe, solo filtra)",
        "rm  (borra el archivo)",
      ],
      correct: 0,
      explain:
        ">> agrega al final sin tocar lo que ya estaba. Un solo > habría PISADO todo el contenido anterior con la línea nueva: un error clásico que borra horas de trabajo. grep no escribe (solo filtra) y rm directamente borra. Un símbolo de más (>>) salva el día.",
      diagram: "terminal",
    },
    {
      kind: "lab",
      title: "Practicá: cazá la línea que importa",
      body:
        "Última práctica: imaginá que documentos/primeros-pasos.md es un manual larguísimo y solo te interesa la parte de la RED. Filtralo con grep buscando 'red'.",
      command: "cat documentos/primeros-pasos.md | grep red",
      explain:
        "De todo el manual, grep te dejó solo la sección de la red. Ese es el superpoder: en un archivo de configuración gigante, 'cat config | grep password' te muestra en un segundo si alguien dejó una clave escrita ahí. Cazar datos así es medio pentesting; el otro medio es la defensa: nunca guardes contraseñas en archivos de texto plano, porque grep las encuentra al instante.",
      diagram: "terminal",
    },
    {
      kind: "concept",
      title: "Repaso: encadenar es pensar",
      body:
        "Ya tenés las tres herramientas que convierten una montaña de texto en la respuesta exacta:\n\n• El pipe | conecta comandos, como una cinta.\n• grep filtra por contenido; find (en Linux real) busca por nombre.\n• > y >> guardan y acumulan resultados.\n\nY podés seguir encadenando: '... | grep error | wc -l' te cuenta cuántas líneas de error hay. Pensar en cadenas —producir, filtrar, contar— es pensar como un profesional de la terminal. En seguridad, quien filtra mejor, encuentra primero.",
      diagram: "escudo",
      bullets: [
        "Pipe + grep + redirección = cazar datos a escala.",
        "Se puede seguir: ... | grep x | wc -l (contar líneas).",
        "Defensa: no guardes secretos en texto plano; grep los delata.",
      ],
    },
  ],
};

export const LINUX_COURSES: Curso[] = [TERMINAL, ARCHIVOS, BUSCAR];
