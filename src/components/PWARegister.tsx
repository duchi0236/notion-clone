"use client";

import { useEffect } from "react";

// 生产环境：注册 Service Worker，让 ClawNote 可安装、可离线。
// 开发环境：绝不注册，并主动注销任何已存在的 SW + 清空缓存 —— 因为 dev 模式
// 下 webpack chunk 文件名不带内容 hash，SW 的"缓存优先"会一直喂旧 JS，导致
// 新功能（如绘图/脑图菜单项）刷新也不出现。
export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if (typeof caches !== "undefined") {
        void caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
      return;
    }

    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
