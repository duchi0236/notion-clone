"use client";

import type { Editor } from "@tiptap/react";
import { Copy, GripVertical, MoveDown, MoveUp, Plus, Trash2 } from "lucide-react";

export function BlockActionBar({ editor }: { editor: Editor }) {
  function duplicateSelection() {
    const html = editor.getHTML();
    const selection = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(selection.from, selection.to, " ");
    if (selectedText.trim()) {
      editor.chain().focus().insertContent(`<p>${selectedText}</p>`).run();
      return;
    }
    editor.chain().focus().insertContent("<p></p>").run();
  }

  function deleteCurrentBlock() {
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor.chain().focus().deleteSelection().run();
      return;
    }
    editor.chain().focus().deleteNode("paragraph").run();
  }

  function insertBelow() {
    editor.chain().focus().insertContent("<p></p>").run();
  }

  function moveUp() {
    editor.chain().focus().liftListItem("listItem").run();
  }

  function moveDown() {
    editor.chain().focus().sinkListItem("listItem").run();
  }

  return (
    <div className="mb-3 flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 text-xs text-slate-500 shadow-sm">
      <span className="flex items-center gap-1 px-2 text-slate-400"><GripVertical className="h-3.5 w-3.5" />块操作</span>
      <button onClick={insertBelow} className="rounded-xl px-2 py-1.5 hover:bg-slate-100"><Plus className="mr-1 inline h-3.5 w-3.5" />下方插入</button>
      <button onClick={duplicateSelection} className="rounded-xl px-2 py-1.5 hover:bg-slate-100"><Copy className="mr-1 inline h-3.5 w-3.5" />复制所选</button>
      <button onClick={moveUp} className="rounded-xl px-2 py-1.5 hover:bg-slate-100"><MoveUp className="mr-1 inline h-3.5 w-3.5" />提升</button>
      <button onClick={moveDown} className="rounded-xl px-2 py-1.5 hover:bg-slate-100"><MoveDown className="mr-1 inline h-3.5 w-3.5" />缩进</button>
      <button onClick={deleteCurrentBlock} className="rounded-xl px-2 py-1.5 text-red-500 hover:bg-red-50"><Trash2 className="mr-1 inline h-3.5 w-3.5" />删除</button>
    </div>
  );
}
