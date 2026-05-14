export type View = "docs" | "tasks" | "inbox" | "memory" | "templates" | "files" | "tokens";
export type TaskView = "table" | "board" | "gallery" | "calendar";

export type Doc = {
  id: string;
  title: string;
  icon: string;
  html: string;
  text: string;
  summary: string;
  tags: string[];
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
