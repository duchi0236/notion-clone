export type MindMapNode = {
  id: string;
  label: string;
  parentId?: string | null;
  summary?: string;
  collapsed?: boolean;
};

export type MindMapEdge = {
  source: string;
  target: string;
};

export type MindMapBlockData = {
  id: string;
  type: "mindmap";
  title: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
};

export function createDefaultMindMap(title = "新脑图"): MindMapBlockData {
  const rootId = `node_${Date.now()}`;
  return {
    id: `mindmap_${Date.now()}`,
    type: "mindmap",
    title,
    nodes: [
      { id: rootId, label: title },
      { id: `${rootId}_1`, label: "核心概念", parentId: rootId },
      { id: `${rootId}_2`, label: "关键问题", parentId: rootId },
      { id: `${rootId}_3`, label: "下一步行动", parentId: rootId },
    ],
    edges: [
      { source: rootId, target: `${rootId}_1` },
      { source: rootId, target: `${rootId}_2` },
      { source: rootId, target: `${rootId}_3` },
    ],
  };
}
