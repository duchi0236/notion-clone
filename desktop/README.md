# ClawNote 桌面客户端（Electron）

原生桌面窗口，加载 ClawNote web 产品（与 VS Code / Slack / Notion 桌面版同理：
web UI 即桌面端界面，不重复实现业务逻辑）。本目录已是**可打包安装的成品**。

## 能力

- 原生窗口（macOS 隐藏式标题栏）、单实例锁、中文原生菜单
- `Cmd/Ctrl+N` 新建文档、`Cmd/Ctrl+,` 打开服务器设置
- **应用内服务器配置**（持久化到 `userData/config.json`，不再写死环境变量）
- **首次运行引导页**：填服务器地址即可用
- **连接失败页**：一键「重试 / 服务器设置」
- **可选本地内置服务**：自动 `next start` 并等待端口就绪
- **系统托盘**：托盘菜单（打开 / 快速采集 / 设置 / 退出），点击切换显隐；关闭窗口隐藏到托盘
- **全局快捷键**：`Cmd/Ctrl+Shift+Space` 显隐主窗口、`Cmd/Ctrl+Shift+C` 全局快速采集
- **快速采集**：随时弹出小窗，一键写入收集箱（`/api/inbox`），`⌘↵` 发送 / `Esc` 关闭
- **系统通知**：采集成功、更新提示等原生通知；web 端也可经 `window.clawnoteHost.notify()` 触发
- **自动更新**：基于 electron-updater，启动后台检查 + 「检查更新…」菜单（需配置发布源）
- 外链用系统浏览器打开；安全 preload 桥接（contextIsolation 开启）
- electron-builder 打包为 **dmg / exe / AppImage**

## 全局快捷键

| 快捷键 | 功能 |
|---|---|
| `Cmd/Ctrl + Shift + Space` | 显示 / 隐藏主窗口 |
| `Cmd/Ctrl + Shift + C` | 全局快速采集到收集箱 |
| `Cmd/Ctrl + N` | 新建文档（窗口内） |
| `Cmd/Ctrl + ,` | 服务器设置 |

> 快速采集向当前服务器 `POST /api/inbox`（开发/默认工作区无需鉴权）。

## 开发运行

```bash
# 方式一：一条命令同时起 Next(:3001) 和 Electron
npm run desktop:dev

# 方式二：先单独起服务，再起壳
next dev -p 3001
npm run desktop
```

首次启动若未配置地址，会进入引导页；填入 `http://localhost:3001` 即可。

## 打包成安装包

```bash
npm install              # 确保 electron-builder 已安装（devDependency）
npm run desktop:dist     # 产物输出到 release/
# 仅打目录不压缩（调试更快）：
npm run desktop:dist:dir
```

- macOS → `release/ClawNote-<ver>.dmg`、`.zip`
- Windows → `release/ClawNote Setup <ver>.exe`（NSIS，可选安装目录）
- Linux → `release/ClawNote-<ver>.AppImage`、`.deb`

图标取自 `build/icon.png`（1024×1024），electron-builder 会自动生成各平台 `icns/ico`。

> 注意：打包需在对应平台进行（macOS 出 dmg，Windows 出 exe）。跨平台打包需额外工具链。

## 服务器模式

桌面端连接到一个 ClawNote 服务（ClawNote 依赖 PostgreSQL，客户端不内置数据库）。两种方式：

1. **连接服务器**（默认）：填部署实例或本机 `http://localhost:3001`。
2. **本地内置服务**：填本机 ClawNote 项目目录 + 端口，应用启动时自动运行 `next start`。
   需该目录已 `npm run build` 且配置好 `DATABASE_URL`（PostgreSQL）。

配置随时可在「文件 → 服务器设置…」修改。

## 文件

```
desktop/
├── main.cjs       # 主进程：窗口/菜单/托盘/快捷键/通知/自动更新/配置/引导/错误页/本地服务
├── preload.cjs    # 安全桥接：环境信息 + 配置读写 + 采集 + 通知 IPC
├── settings.html  # 首启 / 服务器设置页
├── error.html     # 连接失败页
└── capture.html   # 全局快速采集小窗
build/
├── icon.png            # 打包图标
├── tray.png            # Windows/Linux 托盘图标
└── trayTemplate.png    # macOS 模板托盘图标（自动适配深浅色菜单栏）
```

打包配置见仓库根 `package.json` 的 `build` 字段。托盘图标通过 `extraResources` 打进 `resources/build/`。

## 自动更新

`main.cjs` 已集成 `electron-updater`：打包版启动后台检查，发现新版后台下载、下载完成提示重启安装。
要真正生效需在 `package.json` 的 `build.publish` 配置发布源（如 GitHub Releases 或通用服务器），
并在 CI 中签名/发布产物。未配置发布源时，「检查更新…」会提示未集成，不影响其它功能。

> 注：当前桌面端与 web 共用根 `package.json`，打包会带入较多依赖。若要更小体积，
> 可为 `desktop/` 单独建一份精简 `package.json` 再打包。
