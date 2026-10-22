import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertProjectAccess, requireAgent, routeError } from "@/lib/agent-v1";

export async function POST(req: NextRequest) {
  try {
    const principal = await requireAgent(req, ["knowledge:read"]);
    const body = await req.json().catch(() => ({}));
    const query = String(body.query ?? "").trim();
    if (!query) return Response.json({ error: "query is required" }, { status: 400 });
    const wildcard = query === "*";
    const projectId = body.projectId ? String(body.projectId) : undefined;
    assertProjectAccess(principal, projectId);
    const limit = Math.min(20, Math.max(1, Number(body.limit ?? 8)));
    const requested = new Set(Array.isArray(body.resourceTypes) ? body.resourceTypes.map(String) : ["document", "work-item", "record", "calendar-event"]);
    const results: Array<Record<string, unknown>> = [];

    if (requested.has("document")) {
      const docs = await prisma.document.findMany({
        where: {
          workspaceId: principal.workspaceId,
          isArchived: false,
          agentReadable: true,
          ...(projectId ? { OR: [
            { id: projectId },
            { parentId: projectId },
          ] } : {}),
          ...(wildcard ? {} : { AND: [{ OR: [
            { title: { contains: query, mode: "insensitive" } },
            { contentText: { contains: query, mode: "insensitive" } },
          ] }] }),
        },
        take: limit,
        orderBy: { updatedAt: "desc" },
      });
      results.push(...docs.map((doc) => ({
        id: doc.id,
        type: "document",
        title: doc.title,
        snippet: doc.summary ?? doc.contentText.slice(0, 240),
        updatedAt: doc.updatedAt,
      })));
    }

    if (requested.has("calendar-event")) {
      const events = await prisma.calendarEvent.findMany({
        where: {
          workspaceId: principal.workspaceId,
          ...(projectId ? { projectId } : {}),
          ...(wildcard ? {} : { title: { contains: query, mode: "insensitive" } }),
        },
        take: limit,
        orderBy: { startsAt: "desc" },
      });
      results.push(...events.map((event) => ({
        id: event.id,
        type: "calendar-event",
        title: event.title,
        snippet: event.description ?? event.startsAt.toISOString(),
      })));
    }

    if (requested.has("record") || requested.has("work-item")) {
      const rows = await prisma.collectionRow.findMany({
        where: {
          collection: {
            workspaceId: principal.workspaceId,
            ...(projectId ? { OR: [{ projectId }, { type: "TASKS" }] } : {}),
          },
        },
        include: { collection: { select: { name: true, type: true } } },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
      const matching = rows.filter((row) => {
        const type = row.collection.type === "TASKS" ? "work-item" : "record";
        const data = row.data as Record<string, unknown>;
        const archived = Boolean(data._archived);
        const projectAllowed = !projectId || row.collection.type !== "TASKS" || data._projectId === projectId;
        return projectAllowed && !archived && requested.has(type) && (wildcard || JSON.stringify(row.data).toLowerCase().includes(query.toLowerCase()));
      }).slice(0, limit);
      results.push(...matching.map((row) => ({
        id: row.id,
        type: row.collection.type === "TASKS" ? "work-item" : "record",
        title: String((row.data as Record<string, unknown>).name ?? row.collection.name),
        snippet: JSON.stringify(row.data).slice(0, 240),
      })));
    }

    return Response.json({ results: results.slice(0, limit) });
  } catch (error) {
    return routeError(error);
  }
}
