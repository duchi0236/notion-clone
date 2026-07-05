import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();

  const document = await prisma.document.findFirst({
    where: {
      id: params.id,
      workspaceId: workspace.id,
      isArchived: true,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await prisma.document.delete({
    where: { id: document.id },
  });

  return NextResponse.json({ success: true });
}
