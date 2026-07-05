import { NextRequest, NextResponse } from "next/server";
import { fallbackSummary, normalizeText } from "@/lib/ai-fallback";
import { llmComplete, llmConfigured } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = String(body.text ?? body.html ?? body.content ?? "");
  const max = Number(body.max ?? 180);

  if (llmConfigured()) {
    const text = normalizeText(input).slice(0, 12_000);
    const summary = await llmComplete(
      [
        { role: "system", content: `你是文档摘要助手。用与原文相同的语言输出一段不超过 ${max} 字的摘要,只输出摘要本身,不要任何前缀或解释。` },
        { role: "user", content: text },
      ],
      Math.min(1024, max * 4)
    );
    if (summary) {
      return NextResponse.json({ summary: summary.trim().slice(0, max * 2), mode: "llm" });
    }
  }

  return NextResponse.json({
    summary: fallbackSummary(input, max),
    mode: "fallback",
    next: "connect-llm-provider",
  });
}
