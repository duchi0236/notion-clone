export type View = "home" | "docs" | "calendar" | "bitable" | "ai" | "settings";
export type TaskView = "table" | "board" | "gallery" | "calendar";

export type Doc = {
  id: string;
  /** Stable React key: survives the draft→server id swap on create, so the
   *  editor never remounts mid-edit (which would drop cursor/dialogs). */
  clientKey?: string;
  title: string;
  icon: string;
  parentId: string | null;
  sortIndex: number;
  coverImage?: string | null;
  html: string;
  text: string;
  summary: string;
  tags: string[];
  isFavorite: boolean;
  isPublished: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BlockNode = {
  id: string;
  documentId: string;
  type: string;
  content: unknown;
  properties?: unknown;
  sortIndex: number;
  parentBlockId?: string | null;
};

export type PageNode = Doc & { children: PageNode[] };

export type CollectionView = {
  id: string;
  name: string;
  type: "table" | "board" | "list" | "calendar" | "gallery";
  groupBy?: string;
  dateBy?: string;
};

export type PermissionEntry = {
  id: string;
  scope: "workspace" | "space" | "page" | "database" | "view";
  subject: string;
  level: "owner" | "full" | "edit" | "comment" | "view" | "none";
};

export type CommentThread = {
  id: string;
  content: string;
  status: "open" | "resolved";
  blockId?: string | null;
  replies?: CommentThread[];
};

export type AgentMutation = {
  id: string;
  agentName: string;
  status: "pending" | "accepted" | "rejected" | "applied";
  documentIds: string[];
  input: unknown;
  output?: unknown;
  createdAt: string;
};

export type Task = {
  id: string;
  name: string;
  owner: string;
  status: "未开始" | "进行中" | "已完成";
  priority: "低" | "中" | "高";
  progress: number;
  dueDate: string;
};

export type InboxItem = {
  id: string;
  source: string;
  title: string;
  content: string;
};

export type Memory = {
  id: string;
  content: string;
  status: "pending" | "accepted" | "rejected" | "archived";
  confidence: number;
  tags: string[];
};

export type Template = {
  id: string;
  title: string;
  icon: string;
  desc: string;
  html: string;
  tags: string[];
};
