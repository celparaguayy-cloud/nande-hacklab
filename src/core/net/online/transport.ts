import type { ClientMsg, ServerMsg } from "./protocol";

/**
 * Transporte del multijugador de comunidad. Abstrae CÓMO viajan los mensajes,
 * para que el cliente no sepa de red. Hay dos implementaciones:
 *   - NullTransport: OFFLINE por defecto. No toca la red. Es lo que corre si no
 *     hay servidor configurado (la build en vivo, los tests, sin conexión).
 *   - HttpOnlineTransport: red real (SSE + POST), SÓLO cuando el jugador
 *     configuró un servidor de comunidad. Vive junto a este archivo, la única
 *     otra carpeta con red real además del asistente IA.
 */
export interface Transport {
  /** ¿Este transporte usa red real? (NullTransport = false). */
  readonly online: boolean;
  /** Abre la sesión con un apodo. */
  connect(alias: string): void;
  /** Envía un mensaje al servidor. */
  send(msg: ClientMsg): void;
  /** Registra el callback de mensajes entrantes del servidor. */
  onMessage(cb: (msg: ServerMsg) => void): void;
  /** Cierra la sesión y libera recursos. */
  disconnect(): void;
}

/**
 * Transporte OFFLINE: no hay comunidad, no hay red. Todos sus métodos son
 * no-ops. Es el default y la garantía de aislamiento: sin servidor configurado,
 * el juego jamás abre una conexión (lo verifica isolation.test).
 */
export class NullTransport implements Transport {
  readonly online = false;
  connect(): void {}
  send(): void {}
  onMessage(): void {}
  disconnect(): void {}
}
