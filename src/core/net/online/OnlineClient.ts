import type { Transport } from "./transport";
import { NullTransport } from "./transport";
import { HttpOnlineTransport } from "./HttpOnlineTransport";
import { onlineServerUrl } from "./config";
import { sanitizeAlias, type BoardRow, type PresencePlayer, type ServerMsg } from "./protocol";

/**
 * OnlineClient — el cliente del multijugador de COMUNIDAD de ÑANDE. Un mundo
 * online opcional donde entra quien quiere: ves cuánta gente está conectada y
 * un ranking global en vivo. Sin red real salvo que haya un servidor
 * configurado (opt-in); por defecto usa NullTransport y todo es offline.
 *
 * Sólo estado del juego (alias/presencia/ranking). El hacking sigue contra el
 * sandbox. Determinista y seguro: si el servidor no responde, el juego no se
 * rompe; si no hay servidor, ni siquiera intenta conectar.
 */
export class OnlineClient {
  private transport: Transport;
  private alias = "";
  private connected = false;
  private online: PresencePlayer[] = [];
  private board: BoardRow[] = [];
  private presenceCb: ((players: PresencePlayer[]) => void) | null = null;
  private boardCb: ((rows: BoardRow[]) => void) | null = null;

  constructor(transport: Transport) {
    this.transport = transport;
    this.transport.onMessage((m) => this.handle(m));
  }

  /**
   * Crea el cliente según la configuración: si hay servidor de comunidad,
   * transporte real; si no, NullTransport (offline). Es el punto por el que el
   * juego decide, una sola vez, si toca la red.
   */
  static fromConfig(): OnlineClient {
    return OnlineClient.forServer(onlineServerUrl());
  }

  /**
   * Crea el cliente para una URL de servidor explícita: con URL → transporte
   * real; vacío → NullTransport (offline). Útil cuando la UI cambia el servidor
   * y quiere recrear el cliente para esa URL puntual.
   */
  static forServer(url: string): OnlineClient {
    return new OnlineClient(url ? new HttpOnlineTransport(url) : new NullTransport());
  }

  /** ¿Este cliente está en modo online (hay servidor configurado)? */
  isOnline(): boolean {
    return this.transport.online;
  }

  /** Entra a la comunidad con un apodo (saneado, sin PII). */
  join(alias: string): { ok: boolean; alias: string } {
    const a = sanitizeAlias(alias);
    if (a.length < 3) return { ok: false, alias: a };
    this.alias = a;
    this.connected = true;
    this.transport.connect(a);
    return { ok: true, alias: a };
  }

  /** Publica tu notoriedad al ranking global (best-effort). */
  submitScore(notoriety: number): void {
    if (!this.connected || !this.alias) return;
    this.transport.send({ t: "score", alias: this.alias, notoriety: Math.max(0, Math.round(notoriety)) });
  }

  /** Latido de presencia (mantené "vivo" tu lugar en la lista). */
  heartbeat(): void {
    if (this.connected) this.transport.send({ t: "hb" });
  }

  leave(): void {
    if (!this.connected) return;
    this.transport.disconnect();
    this.connected = false;
    this.online = [];
  }

  /** Jugadores en línea (última foto recibida del servidor). */
  onlinePlayers(): PresencePlayer[] {
    return [...this.online];
  }

  /** Ranking global (última foto recibida del servidor). */
  leaderboard(): BoardRow[] {
    return [...this.board];
  }

  onPresence(cb: (players: PresencePlayer[]) => void): void {
    this.presenceCb = cb;
  }
  onLeaderboard(cb: (rows: BoardRow[]) => void): void {
    this.boardCb = cb;
  }

  private handle(m: ServerMsg): void {
    switch (m.t) {
      case "presence":
        this.online = m.players;
        this.presenceCb?.(this.online);
        break;
      case "board":
        this.board = m.rows;
        this.boardCb?.(this.board);
        break;
      case "welcome":
        this.alias = m.alias;
        break;
    }
  }
}
