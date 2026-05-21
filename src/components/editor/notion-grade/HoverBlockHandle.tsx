"use client";

import type { Editor } from "@tiptap/react";
import { Bot, Copy, GripVertical, Plus, Trash2 } from "lucide-react";

export function HoverBlockHandle({
  editor,
  onAiRewrite,
}: {
  editor: Editor;
  onAiRewrite: () => void;
}) {
  function insertBelow() {
    editor.chain().focus().insertContent("<p></p>").run();
  }

  function duplicateSelection() {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
    if (selectedText) {
      editor.chain().focus().insertContent(`<p>${escapeHtml(selectedText)}</p>`).run();
      return;
    }
    const currentText = editor.state.doc.textBetween(Math.max(0, from - 160), from + 160, " ").trim();
    editor.chain().focus().insertContent(`<p>${escapeHtml(currentText || "新块")}</p>`).run();
  }

  function deleteSelectionOrParagraph() {
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().deleteSelection().run();
      return;
    }
    const text = editor.state.doc.textBetween(Math.max(0, from - 120), from + 120, " ").trim();
    if (text) {
      editor.chain().focus().deleteSelection().run();
    } else {
      editor.chain().focus().insertContent("").run();
    }
  }

  return (
    <div className="quiet-hover-handle group absolute -left-12 top-20 z-20 flex flex-col items-center gap-1 opacity-0 transition-opacity duration-150 hover:opacity-100 focus-within:opacity-100">
      <button className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600" title="拖拽块（规划中）">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
        <button onClick={insertBelow} className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100" title="下方插入">
          <Plus className="h-4 w-4" />
        </button>
        <button onClick={duplicateSelection} className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100" title="复制所选">
          <Copy className="h-4 w-4" />
        </button>
        <button onClick={onAiRewrite} className="rounded-xl p-1.5 text-blue-600 hover:bg-blue-50" title="AI 改写">
          <Bot className="h-4 w-4" />
        </button>
        <button onClick={deleteSelectionOrParagraph} className="rounded-xl p-1.5 text-red-500 hover:bg-red-50" title="删除">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
