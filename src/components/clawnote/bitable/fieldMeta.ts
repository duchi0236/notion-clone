import type { BitableContext, Field, Filter, FilterOp, Row, SelectOption, Sort } from "./types";

// Option color palette for select / multiSelect chips.
export const OPTION_COLORS: Record<string, { chip: string; dot: string }> = {
  gray: { chip: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  red: { chip: "bg-red-100 text-red-700", dot: "bg-red-500" },
  orange: { chip: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  yellow: { chip: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  green: { chip: "bg-green-100 text-green-700", dot: "bg-green-500" },
  teal: { chip: "bg-teal-100 text-teal-700", dot: "bg-teal-500" },
  blue: { chip: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  purple: { chip: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  pink: { chip: "bg-pink-100 text-pink-700", dot: "bg-pink-500" },
};
export const OPTION_COLOR_KEYS = Object.keys(OPTION_COLORS);

export function optionColor(name: string) {
  return OPTION_COLORS[name] ?? OPTION_COLORS.gray;
}

export function findOption(field: Field, id: unknown): SelectOption | undefined {
  return field.options?.find((o) => o.id === id);
}

export function emptyValue(field: Field): unknown {
  switch (field.type) {
    case "checkbox":
      return false;
    case "multiSelect":
    case "link":
      return [];
    case "number":
    case "currency":
    case "rating":
    case "progress":
      return null;
    default:
      return "";
  }
}

// Display string used by kanban/gallery/form/export (not the rich grid cell).
export function formatValue(field: Field, value: unknown, ctx?: BitableContext): string {
  if (value === null || value === undefined || value === "") return "";
  switch (field.type) {
    case "select": {
      return findOption(field, value)?.name ?? "";
    }
    case "multiSelect": {
      const ids = Array.isArray(value) ? value : [];
      return ids.map((id) => findOption(field, id)?.name ?? "").filter(Boolean).join(", ");
    }
    case "checkbox":
      return value ? "✓" : "";
    case "date":
      return typeof value === "string" ? value : "";
    case "rating":
      return "★".repeat(Number(value) || 0);
    case "progress":
      return `${Math.round(Number(value) || 0)}%`;
    case "currency":
      return `${field.symbol ?? "¥"}${Number(value).toFixed(field.precision ?? 2)}`;
    case "number": {
      const p = field.precision;
      return p != null ? Number(value).toFixed(p) : String(value);
    }
    case "link": {
      const ids = Array.isArray(value) ? value : [];
      if (!ctx || !field.linkTableId) return `${ids.length} 条`;
      return ids.map((id) => ctx.primaryValue(field.linkTableId as string, String(id))).filter(Boolean).join(", ");
    }
    default:
      return String(value);
  }
}

// Resolve a lookup field's value by reading linked records' target field.
export function lookupValue(field: Field, row: Row, schema: Field[], ctx: BitableContext): string {
  if (!field.lookup) return "";
  const linkField = schema.find((f) => f.id === field.lookup?.linkFieldId);
  if (!linkField?.linkTableId) return "";
  const linkedIds = (row.data[linkField.id] as unknown[]) ?? [];
  const target = ctx.tablesById[linkField.linkTableId];
  if (!target) return "";
  const targetField = target.schema.find((f) => f.id === field.lookup?.targetFieldId);
  if (!targetField) return "";
  return linkedIds
    .map((id) => {
      const r = target.rows.find((x) => x.id === id);
      return r ? formatValue(targetField, r.data[targetField.id], ctx) : "";
    })
    .filter(Boolean)
    .join(", ");
}

export const FILTER_OPS: { value: FilterOp; label: string }[] = [
  { value: "is", label: "等于" },
  { value: "isNot", label: "不等于" },
  { value: "contains", label: "包含" },
  { value: "notContains", label: "不包含" },
  { value: "gt", label: "大于" },
  { value: "lt", label: "小于" },
  { value: "gte", label: "大于等于" },
  { value: "lte", label: "小于等于" },
  { value: "empty", label: "为空" },
  { value: "notEmpty", label: "不为空" },
];

function isEmpty(value: unknown) {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

export function matchFilter(field: Field, value: unknown, filter: Filter): boolean {
  const op = filter.op;
  if (op === "empty") return isEmpty(value);
  if (op === "notEmpty") return !isEmpty(value);

  const fv = filter.value;
  const text = formatValue(field, value).toLowerCase();
  const ftext = String(fv ?? "").toLowerCase();

  switch (op) {
    case "is":
      if (field.type === "select") return value === fv;
      if (field.type === "checkbox") return Boolean(value) === Boolean(fv);
      return text === ftext;
    case "isNot":
      if (field.type === "select") return value !== fv;
      return text !== ftext;
    case "contains":
      return text.includes(ftext);
    case "notContains":
      return !text.includes(ftext);
    case "gt":
      return Number(value) > Number(fv);
    case "lt":
      return Number(value) < Number(fv);
    case "gte":
      return Number(value) >= Number(fv);
    case "lte":
      return Number(value) <= Number(fv);
    default:
      return true;
  }
}

export function compareValues(field: Field, a: unknown, b: unknown): number {
  const numeric = ["number", "currency", "rating", "progress"].includes(field.type);
  if (numeric) return (Number(a) || 0) - (Number(b) || 0);
  if (field.type === "checkbox") return (a ? 1 : 0) - (b ? 1 : 0);
  return formatValue(field, a).localeCompare(formatValue(field, b), "zh-CN");
}

// Apply a view's filters + sorts to a table's rows.
export function applyView(rows: Row[], schema: Field[], filters: Filter[], sorts: Sort[], search: string): Row[] {
  const byId = new Map(schema.map((f) => [f.id, f]));
  let out = rows;

  if (filters.length) {
    out = out.filter((row) =>
      filters.every((flt) => {
        const f = byId.get(flt.fieldId);
        return f ? matchFilter(f, row.data[flt.fieldId], flt) : true;
      }),
    );
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    out = out.filter((row) => schema.some((f) => formatValue(f, row.data[f.id]).toLowerCase().includes(q)));
  }

  if (sorts.length) {
    out = [...out].sort((ra, rb) => {
      for (const s of sorts) {
        const f = byId.get(s.fieldId);
        if (!f) continue;
        const cmp = compareValues(f, ra.data[s.fieldId], rb.data[s.fieldId]);
        if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
      }
      return ra.sortIndex - rb.sortIndex;
    });
  }

  return out;
}
