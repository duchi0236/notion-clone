import { NextRequest, NextResponse } from "next/server";
import { updateAIDraftStatus } from "@/lib/ai-draft-service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const status = body.status;

  if (!["pending", "accepted", "rejected", "merged"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const draft = await updateAIDraftStatus(params.id, status);
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  return NextResponse.json({ draft });
}
