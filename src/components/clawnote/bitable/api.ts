import { api } from "../pro/api";
import type { BaseSummary, Field, Row, Table, View } from "./types";

export const bitableApi = {
  listBases: () => api<{ bases: BaseSummary[] }>("/api/bitable/bases"),
  createBase: (name: string) =>
    api<{ base: BaseSummary }>("/api/bitable/bases", { method: "POST", body: JSON.stringify({ name }) }),
  getBase: (id: string) => api<{ base: { id: string; name: string; icon: string; tables: Table[] } }>(`/api/bitable/bases/${id}`),
  updateBase: (id: string, patch: { name?: string; icon?: string }) =>
    api<{ base: BaseSummary }>(`/api/bitable/bases/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteBase: (id: string) => api(`/api/bitable/bases/${id}`, { method: "DELETE" }),

  createTable: (baseId: string, name?: string) =>
    api<{ table: Table }>("/api/bitable/tables", { method: "POST", body: JSON.stringify({ baseId, name }) }),
  updateTable: (id: string, patch: { name?: string; icon?: string; schema?: Field[]; views?: View[] }) =>
    api<{ table: Table }>(`/api/bitable/tables/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTable: (id: string) => api(`/api/bitable/tables/${id}`, { method: "DELETE" }),

  createRow: (tableId: string, data: Record<string, unknown>) =>
    api<{ row: Row }>("/api/bitable/rows", { method: "POST", body: JSON.stringify({ tableId, data }) }),
  updateRow: (id: string, patch: { data?: Record<string, unknown>; sortIndex?: number }) =>
    api<{ row: Row }>(`/api/bitable/rows/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteRow: (id: string) => api(`/api/bitable/rows/${id}`, { method: "DELETE" }),
};
