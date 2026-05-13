import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { verifyAgentRequest } from "@/lib/agent-auth";

export async function POST(req: NextRequest) {
  const unauthorized = await verifyAgentRequest(req);
  if (unauthorized) return unauthorized;

  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const q = String(body.query ?? body.q ?? "").trim();
  const limit = Number(body.limit ?? 8);

  if (!q) return NextResponse.json({ context: [] });

  const documents = await prisma.document.findMany({
    where: {
      workspaceId: workspace.id,
      isArchived: false,
      agentReadable: true,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { contentText: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  const memories = await prisma.agentMemory.findMany({
    where: {
      workspaceId: workspace.id,
      status: "ACCEPTED",
      OR: [
        { content: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ],
    },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    context: [
      ...documents.map((d) => ({ type: "document", id: d.id, title: d.title, summary: d.summary, text: d.contentText, tags: d.tags, updatedAt: d.updatedAt })),
      ...memories.map((m) => ({ type: "memory", id: m.id, content: m.content, summary: m.summary, tags: m.tags, confidence: m.confidence })),
    ],
  });
}
