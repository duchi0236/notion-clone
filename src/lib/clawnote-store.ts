import { prisma } from "@/lib/prisma";
import type { InboxSource, MemoryStatus, Prisma } from "@prisma/client";

const DEMO_EMAIL = "local@clawnote.dev";
const DEMO_WORKSPACE_NAME = "Personal OpenClaw Workspace";

export async function ensureWorkspace() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Local User",
    },
  });

  let workspace = await prisma.workspace.findFirst({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: DEMO_WORKSPACE_NAME,
        icon: "🧠",
        description: "Personal OpenClaw knowledge workspace",
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    });
  }

  return { user, workspace };
}

export function htmlToText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function summarize(value: string) {
  if (!value) return "暂无摘要";
  return value.length > 160 ? `${value.slice(0, 160)}…` : value;
}

export function toJsonSafe<T>(value: T) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createDocumentVersion(documentId: string, changedBy: string, snapshot: unknown, reason?: string) {
  const last = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { version: "desc" },
  });

  return prisma.documentVersion.create({
    data: {
      documentId,
      version: (last?.version ?? 0) + 1,
      changedBy,
      snapshot: toJsonSafe(snapshot),
      reason,
    },
  });
}

export async function upsertSearchIndex(documentId: string, data: { title: string; text: string; summary?: string | null; tags?: string[] }) {
  return prisma.searchIndex.upsert({
    where: { documentId },
    update: {
      title: data.title,
      text: data.text,
      summary: data.summary,
      tags: data.tags ?? [],
    },
    create: {
      documentId,
      title: data.title,
      text: data.text,
      summary: data.summary,
      tags: data.tags ?? [],
    },
  });
}

export async function seedTemplates(workspaceId: string) {
  const count = await prisma.template.count({ where: { workspaceId } });
  if (count > 0) return;

  const templates = [
    {
      title: "会议纪要",
      icon: "📋",
      category: "会议",
      description: "会议目标、讨论要点、行动项",
      tags: ["会议"],
      html: "<h1>会议纪要</h1><h2>会议目标</h2><p></p><h2>讨论要点</h2><ul><li></li></ul><h2>行动项</h2><ul><li>[ ] </li></ul>",
    },
    {
      title: "项目计划",
      icon: "🚀",
      category: "项目",
      description: "目标、里程碑、风险、任务",
      tags: ["项目"],
      html: "<h1>项目计划</h1><h2>目标</h2><p></p><h2>里程碑</h2><ul><li></li></ul><h2>风险</h2><p></p>",
    },
    {
      title: "SOP 模板",
      icon: "🧭",
      category: "SOP",
      description: "将重复流程沉淀为标准方法",
      tags: ["SOP"],
      html: "<h1>SOP</h1><h2>适用场景</h2><p></p><h2>步骤</h2><ol><li></li></ol>",
    },
    {
      title: "研究报告",
      icon: "📊",
      category: "研究",
      description: "市场、竞品、用户研究",
      tags: ["研究"],
      html: "<h1>研究报告</h1><h2>背景</h2><p></p><h2>发现</h2><p></p><h2>结论</h2><p></p>",
    },
  ];

  await prisma.template.createMany({
    data: templates.map((template) => ({
      workspaceId,
      title: template.title,
      icon: template.icon,
      category: template.category,
      description: template.description,
      tags: template.tags,
      contentHtml: template.html,
      contentJson: { type: "doc", content: [{ type: "html", html: template.html }] },
    })),
  });
}

export async function ensureTaskCollection(workspaceId: string) {
  const existing = await prisma.collection.findFirst({
    where: { workspaceId, type: "TASKS" },
    include: { rows: { orderBy: { sortIndex: "asc" } } },
  });
  if (existing) return existing;

  return prisma.collection.create({
    data: {
      workspaceId,
      name: "项目跟进表",
      icon: "📊",
      type: "TASKS",
      schema: [
        { id: "name", name: "任务", type: "text" },
        { id: "owner", name: "负责人", type: "text" },
        { id: "status", name: "状态", type: "select", options: ["未开始", "进行中", "已完成"] },
        { id: "priority", name: "优先级", type: "select", options: ["低", "中", "高"] },
        { id: "dueDate", name: "截止", type: "date" },
        { id: "progress", name: "进度", type: "number" }
      ],
      views: [
        { id: "table", name: "表格", type: "table" },
        { id: "board", name: "看板", type: "board", groupBy: "status" },
        { id: "gallery", name: "画廊", type: "gallery" },
        { id: "calendar", name: "日历", type: "calendar", dateBy: "dueDate" }
      ],
      rows: {
        create: [
          { sortIndex: 0, data: { name: "重构 Prisma 数据模型", owner: "Lily", status: "已完成", priority: "高", progress: 100, dueDate: new Date().toISOString().slice(0, 10) } },
          { sortIndex: 1, data: { name: "实现文档工作台 UI", owner: "Tom", status: "进行中", priority: "高", progress: 75, dueDate: new Date().toISOString().slice(0, 10) } },
          { sortIndex: 2, data: { name: "接入 OpenClaw API", owner: "Alex", status: "未开始", priority: "中", progress: 20, dueDate: new Date().toISOString().slice(0, 10) } }
        ],
      },
    },
    include: { rows: { orderBy: { sortIndex: "asc" } } },
  });
}

export function normalizeInboxSource(source?: string): InboxSource {
  const value = String(source || "MANUAL").toUpperCase();
  if (["MANUAL", "OPENCLAW", "WEB_CLIP", "GITHUB", "FILE", "CHAT"].includes(value)) return value as InboxSource;
  return "MANUAL";
}

export function normalizeMemoryStatus(status?: string): MemoryStatus {
  const value = String(status || "PENDING").toUpperCase();
  if (["PENDING", "ACCEPTED", "REJECTED", "ARCHIVED"].includes(value)) return value as MemoryStatus;
  return "PENDING";
}
