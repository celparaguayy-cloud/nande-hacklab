import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { VirtualKernel } from "../../core/VirtualKernel";
import { OnlineClient } from "../../core/net/online/OnlineClient";
import { onlineServerUrl, setOnlineServerUrl } from "../../core/net/online/config";
import type { BoardRow, PresencePlayer } from "../../core/net/online/protocol";
import { leaderboard } from "../../core/game/RivalHackers";

interface Props {
  kernel: VirtualKernel;
  onOpenApp?: (id: string) => void;
}

/**
 * Comunidad — el mundo multijugador ONLINE de ÑANDE (opcional). Sin servidor
 * configurado es OFFLINE: muestra el ranking local (rivales del mundo + vos) y
 * cómo encender la comunidad. Con un servidor, entrás con tu apodo y ves quién
 * está conectado y el ranking global en vivo, publicando tu notoriedad.
 *
 * El hacking NO pasa por acá: este canal es sólo estado del juego. Si no hay
 * servidor, no toca la red (garantía de aislamiento).
 */
export function CommunityView({ kernel }: Props) {
  const player = kernel.player.getState();
  const noto = kernel.notoriety.getState();
  const day = Math.floor(kernel.world.getState().clock.tick / 1440) + 1;

  // Ranking LOCAL (siempre disponible, offline): rivales del mundo + vos.
  const localRanking = leaderboard(player.name, noto.notoriety, day);

  const [url, setUrl] = useState(() => onlineServerUrl());
  // La URL aplicada (de la config): al cambiarla se recrea el cliente.
  const [activeUrl, setActiveUrl] = useState(() => onlineServerUrl());
  const [players, setPlayers] = useState<PresencePlayer[]>([]);
  const [board, setBoard] = useState<BoardRow[]>([]);

  const isConfigured = activeUrl.length > 0;

  // Cliente de comunidad: se arma según la config aplicada. Sin servidor →
  // NullTransport (no toca la red). Con servidor → SSE+POST reales.
  const client = useMemo(() => OnlineClient.forServer(activeUrl), [activeUrl]);

  useEffect(() => {
    if (!client.isOnline()) return;
    // Los estados se actualizan por CALLBACK (mensajes entrantes) y por el
    // intervalo — sincronización con un sistema externo, no setState al vuelo.
    client.onPresence((p) => setPlayers([...p]));
    client.onLeaderboard((rows) => setBoard([...rows]));
    client.join(player.name);
    client.submitScore(kernel.notoriety.getState().notoriety);
    const id = setInterval(() => {
      client.heartbeat();
      client.submitScore(kernel.notoriety.getState().notoriety);
    }, 10_000);
    return () => {
      clearInterval(id);
      client.leave();
    };
  }, [client, kernel, player.name]);

  const activar = () => {
    const clean = url.trim();
    setOnlineServerUrl(clean);
    setPlayers([]);
    setBoard([]);
    setActiveUrl(clean); // recrea el cliente y reconecta
  };

  const desactivar = () => {
    setOnlineServerUrl("");
    setPlayers([]);
    setBoard([]);
    setActiveUrl(""); // vuelve a offline (NullTransport)
  };

  const wrap: CSSProperties = { padding: 16, height: "100%", overflow: "auto", color: "var(--nd-text, #e6edf3)" };
  const card: CSSProperties = {
    background: "var(--nd-surface, #161b22)",
    border: "1px solid var(--nd-border, #30363d)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  };
  const rowStyle = (me: boolean): CSSProperties => ({
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 10px",
    borderRadius: 6,
    background: me ? "var(--nd-accent-soft, rgba(88,166,255,.15))" : "transparent",
    fontWeight: me ? 700 : 400,
  });

  return (
    <div style={wrap}>
      <h2 style={{ margin: "0 0 4px" }}>Comunidad ÑANDE</h2>
      <div style={{ color: "var(--nd-text-dim, #8b949e)", marginBottom: 14, fontSize: 13 }}>
        {client.isOnline()
          ? `🟢 En la comunidad como ${player.name}`
          : "Modo local (sin servidor de comunidad configurado)"}
      </div>

      {/* Estado ONLINE: presencia + ranking global en vivo. */}
      {client.isOnline() && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <strong>En línea ahora</strong>
            <span style={{ color: "var(--nd-text-dim, #8b949e)" }}>{players.length} jugador(es)</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {players.length === 0 ? (
              <span style={{ color: "var(--nd-text-dim, #8b949e)" }}>Nadie más por ahora — invitá a tu gente.</span>
            ) : (
              players.map((p) => (
                <span key={p.alias} style={{ background: "var(--nd-chip, #21262d)", padding: "3px 8px", borderRadius: 12, fontSize: 12 }}>
                  {p.alias}
                </span>
              ))
            )}
          </div>
          {board.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>Ranking global</strong>
              {board.map((r, i) => (
                <div key={r.alias} style={rowStyle(r.alias === player.name.toLowerCase())}>
                  <span>#{i + 1} {r.alias}</span>
                  <span>{r.notoriety}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ranking LOCAL: siempre visible (offline y online). */}
      <div style={card}>
        <strong>Ranking del mundo (local)</strong>
        <div style={{ marginTop: 8 }}>
          {localRanking.slice(0, 10).map((r, i) => (
            <div key={r.alias} style={rowStyle(!!r.isPlayer)}>
              <span>#{i + 1} {r.alias} {r.isPlayer ? "· vos" : `· ${r.faction}`}</span>
              <span>{r.notoriety}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Encender / apagar la comunidad. */}
      <div style={card}>
        <strong>{isConfigured ? "Servidor de comunidad" : "Activar la comunidad (opcional)"}</strong>
        <p style={{ color: "var(--nd-text-dim, #8b949e)", fontSize: 12, margin: "6px 0 10px" }}>
          Conectá el juego a un servidor de comunidad (el tuyo, gratis). Sin
          servidor, ÑANDE es 100% offline y esto no toca la red. El hacking
          siempre queda dentro del sandbox.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://mi-servidor-nande.ejemplo"
            style={{
              flex: 1,
              minWidth: 220,
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid var(--nd-border, #30363d)",
              background: "var(--nd-bg, #0d1117)",
              color: "inherit",
            }}
          />
          <button onClick={activar} style={{ padding: "8px 14px", borderRadius: 6 }}>
            {isConfigured ? "Actualizar" : "Activar"}
          </button>
          {isConfigured && (
            <button onClick={desactivar} style={{ padding: "8px 14px", borderRadius: 6 }}>
              Desconectar
            </button>
          )}
        </div>
        <p style={{ color: "var(--nd-text-dim, #8b949e)", fontSize: 11, marginTop: 10 }}>
          ¿No tenés servidor? Corré <code>node server/index.mjs</code> y usá{" "}
          <code>http://localhost:8787</code>. Para que entre tu comunidad,
          hospedalo gratis (con https). El chat llega cuando haya moderación.
        </p>
      </div>
    </div>
  );
}
