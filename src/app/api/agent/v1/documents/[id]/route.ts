import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertDocumentProjectAccess, requireAgent, routeError } from "@/lib/agent-v1";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const principal = await requireAgent(req, ["documents:read"]);
    const projectId = new URL(req.url).searchParams.get("projectId") ?? undefined;
    await assertDocumentProjectAccess(principal, params.id, projectId);
    const document = await prisma.document.findFirst({
      where: { id: params.id, workspaceId: principal.workspaceId, isArchived: false, agentReadable: true },
      select: { id: true, title: true, contentText: true, summary: true, tags: true, status: true, updatedAt: true },
    });
    if (!document) return Response.json({ error: "Document not found" }, { status: 404 });
    return Response.json({ document });
  } catch (error) {
    return routeError(error);
  }
}
