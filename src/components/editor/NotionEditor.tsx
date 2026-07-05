"use client";

import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Link2,
  Image as ImageIcon,
  Table as TableIcon,
  CheckSquare,
  Quote,
  Minus,
  Heading1,
  Heading2,
  Heading3,
  Sparkles,
  Brain,
  ListTodo,
  X,
} from "lucide-react";

const lowlight = createLowlight(common);

type AiCommand = "summary" | "memory" | "tasks" | "search";

interface EditorProps {
  content?: string;
  onChange?: (html: string) => void;
  onJsonChange?: (json: unknown) => void;
  onTextChange?: (text: string) => void;
  onAiCommand?: (command: AiCommand) => void;
  placeholder?: string;
  editable?: boolean;
}

export function NotionEditor({
  content = "",
  onChange,
  onJsonChange,
  onTextChange,
  onAiCommand,
  placeholder = "输入 '/' 快速插入块，或直接开始写作...",
  editable = true,
}: EditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const slashIndexRef = useRef(0);
  const showSlashRef = useRef(false);
  const slashRunRef = useRef<(run: () => void) => void>(() => {});
  const slashItemsRef = useRef<(() => void)[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({ placeholder }),
      Highlight,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
      onJsonChange?.(editor.getJSON());
      onTextChange?.(editor.getText());
    },
    editorProps: {
      attributes: {
        class: "min-h-[520px] rounded-b-3xl bg-white px-8 py-6 leading-8 outline-none",
      },
      handleKeyDown: (_view, event) => {
        if (showSlashRef.current) {
          const items = slashItemsRef.current;
          if (event.key === "Escape") {
            event.preventDefault();
            setShowSlashMenu(false);
            return true;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            const next = Math.min(slashIndexRef.current + 1, Math.max(0, items.length - 1));
            slashIndexRef.current = next;
            setSlashIndex(next);
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            const next = Math.max(slashIndexRef.current - 1, 0);
            slashIndexRef.current = next;
            setSlashIndex(next);
            return true;
          }
          if (event.key === "Enter") {
            const run = items[slashIndexRef.current];
            if (run) {
              event.preventDefault();
              slashRunRef.current(run);
              return true;
            }
          }
        }
        if (event.key === "/") {
          setTimeout(() => {
            slashIndexRef.current = 0;
            setSlashIndex(0);
            setShowSlashMenu(true);
          }, 0);
          return false;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content && content !== current) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  const removeTypedSlash = useCallback(() => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const previous = editor.state.doc.textBetween(Math.max(0, from - 1), from);
    if (previous === "/") {
      editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    setLinkDialogOpen(true);
  }, [editor]);

  const applyLink = useCallback(
    (url: string) => {
      if (!editor) return;
      const trimmed = url.trim();
      if (trimmed) editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
      else editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkDialogOpen(false);
    },
    [editor],
  );

  const addImage = useCallback(() => {
    if (!editor) return;
    setImageDialogOpen(true);
  }, [editor]);

  const applyImage = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (editor && trimmed) editor.chain().focus().setImage({ src: trimmed }).run();
      setImageDialogOpen(false);
    },
    [editor],
  );

  const addTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const slashCommands = useMemo(() => [
    { label: "标题 1", hint: "大标题", icon: <Heading1 className="h-4 w-4" />, run: () => editor?.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "标题 2", hint: "章节标题", icon: <Heading2 className="h-4 w-4" />, run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "标题 3", hint: "小节标题", icon: <Heading3 className="h-4 w-4" />, run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "待办事项", hint: "任务清单", icon: <ListTodo className="h-4 w-4" />, run: () => editor?.chain().focus().toggleTaskList().run() },
    { label: "项目符号列表", hint: "无序列表", icon: <List className="h-4 w-4" />, run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: "编号列表", hint: "有序列表", icon: <ListOrdered className="h-4 w-4" />, run: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: "引用", hint: "强调说明", icon: <Quote className="h-4 w-4" />, run: () => editor?.chain().focus().toggleBlockquote().run() },
    { label: "代码块", hint: "记录代码", icon: <Code className="h-4 w-4" />, run: () => editor?.chain().focus().toggleCodeBlock().run() },
    { label: "表格", hint: "3 x 3 表格", icon: <TableIcon className="h-4 w-4" />, run: addTable },
    { label: "图片", hint: "插入图片链接", icon: <ImageIcon className="h-4 w-4" />, run: addImage },
    { label: "AI 摘要", hint: "总结当前文档", icon: <Sparkles className="h-4 w-4" />, run: () => onAiCommand?.("summary") },
    { label: "写入 Memory", hint: "保存为长期记忆", icon: <Brain className="h-4 w-4" />, run: () => onAiCommand?.("memory") },
  ], [addImage, addTable, editor, onAiCommand]);

  const runSlashCommand = useCallback((run: () => void) => {
    removeTypedSlash();
    setShowSlashMenu(false);
    run();
  }, [removeTypedSlash]);

  useEffect(() => {
    showSlashRef.current = showSlashMenu;
  }, [showSlashMenu]);

  useEffect(() => {
    slashItemsRef.current = slashCommands.map((command) => command.run);
    slashRunRef.current = runSlashCommand;
  }, [slashCommands, runSlashCommand]);

  if (!editor) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {editable && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white/95 p-2 backdrop-blur">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} icon={<Bold className="h-4 w-4" />} title="Bold" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} icon={<Italic className="h-4 w-4" />} title="Italic" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} icon={<UnderlineIcon className="h-4 w-4" />} title="Underline" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")} icon={<Strikethrough className="h-4 w-4" />} title="Strikethrough" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive("code")} icon={<Code className="h-4 w-4" />} title="Code" />
          <ToolbarDivider />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })} icon={<span className="text-xs font-bold">H1</span>} title="Heading 1" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })} icon={<span className="text-xs font-bold">H2</span>} title="Heading 2" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive("heading", { level: 3 })} icon={<span className="text-xs font-bold">H3</span>} title="Heading 3" />
          <ToolbarDivider />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")} icon={<List className="h-4 w-4" />} title="Bullet List" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")} icon={<ListOrdered className="h-4 w-4" />} title="Numbered List" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive("taskList")} icon={<CheckSquare className="h-4 w-4" />} title="Task List" />
          <ToolbarDivider />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={editor.isActive({ textAlign: "left" })} icon={<AlignLeft className="h-4 w-4" />} title="Align Left" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={editor.isActive({ textAlign: "center" })} icon={<AlignCenter className="h-4 w-4" />} title="Align Center" />
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={editor.isActive({ textAlign: "right" })} icon={<AlignRight className="h-4 w-4" />} title="Align Right" />
          <ToolbarDivider />
          <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} icon={<LinkIcon className="h-4 w-4" />} title="Link" />
          <ToolbarButton onClick={addImage} icon={<ImageIcon className="h-4 w-4" />} title="Image" />
          <ToolbarButton onClick={addTable} icon={<TableIcon className="h-4 w-4" />} title="Table" />
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive("blockquote")} icon={<Quote className="h-4 w-4" />} title="Quote" />
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={<Minus className="h-4 w-4" />} title="Divider" />
          <ToolbarDivider />
          <button onClick={() => setShowSlashMenu((value) => !value)} className="rounded-xl px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-50">/ 命令</button>
        </div>
      )}

      {showSlashMenu && (
        <div
          role="listbox"
          aria-label="快速插入块"
          aria-activedescendant={slashCommands[slashIndex] ? `notion-slash-${slashIndex}` : undefined}
          className="absolute left-8 top-16 z-30 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500">快速插入</div>
          <div className="max-h-96 overflow-auto p-2">
            {slashCommands.map((command, index) => (
              <button
                key={command.label}
                id={`notion-slash-${index}`}
                type="button"
                role="option"
                aria-selected={index === slashIndex}
                onMouseEnter={() => {
                  slashIndexRef.current = index;
                  setSlashIndex(index);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  runSlashCommand(command.run);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left",
                  index === slashIndex ? "bg-violet-50" : "hover:bg-violet-50",
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{command.icon}</span>
                <span>
                  <span className="block text-sm font-medium text-slate-800">{command.label}</span>
                  <span className="block text-xs text-slate-500">{command.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} icon={<Bold className="h-4 w-4" />} title="加粗" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} icon={<Italic className="h-4 w-4" />} title="斜体" />
        <ToolbarButton onClick={setLink} isActive={editor.isActive("link")} icon={<LinkIcon className="h-4 w-4" />} title="链接" />
      </BubbleMenu>

      <EditorContent editor={editor} />

      {linkDialogOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <UrlDialog
            title={editor.isActive("link") ? "编辑链接" : "添加链接"}
            initialUrl={editor.getAttributes("link").href || ""}
            placeholder="粘贴或输入链接，如 https://…"
            confirmText={editor.isActive("link") ? "更新" : "添加"}
            allowRemove={editor.isActive("link")}
            onSubmit={applyLink}
            onClose={() => setLinkDialogOpen(false)}
          />,
          document.body,
        )}

      {imageDialogOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <UrlDialog
            title="插入图片"
            initialUrl=""
            placeholder="粘贴图片 URL，如 https://…/photo.png"
            confirmText="插入"
            onSubmit={applyImage}
            onClose={() => setImageDialogOpen(false)}
          />,
          document.body,
        )}
    </div>
  );
}

function UrlDialog({
  title,
  initialUrl,
  placeholder,
  confirmText,
  allowRemove = false,
  onSubmit,
  onClose,
}: {
  title: string;
  initialUrl: string;
  placeholder: string;
  confirmText: string;
  allowRemove?: boolean;
  onSubmit: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button type="button" onClick={onClose} aria-label="关闭" className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-slate-400">
            <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && url.trim()) onSubmit(url);
              }}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            {allowRemove ? (
              <button type="button" onClick={() => onSubmit("")} className="rounded-lg px-2.5 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50 active:bg-red-100">
                移除链接
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200">
                取消
              </button>
              <button
                type="button"
                onClick={() => url.trim() && onSubmit(url.trim())}
                disabled={!url.trim()}
                className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 active:bg-violet-800 disabled:opacity-40"
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, isActive, icon, title }: { onClick: () => void; isActive?: boolean; icon: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn("rounded-xl p-1.5 text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200", isActive && "bg-violet-50 text-violet-700")}
      type="button"
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-slate-200" />;
}
