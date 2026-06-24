// Bitable (多维表格) domain types. A table's fields live in Collection.schema,
// its views in Collection.views, and records in CollectionRow.data keyed by field id.

export type FieldType =
  | "text"
  | "longText"
  | "number"
  | "select"
  | "multiSelect"
  | "date"
  | "checkbox"
  | "rating"
  | "progress"
  | "person"
  | "url"
  | "email"
  | "phone"
  | "currency"
  | "link" // relation to records in another table
  | "lookup" // pull a field from linked records
  | "formula" // computed from an expression over other fields
  | "autoNumber" // sequential row number
  | "createdTime"
  | "modifiedTime";

export type SelectOption = { id: string; name: string; color: string };

export type Field = {
  id: string;
  name: string;
  type: FieldType;
  primary?: boolean;
  width?: number;
  options?: SelectOption[]; // select / multiSelect
  precision?: number; // number / currency decimal places
  symbol?: string; // currency symbol
  max?: number; // rating max (default 5)
  linkTableId?: string | null; // link: target table id
  lookup?: { linkFieldId: string; targetFieldId: string } | null; // lookup config
  formula?: string; // formula: expression, e.g. {价格} * {数量}
};

export type ViewType = "grid" | "kanban" | "gallery" | "form" | "calendar" | "gantt";

// 列汇总 / 分组小计的聚合方式
export type AggType = "none" | "count" | "filled" | "empty" | "sum" | "avg" | "min" | "max" | "checked";

export type FilterOp =
  | "is"
  | "isNot"
  | "contains"
  | "notContains"
  | "empty"
  | "notEmpty"
  | "gt"
  | "lt"
  | "gte"
  | "lte";

export type Filter = { id: string; fieldId: string; op: FilterOp; value?: unknown };
export type Sort = { fieldId: string; dir: "asc" | "desc" };

export type View = {
  id: string;
  name: string;
  type: ViewType;
  hiddenFieldIds?: string[];
  filters?: Filter[];
  sorts?: Sort[];
  groupFieldId?: string | null; // kanban grouping (a select field)
  rowGroupFieldId?: string | null; // grid 行分组字段
  coverFieldId?: string | null; // gallery cover
  aggregations?: Record<string, AggType>; // grid 列汇总：fieldId -> 聚合方式
  dateFieldId?: string | null; // calendar / gantt 起始日期字段
  endDateFieldId?: string | null; // gantt 结束日期字段
};

export type Row = { id: string; data: Record<string, unknown>; sortIndex: number };

export type Table = {
  id: string;
  name: string;
  icon: string;
  schema: Field[];
  views: View[];
  rows: Row[];
};

export type BaseSummary = { id: string; name: string; icon: string; tables: { id: string; name: string; icon: string }[] };

// Context passed to cell renderers so link/lookup fields can resolve records in
// sibling tables.
export type BitableContext = {
  tablesById: Record<string, Table>;
  primaryValue: (tableId: string, rowId: string) => string;
};

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function primaryField(schema: Field[]): Field {
  return schema.find((f) => f.primary) ?? schema[0];
}
