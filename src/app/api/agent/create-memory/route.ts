import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

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
      tags: Array.isArray(body.tags) ? body.tags : ["Agent"],
      sourceType: body.sourceType ?? "OPENCLAW",
      sourceId: body.sourceId ?? null,
      confidence: Number(body.confidence ?? 0.9),
      status: body.status ?? "PENDING",
    },
  });

  return NextResponse.json({ memory }, { status: 201 });
}
