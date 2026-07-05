"use client";

import type { Editor } from "@tiptap/react";
import { Bot, CheckSquare, Copy, GripVertical, Heading1, Heading2, Pilcrow, Quote, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AiCommand } from "./types";

type HoverBlock = {
  element: HTMLElement;
  top: number;
  left: number;
  pos: number;
};

const blockSelector = ["p", "h1", "h2", "h3", "li", "blockquote", "pre", "table", "img", "details.notion-toggle", ".notion-callout", ".notion-columns", ".notion-database-embed"].join(",");

function ToolButton({ children, title, onClick, danger = false }: { children: React.ReactNode; title: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-xl p-2 transition ${danger ? "text-slate-400 hover:bg-red-50 hover:text-red-500" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      {children}
    </button>
  );
}

export function BlockHoverToolbar({ editor, onAiCommand }: { editor: Editor; onAiCommand?: (command: AiCommand) => void }) {
  const [hoverBlock, setHoverBlock] = useState<HoverBlock | null>(null);
  const [pinned, setPinned] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const container = useMemo(() => editor.view.dom.parentElement, [editor]);

  useEffect(() => {
    if (!container) return;

    function onMouseMove(event: MouseEvent) {
      if (pinned) return;
      const target = event.target as HTMLElement | null;
      if (!target || toolbarRef.current?.contains(target)) return;
      const block = target.closest(blockSelector) as HTMLElement | null;
      if (!block || !editor.view.dom.contains(block)) {
        setHoverBlock(null);
        return;
      }

      const rootRect = container.getBoundingClientRect();
      const rect = block.getBoundingClientRect();
      const pos = editor.view.posAtDOM(block, 0);
      setHoverBlock({ element: block, top: rect.top - rootRect.top + container.scrollTop, left: Math.max(0, rect.left - rootRect.left - 54), pos });
    }

    function onMouseLeave(event: MouseEvent) {
      if (pinned) return;
      const related = event.relatedTarget as HTMLElement | null;
      if (related && toolbarRef.current?.contains(related)) return;
      setHoverBlock(null);
    }

    editor.view.dom.addEventListener("mousemove", onMouseMove);
    editor.view.dom.addEventListener("mouseleave", onMouseLeave);
    return () => {
      editor.view.dom.removeEventListener("mousemove", onMouseMove);
      editor.view.dom.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [container, editor, pinned]);

  if (!hoverBlock) return null;

  function focusBlock() {
    editor.chain().focus().setTextSelection(Math.max(1, hoverBlock.pos)).run();
  }

  function getBlockRange() {
    const $pos = editor.state.doc.resolve(Math.max(1, hoverBlock.pos));
    let depth = $pos.depth;
    while (depth > 0 && !$pos.node(depth).isBlock) depth -= 1;
    if (depth <= 0) return null;
    return { from: $pos.before(depth), to: $pos.after(depth) };
  }

  function duplicateBlock() {
    const range = getBlockRange();
    if (!range) return;
    editor.chain().focus().insertContentAt(range.to, hoverBlock.element.outerHTML).run();
  }

  function deleteBlock() {
    const range = getBlockRange();
    if (!range) return;
    editor.chain().focus().deleteRange(range).run();
    setHoverBlock(null);
  }

  function turnInto(type: "paragraph" | "h1" | "h2" | "todo" | "quote") {
    focusBlock();
    if (type === "paragraph") editor.chain().focus().setParagraph().run();
    if (type === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
    if (type === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
    if (type === "todo") editor.chain().focus().toggleTaskList().run();
    if (type === "quote") editor.chain().focus().toggleBlockquote().run();
  }

  return (
    <div
      ref={toolbarRef}
      className="absolute z-30 flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-xl ring-1 ring-slate-950/5 backdrop-blur transition"
      style={{ top: hoverBlock.top, left: hoverBlock.left }}
      onMouseEnter={() => setPinned(true)}
      onMouseLeave={() => setPinned(false)}
    >
      <button type="button" className="cursor-grab rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="拖拽块">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-0.5 rounded-xl bg-white">
        <ToolButton onClick={() => turnInto("paragraph")} title="转为正文"><Pilcrow className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => turnInto("h1")} title="一级标题"><Heading1 className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => turnInto("h2")} title="二级标题"><Heading2 className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => turnInto("todo")} title="待办"><CheckSquare className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={() => turnInto("quote")} title="引用"><Quote className="h-4 w-4" /></ToolButton>
        <span className="mx-1 h-5 w-px bg-slate-100" />
        <ToolButton onClick={() => onAiCommand?.("summary")} title="AI 处理"><Bot className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={duplicateBlock} title="复制块"><Copy className="h-4 w-4" /></ToolButton>
        <ToolButton onClick={deleteBlock} title="删除块" danger><Trash2 className="h-4 w-4" /></ToolButton>
      </div>
    </div>
  );
}
