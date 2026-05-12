import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace, normalizeMemoryStatus, summarize } from "@/lib/clawnote-store";

export async function GET(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const status = req.nextUrl.searchParams.get("status");
  const memories = await prisma.agentMemory.findMany({
    where: {
      workspaceId: workspace.id,
      ...(status ? { status: normalizeMemoryStatus(status) } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ memories });
}

export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const content = body.content ?? "";
  const memory = await prisma.agentMemory.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      scope: body.scope ?? "WORKSPACE",
      content,
      summary: body.summary ?? summarize(content),
      tags: Array.isArray(body.tags) ? body.tags : [],
      sourceType: body.sourceType ?? body.source ?? null,
      sourceId: body.sourceId ?? null,
      confidence: typeof body.confidence === "number" ? body.confidence : 0.9,
      status: normalizeMemoryStatus(body.status),
    },
  });
  return NextResponse.json({ memory }, { status: 201 });
}
