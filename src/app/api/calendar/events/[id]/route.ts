import { NextRequest, NextResponse } from "next/server";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { archiveCalendarEvent, updateCalendarEvent } from "@/lib/commands";
import { routeError } from "@/lib/agent-v1";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, workspace } = await ensureWorkspace();
    const body = await req.json().catch(() => ({}));
    const { expectedVersion, ...patch } = body;
    const result = await updateCalendarEvent({
      workspaceId: workspace.id,
      idempotencyKey: req.headers.get("idempotency-key") ?? `user:calendar:update:${params.id}:${crypto.randomUUID()}`,
      expectedVersion,
      actor: { type: "user", userId: user.id },
    }, params.id, patch, expectedVersion);
    return NextResponse.json(result);
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, workspace } = await ensureWorkspace();
    const expectedVersion = Number(new URL(req.url).searchParams.get("expectedVersion")) || undefined;
    const result = await archiveCalendarEvent({
      workspaceId: workspace.id,
      idempotencyKey: req.headers.get("idempotency-key") ?? `user:calendar:archive:${params.id}:${crypto.randomUUID()}`,
      expectedVersion,
      actor: { type: "user", userId: user.id },
    }, params.id, expectedVersion);
    return NextResponse.json(result);
  } catch (error) {
    return routeError(error);
  }
}
