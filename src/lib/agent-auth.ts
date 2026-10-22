import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const AGENT_SCOPES = [
  "knowledge:read",
  "documents:read",
  "documents:draft",
  "documents:merge",
  "tasks:read",
  "tasks:write",
  "records:read",
  "records:write",
  "calendar:read",
  "calendar:write",
  "inbox:read",
  "inbox:write",
  "resources:archive",
  "jobs:read",
  "jobs:write",
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

export type AgentPrincipal = {
  credentialId: string;
  workspaceId: string;
  userId: string;
  delegatedByUserId: string;
  agentId: string;
  scopes: string[];
  projectIds: string[];
};

export class AgentAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

function extractBearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
}

export function hashAgentToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function authenticateAgentRequest(
  request: Request,
  requiredScopes: AgentScope[] = [],
): Promise<AgentPrincipal> {
  const token = extractBearerToken(request);
  if (!token) throw new AgentAuthError("Missing agent bearer token");

  const record = await prisma.apiToken.findUnique({ where: { tokenHash: hashAgentToken(token) } });
  if (!record || record.revokedAt || record.legacy || record.scopes.includes("*")) {
    throw new AgentAuthError("Invalid, revoked, or legacy agent token");
  }
  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) throw new AgentAuthError("Agent token expired");

  const scopes = new Set(record.scopes);
  const missing = requiredScopes.filter((scope) => !scopes.has(scope));
  if (missing.length) throw new AgentAuthError(`Missing agent scope: ${missing.join(", ")}`, 403);

  const delegatedByUserId = record.delegatedByUserId ?? record.userId;
  if (!delegatedByUserId) throw new AgentAuthError("Agent token has no delegated user", 403);

  await prisma.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  return {
    credentialId: record.id,
    workspaceId: record.workspaceId,
    userId: delegatedByUserId,
    delegatedByUserId,
    agentId: record.agentId ?? "openclaw",
    scopes: record.scopes,
    projectIds: record.projectIds,
  };
}

export function agentAuthResponse(error: unknown) {
  if (error instanceof AgentAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Agent authentication failed" }, { status: 401 });
}

// Compatibility adapter for legacy /api/agent routes. New v1 routes should use
// authenticateAgentRequest directly so workspace and delegated actor come from
// the credential rather than a browser session.
export async function verifyAgentRequest(request: Request) {
  try {
    await authenticateAgentRequest(request);
    return null;
  } catch (error) {
    return agentAuthResponse(error);
  }
}
