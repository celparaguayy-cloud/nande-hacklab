import type {
  AIProvider,
  AIMessage,
  AIGenerateOptions,
  AIGenerateResult,
} from "./AIProvider";

/**
 * OfflineProvider — la IA que funciona SIN conexión ni clave. Es
 * determinista (misma entrada → misma respuesta) y no hace ninguna llamada de
 * red: respeta el aislamiento del juego. No es un modelo gigante; es un
 * respondedor con reglas y plantillas, pensado para que los NPC y el tutor
 * digan algo coherente y útil aunque el jugador nunca ponga una API key.
 *
 * Cuando el jugador conecta su propia clave (Groq/Gemini), el AIService usa
 * ese proveedor; si no, cae acá y el juego sigue igual.
 */
export class OfflineProvider implements AIProvider {
  // eslint-disable-next-line @typescript-eslint/require-await
  async generate(
    messages: AIMessage[],
    _options?: AIGenerateOptions,
  ): Promise<AIGenerateResult> {
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const lastUser =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    return {
      text: this.reply(system, lastUser),
      model: "nande-offline",
    };
  }

  private reply(system: string, user: string): string {
    const u = user.toLowerCase().trim();
    const esTutor = /tutor|mentor|profesor|mani/i.test(system);

    if (!u) {
      return esTutor
        ? "Contame qué estás intentando hackear y te doy la primera pista."
        : "¿Qué necesitás?";
    }

    // Saludos.
    if (/\b(hola|buenas|qué tal|que tal|hey|holaa?)\b/.test(u)) {
      return esTutor
        ? "¡Hola! Soy tu guía. Decime en qué lab estás y avanzamos de a poco."
        : "¡Hola! ¿En qué andás?";
    }

    // Temas de hacking: dar una pista útil (offline, determinista).
    const pistas: [RegExp, string][] = [
      [/sqli|inyecci[oó]n sql|union|login/, "Probá una comilla en el usuario: si el login se rompe, es SQLi. Después `' OR '1'='1' -- ` para saltar la validación."],
      [/xss|script|alert/, "Si lo que escribís se refleja tal cual en la página, probá <script>alert(1)</script>."],
      [/idor|album|id=/, "Cambiá el número del ?id= y fijate si ves datos de otra persona. Ese es el IDOR."],
      [/traversal|\.\.\/|archivo/, "Meté ../ para salir de la carpeta pública y leé un archivo de config con secretos."],
      [/jwt|token/, "Mirá el header del JWT: si acepta alg:none podés forjar uno con rol admin, sin firma."],
      [/ssrf|interno|metadata/, "El servidor pide la URL por vos: apuntá a 169.254.169.254 o a 127.0.0.1 para tocar lo interno."],
      [/nmap|puerto|escane/, "Escaneá con `nmap <host>`. Si un puerto está `closed`, quizá el servicio está apagado; `filtered` es firewall."],
      [/pivot|interna|remoto|ssh|connect/, "Comprometé un host, `connect` con sus credenciales, y desde adentro `nmap` te muestra la red interna."],
      [/pista|ayuda|no s[eé]|atasca|trabado/, "Volvé a lo básico: ¿qué ves en la página o en el nmap? Buscá una entrada que el sistema no valide."],
    ];
    for (const [re, hint] of pistas) {
      if (re.test(u)) return hint;
    }

    // Preguntas generales.
    if (u.endsWith("?") || /\b(qu[eé]|c[oó]mo|por qu[eé]|cu[aá]ndo|d[oó]nde)\b/.test(u)) {
      return esTutor
        ? "Buena pregunta. Pensalo así: ¿qué dato controlás vos y el sistema confía sin validar? Ahí suele estar la falla."
        : "Mmm, no estoy seguro. Preguntale a alguien del foro.";
    }

    // Respuesta por defecto, determinista según longitud del mensaje.
    const cierres = [
      "Dale, seguimos.",
      "Anotado. ¿Algo más?",
      "Entiendo. Contame cómo te fue.",
      "Buenísimo. Probá y volvé.",
    ];
    return cierres[u.length % cierres.length];
  }
}
