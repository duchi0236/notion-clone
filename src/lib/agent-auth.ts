import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PLACEHOLDER_TOKENS = new Set(["", "replace-with-agent-token", "dev", "development"]);

function extractBearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function verifyAgentRequest(request: Request) {
  const expected = process.env.CLAWNOTE_AGENT_TOKEN ?? "";
  const token = extractBearerToken(request);

  // Local-first default: if no real env token is configured and no DB token is supplied, keep the API usable during development.
  if (!token && PLACEHOLDER_TOKENS.has(expected)) return null;

  if (token && !PLACEHOLDER_TOKENS.has(expected) && token === expected) return null;

  if (token) {
    const tokenHash = hashToken(token);
    const record = await prisma.apiToken.findUnique({ where: { tokenHash } });
    if (record) {
      await prisma.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
      return null;
    }
  }

  return NextResponse.json(
    {
      error: "Unauthorized agent request",
      message: "Set Authorization: Bearer <CLAWNOTE_AGENT_TOKEN or generated API token> when calling ClawNote agent APIs.",
    },
    { status: 401 }
  );
}
