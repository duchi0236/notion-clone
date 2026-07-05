"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Paperclip, Send, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModalA11y } from "@/hooks/useModalA11y";
import { confirm } from "@/components/ui/confirm";
import type { AttachmentValue, BitableContext, Field, FieldType, Row, RowComment, RowRevision, Table } from "./types";
import { cellValue, formatValue } from "./fieldMeta";
import { CellInput, CellValue, fieldIcon } from "./Cell";
import { bitableApi } from "./api";

// 只读展示的字段类型（值来自计算 / 行元数据，抽屉里不可编辑）
const READONLY_TYPES: FieldType[] = [
  "formula",
  "lookup",
  "autoNumber",
  "createdTime",
  "modifiedTime",
  "createdBy",
  "modifiedBy",
];

type TabKey = "fields" | "comments" | "history";

const TABS: { key: TabKey; label: string }[] = [
  { key: "fields", label: "字段" },
  { key: "comments", label: "评论" },
  { key: "history", label: "历史" },
];

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  return new Date(t).toLocaleDateString("zh-CN");
}

function Skeleton() {
  return (
    <div className="space-y-3 py-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse space-y-1.5">
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-3 w-full rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyHint({ children }: { children: string }) {
  return <p className="py-10 text-center text-sm text-slate-400">{children}</p>;
}

export function RecordDrawer({
  table,
  ctx,
  rowId,
  orderedRowIds,
  onClose,
  onUpdateCell,
  onDelete,
  onNavigate,
}: {
  table: Table;
  ctx: BitableContext;
  rowId: string;
  orderedRowIds: string[];
  onClose: () => void;
  onUpdateCell: (rowId: string, fieldId: string, value: unknown) => void;
  onDelete: (rowId: string) => Promise<void> | void;
  onNavigate: (rowId: string) => void;
}) {
  const row = table.rows.find((r) => r.id === rowId);
  const primary = useMemo(() => table.schema.find((f) => f.primary) ?? table.schema[0], [table.schema]);
  const drawerRef = useModalA11y<HTMLElement>({ open: true, onClose });

  // 进场动画：mount 后下一帧把 translate-x-full 换成 0
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const [tab, setTab] = useState<TabKey>("fields");
  const [comments, setComments] = useState<RowComment[] | null>(null);
  const [revisions, setRevisions] = useState<RowRevision[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);

  // 行被删（或不在当前表里）时直接关闭
  useEffect(() => {
    if (!row) onClose();
  }, [row, onClose]);

  // 切换记录时清空已加载的评论/历史，回到对应 tab 会按需重新加载
  useEffect(() => {
    setComments(null);
    setRevisions(null);
    setCommentText("");
  }, [rowId]);

  useEffect(() => {
    if (tab !== "comments" || comments !== null) return;
    let alive = true;
    void bitableApi.listComments(rowId).then((res) => {
      if (alive) setComments(res?.comments ?? []);
    });
    return () => {
      alive = false;
    };
  }, [tab, comments, rowId]);

  useEffect(() => {
    if (tab !== "history" || revisions !== null) return;
    let alive = true;
    void bitableApi.listRevisions(rowId).then((res) => {
      if (alive) setRevisions(res?.revisions ?? []);
    });
    return () => {
      alive = false;
    };
  }, [tab, revisions, rowId]);

  const idx = orderedRowIds.indexOf(rowId);
  const prevId = idx > 0 ? orderedRowIds[idx - 1] : null;
  const nextId = idx >= 0 && idx < orderedRowIds.length - 1 ? orderedRowIds[idx + 1] : null;

  if (!row) return null;
  const currentRow = row;

  const title = formatValue(primary, cellValue(primary, currentRow), ctx);

  async function handleDelete() {
    if (await confirm({ title: "删除这条记录？", body: "删除后无法恢复。", danger: true, confirmText: "删除" })) {
      await onDelete(rowId);
    }
  }

  async function sendComment() {
    const text = commentText.trim();
    if (!text || sending) return;
    setSending(true);
    const res = await bitableApi.addComment(rowId, text);
    setSending(false);
    if (res?.comment) {
      setComments((prev) => [...(prev ?? []), res.comment]);
      setCommentText("");
    }
  }

  async function removeComment(comment: RowComment) {
    if (!(await confirm({ title: "删除这条评论？", danger: true, confirmText: "删除" }))) return;
    await bitableApi.deleteComment(rowId, comment.id);
    setComments((prev) => (prev ? prev.filter((c) => c.id !== comment.id) : prev));
  }

  function renderFieldEditor(field: Field) {
    if (field.type === "attachment") {
      const files = Array.isArray(currentRow.data[field.id]) ? (currentRow.data[field.id] as AttachmentValue[]) : [];
      if (files.length === 0) return <span className="text-sm text-slate-300">无附件</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {files.map((f, i) => (
            <span key={`${f.url}_${i}`} className="inline-flex max-w-full items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
              <Paperclip className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{f.name}</span>
            </span>
          ))}
        </div>
      );
    }
    if (READONLY_TYPES.includes(field.type) || field.type === "link") {
      // link 在抽屉里只读展示（编辑请在表格里用关联选择器）
      return (
        <div className="text-sm text-slate-500">
          <CellValue field={field} value={cellValue(field, currentRow)} row={currentRow} schema={table.schema} ctx={ctx} />
        </div>
      );
    }
    return (
      <CellInput
        field={field}
        value={cellValue(field, currentRow)}
        onChange={(v) => onUpdateCell(currentRow.id, field.id, v)}
      />
    );
  }

  return (
    <div
      className={cn("fixed inset-0 z-50 bg-slate-950/20 transition-opacity duration-300", entered ? "opacity-100" : "opacity-0")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${table.name} 记录详情`}
        className={cn(
          "claw-solid absolute right-0 top-0 flex h-full w-[440px] max-w-[92vw] flex-col border-l border-slate-200 shadow-2xl transition-transform duration-300",
          entered ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* 头部：标题 + 上下条导航 + 删除 + 关闭 */}
        <div className="flex items-center gap-1 border-b border-slate-100 px-4 py-3">
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-900" title={title || "未命名记录"}>
            {title || <span className="text-slate-300">未命名记录</span>}
          </h2>
          <button
            type="button"
            onClick={() => prevId && onNavigate(prevId)}
            disabled={!prevId}
            aria-label="上一条记录"
            title="上一条"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-200 disabled:hover:bg-transparent"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <span className="shrink-0 tabular-nums text-xs text-slate-400">
            {idx >= 0 ? idx + 1 : "—"} / {orderedRowIds.length}
          </span>
          <button
            type="button"
            onClick={() => nextId && onNavigate(nextId)}
            disabled={!nextId}
            aria-label="下一条记录"
            title="下一条"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-200 disabled:hover:bg-transparent"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-4 w-px bg-slate-200" aria-hidden />
          <button
            type="button"
            onClick={handleDelete}
            aria-label="删除记录"
            title="删除记录"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            title="关闭"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div role="tablist" aria-label="记录详情分区" className="mx-4 mt-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
          {TABS.map(({ key, label }, i) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => setTab(key)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                event.preventDefault();
                const dir = event.key === "ArrowRight" ? 1 : -1;
                const next = (i + dir + TABS.length) % TABS.length;
                setTab(TABS[next].key);
                const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                buttons?.[next]?.focus();
              }}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-md px-2 text-xs text-slate-500 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
                tab === key && "bg-white text-slate-950 shadow-sm",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 字段 */}
        {tab === "fields" && (
          <div role="tabpanel" aria-label="字段" className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-1">
              {table.schema.map((field) => {
                const multiline = field.type === "longText";
                return (
                  <div key={field.id} className={cn("grid grid-cols-[112px_minmax(0,1fr)] gap-2", multiline ? "items-start" : "items-center")}>
                    <span className={cn("flex items-center gap-1.5 text-[13px] text-slate-400", multiline && "pt-2")}>
                      <span className="flex text-slate-400 [&_svg]:h-3.5 [&_svg]:w-3.5">{fieldIcon(field.type)}</span>
                      <span className="truncate" title={field.name}>{field.name}</span>
                    </span>
                    <div className="min-h-[34px] rounded-lg px-2.5 py-1.5 transition-colors hover:bg-slate-500/10">{renderFieldEditor(field)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 评论 */}
        {tab === "comments" && (
          <div role="tabpanel" aria-label="评论" className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {comments === null ? (
                <Skeleton />
              ) : comments.length === 0 ? (
                <EmptyHint>还没有评论</EmptyHint>
              ) : (
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="group rounded-lg bg-slate-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-600">
                          {c.author.slice(0, 1)}
                        </span>
                        <span className="truncate text-xs font-medium text-slate-700">{c.author}</span>
                        <span className="shrink-0 text-xs text-slate-400">{relativeTime(c.createdAt)}</span>
                        <button
                          type="button"
                          onClick={() => void removeComment(c)}
                          aria-label="删除评论"
                          title="删除评论"
                          className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words pl-7 text-sm text-slate-700">{c.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void sendComment();
                  }
                }}
                placeholder="写下评论…"
                aria-label="评论内容"
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none transition-colors focus:border-blue-400"
              />
              <button
                type="button"
                onClick={() => void sendComment()}
                disabled={!commentText.trim() || sending}
                aria-label="发送评论"
                title="发送"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* 历史 */}
        {tab === "history" && (
          <div role="tabpanel" aria-label="历史" className="flex-1 overflow-y-auto px-4 py-3">
            {revisions === null ? (
              <Skeleton />
            ) : revisions.length === 0 ? (
              <EmptyHint>暂无修改记录</EmptyHint>
            ) : (
              <ul className="space-y-3">
                {revisions.map((rev) => (
                  <li key={rev.id} className="rounded-lg border border-slate-100 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-slate-700">{rev.author || "系统"}</span>
                      <span className="text-slate-400">{relativeTime(rev.createdAt)}</span>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {Object.entries(rev.diff).map(([fieldId, change]) => {
                        const field = table.schema.find((f) => f.id === fieldId);
                        const fromText = field ? formatValue(field, change.from, ctx) : String(change.from ?? "");
                        const toText = field ? formatValue(field, change.to, ctx) : String(change.to ?? "");
                        return (
                          <li key={fieldId} className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                            <span className="text-slate-500">{field?.name ?? fieldId}：</span>
                            <span className={cn(fromText ? "text-slate-600 line-through decoration-slate-300" : "text-slate-300")}>
                              {fromText || "空"}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className={cn(toText ? "font-medium text-slate-800" : "text-slate-300")}>{toText || "空"}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
