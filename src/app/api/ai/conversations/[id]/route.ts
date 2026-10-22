import { ensureWorkspace } from "@/lib/clawnote-store";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { user, workspace } = await ensureWorkspace();
  const conversation = await prisma.agentConversation.findFirst({
    where: { id: params.id, workspaceId: workspace.id, createdById: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      jobs: {
        orderBy: { createdAt: "desc" },
        include: { steps: { orderBy: { sequence: "asc" } }, approvals: { orderBy: { createdAt: "desc" } }, changeSets: true },
      },
    },
  });
  if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });
  return Response.json({ conversation });
}
