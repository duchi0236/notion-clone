import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace, seedTemplates } from "@/lib/clawnote-store";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  await seedTemplates(workspace.id);
  const templates = await prisma.template.findMany({
    where: { OR: [{ workspaceId: workspace.id }, { workspaceId: null }] },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const contentHtml = body.contentHtml ?? body.html ?? "<h1>Untitled Template</h1><p></p>";

  const template = await prisma.template.create({
    data: {
      workspaceId: workspace.id,
      title: body.title ?? "Untitled Template",
      icon: body.icon ?? "📄",
      category: body.category ?? "自定义",
      description: body.description ?? null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      contentHtml,
      contentJson: body.contentJson ?? { type: "doc", content: [{ type: "html", html: contentHtml }] },
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
