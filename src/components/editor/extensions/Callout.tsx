"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";

const EMOJIS = ["💡", "⚠️", "✅", "❗", "📌", "🔥", "📝", "❓"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { icon?: string }) => ReturnType;
    };
  }
}

// A Notion-style callout: an accent box with an editable emoji + rich body.
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      icon: { default: "💡" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-callout": "" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
    };
  },
});

function CalloutView(props: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const icon = props.node.attrs.icon as string;
  return (
    <NodeViewWrapper className="my-2 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
      <div className="relative shrink-0" contentEditable={false}>
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-lg leading-6 hover:opacity-70" title="更换图标">
          {icon}
        </button>
        {open && (
          <div className="absolute left-0 top-7 z-20 grid grid-cols-4 gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  props.updateAttributes({ icon: e });
                  setOpen(false);
                }}
                className="rounded p-1 text-base hover:bg-slate-100"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
      <NodeViewContent className="min-w-0 flex-1 leading-7" />
    </NodeViewWrapper>
  );
}
