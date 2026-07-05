import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWorkspace, htmlToText, summarize } from "@/lib/clawnote-store";
import { fallbackSummary } from "@/lib/ai-fallback";
import { getAiConfig } from "@/lib/ai-config";

// In-app workspace agent. No external LLM is configured, so this is a rule-based
// assistant that can actually act on the workspace (search / create / summarize)
// through the same audited data layer. Swap the body of `respond` for a real
// model call when an API key is available.
type ChatResult = {
  reply: string;
  results?: { id: string; title: string; snippet?: string }[];
  createdDoc?: { id: string; title: string };
};

function stripVerb(text: string, verbs: RegExp) {
  return text.replace(verbs, "").replace(/^[\s:：,，"'「」]+|[\s:：,，"'「」]+$/g, "").trim();
}

// Free-form chat (anything that is not a structured workspace command) is
// delegated to the unified Agent service over HTTP — server-to-server, so no
// CORS and the agent endpoint never reaches the browser. Returns null when the
// agent is unreachable so the caller can degrade to the built-in help text.
const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:8787";

async function askAgent(message: string, sessionId: string): Promise<string | null> {
  try {
    const res = await fetch(`${AGENT_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, sessionId, mode: "standard", policy: "read-only" }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { responses?: string[] };
    const reply = (data.responses ?? []).join("\n\n").trim();
    return reply || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { user, workspace } = await ensureWorkspace();
  const body = await req.json().catch(() => ({}));
  const message: string = (body.message ?? "").toString().trim();
  if (!message) return NextResponse.json({ reply: "请输入内容。" } satisfies ChatResult);

  const config = await getAiConfig(workspace.id);
  const enabled = new Set(config.enabledSkills);
  const out = await respond(message, workspace.id, user.id, enabled);
  return NextResponse.json(out);
}

async function respond(message: string, workspaceId: string, userId: string, enabled: Set<string>): Promise<ChatResult> {
  // ---- Search intent --------------------------------------------------------
  if (enabled.has("search") && (/^(搜索|搜|查找|查|找)/.test(message) || /^search/i.test(message) || /搜索|查找/.test(message))) {
    const q = stripVerb(message, /搜索|查找|查|找|搜|search/gi);
    if (!q) return { reply: "想搜什么？比如「搜索 项目计划」。" };
    const docs = await prisma.document.findMany({
      where: {
        workspaceId,
        isArchived: false,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { contentText: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, title: true, summary: true },
    });
    if (docs.length === 0) return { reply: `没有找到和「${q}」相关的文档。` };
    return {
      reply: `找到 ${docs.length} 篇和「${q}」相关的文档：`,
      results: docs.map((d) => ({ id: d.id, title: d.title || "无标题", snippet: d.summary ?? undefined })),
    };
  }

  // ---- Create intent --------------------------------------------------------
  if (enabled.has("create") && /(新建|创建|新增|建一?个?)\s*(文档|页面|笔记|doc)?/.test(message) && /(文档|页面|笔记|doc)/i.test(message)) {
    const title = stripVerb(message, /新建|创建|新增|建一个|建个|建|一个|文档|页面|笔记|叫做|名为|标题为|doc/gi) || "新文档";
    const doc = await prisma.document.create({
      data: {
        workspaceId,
        createdById: userId,
        title,
        icon: "📄",
        type: "DOC",
        contentHtml: `<h1>${title}</h1><p></p>`,
        contentText: title,
        contentJson: { type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: title }] }, { type: "paragraph" }] },
        summary: summarize(title),
        tags: [],
      },
      select: { id: true, title: true },
    });
    return { reply: `已为你创建文档「${doc.title}」。`, createdDoc: { id: doc.id, title: doc.title } };
  }

  // ---- Summarize intent -----------------------------------------------------
  if (enabled.has("summarize") && /^(总结|摘要|概括|summary|tldr)/i.test(message)) {
    const payload = stripVerb(message, /总结|摘要|概括|summary|tldr/gi);
    if (payload.length > 30) return { reply: fallbackSummary(htmlToText(payload)) };
    // summarize the most recently edited doc
    const doc = await prisma.document.findFirst({
      where: { workspaceId, isArchived: false },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, contentText: true, summary: true },
    });
    if (!doc) return { reply: "目前没有可总结的文档。把要总结的文字直接发给我也行。" };
    const sum = doc.summary || fallbackSummary(doc.contentText);
    return { reply: `最近编辑的文档「${doc.title}」摘要：\n${sum}`, results: [{ id: doc.id, title: doc.title || "无标题" }] };
  }

  // ---- Free-form chat → unified Agent (DeepSeek, with per-workspace memory) --
  const agentReply = await askAgent(message, `clawnote:${workspaceId}`);
  if (agentReply) return { reply: agentReply };

  // ---- Default / help (agent unreachable) -----------------------------------
  return {
    reply:
      "我是 ClawNote 的工作区助手。当前未接入外部大模型，但我可以直接在工作区里帮你：\n" +
      "• 搜索文档 —— 例如「搜索 项目计划」\n" +
      "• 新建文档 —— 例如「新建文档 周会纪要」\n" +
      "• 总结文档 —— 例如「总结」（最近文档）或把文字发给我\n\n" +
      "需要接入真实模型时，在服务端配置 API Key 并替换 /api/ai/chat 的实现即可。",
  };
}
