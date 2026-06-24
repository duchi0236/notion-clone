# ClawNote 功能梳理 & 移动端原生 App 规划

> 目标：把 `mobile/` 从「WebView 壳」升级为真正的 **React Native 原生 App**，
> 原生导航 + 原生屏幕，直接消费现有 Next.js REST API（`/api/*`），
> 复用同一套 PostgreSQL 数据与工作区（Workspace）。

---

## 1. 产品定位

ClawNote 是面向个人 / OpenClaw Agent 的 **文档与知识工作台**（类 Notion / 语雀 / Word / Excel）：
写文档、管理多维表格、收集 Inbox、审核 Agent Memory、日历日程，并通过 API 让 Agent 读写长期知识。

---

## 2. 完整功能矩阵（Web 现状 → 移动端原生映射）

| 模块 | Web 现状 | 移动端原生屏幕 | 对接 API |
|---|---|---|---|
| **工作台首页** | 空间导航 + 最近文档 + 快捷入口 | `HomeScreen` | `/api/documents`、`/api/workspace` |
| **文档** | 文档树、TipTap 富文本、自动保存、版本、评论、收藏、归档 | `DocumentsScreen`（树/列表）+ `DocumentEditorScreen`（标题+正文+标签+收藏+删除） | `/api/documents`、`/api/documents/[id]`、`/api/pages/[id]/tree` |
| **任务表 / 多维表格** | Table/Board/Gallery/Calendar 多视图、Bitable base | `TasksScreen`（列表 + 看板分组 + 增改删 + 状态/优先级） | `/api/collections/tasks`、`/api/collections/tasks/[rowId]` |
| **日历** | 月/周/年视图、事件、提醒、重复、ICS | `CalendarScreen`（议程列表 + 新建事件） | `/api/calendar/events`、`/api/calendar/events/[id]` |
| **Inbox 收集箱** | 收集 OpenClaw/GitHub/网页/文件/聊天，可转文档或 Memory | `InboxScreen`（列表 + 新建 + 转换/归档） | `/api/inbox`、`/api/inbox/[id]` |
| **Agent Memory** | 待审核记忆，接受/拒绝/归档，置信度/来源/标签 | `MemoryScreen`（审核流） | `/api/memory`、`/api/memory/[id]` |
| **全局搜索** | 关键词 + 语义 fallback，跨文档/记忆/Inbox | `SearchScreen` | `/api/search` |
| **AI / Agent 助手** | 规则型工作区 Agent（搜索/新建/摘要） | `AgentScreen`（对话） | `/api/ai/chat` |
| **设置** | 工作区、成员、AI 配置、Token | `SettingsScreen`（服务器地址 + 工作区信息） | `/api/workspace`、`/api/ai/config` |

> 富文本：Web 端用 TipTap（浏览器专属）。移动端原生采用「标题 + 纯文本/轻量 Markdown 正文」编辑器，
> 通过 `contentHtml` / `contentText` 与后端同一文档模型双向同步——在 Web 端打开仍是完整富文本。

---

## 3. 后端 API 契约（移动端使用）

所有主 API 走 `ensureWorkspace()`，开发环境**无需登录**即可读写默认工作区，便于原生 App 直连：

```
GET    /api/documents                 → { documents: [...] }
POST   /api/documents                 → { document }            (title, contentHtml, contentText, tags, icon, type, parentId)
GET    /api/documents/:id             → { document }
PUT    /api/documents/:id             → { document }            (title, contentHtml, isFavorite, status, tags, reason:"autosave")
DELETE /api/documents/:id             → 软删除（?permanent=true 彻底删）

GET    /api/collections/tasks         → { collection, rows: [{id,data:{name,owner,status,priority,dueDate,progress}}] }
POST   /api/collections/tasks         → { row }
PUT    /api/collections/tasks/:rowId  → { row }
DELETE /api/collections/tasks/:rowId

GET    /api/calendar/events?start=&end= → { events: [{id,title,startsAt,endsAt,allDay,color,location}] }
POST   /api/calendar/events           → { event }

GET    /api/inbox                     → { items: [{id,source,title,content,status}] }
POST   /api/inbox                     → { item }
PATCH  /api/inbox/:id   DELETE /api/inbox/:id

GET    /api/memory                    → { memories: [{id,content,status,confidence,tags}] }
POST   /api/memory                    → { memory }
PATCH  /api/memory/:id                → 审核（status: ACCEPTED|REJECTED|ARCHIVED）

GET    /api/search?q=                 → { results: [{type:"document"|"memory"|"inbox", item}] }
POST   /api/ai/chat                   → { reply, results?, createdDoc? }
GET    /api/workspace                 → { workspace }
```

身份认证：生产环境可在请求头带 `Authorization: Bearer <token>`（`/tokens` 生成），
原生 App 在「设置」里保存服务器地址（+ 可选 Token），开发环境留空即可。

---

## 4. 移动端 App 架构

```
mobile/
├── App.js                      # 导航根 + Provider
├── src/
│   ├── theme.js                # 配色（slate / liquid glass，主色 #0f172a）
│   ├── config/ServerContext.js # 服务器地址 + Token（AsyncStorage 持久化）
│   ├── api/client.js           # fetch 封装（baseUrl + 错误处理）
│   ├── api/clawnote.js         # 各业务 API 函数
│   ├── components/             # UI 原子组件（卡片/空状态/输入/徽标）
│   └── screens/                # 各功能屏幕
└── FEATURES.md                 # 本文件
```

导航：底部 Tab（首页 / 文档 / 任务 / 日历 / 更多）+ 原生 Stack（编辑器、详情、搜索、Agent、设置）。

---

## 5. 实现进度

**第一批（核心）**：首页、文档树/编辑器、任务、日历议程、Inbox、Memory、搜索、Agent、设置。

**第二批（已落地，覆盖 web 全部主要能力）**：

- 文档：版本历史 + 一键恢复、评论与回复、移动层级、发布/分享、回收站（恢复/永久删除）、编辑器插入图片
- 日历：事件编辑/删除、月历网格 + 点选筛选、颜色、重复、提醒、地点
- 多维表格 Bitable：Base/多表、表格 + 看板视图、按字段类型（文本/选择/勾选/日期/数字）增删改记录
- 文件：`/api/files` 上传/预览/删除（`expo-image-picker`）
- 模板中心：分类模板、一键新建
- AI 配置：提供方/模型/Key/温度/maxTokens/技能开关
- 工作区成员、账号注册 + NextAuth 凭证登录/退出
- 搜索：关键词 + 语义两种模式

**第三批（整页 HTML 文档）**：

- 文档可整体是一个完整 HTML 页面（自带 CSS/JS），以观赏/交互为主——移动端用 WebView 沙箱、Web 用 iframe 沙箱渲染，均支持「预览 / 源码」切换
- 四种来源：粘贴整段 HTML、导入 `.html` 文件、嵌入外部网址、AI 生成（`/api/ai/generate-html`：配置模型则调真实 API，否则返回模板页）
- 判定约定两端一致：`contentHtml` 以 `<!doctype>`/`<html>` 或 sentinel `<!--clawnote:fullhtml-->` 开头即整页渲染；分享页（`/share/[id]`）也整页呈现
- 依赖：`expo-document-picker`、`expo-file-system`（导入 .html）

## 6. 后续增强（可选）

- 原生富文本：引入 10tap / RN 富文本编辑器对齐 TipTap 块级编辑
- 离线优先：AsyncStorage 缓存 + 后台同步队列
- 推送通知：日历提醒 / Memory 待审核（`expo-notifications`）
- 多工作区切换（需后端按 session 解析工作区）
- 语义搜索：后端接入 embedding（pgvector）后自动升级
