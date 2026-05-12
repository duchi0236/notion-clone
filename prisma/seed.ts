import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function htmlToText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "local@clawnote.dev" },
    update: {},
    create: { email: "local@clawnote.dev", name: "Local User" },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "clawnote_default_workspace" },
    update: {},
    create: {
      id: "clawnote_default_workspace",
      name: "Personal OpenClaw Workspace",
      icon: "🧠",
      description: "A personal AI knowledge and document workspace for OpenClaw.",
      ownerId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const documents = [
    {
      title: "OpenClaw 个人部署方案",
      icon: "🧠",
      tags: ["OpenClaw", "部署", "知识库"],
      html: "<h1>OpenClaw 个人部署方案</h1><p>部署一个可长期沉淀知识、记录任务、管理文档的个人 AI 工作台。</p><h2>核心模块</h2><ul><li>文档编辑器</li><li>知识库</li><li>Agent Memory</li><li>Inbox 收集中心</li></ul>",
    },
    {
      title: "产品设计原则",
      icon: "📘",
      tags: ["产品", "原则"],
      html: "<h1>产品设计原则</h1><p>ClawNote 不是后台系统，而是类似 Notion、语雀、Word、Excel 的知识工作台。</p><blockquote>文档优先，Agent 辅助；人负责判断，AI 负责整理。</blockquote>",
    },
    {
      title: "用户访谈记录",
      icon: "📝",
      tags: ["访谈", "需求"],
      html: "<h1>用户访谈记录</h1><p>用户希望文档体验接近语雀和 Notion，同时保留 Excel 式表格能力。</p>",
    },
  ];

  for (const doc of documents) {
    const text = htmlToText(doc.html);
    const existing = await prisma.document.findFirst({ where: { workspaceId: workspace.id, title: doc.title } });
    const document = existing ?? await prisma.document.create({
      data: {
        workspaceId: workspace.id,
        createdById: user.id,
        title: doc.title,
        icon: doc.icon,
        tags: doc.tags,
        contentHtml: doc.html,
        contentText: text,
        contentJson: { type: "doc", content: [{ type: "html", html: doc.html }] },
        summary: text.slice(0, 160),
        agentReadable: true,
      },
    });

    await prisma.searchIndex.upsert({
      where: { documentId: document.id },
      update: { title: doc.title, text, summary: text.slice(0, 160), tags: doc.tags },
      create: { documentId: document.id, title: doc.title, text, summary: text.slice(0, 160), tags: doc.tags },
    });
  }

  const taskCollection = await prisma.collection.findFirst({ where: { workspaceId: workspace.id, type: "TASKS" } });
  if (!taskCollection) {
    await prisma.collection.create({
      data: {
        workspaceId: workspace.id,
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
    });
  }

  await prisma.agentMemory.upsert({
    where: { id: "seed_memory_product_position" },
    update: {},
    create: {
      id: "seed_memory_product_position",
      workspaceId: workspace.id,
      createdById: user.id,
      scope: "WORKSPACE",
      content: "产品形态应类似 Notion、语雀、Word、Excel，而不是后台系统。",
      tags: ["产品定位"],
      sourceType: "seed",
      confidence: 0.98,
      status: "ACCEPTED",
    },
  });

  await prisma.inboxItem.createMany({
    data: [
      { workspaceId: workspace.id, source: "OPENCLAW", title: "OpenClaw Chat 记录", content: "用户要求 ClawNote 更像 Notion / 语雀 / Word / Excel，而不是后台系统。" },
      { workspaceId: workspace.id, source: "GITHUB", title: "notion-clone 仓库分析", content: "项目已有 TipTap、Prisma、Next.js 基础，但大量功能仍是 mock。" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completed");
}

main().finally(async () => prisma.$disconnect());
