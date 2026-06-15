"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Field, FieldType, SelectOption, Table } from "./types";
import { newId } from "./types";
import { FIELD_TYPE_LIST } from "./Cell";
import { OPTION_COLORS, OPTION_COLOR_KEYS } from "./fieldMeta";

export function FieldEditor({
  field,
  tables,
  currentTableId,
  onSave,
  onDelete,
  onClose,
}: {
  field: Field;
  tables: Table[];
  currentTableId: string;
  onSave: (field: Field) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Field>({ ...field });

  function set<K extends keyof Field>(key: K, value: Field[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setType(type: FieldType) {
    setForm((f) => {
      const next: Field = { ...f, type };
      if ((type === "select" || type === "multiSelect") && !next.options?.length) {
        next.options = [{ id: newId("o"), name: "选项 1", color: "blue" }];
      }
      if (type === "link" && !next.linkTableId) {
        next.linkTableId = tables.find((t) => t.id !== currentTableId)?.id ?? null;
      }
      return next;
    });
  }

  function updateOption(id: string, patch: Partial<SelectOption>) {
    setForm((f) => ({ ...f, options: (f.options ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  }
  function addOption() {
    setForm((f) => ({
      ...f,
      options: [...(f.options ?? []), { id: newId("o"), name: `选项 ${(f.options?.length ?? 0) + 1}`, color: OPTION_COLOR_KEYS[(f.options?.length ?? 0) % OPTION_COLOR_KEYS.length] }],
    }));
  }
  function removeOption(id: string) {
    setForm((f) => ({ ...f, options: (f.options ?? []).filter((o) => o.id !== id) }));
  }

  const linkTable = tables.find((t) => t.id === form.linkTableId);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/30 p-4 pt-20" onMouseDown={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold">{field.name ? "编辑字段" : "新增字段"}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
          <label className="block">
            <span className="text-xs text-slate-500">字段名称</span>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-xs text-slate-500">字段类型</span>
            <select
              value={form.type}
              onChange={(e) => setType(e.target.value as FieldType)}
              disabled={form.primary}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400 disabled:bg-slate-50"
            >
              {FIELD_TYPE_LIST.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
            {form.primary && <span className="mt-1 block text-[11px] text-slate-400">主字段类型不可更改</span>}
          </label>

          {/* Select / multiSelect options */}
          {(form.type === "select" || form.type === "multiSelect") && (
            <div>
              <span className="text-xs text-slate-500">选项</span>
              <div className="mt-1 space-y-1.5">
                {(form.options ?? []).map((opt) => (
                  <div key={opt.id} className="flex items-center gap-1.5">
                    <select
                      value={opt.color}
                      onChange={(e) => updateOption(opt.id, { color: e.target.value })}
                      className="rounded border border-slate-200 px-1 py-1 text-xs"
                    >
                      {OPTION_COLOR_KEYS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <span className={cn("h-3 w-3 rounded-full", OPTION_COLORS[opt.color]?.dot)} />
                    <input
                      value={opt.name}
                      onChange={(e) => updateOption(opt.id, { name: e.target.value })}
                      className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-slate-400"
                    />
                    <button onClick={() => removeOption(opt.id)} className="text-slate-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button onClick={addOption} className="text-xs text-blue-600 hover:underline">
                  + 添加选项
                </button>
              </div>
            </div>
          )}

          {/* Link target table */}
          {form.type === "link" && (
            <label className="block">
              <span className="text-xs text-slate-500">关联数据表</span>
              <select
                value={form.linkTableId ?? ""}
                onChange={(e) => set("linkTableId", e.target.value || null)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Lookup config */}
          {form.type === "lookup" && (
            <LookupConfig form={form} tables={tables} currentTableId={currentTableId} onChange={(lk) => set("lookup", lk)} />
          )}

          {/* Rating max */}
          {form.type === "rating" && (
            <label className="block">
              <span className="text-xs text-slate-500">最高分</span>
              <input
                type="number"
                min={1}
                max={10}
                value={form.max ?? 5}
                onChange={(e) => set("max", Number(e.target.value))}
                className="mt-1 w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
              />
            </label>
          )}

          {/* Currency / number precision */}
          {(form.type === "currency" || form.type === "number") && (
            <div className="flex gap-3">
              {form.type === "currency" && (
                <label className="block">
                  <span className="text-xs text-slate-500">符号</span>
                  <input
                    value={form.symbol ?? "¥"}
                    onChange={(e) => set("symbol", e.target.value)}
                    className="mt-1 w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                  />
                </label>
              )}
              <label className="block">
                <span className="text-xs text-slate-500">小数位</span>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={form.precision ?? (form.type === "currency" ? 2 : 0)}
                  onChange={(e) => set("precision", Number(e.target.value))}
                  className="mt-1 w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
                />
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          {onDelete && !form.primary ? (
            <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> 删除字段
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              取消
            </button>
            <button
              onClick={() => onSave({ ...form, name: form.name.trim() || "未命名字段" })}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LookupConfig({
  form,
  tables,
  currentTableId,
  onChange,
}: {
  form: Field;
  tables: Table[];
  currentTableId: string;
  onChange: (lk: { linkFieldId: string; targetFieldId: string }) => void;
}) {
  const currentTable = tables.find((t) => t.id === currentTableId);
  const linkFields = (currentTable?.schema ?? []).filter((f) => f.type === "link");
  const linkFieldId = form.lookup?.linkFieldId ?? linkFields[0]?.id ?? "";
  const linkField = linkFields.find((f) => f.id === linkFieldId);
  const targetTable = tables.find((t) => t.id === linkField?.linkTableId);
  const targetFields = targetTable?.schema ?? [];
  const targetFieldId = form.lookup?.targetFieldId ?? targetFields[0]?.id ?? "";

  if (!linkFields.length) {
    return <p className="text-xs text-amber-600">需要先在本表添加一个「关联」字段，才能配置查找引用。</p>;
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-xs text-slate-500">基于关联字段</span>
        <select
          value={linkFieldId}
          onChange={(e) => onChange({ linkFieldId: e.target.value, targetFieldId })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
        >
          {linkFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs text-slate-500">引用目标字段</span>
        <select
          value={targetFieldId}
          onChange={(e) => onChange({ linkFieldId, targetFieldId: e.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400"
        >
          {targetFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
