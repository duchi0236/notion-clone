import { NextRequest, NextResponse } from "next/server";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { updateAIDraftStatus } from "@/lib/ai-draft-service";
import type { AIDraftStatus } from "@/lib/domain";

const VALID_STATUSES: AIDraftStatus[] = ["pending", "accepted", "rejected", "merged"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const status = body.status as AIDraftStatus;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const draft = await updateAIDraftStatus({
    id: params.id,
    workspaceId: workspace.id,
    status,
  });
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  return NextResponse.json({ draft });
}
