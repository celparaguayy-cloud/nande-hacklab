/**
 * Firmas de explotación web — una sola fuente de verdad (regla maestra 8) que
 * consumen tanto el correlador MITRE (detección en el SOC) como el OpsecTracer
 * (exposición/notoriedad). Se evalúan sobre el contenido REAL de la petición
 * (ruta + cuerpo), como un WAF/IDS que observa el tráfico que de verdad mandó
 * el jugador — no un texto pregrabado. Una petición benigna no coincide.
 */

export interface WebExploit {
  mitreId: string;
  technique: string;
  tactic: string;
  /** Etiqueta corta legible para la evidencia. */
  label: string;
}

/** Arma el texto observable de una petición: ruta (con query) + valores del cuerpo. */
export function trafficExploitPayload(path: string, reqBody: Record<string, string>): string {
  return `${path} ${Object.values(reqBody).join(" ")}`;
}

/**
 * Clasifica un payload como una técnica de explotación web, o null si es
 * benigno. Orden de más a menos específico; sin solapamientos para los payloads
 * reales del mundo (SQLi, cmdi, XSS, traversal).
 */
export function detectWebExploit(payload: string): WebExploit | null {
  const p = payload;
  // SQL injection: UNION SELECT, ' OR '1'='1, tautologías, comentario tras comilla.
  if (
    /union\s+select/i.test(p) ||
    /'\s*or\s+'?\d+'?\s*=\s*'?\d+/i.test(p) ||
    /\bor\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i.test(p) ||
    /'\s*(--|#|or\b)/i.test(p)
  ) {
    return { mitreId: "T1190", technique: "Exploit Public-Facing App: SQL Injection", tactic: "Initial Access", label: "Inyección SQL" };
  }
  // Command injection: metacaracter de shell seguido de un comando real.
  if (/[;|&`]\s*(cat|ls|id|whoami|nc|ncat|bash|sh|curl|wget|rm|echo|uname|pwd|cut|awk|head)\b/i.test(p)) {
    return { mitreId: "T1059", technique: "Command & Scripting Interpreter (cmdi)", tactic: "Execution", label: "Inyección de comandos" };
  }
  // XSS reflejado: etiquetas/handlers de script.
  if (/<script|onerror\s*=|onload\s*=|javascript:|<svg|<img[^>]*\son\w+=/i.test(p)) {
    return { mitreId: "T1059.007", technique: "JavaScript (XSS reflejado)", tactic: "Execution", label: "XSS reflejado" };
  }
  // Path traversal / LFI: escape de directorio o rutas sensibles.
  if (/\.\.[/\\]/.test(p) || /%2e%2e(%2f|%5c)/i.test(p) || /\/etc\/passwd\b/i.test(p)) {
    return { mitreId: "T1083", technique: "File & Directory Access (path traversal / LFI)", tactic: "Discovery", label: "Path traversal / LFI" };
  }
  return null;
}
