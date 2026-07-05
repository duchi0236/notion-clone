"use client";

import { useEffect, useMemo, useState } from "react";
import type { Collection, CollectionRow, DatabaseView, FieldSchema, FieldType } from "./types";

async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

const defaultSchema: FieldSchema[] = [
  { id: "name", name: "名称", type: "text" },
  { id: "status", name: "状态", type: "select", options: ["未开始", "进行中", "已完成"] },
  { id: "owner", name: "负责人", type: "text" },
  { id: "dueDate", name: "截止日期", type: "date" },
  { id: "progress", name: "进度", type: "number" },
];

export function useDatabaseWorkspace() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<DatabaseView>("table");
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");

  async function load() {
    const res = await api<{ collections: Collection[] }>("/api/collections");
    const items = res?.collections ?? [];
    setCollections(items);
    if (!selectedId && items[0]) setSelectedId(items[0].id);
  }

  useEffect(() => { void load(); }, []);

  const selected = useMemo(() => collections.find((item) => item.id === selectedId), [collections, selectedId]);

  const rows = useMemo(() => {
    const base = selected?.rows ?? [];
    const q = filter.trim().toLowerCase();
    const filtered = q ? base.filter((row) => JSON.stringify(row.data).toLowerCase().includes(q)) : base;
    return [...filtered].sort((a, b) => String(a.data?.[sortBy] ?? "").localeCompare(String(b.data?.[sortBy] ?? "")));
  }, [selected?.rows, filter, sortBy]);

  async function createCollection() {
    const res = await api<{ collection: Collection }>("/api/collections", {
      method: "POST",
      body: JSON.stringify({ name: "新数据库", type: "TABLE", schema: defaultSchema }),
    });
    if (res?.collection) {
      await load();
      setSelectedId(res.collection.id);
    }
  }

  async function updateCollection(patch: Partial<Collection>) {
    if (!selected) return;
    const res = await api<{ collection: Collection }>(`/api/collections/${selected.id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    if (res?.collection) await load();
  }

  async function addField(type: FieldType = "text") {
    if (!selected) return;
    const field: FieldSchema = { id: `field_${Date.now()}`, name: "新字段", type, options: type === "select" ? ["未开始", "进行中", "已完成"] : undefined };
    await updateCollection({ schema: [...selected.schema, field] });
  }

  async function updateField(fieldId: string, patch: Partial<FieldSchema>) {
    if (!selected) return;
    const schema = selected.schema.map((field) => field.id === fieldId ? { ...field, ...patch } : field);
    await updateCollection({ schema });
  }

  async function deleteField(fieldId: string) {
    if (!selected) return;
    const schema = selected.schema.filter((field) => field.id !== fieldId);
    await updateCollection({ schema });
  }

  async function createRow() {
    if (!selected) return;
    const data: Record<string, unknown> = {};
    selected.schema.forEach((field) => {
      data[field.id] = field.id === "name" ? "未命名记录" : "";
    });
    await api(`/api/collections/${selected.id}/rows`, { method: "POST", body: JSON.stringify({ data }) });
    await load();
  }

  async function updateRow(row: CollectionRow, data: Record<string, unknown>) {
    await api(`/api/collection-rows/${row.id}`, { method: "PUT", body: JSON.stringify({ data }) });
    await load();
  }

  async function deleteRow(rowId: string) {
    await api(`/api/collection-rows/${rowId}`, { method: "DELETE" });
    await load();
  }

  return { collections, selected, selectedId, setSelectedId, view, setView, filter, setFilter, sortBy, setSortBy, rows, load, createCollection, updateCollection, createRow, updateRow, deleteRow, addField, updateField, deleteField };
}
