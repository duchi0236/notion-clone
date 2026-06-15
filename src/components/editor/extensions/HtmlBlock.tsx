"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Code2, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    htmlBlock: {
      setHtmlBlock: (attrs?: { html?: string }) => ReturnType;
    };
  }
}

// 文档块：渲染任意 HTML（含 CSS / JS），在沙箱 iframe 中运行，与主页面隔离。
// 源码存在节点的 data-html 属性里，随文档保存、可二次编辑。
export const HtmlBlock = Node.create({
  name: "htmlBlock",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      html: {
        default: "",
        parseHTML: (el) => decodeURIComponent(el.getAttribute("data-html") || ""),
        renderHTML: (attrs) => ({ "data-html": encodeURIComponent(attrs.html || "") }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-html-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-html-block": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(HtmlView);
  },

  addCommands() {
    return {
      setHtmlBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { html: attrs?.html ?? "" } }),
    };
  },
});

// 把用户 HTML 包进一个会上报自身高度的文档骨架（用于 iframe 自适应高度）
function buildSrcDoc(html: string, channel: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0}body{padding:10px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;color:#0f172a;font-size:14px;line-height:1.6}img{max-width:100%}</style>
</head><body>${html}
<script>(function(){function r(){try{parent.postMessage({__clawHtml:'${channel}',h:document.documentElement.scrollHeight||document.body.scrollHeight},'*')}catch(e){}}
try{new ResizeObserver(r).observe(document.documentElement)}catch(e){}
window.addEventListener('load',r);setTimeout(r,60);setTimeout(r,300);r();})();<\/script>
</body></html>`;
}

function HtmlPreview({ html }: { html: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const channel = useMemo(() => `h_${Math.random().toString(36).slice(2, 9)}`, []);
  const [height, setHeight] = useState(80);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.source !== frameRef.current?.contentWindow) return;
      const d = e.data as { __clawHtml?: string; h?: number };
      if (d?.__clawHtml === channel && typeof d.h === "number") {
        setHeight(Math.min(2000, Math.max(40, d.h)));
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [channel]);

  return (
    <iframe
      ref={frameRef}
      title="html-block"
      sandbox="allow-scripts allow-popups allow-forms"
      srcDoc={buildSrcDoc(html, channel)}
      className="w-full rounded-lg border-0 bg-white"
      style={{ height }}
    />
  );
}

function HtmlView(props: NodeViewProps) {
  const html = (props.node.attrs.html as string) || "";
  const [open, setOpen] = useState(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    if (!html) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback((next: string) => {
    propsRef.current.updateAttributes({ html: next });
    setOpen(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    if (!((propsRef.current.node.attrs.html as string) || "").trim()) propsRef.current.deleteNode();
  }, []);

  return (
    <NodeViewWrapper className="my-3">
      {html ? (
        <div className={cn("group/html relative overflow-hidden rounded-lg ring-1 ring-slate-200", props.selected && "ring-2 ring-blue-400")}>
          <HtmlPreview html={html} />
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-0.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover/html:opacity-100" contentEditable={false}>
            <button type="button" onClick={() => setOpen(true)} title="编辑 HTML" className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900">
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
          <Code2 className="h-4 w-4" /> 点击粘贴 / 编写 HTML
        </button>
      )}
      {open && <HtmlEditorModal initialHtml={html} onSave={save} onClose={close} />}
    </NodeViewWrapper>
  );
}

const SAMPLE = `<div style="padding:20px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#ec4899);color:#fff;text-align:center;font-weight:600">
  Hello, <span style="text-decoration:underline">HTML</span> 块！
</div>`;

// 左侧写代码、右侧实时预览的全屏编辑器
function HtmlEditorModal({ initialHtml, onSave, onClose }: { initialHtml: string; onSave: (html: string) => void; onClose: () => void }) {
  const [code, setCode] = useState(initialHtml);

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
            <Code2 className="h-4 w-4" /> HTML 块
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
            placeholder="在此粘贴或编写 HTML（支持内联 CSS / JS）…"
            className="h-full w-full resize-none border-b border-slate-200 bg-slate-50 p-4 font-mono text-[13px] leading-6 text-slate-800 outline-none md:border-b-0 md:border-r"
          />
          <div className="min-h-0 overflow-auto bg-white">
            <div className="border-b border-slate-100 px-4 py-1.5 text-[11px] font-medium text-slate-400">预览</div>
            {code.trim() ? <HtmlPreview html={code} /> : <div className="p-8 text-center text-sm text-slate-300">预览将在这里显示</div>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
