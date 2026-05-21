import { htmlToText } from "./document-utils";

export type DocumentTemplate = {
  id: string;
  title: string;
  icon: string;
  description: string;
  tags: string[];
  contentHtml: string;
};

export const documentTemplates: DocumentTemplate[] = [
  {
    id: "blank",
    title: "空白文档",
    icon: "📄",
    description: "从一张干净的页面开始写作。",
    tags: [],
    contentHtml: "<p></p>",
  },
  {
    id: "prd",
    title: "产品需求文档 PRD",
    icon: "🧩",
    description: "适合产品方案、功能规划和需求评审。",
    tags: ["PRD", "产品"],
    contentHtml: "<h1>产品需求文档</h1><h2>背景</h2><p>说明为什么要做这个功能。</p><h2>目标</h2><ul><li>目标一</li><li>目标二</li></ul><h2>用户场景</h2><p>描述目标用户、使用路径和关键痛点。</p><h2>功能范围</h2><p>列出本期要做和不做的内容。</p><h2>验收标准</h2><ul data-type='taskList'><li data-type='taskItem' data-checked='false'><label><input type='checkbox'><span></span></label><div><p>完成核心流程</p></div></li></ul>",
  },
  {
    id: "meeting",
    title: "会议纪要",
    icon: "📝",
    description: "适合整理讨论内容、结论和行动项。",
    tags: ["会议"],
    contentHtml: "<h1>会议纪要</h1><h2>会议信息</h2><p>时间：</p><p>参与人：</p><h2>讨论内容</h2><ul><li>议题一</li><li>议题二</li></ul><h2>结论</h2><p>记录关键决策。</p><h2>行动项</h2><ul data-type='taskList'><li data-type='taskItem' data-checked='false'><label><input type='checkbox'><span></span></label><div><p>待办事项</p></div></li></ul>",
  },
  {
    id: "research",
    title: "研究笔记",
    icon: "🔎",
    description: "适合调研竞品、市场、论文和资料沉淀。",
    tags: ["研究"],
    contentHtml: "<h1>研究笔记</h1><h2>研究问题</h2><p>这次研究要回答什么问题？</p><h2>资料来源</h2><ul><li>来源一</li><li>来源二</li></ul><h2>核心发现</h2><p>提炼关键事实和洞察。</p><h2>结论与下一步</h2><p>写下可以行动的判断。</p>",
  },
  {
    id: "project",
    title: "项目计划",
    icon: "🚀",
    description: "适合拆解目标、里程碑、任务和风险。",
    tags: ["项目"],
    contentHtml: "<h1>项目计划</h1><h2>项目目标</h2><p>说明项目最终要达成什么。</p><h2>里程碑</h2><ul><li>阶段一</li><li>阶段二</li></ul><h2>任务拆解</h2><ul data-type='taskList'><li data-type='taskItem' data-checked='false'><label><input type='checkbox'><span></span></label><div><p>任务一</p></div></li></ul><h2>风险</h2><p>记录潜在风险和应对方案。</p>",
  },
];

export function getTemplate(templateId?: string) {
  return documentTemplates.find((item) => item.id === templateId) ?? documentTemplates[0];
}

export function templateToPayload(templateId?: string) {
  const template = getTemplate(templateId);
  return {
    title: template.title === "空白文档" ? "Untitled" : template.title,
    icon: template.icon,
    contentHtml: template.contentHtml,
    contentText: htmlToText(template.contentHtml),
    summary: template.description,
    tags: template.tags,
  };
}
