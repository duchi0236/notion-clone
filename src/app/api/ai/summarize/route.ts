import { NextRequest, NextResponse } from "next/server";
import { fallbackSummary } from "@/lib/ai-fallback";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = String(body.text ?? body.html ?? body.content ?? "");
  const max = Number(body.max ?? 180);

  return NextResponse.json({
    summary: fallbackSummary(input, max),
    mode: "fallback",
    next: "connect-llm-provider",
  });
}
