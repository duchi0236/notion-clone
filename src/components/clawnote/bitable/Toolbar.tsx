"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  ArrowUpDown,
  Download,
  EyeOff,
  FileSpreadsheet,
  Filter as FilterIcon,
  Group,
  Loader2,
  Paintbrush,
  Search,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { Switch } from "@/components/ui/Switch";
import type { Automation, Field, Filter, FilterGroup, FilterOp, FormatRule, Sort, View } from "./types";
import { newId } from "./types";
import { FILTER_OPS, FORMAT_TINTS, toFilterGroup } from "./fieldMeta";
import { parseImportFile } from "./excel";
import { useDismiss } from "@/hooks/useDismiss";
import { Select } from "@/components/ui/Select";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** 条件行控件统一规格：筛选/排序/分组等弹层内的 select 与 input 共用。 */
const CONTROL_CLS = "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none transition-colors focus:border-blue-400";

type NativeOptionProps = {
  value?: string | number;
  children?: ReactNode;
  disabled?: boolean;
};

function optionText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(optionText).join("");
  if (isValidElement(node)) return optionText((node as ReactElement<NativeOptionProps>).props.children);
  return "";
}

/** 条件弹层中的统一自定义选择器，保留旧调用形状以减少业务逻辑改动。 */
function CondSelect({
  className,
  value,
  defaultValue,
  onChange,
  children,
  disabled,
  "aria-label": ariaLabel,
}: {
  className?: string;
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  children?: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((node) => {
      const option = node as ReactElement<NativeOptionProps>;
      return {
        value: String(option.props.value ?? optionText(option.props.children)),
        label: optionText(option.props.children),
        disabled: option.props.disabled,
      };
    });
  const resolvedValue = Array.isArray(value)
    ? String(value[0] ?? "")
    : String(value ?? defaultValue ?? "");

  return (
    <Select
      className={className}
      value={resolvedValue}
      options={options}
      disabled={disabled}
      ariaLabel={ariaLabel}
      triggerClassName="h-9 min-h-9 px-2.5 py-1 text-sm"
      onChange={(nextValue) =>
        onChange?.({
          target: { value: nextValue },
          currentTarget: { value: nextValue },
        } as ChangeEvent<HTMLSelectElement>)
      }
    />
  );
}

/** 统一的「删除条件」图标钮。 */
function RemoveButton({ onClick, label = "删除条件" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:bg-slate-200"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

/** 「+ 添加条件」类文字按钮的统一样式。 */
const ADD_BTN_CLS =
  "rounded-md px-1.5 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent";

function Popover({
  label,
  icon,
  active,
  wide,
  children,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
  /** 宽面板（筛选组/条件格式/自动化等较宽内容）。 */
  wide?: boolean;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 12, top: 0, width: 416, maxHeight: 480 });

  function positionPanel() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(wide ? 480 : 416, window.innerWidth - 24);
    setPosition({
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: rect.bottom + 8,
      width,
      maxHeight: Math.max(160, window.innerHeight - rect.bottom - 20),
    });
  }

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel, true);
    };
  }, [open, wide]);

  useDismiss({ open, onClose: () => setOpen(false), refs: [panelRef, triggerRef] });

  // 打开后把焦点移入面板首个可聚焦元素；关闭后归还给触发按钮。
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => {
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => {
          if (open) triggerRef.current?.focus();
          else positionPanel();
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm",
          active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
        )}
      >
        {icon} {label}
      </button>
      {open && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          className="cn-table-popover claw-solid fixed z-50 overflow-y-auto rounded-xl border border-slate-200 p-3 shadow-lg"
          style={position}
        >
          {typeof children === "function" ? children(() => setOpen(false)) : children}
        </div>,
        document.body,
      )}
    </div>
  );
}

function newCondition(schema: Field[]): Filter {
  return { id: newId("flt"), fieldId: schema[0].id, op: "contains", value: "" };
}

/** 单条筛选条件行：字段 / 操作符 / 值 / 删除（筛选组与条件格式共用）。 */
function ConditionRow({
  flt,
  schema,
  onChange,
  onRemove,
}: {
  flt: Filter;
  schema: Field[];
  onChange: (next: Filter) => void;
  onRemove: () => void;
}) {
  const field = schema.find((f) => f.id === flt.fieldId);
  const needsValue = flt.op !== "empty" && flt.op !== "notEmpty";
  return (
    <div className="flex items-center gap-1">
      <CondSelect value={flt.fieldId} onChange={(e) => onChange({ ...flt, fieldId: e.target.value })} className="w-24 shrink-0" aria-label="筛选字段">
        {schema.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </CondSelect>
      <CondSelect value={flt.op} onChange={(e) => onChange({ ...flt, op: e.target.value as FilterOp })} className="w-20 shrink-0" aria-label="筛选方式">
        {FILTER_OPS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </CondSelect>
      {needsValue &&
        (field?.type === "select" ? (
          <CondSelect value={String(flt.value ?? "")} onChange={(e) => onChange({ ...flt, value: e.target.value })} className="min-w-0 flex-1" aria-label="筛选值">
            <option value="">—</option>
            {(field.options ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </CondSelect>
        ) : (
          <input
            value={String(flt.value ?? "")}
            onChange={(e) => onChange({ ...flt, value: e.target.value })}
            aria-label="筛选值"
            className={cn(CONTROL_CLS, "min-w-0 flex-1")}
          />
        ))}
      <RemoveButton onClick={onRemove} />
    </div>
  );
}

/** 与/或 segmented 切换。 */
function CombinatorSeg({ value, onChange }: { value: "and" | "or"; onChange: (v: "and" | "or") => void }) {
  return (
    <div className="inline-flex shrink-0 rounded-lg border border-slate-200 p-0.5" role="group" aria-label="条件组合方式">
      {(["and", "or"] as const).map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs transition-colors",
            value === c ? "bg-blue-50 font-medium text-blue-700" : "text-slate-500 hover:text-slate-700",
          )}
        >
          {c === "and" ? "与" : "或"}
        </button>
      ))}
    </div>
  );
}

/** 高级筛选面板（#18）：根组 与/或 + 条件行 + 一层子组。 */
function FilterPanel({ root, schema, onChange }: { root: FilterGroup; schema: Field[]; onChange: (next: FilterGroup) => void }) {
  const groups = root.groups ?? [];
  const empty = root.conditions.length === 0 && groups.length === 0;
  const patchSub = (gid: string, next: FilterGroup | null) =>
    onChange({ ...root, groups: next ? groups.map((g) => (g.id === gid ? next : g)) : groups.filter((g) => g.id !== gid) });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CombinatorSeg value={root.combinator} onChange={(c) => onChange({ ...root, combinator: c })} />
        <span className="text-xs text-slate-400">{root.combinator === "and" ? "满足以下所有条件" : "满足以下任一条件"}</span>
      </div>
      {empty && <p className="text-xs text-slate-400">未设置筛选条件</p>}
      {root.conditions.map((flt) => (
        <ConditionRow
          key={flt.id}
          flt={flt}
          schema={schema}
          onChange={(next) => onChange({ ...root, conditions: root.conditions.map((x) => (x.id === flt.id ? next : x)) })}
          onRemove={() => onChange({ ...root, conditions: root.conditions.filter((x) => x.id !== flt.id) })}
        />
      ))}
      {groups.map((g) => (
        <div key={g.id} className="ml-3 space-y-2 border-l-2 border-slate-300 py-1 pl-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CombinatorSeg value={g.combinator} onChange={(c) => patchSub(g.id, { ...g, combinator: c })} />
              <span className="text-xs text-slate-400">条件组</span>
            </div>
            <RemoveButton onClick={() => patchSub(g.id, null)} label="删除条件组" />
          </div>
          {g.conditions.length === 0 && <p className="text-xs text-slate-400">空条件组（不影响筛选）</p>}
          {g.conditions.map((flt) => (
            <ConditionRow
              key={flt.id}
              flt={flt}
              schema={schema}
              onChange={(next) => patchSub(g.id, { ...g, conditions: g.conditions.map((x) => (x.id === flt.id ? next : x)) })}
              onRemove={() => patchSub(g.id, { ...g, conditions: g.conditions.filter((x) => x.id !== flt.id) })}
            />
          ))}
          <button
            onClick={() => schema.length && patchSub(g.id, { ...g, conditions: [...g.conditions, newCondition(schema)] })}
            disabled={!schema.length}
            className={ADD_BTN_CLS}
          >
            + 添加条件
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button
          onClick={() => schema.length && onChange({ ...root, conditions: [...root.conditions, newCondition(schema)] })}
          disabled={!schema.length}
          className={ADD_BTN_CLS}
        >
          + 添加条件
        </button>
        <button
          onClick={() =>
            schema.length && onChange({ ...root, groups: [...groups, { id: newId("fg"), combinator: "and", conditions: [newCondition(schema)], groups: [] }] })
          }
          disabled={!schema.length}
          className={ADD_BTN_CLS}
        >
          + 添加条件组
        </button>
      </div>
    </div>
  );
}

/** 条件格式面板（#17）：规则列表 + 展开编辑（颜色/范围/条件）。 */
function FormatPanel({ formats, schema, onChange }: { formats: FormatRule[]; schema: Field[]; onChange: (next: FormatRule[]) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const patch = (id: string, next: FormatRule | null) =>
    onChange(next ? formats.map((r) => (r.id === id ? next : r)) : formats.filter((r) => r.id !== id));
  const addRule = () => {
    const rule: FormatRule = {
      id: newId("fmt"),
      name: `规则 ${formats.length + 1}`,
      when: { id: newId("fg"), combinator: "and", conditions: schema.length ? [newCondition(schema)] : [], groups: [] },
      scope: "row",
      fieldId: null,
      color: "yellow",
    };
    onChange([...formats, rule]);
    setExpandedId(rule.id);
  };

  return (
    <div className="space-y-2">
      {formats.length === 0 && <p className="text-xs text-slate-400">未设置条件格式：命中条件的行（或指定列）将被着色</p>}
      {formats.map((rule) => {
        const open = expandedId === rule.id;
        const scopeText = rule.scope === "row" ? "整行" : `列：${schema.find((f) => f.id === rule.fieldId)?.name ?? "?"}`;
        return (
          <div key={rule.id} className="rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className={cn("h-4 w-4 shrink-0 rounded border border-slate-200", FORMAT_TINTS[rule.color] ?? FORMAT_TINTS.gray)} />
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : rule.id)}
                aria-expanded={open}
                className="min-w-0 flex-1 truncate text-left text-sm text-slate-700 hover:text-blue-600"
              >
                {rule.name || "未命名规则"}
                <span className="ml-2 text-xs text-slate-400">
                  {scopeText} · {rule.when.conditions.length} 条件
                </span>
              </button>
              <RemoveButton onClick={() => patch(rule.id, null)} label="删除规则" />
            </div>
            {open && (
              <div className="space-y-2 border-t border-slate-200 p-2">
                <input
                  value={rule.name ?? ""}
                  onChange={(e) => patch(rule.id, { ...rule, name: e.target.value })}
                  placeholder="规则名称"
                  aria-label="规则名称"
                  className={cn(CONTROL_CLS, "w-full")}
                />
                <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="颜色">
                  {Object.keys(FORMAT_TINTS).map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={rule.color === c}
                      aria-label={`颜色 ${c}`}
                      onClick={() => patch(rule.id, { ...rule, color: c })}
                      className={cn(
                        "h-6 w-6 rounded-md border border-slate-200 transition-shadow",
                        FORMAT_TINTS[c],
                        rule.color === c && "ring-2 ring-blue-400 ring-offset-1",
                      )}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <CondSelect
                    value={rule.scope}
                    onChange={(e) => {
                      const scope = e.target.value as FormatRule["scope"];
                      patch(rule.id, { ...rule, scope, fieldId: scope === "cell" ? (rule.fieldId ?? schema[0]?.id ?? null) : null });
                    }}
                    className="w-24 shrink-0"
                    aria-label="作用范围"
                  >
                    <option value="row">整行</option>
                    <option value="cell">指定列</option>
                  </CondSelect>
                  {rule.scope === "cell" && (
                    <CondSelect
                      value={rule.fieldId ?? ""}
                      onChange={(e) => patch(rule.id, { ...rule, fieldId: e.target.value })}
                      className="min-w-0 flex-1"
                      aria-label="作用列"
                    >
                      {schema.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </CondSelect>
                  )}
                </div>
                <p className="text-xs text-slate-400">满足以下所有条件时着色：</p>
                {rule.when.conditions.map((flt) => (
                  <ConditionRow
                    key={flt.id}
                    flt={flt}
                    schema={schema}
                    onChange={(next) =>
                      patch(rule.id, { ...rule, when: { ...rule.when, conditions: rule.when.conditions.map((x) => (x.id === flt.id ? next : x)) } })
                    }
                    onRemove={() => patch(rule.id, { ...rule, when: { ...rule.when, conditions: rule.when.conditions.filter((x) => x.id !== flt.id) } })}
                  />
                ))}
                <button
                  onClick={() => schema.length && patch(rule.id, { ...rule, when: { ...rule.when, conditions: [...rule.when.conditions, newCondition(schema)] } })}
                  disabled={!schema.length}
                  className={ADD_BTN_CLS}
                >
                  + 添加条件
                </button>
              </div>
            )}
          </div>
        );
      })}
      <button onClick={addRule} disabled={!schema.length} className={ADD_BTN_CLS}>
        + 添加规则
      </button>
    </div>
  );
}

/** 导入/导出面板（#20）。解析在本组件内做，映射与建行交给外层 onImport。 */
function ImportExportPanel({
  onExport,
  onImport,
  close,
}: {
  onExport: () => void;
  onImport: (headers: string[], records: Record<string, string>[]) => Promise<void> | void;
  close: () => void;
}) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const MENU_CLS =
    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 允许重复选择同一文件
    if (!file) return;
    setError(null);
    setImporting(true);
    try {
      const { headers, records } = await parseImportFile(file);
      await onImport(headers, records);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败，请检查文件格式");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => {
          onExport();
          close();
        }}
        className={MENU_CLS}
      >
        <Download className="h-4 w-4 shrink-0 text-slate-400" /> 导出当前视图 (.xlsx)
      </button>
      <button type="button" disabled={importing} onClick={() => fileRef.current?.click()} className={MENU_CLS}>
        {importing ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" /> : <Upload className="h-4 w-4 shrink-0 text-slate-400" />}
        {importing ? "正在导入…" : "导入 Excel/CSV"}
      </button>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} aria-label="选择导入文件" className="hidden" />
    </div>
  );
}

/** 按字段类型给值输入：select 用选项下拉，其余用文本框。 */
function FieldValueInput({
  field,
  value,
  onChange,
  className,
  label,
}: {
  field: Field | undefined;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  label: string;
}) {
  if (field?.type === "select") {
    return (
      <CondSelect value={value} onChange={(e) => onChange(e.target.value)} className={className} aria-label={label}>
        <option value="">—</option>
        {(field.options ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </CondSelect>
    );
  }
  return <input value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={cn(CONTROL_CLS, className)} />;
}

/** 自动化「+ 添加规则」表单：触发器 + 动作 + 自动命名（可改）。 */
function AutomationForm({ schema, onAdd, onCancel }: { schema: Field[]; onAdd: (a: Automation) => void; onCancel: () => void }) {
  const first = schema[0]?.id ?? "";
  const [triggerType, setTriggerType] = useState<"rowCreated" | "fieldEquals">("rowCreated");
  const [triggerFieldId, setTriggerFieldId] = useState(first);
  const [triggerValue, setTriggerValue] = useState("");
  const [actionFieldId, setActionFieldId] = useState(first);
  const [actionValue, setActionValue] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

  const fieldOf = (id: string) => schema.find((f) => f.id === id);
  const fieldName = (id: string) => fieldOf(id)?.name ?? "?";
  const valueLabel = (fieldId: string, v: string) => {
    const f = fieldOf(fieldId);
    if (f?.type === "select") return f.options?.find((o) => o.id === v)?.name ?? v;
    return v;
  };
  const autoName =
    triggerType === "rowCreated"
      ? `记录创建时，设置「${fieldName(actionFieldId)}」`
      : `当「${fieldName(triggerFieldId)}」等于「${valueLabel(triggerFieldId, triggerValue) || "…"}」时，设置「${fieldName(actionFieldId)}」`;
  const displayName = nameTouched ? name : autoName;

  const submit = () => {
    if (!actionFieldId || (triggerType === "fieldEquals" && !triggerFieldId)) return;
    onAdd({
      id: newId("auto"),
      name: displayName.trim() || autoName,
      enabled: true,
      trigger: triggerType === "rowCreated" ? { type: "rowCreated" } : { type: "fieldEquals", fieldId: triggerFieldId, value: triggerValue },
      action: { type: "setField", fieldId: actionFieldId, value: actionValue },
    });
  };

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-2">
      <p className="text-xs font-medium text-slate-500">触发器</p>
      <div className="flex items-center gap-1">
        <CondSelect
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value as "rowCreated" | "fieldEquals")}
          className="w-32 shrink-0"
          aria-label="触发器类型"
        >
          <option value="rowCreated">记录创建时</option>
          <option value="fieldEquals">字段等于值</option>
        </CondSelect>
        {triggerType === "fieldEquals" && (
          <>
            <CondSelect value={triggerFieldId} onChange={(e) => setTriggerFieldId(e.target.value)} className="w-24 shrink-0" aria-label="触发字段">
              {schema.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </CondSelect>
            <FieldValueInput field={fieldOf(triggerFieldId)} value={triggerValue} onChange={setTriggerValue} className="min-w-0 flex-1" label="触发值" />
          </>
        )}
      </div>
      <p className="text-xs font-medium text-slate-500">动作：设置字段</p>
      <div className="flex items-center gap-1">
        <CondSelect value={actionFieldId} onChange={(e) => setActionFieldId(e.target.value)} className="w-32 shrink-0" aria-label="动作字段">
          {schema.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </CondSelect>
        <FieldValueInput field={fieldOf(actionFieldId)} value={actionValue} onChange={setActionValue} className="min-w-0 flex-1" label="动作值" />
      </div>
      <p className="text-xs font-medium text-slate-500">名称</p>
      <input
        value={displayName}
        onChange={(e) => {
          setNameTouched(true);
          setName(e.target.value);
        }}
        aria-label="自动化名称"
        className={cn(CONTROL_CLS, "w-full")}
      />
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="h-8 rounded-lg px-3 text-sm text-slate-500 transition-colors hover:bg-slate-100">
          取消
        </button>
        <button type="button" onClick={submit} className="h-8 rounded-lg bg-blue-600 px-3 text-sm text-white transition-colors hover:bg-blue-700">
          添加
        </button>
      </div>
    </div>
  );
}

/** 自动化面板（#20 轻量）：列表（名称+开关+删除）+ 添加表单。执行逻辑在 BitableApp。 */
function AutomationPanel({ automations, schema, onChange }: { automations: Automation[]; schema: Field[]; onChange: (next: Automation[]) => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-2">
      {automations.length === 0 && !adding && <p className="text-xs text-slate-400">暂无自动化规则：满足触发器时自动设置字段值</p>}
      {automations.map((a) => (
        <div key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
          <Switch checked={a.enabled} onChange={(v) => onChange(automations.map((x) => (x.id === a.id ? { ...x, enabled: v } : x)))} label={`启用「${a.name}」`} />
          <span className={cn("min-w-0 flex-1 truncate text-sm", a.enabled ? "text-slate-700" : "text-slate-400")}>{a.name}</span>
          <RemoveButton onClick={() => onChange(automations.filter((x) => x.id !== a.id))} label="删除自动化" />
        </div>
      ))}
      {adding ? (
        <AutomationForm
          schema={schema}
          onCancel={() => setAdding(false)}
          onAdd={(a) => {
            onChange([...automations, a]);
            setAdding(false);
          }}
        />
      ) : (
        <button onClick={() => setAdding(true)} disabled={!schema.length} className={ADD_BTN_CLS}>
          + 添加规则
        </button>
      )}
    </div>
  );
}

export function Toolbar({
  view,
  schema,
  search,
  onSearch,
  onPatchView,
  onExport,
  onImport,
  automations,
  onPatchAutomations,
}: {
  view: View;
  schema: Field[];
  search: string;
  onSearch: (v: string) => void;
  onPatchView: (patch: Partial<View>) => void;
  onExport: () => void;
  onImport: (headers: string[], records: Record<string, string>[]) => Promise<void> | void;
  automations: Automation[];
  onPatchAutomations: (next: Automation[]) => void;
}) {
  const sorts = view.sorts ?? [];
  const hidden = view.hiddenFieldIds ?? [];
  const formats = view.formats ?? [];
  const selectFields = schema.filter((f) => f.type === "select");
  const searchRef = useRef<HTMLInputElement>(null);

  // 高级筛选：旧扁平 filters 迁移进根组编辑；保存时以 filterGroup 为准并清空 filters。
  const filterRoot = toFilterGroup(view.filters, view.filterGroup);
  const filterCount = filterRoot.conditions.length + (filterRoot.groups ?? []).reduce((n, g) => n + g.conditions.length, 0);

  return (
    <div className="cn-table-toolbar flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
      {/* Filter（高级筛选：与/或 + 条件组） */}
      <Popover wide label={filterCount ? `筛选 ${filterCount}` : "筛选"} icon={<FilterIcon className="h-4 w-4" />} active={filterCount > 0}>
        <FilterPanel root={filterRoot} schema={schema} onChange={(next) => onPatchView({ filterGroup: next, filters: [] })} />
      </Popover>

      {/* Sort */}
      <Popover label={sorts.length ? `排序 ${sorts.length}` : "排序"} icon={<ArrowUpDown className="h-4 w-4" />} active={sorts.length > 0}>
        <div className="space-y-2">
          {sorts.length === 0 && <p className="text-xs text-slate-400">未设置排序</p>}
          {sorts.map((s, i) => (
            <div key={i} className="flex items-center gap-1">
              <CondSelect
                value={s.fieldId}
                onChange={(e) => onPatchView({ sorts: sorts.map((x, j) => (j === i ? { ...x, fieldId: e.target.value } : x)) })}
                className="min-w-0 flex-1"
                aria-label={`排序字段 ${i + 1}`}
              >
                {schema.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </CondSelect>
              <CondSelect
                value={s.dir}
                onChange={(e) => onPatchView({ sorts: sorts.map((x, j) => (j === i ? { ...x, dir: e.target.value as Sort["dir"] } : x)) })}
                className="w-20 shrink-0"
                aria-label={`排序方向 ${i + 1}`}
              >
                <option value="asc">升序</option>
                <option value="desc">降序</option>
              </CondSelect>
              <RemoveButton onClick={() => onPatchView({ sorts: sorts.filter((_, j) => j !== i) })} label="删除排序" />
            </div>
          ))}
          <button
            onClick={() => {
              if (!schema.length) return;
              onPatchView({ sorts: [...sorts, { fieldId: schema[0].id, dir: "asc" }] });
            }}
            disabled={!schema.length}
            className={ADD_BTN_CLS}
          >
            + 添加排序
          </button>
        </div>
      </Popover>

      {/* Group (kanban) */}
      {view.type === "kanban" && (
        <Popover label="分组" icon={<Group className="h-4 w-4" />} active={!!view.groupFieldId}>
          <div className="space-y-1">
            <p className="mb-1 text-xs text-slate-400">按单选字段分组</p>
            {selectFields.length === 0 && <p className="text-xs text-amber-600">本表没有单选字段</p>}
            {selectFields.map((f) => (
              <button
                key={f.id}
                onClick={() => onPatchView({ groupFieldId: f.id })}
                className={cn("flex w-full items-center justify-between rounded px-2 py-1 text-sm hover:bg-slate-50", view.groupFieldId === f.id && "text-blue-600")}
              >
                {f.name}
                {view.groupFieldId === f.id && <span>✓</span>}
              </button>
            ))}
          </div>
        </Popover>
      )}

      {/* Group (grid 行分组) */}
      {view.type === "grid" && (
        <Popover label={view.rowGroupFieldId ? "分组 1" : "分组"} icon={<Group className="h-4 w-4" />} active={!!view.rowGroupFieldId}>
          <div className="space-y-0.5">
            <p className="mb-1 text-xs text-slate-400">按字段分组（含每组小计）</p>
            <button
              onClick={() => onPatchView({ rowGroupFieldId: null })}
              className={cn("flex w-full items-center justify-between rounded px-2 py-1 text-sm hover:bg-slate-50", !view.rowGroupFieldId && "text-blue-600")}
            >
              不分组 {!view.rowGroupFieldId && <span>✓</span>}
            </button>
            {schema
              .filter((f) => !["longText", "link", "lookup", "attachment"].includes(f.type))
              .map((f) => (
                <button
                  key={f.id}
                  onClick={() => onPatchView({ rowGroupFieldId: f.id })}
                  className={cn("flex w-full items-center justify-between rounded px-2 py-1 text-sm hover:bg-slate-50", view.rowGroupFieldId === f.id && "text-blue-600")}
                >
                  {f.name}
                  {view.rowGroupFieldId === f.id && <span>✓</span>}
                </button>
              ))}
          </div>
        </Popover>
      )}

      {/* 条件格式 */}
      <Popover wide label={formats.length ? `条件格式 ${formats.length}` : "条件格式"} icon={<Paintbrush className="h-4 w-4" />} active={formats.length > 0}>
        <FormatPanel formats={formats} schema={schema} onChange={(next) => onPatchView({ formats: next })} />
      </Popover>

      {/* Hidden fields */}
      <Popover label={hidden.length ? `隐藏 ${hidden.length}` : "字段"} icon={<EyeOff className="h-4 w-4" />} active={hidden.length > 0}>
        <div className="space-y-1">
          {schema.map((f) => {
            const on = !hidden.includes(f.id);
            return (
              <label key={f.id} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-slate-50">
                <span className={cn(f.primary && "text-slate-400")}>{f.name}</span>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={f.primary}
                  onChange={() => onPatchView({ hiddenFieldIds: on ? [...hidden, f.id] : hidden.filter((x) => x !== f.id) })}
                />
              </label>
            );
          })}
        </div>
      </Popover>

      {/* 导入/导出 */}
      <Popover label="导入/导出" icon={<FileSpreadsheet className="h-4 w-4" />}>
        {(close) => <ImportExportPanel onExport={onExport} onImport={onImport} close={close} />}
      </Popover>

      {/* 自动化 */}
      <Popover
        wide
        label={automations.length ? `自动化 ${automations.length}` : "自动化"}
        icon={<Zap className="h-4 w-4" />}
        active={automations.some((a) => a.enabled)}
      >
        <AutomationPanel automations={automations} schema={schema} onChange={onPatchAutomations} />
      </Popover>

      {/* Search */}
      <div className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 transition-colors focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="搜索记录"
          aria-label="搜索记录"
          className="w-40 text-sm outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              onSearch("");
              searchRef.current?.focus();
            }}
            aria-label="清除搜索"
            className="shrink-0 rounded text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
