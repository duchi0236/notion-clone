"use client";

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
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
import { Bold, CheckSquare, Italic, Link2, List, Paperclip, Plus, TableIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NotionGradeEditorProps, SlashCommand } from "./types";
import { ToolbarButton } from "./ToolbarButton";
import { SlashMenu } from "./SlashMenu";
import { buildSlashCommands } from "./useSlashCommands";
import { insertUploadedFile, uploadEditorFile } from "./FileUpload";
import { TableControls } from "./TableControls";
import { EditorStatusBar } from "./EditorStatusBar";

export function NotionGradeEditor({ content, onChange, onTextChange, onJsonChange, onAiCommand }: NotionGradeEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: ({ node }) => node.type.name === "heading" ? "标题" : "输入 '/' 插入块，或直接开始写作..." }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-600 underline underline-offset-2" } }),
      Image.configure({ allowBase64: false }),
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
      attributes: { class: "notion-grade-content min-h-[620px] px-1 py-6 outline-none" },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "/") {
          event.preventDefault();
          setSlashOpen((value) => !value);
          return true;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
          event.preventDefault();
          editor?.chain().focus().toggleBold().run();
          return true;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
          event.preventDefault();
          editor?.chain().focus().toggleItalic().run();
          return true;
        }
        if (event.key === "/") {
          setSlashOpen(true);
          setSlashQuery("");
        }
        if (event.key === "Escape") setSlashOpen(false);
        return false;
      },
      handleDrop: (_view, event) => {
        const file = event.dataTransfer?.files?.[0];
        if (!file || !editor) return false;
        event.preventDefault();
        void upload(file);
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content && content !== editor.getHTML()) editor.commands.setContent(content, false);
  }, [content, editor]);

  async function upload(file: File) {
    if (!editor) return;
    setUploading(true);
    try {
      const uploaded = await uploadEditorFile(file);
      insertUploadedFile(editor, uploaded);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeSlash() {
    if (!editor) return;
    const { from } = editor.state.selection;
    const previous = editor.state.doc.textBetween(Math.max(0, from - 1), from);
    if (previous === "/") editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
  }

  function runCommand(command: SlashCommand) {
    removeSlash();
    setSlashOpen(false);
    setSlashQuery("");
    command.run();
  }

  const commands = useMemo(() => buildSlashCommands({ editor, onUpload: () => inputRef.current?.click(), onAiCommand }), [editor, onAiCommand]);
  const filteredCommands = commands.filter((command) => {
    const q = slashQuery.toLowerCase();
    if (!q) return true;
    return `${command.title} ${command.description} ${command.keywords}`.toLowerCase().includes(q);
  });

  if (!editor) return null;

  return (
    <div className="notion-grade-editor relative">
      <input ref={inputRef} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />

      <div className="sticky top-14 z-20 mb-4 flex flex-wrap items-center gap-1 border-b border-slate-100 bg-white/95 py-2 backdrop-blur">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolbarButton>
        <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
        <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton active={uploading} onClick={() => inputRef.current?.click()}><Paperclip className="h-4 w-4" /></ToolbarButton>
        <button type="button" onClick={() => setSlashOpen((value) => !value)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100">/ 命令</button>
      </div>

      <TableControls editor={editor} />

      <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <button onClick={() => setSlashOpen(true)} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 shadow-sm hover:bg-slate-50"><Plus className="h-3 w-3" /> 添加块</button>
      </FloatingMenu>

      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("link")} onClick={() => { const url = window.prompt("URL"); if (url) editor.chain().focus().setLink({ href: url }).run(); }}><Link2 className="h-4 w-4" /></ToolbarButton>
        </div>
      </BubbleMenu>

      <SlashMenu open={slashOpen} query={slashQuery} setQuery={setSlashQuery} commands={filteredCommands} onRun={runCommand} />
      <EditorContent editor={editor} />
      <EditorStatusBar editor={editor} />
    </div>
  );
}
