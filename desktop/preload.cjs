// Minimal, safe bridge (contextIsolation on). Exposes read-only environment info
// so the web app can detect it is running inside the desktop client if needed.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("clawnoteDesktop", {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
