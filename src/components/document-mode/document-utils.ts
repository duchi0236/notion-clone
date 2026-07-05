import type { DocNode, DocumentRecord, TocItem } from "./document-types";

export function htmlToText(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function mapDocument(input: any): DocumentRecord {
  const html = input.contentHtml ?? input.html ?? "<h1>Untitled</h1><p></p>";
  return {
    id: input.id,
    title: input.title ?? "Untitled",
    icon: input.icon ?? "📄",
    contentHtml: html,
    contentText: input.contentText ?? input.text ?? htmlToText(html),
    summary: input.summary ?? null,
    tags: Array.isArray(input.tags) ? input.tags : [],
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    status: input.status,
    parentId: input.parentId ?? null,
  };
}

export function buildTree(documents: DocumentRecord[]): DocNode[] {
  const nodes = new Map<string, DocNode>();
  for (const doc of documents) {
    nodes.set(doc.id, {
      id: doc.id,
      title: doc.title,
      icon: doc.icon,
      parentId: doc.parentId,
      children: [],
    });
  }

  const roots: DocNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children?.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function extractToc(html: string): TocItem[] {
  const toc: TocItem[] = [];
  const headingRegex = /<h([1-3])[^>]*>(.*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html))) {
    const level = Number(match[1]);
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    toc.push({
      id: text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-\u4e00-\u9fa5]/g, ""),
      level,
      text,
    });
  }
  return toc;
}

export async function api<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
