// Excel/CSV 导入导出工具（#20）。导出走 formatValue 的展示字符串；
// 导入只做解析（表头 + 字符串记录），字段映射与建行由调用方（BitableApp）负责。

import * as XLSX from "xlsx";
import type { BitableContext, Field, Row } from "./types";
import { cellValue, formatValue } from "./fieldMeta";

/** 把当前视图的行导出为 .xlsx 并触发下载。列 = 传入 schema（调用方只传可见字段）。 */
export function exportRowsToXlsx(fileName: string, schema: Field[], rows: Row[], ctx?: BitableContext): void {
  const headers = schema.map((f) => f.name);
  const body = rows.map((row) => schema.map((f) => formatValue(f, cellValue(f, row), ctx)));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
  ws["!cols"] = schema.map((f) => ({ wch: Math.min(40, Math.max(10, f.name.length * 2 + 4)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}

/**
 * 解析导入文件（.xlsx / .xls / .csv）：取第一张 sheet，第一行为表头，
 * 其余行转为 { 表头: 字符串值 } 记录（全空行跳过，空表头列忽略）。
 */
export async function parseImportFile(file: File): Promise<{ headers: string[]; records: Record<string, string>[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("文件中没有工作表");
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, raw: false, defval: "" });
  const headerRow = (aoa[0] ?? []).map((h) => String(h ?? "").trim());
  const headers = headerRow.filter(Boolean);
  if (!headers.length) throw new Error("未识别到表头（第一行为空）");

  const records: Record<string, string>[] = [];
  for (const cells of aoa.slice(1)) {
    const rec: Record<string, string> = {};
    let hasValue = false;
    headerRow.forEach((h, i) => {
      if (!h) return;
      const v = String(cells[i] ?? "").trim();
      rec[h] = v;
      if (v) hasValue = true;
    });
    if (hasValue) records.push(rec);
  }
  return { headers, records };
}
