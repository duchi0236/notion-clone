# ClawNote Web V3 Design Pack

这套设计稿是当前 Web 产品的实现参考，不是要直接放进界面的静态截图。它统一了文档、数据表、日历、文件、AI 接入、设置和公开页的视觉语言：内容优先、冷白纸张、克制玻璃、工具按需出现。

## 页面设计稿

| Screen | File | Current implementation target |
| --- | --- | --- |
| 空间首页 | `screens/01-space-home.png` | `ClawNotePro` 的 `SpaceHome` |
| 文档编辑 | `screens/02-document-editor.png` | `DocumentPanel` 和 TipTap 编辑器 |
| 多维表格 - 表格 | `screens/03-bitable-grid.png` | `BitableApp`、`GridView` |
| 多维表格 - 看板 | `screens/04-bitable-kanban.png` | `KanbanView`、记录详情抽屉 |
| 日历 | `screens/05-calendar.png` | `CalendarApp` |
| 文件库 | `screens/06-file-library.png` | `/files` |
| AI 接入 | `screens/07-agent-console.png` | `AgentChat`、Agent 审核与 Token 能力 |
| 空间设置 | `screens/08-space-settings.png` | `SettingsPanel`、`/settings`、`/tokens` |
| 公开文档 | `screens/09-public-share.png` | `/share/[id]` |
| 多维表格表单 | `screens/10-bitable-form.png` | `FormView` |

## 实现原则

- 设计稿中的 Dock、搜索框、抽屉、浮层和快速操作由 React + Tailwind + Lucide 实现，不导出成 PNG。
- 页面截图只用于对齐布局、层级、间距和交互状态，不能直接作为运行时背景或页面内容。
- 固定品牌素材统一放进 `public/media/clawnote/`，代码以 `/media/clawnote/...` 引用。
- 用户上传的文件、图片、文档封面继续走 `/api/files`，不要混入静态素材目录。
- 表格、看板、日历、设置页的主要价值是实时数据；这些页面不应依赖装饰性大图。

## 视觉基调

- 画布：`#F7F8FA` 到低对比冷白纸张，不用紫色或高饱和渐变。
- 文本：墨色 `#111827`，辅助信息使用中性 slate，不用大面积浅灰文字。
- 强调：cobalt blue 仅用于选中、焦点、主操作；moss green / amber 只表达状态。
- 玻璃：仅用于 Dock、搜索、菜单、抽屉和检查器；正文、表格、Diff、长文本保持实面。
- 动效：hover 80ms，浮层 180ms，拖拽 60fps；不使用背景漂浮光球。

## 下次需要生成的运行时 PNG 素材

以下素材是真正适合进入仓库、被页面复用的图片。它们都应无文字、无 Logo、无 UI 控件，便于响应式裁剪。

| Priority | Planned file | Size | Used by | Brief |
| --- | --- | --- | --- | --- |
| P0 | `public/media/clawnote/share/editorial-desk-side.png` | `1024x1536` | 公开文档页右侧氛围图 | 低对比自然窗光、书桌与植物、右侧竖向构图、留出左侧安全区 |
| P0 | `public/media/clawnote/forms/feedback-notebook-edge.png` | `1536x1024` | 公开表单页背景边缘 | 纸张、笔记本和植物的克制俯视局部，中央与右侧留白 |
| P0 | `public/media/clawnote/covers/meeting-notes.png` | `1600x640` | 会议纪要模板封面 | 抽象会议桌与浅色纸张，不出现人物和文字 |
| P0 | `public/media/clawnote/covers/project-plan.png` | `1600x640` | 项目计划模板封面 | 精密时间线、便签和桌面材料的抽象摄影构图 |
| P0 | `public/media/clawnote/covers/user-research.png` | `1600x640` | 用户访谈/研究模板封面 | 访谈笔记、录音设备或卡片的克制细节图 |
| P0 | `public/media/clawnote/covers/design-principles.png` | `1600x640` | 产品设计原则封面 | 白纸、网格和铅笔的安静近景 |
| P1 | `public/media/clawnote/covers/learning-notes.png` | `1600x640` | 学习笔记模板封面 | 书本、边注和自然阴影的轻量摄影 |
| P1 | `public/media/clawnote/covers/weekly-review.png` | `1600x640` | 周复盘模板封面 | 日历纸、标记和简洁桌面的抽象画面 |
| P1 | `public/media/clawnote/textures/paper-grain.png` | `512x512` | 低强度纸张纹理覆盖层 | 可无缝平铺、几乎不可察觉的冷白纸张颗粒 |

## 不需要生成图片的部分

- App 图标、导航、搜索、文件类型、操作按钮：继续使用 `public/icon.svg` 和 Lucide 图标。
- 用户头像：由真实成员资料或安全的首字母头像生成，不要内置 AI 人像。
- 文件缩略图、表格卡片封面：使用用户上传内容或文件预览生成，不能用固定占位图掩盖真实数据。
- 光晕、玻璃高光、阴影、分隔线：由 CSS 完成，避免加载无意义的装饰 PNG。

## 代码接入方式

静态素材生成后，放入上面的 `public/media/clawnote/` 目录即可。Next.js 不需要额外 import：

```tsx
const coverImage = "/media/clawnote/covers/design-principles.png";

<div
  className="bg-cover bg-center"
  style={{ backgroundImage: `url(${coverImage})` }}
/>
```

文档封面需要写回 `Document.coverImage`；用户选择的图片仍通过 `/api/files` 返回 URL 后写入同一字段。这样公开页和文档编辑页可以共享封面，而不会把静态资源逻辑混进上传流程。
