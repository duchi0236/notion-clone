import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertProjectAccess, requireAgent, routeError } from "@/lib/agent-v1";

export async function POST(req: NextRequest) {
  try {
    const principal = await requireAgent(req, ["records:read"]);
    const body = await req.json().catch(() => ({}));
    const projectId = body.projectId ? String(body.projectId) : undefined;
    assertProjectAccess(principal, projectId);
    const tableId = String(body.tableId ?? "");
    const table = await prisma.collection.findFirst({ where: { id: tableId, workspaceId: principal.workspaceId } });
    if (!table) return Response.json({ error: "Table not found" }, { status: 404 });
    if (projectId && table.projectId !== projectId) return Response.json({ error: "Table is outside the authorized project" }, { status: 403 });
    const limit = Math.min(200, Math.max(1, Number(body.limit ?? 50)));
    const rows = await prisma.collectionRow.findMany({
      where: { collectionId: table.id },
      orderBy: { sortIndex: "asc" },
      take: limit,
      ...(body.cursor ? { cursor: { id: String(body.cursor) }, skip: 1 } : {}),
    });
    const visibleRows = rows.filter((row) => !(row.data as Record<string, unknown>)._archived);
    return Response.json({ table: { id: table.id, name: table.name, schema: table.schema }, rows: visibleRows, nextCursor: rows.at(-1)?.id ?? null });
  } catch (error) {
    return routeError(error);
  }
}
