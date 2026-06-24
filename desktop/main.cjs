// ClawNote 桌面客户端（Electron）——可安装成品版。
// 架构：原生窗口加载 ClawNote web 产品（与 VS Code / Slack / Notion 桌面版同理，
// web UI 即桌面端界面，不重复实现业务逻辑）。本版增加：
//   - 应用内服务器配置（持久化到 userData/config.json），不再写死环境变量
//   - 首次运行引导页 / 连接失败页（原生本地 HTML）
//   - 可选「本地内置服务」：自动 spawn `next start` 并等待端口就绪
//   - 通过 electron-builder 打包为 dmg / exe / AppImage
const { app, BrowserWindow, Menu, Tray, shell, nativeTheme, nativeImage, globalShortcut, Notification, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const net = require("net");
const { spawn } = require("child_process");

// electron-updater 可选：未安装时不影响应用运行。
let autoUpdater = null;
try { ({ autoUpdater } = require("electron-updater")); } catch { /* 未打包/未安装时跳过 */ }

const isMac = process.platform === "darwin";
const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");
const RESOURCE_DIR = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..");

// 全局快捷键（可在配置里覆盖）
const DEFAULT_SHORTCUTS = {
  toggleWindow: "CommandOrControl+Shift+Space",
  quickCapture: "CommandOrControl+Shift+C",
};

let tray = null;
let captureWindow = null;

const DEFAULT_CONFIG = {
  serverUrl: process.env.CLAWNOTE_URL || "",
  localServer: { enabled: false, dir: "", port: 3001 },
};

let mainWindow = null;
let serverProc = null;
let currentUrl = null;

// ---------------------------------------------------------------- config IO
function readConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    return { ...DEFAULT_CONFIG, ...parsed, localServer: { ...DEFAULT_CONFIG.localServer, ...(parsed.localServer || {}) } };
  } catch {
    return { ...DEFAULT_CONFIG, localServer: { ...DEFAULT_CONFIG.localServer } };
  }
}
function writeConfig(cfg) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  } catch (e) {
    console.error("[clawnote] failed to write config", e);
  }
}

// ------------------------------------------------------------- port helpers
function waitForPort(port, host = "127.0.0.1", timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const sock = net.connect(port, host);
      sock.once("connect", () => { sock.destroy(); resolve(true); });
      sock.once("error", () => {
        sock.destroy();
        if (Date.now() - started > timeoutMs) reject(new Error(`等待端口 ${port} 超时`));
        else setTimeout(tick, 500);
      });
    };
    tick();
  });
}

// ------------------------------------------------- optional local next server
async function startLocalServer(cfg) {
  const { dir, port } = cfg.localServer;
  if (!dir || !fs.existsSync(dir)) throw new Error(`本地服务目录不存在：${dir || "(未设置)"}`);
  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  serverProc = spawn(cmd, ["next", "start", "-p", String(port)], {
    cwd: dir,
    env: { ...process.env },
    stdio: "ignore",
  });
  serverProc.on("exit", (code) => { console.log(`[clawnote] local server exited (${code})`); serverProc = null; });
  await waitForPort(port);
  return `http://localhost:${port}`;
}

// --------------------------------------------------------------- target url
async function resolveTargetUrl(cfg) {
  if (cfg.localServer?.enabled) return startLocalServer(cfg);
  if (cfg.serverUrl) return cfg.serverUrl.replace(/\/+$/, "");
  return null; // 触发首启引导
}

// ----------------------------------------------------------------- windows
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 880,
    minHeight: 600,
    backgroundColor: "#ffffff",
    title: "ClawNote",
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 14, y: 16 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (currentUrl && url.startsWith(currentUrl)) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("file://") || url.startsWith("http://localhost")) return;
    if (!currentUrl || !url.startsWith(currentUrl)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
  mainWindow.webContents.on("did-fail-load", (_e, code, desc, failedUrl) => {
    if (code === -3 || !failedUrl) return; // 忽略请求中断 / about:blank
    console.error(`[clawnote] failed to load (${code}): ${desc} ${failedUrl}`);
    loadErrorPage(desc || `错误码 ${code}`);
  });

  // 有托盘时，点关闭仅隐藏到托盘；真正退出走托盘/菜单的「退出」。
  mainWindow.on("close", (event) => {
    if (tray && !app.isQuitting) { event.preventDefault(); mainWindow.hide(); }
  });
  mainWindow.on("closed", () => { mainWindow = null; });
}

function loadTarget(url) {
  currentUrl = url;
  if (!mainWindow) createWindow();
  mainWindow.loadURL(url);
}
function loadSettings(firstRun = false) {
  if (!mainWindow) createWindow();
  currentUrl = null;
  mainWindow.loadFile(path.join(__dirname, "settings.html"), { query: { firstRun: firstRun ? "1" : "0" } });
}
function loadErrorPage(message) {
  if (!mainWindow) createWindow();
  const target = currentUrl || "";
  mainWindow.loadFile(path.join(__dirname, "error.html"), { query: { message: String(message), target } });
}

async function boot() {
  const cfg = readConfig();
  try {
    const url = await resolveTargetUrl(cfg);
    if (!url) { loadSettings(true); return; }
    loadTarget(url);
  } catch (e) {
    loadErrorPage(e.message || String(e));
  }
}

// --------------------------------------------------------------- 主窗口显隐
function showMainWindow() {
  if (!mainWindow) { createWindow(); boot(); return; }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}
function toggleMainWindow() {
  if (mainWindow && mainWindow.isVisible() && mainWindow.isFocused()) mainWindow.hide();
  else showMainWindow();
}

// ------------------------------------------------------------------ 系统通知
function notify(title, body) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: title || "ClawNote", body: body || "" });
  n.on("click", () => showMainWindow());
  n.show();
}

// -------------------------------------------------------------- 快速采集窗口
function openQuickCapture() {
  if (captureWindow) { captureWindow.show(); captureWindow.focus(); return; }
  captureWindow = new BrowserWindow({
    width: 460,
    height: 280,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: "快速采集",
    alwaysOnTop: true,
    show: false,
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  captureWindow.loadFile(path.join(__dirname, "capture.html"));
  captureWindow.once("ready-to-show", () => { captureWindow.show(); captureWindow.focus(); });
  captureWindow.on("closed", () => { captureWindow = null; });
}

// 把采集内容写入当前服务器的 /api/inbox（开发/默认工作区无需鉴权）。
async function submitCapture(title) {
  const text = String(title || "").trim();
  if (!text) return { ok: false, reason: "内容为空" };
  const cfg = readConfig();
  const base = currentUrl || (cfg.serverUrl ? cfg.serverUrl.replace(/\/+$/, "") : (cfg.localServer?.enabled ? `http://localhost:${cfg.localServer.port}` : ""));
  if (!base) return { ok: false, reason: "未配置服务器" };
  try {
    const res = await fetch(`${base}/api/inbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: text, content: text, source: "MANUAL" }),
    });
    if (!res.ok) return { ok: false, reason: `服务器返回 ${res.status}` };
    notify("已采集到收集箱", text.length > 40 ? text.slice(0, 40) + "…" : text);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message || "网络错误" };
  }
}

// ----------------------------------------------------------------- 系统托盘
function trayImage() {
  const file = isMac ? "trayTemplate.png" : "tray.png";
  const candidates = [path.join(RESOURCE_DIR, "build", file), path.join(__dirname, "..", "build", file)];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const img = nativeImage.createFromPath(p);
      if (isMac) img.setTemplateImage(true);
      return img;
    }
  }
  return nativeImage.createEmpty();
}
function createTray() {
  if (tray) return;
  try { tray = new Tray(trayImage()); } catch (e) { console.error("[clawnote] tray failed", e); return; }
  tray.setToolTip("ClawNote");
  const menu = Menu.buildFromTemplate([
    { label: "打开 ClawNote", click: () => showMainWindow() },
    { label: "快速采集…", accelerator: DEFAULT_SHORTCUTS.quickCapture, click: () => openQuickCapture() },
    { type: "separator" },
    { label: "服务器设置…", click: () => { showMainWindow(); loadSettings(false); } },
    { label: "重新连接", click: () => boot() },
    { type: "separator" },
    { label: "退出", click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => toggleMainWindow());
}

// ------------------------------------------------------------- 全局快捷键
function registerShortcuts() {
  const cfg = readConfig();
  const sc = { ...DEFAULT_SHORTCUTS, ...(cfg.shortcuts || {}) };
  globalShortcut.unregisterAll();
  if (sc.toggleWindow) globalShortcut.register(sc.toggleWindow, () => toggleMainWindow());
  if (sc.quickCapture) globalShortcut.register(sc.quickCapture, () => openQuickCapture());
}

// --------------------------------------------------------------- 自动更新
function setupAutoUpdate(manual = false) {
  if (!autoUpdater) { if (manual) dialog.showMessageBox({ message: "此版本未集成自动更新（需配置发布源）。" }); return; }
  autoUpdater.autoDownload = true;
  autoUpdater.removeAllListeners();
  autoUpdater.on("update-available", (info) => notify("发现新版本", `正在后台下载 v${info?.version || ""}…`));
  autoUpdater.on("update-downloaded", (info) => {
    dialog.showMessageBox({
      type: "info",
      buttons: ["现在重启", "稍后"],
      defaultId: 0,
      message: `ClawNote v${info?.version || ""} 已下载`,
      detail: "重启应用即可完成更新。",
    }).then((r) => { if (r.response === 0) { app.isQuitting = true; autoUpdater.quitAndInstall(); } });
  });
  autoUpdater.on("error", (e) => { if (manual) dialog.showMessageBox({ message: `检查更新失败：${e?.message || e}` }); });
  if (manual) autoUpdater.on("update-not-available", () => dialog.showMessageBox({ message: "已是最新版本。" }));
  try { autoUpdater.checkForUpdates(); } catch (e) { if (manual) dialog.showMessageBox({ message: `检查更新失败：${e.message}` }); }
}

// --------------------------------------------------------------------- IPC
ipcMain.handle("clawnote:get-config", () => readConfig());
ipcMain.handle("clawnote:save-config", async (_e, next) => {
  const prev = readConfig();
  const cfg = { ...prev, ...next, localServer: { ...prev.localServer, ...(next.localServer || {}) } };
  writeConfig(cfg);
  if (serverProc) { try { serverProc.kill(); } catch {} serverProc = null; }
  try {
    const url = await resolveTargetUrl(cfg);
    if (!url) { loadSettings(false); return { ok: false, reason: "缺少服务器地址" }; }
    loadTarget(url);
    return { ok: true, url };
  } catch (e) {
    loadErrorPage(e.message || String(e));
    return { ok: false, reason: e.message };
  }
});
ipcMain.on("clawnote:retry", () => boot());
ipcMain.on("clawnote:open-settings", () => loadSettings(false));
ipcMain.handle("clawnote:capture", async (_e, text) => submitCapture(text));
ipcMain.on("clawnote:close-capture", () => { if (captureWindow) captureWindow.close(); });
ipcMain.on("clawnote:notify", (_e, payload) => notify(payload?.title, payload?.body));

// -------------------------------------------------------------------- menu
function buildMenu() {
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "文件",
      submenu: [
        { label: "新建文档", accelerator: "CmdOrCtrl+N", click: () => mainWindow?.webContents.executeJavaScript("document.querySelector('button[title=\\'新建文档\\']')?.click()") },
        { label: "快速采集…", accelerator: "CmdOrCtrl+Shift+C", click: () => openQuickCapture() },
        { label: "服务器设置…", accelerator: "CmdOrCtrl+,", click: () => loadSettings(false) },
        { label: "重新连接", click: () => boot() },
        { label: "检查更新…", click: () => setupAutoUpdate(true) },
        { type: "separator" },
        isMac ? { role: "close", label: "关闭窗口" } : { role: "quit", label: "退出" },
      ],
    },
    { role: "editMenu", label: "编辑" },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "forceReload", label: "强制重新加载" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "全屏" },
      ],
    },
    { role: "windowMenu", label: "窗口" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ----------------------------------------------------------------- lifecycle
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });

  app.whenReady().then(() => {
    nativeTheme.themeSource = "light";
    buildMenu();
    createTray();
    registerShortcuts();
    boot();
    if (app.isPackaged) setupAutoUpdate(false);
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) boot(); else showMainWindow(); });
  });

  // 有托盘时，关闭窗口仅隐藏到托盘（点退出才真正退出）。
  app.on("window-all-closed", () => { if (!isMac && !tray) app.quit(); });
  app.on("before-quit", () => {
    app.isQuitting = true;
    globalShortcut.unregisterAll();
    if (serverProc) { try { serverProc.kill(); } catch {} }
    if (tray) { try { tray.destroy(); } catch {} }
  });
}
