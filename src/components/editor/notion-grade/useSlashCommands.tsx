"use client";

import { AlertCircle, Bot, CheckSquare, ChevronRight, Code, Database, Equal, Heading1, Heading2, Heading3, Highlighter, ImageIcon, LayoutPanelLeft, Link2, List, ListOrdered, Minus, Paperclip, Quote, Sparkles, TableIcon, TextQuote, Underline } from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { AiCommand, PickerCommand, SlashCommand } from "./types";

export function buildSlashCommands({ editor, onUpload, onAiCommand, onPickerCommand }: { editor: Editor | null; onUpload: () => void; onAiCommand?: (command: AiCommand) => void; onPickerCommand?: (command: PickerCommand) => void }): SlashCommand[] {
  if (!editor) return [];

  return [
    { id: "p", title: "正文", description: "普通文本段落", keywords: "text paragraph 正文 段落", category: "常用", shortcut: "⌘⌥0", run: () => editor.chain().focus().setParagraph().run() },
    { id: "h1", title: "一级标题", description: "用于大章节标题", keywords: "h1 heading title 标题", category: "常用", shortcut: "⌘⌥1", run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { id: "h2", title: "二级标题", description: "用于章节标题", keywords: "h2 heading subtitle 标题", category: "常用", shortcut: "⌘⌥2", run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { id: "h3", title: "三级标题", description: "用于小节标题", keywords: "h3 heading 标题", category: "文本", shortcut: "⌘⌥3", run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { id: "todo", title: "待办事项", description: "可勾选的任务清单", keywords: "todo task checkbox 待办 任务", category: "常用", shortcut: "[]", run: () => editor.chain().focus().toggleTaskList().run() },
    { id: "callout", title: "提示块", description: "适合重点、警告、结论", keywords: "callout info warning 提示", category: "常用", run: () => editor.chain().focus().insertContent('<div class="notion-callout"><span>💡</span><p>在这里输入提示内容...</p></div>').run() },
    { id: "bullet", title: "无序列表", description: "项目符号列表", keywords: "bullet list 列表", category: "清单", shortcut: "- 空格", run: () => editor.chain().focus().toggleBulletList().run() },
    { id: "number", title: "编号列表", description: "有顺序的步骤列表", keywords: "number ordered list 编号", category: "清单", shortcut: "1. 空格", run: () => editor.chain().focus().toggleOrderedList().run() },
    { id: "quote", title: "引用", description: "突出引用和观点", keywords: "quote 引用", category: "文本", shortcut: "> 空格", run: () => editor.chain().focus().toggleBlockquote().run() },
    { id: "toggle", title: "折叠块", description: "收起长说明和补充资料", keywords: "toggle details collapse 折叠", category: "高级", run: () => editor.chain().focus().insertContent('<details class="notion-toggle" open><summary>折叠标题</summary><p>在这里输入内容...</p></details>').run() },
    { id: "columns", title: "双列布局", description: "并排比较两组内容", keywords: "columns layout multi column 双列 多列", category: "高级", run: () => editor.chain().focus().insertContent('<div class="notion-columns"><div><p>左侧内容...</p></div><div><p>右侧内容...</p></div></div>').run() },
    { id: "code", title: "代码块", description: "插入代码片段", keywords: "code 代码", category: "媒体", shortcut: "```", run: () => editor.chain().focus().toggleCodeBlock().run() },
    { id: "divider", title: "分割线", description: "分隔内容段落", keywords: "divider line 分割线", category: "文本", shortcut: "---", run: () => editor.chain().focus().setHorizontalRule().run() },
    { id: "table", title: "表格", description: "插入 3x3 表格", keywords: "table 表格", category: "常用", run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { id: "table-wide", title: "宽表格", description: "插入 5 列任务表", keywords: "table wide 表格 任务表", category: "高级", run: () => editor.chain().focus().insertTable({ rows: 5, cols: 5, withHeaderRow: true }).run() },
    { id: "database", title: "清单嵌入", description: "嵌入任务、项目、客户等清单", keywords: "database collection table db 数据库 清单", category: "高级", run: () => onPickerCommand?.("database") },
    { id: "mention", title: "页面引用", description: "引用另一篇文档", keywords: "mention page link reference 页面 引用", category: "常用", shortcut: "@", run: () => onPickerCommand?.("page-mention") },
    { id: "image", title: "图片链接", description: "插入远程图片", keywords: "image 图片", category: "媒体", run: () => { const url = window.prompt("图片 URL"); if (url) editor.chain().focus().setImage({ src: url }).run(); } },
    { id: "upload", title: "上传附件", description: "上传图片、PDF 或附件", keywords: "upload file attachment 上传 附件", category: "媒体", run: onUpload },
    { id: "mermaid", title: "Mermaid 图表", description: "插入流程图代码块", keywords: "mermaid diagram graph flowchart 流程图", category: "高级", run: () => editor.chain().focus().insertContent('<pre><code class="language-mermaid">graph TD;\n  A[开始] --> B[处理];\n  B --> C[完成];</code></pre>').run() },
    { id: "math", title: "数学公式", description: "插入 LaTeX 公式块", keywords: "math latex formula 公式 数学", category: "高级", run: () => editor.chain().focus().insertContent('<div class="notion-math">$$ E = mc^2 $$</div>').run() },
    { id: "highlight", title: "高亮文本", description: "突出选中的内容", keywords: "highlight mark 高亮", category: "文本", run: () => editor.chain().focus().toggleHighlight().run() },
    { id: "underline", title: "下划线", description: "给选中文本加下划线", keywords: "underline 下划线", category: "文本", shortcut: "⌘U", run: () => editor.chain().focus().toggleUnderline().run() },
    { id: "ai-block", title: "AI 写作块", description: "生成或改写一个内容块", keywords: "ai assistant block draft 自动生成", category: "AI", run: () => onPickerCommand?.("ai-block") },
    { id: "summary", title: "AI 摘要", description: "总结当前文档", keywords: "ai summary 摘要", category: "AI", run: () => onAiCommand?.("summary") },
    { id: "tasks", title: "AI 提取待办", description: "从文档里提取行动项", keywords: "ai tasks todo 待办 任务", category: "AI", run: () => onAiCommand?.("tasks") },
  ];
}

export const slashCommandIconMap = {
  p: TextQuote,
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
  "table-wide": TableIcon,
  database: Database,
  mention: Link2,
  "ai-block": Bot,
  image: ImageIcon,
  upload: Paperclip,
  summary: Sparkles,
  tasks: CheckSquare,
  highlight: Highlighter,
  underline: Underline,
};
