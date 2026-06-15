"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggleBlock: {
      setToggle: () => ReturnType;
    };
  }
}

// A Notion-style collapsible toggle. The first child block is the always-visible
// title; the remaining blocks are hidden when collapsed.
export const Toggle = Node.create({
  name: "toggleBlock",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-open") !== "false",
        renderHTML: (attrs) => ({ "data-open": attrs.open ? "true" : "false" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-toggle]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-toggle": "" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView);
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { open: true },
              content: [
                { type: "paragraph", content: [{ type: "text", text: "折叠标题" }] },
                { type: "paragraph" },
              ],
            })
            .run(),
    };
  },
});

function ToggleView(props: NodeViewProps) {
  const open = props.node.attrs.open as boolean;
  return (
    <NodeViewWrapper className="my-1">
      <div className="flex gap-1">
        <button
          type="button"
          contentEditable={false}
          onClick={() => props.updateAttributes({ open: !open })}
          className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title={open ? "折叠" : "展开"}
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
        </button>
        <NodeViewContent className={cn("min-w-0 flex-1 toggle-content", !open && "toggle-collapsed")} />
      </div>
    </NodeViewWrapper>
  );
}
