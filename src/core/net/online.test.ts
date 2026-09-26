import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnlineClient } from "./online/OnlineClient";
import { NullTransport, type Transport } from "./online/transport";
import {
  sanitizeAlias,
  isValidAlias,
  encodeClient,
  decodeServer,
} from "./online/protocol";
import { isOnlineConfigured, onlineServerUrl, setOnlineServerUrl } from "./online/config";
import { resetStorage } from "../../test/setup";

/**
 * Multijugador de COMUNIDAD — fundación. Anti-mock y aislamiento: por defecto
 * NO hay servidor, así que el cliente es offline (NullTransport) y no toca la
 * red. El protocolo es puro (de/serialización testeable sin conexión), valida
 * el dato del servidor como NO confiable, y el alias es un apodo saneado (sin
 * PII). El hacking no vive acá: este canal es sólo estado del juego.
 */
describe("Multijugador de comunidad (online)", () => {
  beforeEach(() => {
    resetStorage();
  });

  it("por defecto se conecta al servidor de comunidad público (decisión del dueño)", () => {
    expect(isOnlineConfigured()).toBe(true);
    expect(onlineServerUrl()).toContain("onrender.com");
    const client = OnlineClient.fromConfig();
    expect(client.isOnline()).toBe(true); // transporte real (aún sin conectar)
  });

  it("el jugador puede DESCONECTARSE (opt-out): queda offline de verdad", () => {
    setOnlineServerUrl(""); // opt-out explícito
    expect(isOnlineConfigured()).toBe(false);
    const client = OnlineClient.fromConfig();
    expect(client.isOnline()).toBe(false);
  });

  it("un NullTransport no expone red y sus métodos son no-ops seguros", () => {
    const t: Transport = new NullTransport();
    expect(t.online).toBe(false);
    // No debería lanzar ni intentar nada.
    expect(() => {
      t.connect("x");
      t.send({ t: "hb", alias: "x" });
      t.onMessage(() => {});
      t.disconnect();
    }).not.toThrow();
  });

  it("configurar/limpiar el servidor cambia el modo (opt-in explícito)", () => {
    setOnlineServerUrl("http://localhost:8787");
    expect(isOnlineConfigured()).toBe(true);
    expect(onlineServerUrl()).toBe("http://localhost:8787");
    setOnlineServerUrl("");
    expect(isOnlineConfigured()).toBe(false);
  });

  it("el alias se sanea (sin PII, apodo válido)", () => {
    expect(sanitizeAlias("Ñande Hacker 2024!")).toBe("andehacker2024");
    expect(sanitizeAlias("A")).toBe("a");
    expect(isValidAlias("ab")).toBe(false); // muy corto
    expect(isValidAlias("kurupi")).toBe(true);
    expect(isValidAlias("con espacio")).toBe(false);
  });

  it("join rechaza apodos inválidos y acepta uno saneado", () => {
    // Cliente offline explícito: probamos la validación sin tocar la red.
    const client = new OnlineClient(new NullTransport());
    expect(client.join("ab").ok).toBe(false);
    const r = client.join("0xMbói");
    expect(r.ok).toBe(true);
    expect(r.alias).toBe("0xmbi"); // saneado, sin caracteres no válidos
  });

  it("el protocolo serializa y valida mensajes; descarta lo malformado", () => {
    expect(encodeClient({ t: "score", alias: "kurupi", notoriety: 42 })).toContain("\"notoriety\":42");
    const presence = decodeServer(JSON.stringify({ t: "presence", online: 2, players: [{ alias: "kurupi" }, { alias: "0xmbi" }] }));
    expect(presence).toEqual({ t: "presence", online: 2, players: [{ alias: "kurupi" }, { alias: "0xmbi" }] });
    const board = decodeServer(JSON.stringify({ t: "board", rows: [{ alias: "kurupi", notoriety: 90 }] }));
    expect(board).toEqual({ t: "board", rows: [{ alias: "kurupi", notoriety: 90 }] });
    // Basura o tipos incorrectos → null (dato no confiable de la red).
    expect(decodeServer("no-json")).toBeNull();
    expect(decodeServer(JSON.stringify({ t: "otra-cosa" }))).toBeNull();
  });

  it("el cliente aplica presencia y ranking recibidos (con transporte simulado)", () => {
    // Transporte de prueba: capturamos el callback y le inyectamos mensajes
    // (simula al servidor SIN red real — verificamos la lógica del cliente).
    let handler: ((m: unknown) => void) | null = null;
    const fake = {
      online: true,
      connect: vi.fn(),
      send: vi.fn(),
      onMessage: (cb: (m: unknown) => void) => { handler = cb; },
      disconnect: vi.fn(),
    };
    const client = new OnlineClient(fake as never);
    let presencia = 0;
    client.onPresence((p) => { presencia = p.length; });
    client.join("kurupi");
    handler!({ t: "presence", online: 3, players: [{ alias: "a" }, { alias: "b" }, { alias: "c" }] });
    handler!({ t: "board", rows: [{ alias: "kurupi", notoriety: 77 }] });
    expect(presencia).toBe(3);
    expect(client.onlinePlayers().length).toBe(3);
    expect(client.leaderboard()[0]).toEqual({ alias: "kurupi", notoriety: 77 });
  });

  it("el heartbeat identifica al emisor (el servidor renueva SÓLO su presencia)", () => {
    // Si el hb no llevara alias, un solo cliente activo mantendría vivos a los
    // fantasmas en el servidor. El latido debe nombrar a quién renovar.
    const sent: unknown[] = [];
    const fake = {
      online: true,
      connect: vi.fn(),
      send: (m: unknown) => sent.push(m),
      onMessage: vi.fn(),
      disconnect: vi.fn(),
    };
    const client = new OnlineClient(fake as never);
    client.join("kurupi");
    client.heartbeat();
    expect(sent).toContainEqual({ t: "hb", alias: "kurupi" });
  });

  it("leave() limpia AMBAS fotos (presencia y ranking), no sólo presencia", () => {
    let handler: ((m: unknown) => void) | null = null;
    const fake = {
      online: true,
      connect: vi.fn(),
      send: vi.fn(),
      onMessage: (cb: (m: unknown) => void) => { handler = cb; },
      disconnect: vi.fn(),
    };
    const client = new OnlineClient(fake as never);
    client.join("kurupi");
    handler!({ t: "presence", online: 2, players: [{ alias: "kurupi" }, { alias: "otro" }] });
    handler!({ t: "board", rows: [{ alias: "kurupi", notoriety: 50 }] });
    expect(client.leaderboard().length).toBe(1);
    client.leave();
    expect(client.onlinePlayers()).toEqual([]);
    expect(client.leaderboard()).toEqual([]); // antes quedaba el ranking colgado
  });
});
