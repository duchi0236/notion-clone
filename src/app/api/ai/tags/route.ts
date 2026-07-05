import { NextRequest, NextResponse } from "next/server";
import { fallbackTags, normalizeText } from "@/lib/ai-fallback";
import { llmConfigured, llmJson } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = String(body.text ?? body.html ?? body.content ?? "");
  const limit = Number(body.limit ?? 8);

  if (llmConfigured()) {
    const text = normalizeText(input).slice(0, 12_000);
    const tags = await llmJson<string[]>(
      [
        { role: "system", content: `为文档提取最多 ${limit} 个主题标签。输出严格的 JSON 字符串数组,如 ["标签1","标签2"],不要其他内容。标签用与原文相同的语言,每个不超过 8 个字。` },
        { role: "user", content: text },
      ],
      512
    );
    if (Array.isArray(tags) && tags.length > 0) {
      return NextResponse.json({
        tags: tags.filter((t) => typeof t === "string" && t.trim()).slice(0, limit),
        mode: "llm",
      });
    }
  }

  return NextResponse.json({
    tags: fallbackTags(input, limit),
    mode: "fallback",
    next: "connect-llm-provider",
  });
}
