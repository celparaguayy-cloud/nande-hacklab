/**
 * Configuración del multijugador de comunidad.
 *
 * Por decisión del dueño, ÑANDE trae un servidor de comunidad PÚBLICO por
 * defecto: al abrir la app Comunidad, el juego se conecta solo (sin pegar nada).
 * El jugador puede desconectarse (opt-out) o apuntar a su propio servidor.
 *
 * IMPORTANTE: esto abre red real SÓLO para el canal de comunidad (apodos +
 * ranking, sin chat ni PII). El mundo y TODAS las herramientas ofensivas siguen
 * 100% aislados: el hacking nunca sale del sandbox (lo enforce isolation.test).
 */

const KEY = "nande-online-server";

/** Servidor de comunidad público por defecto (desplegado por el dueño). */
export const DEFAULT_ONLINE_SERVER = "https://nande-community.onrender.com";

/**
 * URL del servidor de comunidad efectiva:
 *   - nunca configurado (key ausente) → el servidor público por defecto;
 *   - "" guardado → el jugador se desconectó explícitamente (offline);
 *   - una URL → el servidor propio del jugador.
 */
export function onlineServerUrl(): string {
  try {
    const v = globalThis.localStorage?.getItem(KEY);
    if (v === null || v === undefined) return DEFAULT_ONLINE_SERVER;
    return v.trim(); // "" = desconectado; o una URL propia
  } catch {
    return DEFAULT_ONLINE_SERVER;
  }
}

/**
 * Configura el servidor. Una URL apunta ahí; "" DESCONECTA (queda offline de
 * forma persistente, sin volver al default). Es el opt-out del jugador.
 */
export function setOnlineServerUrl(url: string): void {
  try {
    globalThis.localStorage?.setItem(KEY, (url ?? "").trim());
  } catch {
    /* sin almacenamiento: el juego sigue funcionando */
  }
}

/** Vuelve al servidor público por defecto (borra la preferencia guardada). */
export function resetOnlineServerUrl(): void {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    /* no-op */
  }
}

/** ¿Hay un servidor de comunidad al que conectarse? (false = offline explícito). */
export function isOnlineConfigured(): boolean {
  return onlineServerUrl().length > 0;
}
