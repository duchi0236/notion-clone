export async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function htmlToText(html: string) {
  // 先移除 head/style/script 整块内容，避免 CSS/JS 源码被当正文提取进摘要。
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarize(value: string, max = 140) {
  if (!value) return "暂无摘要";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// 无标题文档在树/面包屑里回退显示正文摘要，避免满屏「无标题」。
export function docDisplayTitle(doc: { title: string; text?: string }) {
  const title = (doc.title || "").trim();
  if (title && title !== "无标题") return title;
  const snippet = (doc.text || "").trim().replace(/\s+/g, " ").slice(0, 16);
  return snippet || "无标题";
}
