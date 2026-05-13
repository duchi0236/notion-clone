"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useEffect, useRef, useState } from "react";
import { Bold, CheckSquare, Code, Heading1, Heading2, ImageIcon, Italic, List, ListOrdered, Paperclip, Quote, TableIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AiCommand = "summary" | "memory" | "tasks" | "search";

type UploadedFile = {
  name: string;
  url: string;
  type: string;
};

export function ClawTipTapEditor({
  content,
  onChange,
  onTextChange,
  onJsonChange,
  onAiCommand,
}: {
  content: string;
  onChange: (html: string) => void;
  onTextChange?: (text: string) => void;
  onJsonChange?: (json: unknown) => void;
  onAiCommand?: (command: AiCommand) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "输入 '/' 快速插入块，或直接开始写作..." }),
      Link.configure({ openOnClick: false }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      onTextChange?.(editor.getText());
      onJsonChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "min-h-[520px] rounded-b-3xl bg-white px-8 py-6 leading-8 outline-none",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "/") setTimeout(() => setShowMenu(true), 0);
        if (event.key === "Escape") setShowMenu(false);
        return false;
      },
      handleDrop: (_view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file) return false;
        event.preventDefault();
        void uploadFile(file);
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content && content !== editor.getHTML()) editor.commands.setContent(content, false);
  }, [content, editor]);

  async function uploadFile(file: File) {
    if (!editor) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.file) return;
      insertUploaded(data.file as UploadedFile);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function insertUploaded(file: UploadedFile) {
    if (!editor) return;
    if (file.type?.startsWith("image/")) {
      editor.chain().focus().setImage({ src: file.url, alt: file.name }).run();
      return;
    }
    editor.chain().focus().insertContent({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: `📎 ${file.name}`,
          marks: [{ type: "link", attrs: { href: file.url } }],
        },
      ],
    }).run();
  }

  function removeSlash() {
    if (!editor) return;
    const { from } = editor.state.selection;
    const previous = editor.state.doc.textBetween(Math.max(0, from - 1), from);
    if (previous === "/") editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
  }

  function run(action: () => void) {
    removeSlash();
    setShowMenu(false);
    action();
  }

  if (!editor) return null;

  const actions = [
    { label: "标题 1", icon: <Heading1 className="h-4 w-4" />, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "标题 2", icon: <Heading2 className="h-4 w-4" />, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "待办", icon: <CheckSquare className="h-4 w-4" />, action: () => editor.chain().focus().toggleTaskList().run() },
    { label: "列表", icon: <List className="h-4 w-4" />, action: () => editor.chain().focus().toggleBulletList().run() },
    { label: "编号", icon: <ListOrdered className="h-4 w-4" />, action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "引用", icon: <Quote className="h-4 w-4" />, action: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "代码", icon: <Code className="h-4 w-4" />, action: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: "表格", icon: <TableIcon className="h-4 w-4" />, action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { label: "图片链接", icon: <ImageIcon className="h-4 w-4" />, action: () => { const url = window.prompt("图片 URL"); if (url) editor.chain().focus().setImage({ src: url }).run(); } },
    { label: "上传文件", icon: <Paperclip className="h-4 w-4" />, action: () => fileInputRef.current?.click() },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFile(file); }} />
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white/95 p-2 backdrop-blur">
        <Button onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}><Bold className="h-4 w-4" /></Button>
        <Button onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><Italic className="h-4 w-4" /></Button>
        <Button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>H1</Button>
        <Button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>H2</Button>
        <Button onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}><List className="h-4 w-4" /></Button>
        <Button onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")}><CheckSquare className="h-4 w-4" /></Button>
        <Button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></Button>
        <Button onClick={() => fileInputRef.current?.click()} active={uploading}><Paperclip className={cn("h-4 w-4", uploading && "animate-pulse")} /></Button>
        <button type="button" onClick={() => setShowMenu((value) => !value)} className="rounded-xl px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50">/ 命令</button>
        <button type="button" onClick={() => onAiCommand?.("summary")} className="rounded-xl px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50">AI 摘要</button>
        <button type="button" onClick={() => onAiCommand?.("memory")} className="rounded-xl px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50">写入 Memory</button>
      </div>
      {showMenu && (
        <div className="absolute left-8 top-14 z-30 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {actions.map((item) => (
            <button key={item.label} type="button" onMouseDown={(event) => { event.preventDefault(); run(item.action); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-violet-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function Button({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return <button type="button" onClick={onClick} className={cn("rounded-xl p-1.5 text-slate-600 transition-colors hover:bg-slate-100", active && "bg-violet-50 text-violet-700")}>{children}</button>;
}
