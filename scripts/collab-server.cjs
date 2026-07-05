#!/usr/bin/env node
/**
 * ClawNote realtime collaboration server (y-websocket) — production ready.
 *
 * Features on top of the stock `y-websocket` server:
 *  - Ticket auth: clients must present a short-lived HMAC ticket issued by
 *    `GET /api/collab/token?docId=...` (signed with COLLAB_TOKEN_SECRET or
 *    NEXTAUTH_SECRET). The ticket is bound to a single room and expiry.
 *    Auth is enforced when NODE_ENV=production or COLLAB_REQUIRE_AUTH=1.
 *  - Persistence: if `y-leveldb` is installed, documents survive restarts
 *    (COLLAB_PERSISTENCE_DIR, default ./collab-data). Otherwise state lives in
 *    memory and a warning is printed.
 *
 * Env: HOST, PORT, COLLAB_TOKEN_SECRET | NEXTAUTH_SECRET,
 *      COLLAB_REQUIRE_AUTH, COLLAB_PERSISTENCE_DIR
 */
const http = require("node:http");
const crypto = require("node:crypto");
const WebSocket = require("ws");
const Y = require("yjs");
const { setupWSConnection, setPersistence } = require("y-websocket/bin/utils");

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 1234);
const SECRET = process.env.COLLAB_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "";
const REQUIRE_AUTH =
  process.env.NODE_ENV === "production" || process.env.COLLAB_REQUIRE_AUTH === "1";

if (REQUIRE_AUTH && !SECRET) {
  console.error("[collab] FATAL: auth required but COLLAB_TOKEN_SECRET / NEXTAUTH_SECRET is not set");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Persistence (optional y-leveldb)
// ---------------------------------------------------------------------------
try {
  const { LeveldbPersistence } = require("y-leveldb");
  const dir = process.env.COLLAB_PERSISTENCE_DIR || "./collab-data";
  const ldb = new LeveldbPersistence(dir);
  setPersistence({
    provider: ldb,
    bindState: async (docName, ydoc) => {
      const persisted = await ldb.getYDoc(docName);
      const newUpdates = Y.encodeStateAsUpdate(ydoc);
      await ldb.storeUpdate(docName, newUpdates);
      Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(persisted));
      ydoc.on("update", (update) => {
        ldb.storeUpdate(docName, update);
      });
    },
    writeState: async () => {},
  });
  console.log(`[collab] persistence enabled (y-leveldb) at ${dir}`);
} catch (error) {
  if (REQUIRE_AUTH) {
    console.warn("[collab] WARNING: y-leveldb not installed — collab state is IN MEMORY ONLY.");
    console.warn("[collab] Run `npm install y-leveldb` to persist documents across restarts.");
  } else {
    console.log("[collab] y-leveldb not installed — running with in-memory state (dev mode)");
  }
}

// ---------------------------------------------------------------------------
// Ticket verification (mirrors src/app/api/collab/token/route.ts)
// ---------------------------------------------------------------------------
function verifyTicket(token, room) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadPart, signature] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(payloadPart).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || payload.room !== room) return null;
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return payload;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ClawNote collab server\n");
});

const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (conn, req) => {
  setupWSConnection(conn, req, { gc: true });
});

server.on("upgrade", (req, socket, head) => {
  const requestUrl = new URL(req.url, "http://localhost");
  const room = requestUrl.pathname.slice(1).split("?")[0];

  if (REQUIRE_AUTH) {
    const ticket = verifyTicket(requestUrl.searchParams.get("token"), room);
    if (!ticket) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
  }

  wss.handleUpgrade(req, socket, head, (conn) => {
    wss.emit("connection", conn, req);
  });
});

server.listen(PORT, HOST, () => {
  console.log(
    `[collab] listening on ws://${HOST}:${PORT} (auth: ${REQUIRE_AUTH ? "required" : "off"})`
  );
});
