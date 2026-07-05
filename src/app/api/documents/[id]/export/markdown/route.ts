import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { htmlToMarkdown } from "@/lib/markdown";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const document = await prisma.document.findFirst({ where: { id: params.id, workspaceId: workspace.id, isArchived: false } });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const markdown = htmlToMarkdown(document.contentHtml);
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(document.title)}.md"`,
    },
  });
}
