import { NextRequest, NextResponse } from "next/server";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { createAIDraft, listAIDrafts } from "@/lib/ai-draft-service";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const drafts = await listAIDrafts(workspace.id);
  return NextResponse.json({ drafts });
}

export async function POST(req: NextRequest) {
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
    generatedBy: body.generatedBy ?? "user",
  });

  return NextResponse.json({ draft }, { status: 201 });
}
