import { NextRequest, NextResponse } from "next/server";
import { extractTodos, normalizeText } from "@/lib/ai-fallback";
import { llmConfigured, llmJson } from "@/lib/llm";

type ExtractedTask = { name: string; priority?: string };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = String(body.text ?? body.html ?? body.content ?? "");
  const limit = Number(body.limit ?? 20);

  if (llmConfigured()) {
    const text = normalizeText(input).slice(0, 12_000);
    const items = await llmJson<ExtractedTask[]>(
      [
        {
          role: "system",
          content: `从文档中提取待办任务(最多 ${limit} 条)。输出严格的 JSON 数组: [{"name":"任务描述","priority":"高|中|低"}]。任务描述用与原文相同的语言、不超过 80 字;没有任务时输出 []。不要输出其他内容。`,
        },
        { role: "user", content: text },
      ],
      2048
    );
    if (Array.isArray(items)) {
      const tasks = items
        .filter((item) => item && typeof item.name === "string" && item.name.trim())
        .slice(0, limit)
        .map((item, index) => ({
          id: `todo-${index + 1}`,
          name: item.name.trim().slice(0, 120),
          status: "未开始",
          priority: ["高", "中", "低"].includes(item.priority ?? "") ? item.priority : "中",
        }));
      return NextResponse.json({ tasks, mode: "llm" });
    }
  }

  return NextResponse.json({
    tasks: extractTodos(input, limit),
    mode: "fallback",
    next: "connect-llm-provider",
  });
}
