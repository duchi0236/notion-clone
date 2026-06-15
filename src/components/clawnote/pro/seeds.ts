import type { Doc, InboxItem, Memory, Task } from "./types";
import { today } from "./api";

export const seedDocs: Doc[] = [
  {
    id: "d1",
    title: "产品需求文档 PRD",
    icon: "📄",
    parentId: null,
    sortIndex: 0,
    html: "<h1>产品需求文档 PRD</h1><p>这里是文档正文。你可以像语雀或 Notion 一样专注写作。</p><h2>产品概述</h2><p>ClawNote 是一个独立文档管理系统。</p><h2>核心功能</h2><ul><li>文档树</li><li>富文本编辑器</li><li>版本历史</li><li>评论</li></ul>",
    text: "产品需求文档 PRD",
    summary: "ClawNote 是一个独立文档管理系统。",
    tags: ["产品", "文档"],
    isFavorite: true,
    isPublished: false,
    isArchived: false,
    createdAt: today(),
    updatedAt: today(),
  },
  {
    id: "d2",
    title: "会议纪要",
    icon: "📘",
    parentId: "d1",
    sortIndex: 0,
    html: "<h1>会议纪要</h1><h2>会议目标</h2><p></p><h2>讨论要点</h2><ul><li></li></ul><h2>行动项</h2><ul><li></li></ul>",
    text: "会议纪要",
    summary: "用于记录会议目标、讨论要点和行动项。",
    tags: ["会议"],
    isFavorite: false,
    isPublished: false,
    isArchived: false,
    createdAt: today(),
    updatedAt: today(),
  },
];

export const seedTasks: Task[] = [
  { id: "t1", name: "替换为 TipTap 编辑器", owner: "Me", status: "已完成", priority: "高", progress: 100, dueDate: today() },
  { id: "t2", name: "实现多视图任务表", owner: "Me", status: "进行中", priority: "高", progress: 70, dueDate: today() },
  { id: "t3", name: "接入 OpenClaw Skill", owner: "Me", status: "未开始", priority: "中", progress: 10, dueDate: today() },
];

export const seedInbox: InboxItem[] = [
  { id: "i1", source: "CLI", title: "文档写入示例", content: "外部工具可以通过接口写入文档或长期记忆。" },
];

export const seedMemories: Memory[] = [
  { id: "m1", content: "CLI 后续可以通过 Agent API 读取和写入 ClawNote 的文档内容。", status: "pending", confidence: 0.92, tags: ["CLI"] },
];
