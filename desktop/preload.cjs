// 安全桥接（contextIsolation 开启）。
// 1) clawnoteDesktop：只读环境信息，让 web 端可识别自己运行在桌面客户端内。
// 2) clawnoteHost：供本地 settings.html / error.html 读写配置与控制连接。
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("clawnoteDesktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});

contextBridge.exposeInMainWorld("clawnoteHost", {
  getConfig: () => ipcRenderer.invoke("clawnote:get-config"),
  saveConfig: (cfg) => ipcRenderer.invoke("clawnote:save-config", cfg),
  retry: () => ipcRenderer.send("clawnote:retry"),
  openSettings: () => ipcRenderer.send("clawnote:open-settings"),
  // 快速采集（供 capture.html）
  capture: (text) => ipcRenderer.invoke("clawnote:capture", text),
  closeCapture: () => ipcRenderer.send("clawnote:close-capture"),
  // 让 web 端可触发原生系统通知
  notify: (title, body) => ipcRenderer.send("clawnote:notify", { title, body }),
});
