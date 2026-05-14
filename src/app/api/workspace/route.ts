import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTaskCollection, ensureWorkspace, seedTemplates } from "@/lib/clawnote-store";
import { canWriteWorkspace } from "@/lib/permissions";

export async function GET() {
  const { user, workspace } = await ensureWorkspace();
  await seedTemplates(workspace.id);
  const taskCollection = await ensureTaskCollection(workspace.id);

  const fullWorkspace = await prisma.workspace.findUnique({
    where: { id: workspace.id },
    include: {
      owner: { select: { id: true, email: true, name: true, avatarUrl: true } },
      members: {
        include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { documents: true, collections: true, memories: true, inboxItems: true, agentRuns: true } },
    },
  });

  const [documents, inboxItems, memories, templates, agentRuns] = await Promise.all([
    prisma.document.findMany({ where: { workspaceId: workspace.id, isArchived: false }, orderBy: { updatedAt: "desc" } }),
    prisma.inboxItem.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" } }),
    prisma.agentMemory.findMany({ where: { workspaceId: workspace.id }, orderBy: { updatedAt: "desc" } }),
    prisma.template.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "asc" } }),
    prisma.agentRun.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return NextResponse.json({ user, workspace: fullWorkspace ?? workspace, documents, taskCollection, inboxItems, memories, templates, agentRuns });
}

export async function PUT(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const allowed = await canWriteWorkspace(workspace.id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const updated = await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      name: body.name ?? workspace.name,
      icon: body.icon ?? workspace.icon,
      description: body.description ?? workspace.description,
    },
    include: {
      owner: { select: { id: true, email: true, name: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } } },
      _count: { select: { documents: true, collections: true, memories: true, inboxItems: true, agentRuns: true } },
    },
  });

  return NextResponse.json({ workspace: updated });
}
