export type DocNode = {
  id: string;
  title: string;
  icon?: string;
  parentId?: string | null;
  children?: DocNode[];
};

export type DocumentRecord = {
  id: string;
  title: string;
  icon: string;
  contentHtml: string;
  contentText: string;
  summary?: string | null;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  status?: string;
  parentId?: string | null;
};

export type TocItem = {
  id: string;
  level: number;
  text: string;
};
