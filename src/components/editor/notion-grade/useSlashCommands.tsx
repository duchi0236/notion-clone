"use client";

import { AlertCircle, CheckSquare, ChevronRight, Code, Heading1, Heading2, Heading3, ImageIcon, List, ListOrdered, Minus, Paperclip, Quote, TableIcon } from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { AiCommand, SlashCommand } from "./types";

export function buildSlashCommands({
  editor,
  onUpload,
  onAiCommand,
}: {
  editor: Editor | null;
  onUpload: () => void;
  onAiCommand?: (command: AiCommand) => void;
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
    { id: "bullet", title: "无序列表", description: "项目符号列表", keywords: "bullet list 列表", run: () => editor.chain().focus().toggleBulletList().run() },
    { id: "number", title: "编号列表", description: "有序列表", keywords: "number ordered list 编号", run: () => editor.chain().focus().toggleOrderedList().run() },
    { id: "quote", title: "引用", description: "突出说明内容", keywords: "quote 引用", run: () => editor.chain().focus().toggleBlockquote().run() },
    { id: "code", title: "代码块", description: "插入代码片段", keywords: "code 代码", run: () => editor.chain().focus().toggleCodeBlock().run() },
    { id: "divider", title: "分割线", description: "插入分割线", keywords: "divider line 分割线", run: () => editor.chain().focus().setHorizontalRule().run() },
    { id: "table", title: "表格", description: "插入 3x3 表格", keywords: "table 表格", run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
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
  bullet: List,
  number: ListOrdered,
  quote: Quote,
  code: Code,
  divider: Minus,
  table: TableIcon,
  image: ImageIcon,
  upload: Paperclip,
};
