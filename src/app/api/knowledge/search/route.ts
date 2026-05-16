import { NextRequest, NextResponse } from "next/server";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { searchKnowledge } from "@/lib/knowledge-service";

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const query = String(body.query ?? body.q ?? "").trim();

  if (!query) return NextResponse.json({ results: [] });

  const results = await searchKnowledge({
    workspaceId: workspace.id,
    query,
    limit: Number(body.limit ?? 10),
    tags: Array.isArray(body.tags) ? body.tags : undefined,
    requireAiReadable: body.requireAiReadable ?? true,
  });

  return NextResponse.json({ results, mode: "decoupled-knowledge-layer" });
}
