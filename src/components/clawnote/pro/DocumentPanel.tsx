"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Clock3, Copy, List, Loader2, MessageSquare, PanelRightClose, Plus, Share2, Star, Trash2, X } from "lucide-react";
import { ClawTipTapEditor } from "@/components/editor/ClawTipTapEditor";
import { formatDate } from "@/lib/utils";
import type { Doc } from "./types";
import { docDisplayTitle, htmlToText, summarize } from "./api";
import { DocumentMetaPanel } from "./DocumentMetaPanel";
import { DocumentOutline, OutlinePanel } from "./DocumentOutline";
import { SharePopover } from "./SharePopover";
import { PageIcon } from "./PageIcon";

type InspectorMode = "outline" | "versions" | "comments";

const PAGE_ICON_OPTIONS = [
  { value: "📄", label: "文档" },
  { value: "📝", label: "笔记" },
  { value: "📘", label: "书本" },
  { value: "🧠", label: "知识" },
  { value: "✏️", label: "记录" },
  { value: "📗", label: "项目" },
];

export function DocumentPanel({
  doc,
  docs,
  updateDoc,
  deleteDoc,
  createChild,
  duplicateDoc,
  toggleFavorite,
  onRestored,
  saveState = "idle",
  autoFocusTitle = false,
  onTitleFocused,
}: {
  doc?: Doc;
  docs?: Doc[];
  updateDoc: (patch: Partial<Doc>) => void;
  deleteDoc: () => void;
  createChild: () => void;
  duplicateDoc: () => void;
  toggleFavorite: () => void;
  onRestored: () => void;
  saveState?: "idle" | "saving" | "saved" | "error";
  autoFocusTitle?: boolean;
  onTitleFocused?: () => void;
}) {
  const [inspector, setInspector] = useState<InspectorMode | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [customIcon, setCustomIcon] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // 新建文档后自动聚焦标题，避免攒出一堆「无标题」
  useEffect(() => {
    if (autoFocusTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
      onTitleFocused?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.clientKey ?? doc?.id, autoFocusTitle]);

  // Esc 关闭右侧面板 / 图标选择器（与编辑器自身的快捷键不冲突）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (iconPickerOpen) setIconPickerOpen(false);
      else if (shareOpen) setShareOpen(false);
      else if (inspector) setInspector(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [iconPickerOpen, shareOpen, inspector]);

  if (!doc) return <div className="p-8 text-slate-500">暂无文档，点击新建开始。</div>;

  const currentDoc = doc;
  const breadcrumbs = buildBreadcrumbs(docs ?? [], currentDoc);

  return (
    <div className="flex h-screen min-w-0 bg-white">
      <article className="min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 flex h-11 items-center justify-between border-b border-slate-100 bg-white/92 px-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-1 text-sm text-slate-500">
            {breadcrumbs.map((item, index) => (
              <span key={item.id} className="flex min-w-0 items-center gap-1">
                {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
                <span className={index === breadcrumbs.length - 1 ? "truncate text-slate-900" : "truncate"}>{docDisplayTitle(item)}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <IconButton title={doc.isFavorite ? "取消收藏" : "收藏"} active={doc.isFavorite} onClick={toggleFavorite}><Star className={`h-4 w-4 ${doc.isFavorite ? "fill-current" : ""}`} /></IconButton>
            <div className="relative">
              <IconButton title="分享" active={doc.isPublished || shareOpen} onClick={() => setShareOpen((v) => !v)}><Share2 className="h-4 w-4" /></IconButton>
              {shareOpen && (
                <SharePopover
                  documentId={currentDoc.id}
                  onClose={() => setShareOpen(false)}
                  onPublishedChange={(published) => updateDoc({ isPublished: published })}
                />
              )}
            </div>
            <IconButton title="新建子页面" onClick={createChild}><Plus className="h-4 w-4" /></IconButton>
            <IconButton title="大纲" active={inspector === "outline"} onClick={() => setInspector((value) => value === "outline" ? null : "outline")}><List className="h-4 w-4" /></IconButton>
            <IconButton title="版本历史" active={inspector === "versions"} onClick={() => setInspector((value) => value === "versions" ? null : "versions")}><Clock3 className="h-4 w-4" /></IconButton>
            <IconButton title="评论" active={inspector === "comments"} onClick={() => setInspector((value) => value === "comments" ? null : "comments")}><MessageSquare className="h-4 w-4" /></IconButton>
            <IconButton title="复制页面" onClick={duplicateDoc}><Copy className="h-4 w-4" /></IconButton>
            <span className="mx-0.5 h-5 w-px bg-slate-200" />
            <IconButton title="删除文档" tone="danger" onClick={deleteDoc}><Trash2 className="h-4 w-4" /></IconButton>
          </div>
        </header>

        <div className="mx-auto max-w-[760px] px-6 pb-24 pt-5 sm:px-8">
          {doc.coverImage && <div className="mb-5 h-32 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${doc.coverImage})` }} />}
          <div className="mb-5">
            <div className="flex items-start gap-2.5">
              <div className="relative mt-1.5">
                <button
                  className="inline-flex rounded-lg outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300"
                  title="更改页面图标"
                  onClick={() => setIconPickerOpen((value) => !value)}
                >
                  <PageIcon icon={doc.icon} size="md" />
                </button>
                {iconPickerOpen && (
                  <div className="absolute left-0 top-9 z-40 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-xs font-medium text-slate-500">页面图标</span>
                      <button
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="关闭"
                        onClick={() => setIconPickerOpen(false)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {PAGE_ICON_OPTIONS.map((item) => (
                        <button
                          key={item.value}
                          className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
                          onClick={() => {
                            updateDoc({ icon: item.value });
                            setIconPickerOpen(false);
                          }}
                        >
                          <PageIcon icon={item.value} muted={doc.icon !== item.value} />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 border-t border-slate-100 pt-2">
                      <label className="mb-1 block px-1 text-[11px] text-slate-400">自定义符号</label>
                      <div className="flex items-center gap-2">
                        <input
                          value={customIcon}
                          onChange={(event) => setCustomIcon(event.target.value.slice(0, 2))}
                          placeholder="如 A"
                          className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-slate-300"
                        />
                        <button
                          className="h-8 rounded-lg bg-slate-950 px-3 text-xs text-white disabled:cursor-not-allowed disabled:bg-slate-200"
                          disabled={!customIcon.trim()}
                          onClick={() => {
                            updateDoc({ icon: customIcon.trim() });
                            setIconPickerOpen(false);
                            setCustomIcon("");
                          }}
                        >
                          应用
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <input
                  ref={titleRef}
                  value={doc.title}
                  onChange={(event) => updateDoc({ title: event.target.value })}
                  placeholder="无标题"
                  className="block w-full bg-transparent text-[34px] font-bold leading-[1.16] tracking-normal text-slate-950 outline-none"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span>创建 {formatDate(doc.createdAt)}</span>
                  <span>·</span>
                  <span>更新 {formatDate(doc.updatedAt)}</span>
                  {saveState === "saving" && <span className="flex items-center gap-1 text-slate-400"><Loader2 className="h-3 w-3 animate-spin" />保存中</span>}
                  {saveState === "saved" && <span className="flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" />已保存</span>}
                  {saveState === "error" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">保存失败，正在重试…</span>}
                  {doc.isPublished && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">已发布</span>}
                </div>
              </div>
            </div>
          </div>
          {doc.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 pl-12">
              {doc.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">#{tag}</span>
              ))}
            </div>
          )}

          <ClawTipTapEditor
            key={doc.clientKey ?? doc.id}
            docId={doc.id}
            content={doc.html}
            onChange={(html) => {
              const text = htmlToText(html);
              updateDoc({ html, text, summary: summarize(text) });
            }}
          />
        </div>
      </article>

      {!inspector && <DocumentOutline key={doc.clientKey ?? doc.id} docId={doc.id} />}

      {inspector && (
        <aside className="w-[360px] shrink-0 overflow-y-auto border-l border-slate-200 bg-[#fbfbfa]">
          <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-slate-200 bg-[#fbfbfa]/95 px-4 backdrop-blur">
            <h2 className="text-sm font-semibold">{inspector === "outline" ? "大纲" : inspector === "versions" ? "版本历史" : "评论"}</h2>
            <button onClick={() => setInspector(null)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-950">
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>
          {inspector === "outline" ? (
            <OutlinePanel key={doc.clientKey ?? doc.id} docId={doc.id} />
          ) : (
            <DocumentMetaPanel documentId={doc.id} mode={inspector} onRestored={onRestored} />
          )}
        </aside>
      )}
    </div>
  );
}

function buildBreadcrumbs(docs: Doc[], doc: Doc) {
  const byId = new Map(docs.map((item) => [item.id, item]));
  const items: Doc[] = [doc];
  let current = doc;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    items.unshift(parent);
    current = parent;
  }
  return items;
}

function IconButton({
  children,
  title,
  onClick,
  active,
  tone = "default",
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
  active?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={
        tone === "danger"
          ? "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500"
          : `inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950 ${active ? "bg-slate-100 text-slate-950" : ""}`
      }
    >
      {children}
    </button>
  );
}
