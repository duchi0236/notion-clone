import { NextRequest, NextResponse } from "next/server";
import { extractTodos } from "@/lib/ai-fallback";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input = String(body.text ?? body.html ?? body.content ?? "");
  const limit = Number(body.limit ?? 20);

  return NextResponse.json({
    tasks: extractTodos(input, limit),
    mode: "fallback",
    next: "connect-llm-provider",
  });
}
