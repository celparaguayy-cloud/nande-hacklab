/**
 * Certificaciones de ÑANDE (claramente ficticias).
 *
 * No se ganan acumulando XP: se ganan DEMOSTRANDO competencia, capturando
 * las banderas de cada área. Cada certificación tiene un conjunto de
 * banderas que cuentan y cuántas hacen falta. La certificación final
 * (Cybersecurity Master) exige tener todas las demás.
 *
 * Es data pura + una función que, dadas las banderas capturadas, calcula el
 * progreso. Así la UI (la sala de trofeos) solo muestra.
 */

export interface Certification {
  id: string;
  name: string;
  icon: string;
  /** Área/itinerario que certifica. */
  area: string;
  description: string;
  /** Banderas que cuentan para esta certificación. */
  pool: string[];
  /** Cuántas de las del pool hacen falta para ganarla. */
  need: number;
}

export const CERTIFICATIONS: Certification[] = [
  {
    id: "web-security",
    name: "ÑANDE Web Security",
    icon: "🕸️",
    area: "Seguridad web",
    description: "Fallos web clásicos: inyección, control de acceso y ejecución.",
    pool: [
      "ND{sqli_login_bypass}",
      "ND{idor_album_ajeno}",
      "ND{cmd_injection_pwned}",
      "ND{path_traversal_secreto}",
      "ND{csrf_transferencia}",
      "ND{lfi_config_incluida}",
      "ND{upload_webshell}",
    ],
    need: 4,
  },
  {
    id: "appsec",
    name: "ÑANDE AppSec",
    icon: "🧩",
    area: "Seguridad de aplicaciones",
    description: "Fallos avanzados: SSTI, XXE, NoSQL, deserialización, JWT, SSRF.",
    pool: [
      "ND{ssti_contexto_expuesto}",
      "ND{xxe_archivo_leido}",
      "ND{nosql_auth_bypass}",
      "ND{deserializacion_insegura}",
      "ND{jwt_alg_none}",
      "ND{jwt_forged_admin}",
      "ND{ssrf_metadata_robada}",
      "ND{race_condition_toctou}",
    ],
    need: 4,
  },
  {
    id: "network",
    name: "ÑANDE Network Specialist",
    icon: "🛰️",
    area: "Redes e infraestructura",
    description: "Sniffing, MITM, WiFi y movimiento lateral (pivoting).",
    pool: [
      "ND{sniff_credenciales}",
      "ND{arp_mitm}",
      "ND{wifi_wpa_crackeada}",
      "ND{pivot_interno}",
    ],
    need: 3,
  },
  {
    id: "soc-analyst",
    name: "ÑANDE SOC Analyst",
    icon: "🛡️",
    area: "Blue Team / defensa",
    description: "Triage de alertas, correlación en SIEM y reconstrucción DFIR.",
    pool: [
      "ND{forense_intrusion}",
      "ND{soc_triage}",
      "ND{siem_correlacion}",
      "ND{dfir_timeline}",
    ],
    need: 3,
  },
];

/** La certificación final: exige todas las demás. */
export const MASTER_CERT = {
  id: "master",
  name: "ÑANDE Cybersecurity Master",
  icon: "🏅",
  area: "Maestría",
  description: "Competencia demostrada en ataque y defensa. La cima de ÑANDE.",
};

export interface CertProgress {
  cert: { id: string; name: string; icon: string; area: string; description: string };
  have: number;
  need: number;
  earned: boolean;
}

/** Progreso de todas las certificaciones dadas las banderas capturadas. */
export function certificationsFor(flags: string[]): CertProgress[] {
  const set = new Set(flags);
  const base: CertProgress[] = CERTIFICATIONS.map((cert) => {
    const have = cert.pool.filter((f) => set.has(f)).length;
    return {
      cert: { id: cert.id, name: cert.name, icon: cert.icon, area: cert.area, description: cert.description },
      have,
      need: cert.need,
      earned: have >= cert.need,
    };
  });

  const allBaseEarned = base.every((c) => c.earned);
  base.push({
    cert: MASTER_CERT,
    have: base.filter((c) => c.earned).length,
    need: CERTIFICATIONS.length,
    earned: allBaseEarned,
  });

  return base;
}


/** Nombre legible y defensa breve de cada bandera, para la sala de trofeos. */
export const FLAG_INFO: Record<string, { tecnica: string; defensa: string }> = {
  "ND{sqli_login_bypass}": { tecnica: "Bypass de login (SQLi)", defensa: "Consultas parametrizadas." },
  "ND{idor_album_ajeno}": { tecnica: "IDOR", defensa: "Chequear el dueño del objeto en el server." },
  "ND{cmd_injection_pwned}": { tecnica: "Inyección de comandos", defensa: "Sin shell; argumentos como lista." },
  "ND{path_traversal_secreto}": { tecnica: "Path traversal", defensa: "Normalizar y confinar la ruta." },
  "ND{jwt_forged_admin}": { tecnica: "Forjado de JWT (clave débil)", defensa: "Clave fuerte y verificar la firma." },
  "ND{jwt_alg_none}": { tecnica: "JWT alg:none", defensa: "Fijar el algoritmo; nunca aceptar none." },
  "ND{ssrf_metadata_robada}": { tecnica: "SSRF a metadata", defensa: "Lista blanca; bloquear IPs internas." },
  "ND{ssrf_interno}": { tecnica: "SSRF interno", defensa: "Restringir destinos del server." },
  "ND{open_redirect}": { tecnica: "Open redirect", defensa: "Solo destinos de una lista propia." },
  "ND{csrf_transferencia}": { tecnica: "CSRF", defensa: "Token anti-CSRF + cookies SameSite." },
  "ND{lfi_config_incluida}": { tecnica: "LFI", defensa: "Mapa fijo de vistas; nada de nombres del usuario." },
  "ND{upload_webshell}": { tecnica: "Subida sin restringir", defensa: "Lista blanca, renombrar, servir sin ejecutar." },
  "ND{deserializacion_insegura}": { tecnica: "Deserialización insegura", defensa: "No confiar en objetos del cliente; firmar." },
  "ND{ssti_contexto_expuesto}": { tecnica: "SSTI", defensa: "Input como dato del template, no como código." },
  "ND{xxe_archivo_leido}": { tecnica: "XXE", defensa: "Desactivar entidades externas y DTD." },
  "ND{nosql_auth_bypass}": { tecnica: "Inyección NoSQL", defensa: "Validar el tipo de cada campo." },
  "ND{race_condition_toctou}": { tecnica: "Race condition (TOCTOU)", defensa: "Operación atómica: update condicional." },
  "ND{sniff_credenciales}": { tecnica: "Sniffing de credenciales", defensa: "Cifrar todo el tráfico (TLS)." },
  "ND{arp_mitm}": { tecnica: "MITM (ARP spoofing)", defensa: "TLS extremo a extremo + ARP estático." },
  "ND{wifi_wpa_crackeada}": { tecnica: "Crackeo de WiFi (WPA)", defensa: "Clave larga y aleatoria; WPA3." },
  "ND{pivot_interno}": { tecnica: "Movimiento lateral (pivoting)", defensa: "Segmentar la red; monitoreo lateral." },
  "ND{forense_intrusion}": { tecnica: "Análisis forense de logs", defensa: "(defensa) leer y correlacionar registros." },
  "ND{soc_triage}": { tecnica: "Triage de alertas (SOC)", defensa: "(defensa) separar el incidente real." },
  "ND{siem_correlacion}": { tecnica: "Correlación en SIEM", defensa: "(defensa) juntar los eventos del atacante." },
  "ND{dfir_timeline}": { tecnica: "Timeline DFIR", defensa: "(defensa) reconstruir el kill chain." },
};

/** Deriva un nombre para una bandera dinámica (ej. toma de cuenta). */
export function flagLabel(flag: string): { tecnica: string; defensa: string } {
  if (FLAG_INFO[flag]) return FLAG_INFO[flag];
  const acceso = flag.match(/^ND\{acceso:(.+)\}$/);
  if (acceso) return { tecnica: `Toma de cuenta de ${acceso[1]}`, defensa: "Hash fuerte + rate limit + MFA." };
  return { tecnica: flag, defensa: "" };
}
