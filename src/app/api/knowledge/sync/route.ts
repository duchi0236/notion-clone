import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { syncDocumentToSearchIndex } from "@/lib/knowledge-service";

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const documentId = String(body.documentId ?? "");

  if (documentId) {
    const document = await prisma.document.findFirst({ where: { id: documentId, workspaceId: workspace.id } });
    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    const result = await syncDocumentToSearchIndex(document.id);
    return NextResponse.json({ synced: 1, result });
  }

  const documents = await prisma.document.findMany({
    where: { workspaceId: workspace.id, isArchived: false, agentReadable: true },
    select: { id: true },
  });

  const results = [];
  for (const document of documents) {
    results.push(await syncDocumentToSearchIndex(document.id));
  }

  return NextResponse.json({ synced: results.length, results });
}
