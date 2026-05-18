export type FieldType = "text" | "select" | "date" | "number" | "people" | "checkbox";

export type FieldSchema = {
  id: string;
  name: string;
  type: FieldType;
  options?: string[];
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
