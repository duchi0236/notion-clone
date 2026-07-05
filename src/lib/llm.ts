// Minimal provider-agnostic LLM client for server-side AI features
// (summarize / tags / task extraction). Uses whichever key is configured:
//   1. ANTHROPIC_API_KEY (+ ANTHROPIC_MODEL, default claude-haiku-4-5)
//   2. OPENAI_API_KEY (+ OPENAI_BASE_URL, OPENAI_MODEL — any OpenAI-compatible
//      endpoint works: OpenAI, DeepSeek, Moonshot, Qwen, vLLM…)
// Returns null when no provider is configured or the call fails, so callers
// can degrade to the rule-based fallbacks in ai-fallback.ts.

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

const TIMEOUT_MS = 30_000;

export function llmConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

export async function llmComplete(messages: LlmMessage[], maxTokens = 1024): Promise<string | null> {
  try {
    if (process.env.ANTHROPIC_API_KEY) return await anthropicComplete(messages, maxTokens);
    if (process.env.OPENAI_API_KEY) return await openaiComplete(messages, maxTokens);
  } catch (error) {
    console.warn("[llm] completion failed:", error instanceof Error ? error.message : error);
  }
  return null;
}

// Ask for strict JSON and parse defensively (strips markdown fences).
export async function llmJson<T>(messages: LlmMessage[], maxTokens = 1024): Promise<T | null> {
  const raw = await llmComplete(messages, maxTokens);
  if (!raw) return null;
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

async function anthropicComplete(messages: LlmMessage[], maxTokens: number): Promise<string | null> {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const rest = messages.filter((m) => m.role !== "system");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: rest.map((m) => ({ role: m.role, content: m.content })),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");
  return text || null;
}

async function openaiComplete(messages: LlmMessage[], maxTokens: number): Promise<string | null> {
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      max_tokens: maxTokens,
      messages,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? null;
}
