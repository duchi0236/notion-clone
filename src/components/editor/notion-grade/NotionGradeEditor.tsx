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
import { Bold, Bot, CheckSquare, Italic, Keyboard, Link2, List, Paperclip, Plus, Sparkles, TableIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NotionGradeEditorProps, PickerCommand, SlashCommand } from "./types";
import { ToolbarButton } from "./ToolbarButton";
import { SlashMenu } from "./SlashMenu";
import { buildSlashCommands } from "./useSlashCommands";
import { insertUploadedFile, uploadEditorFile } from "./FileUpload";
import { TableControls } from "./TableControls";
import { EditorStatusBar } from "./EditorStatusBar";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { BlockActionBar } from "./BlockActionBar";
import { DatabasePicker, PageMentionPicker } from "./InsertPickers";
import { AiBlockDialog } from "./AiBlockDialog";

export function NotionGradeEditor({ content, onChange, onTextChange, onJsonChange, onAiCommand }: NotionGradeEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const applyingExternalContentRef = useRef(false);
  const lastEmittedHtmlRef = useRef(content);
  const [uploading, setUploading] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [showUtilities, setShowUtilities] = useState(false);
  const [picker, setPicker] = useState<PickerCommand | null>(null);

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
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (applyingExternalContentRef.current) return;
      const html = editor.getHTML();
      lastEmittedHtmlRef.current = html;
      onChange(html);
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
        if ((event.metaKey || event.ctrlKey) && event.key === "?") {
          event.preventDefault();
          setShortcutsOpen(true);
          return true;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
          event.preventDefault();
          setSlashOpen(true);
          setSlashQuery("");
          return true;
        }
        if (event.key === "/") {
          setSlashOpen(true);
          setSlashQuery("");
        }
        if (event.key === "Escape") {
          setSlashOpen(false);
          setPicker(null);
          setShowUtilities(false);
        }
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
    if (content === lastEmittedHtmlRef.current) return;
    if (content !== editor.getHTML()) {
      applyingExternalContentRef.current = true;
      try {
        editor.commands.setContent(content, false);
        lastEmittedHtmlRef.current = content;
      } finally {
        applyingExternalContentRef.current = false;
      }
    }
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

  function openPicker(command: PickerCommand) {
    removeSlash();
    setSlashOpen(false);
    setSlashQuery("");
    setPicker(command);
  }

  function insertMention(document: { id: string; title: string; icon?: string | null }) {
    if (!editor) return;
    const icon = document.icon ?? "📄";
    editor.chain().focus().insertContent(`<a class="notion-page-mention" href="/clawnote?document=${document.id}">${icon} ${document.title}</a>`).run();
    setPicker(null);
  }

  function insertDatabase(collection: { id: string; name: string; icon?: string | null }) {
    if (!editor) return;
    const icon = collection.icon ?? "📊";
    editor.chain().focus().insertContent(`<div class="notion-database-embed" data-collection-id="${collection.id}">${icon} 数据库：${collection.name}</div>`).run();
    setPicker(null);
  }

  function insertAiBlock(html: string) {
    if (!editor) return;
    editor.chain().focus().insertContent(html).run();
  }

  const commands = useMemo(() => buildSlashCommands({ editor, onUpload: () => inputRef.current?.click(), onAiCommand, onPickerCommand: openPicker }), [editor, onAiCommand]);
  const filteredCommands = commands.filter((command) => {
    const q = slashQuery.toLowerCase();
    if (!q) return true;
    return `${command.title} ${command.description} ${command.keywords}`.toLowerCase().includes(q);
  });

  if (!editor) return null;

  return (
    <div className="notion-grade-editor quiet-workspace relative">
      <input ref={inputRef} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />

      <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <button type="button" onClick={() => setSlashOpen(true)} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 shadow-sm hover:bg-slate-50"><Plus className="h-3 w-3" /> 添加块</button>
      </FloatingMenu>

      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("link")} onClick={() => { const url = window.prompt("URL"); if (url) editor.chain().focus().setLink({ href: url }).run(); }}><Link2 className="h-4 w-4" /></ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-100" />
          <button type="button" onClick={() => onAiCommand?.("summary")} className="rounded-lg px-2 py-1.5 text-xs text-blue-700 hover:bg-blue-50"><Bot className="mr-1 inline h-3.5 w-3.5" />总结</button>
          <button type="button" onClick={() => setPicker("ai-block")} className="rounded-lg px-2 py-1.5 text-xs text-violet-700 hover:bg-violet-50"><Sparkles className="mr-1 inline h-3.5 w-3.5" />改写</button>
        </div>
      </BubbleMenu>

      <div className="quiet-editor-quickbar mb-3 flex items-center justify-between text-xs text-slate-400">
        <button type="button" onClick={() => setSlashOpen(true)} className="rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-slate-700">/ 命令</button>
        <div className="flex items-center gap-1 opacity-40 transition hover:opacity-100">
          <button type="button" onClick={() => setShowUtilities((value) => !value)} className="rounded-lg px-2 py-1 hover:bg-slate-100">工具</button>
          <button type="button" onClick={() => setPicker("ai-block")} className="rounded-lg px-2 py-1 hover:bg-blue-50 hover:text-blue-700"><Sparkles className="mr-1 inline h-3.5 w-3.5" />AI</button>
          <button type="button" onClick={() => setShortcutsOpen(true)} className="rounded-lg px-2 py-1 hover:bg-slate-100"><Keyboard className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {showUtilities && (
        <div className="mb-4 flex flex-wrap items-center gap-1 rounded-2xl border border-slate-100 bg-slate-50/80 p-2">
          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolbarButton>
          <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
          <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}><CheckSquare className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={uploading} onClick={() => inputRef.current?.click()}><Paperclip className="h-4 w-4" /></ToolbarButton>
        </div>
      )}

      {showUtilities && <BlockActionBar editor={editor} />}
      <TableControls editor={editor} />

      <SlashMenu open={slashOpen} query={slashQuery} setQuery={setSlashQuery} commands={filteredCommands} onRun={runCommand} />
      <EditorContent editor={editor} />
      {showUtilities && <EditorStatusBar editor={editor} />}
      {shortcutsOpen && <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      {picker === "page-mention" && <PageMentionPicker onClose={() => setPicker(null)} onSelect={insertMention} />}
      {picker === "database" && <DatabasePicker onClose={() => setPicker(null)} onSelect={insertDatabase} />}
      {picker === "ai-block" && <AiBlockDialog onClose={() => setPicker(null)} onInsert={insertAiBlock} />}
    </div>
  );
}
