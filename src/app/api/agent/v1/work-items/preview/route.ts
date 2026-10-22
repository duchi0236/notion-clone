import { NextRequest } from "next/server";
import { assertProjectAccess, createProposal, requireAgent, routeError } from "@/lib/agent-v1";

export async function POST(req: NextRequest) {
  try {
    const principal = await requireAgent(req, ["tasks:write"]);
    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    if (!body.jobId || !items.length) return Response.json({ error: "jobId and items are required" }, { status: 400 });
    assertProjectAccess(principal, body.projectId ? String(body.projectId) : undefined);
    const proposal = await createProposal({
      workspaceId: principal.workspaceId,
      jobId: String(body.jobId),
      action: "work-items.apply",
      summary: `准备创建 ${items.length} 条任务`,
      payload: { items, sourceIds: body.sourceIds ?? [], projectId: body.projectId ?? null },
      requestedById: principal.userId,
    });
    return Response.json({ proposal, proposalId: proposal.id, requiresApproval: proposal.status === "PENDING" }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
