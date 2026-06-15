import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentVersion, ensureWorkspace } from "@/lib/clawnote-store";

async function descendantIds(workspaceId: string, rootId: string) {
  const all = await prisma.document.findMany({ where: { workspaceId }, select: { id: true, parentId: true } });
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const doc of all) {
      if (doc.parentId && ids.has(doc.parentId) && !ids.has(doc.id)) {
        ids.add(doc.id);
        changed = true;
      }
    }
  }
  return ids;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const parentId = body.parentId ?? null;

  const page = await prisma.document.findFirst({
    where: { id: params.id, workspaceId: workspace.id, isArchived: false },
  });
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  if (parentId) {
    const parent = await prisma.document.findFirst({
      where: { id: parentId, workspaceId: workspace.id, isArchived: false },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: "Target parent not found" }, { status: 404 });
    const descendants = await descendantIds(workspace.id, params.id);
    if (descendants.has(parentId)) return NextResponse.json({ error: "Cannot move a page into its descendant" }, { status: 400 });
  }

  const sortIndex =
    body.sortIndex === undefined
      ? await prisma.document.count({ where: { workspaceId: workspace.id, parentId, isArchived: false } })
      : Number(body.sortIndex);

  const document = await prisma.document.update({
    where: { id: params.id },
    data: { parentId, sortIndex },
  });

  await createDocumentVersion(document.id, "user", document, "move-page");
  return NextResponse.json({ document });
}
