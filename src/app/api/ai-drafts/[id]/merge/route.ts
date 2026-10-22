import { NextRequest, NextResponse } from "next/server";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { mergeDocumentDraft } from "@/lib/commands";
import { routeError } from "@/lib/agent-v1";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, workspace } = await ensureWorkspace();
    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "replace" ? "replace" : "new-document";
    const result = await mergeDocumentDraft({
      workspaceId: workspace.id,
      idempotencyKey: req.headers.get("idempotency-key") ?? `user:draft:merge:${params.id}:${crypto.randomUUID()}`,
      actor: { type: "user", userId: user.id },
      reason: "用户在草稿审核界面确认合并",
    }, params.id, { mode, targetId: body.targetId, keepTitle: Boolean(body.keepTitle) });
    return NextResponse.json(result);
  } catch (error) {
    return routeError(error);
  }
}
