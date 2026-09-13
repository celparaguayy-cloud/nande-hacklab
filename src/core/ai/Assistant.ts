import type { VirtualKernel } from "../VirtualKernel";
import { VirtualTerminal } from "../terminal/VirtualTerminal";

/**
 * Assistant — Ñandú deja de ser un chatbot que "muestra" para ser un AGENTE
 * que HACE. Interpreta lo que pedís y, cuando es accionable, ejecuta el
 * comando REAL del juego (a través de la terminal virtual) y te devuelve la
 * salida verdadera — no un texto de relleno. Si es una pregunta conceptual,
 * responde con contenido de verdad (incluye escribir código). Determinista y
 * offline; el AIService potente (Groq/Gemini) sigue disponible por encima.
 *
 * Esto ataca el problema de raíz: las herramientas no son vitrinas, hacen algo.
 */

export interface AssistantAction {
  /** Comando de la terminal virtual que ejecuta la acción. */
  command: string;
  /** Texto del botón que lo dispara. */
  label: string;
}

export interface AssistantReply {
  text: string;
  /** Qué tipo de respuesta es (para decidir si sumar la IA conectada). */
  kind: "action" | "code" | "knowledge" | "chat";
  /** Una acción ejecutable de un toque (corre un comando real). */
  action?: AssistantAction;
  /** App del escritorio que conviene abrir para esto. */
  openApp?: string;
}

export class Assistant {
  private term: VirtualTerminal;

  constructor(kernel: VirtualKernel) {
    this.term = new VirtualTerminal(kernel);
  }

  /** Ejecuta un comando REAL del juego y devuelve su salida verdadera. */
  run(command: string): string {
    return this.term.execute(command);
  }

  /**
   * Interpreta el mensaje y decide: acción ejecutable, código, o respuesta
   * conceptual. Todo determinista; sin red.
   */
  respond(userText: string): AssistantReply {
    const u = userText.toLowerCase().trim();

    // 1) Intenciones ACCIONABLES → comando real de un toque.
    const action = this.matchAction(u);
    if (action) return { ...action, kind: "action" };

    // 2) Pedidos de código → código real.
    const code = this.matchCode(u);
    if (code) return { text: code, kind: "code" };

    // 3) Preguntas conceptuales → respuesta con contenido de verdad.
    const knowledge = this.matchKnowledge(u);
    if (knowledge) return { text: knowledge, kind: "knowledge" };

    // 4) Saludos / arranque.
    if (/\b(hola|buenas|hey|qué tal|que tal|holaa?|buen[oa]s)\b/.test(u) || u === "") {
      return {
        text:
          "¡Hola! Soy Ñandú y puedo HACER cosas, no sólo explicar. Probá:\n" +
          "• \"escaneá objetivo.corp.nande\" (corro el nmap)\n" +
          "• \"mostrame el SOC\" o \"qué técnicas detectaron\"\n" +
          "• \"investigá el incidente\" (DFIR)\n" +
          "• \"dame un reto\" · \"escribime un port scanner en python\"",
        kind: "chat",
        action: { command: "universo", label: "▶ Ver todo lo que puedo hacer" },
      };
    }

    // 5) Fallback ÚTIL (nunca relleno): ofrezco el índice ejecutable.
    return {
      text:
        "No lo tengo mapeado como acción directa, pero puedo ejecutarte cualquier " +
        "herramienta. Decime qué querés lograr (escanear, investigar, un reto, " +
        "código) o mirá el índice del universo.",
      kind: "chat",
      action: { command: "universo", label: "▶ Ver el índice del universo" },
    };
  }

  /* ---------------------------------------------------- intención: acción */

  private matchAction(u: string): Omit<AssistantReply, "kind"> | null {
    // Escaneo de puertos.
    const scan = u.match(/(?:escane[aá]|scan|nmap)\s+([a-z0-9.\-_]+\.[a-z]{2,}|[0-9.]+)/);
    if (scan) {
      return { text: `Escaneo ${scan[1]} con nmap. Corré la acción:`, action: { command: `nmap ${scan[1]}`, label: `▶ nmap ${scan[1]}` } };
    }
    if (/\b(nmap|escane|puertos?)\b/.test(u)) {
      return { text: "Te escaneo el data center. Corré:", action: { command: "nmap midc.nande", label: "▶ nmap midc.nande" } };
    }
    // Tráfico / sniffing.
    if (/\b(sniff|tr[aá]fico|paquetes?|nandeshark|wireshark|credencial)\b/.test(u)) {
      return { text: "Miro el tráfico real capturado (incluye credenciales en claro):", action: { command: "sniff", label: "▶ sniff (ver el cable)" }, openApp: "shark" };
    }
    // SOC / MITRE.
    if (/\b(soc|mitre|att&?ck|detecci[oó]n|t[eé]cnicas?|alertas?)\b/.test(u)) {
      return { text: "Te muestro las técnicas ATT&CK detectadas por lo que pasó:", action: { command: "mitre", label: "▶ mitre" }, openApp: "soc" };
    }
    // DFIR.
    if (/\b(dfir|incidente|investig|forense|reconstru)\b/.test(u)) {
      return { text: "Reconstruyo el incidente desde los eventos reales:", action: { command: "dfir", label: "▶ dfir" }, openApp: "dfir" };
    }
    // Red team.
    if (/\b(red\s?team|adversario|rival|atacante|bot)\b/.test(u)) {
      return { text: "Estado del adversario NPC (y cómo expulsarlo):", action: { command: "redteam", label: "▶ redteam" } };
    }
    // AD / dominio.
    if (/\b(dominio|active directory|\bad\b|bloodhound|nandeblood|kerberoast|domain admin)\b/.test(u)) {
      return { text: "Grafo del dominio y la ruta a Domain Admins:", action: { command: "nandeblood", label: "▶ nandeblood" }, openApp: "blood" };
    }
    // OPSEC / anonimato.
    if (/\b(opsec|an[oó]nimo|anonimato|rastro|calor|tor)\b/.test(u)) {
      return { text: "Tu rastro y exposición ahora mismo:", action: { command: "opsec", label: "▶ opsec" }, openApp: "anon" };
    }
    // Contenedores.
    if (/\b(contenedor|docker|kubernetes|k8s|pod|nandec)\b/.test(u)) {
      return { text: "Listo los contenedores (buscá secretos y escape):", action: { command: "nandec ps", label: "▶ nandec ps" }, openApp: "containers" };
    }
    // Reversing.
    if (/\b(reversing|crackme|ingenier[ií]a inversa|xor|desensambl)\b/.test(u)) {
      return { text: "Te resuelvo el crackme por fuerza bruta de la clave:", action: { command: "reverse brute", label: "▶ reverse brute" }, openApp: "reverse" };
    }
    // Reto.
    if (/\b(reto|desaf[ií]o|ctf|pr[aá]ctica|practicar)\b/.test(u)) {
      return { text: "Te preparo un reto con bandera real:", action: { command: "reto", label: "▶ reto" } };
    }
    // Defensa / contener.
    if (/\b(defen|blue team|contener|incidentes?)\b/.test(u)) {
      return { text: "Estado de tu defensa (Blue Team):", action: { command: "defensa", label: "▶ defensa" } };
    }
    // Misiones / progreso.
    if (/\b(misi[oó]n|misiones|objetivo|qu[eé] hago|empezar)\b/.test(u)) {
      return { text: "Tus misiones activas:", action: { command: "missions", label: "▶ missions" } };
    }
    return null;
  }

  /* ---------------------------------------------------- intención: código */

  private matchCode(u: string): string | null {
    const wantsCode = /\b(c[oó]digo|programa|script|escrib[ií]|hac[eé]me|dame).*(python|javascript|js|bash|scanner|escaner|port)/.test(u)
      || /\b(python|javascript|bash)\b/.test(u) && /\b(c[oó]digo|script|programa|ejemplo)\b/.test(u);
    if (!wantsCode) return null;

    if (/python/.test(u) && /(scan|escan|port|puerto)/.test(u)) {
      return [
        "Port scanner simple en Python (educativo, para laboratorio):",
        "```python",
        "import socket",
        "",
        "def scan(host, ports):",
        "    abiertos = []",
        "    for p in ports:",
        "        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)",
        "        s.settimeout(0.5)",
        "        if s.connect_ex((host, p)) == 0:",
        "            abiertos.append(p)",
        "        s.close()",
        "    return abiertos",
        "",
        'print(scan("127.0.0.1", range(20, 1025)))',
        "```",
        "En ÑANDE el equivalente jugable es: nmap <host>.",
      ].join("\n");
    }
    if (/python/.test(u)) {
      return [
        "Ejemplo en Python (fuerza bruta de un XOR de un byte, como en reversing):",
        "```python",
        "cipher = bytes.fromhex('...')  # bytes del binario",
        "for k in range(1, 256):",
        "    out = bytes(b ^ k for b in cipher)",
        "    if out.startswith(b'ND{'):",
        "        print(k, out.decode())",
        "```",
        "El equivalente jugable: reverse brute.",
      ].join("\n");
    }
    if (/bash/.test(u)) {
      return [
        "Bash: barrido de hosts vivos (educativo):",
        "```bash",
        'for i in $(seq 1 254); do',
        '  ping -c1 -W1 10.10.0.$i >/dev/null && echo "10.10.0.$i vivo"',
        "done",
        "```",
      ].join("\n");
    }
    // JS por defecto: una tool del IDE de ÑANDE.
    return [
      "En ÑANDE programás tools en JavaScript que corren en el sandbox. Ejemplo:",
      "```javascript",
      "// tool: resuelve hosts y escanea",
      "export default function(nande, args) {",
      "  const host = args[0];",
      "  const ports = nande.scan(host);",
      "  return `Puertos abiertos en ${host}: ` + ports.map(p => p.port).join(', ');",
      "}",
      "```",
      "Instalala con: tool-install <archivo>  y corré: run <nombre> <host>",
    ].join("\n");
  }

  /* ------------------------------------------------ intención: conocimiento */

  private matchKnowledge(u: string): string | null {
    const kb: [RegExp, string][] = [
      [/sqli|inyecci[oó]n sql/, "Inyección SQL: metés SQL en un campo que el server concatena sin validar. Probá una comilla ' en el login: si rompe, es vulnerable. Para saltar el login: ' OR '1'='1' -- . En ÑANDE probalo con curl contra login.redix.nande o banco.nande."],
      [/\bxss\b|cross.?site/, "XSS: el sitio refleja lo que escribís sin escaparlo, y el navegador lo ejecuta. Probá <script>alert(1)</script> en un buscador. Jugable en blog.yvoty.nande."],
      [/idor/, "IDOR: el sitio te deja pedir un recurso por id sin chequear que sea tuyo. Cambiá ?id=1 por ?id=7 y mirá datos ajenos. Jugable en fotos.arandu.nande."],
      [/kerberoast/, "Kerberoasting: pedís el ticket (TGS) de una cuenta de servicio con SPN y lo crackeás offline. Si la clave es débil, poseés la cuenta. Jugable: kerberoast SVC-SQL@NANDE.LOCAL, después crack-tgs."],
      [/pivot|red interna|lateral/, "Pivoting: comprometés un host de borde y desde él alcanzás la red interna que no se ve de afuera. Jugable: connect server.nande soporte Verano2024, y adentro nmap."],
      [/jwt|token/, "JWT: si el header dice alg:none, la firma no se valida y podés forjar un token con rol admin. Jugable en api.vortex.nande."],
      [/ssrf/, "SSRF: el server hace una petición a la URL que vos le das. Apuntá a algo interno (127.0.0.1, 169.254.169.254) para tocar lo que no deberías."],
      [/mitre|att&?ck/, "MITRE ATT&CK es un mapa de técnicas de atacantes (T1110 fuerza bruta, T1558.003 kerberoasting…). En ÑANDE, cada ataque tuyo enciende su técnica: mirá 'mitre'."],
      [/opsec|an[oó]nimo|anonimato/, "OPSEC: cuidar tu rastro. Si atacás sin la red de anonimato, tu IP queda expuesta, sube el calor y cae una redada. Activá con 'anon on' y verificá con 'opsec'."],
    ];
    for (const [re, ans] of kb) if (re.test(u)) return ans;
    return null;
  }
}
