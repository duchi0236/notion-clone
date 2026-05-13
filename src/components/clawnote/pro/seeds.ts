import type { Doc, InboxItem, Memory, Task } from "./types";
import { today } from "./api";

export const seedDocs: Doc[] = [
  {
    id: "d1",
    title: "OpenClaw 个人部署方案",
    icon: "🧠",
    html: "<h1>OpenClaw 个人部署方案</h1><p>部署一个可长期沉淀知识、记录任务、管理文档的个人 AI 工作台。</p><h2>核心模块</h2><ul><li>文档编辑器</li><li>知识库</li><li>Agent Memory</li><li>Inbox 收集中心</li></ul>",
    text: "OpenClaw 个人部署方案",
    summary: "部署个人 OpenClaw，并通过 ClawNote 做长期知识、任务和文档沉淀。",
    tags: ["OpenClaw", "部署"],
  },
  {
    id: "d2",
    title: "产品设计原则",
    icon: "📘",
    html: "<h1>产品设计原则</h1><p>ClawNote 不是后台系统，而是类似 Notion、语雀、Word、Excel 的知识工作台。</p>",
    text: "ClawNote 不是后台系统",
    summary: "产品形态类似 Notion、语雀、Word、Excel。",
    tags: ["产品"],
  },
];

export const seedTasks: Task[] = [
  { id: "t1", name: "替换为 TipTap 编辑器", owner: "Me", status: "已完成", priority: "高", progress: 100, dueDate: today() },
  { id: "t2", name: "实现多视图任务表", owner: "Me", status: "进行中", priority: "高", progress: 70, dueDate: today() },
  { id: "t3", name: "接入 OpenClaw Skill", owner: "Me", status: "未开始", priority: "中", progress: 10, dueDate: today() },
];

export const seedInbox: InboxItem[] = [
  { id: "i1", source: "OpenClaw", title: "产品反馈", content: "用户希望 ClawNote 更像 Notion / 语雀 / Word / Excel，而不是后台系统。" },
];

export const seedMemories: Memory[] = [
  { id: "m1", content: "产品形态应类似 Notion、语雀、Word、Excel，而不是后台系统。", status: "accepted", confidence: 0.98, tags: ["产品定位"] },
];
