import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const documents = await prisma.document.findMany({
    where: { workspaceId: workspace.id, isArchived: false },
    orderBy: [{ sortIndex: "asc" }, { updatedAt: "desc" }],
  });

  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const page = byId.get(params.id);
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const ancestors = [];
  let current = page;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
  }

  const children = documents.filter((doc) => doc.parentId === params.id);
  const siblings = documents.filter((doc) => (doc.parentId ?? null) === (page.parentId ?? null));

  return NextResponse.json({ page, ancestors, children, siblings });
}
