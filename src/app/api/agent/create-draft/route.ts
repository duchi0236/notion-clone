import { NextRequest, NextResponse } from "next/server";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { verifyAgentRequest } from "@/lib/agent-auth";
import { createAIDraft } from "@/lib/ai-draft-service";

export async function POST(req: NextRequest) {
  const unauthorized = await verifyAgentRequest(req);
  if (unauthorized) return unauthorized;

  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));

  const draft = await createAIDraft({
    workspaceId: workspace.id,
    targetType: body.targetType ?? "document",
    targetId: body.targetId,
    title: body.title,
    contentHtml: body.contentHtml,
    contentText: body.contentText ?? body.content,
    prompt: body.prompt,
    sourceIds: Array.isArray(body.sourceIds) ? body.sourceIds : [],
    generatedBy: "agent",
  });

  return NextResponse.json({ draft }, { status: 201 });
}
