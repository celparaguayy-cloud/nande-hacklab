import type { Curso } from "../courseTypes";

/**
 * Módulo "Web Moderno". Vulnerabilidades web de la era cloud, ligadas a apps
 * REALES del motor HTTP de ÑANDE (src/core/http/apps/labs2.ts): SSRF con fuga de
 * metadata de la nube (preview.vortex.nande), JWT (api.vortex.nande) y open
 * redirect (link.gulu.nande). Cada lab golpea el mismo mundo que ve el jugador y
 * captura una bandera REAL. 100% offline: alta fidelidad dentro del sandbox.
 */

const WEBMOD_SSRF: Curso = {
  id: "c-webmod-ssrf",
  title: "SSRF: que el servidor pida por vos",
  subtitle: "Hacé que la app traiga una URL que vos elegís y alcanzá lo interno que tu navegador no ve: la metadata de la nube.",
  level: "avanzado",
  skill: "web",
  hue: 275,
  glyph: "code",
  reward: { xp: 270, coins: 210 },
  slides: [
    {
      kind: "concept",
      title: "¿Qué es un SSRF?",
      body:
        "SSRF (Server-Side Request Forgery) es cuando una app recibe una URL tuya y el SERVIDOR la va a buscar por vos. Suena inocente (un 'previsualizador de enlaces', un importador de imágenes, un webhook)… pero la petición sale desde el servidor, que está parado en la RED INTERNA. Así alcanzás lo que tu navegador no puede: servicios en localhost, paneles internos, otras máquinas de la red, y —el premio de la era cloud— el servicio de metadata.",
      diagram: "ssrf",
      bullets: [
        "La app trae la URL que vos elegís, desde el servidor.",
        "El servidor vive en la red interna: alcanza lo que vos no.",
        "Previsualizadores, importadores y webhooks son candidatos.",
      ],
    },
    {
      kind: "concept",
      title: "El premio: la metadata de la nube",
      body:
        "Toda instancia en la nube consulta un servicio interno de metadata en la IP 169.254.169.254 para leer su config… y sus credenciales IAM temporales. En la versión vieja (IMDSv1) respondía a cualquier GET sin autenticar. Si una app con SSRF corre en esa instancia, le pedís 169.254.169.254 y te devuelve las llaves de la nube. Así fue la brecha de Capital One (2019): un SSRF llegó a IMDSv1 y exfiltró datos de +100 millones de personas.",
      diagram: "cloud",
      bullets: [
        "169.254.169.254 = metadata; da credenciales IAM temporales.",
        "IMDSv1 respondía a un GET pelado: justo lo que el SSRF provoca.",
        "Capital One 2019: SSRF → IMDSv1 → +100M de registros.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué un SSRF es tan peligroso incluso si la app 'solo previsualiza enlaces'?",
      options: [
        "Porque la petición la hace el servidor desde la red interna, alcanzando destinos que el atacante no ve directamente",
        "Porque borra la base de datos",
        "Porque cambia el DNS de tu casa",
        "Porque solo afecta imágenes",
      ],
      correct: 0,
      explain:
        "El poder del SSRF no es 'traer una página': es QUIÉN la trae. El servidor está dentro de la red y puede hablarle a localhost, a la metadata y a hosts internos. Vos manejás ese brazo largo desde afuera. Por eso un inocente previsualizador se vuelve una llave a lo interno.",
      diagram: "ssrf",
    },
    {
      kind: "concept",
      title: "Otros destinos y bypass de filtros",
      body:
        "Más allá de la metadata: 127.0.0.1/localhost (paneles de admin que escuchan solo local), rangos internos (10.0.0.0/8, 192.168…), y servicios sin autenticar que confían en 'viene de adentro'. Cuando hay filtros, los atacantes los esquivan: representaciones alternativas de la IP (decimal, hex), redirecciones (la URL permitida redirige a la interna), DNS rebinding, o el truco del 0.0.0.0. Un filtro por lista negra casi siempre se puede rodear; por eso la defensa correcta es lista blanca.",
      diagram: "ssrf",
      bullets: [
        "localhost, rangos internos y servicios que confían 'en lo interno'.",
        "Bypass: IP en decimal/hex, redirecciones, DNS rebinding, 0.0.0.0.",
        "Lista negra se rodea; la defensa real es lista blanca.",
      ],
    },
    {
      kind: "lab",
      title: "Robá la credencial de la metadata",
      body:
        "Vortex Preview (preview.vortex.nande) previsualiza cualquier URL. Pedile la metadata de la nube y mirá qué cae.",
      command: "curl \"http://preview.vortex.nande/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/rol-admin\"",
      explain:
        "El servidor trae la metadata interna y te devuelve la credencial IAM: capturás ND{ssrf_metadata_robada}. En la vida real, esa SecretAccessKey te da acceso a la nube con los permisos del rol de la instancia. La defensa es IMDSv2 y filtrar a dónde puede salir el servidor.",
      diagram: "cloud",
    },
    {
      kind: "concept",
      title: "Defensa: lista blanca y metadata endurecida",
      body:
        "Frenar un SSRF: validar el destino con LISTA BLANCA de dominios/host permitidos (no lista negra), resolver el nombre y comprobar que la IP final no sea interna (169.254.0.0/16, 127.0.0.0/8, RFC1918) incluso tras redirecciones, no reenviar las respuestas crudas al usuario, y segmentar la red para que el servidor no alcance lo que no debe. En la nube, además: exigir IMDSv2 y bajar el hop limit. Capas: ninguna sola alcanza.",
      diagram: "escudo",
      bullets: [
        "Lista blanca de destinos; verificar la IP final (y tras redirects).",
        "Bloquear 169.254/127/RFC1918; no devolver la respuesta cruda.",
        "En la nube: IMDSv2 + hop limit; segmentar la red.",
      ],
    },
  ],
};

const WEBMOD_JWT: Curso = {
  id: "c-webmod-jwt",
  title: "JWT: forjar la sesión",
  subtitle: "El token que dice quién sos se puede reescribir: alg:none, secretos débiles, y cómo forjar un admin.",
  level: "avanzado",
  skill: "web",
  hue: 45,
  glyph: "mask",
  reward: { xp: 260, coins: 210 },
  slides: [
    {
      kind: "concept",
      title: "Anatomía de un JWT",
      body:
        "Un JSON Web Token son tres partes separadas por puntos: HEADER (dice el algoritmo, p. ej. HS256), PAYLOAD (los datos: usuario, rol, expiración) y FIRMA (sella las dos primeras con una clave). El servidor confía en el token porque la firma prueba que no lo tocaron. Toda la seguridad del JWT descansa en esa firma: si el servidor la verifica mal, el token deja de ser confiable y vos podés reescribir el payload (por ejemplo, rol: admin).",
      diagram: "jwt",
      bullets: [
        "header.payload.firma (3 partes en base64url).",
        "El payload lleva tu rol; la firma lo sella.",
        "Si la verificación de la firma falla, el token es reescribible.",
      ],
    },
    {
      kind: "concept",
      title: "Bug 1: alg:none (confusión de algoritmo)",
      body:
        "El header dice qué algoritmo usar. Algunas librerías, mal configuradas, aceptan `alg: none`: un token que declara 'no tengo firma'… ¡y lo aceptan igual! Entonces forjás un token con `alg:none` y `rol:admin`, sin firma, y el servidor te cree. Es un clásico que sigue apareciendo. La causa raíz: el servidor debería EXIGIR el algoritmo que espera (p. ej. RS256) y rechazar cualquier otro, en vez de confiar en lo que diga el atacante en el header.",
      diagram: "jwt",
      bullets: [
        "alg:none = 'sin firma'; una lib mal hecha lo acepta.",
        "Forjás rol:admin sin firmar nada y entrás.",
        "Cura: el servidor fija el algoritmo esperado, no lo lee del token.",
      ],
    },
    {
      kind: "concept",
      title: "Bug 2: secreto débil (HS256)",
      body:
        "Si el token usa HS256 (firma simétrica) con una clave DÉBIL ('secret', 'clave123', el nombre de la empresa), se puede CRACKEAR offline: probás claves del diccionario hasta que una valide la firma. Con la clave en mano, firmás tus propios tokens válidos con el rol que quieras. Dos pasos: `jwt crack <token>` encuentra la clave, `jwt forge <clave> rol=admin` fabrica el pase de administrador.",
      diagram: "jwt",
      bullets: [
        "HS256 + clave débil = crackeable offline (diccionario).",
        "Con la clave, firmás tokens válidos a gusto.",
        "jwt crack → jwt forge rol=admin.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Cuál es la raíz del bug de alg:none?",
      options: [
        "Que el servidor confía en el algoritmo que declara el token, en vez de exigir el que espera",
        "Que el payload está en base64",
        "Que el token es muy largo",
        "Que usa HTTPS",
      ],
      correct: 0,
      explain:
        "El header lo controla el atacante. Si el servidor 'hace lo que diga el header' y el header dice none, se salta la firma. La verificación correcta fija el algoritmo esperado del lado servidor y rechaza todo lo demás, sin mirar lo que pida el token.",
      diagram: "jwt",
    },
    {
      kind: "build",
      goal: "Forjar un token de administrador con la clave ya conocida",
      pieces: ["jwt", "forge", "nande123", "rol=admin", "usuario=admin", "--brute"],
      answer: ["jwt", "forge", "nande123", "rol=admin", "usuario=admin"],
      hint: "El verbo es forge; después la clave, y los campos del payload como clave=valor.",
      explain:
        "`jwt forge nande123 rol=admin usuario=admin` firma un token con esa clave y rol de administrador. Como la firma valida con la clave correcta, el servidor lo acepta como legítimo. Antes, para obtener la clave, se usa `jwt crack <token>`.",
    },
    {
      kind: "lab",
      title: "Forjá un pase de administrador",
      body: "Con la clave conocida, fabricá un token que diga que sos admin y mirá qué pasa.",
      command: "jwt forge nande123 rol=admin usuario=admin",
      explain:
        "Forjás un token de admin válido y capturás ND{jwt_forged_admin}: el servidor te creería. En la app de JWT (api.vortex.nande) el otro camino es alg:none. La defensa es verificar bien la firma, exigir el algoritmo esperado y usar claves fuertes (o firma asimétrica RS256).",
      diagram: "jwt",
    },
    {
      kind: "concept",
      title: "Defensa: verificar bien y expirar",
      body:
        "JWT seguro: fijar el algoritmo esperado del lado servidor (nunca aceptar 'none' ni dejar que el header elija), claves largas y aleatorias (o firma asimétrica RS256/EdDSA con clave pública para verificar), validar siempre exp (expiración), aud (audiencia) e iss (emisor), y mantener los tokens cortos con rotación/refresh. Y nunca meter secretos en el payload: va firmado, no cifrado — cualquiera lo lee.",
      diagram: "escudo",
      bullets: [
        "Algoritmo fijo del lado servidor; jamás 'none'.",
        "Claves fuertes o RS256/EdDSA; validar exp/aud/iss.",
        "El payload va firmado, no cifrado: nada de secretos ahí.",
      ],
    },
  ],
};

const WEBMOD_REDIRECT: Curso = {
  id: "c-webmod-redirect",
  title: "Open redirect y phishing",
  subtitle: "Un enlace que empieza en un dominio de confianza y termina en el sitio del atacante: así se arma un phishing creíble.",
  level: "intermedio",
  skill: "web",
  hue: 330,
  glyph: "comment",
  reward: { xp: 200, coins: 160 },
  slides: [
    {
      kind: "concept",
      title: "¿Qué es un open redirect?",
      body:
        "Muchas apps redirigen después de una acción: '?next=/panel' tras el login, '?url=' en un acortador. El bug (open redirect) es cuando aceptan CUALQUIER destino sin validar, incluido uno externo. Por sí solo no roba datos… pero regala algo valiosísimo para el phishing: un enlace que arranca en un dominio de CONFIANZA y termina en el sitio del atacante, sin que la víctima lo note.",
      diagram: "phishing",
      bullets: [
        "?next= / ?url= que acepta cualquier destino, también externo.",
        "No roba datos solo, pero habilita phishing creíble.",
        "Enlace de confianza → destino del atacante, sin aviso.",
      ],
    },
    {
      kind: "concept",
      title: "Por qué importa: la confianza prestada",
      body:
        "La gente mira el PRINCIPIO del enlace. Si ve 'link.gulu.nande/...', confía, porque conoce gulu.nande. Un open redirect convierte esa confianza en un arma: el enlace es legítimo al empezar y redirige a una página de login falsa idéntica. Además, los open redirects se encadenan: roban tokens de OAuth (vía redirect_uri), evaden filtros de SSRF, y saltan validaciones que solo miran el dominio inicial. Un bug 'menor' que habilita ataques mayores.",
      diagram: "phishing",
      bullets: [
        "La víctima confía en el dominio inicial del enlace.",
        "Se encadena: robo de tokens OAuth, bypass de filtros.",
        "Bug 'menor' que potencia phishing y otros ataques.",
      ],
    },
    {
      kind: "quiz",
      prompt: "¿Por qué un open redirect ayuda tanto al phishing?",
      options: [
        "Porque el enlace empieza en un dominio de confianza y la víctima no nota que termina en el sitio del atacante",
        "Porque descifra contraseñas",
        "Porque apaga el servidor",
        "Porque instala un antivirus",
      ],
      correct: 0,
      explain:
        "El phishing vive de la confianza. Un enlace que arranca en un dominio conocido pasa el primer filtro mental de la víctima; el redirect la lleva al sitio falso sin que lo note. La legitimidad del dominio inicial es, justamente, lo que el open redirect presta al atacante.",
      diagram: "phishing",
    },
    {
      kind: "concept",
      title: "Dónde aparece",
      body:
        "Los open redirects se esconden en lugares cotidianos: el '?next=' del login, los enlaces de 'cerrar sesión y volver', los acortadores, los 'click-trackers' de mails de marketing, y los redirect_uri de OAuth/SSO (acá son especialmente peligrosos, porque pueden filtrar el token de autenticación). Buscá cualquier parámetro que controle a dónde te manda la app después: si acepta un destino externo, es explotable.",
      diagram: "phishing",
      bullets: [
        "?next=, 'volver', acortadores, trackers de mail.",
        "redirect_uri de OAuth/SSO: puede filtrar el token.",
        "Cualquier parámetro que decida 'a dónde vas después'.",
      ],
    },
    {
      kind: "lab",
      title: "Demostrá el redirect a un sitio externo",
      body:
        "link.gulu.nande es un acortador que te manda a ?next= sin validar. Armá un enlace 'de gulu' que lleve afuera.",
      command: "curl \"http://link.gulu.nande/go?next=http://robo-cuentas.ejemplo.test/login\"",
      explain:
        "El acortador redirige a un dominio externo sin avisar: capturás ND{open_redirect}. Ese enlace, empezando en gulu.nande, es un phishing listo para usar. La defensa es validar el destino contra una lista blanca y preferir redirecciones relativas.",
      diagram: "phishing",
    },
    {
      kind: "concept",
      title: "Defensa: destinos controlados",
      body:
        "Cerrar el open redirect: usar redirecciones RELATIVAS (solo rutas dentro del sitio, nunca una URL completa del usuario), o validar el destino contra una LISTA BLANCA de rutas/dominios permitidos. Si hay que ir afuera, mostrar una página intermedia que avise 'estás saliendo del sitio'. Y en OAuth, registrar y exigir redirect_uri exactos (sin comodines). La regla: el usuario no decide a qué dominio lo mandás.",
      diagram: "escudo",
      bullets: [
        "Redirecciones relativas; nunca una URL completa del usuario.",
        "Lista blanca de destinos; página 'estás saliendo' si hay que ir afuera.",
        "OAuth: redirect_uri exactos, sin comodines.",
      ],
    },
  ],
};

export const WEB_MODERNO_COURSES: Curso[] = [
  WEBMOD_SSRF,
  WEBMOD_JWT,
  WEBMOD_REDIRECT,
];
