// @ts-nocheck
/**
 * Servidor de REFERENCIA del multijugador de comunidad de ÑANDE.
 *
 * Objetivo: que "toda la comunidad" pueda conectarse a un mundo online — sin
 * costo para empezar. Es un servidor mínimo, CERO dependencias (sólo Node
 * nativo), que corre local o en cualquier free tier (Render/Fly/Deno Deploy/
 * Railway…). Dos canales HTTP:
 *   - GET  /stream?alias=  → SSE: presencia + ranking global en vivo.
 *   - POST /msg            → mensajes del cliente (hello/hb/score/bye).
 *   - GET  /health         → healthcheck.
 *
 * Transporta SÓLO estado del juego (alias/presencia/ranking). NADA de hacking:
 * las herramientas ofensivas del cliente jamás salen a internet; esto es el
 * multijugador del JUEGO. El alias es un apodo, no una identidad real.
 *
 * ⚠ ANTES DE ABRIRLO AL PÚBLICO (y recordá: lo usan menores):
 *   - Poné TLS (HTTPS) por delante (un proxy/gratis del host).
 *   - Sumá moderación real y reporte de abuso antes de habilitar CHAT (este
 *     servidor de referencia NO tiene chat libre justamente por eso).
 *   - No guardes PII: acá sólo hay apodos en memoria, sin cuentas ni datos
 *     personales. Mantené esa regla.
 *   - Este server es una BASE de referencia, no una solución lista para
 *     producción a gran escala.
 */
import { createServer } from "node:http";

const PORT = process.env.PORT || 8787;
const MAX_ONLINE = 500; // techo defensivo simple
const HEARTBEAT_TTL_MS = 45_000; // sin latido en 45s → offline
const TICK_MS = 5_000; // cada cuánto se difunde presencia/ranking

/** alias → { res (SSE), lastSeen, notoriety } */
const clients = new Map();
/** ranking global acumulado: alias → mejor notoriedad vista */
const board = new Map();

function sanitizeAlias(raw) {
  return String(raw ?? "").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 20);
}

function broadcast() {
  const now = Date.now();
  for (const [alias, c] of clients) {
    if (now - c.lastSeen > HEARTBEAT_TTL_MS) clients.delete(alias);
  }
  const players = [...clients.keys()].slice(0, 100).map((alias) => ({ alias }));
  const presence = JSON.stringify({ t: "presence", online: clients.size, players });
  const rows = [...board.entries()]
    .map(([alias, notoriety]) => ({ alias, notoriety }))
    .sort((a, b) => b.notoriety - a.notoriety)
    .slice(0, 20);
  const boardMsg = JSON.stringify({ t: "board", rows });
  for (const c of clients.values()) {
    try {
      c.res.write(`data: ${presence}\n\n`);
      c.res.write(`data: ${boardMsg}\n\n`);
    } catch {
      /* cliente caído; se limpia por TTL */
    }
  }
}

function handleMsg(msg) {
  const alias = sanitizeAlias(msg?.alias);
  switch (msg?.t) {
    case "hello":
      if (alias && clients.has(alias)) clients.get(alias).lastSeen = Date.now();
      break;
    case "hb":
      for (const c of clients.values()) c.lastSeen = Math.max(c.lastSeen, Date.now());
      break;
    case "score":
      if (alias && typeof msg.notoriety === "number") {
        const n = Math.max(0, Math.round(msg.notoriety));
        board.set(alias, Math.max(board.get(alias) ?? 0, n));
      }
      break;
    case "bye":
      if (alias) clients.delete(alias);
      break;
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  // CORS abierto para lectura del juego (sólo estado del juego, sin credenciales).
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type");
  if (req.method === "OPTIONS") return res.writeHead(204).end();

  if (url.pathname === "/health") {
    return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, online: clients.size }));
  }

  if (url.pathname === "/stream" && req.method === "GET") {
    if (clients.size >= MAX_ONLINE) return res.writeHead(503).end("full");
    const alias = sanitizeAlias(url.searchParams.get("alias")) || `anon${Math.floor(Math.random() * 9999)}`;
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ t: "welcome", alias })}\n\n`);
    clients.set(alias, { res, lastSeen: Date.now(), notoriety: 0 });
    req.on("close", () => clients.delete(alias));
    return;
  }

  if (url.pathname === "/msg" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 4096) req.destroy(); // límite defensivo
    });
    req.on("end", () => {
      try {
        handleMsg(JSON.parse(body));
      } catch {
        /* ignore mensajes mal formados */
      }
      res.writeHead(204).end();
    });
    return;
  }

  res.writeHead(404).end("not found");
});

setInterval(broadcast, TICK_MS).unref?.();
server.listen(PORT, () => {
  console.log(`ÑANDE community server escuchando en :${PORT}`);
});
