import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { verifyAgentRequest } from "@/lib/agent-auth";
import { searchKnowledge } from "@/lib/knowledge-service";

export async function POST(req: NextRequest) {
  const unauthorized = await verifyAgentRequest(req);
  if (unauthorized) return unauthorized;

  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const q = String(body.query ?? body.q ?? "").trim();
  const limit = Number(body.limit ?? 8);

  if (!q) return NextResponse.json({ context: [], mode: "decoupled-knowledge-layer" });

  const [knowledgeResults, memories] = await Promise.all([
    searchKnowledge({
      workspaceId: workspace.id,
      query: q,
      limit,
      requireAiReadable: true,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    }),
    prisma.agentMemory.findMany({
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
    }),
  ]);

  return NextResponse.json({
    mode: "decoupled-knowledge-layer",
    context: [
      ...knowledgeResults.map((item) => ({
        type: item.citation.sourceType,
        id: item.citation.sourceId,
        title: item.citation.title,
        summary: item.chunk.summary,
        text: item.chunk.text,
        score: item.score,
        citation: item.citation,
        metadata: item.chunk.metadata,
      })),
      ...memories.map((m) => ({
        type: "memory",
        id: m.id,
        content: m.content,
        summary: m.summary,
        tags: m.tags,
        confidence: m.confidence,
      })),
    ].slice(0, limit * 2),
  });
}
