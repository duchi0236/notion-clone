import { NextRequest, NextResponse } from "next/server";
import { ensureTaskCollection, ensureWorkspace } from "@/lib/clawnote-store";
import { createWorkItems } from "@/lib/commands";

export async function GET() {
  const { workspace } = await ensureWorkspace();
  const collection = await ensureTaskCollection(workspace.id);
  return NextResponse.json({
    collection,
    rows: collection.rows.filter((row) => !(row.data as Record<string, unknown>)._archived),
  });
}

export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const result = await createWorkItems({
    workspaceId: workspace.id,
    idempotencyKey: req.headers.get("idempotency-key") ?? `user:work-item:create:${crypto.randomUUID()}`,
    actor: { type: "user", userId: user.id },
  }, [{
    name: body.name ?? "新任务",
    owner: body.owner,
    status: body.status,
    priority: body.priority,
    dueDate: body.dueDate,
    progress: body.progress,
  }]);
  return NextResponse.json({ row: result.rows[0], changeSetId: result.changeSetId }, { status: 201 });
}
