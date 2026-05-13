import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ tokens });
}

export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const token = createToken();
  const tokenHash = hashToken(token);

  const record = await prisma.apiToken.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      name: body.name ?? "OpenClaw Agent Token",
      scopes: Array.isArray(body.scopes) ? body.scopes : ["agent:read", "agent:write", "memory:write", "run:write"],
      tokenHash,
    },
    select: {
      id: true,
      name: true,
      scopes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ token, record }, { status: 201 });
}
