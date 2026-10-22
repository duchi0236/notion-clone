import { NextRequest } from "next/server";
import { createDocumentDraft } from "@/lib/commands";
import { agentCommandContext, assertDocumentProjectAccess, requireAgent, routeError } from "@/lib/agent-v1";

export async function POST(req: NextRequest) {
  try {
    const principal = await requireAgent(req, ["documents:draft"]);
    const body = await req.json().catch(() => ({}));
    const content = String(body.content ?? body.contentText ?? "").trim();
    if (!content) return Response.json({ error: "content is required" }, { status: 400 });
    if (body.targetId) {
      await assertDocumentProjectAccess(principal, String(body.targetId), body.projectId ? String(body.projectId) : undefined);
    }
    const ctx = agentCommandContext(principal, {
      idempotencyKey: String(body.idempotencyKey ?? `draft:${crypto.randomUUID()}`),
      jobId: body.jobId,
      projectId: body.projectId,
      reason: body.prompt,
      sourceIds: Array.isArray(body.sourceIds) ? body.sourceIds.map(String) : [],
    });
    const draft = await createDocumentDraft(ctx, {
      title: body.title,
      content,
      targetId: body.targetId,
      prompt: body.prompt,
    });
    return Response.json(draft, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
