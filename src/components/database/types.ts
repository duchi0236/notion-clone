export type FieldType = "text" | "select" | "date" | "number" | "people" | "person" | "checkbox" | "relation" | "rollup" | "formula";

export type FieldOption =
  | string
  | {
      id: string;
      name: string;
      color?: string;
    };

export function fieldOptionValue(option: FieldOption): string {
  return typeof option === "string" ? option : option.id;
}

export function fieldOptionLabel(option: FieldOption): string {
  return typeof option === "string" ? option : option.name;
}

export type FieldSchema = {
  id: string;
  name: string;
  type: FieldType;
  options?: FieldOption[];
  relationCollectionId?: string;
  relationFieldId?: string;
  rollupFieldId?: string;
  formula?: string;
};

export type CollectionRow = {
  id: string;
  data: Record<string, unknown>;
  documentId?: string | null;
  sortIndex?: number;
};

export type Collection = {
  id: string;
  name: string;
  icon?: string;
  description?: string | null;
  schema: FieldSchema[];
  views: Array<{ id: string; name: string; type: string; groupBy?: string; dateBy?: string }>;
  rows: CollectionRow[];
};

export type DatabaseView = "table" | "board" | "calendar" | "gallery";
