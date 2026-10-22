// Skills the workspace agent can use. Shared by the settings page and the chat
// backend. The metadata keeps capability, permission, and runtime behavior
// visible in one place instead of scattering UI-only descriptions.
export type AiSkillAccess = "read" | "write" | "review";

export type AiSkill = {
  id: string;
  name: string;
  desc: string;
  implemented: boolean;
  category: string;
  access: AiSkillAccess;
  scope: string;
  trigger: string;
  output: string;
  examples: string[];
};

export const AI_SKILLS: AiSkill[] = [
  {
    id: "search",
    name: "搜索文档",
    desc: "在当前工作区中查找相关文档并返回可打开的结果。",
    implemented: true,
    category: "知识检索",
    access: "read",
    scope: "文档标题、正文、摘要",
    trigger: "识别“搜索、查找、search”等检索意图",
    output: "最多返回 6 篇相关文档及摘要",
    examples: ["搜索 项目计划", "查找 OpenClaw 部署"],
  },
  {
    id: "create",
    name: "新建文档",
    desc: "根据用户指令在当前工作区创建一篇新文档。",
    implemented: true,
    category: "内容操作",
    access: "write",
    scope: "当前工作区的文档库",
    trigger: "识别“新建、创建文档、创建页面”等写入意图",
    output: "创建文档并返回文档入口",
    examples: ["新建文档 周会纪要", "创建页面 产品复盘"],
  },
  {
    id: "summarize",
    name: "总结内容",
    desc: "概括最近编辑的文档，或总结用户直接提供的文字。",
    implemented: true,
    category: "内容处理",
    access: "read",
    scope: "最近编辑的文档或对话中提供的文本",
    trigger: "识别“总结、摘要、概括、TLDR”等意图",
    output: "在对话中返回精简摘要",
    examples: ["总结", "概括下面这段内容"],
  },
  {
    id: "memory",
    name: "写入 Memory",
    desc: "把稳定事实沉淀为长期记忆，并进入人工审核流程。",
    implemented: false,
    category: "知识沉淀",
    access: "review",
    scope: "当前工作区的 Agent Memory",
    trigger: "识别“记住、写入 Memory、长期保存”等意图",
    output: "创建待审核的 Memory 记录",
    examples: ["记住我偏好简洁的会议纪要", "写入 Memory：项目代号是 Claw"],
  },
  {
    id: "tasks",
    name: "提取任务",
    desc: "从文档或对话中识别行动项，并生成待确认任务。",
    implemented: false,
    category: "工作管理",
    access: "review",
    scope: "用户提供的文本与任务表",
    trigger: "识别“提取待办、生成任务、行动项”等意图",
    output: "生成待确认的任务建议",
    examples: ["从这段会议记录中提取待办", "生成行动项"],
  },
];

export const DEFAULT_ENABLED_SKILLS = AI_SKILLS.filter((s) => s.implemented).map((s) => s.id);

export const AI_PROVIDERS: { id: string; name: string; models: string[] }[] = [
  { id: "none", name: "内置规则助手（无需模型）", models: [] },
  { id: "claude", name: "Anthropic Claude", models: ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"] },
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "o3-mini"] },
  { id: "custom", name: "自定义 / 兼容 OpenAI 接口", models: [] },
];
