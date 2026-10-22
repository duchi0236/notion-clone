import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { AGENT_SCOPES, hashAgentToken } from "@/lib/agent-auth";

function createToken() {
  return `cln_${crypto.randomBytes(32).toString("hex")}`;
}

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const tokens = await prisma.apiToken.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      scopes: true,
      agentId: true,
      projectIds: true,
      expiresAt: true,
      revokedAt: true,
      legacy: true,
      delegatedByUserId: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    tokens: tokens.map((token) => ({
      ...token,
      legacy: token.legacy
        || !token.delegatedByUserId
        || token.scopes.some((scope) => !AGENT_SCOPES.includes(scope as (typeof AGENT_SCOPES)[number])),
      delegatedByUserId: undefined,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const token = createToken();
  const tokenHash = hashAgentToken(token);
  const defaultScopes = [
    "knowledge:read",
    "documents:read",
    "documents:draft",
    "tasks:read",
    "records:read",
    "calendar:read",
    "jobs:read",
    "jobs:write",
  ];
  const requestedScopes = Array.isArray(body.scopes) ? body.scopes.map(String) : defaultScopes;
  const scopes = requestedScopes.filter((scope: string) => AGENT_SCOPES.includes(scope as (typeof AGENT_SCOPES)[number]));
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) {
    return NextResponse.json({ error: "expiresAt must be a future date" }, { status: 400 });
  }
  const requestedProjectIds: string[] = Array.isArray(body.projectIds)
    ? Array.from(new Set<string>((body.projectIds as unknown[]).map((value) => String(value))))
    : [];
  if (requestedProjectIds.length) {
    const allowedProjects = await prisma.document.count({
      where: { id: { in: requestedProjectIds }, workspaceId: workspace.id, type: "PROJECT", isArchived: false },
    });
    if (allowedProjects !== requestedProjectIds.length) {
      return NextResponse.json({ error: "projectIds contains an invalid or archived project" }, { status: 400 });
    }
  }

  const record = await prisma.apiToken.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      delegatedByUserId: user.id,
      agentId: typeof body.agentId === "string" && body.agentId.trim() ? body.agentId.trim() : "openclaw",
      projectIds: requestedProjectIds,
      expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      name: body.name ?? "OpenClaw Agent Token",
      scopes,
      tokenHash,
    },
    select: {
      id: true,
      name: true,
      scopes: true,
      agentId: true,
      projectIds: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ token, record }, { status: 201 });
}
