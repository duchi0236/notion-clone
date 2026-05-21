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
import { Bold, Bot, Italic, Link2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NotionGradeEditorProps, PickerCommand, SlashCommand } from "./types";
import { ToolbarButton } from "./ToolbarButton";
import { SlashMenu } from "./SlashMenu";
import { buildSlashCommands } from "./useSlashCommands";
import { insertUploadedFile, uploadEditorFile } from "./FileUpload";
import { TableControls } from "./TableControls";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { DatabasePicker, PageMentionPicker } from "./InsertPickers";
import { AiBlockDialog } from "./AiBlockDialog";

export function NotionGradeEditor({ content, onChange, onTextChange, onJsonChange, onAiCommand }: NotionGradeEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const applyingExternalContentRef = useRef(false);
  const lastEmittedHtmlRef = useRef(content);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [picker, setPicker] = useState<PickerCommand | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: ({ node }) => node.type.name === "heading" ? "标题" : "输入 '/' 插入块，或直接开始写作..." }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-600 underline underline-offset-2" } }),
      Image.configure({ allowBase64: false }),
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
      lastEmittedHtmlRef.current = html;
      onChange(html);
      onTextChange?.(editor.getText());
      onJsonChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: { class: "notion-grade-content min-h-[480px] px-1 py-3 outline-none" },
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
          event.preventDefault();
          setSlashOpen(true);
          setSlashQuery("");
          return true;
        }
        if (event.key === "Escape") {
          setSlashOpen(false);
          setPicker(null);
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

      <BubbleMenu
        editor={editor}
        pluginKey="textFormattingMenu"
        tippyOptions={{ duration: 100, placement: "top" }}
        shouldShow={({ editor, from, to }) => from !== to && !editor.isActive("table")}
      >
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarButton>
          <ToolbarButton active={editor.isActive("link")} onClick={() => { const url = window.prompt("URL"); if (url) editor.chain().focus().setLink({ href: url }).run(); }}><Link2 className="h-4 w-4" /></ToolbarButton>
          <span className="mx-1 h-5 w-px bg-slate-100" />
          <button type="button" onClick={() => onAiCommand?.("summary")} className="rounded-lg px-2 py-1.5 text-xs text-blue-700 hover:bg-blue-50"><Bot className="mr-1 inline h-3.5 w-3.5" />总结</button>
          <button type="button" onClick={() => setPicker("ai-block")} className="rounded-lg px-2 py-1.5 text-xs text-violet-700 hover:bg-violet-50"><Sparkles className="mr-1 inline h-3.5 w-3.5" />改写</button>
        </div>
      </BubbleMenu>

      <BubbleMenu
        editor={editor}
        pluginKey="tableControlsMenu"
        tippyOptions={{ duration: 100, placement: "top-start", offset: [0, 8] }}
        shouldShow={({ editor }) => editor.isActive("table")}
      >
        <TableControls editor={editor} />
      </BubbleMenu>

      <div className="quiet-editor-quickbar mb-2 flex items-center text-xs text-slate-400">
        <button type="button" onClick={() => { setSlashQuery(""); setSlashOpen(true); }} className="rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-slate-700">/ 命令</button>
      </div>

      <SlashMenu open={slashOpen} query={slashQuery} setQuery={setSlashQuery} commands={filteredCommands} onRun={runCommand} />
      <EditorContent editor={editor} />
      {shortcutsOpen && <KeyboardShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      {picker === "page-mention" && <PageMentionPicker onClose={() => setPicker(null)} onSelect={insertMention} />}
      {picker === "database" && <DatabasePicker onClose={() => setPicker(null)} onSelect={insertDatabase} />}
      {picker === "ai-block" && <AiBlockDialog onClose={() => setPicker(null)} onInsert={insertAiBlock} />}
    </div>
  );
}
