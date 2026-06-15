"use client";

import { useEffect, useState } from "react";

// 主题状态：深色模式 + 液体玻璃，两者正交可叠加。
// 实际的类切换在 layout 的内联脚本里已先做（防闪），这里负责读写与切换。
export function useTheme() {
  const [dark, setDark] = useState(false);
  const [glass, setGlass] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setGlass(document.documentElement.classList.contains("glass"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("clawnote.theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
    setDark(next);
  }

  function toggleGlass() {
    const next = !document.documentElement.classList.contains("glass");
    document.documentElement.classList.toggle("glass", next);
    try {
      localStorage.setItem("clawnote.glass", next ? "1" : "0");
    } catch {
      /* ignore */
    }
    setGlass(next);
  }

  return { dark, toggle, glass, toggleGlass };
}
