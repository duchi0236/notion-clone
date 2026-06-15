"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// draw.io 嵌入编辑器（官方 embed 协议，postMessage 通信）。画布能力与
// drawio.com 完全一致：流程图、架构图、脑图、UML、网络拓扑等。
// 可用 NEXT_PUBLIC_DRAWIO_URL 指向自托管实例（内网/离线场景）。
const DRAWIO_BASE = process.env.NEXT_PUBLIC_DRAWIO_URL || "https://embed.diagrams.net/";
const DRAWIO_ORIGIN = new URL(DRAWIO_BASE).origin;
const DRAWIO_SRC = `${DRAWIO_BASE.replace(/\/$/, "")}/?embed=1&proto=json&spin=1&ui=min&lang=zh&libraries=1`;

// 「脑图」入口的预置模板：中心主题 + 四个分支，进编辑器即可改字加枝。
export const MINDMAP_TEMPLATE = `<mxGraphModel dx="900" dy="600" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1100" pageHeight="850"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="c" value="中心主题" style="ellipse;whiteSpace=wrap;html=1;fillColor=#0f172a;fontColor=#ffffff;strokeColor=none;fontSize=16;" vertex="1" parent="1"><mxGeometry x="470" y="380" width="160" height="80" as="geometry"/></mxCell><mxCell id="b1" value="分支一" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dbeafe;strokeColor=#60a5fa;" vertex="1" parent="1"><mxGeometry x="730" y="290" width="120" height="46" as="geometry"/></mxCell><mxCell id="b2" value="分支二" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dcfce7;strokeColor=#4ade80;" vertex="1" parent="1"><mxGeometry x="730" y="500" width="120" height="46" as="geometry"/></mxCell><mxCell id="b3" value="分支三" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fef9c3;strokeColor=#facc15;" vertex="1" parent="1"><mxGeometry x="250" y="290" width="120" height="46" as="geometry"/></mxCell><mxCell id="b4" value="分支四" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fce7f3;strokeColor=#f472b6;" vertex="1" parent="1"><mxGeometry x="250" y="500" width="120" height="46" as="geometry"/></mxCell><mxCell id="e1" style="edgeStyle=entityRelationEdgeStyle;rounded=1;strokeColor=#94a3b8;" edge="1" parent="1" source="c" target="b1"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e2" style="edgeStyle=entityRelationEdgeStyle;rounded=1;strokeColor=#94a3b8;" edge="1" parent="1" source="c" target="b2"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e3" style="edgeStyle=entityRelationEdgeStyle;rounded=1;strokeColor=#94a3b8;" edge="1" parent="1" source="c" target="b3"><mxGeometry relative="1" as="geometry"/></mxCell><mxCell id="e4" style="edgeStyle=entityRelationEdgeStyle;rounded=1;strokeColor=#94a3b8;" edge="1" parent="1" source="c" target="b4"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel>`;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    drawio: {
      setDrawio: (attrs?: { xml?: string }) => ReturnType;
    };
  }
}

// 文档块：attrs 存图源 XML + SVG 预览（data URI）。renderHTML 里带上 <img>，
// 公开分享页直接渲染 contentHtml 也能看到图。
export const DrawioBlock = Node.create({
  name: "drawio",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      xml: {
        default: "",
        parseHTML: (el) => decodeURIComponent(el.getAttribute("data-xml") || ""),
        renderHTML: (attrs) => ({ "data-xml": encodeURIComponent(attrs.xml || "") }),
      },
      preview: {
        default: "",
        parseHTML: (el) => el.querySelector("img")?.getAttribute("src") || "",
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-drawio]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-drawio": "" }),
      ["img", { src: node.attrs.preview || "", style: "max-width:100%", alt: "diagram" }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawioView);
  },

  addCommands() {
    return {
      setDrawio:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { xml: attrs?.xml ?? "", preview: "" } }),
    };
  },
});

function DrawioView(props: NodeViewProps) {
  const { xml, preview } = props.node.attrs as { xml: string; preview: string };
  const [open, setOpen] = useState(false);
  const [regenFailed, setRegenFailed] = useState(false);

  // 始终通过 ref 取最新 props，让传给弹窗的回调保持稳定引用——
  // 否则 updateAttributes 触发重渲染会重建回调 → 弹窗 effect 重注册 → 误清兜底定时器
  const propsRef = useRef(props);
  propsRef.current = props;

  // 仅"全新空块"自动进入编辑器；有 XML 没预览的块走下面的静默自愈
  useEffect(() => {
    if (!preview && !xml) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback((nextXml: string, nextPreview: string) => {
    propsRef.current.updateAttributes({ xml: nextXml, preview: nextPreview });
    setOpen(false);
  }, []);

  // save 事件一到就先把 XML 落进节点：即使后续预览导出失败/中断，图也不丢
  const handleXmlSaved = useCallback((nextXml: string) => {
    propsRef.current.updateAttributes({ xml: nextXml });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    const attrs = propsRef.current.node.attrs as { xml: string; preview: string };
    if (!attrs.preview && !attrs.xml) propsRef.current.deleteNode(); // 全新空块取消 → 移除占位
  }, []);

  const handleRegenerated = useCallback((nextPreview: string) => {
    setRegenFailed(false);
    propsRef.current.updateAttributes({ preview: nextPreview });
  }, []);

  const handleRegenGiveUp = useCallback(() => setRegenFailed(true), []);

  return (
    <NodeViewWrapper className="my-3">
      {preview ? (
        <div className={cn("group/draw relative inline-block max-w-full rounded-lg", props.selected && "ring-2 ring-blue-400")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="diagram" className="max-w-full rounded-lg" draggable={false} onDoubleClick={() => setOpen(true)} />
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/95 p-0.5 opacity-0 shadow-md backdrop-blur transition-opacity group-hover/draw:opacity-100" contentEditable={false}>
            <button type="button" onClick={() => setOpen(true)} title="编辑绘图" className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900">
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
          {xml && regenFailed ? (
            <>
              <Pencil className="h-4 w-4" /> 预览生成失败 · 点击打开画布，在画布里点「保存」即可
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setRegenFailed(false); // 重新开始自动重试
                }}
                className="ml-1 rounded-md border border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                自动重试
              </span>
            </>
          ) : xml ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> 绘图已保存，正在生成预览…（点击可打开画布）
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4" /> 点击开始绘图（draw.io）
            </>
          )}
        </button>
      )}
      {/* 自愈：有图没预览且画布未打开时，用隐藏 iframe 静默补一张预览 */}
      {!open && !preview && xml && !regenFailed && (
        <PreviewRegenerator xml={xml} onDone={handleRegenerated} onGiveUp={handleRegenGiveUp} />
      )}
      {open && <DrawioEditorModal initialXml={xml} onSave={handleSave} onXmlSaved={handleXmlSaved} onClose={handleClose} />}
    </NodeViewWrapper>
  );
}

// 隐藏的 draw.io 实例：load(xml) → export(xmlsvg) → 把预览写回节点。
// 任何一次保存若预览导出失败，下次该块出现在屏幕上时都会自动补好。
// 每轮 20 秒超时后销毁 iframe 重建重试（最多 MAX_REGEN_ROUNDS 轮），
// 用完所有轮次回调 onGiveUp（外层显示手动重试按钮）。
const MAX_REGEN_ROUNDS = 4;

function PreviewRegenerator({ xml, onDone, onGiveUp }: { xml: string; onDone: (preview: string) => void; onGiveUp?: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [round, setRound] = useState(0);
  const doneRef = useRef(false);

  // 单轮超时 → 换 key 重建 iframe 重试
  useEffect(() => {
    if (round >= MAX_REGEN_ROUNDS) {
      onGiveUp?.();
      return;
    }
    const t = setTimeout(() => {
      if (!doneRef.current) setRound((r) => r + 1);
    }, 20000);
    return () => clearTimeout(t);
  }, [round, onGiveUp]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== DRAWIO_ORIGIN || typeof e.data !== "string" || !e.data.startsWith("{")) return;
      if (e.source && frameRef.current?.contentWindow && e.source !== frameRef.current.contentWindow) return; // 只处理自己 iframe 的消息
      let msg: { event?: string; data?: string };
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      const post = (m: object) => frameRef.current?.contentWindow?.postMessage(JSON.stringify(m), DRAWIO_ORIGIN);
      if (msg.event === "init") post({ action: "load", xml, autosave: 0 });
      else if (msg.event === "load") post({ action: "export", format: "xmlsvg" });
      else if (msg.event === "export" && msg.data) {
        doneRef.current = true;
        onDone(msg.data);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [xml, onDone]);

  if (round >= MAX_REGEN_ROUNDS) return null;

  return (
    <iframe
      key={round}
      ref={frameRef}
      src={DRAWIO_SRC}
      title="drawio-preview-regen"
      aria-hidden
      tabIndex={-1}
      style={{ position: "fixed", left: -9999, top: 0, width: 320, height: 240, opacity: 0, pointerEvents: "none", border: 0 }}
    />
  );
}

// 全屏 draw.io 编辑器。协议：init → load(xml)；用户点保存 → save 事件 →
// 请求 xmlsvg 导出 → export 事件（SVG 内嵌 XML）→ 写回节点并关闭。
function DrawioEditorModal({
  initialXml,
  onSave,
  onXmlSaved,
  onClose,
}: {
  initialXml: string;
  onSave: (xml: string, preview: string) => void;
  onXmlSaved: (xml: string) => void;
  onClose: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const xmlRef = useRef(initialXml);
  const exportTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== DRAWIO_ORIGIN || typeof e.data !== "string" || !e.data.startsWith("{")) return;
      if (e.source && frameRef.current?.contentWindow && e.source !== frameRef.current.contentWindow) return; // 忽略其他 drawio 实例（如后台预览再生器）
      let msg: { event?: string; xml?: string; data?: string };
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      const post = (m: object) => frameRef.current?.contentWindow?.postMessage(JSON.stringify(m), DRAWIO_ORIGIN);
      if (msg.event === "init") {
        setReady(true);
        post({ action: "load", xml: xmlRef.current || "", autosave: 0 });
      } else if (msg.event === "save") {
        xmlRef.current = msg.xml || xmlRef.current;
        onXmlSaved(xmlRef.current); // 先落 XML，预览失败也不丢图
        setExporting(true);
        post({ action: "export", format: "xmlsvg" });
        // 预览导出兜底：12 秒没回包就收尾（XML 已保存，预览由后台再生器自动补）
        if (exportTimer.current) clearTimeout(exportTimer.current);
        exportTimer.current = setTimeout(() => onSave(xmlRef.current, ""), 12000);
      } else if (msg.event === "export" && msg.data) {
        if (exportTimer.current) clearTimeout(exportTimer.current);
        onSave(xmlRef.current, msg.data);
      } else if (msg.event === "exit") {
        onClose();
      }
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (exportTimer.current) clearTimeout(exportTimer.current);
    };
  }, [onSave, onXmlSaved, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/60 p-3 sm:p-6" contentEditable={false}>
      <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <span className="text-sm font-semibold text-slate-800">绘图 · draw.io</span>
          <div className="flex items-center gap-3">
            {!ready && <span className="text-xs text-slate-400">正在加载画布…（需可访问 {DRAWIO_ORIGIN}）</span>}
            {exporting && (
              <span className="flex items-center gap-1.5 text-xs text-blue-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> 已保存，正在生成预览…
              </span>
            )}
            <span className="hidden text-xs text-slate-400 sm:inline">画布里点「保存」写回文档，「×」放弃</span>
            <button onClick={onClose} title="关闭" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <iframe ref={frameRef} src={DRAWIO_SRC} title="draw.io" className="h-full w-full flex-1 border-0" />
      </div>
    </div>,
    document.body,
  );
}
