import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertProjectAccess, createProposal, requireAgent, routeError } from "@/lib/agent-v1";

export async function POST(req: NextRequest) {
  try {
    const principal = await requireAgent(req, ["records:write"]);
    const body = await req.json().catch(() => ({}));
    const patches = Array.isArray(body.patches) ? body.patches : [];
    if (!body.jobId || !body.tableId || !patches.length) {
      return Response.json({ error: "jobId, tableId and patches are required" }, { status: 400 });
    }
    assertProjectAccess(principal, body.projectId ? String(body.projectId) : undefined);
    const table = await prisma.collection.findFirst({ where: { id: String(body.tableId), workspaceId: principal.workspaceId } });
    if (!table) return Response.json({ error: "Table not found" }, { status: 404 });
    if (body.projectId && table.projectId !== String(body.projectId)) {
      return Response.json({ error: "Table is outside the authorized project" }, { status: 403 });
    }
    const rows = await prisma.collectionRow.findMany({
      where: { collectionId: table.id, id: { in: patches.map((patch: { id: unknown }) => String(patch.id)) } },
    });
    const proposal = await createProposal({
      workspaceId: principal.workspaceId,
      jobId: String(body.jobId),
      action: "records.apply",
      summary: `准备更新 ${patches.length} 条「${table.name}」记录`,
      payload: { tableId: table.id, patches, before: rows, sourceIds: body.sourceIds ?? [], projectId: body.projectId ?? null },
      requestedById: principal.userId,
    });
    return Response.json({ proposal, proposalId: proposal.id, requiresApproval: proposal.status === "PENDING" }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
