import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function GET(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ results: [] });

  const [documents, memories, inbox] = await Promise.all([
    prisma.document.findMany({
      where: {
        workspaceId: workspace.id,
        isArchived: false,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { contentText: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ],
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.agentMemory.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [
          { content: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ],
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.inboxItem.findMany({
      where: {
        workspaceId: workspace.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    results: [
      ...documents.map((item) => ({ type: "document", item })),
      ...memories.map((item) => ({ type: "memory", item })),
      ...inbox.map((item) => ({ type: "inbox", item })),
    ],
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const query = String(body.q ?? body.query ?? "").trim();
  const url = new URL(req.url);
  url.searchParams.set("q", query);
  return GET(new NextRequest(url));
}
