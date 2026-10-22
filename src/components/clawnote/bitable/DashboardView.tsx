"use client";

// 仪表盘视图：按 view.charts 渲染纯 SVG 图表卡（bar/pie/line/stat），
// 图表增删改通过 onPatchView({ charts }) 持久化。

import {
  Children,
  isValidElement,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { BarChart3, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AggType, BitableContext, ChartConfig, ChartKind, Field, Row, Table, View } from "./types";
import { newId } from "./types";
import { cellValue, formatValue } from "./fieldMeta";
import { AGG_LABELS, evalFormula } from "./formula";
import { useDismiss } from "@/hooks/useDismiss";
import { confirm } from "@/components/ui/confirm";
import { Select } from "@/components/ui/Select";

// 与 Toolbar 的条件行控件同规格（不 import Toolbar，按约定复制类字符串）。
const CONTROL_CLS = "h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none transition-colors focus:border-blue-400";

type NativeOptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean };

function optionText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(optionText).join("");
  if (isValidElement(node)) return optionText((node as ReactElement<NativeOptionProps>).props.children);
  return "";
}

function CondSelect({
  className,
  value,
  onChange,
  children,
  disabled,
  "aria-label": ariaLabel,
}: {
  className?: string;
  value?: string | number | readonly string[];
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

  return (
    <Select
      className={className}
      value={Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "")}
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

// OPTION_COLORS 的 dot 色对应实色（SVG fill 需要具体色值）。
const DOT_HEX: Record<string, string> = {
  gray: "#94a3b8",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  teal: "#14b8a6",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
};
// 非 select 分组时循环使用的调色板。
const PALETTE = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#14b8a6", "#ef4444", "#eab308", "#ec4899", "#94a3b8"];

const NUMERIC_TYPES = new Set<Field["type"]>(["number", "currency", "rating", "progress", "autoNumber", "formula"]);
const CHART_KINDS: { kind: ChartKind; label: string }[] = [
  { kind: "bar", label: "条形图" },
  { kind: "pie", label: "饼图" },
  { kind: "line", label: "折线图" },
  { kind: "stat", label: "统计数字" },
];
const CHART_KIND_LABEL: Record<ChartKind, string> = { bar: "条形图", pie: "饼图", line: "折线图", stat: "统计数字" };
const AGG_CHOICES: AggType[] = ["count", "sum", "avg", "min", "max", "filled", "empty", "checked"];

// ---- 数据聚合 ---------------------------------------------------------------

type GroupDatum = { key: string; label: string; color: string; value: number };

function isEmptyVal(v: unknown): boolean {
  return v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function trunc(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// 一组行的聚合值：count=行数；其余同 GridView 汇总语义，取 valueField 的值。
function aggValue(agg: AggType, valueField: Field | null, groupRows: Row[], schema: Field[]): number {
  if (agg === "count" || agg === "none" || !valueField) return groupRows.length;
  const raw = groupRows.map((r) => (valueField.type === "formula" ? evalFormula(valueField, r, schema) : cellValue(valueField, r)));
  const filled = raw.filter((v) => !isEmptyVal(v));
  switch (agg) {
    case "filled":
      return filled.length;
    case "empty":
      return groupRows.length - filled.length;
    case "checked":
      return raw.filter((v) => v === true).length;
    case "sum":
      return filled.reduce<number>((s, v) => s + toNum(v), 0);
    case "avg":
      return filled.length ? filled.reduce<number>((s, v) => s + toNum(v), 0) / filled.length : 0;
    case "min":
      return filled.length ? Math.min(...filled.map(toNum)) : 0;
    case "max":
      return filled.length ? Math.max(...filled.map(toNum)) : 0;
    default:
      return groupRows.length;
  }
}

const BLANK_KEY = "__blank__";

// 按 chart.fieldId 分组并逐组聚合。select 用选项名+选项色，其余按 formatValue 文本分组。
function buildGroups(chart: ChartConfig, schema: Field[], rows: Row[], ctx: BitableContext): GroupDatum[] {
  const field = schema.find((f) => f.id === chart.fieldId) ?? null;
  const valueField = schema.find((f) => f.id === chart.valueFieldId) ?? null;
  if (!field) {
    // 无分组字段：全表聚合出一个数（stat 卡场景）。
    return [{ key: "__all__", label: "全部", color: PALETTE[0], value: aggValue(chart.agg, valueField, rows, schema) }];
  }

  const buckets = new Map<string, { label: string; color?: string; rows: Row[] }>();
  if (field.type === "select") {
    for (const o of field.options ?? []) buckets.set(o.id, { label: o.name, color: DOT_HEX[o.color] ?? DOT_HEX.gray, rows: [] });
    for (const row of rows) {
      const v = cellValue(field, row);
      const key = field.options?.some((o) => o.id === v) ? String(v) : BLANK_KEY;
      if (!buckets.has(key)) buckets.set(key, { label: "未填写", color: DOT_HEX.gray, rows: [] });
      buckets.get(key)!.rows.push(row);
    }
  } else {
    for (const row of rows) {
      const text = formatValue(field, cellValue(field, row), ctx);
      const key = text || BLANK_KEY;
      if (!buckets.has(key)) buckets.set(key, { label: text || "未填写", rows: [] });
      buckets.get(key)!.rows.push(row);
    }
  }

  let entries = Array.from(buckets.entries()).filter(([, b]) => b.rows.length > 0);
  if (field.type !== "select") {
    // 非 select 字段按分组键排序（未填写排最后）。
    entries = entries.sort(([ka, a], [kb, b]) => {
      if (ka === BLANK_KEY) return 1;
      if (kb === BLANK_KEY) return -1;
      return a.label.localeCompare(b.label, "zh-CN", { numeric: true });
    });
  }

  return entries.map(([key, b], i) => ({
    key,
    label: b.label,
    color: b.color ?? (key === BLANK_KEY ? DOT_HEX.gray : PALETTE[i % PALETTE.length]),
    value: aggValue(chart.agg, valueField, b.rows, schema),
  }));
}

// ---- SVG 图表 ---------------------------------------------------------------

function BarChart({ groups, ariaLabel }: { groups: GroupDatum[]; ariaLabel: string }) {
  const W = 360;
  const ROW = 26;
  const LABEL_W = 88;
  const VALUE_W = 46;
  const H = Math.max(groups.length, 1) * ROW;
  const maxV = Math.max(...groups.map((g) => Math.abs(g.value)), 1);
  const barMax = W - LABEL_W - VALUE_W - 8;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-slate-600" role="img" aria-label={ariaLabel}>
      {groups.map((g, i) => {
        const y = i * ROW;
        const w = Math.max((Math.abs(g.value) / maxV) * barMax, g.value !== 0 ? 2 : 0);
        return (
          <g key={g.key}>
            <title>{`${g.label}：${fmt(g.value)}`}</title>
            <text x={LABEL_W - 6} y={y + ROW / 2} textAnchor="end" dominantBaseline="central" fontSize="11" fill="currentColor" opacity="0.7">
              {trunc(g.label, 7)}
            </text>
            <rect x={LABEL_W} y={y + 6} width={w} height={ROW - 12} rx="3" fill={g.color} />
            <text x={LABEL_W + w + 6} y={y + ROW / 2} dominantBaseline="central" fontSize="11" fill="currentColor" opacity="0.85">
              {fmt(g.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PieChart({ groups, ariaLabel }: { groups: GroupDatum[]; ariaLabel: string }) {
  const R = 40;
  const C = 2 * Math.PI * R;
  const positive = groups.map((g) => ({ ...g, value: Math.max(g.value, 0) }));
  const total = positive.reduce((s, g) => s + g.value, 0);
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0 text-slate-700" role="img" aria-label={ariaLabel}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        {total > 0 &&
          positive.map((g) => {
            const dash = (g.value / total) * C;
            const seg = (
              <circle
                key={g.key}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={g.color}
                strokeWidth="14"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
              >
                <title>{`${g.label}：${fmt(g.value)}`}</title>
              </circle>
            );
            offset += dash;
            return seg;
          })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="15" fontWeight="600" fill="currentColor">
          {fmt(total)}
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {groups.map((g) => (
          <li key={g.key} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.color }} />
            <span className="min-w-0 flex-1 truncate">{g.label}</span>
            <span className="shrink-0 tabular-nums text-slate-400">{fmt(g.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LineChart({ groups, ariaLabel }: { groups: GroupDatum[]; ariaLabel: string }) {
  const W = 360;
  const H = 150;
  const PX = 18;
  const PT = 14;
  const PB = 24;
  const max = Math.max(...groups.map((g) => g.value), 0);
  const min = Math.min(...groups.map((g) => g.value), 0);
  const span = max - min || 1;
  const innerW = W - PX * 2;
  const innerH = H - PT - PB;
  const pts = groups.map((g, i) => {
    const x = groups.length > 1 ? PX + (i / (groups.length - 1)) * innerW : W / 2;
    const y = PT + (1 - (g.value - min) / span) * innerH;
    return { x, y };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-slate-600" role="img" aria-label={ariaLabel}>
      <line x1={PX} y1={H - PB} x2={W - PX} y2={H - PB} stroke="currentColor" strokeWidth="1" opacity="0.15" />
      {pts.length > 1 && (
        <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={pts.map((p) => `${p.x},${p.y}`).join(" ")} />
      )}
      {groups.map((g, i) => (
        <g key={g.key}>
          <circle cx={pts[i].x} cy={pts[i].y} r="3.5" fill="#3b82f6">
            <title>{`${g.label}：${fmt(g.value)}`}</title>
          </circle>
          <text x={pts[i].x} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.7">
            {trunc(g.label, 6)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---- 图表卡 -----------------------------------------------------------------

function ChartCard({
  chart,
  schema,
  rows,
  ctx,
  onEdit,
  onDelete,
}: {
  chart: ChartConfig;
  schema: Field[];
  rows: Row[];
  ctx: BitableContext;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useDismiss({ open: menuOpen, onClose: () => setMenuOpen(false), refs: [menuRef, btnRef] });

  const groups = useMemo(() => buildGroups(chart, schema, rows, ctx), [chart, schema, rows, ctx]);
  const valueField = schema.find((f) => f.id === chart.valueFieldId) ?? null;
  const title = chart.title || "未命名图表";
  const ariaLabel = `${title}：${CHART_KIND_LABEL[chart.kind]}，${AGG_LABELS[chart.agg]}，共 ${groups.length} 组`;

  let body: JSX.Element;
  if (chart.kind === "stat") {
    // 统计卡：对全表（当前视图行）聚合出一个数。
    const value = aggValue(chart.agg, valueField, rows, schema);
    body = (
      <div className="py-2" role="img" aria-label={`${title}：${AGG_LABELS[chart.agg]} ${fmt(value)}`}>
        <div className="text-3xl font-semibold tabular-nums text-slate-800">{fmt(value)}</div>
        <div className="mt-1 text-xs text-slate-400">
          {AGG_LABELS[chart.agg]}
          {valueField ? ` · ${valueField.name}` : ""}
        </div>
      </div>
    );
  } else if (groups.length === 0) {
    body = <div className="flex h-32 items-center justify-center text-xs text-slate-400">暂无数据</div>;
  } else if (chart.kind === "bar") {
    body = <BarChart groups={groups} ariaLabel={ariaLabel} />;
  } else if (chart.kind === "pie") {
    body = <PieChart groups={groups} ariaLabel={ariaLabel} />;
  } else {
    body = <LineChart groups={groups} ariaLabel={ariaLabel} />;
  }

  return (
    <div className="claw-solid rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800">{title}</div>
          <div className="mt-0.5 text-xs text-slate-400">{CHART_KIND_LABEL[chart.kind]}</div>
        </div>
        <div className="relative shrink-0">
          <button
            ref={btnRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`图表「${title}」操作`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div ref={menuRef} role="menu" aria-label="图表操作" className="claw-solid absolute right-0 top-full z-20 mt-1 w-28 rounded-lg border border-slate-200 p-1 shadow-lg">
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center rounded px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                编辑
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex w-full items-center rounded px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                删除
              </button>
            </div>
          )}
        </div>
      </div>
      {body}
    </div>
  );
}

// ---- 配置面板（行内表单卡） ---------------------------------------------------

function ChartEditor({
  initial,
  isNew,
  schema,
  onSave,
  onCancel,
}: {
  initial: ChartConfig;
  isNew: boolean;
  schema: Field[];
  onSave: (chart: ChartConfig) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ChartConfig>(initial);
  const patch = (p: Partial<ChartConfig>) => setDraft((d) => ({ ...d, ...p }));

  const needsValue = draft.agg !== "count" && draft.agg !== "none";
  const valueFields =
    draft.agg === "checked"
      ? schema.filter((f) => f.type === "checkbox")
      : ["sum", "avg", "min", "max"].includes(draft.agg)
        ? schema.filter((f) => NUMERIC_TYPES.has(f.type))
        : schema;
  const valueOk = !needsValue || valueFields.some((f) => f.id === draft.valueFieldId);
  const groupOk = draft.kind === "stat" || !!draft.fieldId;
  const canSave = groupOk && valueOk;

  return (
    <div className="claw-solid rounded-xl border border-blue-200 p-4 shadow-sm" role="form" aria-label={isNew ? "添加图表" : "编辑图表"}>
      <div className="mb-3 text-sm font-semibold text-slate-800">{isNew ? "添加图表" : "编辑图表"}</div>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">标题</span>
          <input
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="图表标题"
            className={cn(CONTROL_CLS, "w-full")}
          />
        </label>

        <div>
          <span className="mb-1 block text-xs text-slate-400">类型</span>
          <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="图表类型">
            {CHART_KINDS.map((k) => (
              <button
                key={k.kind}
                type="button"
                role="radio"
                aria-checked={draft.kind === k.kind}
                onClick={() => patch({ kind: k.kind })}
                className={cn(
                  "h-9 rounded-lg border text-xs transition-colors",
                  draft.kind === k.kind ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">分组字段</span>
          <CondSelect value={draft.fieldId ?? ""} onChange={(e) => patch({ fieldId: e.target.value || null })} className="w-full" aria-label="图表分组字段">
            <option value="">全表（仅统计数字）</option>
            {schema.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </CondSelect>
          {!groupOk && <span className="mt-1 block text-xs text-amber-600">该类型需要选择分组字段</span>}
        </label>

        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs text-slate-400">聚合方式</span>
            <CondSelect value={draft.agg} onChange={(e) => patch({ agg: e.target.value as AggType })} className="w-full" aria-label="图表聚合方式">
              {AGG_CHOICES.map((a) => (
                <option key={a} value={a}>
                  {AGG_LABELS[a]}
                </option>
              ))}
            </CondSelect>
          </label>
          {needsValue && (
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-xs text-slate-400">数值字段</span>
              <CondSelect value={draft.valueFieldId ?? ""} onChange={(e) => patch({ valueFieldId: e.target.value || null })} className="w-full" aria-label="图表数值字段">
                <option value="">—</option>
                {valueFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </CondSelect>
            </label>
          )}
        </div>
        {needsValue && !valueOk && <p className="text-xs text-amber-600">请选择该聚合方式适用的字段</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 transition-colors hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => onSave(draft)}
            className="h-9 rounded-lg bg-blue-600 px-3 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- 视图主体 ----------------------------------------------------------------

export function DashboardView({
  table,
  view,
  rows,
  ctx,
  onPatchView,
}: {
  table: Table;
  view: View;
  rows: Row[];
  ctx: BitableContext;
  onPatchView: (patch: Partial<View>) => void;
}) {
  const schema = table.schema;
  const charts = view.charts ?? [];
  // draft 为当前编辑的初始快照：id 命中已有图表 = 编辑，否则 = 新增。
  const [draft, setDraft] = useState<ChartConfig | null>(null);
  const isNewDraft = draft !== null && !charts.some((c) => c.id === draft.id);

  const newChart = (): ChartConfig => ({
    id: newId("cht"),
    title: "",
    kind: "bar",
    fieldId: (schema.find((f) => f.type === "select") ?? schema[0])?.id ?? null,
    valueFieldId: null,
    agg: "count",
  });

  const save = (chart: ChartConfig) => {
    const exists = charts.some((c) => c.id === chart.id);
    onPatchView({ charts: exists ? charts.map((c) => (c.id === chart.id ? chart : c)) : [...charts, chart] });
    setDraft(null);
  };

  const remove = async (chart: ChartConfig) => {
    const ok = await confirm({ title: `删除图表「${chart.title || "未命名图表"}」？`, danger: true });
    if (!ok) return;
    if (draft?.id === chart.id) setDraft(null);
    onPatchView({ charts: charts.filter((c) => c.id !== chart.id) });
  };

  if (charts.length === 0 && !draft) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
        <div className="claw-solid flex flex-col items-center gap-3 rounded-xl border border-slate-200 px-10 py-8 text-center shadow-sm">
          <BarChart3 className="h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">还没有图表 — 添加第一个图表</p>
          <button
            type="button"
            onClick={() => setDraft(newChart())}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> 添加图表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {charts.map((chart) =>
          draft && !isNewDraft && draft.id === chart.id ? (
            <ChartEditor key={chart.id} initial={draft} isNew={false} schema={schema} onSave={save} onCancel={() => setDraft(null)} />
          ) : (
            <ChartCard
              key={chart.id}
              chart={chart}
              schema={schema}
              rows={rows}
              ctx={ctx}
              onEdit={() => setDraft({ ...chart })}
              onDelete={() => void remove(chart)}
            />
          ),
        )}
        {draft && isNewDraft && <ChartEditor key={draft.id} initial={draft} isNew schema={schema} onSave={save} onCancel={() => setDraft(null)} />}
        {!draft && (
          <button
            type="button"
            onClick={() => setDraft(newChart())}
            className="flex min-h-[160px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-600"
          >
            <Plus className="h-4 w-4" /> 添加图表
          </button>
        )}
      </div>
    </div>
  );
}
