import { NextRequest, NextResponse } from "next/server";
import { ensureWorkspace } from "@/lib/clawnote-store";
import { getAiConfig } from "@/lib/ai-config";

export const runtime = "nodejs";

const SENTINEL = "<!--clawnote:fullhtml-->";

// Pull a full HTML document out of a model reply (strip ``` fences / prose).
function extractHtml(text: string): string {
  if (!text) return "";
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  let html = (fenced ? fenced[1] : text).trim();
  const idx = html.search(/<!doctype html|<html[\s>]/i);
  if (idx > 0) html = html.slice(idx);
  return html.trim();
}

const SYSTEM_PROMPT =
  "You are an expert front-end designer. Produce a SINGLE, complete, standalone HTML5 document " +
  "(<!doctype html> … </html>) that is visually polished and self-contained: all CSS in a <style> tag " +
  "and any JS in a <script> tag, no external build step. Make it responsive and beautiful. " +
  "Return ONLY the HTML, no explanation, no markdown fences.";

async function callClaude(cfg: { model: string; apiKey: string; baseUrl: string; maxTokens: number; temperature: number }, prompt: string) {
  const base = cfg.baseUrl?.trim() || "https://api.anthropic.com";
  const res = await fetch(`${base.replace(/\/+$/, "")}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: cfg.model || "claude-sonnet-4-6",
      max_tokens: cfg.maxTokens || 4096,
      temperature: cfg.temperature ?? 0.7,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data?.content?.map((c: { text?: string }) => c.text || "").join("") || "").trim();
}

async function callOpenAiCompatible(cfg: { model: string; apiKey: string; baseUrl: string; maxTokens: number; temperature: number }, prompt: string) {
  const base = cfg.baseUrl?.trim() || "https://api.openai.com/v1";
  const res = await fetch(`${base.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model || "gpt-4o-mini",
      max_tokens: cfg.maxTokens || 4096,
      temperature: cfg.temperature ?? 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content || "").trim();
}

// Zero-config fallback: a tidy, self-contained page seeded from the prompt so the
// feature is usable before any model key is configured.
function templatePage(prompt: string): string {
  const safe = prompt.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string)) || "未命名页面";
  const title = safe.slice(0, 40);
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
  :root{--bg:#0f172a;--card:#1e293b;--accent:#4f6bed;--text:#e2e8f0;--muted:#94a3b8}
  *{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:radial-gradient(1200px 600px at 20% -10%,#1e293b,transparent),var(--bg);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px}
  .card{max-width:720px;background:linear-gradient(180deg,rgba(255,255,255,.04),transparent),var(--card);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:40px;box-shadow:0 30px 80px rgba(0,0,0,.4)}
  .tag{display:inline-block;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);background:rgba(79,107,237,.12);padding:6px 12px;border-radius:999px}
  h1{font-size:34px;line-height:1.2;margin:18px 0 12px}
  p{color:var(--muted);line-height:1.8;font-size:16px}
  .hint{margin-top:28px;padding:16px;border-radius:14px;background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.12);font-size:13px;color:var(--muted)}
</style></head>
<body><div class="card">
  <span class="tag">ClawNote · HTML 文档</span>
  <h1>${title}</h1>
  <p>${safe}</p>
  <div class="hint">这是未配置 AI 模型时的占位设计页。前往「AI 配置」填入模型与 API Key 后，即可由模型生成完整设计稿。你也可以切到「源码」自由编辑这段 HTML。</div>
</div></body></html>`;
}

export async function POST(req: NextRequest) {
  const { workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt ?? body.message ?? "").trim();
  if (!prompt) return NextResponse.json({ error: "缺少 prompt" }, { status: 400 });

  const cfg = await getAiConfig(workspace.id);
  let html = "";
  let mode = "fallback";

  if (cfg.provider !== "none" && cfg.apiKey) {
    try {
      const raw = cfg.provider === "claude" ? await callClaude(cfg, prompt) : await callOpenAiCompatible(cfg, prompt);
      html = extractHtml(raw);
      mode = cfg.provider;
    } catch (e) {
      // fall back to template, but report the reason
      html = templatePage(prompt);
      return NextResponse.json({ html: `${SENTINEL}\n${html}`, mode: "fallback", warning: String((e as Error).message) });
    }
  }

  if (!html) { html = templatePage(prompt); mode = "fallback"; }
  return NextResponse.json({ html: `${SENTINEL}\n${html}`, mode });
}
