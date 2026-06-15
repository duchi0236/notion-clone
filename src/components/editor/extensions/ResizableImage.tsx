"use client";

import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Image with drag-to-resize width, left/center/right alignment, and a caption.
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute("width"),
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs) => ({ "data-align": attrs.align }),
      },
      caption: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-caption") || "",
        renderHTML: (attrs) => (attrs.caption ? { "data-caption": attrs.caption } : {}),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

const JUSTIFY: Record<string, string> = { left: "justify-start", center: "justify-center", right: "justify-end" };

function ImageView(props: NodeViewProps) {
  const { node, updateAttributes, selected } = props;
  const { src, alt, width, align, caption } = node.attrs as {
    src: string;
    alt?: string;
    width?: string | number | null;
    align: string;
    caption: string;
  };
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const show = hover || selected;

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const container = wrapRef.current;
    const img = container?.querySelector("img");
    if (!img || !container) return;
    const startX = e.clientX;
    const startW = img.getBoundingClientRect().width;
    const maxW = container.getBoundingClientRect().width;
    function move(ev: MouseEvent) {
      const w = Math.max(80, Math.min(maxW, startW + (ev.clientX - startX)));
      updateAttributes({ width: Math.round(w) });
    }
    function up() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <NodeViewWrapper className="my-3">
      <div ref={wrapRef} className={cn("flex", JUSTIFY[align] ?? "justify-center")}>
        <div
          className="group/img relative inline-block"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{ width: width ? `${typeof width === "number" ? `${width}px` : width}` : "auto", maxWidth: "100%" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt || ""}
            draggable={false}
            className={cn("block h-auto w-full rounded-lg", selected && "ring-2 ring-blue-400")}
          />

          {/* Hover/selected toolbar: alignment */}
          {show && (
            <div className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-slate-200 bg-white/95 p-0.5 shadow-md backdrop-blur" contentEditable={false}>
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => updateAttributes({ align: a })}
                  className={cn("rounded p-1 text-slate-500 hover:bg-slate-100", align === a && "bg-slate-100 text-slate-900")}
                  title={a === "left" ? "左对齐" : a === "center" ? "居中" : "右对齐"}
                >
                  {a === "left" ? <AlignLeft className="h-3.5 w-3.5" /> : a === "center" ? <AlignCenter className="h-3.5 w-3.5" /> : <AlignRight className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}

          {/* Resize handle */}
          {show && (
            <span
              onMouseDown={startResize}
              contentEditable={false}
              className="absolute right-1 top-1/2 h-10 w-1.5 -translate-y-1/2 cursor-ew-resize rounded-full bg-slate-700/70 ring-2 ring-white"
              title="拖动调整大小"
            />
          )}
        </div>
      </div>

      {/* Caption */}
      <div className={cn("mt-1.5 flex", JUSTIFY[align] ?? "justify-center")} contentEditable={false}>
        <input
          value={caption}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          placeholder={show ? "添加图注…" : ""}
          className="max-w-full bg-transparent text-center text-xs text-slate-500 outline-none placeholder:text-slate-300"
          style={{ width: caption || show ? "100%" : "auto" }}
        />
      </div>
    </NodeViewWrapper>
  );
}
