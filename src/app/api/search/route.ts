import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

async function searchKnowledge(q: string) {
  const { workspace } = await ensureWorkspace();
  const query = q.trim();
  if (!query) return { results: [] };

  const [documents, memories, inbox] = await Promise.all([
    prisma.document.findMany({
      where: {
        workspaceId: workspace.id,
        isArchived: false,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { contentText: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
          { tags: { has: query } },
        ],
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.agentMemory.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [
          { content: { contains: query, mode: "insensitive" } },
          { summary: { contains: query, mode: "insensitive" } },
          { tags: { has: query } },
        ],
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.inboxItem.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return {
    results: [
      ...documents.map((item) => ({ type: "document", item })),
      ...memories.map((item) => ({ type: "memory", item })),
      ...inbox.map((item) => ({ type: "inbox", item })),
    ],
  };
}

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return NextResponse.json(await searchKnowledge(q));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const q = String(body.q ?? body.query ?? "");
  return NextResponse.json(await searchKnowledge(q));
}
