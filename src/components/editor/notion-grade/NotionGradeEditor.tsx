"use client";

import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
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
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { Bold, Bot, CheckSquare, Focus, Highlighter, ImageIcon, Italic, Link2, List, Minus, Sparkles, TableIcon, TextCursorInput, Underline as UnderlineIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { NotionGradeEditorProps, PickerCommand, SlashCommand } from "./types";
import { ToolbarButton } from "./ToolbarButton";
import { SlashMenu } from "./SlashMenu";
import { buildSlashCommands } from "./useSlashCommands";
import { insertUploadedFile, uploadEditorFile } from "./FileUpload";
import { TableControls } from "./TableControls";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { DatabasePicker, PageMentionPicker } from "./InsertPickers";
import { AiBlockDialog } from "./AiBlockDialog";
import { BlockHoverToolbar } from "./BlockHoverToolbar";

function getStats(text: string) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const chars = trimmed.length;
  const readingMinutes = Math.max(1, Math.ceil(chars / 450));
  return { words, chars, readingMinutes };
}

export function NotionGradeEditor({ content, onChange, onTextChange, onJsonChange, onAiCommand }: NotionGradeEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const applyingExternalContentRef = useRef(false);
  const lastEmittedHtmlRef = useRef(content);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [picker, setPicker] = useState<PickerCommand | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [stats, setStats] = useState(() => getStats(content.replace(/<[^>]+>/g, " ")));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: ({ node }) => node.type.name === "heading" ? "标题" : "输入 '/' 插入块，或直接开始写作..." }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-600 underline underline-offset-2" } }),
      Image.configure({ allowBase64: false }),
      Highlight.configure({ multicolor: true }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true, handleWidth: 6, cellMinWidth: 120, lastColumnResizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (applyingExternalContentRef.current) return;
      const html = editor.getHTML();
      const text = editor.getText();
      lastEmittedHtmlRef.current = html;
      setStats(getStats(text));
      onChange(html);
      onTextChange?.(text);
      onJsonChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: { class: "notion-grade-content min-h-[560px] px-1 py-3 outline-none" },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "/") {
          event.preventDefault();
          setSlashOpen((value) => !value);
          return true;
        }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") { event.preventDefault(); editor?.chain().focus().toggleBold().run(); return true; }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") { event.preventDefault(); editor?.chain().focus().toggleItalic().run(); return true; }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "u") { event.preventDefault(); editor?.chain().focus().toggleUnderline().run(); return true; }
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "h") { event.preventDefault(); editor?.chain().focus().toggleHighlight().run(); return true; }
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "f") { event.preventDefault(); setFocusMode((value) => !value); return true; }
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "t") { event.preventDefault(); setTypewriterMode((value) => !value); return true; }
        if ((event.metaKey || event.ctrlKey) && event.key === "?") { event.preventDefault(); setShortcutsOpen(true); return true; }
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSlashOpen(true); setSlashQuery(""); return true; }
        if (event.key === "/") { event.preventDefault(); setSlashOpen(true); setSlashQuery(""); return true; }
        if (event.key === "Escape") { setSlashOpen(false); setPicker(null); if (focusMode) setFocusMode(false); }
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
        const text = editor.getText();
        setStats(getStats(text));
        lastEmittedHtmlRef.current = content;
      } finally {
        applyingExternalContentRef.current = false;
      }
    }
  }, [content, editor]);

  async function upload(file: File) {
    if (!editor) return;
    try {
      const uploaded = await uploadEditorFile(file);
      insertUploadedFile(editor, uploaded);
    } finally {
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
    const icon = collection.icon ?? "📋";
    editor.chain().focus().insertContent(`<div class="notion-database-embed" data-collection-id="${collection.id}">${icon} 清单：${collection.name}</div>`).run();
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
    <div className={cn("notion-grade-editor quiet-workspace relative", focusMode && "editor-focus-mode", typewriterMode && "editor-typewriter-mode")}>
      <input ref={inputRef} type="file" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      <BlockHoverToolbar editor={editor} onAiCommand={onAiCommand} />

      <BubbleMenu editor={editor} pluginKey="textFormattingMenu" tippyOptions={{ duration: 100, placement: "top" }} shouldShow={({ editor, from, to }) => from !== to && !editor.isActive("table")}>
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-xl ring-1 ring-slate-950/5">
          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("link")} onClick={() => { const url = window.prompt("URL"); if (url) editor.chain().focus().setLink({ href: url }).run(); }}><Link2 className="h-4 w-4" /></ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-100" />
          <button type="button" onClick={() => onAiCommand?.("summary")} className="rounded-lg px-2 py-1.5 text-xs text-blue-700 hover:bg-blue-50"><Bot className="mr-1 inline h-3.5 w-3.5" />总结</button>
          <button type="button" onClick={() => setPicker("ai-block")} className="rounded-lg px-2 py-1.5 text-xs text-violet-700 hover:bg-violet-50"><Sparkles className="mr-1 inline h-3.5 w-3.5" />改写</button>
        </div>
      </BubbleMenu>

      <BubbleMenu editor={editor} pluginKey="tableControlsMenu" tippyOptions={{ duration: 100, placement: "top-start", offset: [0, 8] }} shouldShow={({ editor }) => editor.isActive("table")}>
        <TableControls editor={editor} />
      </BubbleMenu>

      <div className="quiet-editor-quickbar sticky top-14 z-10 mb-3 flex items-center justify-between rounded-2xl border border-slate-100 bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-sm backdrop-blur">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => { setSlashQuery(""); setSlashOpen(true); }} className="rounded-lg px-2 py-1 font-medium hover:bg-slate-100 hover:text-slate-700">/ 命令</button>
          <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className="rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-slate-700"><CheckSquare className="mr-1 inline h-3.5 w-3.5" />待办</button>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className="rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-slate-700"><List className="mr-1 inline h-3.5 w-3.5" />列表</button>
          <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-slate-700"><TableIcon className="mr-1 inline h-3.5 w-3.5" />表格</button>
          <button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-slate-700"><ImageIcon className="mr-1 inline h-3.5 w-3.5" />附件</button>
          <button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()} className="rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-slate-700"><Minus className="mr-1 inline h-3.5 w-3.5" />分隔</button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setTypewriterMode((value) => !value)} className={cn("rounded-lg px-2 py-1 hover:bg-slate-100", typewriterMode && "bg-blue-50 text-blue-700")}><TextCursorInput className="mr-1 inline h-3.5 w-3.5" />打字机</button>
          <button type="button" onClick={() => setFocusMode((value) => !value)} className={cn("rounded-lg px-2 py-1 hover:bg-slate-100", focusMode && "bg-blue-50 text-blue-700")}><Focus className="mr-1 inline h-3.5 w-3.5" />专注</button>
        </div>
      </div>

      <SlashMenu open={slashOpen} query={slashQuery} setQuery={setSlashQuery} commands={filteredCommands} onRun={runCommand} />
      <EditorContent editor={editor} />

      <div className="editor-writing-status sticky bottom-4 z-10 mx-auto mt-8 flex w-fit items-center gap-4 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs text-slate-500 shadow-lg backdrop-blur">
        <span>{stats.chars.toLocaleString()} 字符</span>
        <span>{stats.words.toLocaleString()} 词</span>
        <span>阅读约 {stats.readingMinutes} 分钟</span>
        <span className="hidden text-slate-300 md:inline">⌘⇧F 专注 · ⌘⇧T 打字机</span>
      </div>

      {shortcutsOpen && <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      {picker === "page-mention" && <PageMentionPicker onClose={() => setPicker(null)} onSelect={insertMention} />}
      {picker === "database" && <DatabasePicker onClose={() => setPicker(null)} onSelect={insertDatabase} />}
      {picker === "ai-block" && <AiBlockDialog onClose={() => setPicker(null)} onInsert={insertAiBlock} />}
    </div>
  );
}
