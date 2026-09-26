import type { Transport } from "./transport";
import { decodeServer, encodeClient, type ClientMsg, type ServerMsg } from "./protocol";

/**
 * ============================================================================
 *  RED REAL — multijugador de comunidad (opt-in). Junto al asistente IA, la
 *  ÚNICA parte del proyecto que hace red real, y sólo si el jugador configuró
 *  un servidor de comunidad. Sin servidor, jamás se construye esta clase.
 * ============================================================================
 *
 * Transporte contra el servidor de comunidad de ÑANDE. Usa dos canales HTTP
 * simples (cero dependencias, funciona en cualquier host gratis):
 *   - SSE (EventSource) para servidor → cliente (presencia, ranking en vivo).
 *   - POST (fetch) para cliente → servidor (hello, heartbeat, score).
 *
 * Transporta SÓLO estado del juego (alias/presencia/ranking). Nunca datos del
 * dispositivo ni nada de las herramientas ofensivas: el hacking sigue aislado.
 * El contenido que llega del servidor es dato NO confiable: se valida en
 * protocol.decodeServer antes de tocar el juego.
 */
export class HttpOnlineTransport implements Transport {
  readonly online = true;
  private base: string;
  private alias = "";
  private source: EventSource | null = null;
  private cb: ((msg: ServerMsg) => void) | null = null;

  constructor(serverUrl: string) {
    this.base = serverUrl.replace(/\/+$/, "");
  }

  connect(alias: string): void {
    this.alias = alias;
    // Canal de bajada: eventos del servidor (presencia y ranking en vivo).
    this.source = new EventSource(`${this.base}/stream?alias=${encodeURIComponent(alias)}`);
    this.source.onmessage = (ev: MessageEvent) => {
      const msg = decodeServer(String(ev.data));
      if (msg && this.cb) this.cb(msg);
    };
    // Canal de subida: nos presentamos.
    this.send({ t: "hello", alias });
  }

  send(msg: ClientMsg): void {
    // Envío best-effort: si la red falla, el juego sigue (no se rompe nada).
    void fetch(`${this.base}/msg`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: encodeClient(msg),
    }).catch(() => {});
  }

  onMessage(cb: (msg: ServerMsg) => void): void {
    this.cb = cb;
  }

  disconnect(): void {
    if (this.alias) this.send({ t: "bye" });
    this.source?.close();
    this.source = null;
    this.cb = null;
  }
}
