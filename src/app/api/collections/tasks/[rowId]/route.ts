import { NextRequest, NextResponse } from "next/server";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { archiveWorkItem, updateWorkItem } from "@/lib/commands";
import { routeError } from "@/lib/agent-v1";

export async function PUT(req: NextRequest, { params }: { params: { rowId: string } }) {
  try {
    const { user, workspace } = await ensureWorkspace();
    const body = await req.json().catch(() => ({}));
    const { expectedVersion, ...patch } = body;
    const result = await updateWorkItem({
      workspaceId: workspace.id,
      idempotencyKey: req.headers.get("idempotency-key") ?? `user:work-item:update:${params.rowId}:${crypto.randomUUID()}`,
      expectedVersion,
      actor: { type: "user", userId: user.id },
    }, params.rowId, patch, expectedVersion);
    return NextResponse.json(result);
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { rowId: string } }) {
  try {
    const { user, workspace } = await ensureWorkspace();
    const expectedVersion = Number(new URL(req.url).searchParams.get("expectedVersion")) || undefined;
    const result = await archiveWorkItem({
      workspaceId: workspace.id,
      idempotencyKey: req.headers.get("idempotency-key") ?? `user:work-item:archive:${params.rowId}:${crypto.randomUUID()}`,
      expectedVersion,
      actor: { type: "user", userId: user.id },
    }, params.rowId, expectedVersion);
    return NextResponse.json(result);
  } catch (error) {
    return routeError(error);
  }
}
