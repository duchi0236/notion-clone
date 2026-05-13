# ClawNote

ClawNote 是一个面向个人 OpenClaw 的文档与知识工作台。它不是后台系统，而是类似 Notion、语雀、Word、Excel 的个人知识产品：可以写文档、管理表格、沉淀 Inbox、审核 Agent Memory，并通过 API 让 OpenClaw 读写长期知识。

根路径 `/` 会自动跳转到新版工作台：

```text
http://localhost:3000/clawnote
```

## 当前能力

### 文档工作台

- 类 Notion / 语雀的左侧空间导航和文档树
- TipTap 富文本编辑器
- 工具栏：标题、粗体、斜体、下划线、列表、待办、引用、代码、图片、表格
- `/` 快捷命令：标题、列表、待办、表格、图片、AI 摘要、写入 Memory
- 文档自动保存，优先写入 PostgreSQL API，API 不可用时回落到 localStorage
- 文档 JSON / HTML / Text 存储模型
- 文档版本、版本恢复、评论 API

### 项目表格

- 类 Excel 的任务表
- 支持 Table / Board / Gallery / Calendar 多视图
- 新增、编辑、删除任务
- 字段包括任务、负责人、状态、优先级、截止日期、进度
- 后端使用 Collection / CollectionRow 抽象

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

### 登录注册

- 已接入 NextAuth Credentials
- 登录页：`/login`
- 注册接口：`/api/auth/register`
- API 会优先使用当前登录用户的 Workspace；未登录时回落到本地默认 Workspace

### OpenClaw / Agent API

- 搜索上下文
- 写入文档
- 写入 Memory
- 记录 Agent Run Log
- 支持环境变量 `CLAWNOTE_AGENT_TOKEN`
- 支持数据库生成的访问密钥：`/tokens`
- OpenClaw Skill 配置：`openclaw/clawnote.skill.yaml`

### 文件管理

- 文件管理页：`/files`
- `/api/files` 支持上传、列表、删除
- 默认写入 `public/uploads`
- 返回可直接嵌入文档的 URL

### 搜索

- `/api/search` 全局关键词搜索
- `/api/search/semantic` 语义搜索 fallback，当前为 token-overlap 排序
- `prisma/sql/pgvector.sql` 提供 pgvector 初始化 SQL，后续可接 embedding 服务

## 技术栈

- Next.js 14 App Router
- React 18
- TypeScript
- TipTap 2
- Tailwind CSS
- Prisma 5
- PostgreSQL
- NextAuth
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
http://localhost:3000/clawnote
```

登录页：

```text
http://localhost:3000/login
```

文件管理：

```text
http://localhost:3000/files
```

访问密钥管理：

```text
http://localhost:3000/tokens
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
CLAWNOTE_AGENT_TOKEN="dev-change-me-agent-token"
STORAGE_DRIVER="local"
UPLOAD_DIR="public/uploads"
```

## OpenClaw 调用示例

### 搜索上下文

```bash
curl -X POST http://localhost:3000/api/agent/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-change-me-agent-token" \
  -d '{"query":"OpenClaw 部署", "limit": 8}'
```

也可以在 `/tokens` 生成访问密钥，并替换上面的 Bearer 值。

### 写入文档

```bash
curl -X POST http://localhost:3000/api/agent/write-document \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-change-me-agent-token" \
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
  -H "Authorization: Bearer dev-change-me-agent-token" \
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
  -H "Authorization: Bearer dev-change-me-agent-token" \
  -d '{
    "agentName":"OpenClaw",
    "input":{"task":"分析仓库"},
    "output":{"status":"done"},
    "status":"completed"
  }'
```

## API 目录

```text
/api/documents                                      文档列表 / 新建
/api/documents/[id]                                 文档详情 / 更新 / 归档
/api/documents/[id]/versions                        文档版本列表 / 手动快照
/api/documents/[id]/versions/[version]/restore      恢复指定版本
/api/documents/[id]/comments                        评论列表 / 新建评论
/api/collections/tasks                              任务表列表 / 新建任务
/api/collections/tasks/[rowId]                      更新 / 删除任务
/api/inbox                                          Inbox 列表 / 新建
/api/inbox/[id]                                     Inbox 更新 / 删除
/api/memory                                         Memory 列表 / 新建
/api/memory/[id]                                    Memory 审核 / 归档
/api/templates                                      模板列表 / 新建
/api/search                                         全局搜索
/api/search/semantic                                语义搜索 fallback
/api/files                                          文件上传 / 文件列表 / 删除文件
/api/tokens                                         访问密钥列表 / 创建访问密钥
/api/tokens/[id]                                    删除访问密钥
/api/auth/[...nextauth]                             NextAuth 登录
/api/auth/register                                  注册
/api/agent/search                                   OpenClaw 搜索上下文
/api/agent/write-document                           OpenClaw 写文档
/api/agent/create-memory                            OpenClaw 写 Memory
/api/agent/run                                      OpenClaw Run Log
/api/health                                         健康检查
```

## 下一步建议

- 接真实 embedding 服务并将 `/api/search/semantic` 替换为 pgvector 检索
- 补拖拽上传并从编辑器直接插入附件
- 补真实 LLM 自动摘要 / 自动标签
- 补权限细化与团队协作
- 补 E2E 测试

## License

MIT
