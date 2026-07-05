"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Film, ImageIcon, Loader2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mediaBlock: {
      setMediaBlock: (attrs?: { kind?: "image" | "video" }) => ReturnType;
    };
  }
}

type Kind = "image" | "video";

// 文档块：AI 生成图片 / 视频。供应商无关——调用 /api/ai/generate-media（默认 mock 占位）。
// 属性随文档保存：kind / prompt / url / poster。
export const MediaBlock = Node.create({
  name: "mediaBlock",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      kind: { default: "image", parseHTML: (el) => el.getAttribute("data-kind") || "image", renderHTML: (a) => ({ "data-kind": a.kind }) },
      prompt: { default: "", parseHTML: (el) => decodeURIComponent(el.getAttribute("data-prompt") || ""), renderHTML: (a) => ({ "data-prompt": encodeURIComponent(a.prompt || "") }) },
      url: { default: "", parseHTML: (el) => el.getAttribute("data-url") || "", renderHTML: (a) => ({ "data-url": a.url || "" }) },
      poster: { default: "", parseHTML: (el) => el.getAttribute("data-poster") || "", renderHTML: (a) => ({ "data-poster": a.poster || "" }) },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-media-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-media-block": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MediaView);
  },
  addCommands() {
    return {
      setMediaBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { kind: attrs?.kind ?? "image" } }),
    };
  },
});

function MediaView(props: NodeViewProps) {
  const kind = (props.node.attrs.kind as Kind) || "image";
  const url = (props.node.attrs.url as string) || "";
  const poster = (props.node.attrs.poster as string) || "";
  const savedPrompt = (props.node.attrs.prompt as string) || "";
  const [prompt, setPrompt] = useState(savedPrompt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // 空 prompt 时给输入框抖动 + 聚焦提示（计时器去抖并在卸载时清理，避免在已卸载节点上 setState）
  const flagEmpty = useCallback(() => {
    inputRef.current?.focus();
    setShake(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShake(false), 400);
  }, []);
  useEffect(() => () => { if (shakeTimer.current) clearTimeout(shakeTimer.current); }, []);

  const hasResult = !!url || !!poster;

  const generate = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate-media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, prompt: text }),
      });
      const data = await res.json();
      if (data.status === "done") {
        propsRef.current.updateAttributes({ prompt: text, url: data.url || "", poster: data.poster || "" });
      } else {
        setError(data.error || "生成失败");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoading(false);
    }
  }, [prompt, kind, loading]);

  return (
    <NodeViewWrapper className="my-3">
      <div className={cn("overflow-hidden rounded-xl bg-white ring-1 ring-slate-200", props.selected && "ring-2 ring-blue-400")}>
        {/* 生成中骨架（尚无结果时） */}
        {loading && !hasResult && (
          <div className="flex h-44 items-center justify-center bg-slate-900/[0.03]" contentEditable={false}>
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">{kind === "image" ? "正在生成图片…" : "正在生成视频…"}</span>
            </div>
          </div>
        )}
        {/* 结果区 */}
        {hasResult && (
          <div className="group/m relative bg-slate-900/[0.03]">
            {kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url || poster} alt={savedPrompt} className="mx-auto block max-h-[460px] max-w-full" />
            ) : url ? (
              <video src={url} poster={poster} controls className="mx-auto block max-h-[460px] max-w-full" />
            ) : (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={poster} alt={savedPrompt} className="mx-auto block max-h-[460px] max-w-full opacity-90" />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white">
                    <Film className="h-5 w-5" />
                  </span>
                </div>
              </div>
            )}
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-0.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover/m:opacity-100" contentEditable={false}>
              <button type="button" onClick={generate} disabled={loading} title="重新生成" className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={() => props.deleteNode()} title="删除" className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 提示词输入 / 生成区 */}
        <div className="flex items-center gap-2 border-t border-slate-100 p-2" contentEditable={false}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            {kind === "image" ? <ImageIcon className="h-4 w-4" /> : <Film className="h-4 w-4" />}
          </span>
          <input
            ref={inputRef}
            value={prompt}
            disabled={loading}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!prompt.trim()) {
                  flagEmpty();
                  return;
                }
                void generate();
              }
            }}
            placeholder={kind === "image" ? "描述要生成的图片…" : "描述要生成的视频…"}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 disabled:opacity-50",
              shake && "animate-shake",
            )}
          />
          <button
            type="button"
            onClick={generate}
            disabled={loading || !prompt.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-blue-500/30 transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {hasResult ? "重生成" : "生成"}
          </button>
        </div>
        {error && <p className="border-t border-rose-100 bg-rose-50 px-3 py-1.5 text-xs text-rose-600" contentEditable={false}>{error}</p>}
      </div>
    </NodeViewWrapper>
  );
}
