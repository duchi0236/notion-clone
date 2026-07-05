"use client";

import { X } from "lucide-react";

const shortcuts = [
  ["/", "打开块命令菜单"],
  ["⌘ /", "切换命令菜单"],
  ["⌘ B", "加粗"],
  ["⌘ I", "斜体"],
  ["⌘ Z", "撤销"],
  ["⌘ ⇧ Z", "重做"],
  ["Tab", "列表缩进"],
  ["Shift Tab", "减少缩进"],
  ["拖拽文件", "上传并插入附件"],
];

export function KeyboardShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">编辑器快捷键</h2>
            <p className="mt-1 text-sm text-slate-500">更接近 Notion 的键盘写作体验。</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {shortcuts.map(([key, desc]) => (
            <div key={key} className="grid grid-cols-[160px_1fr] items-center px-4 py-3 text-sm">
              <kbd className="w-fit rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700">{key}</kbd>
              <span className="text-slate-600">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
