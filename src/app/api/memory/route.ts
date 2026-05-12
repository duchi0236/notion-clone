import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace, normalizeMemoryStatus } from "@/lib/clawnote-store";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const memories = await prisma.agentMemory.findMany({
    where: { workspaceId: workspace.id },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ memories });
}

export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const memory = await prisma.agentMemory.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      scope: body.scope ?? "WORKSPACE",
      content: body.content ?? "",
      summary: body.summary ?? null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      sourceType: body.sourceType ?? body.source ?? null,
      sourceId: body.sourceId ?? null,
      confidence: Number(body.confidence ?? 1),
      status: normalizeMemoryStatus(body.status),
    },
  });
  return NextResponse.json({ memory }, { status: 201 });
}
