/**
 * Configuración del multijugador de comunidad. Por DEFECTO no hay servidor →
 * el juego corre 100% offline (garantía de aislamiento). El multijugador se
 * "enciende" sólo cuando el jugador/operador configura la URL de un servidor
 * de comunidad (el suyo, hospedado donde quiera). Se guarda por dispositivo.
 */

const KEY = "nande-online-server";

/** URL del servidor de comunidad configurada, o "" si no hay (→ offline). */
export function onlineServerUrl(): string {
  try {
    const v = globalThis.localStorage?.getItem(KEY) ?? "";
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
}

/** Configura (o limpia con "") el servidor de comunidad. */
export function setOnlineServerUrl(url: string): void {
  try {
    const clean = (url ?? "").trim();
    if (clean) globalThis.localStorage?.setItem(KEY, clean);
    else globalThis.localStorage?.removeItem(KEY);
  } catch {
    /* sin almacenamiento: el juego sigue offline */
  }
}

/** ¿Hay un servidor de comunidad configurado? (si no, todo es offline). */
export function isOnlineConfigured(): boolean {
  return onlineServerUrl().length > 0;
}
