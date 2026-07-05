import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function GET(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

  const documents = await prisma.document.findMany({
    where: {
      workspaceId: workspace.id,
      isArchived: false,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { contentText: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      icon: true,
      summary: true,
      tags: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ documents });
}
