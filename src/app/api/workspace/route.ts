import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureTaskCollection, ensureWorkspace, seedTemplates } from "@/lib/clawnote-store";

export async function GET() {
  const { user, workspace } = await ensureWorkspace();
  await seedTemplates(workspace.id);
  const taskCollection = await ensureTaskCollection(workspace.id);

  const [documents, inboxItems, memories, templates, agentRuns] = await Promise.all([
    prisma.document.findMany({
      where: { workspaceId: workspace.id, isArchived: false },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.inboxItem.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentMemory.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.template.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agentRun.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    user,
    workspace,
    documents,
    taskCollection,
    inboxItems,
    memories,
    templates,
    agentRuns,
  });
}
