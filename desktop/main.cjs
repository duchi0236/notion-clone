// ClawNote desktop client (Electron). Reuses the full web product by loading it
// in a native window — no business logic is reimplemented. In dev it loads the
// running Next server; in production it loads CLAWNOTE_URL (a deployed instance
// or a locally-started `next start`).
const { app, BrowserWindow, Menu, shell, nativeTheme } = require("electron");
const path = require("path");

const APP_URL = process.env.CLAWNOTE_URL || "http://localhost:3001";
const isMac = process.platform === "darwin";

let mainWindow = null;

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

  mainWindow.loadURL(APP_URL);

  mainWindow.webContents.on("did-finish-load", () => {
    console.log(`[clawnote-desktop] loaded ${APP_URL}`);
  });
  mainWindow.webContents.on("did-fail-load", (_e, code, desc) => {
    console.error(`[clawnote-desktop] failed to load (${code}): ${desc}`);
  });

  // Open target=_blank / external links in the system browser, keep in-app nav internal.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_URL)) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(APP_URL) && !url.startsWith("http://localhost")) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "文件",
      submenu: [
        {
          label: "新建文档",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow?.webContents.executeJavaScript(
            "document.querySelector('button[title=\\'新建文档\\']')?.click()",
          ),
        },
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

// Single-instance lock — focus the existing window instead of opening a second.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    nativeTheme.themeSource = "light";
    buildMenu();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (!isMac) app.quit();
  });
}
