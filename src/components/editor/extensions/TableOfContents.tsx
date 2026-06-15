"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableOfContents: {
      setTableOfContents: () => ReturnType;
    };
  }
}

type Heading = { level: number; text: string; pos: number };

// A live table of contents: lists the document's headings and scrolls to them.
export const TableOfContents = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [{ tag: "div[data-toc]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-toc": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TocView);
  },

  addCommands() {
    return {
      setTableOfContents:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});

function collectHeadings(editor: Editor): Heading[] {
  const items: Heading[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      items.push({ level: node.attrs.level as number, text: node.textContent || "无标题", pos });
    }
  });
  return items;
}

function TocView(props: NodeViewProps) {
  const { editor } = props;
  const [headings, setHeadings] = useState<Heading[]>(() => collectHeadings(editor));

  useEffect(() => {
    const update = () => setHeadings(collectHeadings(editor));
    editor.on("update", update);
    editor.on("selectionUpdate", update);
    return () => {
      editor.off("update", update);
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  function goTo(pos: number) {
    editor.chain().focus().setTextSelection(pos + 1).run();
    const dom = editor.view.domAtPos(pos + 1).node as HTMLElement;
    (dom?.parentElement ?? dom)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }

  return (
    <NodeViewWrapper className="my-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5" contentEditable={false}>
      <div className="mb-1 text-xs font-semibold text-slate-400">目录</div>
      {headings.length === 0 ? (
        <div className="text-sm text-slate-400">文档中还没有标题</div>
      ) : (
        <ul className="space-y-0.5">
          {headings.map((h, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => goTo(h.pos)}
                className={cn("block w-full truncate text-left text-sm text-slate-600 hover:text-blue-600", h.level === 2 && "pl-3", h.level >= 3 && "pl-6 text-[13px]")}
              >
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </NodeViewWrapper>
  );
}
