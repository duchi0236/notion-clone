"use client";

import { BrainCircuit, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { MindMapBlockData, MindMapNode } from "./types";

function buildTree(nodes: MindMapNode[]) {
  const map = new Map<string, MindMapNode & { children: MindMapNode[] }>();
  nodes.forEach((node) => map.set(node.id, { ...node, children: [] }));

  const roots: (MindMapNode & { children: MindMapNode[] })[] = [];

  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function NodeView({ node, level = 0 }: { node: MindMapNode & { children: MindMapNode[] }; level?: number }) {
  return (
    <div className="relative pl-8">
      {level > 0 && <div className="absolute left-3 top-0 h-full w-px bg-slate-200" />}
      <div className="relative mb-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="h-2 w-2 rounded-full bg-blue-500" />
        <span className="text-sm font-medium text-slate-800">{node.label}</span>
      </div>
      {node.children.length > 0 && (
        <div className="ml-6 border-l border-dashed border-slate-200 pl-5">
          {node.children.map((child) => (
            <NodeView key={child.id} node={child as MindMapNode & { children: MindMapNode[] }} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MindMapBlock({ data }: { data: MindMapBlockData }) {
  const tree = useMemo(() => buildTree(data.nodes), [data.nodes]);
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="my-8 overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-blue-100 px-5 py-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><BrainCircuit className="h-5 w-5 text-blue-600" />{data.title}</h3>
          <p className="mt-1 text-xs text-slate-500">AI Native Mindmap · 文档与知识结构双向联动</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"><Plus className="mr-1 inline h-3.5 w-3.5" />添加节点</button>
          <button className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"><Sparkles className="mr-1 inline h-3.5 w-3.5" />AI 扩展</button>
          <button onClick={() => setExpanded((v) => !v)} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
            {expanded ? "收起" : "展开"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="overflow-auto px-8 py-8">
          <div className="min-w-[720px]">
            {tree.map((root) => (
              <NodeView key={root.id} node={root} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
