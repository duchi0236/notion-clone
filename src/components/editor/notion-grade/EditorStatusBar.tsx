"use client";

import type { Editor } from "@tiptap/react";
import { Keyboard, Type } from "lucide-react";

export function EditorStatusBar({ editor }: { editor: Editor }) {
  const text = editor.getText();
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const blocks = editor.state.doc.childCount;

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
      <div className="flex items-center gap-4">
        <span><Type className="mr-1 inline h-3 w-3" />{chars} 字符</span>
        <span>{words} 词</span>
        <span>{blocks} 块</span>
      </div>
      <div className="flex items-center gap-3">
        <span><Keyboard className="mr-1 inline h-3 w-3" />/ 打开命令</span>
        <span>⌘/ 快捷操作</span>
        <span>拖拽文件上传</span>
      </div>
    </div>
  );
}
