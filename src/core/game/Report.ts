import { FLAG_INFO, flagLabel, certificationsFor, type CertProgress } from "./Certifications";

/**
 * Informes de ÑANDE (§51 y §68).
 *
 * Saber hackear no alcanza: hay que saber CONTARLO. Este módulo arma, a
 * partir de lo que el jugador demostró (las banderas capturadas), un informe
 * profesional: un resumen ejecutivo, los hallazgos con su severidad y su
 * remediación, y el estado de competencia (certificaciones). Es data pura:
 * la UI solo lo muestra o lo exporta.
 */

export type Severity = "crítica" | "alta" | "media";

/** Severidad por técnica (criterio educativo, no un CVSS real). */
const SEVERITY: Record<string, Severity> = {
  "ND{sqli_login_bypass}": "crítica",
  "ND{jwt_forged_admin}": "crítica",
  "ND{jwt_alg_none}": "crítica",
  "ND{cmd_injection_pwned}": "crítica",
  "ND{upload_webshell}": "crítica",
  "ND{deserializacion_insegura}": "crítica",
  "ND{ssti_contexto_expuesto}": "crítica",
  "ND{nosql_auth_bypass}": "crítica",
  "ND{ssrf_metadata_robada}": "crítica",
  "ND{iam_permisivo}": "crítica",
  "ND{contenedor_inseguro}": "crítica",
  "ND{pivot_interno}": "crítica",
  "ND{xxe_archivo_leido}": "alta",
  "ND{lfi_config_incluida}": "alta",
  "ND{path_traversal_secreto}": "alta",
  "ND{idor_album_ajeno}": "alta",
  "ND{csrf_transferencia}": "alta",
  "ND{cloud_bucket_publico}": "alta",
  "ND{devsecops_secreto_filtrado}": "alta",
  "ND{prompt_injection}": "alta",
  "ND{arp_mitm}": "alta",
  "ND{sniff_credenciales}": "alta",
  "ND{reversing_clave_hardcodeada}": "alta",
  "ND{ssrf_interno}": "media",
  "ND{open_redirect}": "media",
  "ND{race_condition_toctou}": "media",
  "ND{wifi_wpa_crackeada}": "media",
  "ND{ssh_fuerza_bruta}": "alta",
  "ND{dependencia_vulnerable}": "media",
  "ND{malware_iocs}": "media",
};

function severityOf(flag: string): Severity {
  if (SEVERITY[flag]) return SEVERITY[flag];
  if (/^ND\{acceso:/.test(flag)) return "crítica"; // toma de cuenta + robo
  return "media";
}

const ORDEN: Record<Severity, number> = { "crítica": 0, "alta": 1, "media": 2 };

export interface Finding {
  flag: string;
  tecnica: string;
  severidad: Severity;
  remediacion: string;
}

export interface Report {
  fecha: string;
  resumen: string;
  total: number;
  porSeveridad: Record<Severity, number>;
  findings: Finding[];
  certificaciones: CertProgress[];
  /** Frase de nivel de competencia. */
  competencia: string;
}

function competenciaDe(total: number, certis: number): string {
  if (certis >= 5) return "Competencia demostrada: nivel MAESTRO (todas las certificaciones).";
  if (total >= 20) return "Competencia avanzada: dominio amplio de ataque y defensa.";
  if (total >= 10) return "Competencia intermedia: buena cobertura, seguí profundizando.";
  if (total >= 1) return "Competencia inicial: primeros hallazgos registrados.";
  return "Sin hallazgos todavía: capturá banderas para construir tu informe.";
}

/** Arma el informe a partir de las banderas capturadas. */
export function buildReport(flags: string[], fecha = "hoy"): Report {
  const conocidas = flags.filter((f) => FLAG_INFO[f] || /^ND\{acceso:/.test(f));

  const findings: Finding[] = conocidas
    .map((flag) => {
      const info = flagLabel(flag);
      return {
        flag,
        tecnica: info.tecnica,
        severidad: severityOf(flag),
        remediacion: info.defensa || "Aplicar el control correspondiente.",
      };
    })
    .sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad]);

  const porSeveridad: Record<Severity, number> = { "crítica": 0, "alta": 0, "media": 0 };
  for (const f of findings) porSeveridad[f.severidad] += 1;

  const certificaciones = certificationsFor(flags);
  const certisGanadas = certificaciones.filter((c) => c.earned && c.cert.id !== "master").length;

  const resumen =
    findings.length === 0
      ? "No se registran hallazgos. Este informe se completa a medida que demostrás técnicas en los laboratorios."
      : `Se identificaron ${findings.length} hallazgos (${porSeveridad["crítica"]} críticos, ` +
        `${porSeveridad["alta"]} altos, ${porSeveridad["media"]} medios) en objetivos ficticios del entorno ÑANDE. ` +
        `Cada uno incluye su remediación recomendada.`;

  return {
    fecha,
    resumen,
    total: findings.length,
    porSeveridad,
    findings,
    certificaciones,
    competencia: competenciaDe(findings.length, certisGanadas),
  };
}
