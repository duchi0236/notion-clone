"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignLeft,
  AtSign,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  Clock,
  Hash,
  Link2,
  List,
  Loader2,
  Paperclip,
  Phone,
  Search,
  Sigma,
  ListOrdered,
  Star,
  Tag,
  Type,
  User,
  UserCheck,
  UserPlus,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttachmentValue, BitableContext, Field, FieldType, Row } from "./types";
import { findOption, formatValue, lookupValue, optionColor } from "./fieldMeta";
import { evalFormula, formatFormulaValue } from "./formula";
import { DatePicker } from "./DatePicker";
import { useDismiss } from "@/hooks/useDismiss";

export const FIELD_TYPE_LIST: { type: FieldType; label: string; icon: ReactNode }[] = [
  { type: "text", label: "文本", icon: <Type className="h-4 w-4" /> },
  { type: "longText", label: "多行文本", icon: <AlignLeft className="h-4 w-4" /> },
  { type: "number", label: "数字", icon: <Hash className="h-4 w-4" /> },
  { type: "select", label: "单选", icon: <Tag className="h-4 w-4" /> },
  { type: "multiSelect", label: "多选", icon: <List className="h-4 w-4" /> },
  { type: "date", label: "日期", icon: <CalendarDays className="h-4 w-4" /> },
  { type: "checkbox", label: "复选框", icon: <CheckSquare className="h-4 w-4" /> },
  { type: "rating", label: "评分", icon: <Star className="h-4 w-4" /> },
  { type: "progress", label: "进度", icon: <Hash className="h-4 w-4" /> },
  { type: "person", label: "人员", icon: <User className="h-4 w-4" /> },
  { type: "url", label: "链接", icon: <Link2 className="h-4 w-4" /> },
  { type: "email", label: "邮箱", icon: <AtSign className="h-4 w-4" /> },
  { type: "phone", label: "电话", icon: <Phone className="h-4 w-4" /> },
  { type: "currency", label: "货币", icon: <CircleDollarSign className="h-4 w-4" /> },
  { type: "link", label: "关联", icon: <Search className="h-4 w-4" /> },
  { type: "lookup", label: "查找引用", icon: <Search className="h-4 w-4" /> },
  { type: "formula", label: "公式", icon: <Sigma className="h-4 w-4" /> },
  { type: "attachment", label: "附件", icon: <Paperclip className="h-4 w-4" /> },
  { type: "autoNumber", label: "自动编号", icon: <ListOrdered className="h-4 w-4" /> },
  { type: "createdTime", label: "创建时间", icon: <Clock className="h-4 w-4" /> },
  { type: "modifiedTime", label: "修改时间", icon: <Clock className="h-4 w-4" /> },
  { type: "createdBy", label: "创建人", icon: <UserPlus className="h-4 w-4" /> },
  { type: "modifiedBy", label: "修改人", icon: <UserCheck className="h-4 w-4" /> },
];

export function fieldIcon(type: FieldType): ReactNode {
  return FIELD_TYPE_LIST.find((f) => f.type === type)?.icon ?? <Type className="h-4 w-4" />;
}

function Chip({ field, id }: { field: Field; id: unknown }) {
  const opt = findOption(field, id);
  if (!opt) return null;
  const c = optionColor(opt.color);
  return <span className={cn("inline-block rounded px-1.5 py-0.5 text-xs", c.chip)}>{opt.name}</span>;
}

function asAttachments(value: unknown): AttachmentValue[] {
  return Array.isArray(value) ? (value as AttachmentValue[]) : [];
}

// 附件小 chip：图片 mime 显示 16px 缩略图（点击 window.open 预览），其余 Paperclip + 文件名截断
function AttachmentChip({ file, onRemove }: { file: AttachmentValue; onRemove?: () => void }) {
  const isImage = file.mime.startsWith("image/");
  return (
    <span className="inline-flex max-w-[150px] items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.url}
          alt={file.name}
          className="h-4 w-4 shrink-0 cursor-zoom-in rounded object-cover"
          onClick={(e) => {
            e.stopPropagation();
            window.open(file.url, "_blank", "noopener,noreferrer");
          }}
        />
      ) : (
        <Paperclip className="h-3 w-3 shrink-0 text-slate-400" />
      )}
      <span className="truncate">{file.name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`移除 ${file.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 rounded text-slate-400 hover:text-red-500"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// ---- Read-only cell value -------------------------------------------------
export function CellValue({
  field,
  value,
  row,
  schema,
  ctx,
}: {
  field: Field;
  value: unknown;
  row?: Row;
  schema?: Field[];
  ctx?: BitableContext;
}) {
  switch (field.type) {
    case "select":
      return value ? <Chip field={field} id={value} /> : null;
    case "multiSelect": {
      const ids = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-1">
          {ids.map((id) => (
            <Chip key={String(id)} field={field} id={id} />
          ))}
        </div>
      );
    }
    case "checkbox":
      return (
        <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded border", value ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300")}>
          {value ? "✓" : ""}
        </span>
      );
    case "rating": {
      const n = Number(value) || 0;
      const max = field.max ?? 5;
      return (
        <span className="flex">
          {Array.from({ length: max }, (_, i) => (
            <Star key={i} className={cn("h-3.5 w-3.5", i < n ? "fill-yellow-400 text-yellow-400" : "text-slate-300")} />
          ))}
        </span>
      );
    }
    case "progress": {
      const n = Math.max(0, Math.min(100, Number(value) || 0));
      return (
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-blue-500" style={{ width: `${n}%` }} />
          </span>
          <span className="text-xs text-slate-500">{n}%</span>
        </span>
      );
    }
    case "url":
      return value ? (
        <span className="flex min-w-0 items-center gap-1 text-blue-600">
          <span className="truncate">{String(value)}</span>
          <button
            type="button"
            aria-label="在新标签打开链接"
            title="打开链接"
            onClick={(e) => {
              e.stopPropagation();
              window.open(String(value), "_blank", "noopener,noreferrer");
            }}
            className="shrink-0 rounded p-0.5 text-blue-500 hover:bg-blue-50 active:scale-90"
          >
            <Link2 className="h-3 w-3" />
          </button>
        </span>
      ) : null;
    case "email":
      return value ? <span className="truncate text-blue-600">{String(value)}</span> : null;
    case "person":
      return value ? (
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] text-slate-600">
            {String(value).slice(0, 1)}
          </span>
          <span className="truncate">{String(value)}</span>
        </span>
      ) : null;
    case "link": {
      const ids = Array.isArray(value) ? value : [];
      if (!ctx || !field.linkTableId) return <span className="text-slate-400">{ids.length ? `${ids.length} 条` : ""}</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {ids.map((id) => (
            <span key={String(id)} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
              {ctx.primaryValue(field.linkTableId as string, String(id)) || "—"}
            </span>
          ))}
        </div>
      );
    }
    case "lookup":
      return row && schema && ctx ? <span className="truncate text-slate-600">{lookupValue(field, row, schema, ctx)}</span> : null;
    case "formula":
      return row && schema ? <span className="truncate font-medium text-slate-700">{formatFormulaValue(evalFormula(field, row, schema))}</span> : null;
    case "autoNumber":
      return <span className="tabular-nums text-slate-500">{row ? row.sortIndex + 1 : ""}</span>;
    case "createdTime":
    case "modifiedTime":
      return <span className="text-slate-500">{value ? new Date(String(value)).toLocaleString("zh-CN") : ""}</span>;
    case "createdBy":
    case "modifiedBy":
      return value ? <span className="truncate text-slate-500">{String(value)}</span> : null;
    case "attachment": {
      const files = asAttachments(value);
      const MAX_CHIPS = 3;
      if (!files.length) return null;
      return (
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {files.slice(0, MAX_CHIPS).map((f, i) => (
            <AttachmentChip key={`${f.url}-${i}`} file={f} />
          ))}
          {files.length > MAX_CHIPS && (
            <span className="shrink-0 text-xs text-slate-400">+{files.length - MAX_CHIPS}</span>
          )}
        </div>
      );
    }
    default:
      return <span className="truncate">{formatValue(field, value, ctx)}</span>;
  }
}

// ---- Editable cell --------------------------------------------------------
export function CellInput({
  field,
  value,
  onChange,
  onCommit,
  onPickLink,
  autoFocus,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  onCommit?: () => void;
  onPickLink?: () => void;
  autoFocus?: boolean;
}) {
  const [optOpen, setOptOpen] = useState(false);
  const [hoverStar, setHoverStar] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const optPanelRef = useRef<HTMLDivElement>(null);
  const optTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  // 单选/多选下拉：与其它 popover 一致，支持 Esc + 点击外部关闭，关闭即提交。
  useDismiss({
    open: optOpen,
    onClose: () => {
      setOptOpen(false);
      onCommit?.();
    },
    refs: [optPanelRef, optTriggerRef],
  });

  const base = "w-full bg-transparent text-sm outline-none";

  // 附件上传：逐个 POST /api/files（响应形如 { file: { name, filename, size, type, url } }），
  // 全部成功后提交；任一失败则内联提示并保留编辑态（已成功的仍在草稿里，可 Enter 保存）。
  async function uploadFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setUploadError(null);
    setUploading(true);
    const next = [...asAttachments(value)];
    let failed: string | null = null;
    for (const f of Array.from(list)) {
      try {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/files", { method: "POST", body: fd });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { file?: { name?: string; size?: number; type?: string; url?: string } };
        if (!json.file?.url) throw new Error("响应缺少 url");
        next.push({
          name: json.file.name || f.name,
          url: json.file.url,
          size: json.file.size ?? f.size,
          mime: json.file.type || f.type,
        });
        onChange([...next]);
      } catch (err) {
        failed = `「${f.name}」上传失败：${err instanceof Error ? err.message : String(err)}`;
        break;
      }
    }
    setUploading(false);
    if (failed) {
      setUploadError(failed);
    } else {
      onCommit?.();
    }
  }

  switch (field.type) {
    case "longText":
      return (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onCommit?.()}
          rows={3}
          className={cn(base, "resize-none")}
        />
      );
    case "number":
    case "currency":
      return (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          onBlur={() => onCommit?.()}
          className={base}
        />
      );
    case "date":
      return (
        <DatePicker
          value={String(value ?? "")}
          autoFocus={autoFocus}
          onChange={(v) => {
            onChange(v);
            onCommit?.();
          }}
        />
      );
    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => {
            onChange(e.target.checked);
            onCommit?.();
          }}
          className="h-[18px] w-[18px] cursor-pointer rounded border-slate-300 accent-blue-600"
        />
      );
    case "rating": {
      const n = Number(value) || 0;
      const max = field.max ?? 5;
      const shown = hoverStar ?? n;
      return (
        <span className="flex" onMouseLeave={() => setHoverStar(null)}>
          {Array.from({ length: max }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`评 ${i + 1} 分`}
              onMouseEnter={() => setHoverStar(i + 1)}
              onClick={() => {
                onChange(i + 1 === n ? 0 : i + 1);
                onCommit?.();
              }}
              className="rounded p-1 transition-transform active:scale-90"
            >
              <Star className={cn("h-4 w-4", i < shown ? "fill-yellow-400 text-yellow-400" : "text-slate-300")} />
            </button>
          ))}
        </span>
      );
    }
    case "progress": {
      const n = Math.max(0, Math.min(100, Number(value) || 0));
      return (
        <span className="flex w-full items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={n}
            onChange={(e) => onChange(Number(e.target.value))}
            onMouseUp={onCommit}
            className="flex-1 accent-blue-500"
          />
          <span className="w-9 text-right text-xs text-slate-500">{n}%</span>
        </span>
      );
    }
    case "select":
    case "multiSelect": {
      const isMulti = field.type === "multiSelect";
      const selected: unknown[] = isMulti ? (Array.isArray(value) ? value : []) : value ? [value] : [];
      return (
        <div className="relative w-full">
          <button
            ref={optTriggerRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={optOpen}
            onClick={() => setOptOpen((v) => !v)}
            className="flex w-full flex-wrap items-center gap-1 text-left text-sm"
          >
            {selected.length === 0 && <span className="text-slate-300">选择…</span>}
            {selected.map((id) => (
              <Chip key={String(id)} field={field} id={id} />
            ))}
          </button>
          {optOpen && (
            <div ref={optPanelRef} role="listbox" className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
              {(field.options ?? []).map((opt) => {
                const on = selected.includes(opt.id);
                const c = optionColor(opt.color);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      if (isMulti) {
                        const next = on ? selected.filter((s) => s !== opt.id) : [...selected, opt.id];
                        onChange(next);
                      } else {
                        onChange(on ? "" : opt.id);
                        setOptOpen(false);
                        onCommit?.();
                      }
                    }}
                    className="flex w-full items-center justify-between rounded px-1.5 py-1 hover:bg-slate-50"
                  >
                    <span className={cn("rounded px-1.5 py-0.5 text-xs", c.chip)}>{opt.name}</span>
                    {on && <span className="text-xs text-blue-600">✓</span>}
                  </button>
                );
              })}
              {isMulti && (
                <button
                  type="button"
                  onClick={() => {
                    setOptOpen(false);
                    onCommit?.();
                  }}
                  className="mt-1 w-full rounded bg-slate-900 px-2 py-1 text-xs text-white"
                >
                  完成
                </button>
              )}
            </div>
          )}
        </div>
      );
    }
    case "link": {
      const ids = Array.isArray(value) ? value : [];
      return (
        <button type="button" onClick={onPickLink} className="flex w-full flex-wrap items-center gap-1 text-left">
          {ids.length === 0 && <span className="text-slate-300">关联记录…</span>}
          {ids.map((id) => (
            <span key={String(id)} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
              已关联
            </span>
          ))}
          <Plus className="h-3.5 w-3.5 text-slate-400" />
        </button>
      );
    }
    case "attachment": {
      const files = asAttachments(value);
      return (
        <div className="flex w-full flex-wrap items-center gap-1">
          {files.map((f, i) => (
            <AttachmentChip
              key={`${f.url}-${i}`}
              file={f}
              onRemove={() => onChange(files.filter((_, j) => j !== i))}
            />
          ))}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex shrink-0 items-center gap-1 rounded border border-dashed border-slate-300 px-1.5 py-0.5 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            {uploading ? "上传中…" : "上传"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            aria-label="选择要上传的附件"
            onChange={(e) => {
              void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {uploadError && <span className="w-full text-[11px] text-red-600">{uploadError}</span>}
        </div>
      );
    }
    case "lookup":
    case "createdTime":
    case "modifiedTime":
    case "createdBy":
    case "modifiedBy":
      return <span className="text-sm text-slate-400">（自动）</span>;
    default:
      return (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onCommit?.()}
          className={base}
        />
      );
  }
}
