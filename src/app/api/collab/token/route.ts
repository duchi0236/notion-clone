import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export const runtime = "nodejs";

// Short-lived HMAC ticket for the realtime collab (y-websocket) server.
// The collab server (scripts/collab-server.cjs) verifies the signature, the
// expiry, and that the ticket was issued for the requested room, so it never
// needs database access or a shared session store.
const TICKET_TTL_MS = 10 * 60 * 1000;

const CURSOR_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

function collabSecret() {
  return process.env.COLLAB_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "";
}

function sign(payload: string, key: string) {
  return crypto.createHmac("sha256", key).update(payload).digest("base64url");
}

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

export async function GET(req: NextRequest) {
  const docId = req.nextUrl.searchParams.get("docId") ?? "";
  if (!docId) return NextResponse.json({ error: "docId is required" }, { status: 400 });

  const { user, workspace } = await ensureWorkspace();
  const document = await prisma.document.findFirst({
    where: { id: docId, workspaceId: workspace.id },
    select: { id: true },
  });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const key = collabSecret();
  if (!key) {
    return NextResponse.json({ error: "COLLAB_TOKEN_SECRET / NEXTAUTH_SECRET not configured" }, { status: 503 });
  }

  const name = user.name || user.email;
  const payload = Buffer.from(
    JSON.stringify({
      room: `clawnote-${docId}`,
      sub: user.id,
      name,
      exp: Date.now() + TICKET_TTL_MS,
    })
  ).toString("base64url");

  return NextResponse.json({
    token: `${payload}.${sign(payload, key)}`,
    user: { name, color: colorFor(user.id) },
  });
}
