"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Shapes, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeSvg } from "@/lib/sanitize-svg";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    svgBlock: {
      setSvgBlock: (attrs?: { svg?: string }) => ReturnType;
    };
  }
}

// 文档块：内联渲染 SVG 矢量图。源码存在节点的 data-svg 属性里，随文档保存、可二次编辑。
// 渲染前净化：移除 <script>/<foreignObject>、on* 事件属性和 javascript: 链接，避免 XSS。
export const SvgBlock = Node.create({
  name: "svgBlock",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      svg: {
        default: "",
        parseHTML: (el) => decodeURIComponent(el.getAttribute("data-svg") || ""),
        renderHTML: (attrs) => ({ "data-svg": encodeURIComponent(attrs.svg || "") }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-svg-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-svg-block": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SvgView);
  },

  addCommands() {
    return {
      setSvgBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { svg: attrs?.svg ?? "" } }),
    };
  },
});

function SvgPreview({ svg, className }: { svg: string; className?: string }) {
  const safe = useMemo(() => sanitizeSvg(svg), [svg]);
  if (!safe) {
    return <div className="p-6 text-center text-sm text-rose-400">SVG 解析失败，请检查源码</div>;
  }
  return (
    <div
      className={cn("flex justify-center [&_svg]:h-auto [&_svg]:max-w-full", className)}
      // 已净化（去除脚本/事件），可安全内联渲染
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

function SvgView(props: NodeViewProps) {
  const svg = (props.node.attrs.svg as string) || "";
  const [open, setOpen] = useState(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    if (!svg) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback((next: string) => {
    propsRef.current.updateAttributes({ svg: next });
    setOpen(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    if (!((propsRef.current.node.attrs.svg as string) || "").trim()) propsRef.current.deleteNode();
  }, []);

  return (
    <NodeViewWrapper className="my-3">
      {svg ? (
        <div className={cn("group/svg relative overflow-hidden rounded-lg bg-white p-4 ring-1 ring-slate-200", props.selected && "ring-2 ring-blue-400")}>
          <SvgPreview svg={svg} />
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-0.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover/svg:opacity-100" contentEditable={false}>
            <button type="button" onClick={() => setOpen(true)} title="编辑 SVG" className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => props.deleteNode()} title="删除" className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          contentEditable={false}
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-8 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-600"
        >
          <Shapes className="h-4 w-4" /> 点击粘贴 / 编写 SVG
        </button>
      )}
      {open && <SvgEditorModal initialSvg={svg} onSave={save} onClose={close} />}
    </NodeViewWrapper>
  );
}

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b82f6"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="220" height="100" rx="16" fill="url(#g)"/>
  <text x="120" y="68" text-anchor="middle" font-size="22" fill="#fff" font-family="sans-serif">SVG 图形</text>
</svg>`;

// 左侧写 SVG 源码、右侧实时预览的全屏编辑器
function SvgEditorModal({ initialSvg, onSave, onClose }: { initialSvg: string; onSave: (svg: string) => void; onClose: () => void }) {
  const [code, setCode] = useState(initialSvg);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSave(code);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [code, onClose, onSave]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/50 p-3 sm:p-6" onMouseDown={onClose}>
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Shapes className="h-4 w-4" /> SVG 图形
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCode(SAMPLE)} className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">示例</button>
            <button onClick={() => onSave(code)} className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
              保存 <span className="ml-1 opacity-60">⌘↵</span>
            </button>
            <button onClick={onClose} title="放弃" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder="在此粘贴或编写 SVG 源码…"
            className="h-full w-full resize-none border-b border-slate-200 bg-slate-50 p-4 font-mono text-[13px] leading-6 text-slate-800 outline-none md:border-b-0 md:border-r"
          />
          <div className="min-h-0 overflow-auto bg-[radial-gradient(circle,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:16px_16px]">
            <div className="border-b border-slate-100 bg-white px-4 py-1.5 text-[11px] font-medium text-slate-400">预览</div>
            {code.trim() ? <SvgPreview svg={code} className="p-6" /> : <div className="p-8 text-center text-sm text-slate-300">预览将在这里显示</div>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
