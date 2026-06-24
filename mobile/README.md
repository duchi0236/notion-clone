# ClawNote 移动端原生 App

Expo + React Native 原生客户端。**不再是 WebView 壳**——原生导航 + 原生屏幕，
直接消费 ClawNote 现有 Next.js REST API（`/api/*`），与 web 共用同一 PostgreSQL 工作区。

> 功能矩阵与 API 契约详见 [`FEATURES.md`](./FEATURES.md)。

## 功能

| Tab / 屏幕 | 说明 |
|---|---|
| 首页 Home | 快捷入口 + 收藏 + 最近文档 |
| 文档 Docs | 文档树/筛选、新建（FAB） |
| 文档编辑器 | 标题 + 标签 + emoji + 正文，自动保存 / 收藏 / 删除（与 web 富文本双向同步） |
| 整页 HTML 文档 | 文档可整体是一个 HTML 页面，WebView 沙箱「预览/源码」切换；新建支持 HTML 页面 / 导入 .html / 嵌入网址 / AI 生成 |
| 任务 Tasks | 看板分组 / 列表切换，状态·优先级点选，快速增删改 |
| 日历 Calendar | 月份议程视图 + 底部弹窗快速建日程 |
| 更多 More | 收集箱、Agent Memory、搜索、AI 助手、设置 |
| 文档版本 / 评论 | 版本历史与一键恢复、评论与回复 |
| 多维表格 Bitable | Base / 多表、表格 + 看板视图、按字段类型编辑记录 |
| 模板中心 | 分类模板，一键从模板新建文档 |
| 文件 Files | 上传图片附件、预览、删除；编辑器内「插入图片」 |
| 回收站 Trash | 归档文档恢复 / 永久删除 |
| 收集箱 Inbox | 快速记录、转为文档、归档 |
| Agent Memory | 待审核记忆 接受 / 拒绝 / 归档 |
| 搜索 Search | 关键词 + 语义两种模式，跨文档 / 记忆 / 收集箱 |
| AI 助手 Agent | 对话式工作区助手（搜索 / 新建 / 摘要） |
| AI 配置 | 模型提供方 / 模型 / Key / 温度 / 技能开关 |
| 账号 Account | 注册、NextAuth 凭证登录、退出 |
| 成员 Members | 工作区成员与角色 |
| 设置 Settings | 服务器地址 + Token，连接测试 |

## 运行

1. 启动后端（仓库根目录）：

   ```bash
   npm run dev          # Next 跑在 :3000
   # 移动端开发默认连 :3001，可用：
   next dev -p 3001
   ```

2. 启动 App：

   ```bash
   cd mobile
   npm install
   npx expo install expo-image-picker expo-document-picker expo-file-system   # 校正原生模块版本（首次）
   npm run start        # 扫码用 Expo Go 打开，或 npm run ios / npm run android
   ```

3. 首次打开如连不上，进入 **更多 → 设置**，把「API 地址」改成开发机局域网 IP，
   例如 `http://192.168.1.23:3001`，点「测试连接」确认。

## 服务器地址解析顺序

1. **设置里手动保存的地址**（AsyncStorage 持久化，优先级最高）
2. `app.json` → `expo.extra.serverUrl`（发布正式环境时填这里）
3. 开发时自动从 Expo `hostUri` 推导：`http://<开发机IP>:3001`

## 认证

开发环境后端走 `ensureWorkspace()` 默认工作区，**无需登录**即可读写。
生产环境在 web 端 `/tokens` 生成访问密钥，填入「设置 → 访问 Token」，
所有请求会带 `Authorization: Bearer <token>`。

## 目录结构

```
mobile/
├── App.js                       # 导航根（底部 Tab + Stack）
├── index.js                     # Expo 入口
├── app.json                     # Expo 配置
├── src/
│   ├── theme.js                 # 配色 / 圆角 / 阴影
│   ├── config/ServerContext.js  # 服务器地址 + Token（持久化）
│   ├── api/client.js            # fetch 封装
│   ├── api/clawnote.js          # 业务 API（useApi）
│   ├── components/ui.js         # 复用 UI 组件
│   └── screens/                 # 各功能屏幕
└── FEATURES.md                  # 功能梳理 & 规划
```
