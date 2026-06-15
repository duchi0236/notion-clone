// Skills the workspace agent can use. Shared by the config page (toggles) and
// the chat backend (gates which intents run).
export type AiSkill = { id: string; name: string; desc: string; implemented: boolean };

export const AI_SKILLS: AiSkill[] = [
  { id: "search", name: "搜索文档", desc: "在工作区中按关键词检索文档", implemented: true },
  { id: "create", name: "新建文档", desc: "根据指令创建一篇新文档", implemented: true },
  { id: "summarize", name: "总结内容", desc: "概括最近文档或给定文字", implemented: true },
  { id: "memory", name: "写入 Memory", desc: "把要点沉淀为长期记忆（进入审核）", implemented: false },
  { id: "tasks", name: "提取任务", desc: "从文本中抽取待办事项", implemented: false },
];

export const DEFAULT_ENABLED_SKILLS = AI_SKILLS.filter((s) => s.implemented).map((s) => s.id);

export const AI_PROVIDERS: { id: string; name: string; models: string[] }[] = [
  { id: "none", name: "内置规则助手（无需模型）", models: [] },
  { id: "claude", name: "Anthropic Claude", models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"] },
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "o3-mini"] },
  { id: "custom", name: "自定义 / 兼容 OpenAI 接口", models: [] },
];
