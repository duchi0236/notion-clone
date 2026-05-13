import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

function tokens(value: string) {
  return value
    .toLowerCase()
    .replaceAll("，", " ")
    .replaceAll("。", " ")
    .replaceAll(",", " ")
    .replaceAll(".", " ")
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean);
}

function score(query: string, content: string) {
  const parts = tokens(query);
  const lower = content.toLowerCase();
  return parts.reduce((total, part) => total + (lower.includes(part) ? 1 : 0), 0);
}

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const query = String(body.query ?? body.q ?? "").trim();
  const limit = Number(body.limit ?? 10);

  if (!query) return NextResponse.json({ results: [], mode: "empty" });

  const indexes = await prisma.searchIndex.findMany({
    where: {
      document: {
        workspaceId: workspace.id,
        isArchived: false,
      },
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          icon: true,
          summary: true,
          tags: true,
          updatedAt: true,
        },
      },
    },
    take: 200,
  });

  const results = indexes
    .map((item) => {
      const content = `${item.title} ${item.summary ?? ""} ${item.tags.join(" ")} ${item.text}`;
      return {
        score: score(query, content),
        document: item.document,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return NextResponse.json({ results, mode: "token-overlap-fallback", next: "pgvector" });
}
