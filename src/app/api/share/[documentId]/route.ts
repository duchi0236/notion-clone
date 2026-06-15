import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentVersion, ensureWorkspace } from "@/lib/clawnote-store";

export async function GET(req: NextRequest, { params }: { params: { documentId: string } }) {
  const { workspace } = await ensureWorkspace();
  const document = await prisma.document.findFirst({
    where: { id: params.documentId, workspaceId: workspace.id, isArchived: false },
    select: {
      id: true,
      title: true,
      isPublished: true,
      agentReadable: true,
      agentWritable: true,
      updatedAt: true,
    },
  });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const url = new URL(req.url);
  return NextResponse.json({
    share: {
      ...document,
      publicUrl: document.isPublished ? `${url.origin}/share/${document.id}` : null,
      permissionLevels: ["owner", "full", "edit", "comment", "view", "none"],
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { documentId: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const existing = await prisma.document.findFirst({
    where: { id: params.documentId, workspaceId: workspace.id, isArchived: false },
  });
  if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const document = await prisma.document.update({
    where: { id: existing.id },
    data: {
      isPublished: body.isPublished ?? existing.isPublished,
      agentReadable: body.agentReadable ?? existing.agentReadable,
      agentWritable: body.agentWritable ?? existing.agentWritable,
    },
  });

  await createDocumentVersion(document.id, "user", document, document.isPublished ? "publish-page" : "unpublish-page");
  return NextResponse.json({ share: document });
}
