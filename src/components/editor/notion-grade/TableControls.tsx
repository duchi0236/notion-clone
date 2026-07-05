"use client";

import type { Editor } from "@tiptap/react";
import type { MouseEvent } from "react";
import { Columns3, Rows3, Trash2 } from "lucide-react";

export function TableControls({ editor }: { editor: Editor }) {
  if (!editor.isActive("table")) return null;

  const keepEditorSelection = (event: MouseEvent<HTMLButtonElement>) => event.preventDefault();

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 text-xs text-slate-600 shadow-xl">
      <span className="px-2 font-medium text-slate-400">表格</span>
      <button type="button" className="rounded-lg px-2 py-1.5 hover:bg-blue-50" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().addColumnBefore().run()}>
        <Columns3 className="mr-1 inline h-3 w-3" />左侧列
      </button>
      <button type="button" className="rounded-lg px-2 py-1.5 hover:bg-blue-50" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().addColumnAfter().run()}>
        <Columns3 className="mr-1 inline h-3 w-3" />右侧列
      </button>
      <button type="button" className="rounded-lg px-2 py-1.5 hover:bg-blue-50" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().addRowBefore().run()}>
        <Rows3 className="mr-1 inline h-3 w-3" />上方行
      </button>
      <button type="button" className="rounded-lg px-2 py-1.5 hover:bg-blue-50" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().addRowAfter().run()}>
        <Rows3 className="mr-1 inline h-3 w-3" />下方行
      </button>
      <button type="button" className="rounded-lg px-2 py-1.5 hover:bg-red-50 hover:text-red-600" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().deleteColumn().run()}>
        删除列
      </button>
      <button type="button" className="rounded-lg px-2 py-1.5 hover:bg-red-50 hover:text-red-600" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().deleteRow().run()}>
        删除行
      </button>
      <button type="button" className="rounded-lg px-2 py-1.5 hover:bg-red-50 hover:text-red-600" onMouseDown={keepEditorSelection} onClick={() => editor.chain().focus().deleteTable().run()}>
        <Trash2 className="mr-1 inline h-3 w-3" />删除表格
      </button>
    </div>
  );
}
