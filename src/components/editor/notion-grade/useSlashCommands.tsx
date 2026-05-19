"use client";

import { AlertCircle, CheckSquare, ChevronRight, Code, Database, Equal, Heading1, Heading2, Heading3, ImageIcon, LayoutPanelLeft, Link2, List, ListOrdered, Minus, Paperclip, Quote, TableIcon } from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { AiCommand, PickerCommand, SlashCommand } from "./types";

export function buildSlashCommands({
  editor,
  onUpload,
  onAiCommand,
  onPickerCommand,
}: {
  editor: Editor | null;
  onUpload: () => void;
  onAiCommand?: (command: AiCommand) => void;
  onPickerCommand?: (command: PickerCommand) => void;
}): SlashCommand[] {
  if (!editor) return [];

  return [
    { id: "p", title: "正文", description: "普通文本段落", keywords: "text paragraph 正文 段落", run: () => editor.chain().focus().setParagraph().run() },
    { id: "h1", title: "一级标题", description: "大章节标题", keywords: "h1 heading title 标题", run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { id: "h2", title: "二级标题", description: "章节标题", keywords: "h2 heading subtitle 标题", run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { id: "h3", title: "三级标题", description: "小节标题", keywords: "h3 heading 标题", run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { id: "todo", title: "待办事项", description: "任务清单", keywords: "todo task checkbox 待办 任务", run: () => editor.chain().focus().toggleTaskList().run() },
    { id: "toggle", title: "折叠块", description: "插入可折叠说明块", keywords: "toggle details collapse 折叠", run: () => editor.chain().focus().insertContent('<details class="notion-toggle" open><summary>折叠标题</summary><p>在这里输入内容...</p></details>').run() },
    { id: "callout", title: "提示块", description: "插入强调提示块", keywords: "callout info warning 提示", run: () => editor.chain().focus().insertContent('<div class="notion-callout"><span>💡</span><p>在这里输入提示内容...</p></div>').run() },
    { id: "columns", title: "双列布局", description: "插入两栏内容区域", keywords: "columns layout multi column 双列 多列", run: () => editor.chain().focus().insertContent('<div class="notion-columns"><div><p>左侧内容...</p></div><div><p>右侧内容...</p></div></div>').run() },
    { id: "bullet", title: "无序列表", description: "项目符号列表", keywords: "bullet list 列表", run: () => editor.chain().focus().toggleBulletList().run() },
    { id: "number", title: "编号列表", description: "有序列表", keywords: "number ordered list 编号", run: () => editor.chain().focus().toggleOrderedList().run() },
    { id: "quote", title: "引用", description: "突出说明内容", keywords: "quote 引用", run: () => editor.chain().focus().toggleBlockquote().run() },
    { id: "code", title: "代码块", description: "插入代码片段", keywords: "code 代码", run: () => editor.chain().focus().toggleCodeBlock().run() },
    { id: "mermaid", title: "Mermaid 图表", description: "插入 mermaid 流程图代码块", keywords: "mermaid diagram graph flowchart 流程图", run: () => editor.chain().focus().insertContent('<pre><code class="language-mermaid">graph TD;\n  A[开始] --> B[处理];\n  B --> C[完成];</code></pre>').run() },
    { id: "math", title: "数学公式", description: "插入 LaTeX 公式块", keywords: "math latex formula 公式 数学", run: () => editor.chain().focus().insertContent('<div class="notion-math">$$ E = mc^2 $$</div>').run() },
    { id: "divider", title: "分割线", description: "插入分割线", keywords: "divider line 分割线", run: () => editor.chain().focus().setHorizontalRule().run() },
    { id: "table", title: "表格", description: "插入 3x3 表格", keywords: "table 表格", run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { id: "database", title: "数据库块", description: "从列表选择并嵌入数据库", keywords: "database collection table db 数据库", run: () => onPickerCommand?.("database") },
    { id: "mention", title: "页面引用", description: "搜索页面并插入引用", keywords: "mention page link reference 页面 引用", run: () => onPickerCommand?.("page-mention") },
    { id: "image", title: "图片链接", description: "插入远程图片", keywords: "image 图片", run: () => { const url = window.prompt("图片 URL"); if (url) editor.chain().focus().setImage({ src: url }).run(); } },
    { id: "upload", title: "上传文件", description: "上传图片、PDF 或附件", keywords: "upload file attachment 上传 附件", run: onUpload },
    { id: "summary", title: "AI 摘要", description: "总结当前文档", keywords: "ai summary 摘要", run: () => onAiCommand?.("summary") },
  ];
}

export const slashCommandIconMap = {
  p: null,
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  todo: CheckSquare,
  toggle: ChevronRight,
  callout: AlertCircle,
  columns: LayoutPanelLeft,
  bullet: List,
  number: ListOrdered,
  quote: Quote,
  code: Code,
  mermaid: Code,
  math: Equal,
  divider: Minus,
  table: TableIcon,
  database: Database,
  mention: Link2,
  image: ImageIcon,
  upload: Paperclip,
};
