# ClawNote

ClawNote 是一个面向个人 OpenClaw 的文档与知识工作台。它不是后台系统，而是类似 Notion、语雀、Word、Excel 的个人知识产品：可以写文档、管理表格、沉淀 Inbox、审核 Agent Memory，并通过 API 让 OpenClaw 读写长期知识。

## 当前能力

### 文档工作台

- 类 Notion / 语雀的左侧空间导航和文档树
- 文档编辑、标题编辑、基础排版工具栏
- 文档自动保存，优先写入 PostgreSQL API，API 不可用时回落到 localStorage
- 文档 JSON / HTML / Text 存储模型
- 文档版本表与搜索索引表预留

### 项目表格

- 类 Excel 的任务表
- 新增、编辑、删除任务
- 字段包括任务、负责人、状态、优先级、截止日期、进度
- 后端使用 Collection / CollectionRow 抽象，后续可扩展为看板、画廊、日历视图

### Inbox 收集箱

- 可收集 OpenClaw、GitHub、网页、文件、聊天记录
- Inbox 可转换为文档或 Memory
- 支持 API 写入

### Agent Memory

- Agent 写入长期记忆时默认进入待审核状态
- 支持接受、拒绝、归档
- 支持置信度、来源、标签

### 模板中心

- 内置会议纪要、项目计划、SOP、研究报告模板
- 支持从模板快速新建文档

### OpenClaw / Agent API

- 搜索上下文
- 写入文档
- 写入 Memory
- 记录 Agent Run Log
- Token 校验：配置 `CLAWNOTE_AGENT_TOKEN` 后，Agent API 需要 `Authorization: Bearer <token>`

### 文件上传

- `/api/files` 支持本地文件上传
- 默认写入 `public/uploads`
- 返回可直接嵌入文档的 URL

## 技术栈

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma 5
- PostgreSQL
- Docker / Docker Compose

## 快速开始：本地开发

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

打开：

```text
http://localhost:3000
```

健康检查：

```text
http://localhost:3000/api/health
```

## Docker 部署

```bash
docker compose up -d --build
```

首次启动时容器会自动执行：

```bash
npx prisma db push
npm run start
```

如需导入种子数据：

```bash
docker compose exec web npm run db:seed
```

## 环境变量

```env
DATABASE_URL="postgresql://clawnote:clawnote@localhost:5432/clawnote?schema=public"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
CLAWNOTE_AGENT_TOKEN="replace-with-agent-token"
STORAGE_DRIVER="local"
UPLOAD_DIR="public/uploads"
```

## OpenClaw 调用示例

### 搜索上下文

```bash
curl -X POST http://localhost:3000/api/agent/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer replace-with-agent-token" \
  -d '{"query":"OpenClaw 部署", "limit": 8}'
```

### 写入文档

```bash
curl -X POST http://localhost:3000/api/agent/write-document \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer replace-with-agent-token" \
  -d '{
    "title":"OpenClaw 执行记录",
    "content":"今天完成了 ClawNote API 接入。",
    "tags":["OpenClaw", "执行记录"]
  }'
```

### 写入 Memory

```bash
curl -X POST http://localhost:3000/api/agent/create-memory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer replace-with-agent-token" \
  -d '{
    "content":"用户希望 ClawNote 更像 Notion / 语雀 / Word / Excel。",
    "tags":["产品定位"],
    "confidence":0.98
  }'
```

### 记录 Agent Run

```bash
curl -X POST http://localhost:3000/api/agent/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer replace-with-agent-token" \
  -d '{
    "agentName":"OpenClaw",
    "input":{"task":"分析仓库"},
    "output":{"status":"done"},
    "status":"completed"
  }'
```

## API 目录

```text
/api/documents                 文档列表 / 新建
/api/documents/[id]            文档详情 / 更新 / 归档
/api/collections/tasks         任务表列表 / 新建任务
/api/collections/tasks/[rowId] 更新 / 删除任务
/api/inbox                     Inbox 列表 / 新建
/api/inbox/[id]                Inbox 更新 / 删除
/api/memory                    Memory 列表 / 新建
/api/memory/[id]               Memory 审核 / 归档
/api/templates                 模板列表 / 新建
/api/search                    全局搜索
/api/files                     文件上传
/api/agent/search              OpenClaw 搜索上下文
/api/agent/write-document      OpenClaw 写文档
/api/agent/create-memory       OpenClaw 写 Memory
/api/agent/run                 OpenClaw Run Log
/api/health                    健康检查
```

## 下一步建议

- 将当前 `contentEditable` 编辑器替换回 TipTap JSON 编辑器
- 补完整 Slash Command
- 补 pgvector 语义搜索
- 补 NextAuth 登录与权限
- 补文件管理 UI
- 补看板 / 画廊 / 日历多视图
- 补 OpenClaw Skill 配置文件

## License

MIT
