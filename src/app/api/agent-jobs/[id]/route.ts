import { ensureWorkspace } from "@/lib/clawnote-store";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { user, workspace } = await ensureWorkspace();
  const job = await prisma.agentJob.findFirst({
    where: { id: params.id, workspaceId: workspace.id, requestedById: user.id },
    include: {
      steps: { orderBy: { sequence: "asc" } },
      approvals: { orderBy: { createdAt: "desc" } },
      changeSets: { include: { items: true } },
    },
  });
  if (!job) return Response.json({ error: "Agent Job not found" }, { status: 404 });
  return Response.json({ job });
}
