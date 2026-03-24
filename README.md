# Notion Clone

一个完整的 Notion 替代品，功能几乎完全复刻 Notion。

## 功能特性

### 核心编辑器
- 📝 块编辑器（文字、标题、列表、引用等）
- 🎨 格式化工具栏（粗体、斜体、颜色、对齐等）
- ✨ 斜杠命令支持（输入 '/' 快速插入块）
- 📎 附件、图片、代码块
- 📊 表格支持
- ✅ 待办事项列表

### 数据库
- 📋 看板视图（Kanban）
- 📊 表格视图
- 🖼️ 画廊视图
- 📅 日历视图
- 🔍 筛选和排序

### 页面管理
- 🗂️ 层级页面结构
- ⭐ 收藏功能
- 🏷️ 标签系统
- 🔗 页面链接和引用

### 协作
- 👥 多人协作（实时同步）
- 💬 评论功能
- 📤 分享和权限管理

## 技术栈

- **前端**: Next.js 14, React 18, TypeScript
- **编辑器**: TipTap (基于 ProseMirror)
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **后端**: Next.js API Routes
- **数据库**: PostgreSQL + Prisma
- **认证**: NextAuth.js

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/notion-clone.git
cd notion-clone
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 添加数据库连接等配置
```

### 4. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 5. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000

## 项目结构

```
notion-clone/
├── prisma/
│   └── schema.prisma      # 数据库模型
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── page/          # 页面编辑器
│   │   ├── database/      # 数据库视图
│   │   └── api/           # API 路由
│   ├── components/
│   │   └── editor/        # TipTap 编辑器组件
│   ├── lib/               # 工具函数
│   └── types/            # TypeScript 类型
└── package.json
```

## 部署

### Vercel (推荐)

```bash
# 1. 推送代码到 GitHub
# 2. 在 Vercel 导入项目
# 3. 配置环境变量
# 4. Deploy!
```

### Docker

```bash
docker build -t notion-clone .
docker run -p 3000:3000 notion-clone
```

## 许可证

MIT
