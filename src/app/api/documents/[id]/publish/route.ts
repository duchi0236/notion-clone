import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const isPublished = body.isPublished === undefined ? true : Boolean(body.isPublished);

  const current = await prisma.document.findFirst({ where: { id: params.id, workspaceId: workspace.id } });
  if (!current) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const document = await prisma.document.update({
    where: { id: params.id },
    data: { isPublished },
  });

  return NextResponse.json({ document, publicUrl: isPublished ? `/public/docs/${document.id}` : null });
}
