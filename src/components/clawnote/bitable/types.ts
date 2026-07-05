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
  | "modifiedTime"
  | "attachment" // 附件：[{name,url,size,mime}]
  | "createdBy" // 创建人（行元数据，只读）
  | "modifiedBy"; // 修改人（行元数据，只读）

export type AttachmentValue = { name: string; url: string; size: number; mime: string };

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

export type ViewType = "grid" | "kanban" | "gallery" | "form" | "calendar" | "gantt" | "dashboard";

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

// 高级筛选：与/或 组合的嵌套条件组（groups 允许递归，UI 提供两层）
export type FilterGroup = {
  id: string;
  combinator: "and" | "or";
  conditions: Filter[];
  groups?: FilterGroup[];
};

// 条件格式：命中 when 的行（或行的某一列）着色。color 取 OPTION_COLORS 键。
export type FormatRule = {
  id: string;
  name?: string;
  when: FilterGroup;
  scope: "row" | "cell";
  fieldId?: string | null; // scope=cell 时作用的列
  color: string;
};

// 仪表盘图表：按 fieldId 分组，对 valueFieldId 做 agg 聚合（count 时无需 valueFieldId）
export type ChartKind = "bar" | "pie" | "line" | "stat";
export type ChartConfig = {
  id: string;
  title: string;
  kind: ChartKind;
  fieldId: string | null; // 分组字段（stat 可为空 = 全表）
  valueFieldId?: string | null;
  agg: AggType;
};

// 轻量自动化：客户端在行创建/字段变更后执行动作
export type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  trigger:
    | { type: "rowCreated" }
    | { type: "fieldEquals"; fieldId: string; value: unknown };
  action: { type: "setField"; fieldId: string; value: unknown };
};

export type View = {
  id: string;
  name: string;
  type: ViewType;
  hiddenFieldIds?: string[];
  filters?: Filter[]; // 旧版扁平筛选（向后兼容；编辑时迁移进 filterGroup）
  filterGroup?: FilterGroup | null; // 高级筛选（与/或嵌套）
  formats?: FormatRule[]; // 条件格式
  sorts?: Sort[];
  groupFieldId?: string | null; // kanban grouping (a select field)
  rowGroupFieldId?: string | null; // grid 行分组字段
  coverFieldId?: string | null; // gallery cover
  aggregations?: Record<string, AggType>; // grid 列汇总：fieldId -> 聚合方式
  dateFieldId?: string | null; // calendar / gantt 起始日期字段
  endDateFieldId?: string | null; // gantt 结束日期字段
  charts?: ChartConfig[]; // dashboard 图表
};

export type Row = {
  id: string;
  data: Record<string, unknown>;
  sortIndex: number;
  // 行元数据（服务端写入；createdBy/modifiedBy 字段与评论/历史展示用）
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Table = {
  id: string;
  name: string;
  icon: string;
  schema: Field[];
  views: View[];
  rows: Row[];
  automations?: Automation[];
};

export type RowComment = { id: string; author: string; body: string; createdAt: string };
export type RowRevision = { id: string; author: string | null; diff: Record<string, { from: unknown; to: unknown }>; createdAt: string };

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
