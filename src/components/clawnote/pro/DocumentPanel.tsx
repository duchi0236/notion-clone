"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Clock3, Code2, Copy, List, Loader2, MessageSquare, PanelRightClose, Plus, Share2, Star, Trash2, X } from "lucide-react";
import { ClawTipTapEditor } from "@/components/editor/ClawTipTapEditor";
import { HtmlDocView } from "./HtmlDocView";
import { isFullHtmlDoc, starterFullHtml } from "@/lib/html-doc";
import { confirm } from "@/components/ui/confirm";
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
  onRetrySave,
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
  onRetrySave?: () => void;
  autoFocusTitle?: boolean;
  onTitleFocused?: () => void;
}) {
  const [inspector, setInspector] = useState<InspectorMode | null>(null);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [customIcon, setCustomIcon] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const iconPickerWrapRef = useRef<HTMLDivElement>(null);
  const shareTriggerRef = useRef<HTMLButtonElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  // 打开右侧 inspector / 分享弹层前记录触发元素，关闭后归还焦点
  const inspectorRestoreRef = useRef<HTMLElement | null>(null);

  // 新建文档后自动聚焦标题，避免攒出一堆「无标题」
  useEffect(() => {
    if (!autoFocusTitle) return;
    // titleRef 尚未挂载时不要提前消费 onTitleFocused（否则 autoFocus 标记会被清掉而错过聚焦）
    if (!titleRef.current) return;
    // 用 rAF 包裹，等布局稳定后再聚焦，避免新建瞬间时序错过
    const raf = requestAnimationFrame(() => {
      titleRef.current?.focus();
      titleRef.current?.select();
      onTitleFocused?.();
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.clientKey ?? doc?.id, autoFocusTitle]);

  // Esc 关闭右侧面板 / 图标选择器（与编辑器自身的快捷键不冲突）。
  // 作为多层弹层 Esc 的唯一协调者：命中一层即 preventDefault/stopPropagation 并 return，
  // 避免一次 Esc 连关多层。捕获阶段绑定，先于子组件内部处理。
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (iconPickerOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIconPickerOpen(false);
        return;
      }
      if (shareOpen) {
        e.preventDefault();
        e.stopPropagation();
        setShareOpen(false);
        return;
      }
      if (inspector) {
        e.preventDefault();
        e.stopPropagation();
        setInspector(null);
        return;
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [iconPickerOpen, shareOpen, inspector]);

  // 图标选择器：点外部关闭（Esc 交由上面的协调者统一处理，避免重复绑定 Esc 连关多层）。
  useEffect(() => {
    if (!iconPickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (iconPickerWrapRef.current?.contains(e.target as Node)) return;
      setIconPickerOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [iconPickerOpen]);

  // 右侧 inspector 抽屉的焦点管理（非阻断侧栏，不锁滚、不强制 Tab 陷阱，Esc 交由协调者处理）：
  // 打开时记录触发元素并把焦点送入抽屉首个可聚焦元素，关闭后把焦点归还触发元素。
  useEffect(() => {
    if (inspector === null) return;
    inspectorRestoreRef.current = (document.activeElement as HTMLElement) ?? null;
    const raf = requestAnimationFrame(() => {
      const root = inspectorRef.current;
      const first = root?.querySelector<HTMLElement>(
        'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])',
      );
      (first ?? root)?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      inspectorRestoreRef.current?.focus?.();
    };
  }, [inspector]);

  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center bg-transparent px-6 text-center">
        <div className="max-w-sm rounded-[28px] border border-white/70 bg-white/70 p-8 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Plus className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-950">还没有打开文档</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">从左侧选择一篇文档，或新建一页开始写作。</p>
        </div>
      </div>
    );
  }

  const currentDoc = doc;
  const breadcrumbs = buildBreadcrumbs(docs ?? [], currentDoc);

  return (
    <div className="cn-document-panel flex h-full min-w-0 bg-transparent">
      <article className="cn-document-article min-w-0 flex-1 overflow-y-auto scroll-smooth">
        <header className="cn-document-toolbar sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-200/60 bg-white/82 px-5 backdrop-blur-xl">
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
              <IconButton ref={shareTriggerRef} title="分享" active={doc.isPublished || shareOpen} onClick={() => setShareOpen((v) => !v)}><Share2 className="h-4 w-4" /></IconButton>
              {shareOpen && (
                <SharePopover
                  documentId={currentDoc.id}
                  triggerRef={shareTriggerRef}
                  onClose={() => {
                    setShareOpen(false);
                    // 关闭后把焦点还给触发按钮
                    shareTriggerRef.current?.focus();
                  }}
                  onPublishedChange={(published) => updateDoc({ isPublished: published })}
                />
              )}
            </div>
            <IconButton title="新建子页面" onClick={createChild}><Plus className="h-4 w-4" /></IconButton>
            <IconButton title="大纲" active={inspector === "outline"} onClick={() => setInspector((value) => value === "outline" ? null : "outline")}><List className="h-4 w-4" /></IconButton>
            <IconButton title="版本历史" active={inspector === "versions"} onClick={() => setInspector((value) => value === "versions" ? null : "versions")}><Clock3 className="h-4 w-4" /></IconButton>
            <IconButton title="评论" active={inspector === "comments"} onClick={() => setInspector((value) => value === "comments" ? null : "comments")}><MessageSquare className="h-4 w-4" /></IconButton>
            <IconButton title="复制页面" onClick={duplicateDoc}><Copy className="h-4 w-4" /></IconButton>
            <IconButton
              title={isFullHtmlDoc(doc.html) ? "切回富文本编辑" : "切换为整页 HTML 渲染"}
              active={isFullHtmlDoc(doc.html)}
              onClick={async () => {
                if (isFullHtmlDoc(doc.html)) {
                  if (
                    await confirm({
                      title: "切回富文本编辑？",
                      body: "整页 HTML 将作为普通内容显示，建议先复制源码备份。",
                      confirmText: "切回富文本",
                    })
                  ) {
                    updateDoc({ html: "<p></p>", text: "", summary: "" });
                  }
                } else {
                  const seed = starterFullHtml(doc.title || "新 HTML 页面");
                  updateDoc({ html: seed, text: "（HTML 页面）", summary: "HTML 渲染文档" });
                }
              }}
            ><Code2 className="h-4 w-4" /></IconButton>
            <span className="mx-0.5 h-5 w-px bg-slate-200" />
            <IconButton title="删除文档" tone="danger" onClick={deleteDoc}><Trash2 className="h-4 w-4" /></IconButton>
          </div>
        </header>

        <div className="cn-document-page mx-auto max-w-[820px] px-6 pb-28 pt-8 sm:px-10 lg:pt-10">
          {doc.coverImage && <div className="mb-7 h-36 rounded-[24px] bg-cover bg-center shadow-inner" style={{ backgroundImage: `url(${doc.coverImage})` }} />}
          <div className="mb-7">
            <div className="cn-document-heading flex items-start gap-3">
              <div ref={iconPickerWrapRef} className="cn-document-icon relative mt-1">
                <button
                  className="inline-flex rounded-xl outline-none transition hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300"
                  title="更改页面图标"
                  onClick={() => setIconPickerOpen((value) => !value)}
                >
                  <PageIcon icon={doc.icon} size="lg" />
                </button>
                {iconPickerOpen && (
                  <div className="absolute left-0 top-11 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
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
                  onKeyDown={(event) => {
                    // Enter（非 IME 拼写中）把焦点移入正文首段，自然衔接写作
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      const editor = document.querySelector<HTMLElement>(".ProseMirror");
                      editor?.focus();
                    }
                  }}
                  placeholder="无标题"
                  className="cn-document-title block w-full bg-transparent text-[38px] font-semibold leading-[1.1] tracking-normal text-slate-950 outline-none placeholder:text-slate-300 sm:text-[44px]"
                />
                <div className="cn-document-meta mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                  <span>创建 {formatDate(doc.createdAt)}</span>
                  <span>·</span>
                  <span>更新 {formatDate(doc.updatedAt)}</span>
                  {saveState === "saving" && <span className="flex items-center gap-1 text-slate-400"><Loader2 className="h-3 w-3 animate-spin" />保存中</span>}
                  {saveState === "saved" && <span className="flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" />已保存</span>}
                  {saveState === "error" && (
                    <span className="flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                      保存失败
                      {onRetrySave && (
                        <button type="button" onClick={onRetrySave} className="font-medium underline underline-offset-2 hover:text-rose-900">
                          重试
                        </button>
                      )}
                    </span>
                  )}
                  {doc.isPublished && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">已发布</span>}
                </div>
              </div>
            </div>
          </div>
          {doc.tags.length > 0 && (
            <div className="cn-document-tags-row mb-6 flex flex-wrap gap-2 pl-12">
              {doc.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">#{tag}</span>
              ))}
            </div>
          )}

          {isFullHtmlDoc(doc.html) ? (
            <HtmlDocView
              key={doc.clientKey ?? doc.id}
              html={doc.html}
              onChange={(html) => updateDoc({ html, text: "（HTML 页面）", summary: "HTML 渲染文档" })}
            />
          ) : (
            <ClawTipTapEditor
              key={doc.clientKey ?? doc.id}
              docId={doc.id}
              content={doc.html}
              onChange={(html) => {
                const text = htmlToText(html);
                updateDoc({ html, text, summary: summarize(text) });
              }}
            />
          )}
        </div>
      </article>

      {!inspector && <DocumentOutline key={doc.clientKey ?? doc.id} docId={doc.id} />}

      {inspector && (
        <aside
          ref={inspectorRef}
          role="region"
          aria-label={inspector === "outline" ? "大纲" : inspector === "versions" ? "版本历史" : "评论"}
          tabIndex={-1}
          className="w-[360px] shrink-0 overflow-y-auto border-l border-slate-200/70 bg-white/72 backdrop-blur-xl outline-none"
        >
          <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-slate-200/70 bg-white/78 px-4 backdrop-blur-xl">
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

const IconButton = forwardRef<
  HTMLButtonElement,
  {
    children: React.ReactNode;
    title: string;
    onClick?: () => void;
    active?: boolean;
    tone?: "default" | "danger";
  }
>(function IconButton({ children, title, onClick, active, tone = "default" }, ref) {
  return (
    <button
      ref={ref}
      title={title}
      aria-label={title}
      onClick={onClick}
      className={
        tone === "danger"
          ? "inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 active:scale-95 active:bg-red-100"
          : `inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 active:scale-95 active:bg-slate-200 ${active ? "bg-slate-100 text-slate-950" : ""}`
      }
    >
      {children}
    </button>
  );
});
