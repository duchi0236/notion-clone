import { NextRequest, NextResponse } from "next/server";
import { fallbackTags } from "@/lib/ai-fallback";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = String(body.text ?? body.html ?? body.content ?? "");
  const limit = Number(body.limit ?? 8);

  return NextResponse.json({
    tags: fallbackTags(input, limit),
    mode: "fallback",
    next: "connect-llm-provider",
  });
}
