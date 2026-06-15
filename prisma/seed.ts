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
      name: "ClawNote 文档空间",
      icon: "📄",
      description: "个人文档与知识库。",
      ownerId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  const documents = [
    {
      title: "产品需求文档 PRD",
      icon: "📄",
      tags: ["产品", "文档"],
      html: "<h1>产品需求文档 PRD</h1><p>这里是文档正文。你可以像语雀或 Notion 一样专注写作。</p><h2>产品概述</h2><p>ClawNote 是一个独立文档管理系统。</p><h2>核心功能</h2><ul><li>文档树</li><li>富文本编辑器</li><li>版本历史</li><li>评论</li></ul>",
    },
    {
      title: "会议纪要",
      icon: "📘",
      tags: ["会议"],
      html: "<h1>会议纪要</h1><h2>会议目标</h2><p></p><h2>讨论要点</h2><ul><li></li></ul><h2>行动项</h2><ul><li></li></ul>",
    },
    {
      title: "学习笔记",
      icon: "📝",
      tags: ["笔记"],
      html: "<h1>学习笔记</h1><p>记录资料、想法和结论。</p><h2>要点</h2><ul><li></li></ul>",
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
            { sortIndex: 2, data: { name: "整理接口文档", owner: "Alex", status: "未开始", priority: "中", progress: 20, dueDate: new Date().toISOString().slice(0, 10) } }
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
      content: "CLI 后续可以通过 Agent API 读取和写入 ClawNote 的文档内容。",
      tags: ["CLI"],
      sourceType: "seed",
      confidence: 0.98,
      status: "ACCEPTED",
    },
  });

  await prisma.inboxItem.createMany({
    data: [
      { workspaceId: workspace.id, source: "CHAT", title: "文档写入示例", content: "外部工具可以通过接口写入文档或长期记忆。" },
      { workspaceId: workspace.id, source: "GITHUB", title: "仓库记录", content: "项目已有 TipTap、Prisma、Next.js 基础，可继续补齐文档管理体验。" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completed");
}

main().finally(async () => prisma.$disconnect());
