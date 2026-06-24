// 飞书风格公式：安全表达式求值（自写 tokenizer + 调度场算法，绝不使用 eval/Function）。
// 字段引用用 {字段名}；支持 + - * / % ^、& 字符串拼接、比较、AND/OR/NOT，
// 以及函数 IF/SUM/AVG/MIN/MAX/ROUND/ABS/LEN/CONCAT/LOWER/UPPER/TRIM/COUNT。

import type { AggType, Field, Row } from "./types";

type Val = number | string | boolean | null;

// 把某字段的存储值转成公式可用的标量（数字/字符串/布尔）
export function fieldScalar(field: Field, value: unknown): Val {
  switch (field.type) {
    case "number":
    case "currency":
    case "rating":
    case "progress":
    case "autoNumber":
      return value === null || value === undefined || value === "" ? null : Number(value);
    case "checkbox":
      return Boolean(value);
    case "select": {
      const opt = field.options?.find((o) => o.id === value);
      return opt ? opt.name : value ? String(value) : null;
    }
    case "multiSelect": {
      const ids = Array.isArray(value) ? value : [];
      return ids.map((id) => field.options?.find((o) => o.id === id)?.name ?? String(id)).join(", ");
    }
    default:
      return value === null || value === undefined ? null : String(value);
  }
}

// ---- Tokenizer -------------------------------------------------------------
type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "ref"; v: string }
  | { t: "op"; v: string }
  | { t: "paren"; v: "(" | ")" }
  | { t: "comma" }
  | { t: "ident"; v: string };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const ops = ["<=", ">=", "!=", "<>", "&&", "||", "==", "+", "-", "*", "/", "%", "^", "&", "=", "<", ">"];
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (c === "{") {
      const end = src.indexOf("}", i);
      if (end < 0) throw new Error("字段引用未闭合");
      toks.push({ t: "ref", v: src.slice(i + 1, end).trim() });
      i = end + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1; let s = "";
      while (j < src.length && src[j] !== c) { s += src[j]; j++; }
      toks.push({ t: "str", v: s });
      i = j + 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i; let s = "";
      while (j < src.length && /[0-9.]/.test(src[j])) { s += src[j]; j++; }
      toks.push({ t: "num", v: Number(s) });
      i = j;
      continue;
    }
    if (c === "(") { toks.push({ t: "paren", v: "(" }); i++; continue; }
    if (c === ")") { toks.push({ t: "paren", v: ")" }); i++; continue; }
    if (c === ",") { toks.push({ t: "comma" }); i++; continue; }
    const op = ops.find((o) => src.startsWith(o, i));
    if (op) { toks.push({ t: "op", v: op === "<>" ? "!=" : op === "=" ? "==" : op }); i += op.length; continue; }
    if (/[A-Za-z_一-龥]/.test(c)) {
      let j = i; let s = "";
      while (j < src.length && /[A-Za-z0-9_一-龥]/.test(src[j])) { s += src[j]; j++; }
      toks.push({ t: "ident", v: s });
      i = j;
      continue;
    }
    throw new Error(`无法识别的字符: ${c}`);
  }
  return toks;
}

const PREC: Record<string, number> = {
  "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, ">": 4, "<=": 4, ">=": 4,
  "&": 5, "+": 6, "-": 6, "*": 7, "/": 7, "%": 7, "^": 8,
};

// ---- Shunting-yard → RPN ---------------------------------------------------
type RPN = (Tok | { t: "call"; name: string; argc: number })[];

function toRPN(toks: Tok[]): RPN {
  const out: RPN = [];
  const stack: (Tok | { t: "func"; name: string })[] = [];
  const argc: number[] = [];
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    if (tk.t === "num" || tk.t === "str" || tk.t === "ref") { out.push(tk); continue; }
    if (tk.t === "ident") {
      const next = toks[k + 1];
      if (next && next.t === "paren" && next.v === "(") { stack.push({ t: "func", name: tk.v.toUpperCase() }); continue; }
      // 裸标识符当作 TRUE/FALSE 或字符串字面量
      const up = tk.v.toUpperCase();
      if (up === "TRUE") out.push({ t: "num", v: 1 });
      else if (up === "FALSE") out.push({ t: "num", v: 0 });
      else out.push({ t: "str", v: tk.v });
      continue;
    }
    if (tk.t === "comma") {
      while (stack.length && !(stack[stack.length - 1].t === "paren")) out.push(stack.pop() as Tok);
      if (argc.length) argc[argc.length - 1]++;
      continue;
    }
    if (tk.t === "op") {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.t === "op" && PREC[top.v] >= PREC[tk.v]) out.push(stack.pop() as Tok);
        else break;
      }
      stack.push(tk);
      continue;
    }
    if (tk.t === "paren" && tk.v === "(") {
      stack.push(tk);
      const prev = toks[k - 1];
      if (prev && prev.t === "ident") argc.push(1);
      continue;
    }
    if (tk.t === "paren" && tk.v === ")") {
      while (stack.length && stack[stack.length - 1].t !== "paren") out.push(stack.pop() as Tok);
      stack.pop(); // 弹出 "("
      const top = stack[stack.length - 1];
      if (top && top.t === "func") {
        stack.pop();
        out.push({ t: "call", name: top.name, argc: argc.pop() ?? 0 });
      }
      continue;
    }
  }
  while (stack.length) out.push(stack.pop() as Tok);
  return out;
}

function num(v: Val): number { return typeof v === "number" ? v : typeof v === "boolean" ? (v ? 1 : 0) : Number(v) || 0; }
function str(v: Val): string { return v === null ? "" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v); }
function bool(v: Val): boolean { return typeof v === "boolean" ? v : typeof v === "number" ? v !== 0 : !!v && v !== "0"; }

function toDate(v: Val): Date | null {
  if (v === null || v === "") return null;
  const d = new Date(typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v + "T00:00:00" : (v as string));
  return isNaN(d.getTime()) ? null : d;
}
function dstr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtDate(d: Date, pattern: string): string {
  const p2 = (n: number) => String(n).padStart(2, "0");
  return pattern
    .replace(/YYYY/g, String(d.getFullYear()))
    .replace(/MM/g, p2(d.getMonth() + 1))
    .replace(/DD/g, p2(d.getDate()))
    .replace(/HH/g, p2(d.getHours()))
    .replace(/mm/g, p2(d.getMinutes()))
    .replace(/ss/g, p2(d.getSeconds()));
}
const DAY_MS = 86400000;

const FUNCS: Record<string, (a: Val[]) => Val> = {
  // 逻辑
  IF: (a) => (bool(a[0]) ? a[1] ?? null : a[2] ?? null),
  IFS: (a) => { for (let i = 0; i + 1 < a.length; i += 2) if (bool(a[i])) return a[i + 1]; return null; },
  SWITCH: (a) => { const x = a[0]; for (let i = 1; i + 1 < a.length; i += 2) if (str(a[i]) === str(x) || num(a[i]) === num(x)) return a[i + 1]; return a.length % 2 === 0 ? a[a.length - 1] : null; },
  AND: (a) => a.every(bool),
  OR: (a) => a.some(bool),
  NOT: (a) => !bool(a[0]),
  XOR: (a) => a.filter(bool).length % 2 === 1,
  ISBLANK: (a) => a[0] === null || a[0] === "" || a[0] === undefined,
  BLANK: () => null,
  TRUE: () => true,
  FALSE: () => false,
  // 数学
  SUM: (a) => a.reduce<number>((s, x) => s + num(x), 0),
  PRODUCT: (a) => a.reduce<number>((s, x) => s * num(x), 1),
  AVG: (a) => (a.length ? a.reduce<number>((s, x) => s + num(x), 0) / a.length : 0),
  AVERAGE: (a) => (a.length ? a.reduce<number>((s, x) => s + num(x), 0) / a.length : 0),
  MIN: (a) => Math.min(...a.map(num)),
  MAX: (a) => Math.max(...a.map(num)),
  ROUND: (a) => { const p = a[1] != null ? num(a[1]) : 0; const m = 10 ** p; return Math.round(num(a[0]) * m) / m; },
  CEILING: (a) => Math.ceil(num(a[0])),
  FLOOR: (a) => Math.floor(num(a[0])),
  INT: (a) => Math.trunc(num(a[0])),
  ABS: (a) => Math.abs(num(a[0])),
  MOD: (a) => num(a[0]) % num(a[1]),
  POWER: (a) => num(a[0]) ** num(a[1]),
  SQRT: (a) => Math.sqrt(num(a[0])),
  VALUE: (a) => num(a[0]),
  COUNT: (a) => a.filter((x) => x !== null && x !== "").length,
  COUNTA: (a) => a.filter((x) => x !== null && x !== "").length,
  // 文本
  LEN: (a) => str(a[0]).length,
  CONCAT: (a) => a.map(str).join(""),
  CONCATENATE: (a) => a.map(str).join(""),
  LOWER: (a) => str(a[0]).toLowerCase(),
  UPPER: (a) => str(a[0]).toUpperCase(),
  TRIM: (a) => str(a[0]).trim(),
  LEFT: (a) => str(a[0]).slice(0, Math.max(0, num(a[1] ?? 1))),
  RIGHT: (a) => { const n = Math.max(0, num(a[1] ?? 1)); return n === 0 ? "" : str(a[0]).slice(-n); },
  MID: (a) => str(a[0]).slice(Math.max(0, num(a[1]) - 1), Math.max(0, num(a[1]) - 1) + num(a[2])),
  FIND: (a) => { const i = str(a[1]).indexOf(str(a[0])); return i < 0 ? 0 : i + 1; },
  REPLACE: (a) => { const s = str(a[0]); const start = num(a[1]) - 1; return s.slice(0, start) + str(a[3]) + s.slice(start + num(a[2])); },
  SUBSTITUTE: (a) => str(a[0]).split(str(a[1])).join(str(a[2])),
  REPT: (a) => str(a[0]).repeat(Math.max(0, num(a[1]))),
  T: (a) => str(a[0]),
  // 日期
  TODAY: () => dstr(new Date()),
  NOW: () => fmtDate(new Date(), "YYYY-MM-DD HH:mm:ss"),
  YEAR: (a) => { const d = toDate(a[0]); return d ? d.getFullYear() : null; },
  MONTH: (a) => { const d = toDate(a[0]); return d ? d.getMonth() + 1 : null; },
  DAY: (a) => { const d = toDate(a[0]); return d ? d.getDate() : null; },
  HOUR: (a) => { const d = toDate(a[0]); return d ? d.getHours() : null; },
  WEEKDAY: (a) => { const d = toDate(a[0]); return d ? d.getDay() : null; },
  DATE: (a) => dstr(new Date(num(a[0]), num(a[1]) - 1, num(a[2]))),
  DATEDIF: (a) => {
    const s = toDate(a[0]); const e = toDate(a[1]); if (!s || !e) return null;
    const unit = str(a[2] ?? "D").toUpperCase();
    const days = Math.round((e.getTime() - s.getTime()) / DAY_MS);
    if (unit === "D") return days;
    if (unit === "W") return Math.floor(days / 7);
    if (unit === "M") return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (unit === "Y") return e.getFullYear() - s.getFullYear();
    return days;
  },
  DATESTR: (a) => { const d = toDate(a[0]); return d ? dstr(d) : ""; },
  DATETIME_FORMAT: (a) => { const d = toDate(a[0]); return d ? fmtDate(d, str(a[1] ?? "YYYY-MM-DD")) : ""; },
};

function evalRPN(rpn: RPN, refValue: (name: string) => Val): Val {
  const st: Val[] = [];
  for (const tk of rpn) {
    if (tk.t === "num") st.push(tk.v);
    else if (tk.t === "str") st.push(tk.v);
    else if (tk.t === "ref") st.push(refValue(tk.v));
    else if (tk.t === "call") {
      const args = st.splice(st.length - tk.argc, tk.argc);
      const fn = FUNCS[tk.name];
      if (!fn) throw new Error(`未知函数 ${tk.name}`);
      st.push(fn(args));
    } else if (tk.t === "op") {
      const b = st.pop() as Val; const a = st.pop() as Val;
      switch (tk.v) {
        case "+": st.push(num(a) + num(b)); break;
        case "-": st.push(num(a) - num(b)); break;
        case "*": st.push(num(a) * num(b)); break;
        case "/": st.push(num(b) === 0 ? 0 : num(a) / num(b)); break;
        case "%": st.push(num(a) % num(b)); break;
        case "^": st.push(num(a) ** num(b)); break;
        case "&": st.push(str(a) + str(b)); break;
        case "==": st.push(typeof a === "string" || typeof b === "string" ? str(a) === str(b) : num(a) === num(b)); break;
        case "!=": st.push(typeof a === "string" || typeof b === "string" ? str(a) !== str(b) : num(a) !== num(b)); break;
        case "<": st.push(num(a) < num(b)); break;
        case ">": st.push(num(a) > num(b)); break;
        case "<=": st.push(num(a) <= num(b)); break;
        case ">=": st.push(num(a) >= num(b)); break;
        case "&&": st.push(bool(a) && bool(b)); break;
        case "||": st.push(bool(a) || bool(b)); break;
      }
    }
  }
  return st.length ? st[st.length - 1] : null;
}

// 计算一个公式字段在某行的值。ref 解析按「字段名」匹配，公式互引用带深度保护。
export function evalFormula(
  field: Field,
  row: Row,
  schema: Field[],
  seen: Set<string> = new Set(),
): Val {
  if (!field.formula?.trim()) return null;
  if (seen.has(field.id)) return null; // 循环引用保护
  const next = new Set(seen); next.add(field.id);
  try {
    const rpn = toRPN(tokenize(field.formula));
    return evalRPN(rpn, (name) => {
      const ref = schema.find((f) => f.name === name || f.id === name);
      if (!ref) return null;
      if (ref.type === "formula") return evalFormula(ref, row, schema, next);
      return fieldScalar(ref, row.data[ref.id]);
    });
  } catch {
    return null;
  }
}

export function formatFormulaValue(v: Val): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
  return String(v);
}

// ---- 列汇总 / 聚合 ---------------------------------------------------------
export const AGG_LABELS: Record<AggType, string> = {
  none: "无", count: "总数", filled: "已填写", empty: "空值",
  sum: "求和", avg: "平均", min: "最小", max: "最大", checked: "已勾选",
};

// 哪些聚合适用于该字段类型
export function aggOptions(field: Field): AggType[] {
  const numeric = ["number", "currency", "rating", "progress", "autoNumber", "formula"].includes(field.type);
  const base: AggType[] = ["none", "count", "filled", "empty"];
  if (field.type === "checkbox") return [...base, "checked"];
  if (numeric) return [...base, "sum", "avg", "min", "max"];
  return base;
}

export function aggregate(agg: AggType, field: Field, rows: Row[], schema: Field[]): string {
  if (agg === "none") return "";
  const raw = rows.map((r) => (field.type === "formula" ? evalFormula(field, r, schema) : fieldScalar(field, r.data[field.id])));
  const filled = raw.filter((v) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0));
  switch (agg) {
    case "count": return String(rows.length);
    case "filled": return String(filled.length);
    case "empty": return String(rows.length - filled.length);
    case "checked": return String(raw.filter((v) => v === true).length);
    case "sum": return fmtNum(filled.reduce<number>((s, v) => s + num(v), 0));
    case "avg": return filled.length ? fmtNum(filled.reduce<number>((s, v) => s + num(v), 0) / filled.length) : "—";
    case "min": return filled.length ? fmtNum(Math.min(...filled.map(num))) : "—";
    case "max": return filled.length ? fmtNum(Math.max(...filled.map(num))) : "—";
    default: return "";
  }
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}
