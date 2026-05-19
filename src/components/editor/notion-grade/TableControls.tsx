"use client";

import type { Editor } from "@tiptap/react";
import { Columns3, Rows3, Trash2 } from "lucide-react";

export function TableControls({ editor }: { editor: Editor }) {
  if (!editor.isActive("table")) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
      <span className="px-2 font-medium text-slate-500">表格</span>
      <button className="rounded-xl bg-white px-3 py-1.5 hover:bg-blue-50" onClick={() => editor.chain().focus().addColumnBefore().run()}>
        <Columns3 className="mr-1 inline h-3 w-3" />左侧列
      </button>
      <button className="rounded-xl bg-white px-3 py-1.5 hover:bg-blue-50" onClick={() => editor.chain().focus().addColumnAfter().run()}>
        <Columns3 className="mr-1 inline h-3 w-3" />右侧列
      </button>
      <button className="rounded-xl bg-white px-3 py-1.5 hover:bg-blue-50" onClick={() => editor.chain().focus().addRowBefore().run()}>
        <Rows3 className="mr-1 inline h-3 w-3" />上方行
      </button>
      <button className="rounded-xl bg-white px-3 py-1.5 hover:bg-blue-50" onClick={() => editor.chain().focus().addRowAfter().run()}>
        <Rows3 className="mr-1 inline h-3 w-3" />下方行
      </button>
      <button className="rounded-xl bg-white px-3 py-1.5 hover:bg-red-50 hover:text-red-600" onClick={() => editor.chain().focus().deleteColumn().run()}>
        删除列
      </button>
      <button className="rounded-xl bg-white px-3 py-1.5 hover:bg-red-50 hover:text-red-600" onClick={() => editor.chain().focus().deleteRow().run()}>
        删除行
      </button>
      <button className="rounded-xl bg-white px-3 py-1.5 hover:bg-red-50 hover:text-red-600" onClick={() => editor.chain().focus().deleteTable().run()}>
        <Trash2 className="mr-1 inline h-3 w-3" />删除表格
      </button>
    </div>
  );
}
