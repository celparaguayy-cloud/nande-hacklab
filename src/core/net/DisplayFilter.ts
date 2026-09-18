import type { Packet } from "./PacketCapture";
import { compileQuery, runQuery, type Compiled, type QuerySchema } from "../query/Query";

/**
 * Filtros de visualización estilo Wireshark, de verdad — no un `includes`.
 * El parser vive en core/query (compartido con la búsqueda del SOC); acá sólo
 * se declara el ESQUEMA: qué campos existen en un paquete y cómo se leen.
 *
 * Ejemplos reales que funcionan:
 *   http
 *   http.request.method == "POST"
 *   ip.addr == 10.10.0.5 and http
 *   http.response.code >= 400
 *   frame contains "password"
 *   http.host contains "banco" and not auth
 *   frame.len > 200 || nande.leak
 */

const PROTOCOLS = new Set(["http", "tcp", "ssh", "auth", "icmp"]);

/** Campos que el filtro entiende (con alias), para validar al parsear. */
const KNOWN_FIELDS = new Set([
  "ip.addr", "ip.src", "ip.dst",
  "http.host", "host",
  "http.request.method", "http.method",
  "http.request.uri", "http.uri", "http.path",
  "http.response.code", "http.status", "status",
  "frame.len", "len", "length",
  "frame", "data", "text",
  "nande.leak", "leak",
]);

function isKnownField(field: string): boolean {
  const f = field.toLowerCase();
  return KNOWN_FIELDS.has(f) || PROTOCOLS.has(f);
}

/** Lectura de un campo desde un paquete (con alias). */
function fieldValue(p: Packet, rawField: string): string | number | boolean | undefined {
  const field = rawField.toLowerCase();
  switch (field) {
    case "ip.addr": return `${p.src} ${p.dst}`;
    case "ip.src": return p.src;
    case "ip.dst": return p.dst;
    case "http.host":
    case "host": return p.host ?? "";
    case "http.request.method":
    case "http.method": return p.method ?? "";
    case "http.request.uri":
    case "http.uri":
    case "http.path": return p.path ?? "";
    case "http.response.code":
    case "http.status":
    case "status": return p.status;
    case "frame.len":
    case "len":
    case "length": return p.length;
    case "frame":
    case "data":
    case "text": return `${p.summary} ${p.detail}`;
    case "nande.leak":
    case "leak": return Boolean(p.leak);
    default:
      // Un protocolo suelto (http, tcp…) es un término booleano.
      if (PROTOCOLS.has(field)) return p.proto.toLowerCase() === field;
      return undefined;
  }
}

const PACKET_SCHEMA: QuerySchema<Packet> = {
  isKnownField,
  value: fieldValue,
};

export type CompiledFilter = Compiled<Packet>;

/** Compila una expresión de filtro. Nunca tira: informa el error. */
export function compileFilter(expr: string): CompiledFilter {
  return compileQuery(expr, PACKET_SCHEMA);
}

/** Filtra paquetes con la expresión. Sintaxis mala → lista vacía. */
export function applyFilter(packets: Packet[], expr: string): Packet[] {
  return runQuery(packets, expr, PACKET_SCHEMA);
}
