# ClawNote Web V2 Design Pack

这套设计稿只覆盖 Web 桌面端。`pages/` 是开发主参考，每个页面一张独立设计图；`interactions/` 是交互动效分镜，不作为页面静态稿。

## 页面设计稿

| Page | File | Purpose |
| --- | --- | --- |
| 空间首页 | `pages/01-space-home.png` | 创作入口、文档纸张、全局 Dock、命令搜索、创建入口 |
| 文档编辑 | `pages/02-document-editor.png` | 沉浸式写作、情境工具、块控件、边注 |
| 日历画布 | `pages/03-calendar-canvas.png` | 时间画布、日程拖拽、事件详情 |
| 知识画布 | `pages/04-knowledge-canvas.png` | 结构化知识对象、关系连线、属性透镜 |
| Agent Studio | `pages/05-agent-studio.png` | Agent 提案审核、Diff、权限与版本回滚 |
| 空间设置 | `pages/06-space-settings.png` | 外观、布局、材质、成员与空间配置 |

## 动效分镜

| Flow | File | Purpose |
| --- | --- | --- |
| 空间首页动效 | `interactions/01-space-home-motion.png` | Dock 展开、命令搜索、结果重排、进入编辑 |
| 文档编辑动效 | `interactions/02-document-editor-motion.png` | 块控件、插入菜单、文字选择、拖拽重排 |
| 日历与知识画布动效 | `interactions/03-calendar-knowledge-motion.png` | 日程拖拽、知识对象连线 |
| Agent 与设置动效 | `interactions/04-agent-settings-motion.png` | 提案审核、部分接受、版本创建、材质调节 |

## 实现基调

- 不使用后台式永久侧栏，默认以创作画布为主。
- 玻璃只用于 Dock、命令入口、浮层、工具条和透镜。
- 文档、Diff、表格、长文本必须使用不透明纸张表面。
- 工具默认隐藏，依据 hover、selection、drag、focus 出现。
- 主强调色使用 cobalt blue，避免紫色和 AI 风格渐变。
- 桌面首屏应优先呈现内容对象，而不是配置面板。

## Motion Tokens

| Interaction | Timing |
| --- | --- |
| Hover reveal | `80ms ease-out` |
| Dock expand | `120ms ease-out` |
| Floating menu open | `180ms spring` |
| Object lift | `180-240ms spring` |
| Drag | `60fps transform` |
| Canvas/path settle | `260ms ease-out` |
| Page morph transition | `360-420ms ease-in-out` |
| Save or success pulse | `220-320ms spring` |

