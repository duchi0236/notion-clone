import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgent, routeError } from "@/lib/agent-v1";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const principal = await requireAgent(req, ["jobs:read"]);
    const job = await prisma.agentJob.findFirst({
      where: { id: params.id, workspaceId: principal.workspaceId, requestedById: principal.userId },
      include: { steps: { orderBy: { sequence: "asc" } }, approvals: true, changeSets: true },
    });
    if (!job) return Response.json({ error: "Agent Job not found" }, { status: 404 });
    return Response.json({ job });
  } catch (error) {
    return routeError(error);
  }
}
