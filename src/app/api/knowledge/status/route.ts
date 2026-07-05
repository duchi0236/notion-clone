import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function GET() {
  const { workspace } = await ensureWorkspace();

  const [documents, readableDocuments, indexed] = await Promise.all([
    prisma.document.count({ where: { workspaceId: workspace.id, isArchived: false } }),
    prisma.document.count({ where: { workspaceId: workspace.id, isArchived: false, agentReadable: true } }),
    prisma.searchIndex.count({ where: { document: { workspaceId: workspace.id, isArchived: false } } }),
  ]);

  const stale = await prisma.document.count({
    where: {
      workspaceId: workspace.id,
      isArchived: false,
      agentReadable: true,
      OR: [
        { searchIndex: null },
        { searchIndex: { updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
      ],
    },
  });

  return NextResponse.json({
    documents,
    readableDocuments,
    indexed,
    stale,
    indexCoverage: readableDocuments === 0 ? 1 : indexed / readableDocuments,
  });
}
